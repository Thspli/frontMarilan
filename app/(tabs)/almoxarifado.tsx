/**
 * app/(tabs)/almoxarifado.tsx — Marilan v6.0
 *
 * RBAC v6 — Inversão de papéis:
 *
 *   COLABORADOR  → Vê catálogo, monta lote, envia solicitação de retirada.
 *                  Não tem acesso a dashboards gerenciais.
 *
 *   ALMOXARIFE   → Vê Dashboard de Pendências + histórico de custódia.
 *                  NÃO pode montar lote nem solicitar ferramentas para si.
 *                  Aprovações chegam via SolicitacaoModal (polling existente).
 *
 * Implementação:
 *   • useAuth() lido no topo da tela — fonte única de verdade do role.
 *   • <ColaboradorView> renderiza catálogo + lote + botão solicitar.
 *   • <AlmoxarifeView> renderiza dashboard de quem está com o quê.
 *   • Guard no handleLibSuccess bloqueia almoxarife mesmo via bypass direto.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { apiClient } from '../../services/api';
import { useAuth } from '@/hooks/useAuth';
import { useSolicitacoesListener } from '../../hooks/useSolicitacoesListener';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { HeaderNotificationButton } from '@/components/HeaderNotificationButton';
import { SolicitacaoModal } from '../../components/SolicitacaoModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW, height: SH } = Dimensions.get('window');

const AUDIT_LOG_KEY = 'marilan_audit_logs';
const CUSTODY_TIMESTAMPS_KEY = 'marilan_custody_timestamps';

const D = {
  orange: '#FF5722',
  orangeHot: '#FF6D00',
  orangeDark: '#BF360C',
  orangeSoft: 'rgba(255,87,34,0.10)',
  orangeGlow: 'rgba(255,87,34,0.18)',
  orangeLine: 'rgba(255,87,34,0.25)',
  white: '#FFFFFF',
  snow: '#FAFAFA',
  mist: '#F5F5F5',
  cloud: '#EEEEEE',
  silver: '#E0E0E0',
  ash: '#BDBDBD',
  slate: '#9E9E9E',
  iron: '#616161',
  carbon: '#424242',
  obsidian: '#212121',
  green: '#2E7D32',
  greenLight: '#43A047',
  greenBg: 'rgba(46,125,50,0.08)',
  greenText: '#1B5E20',
  red: '#C62828',
  redLight: '#E53935',
  redBg: 'rgba(198,40,40,0.08)',
  amber: '#E65100',
  amberBg: 'rgba(230,81,0,0.08)',
  amberText: '#BF360C',
  blue: '#1565C0',
  blueBg: 'rgba(21,101,192,0.08)',
  blueLight: '#1976D2',
  nfcBg: '#0D0D0D',
  nfcSurface: '#1A1A1A',
  nfcBorder: 'rgba(255,87,34,0.3)',
};

type FerStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: FerStatus;
  alocadoPara?: string;
  custodiaDesde?: number;
  aguardandoDevolucao?: boolean; // <-- Adicione esta linha
}

interface LoteItem extends Ferramenta {
  qty: number;
}

interface AuditLog {
  id: string;
  timestamp: number;
  acao: 'RETIRADA' | 'DEVOLUCAO' | 'TROCA';
  ferramentas: Array<{ codigo: string; nome: string; qty: number }>;
  responsavel: string;
  autorizador: string;
  metodo: 'NFC' | 'MANUAL';
}

type LibMode = 'nfc' | 'manual';
type NFCPhase = 'waiting' | 'simulated_connected' | 'confirming' | 'submitting' | 'done' | 'error';
type ManualPhase = 'form' | 'submitting' | 'awaiting' | 'done' | 'error';

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function saveAuditLog(log: AuditLog): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);
    const capped = logs.slice(0, 500);
    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(capped));
  } catch (err) {
    console.error('[AuditLog] Falha ao salvar:', err);
  }
}

async function loadCustodyTimestamps(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(CUSTODY_TIMESTAMPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveCustodyTimestamps(ts: Record<string, number>): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTODY_TIMESTAMPS_KEY, JSON.stringify(ts));
  } catch { }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const WrenchIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ size = 14, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const MinusIcon = ({ size = 13, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const XIcon = ({ size = 13, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ size = 22, color = D.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ArrowIcon = ({ size = 16, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackIcon = ({ size = 16, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 14l-4-4m0 0l4-4m-4 4h15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const NFCChipIcon = ({ size = 44, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={2} width={20} height={20} rx={4} stroke={color} strokeWidth={1.5} />
    <Rect x={7} y={7} width={10} height={10} rx={2} stroke={color} strokeWidth={1.3} />
    <Line x1={7} y1={2} x2={7} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={12} y1={2} x2={12} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={17} y1={2} x2={17} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={7} y1={19} x2={7} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={12} y1={19} x2={12} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={17} y1={19} x2={17} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={7} x2={5} y2={7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={12} x2={5} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={17} x2={5} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={7} x2={22} y2={7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={12} x2={22} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={17} x2={22} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const KeyboardIcon = ({ size = 20, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={6} width={20} height={12} rx={2} stroke={color} strokeWidth={1.6} />
    <Path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
  </Svg>
);

const LocateIcon = ({ size = 14, color = D.blue }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.3} strokeDasharray="2 3" />
  </Svg>
);

const LogIcon = ({ size = 14, color = D.iron }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const TimerIcon = ({ size = 12, color = D.amber }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
    <Path d="M12 9v4l3 3M9 2h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserColaboradorIcon = ({ size = 16, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.7} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
  </Svg>
);

const KeyAlmoxarifeIcon = ({ size = 16, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={8} cy={11} r={5} stroke={color} strokeWidth={1.7} />
    <Path d="M13 11h8M17 9v4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={8} cy={11} r={2} fill={color} opacity={0.35} />
  </Svg>
);

const AwaitingIcon = ({ size = 48, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
    <Path d="M12 7v5l3.5 3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M3.5 3.5l1.5 1.5M19 5l1.5-1.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
  </Svg>
);

// ─── Ícone de Dashboard (Almoxarife) ─────────────────────────────────────────
const DashboardIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
    <Rect x={14} y={3} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
    <Rect x={3} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
    <Rect x={14} y={14} width={7} height={7} rx={1} stroke={color} strokeWidth={1.7} />
  </Svg>
);

// ─── Ícone de Bloqueio ────────────────────────────────────────────────────────
const LockIcon = ({ size = 16, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={18} height={11} rx={2} stroke={color} strokeWidth={1.7} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    <Circle cx={12} cy={16} r={1.5} fill={color} />
  </Svg>
);

// ─── Radar Pulse ──────────────────────────────────────────────────────────────
function RadarPulse({ active, phase }: { active: boolean; phase: NFCPhase }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const connectedScale = useRef(new Animated.Value(0)).current;
  const connectedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active && phase === 'waiting') {
      animRef.current = Animated.parallel(
        rings.map((r, i) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(i * 450),
              Animated.timing(r, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
          )
        )
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      rings.forEach(r => r.setValue(0));
    }
    return () => { animRef.current?.stop(); };
  }, [active, phase]);

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'error') {
      Animated.parallel([
        Animated.spring(connectedScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.timing(connectedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      connectedScale.setValue(0);
      connectedOpacity.setValue(0);
    }
  }, [phase]);

  const isConnected = phase !== 'waiting' && phase !== 'error';
  const iconColor = phase === 'done' ? D.green : phase === 'error' ? D.red : D.orange;

  return (
    <View style={rp.container}>
      {phase === 'waiting' && rings.map((r, i) => (
        <Animated.View key={i} style={[rp.ring, {
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3.0] }) }],
          opacity: r.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 0.35, 0] }),
          borderColor: D.orange,
        }]} />
      ))}
      {isConnected && (
        <Animated.View style={[rp.connectedRingsWrap, { opacity: connectedOpacity, transform: [{ scale: connectedScale }] }]}>
          <View style={[rp.ring, { transform: [{ scale: 1.8 }], opacity: 0.12, borderColor: iconColor }]} />
          <View style={[rp.ring, { transform: [{ scale: 1.3 }], opacity: 0.2, borderColor: iconColor }]} />
          <View style={[rp.ring, { transform: [{ scale: 1.0 }], opacity: 0.3, borderColor: iconColor }]} />
        </Animated.View>
      )}
      <View style={[rp.core, isConnected && { borderColor: `${iconColor}60`, backgroundColor: `${iconColor}12` }]}>
        {phase === 'done' ? <CheckIcon size={40} color={D.green} /> : <NFCChipIcon size={40} color={iconColor} />}
      </View>
    </View>
  );
}

const rp = StyleSheet.create({
  container: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5 },
  connectedRingsWrap: { position: 'absolute', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  core: { width: 90, height: 90, borderRadius: 45, backgroundColor: `${D.orange}15`, borderWidth: 2, borderColor: `${D.orange}40`, alignItems: 'center', justifyContent: 'center' },
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible, type = 'success' }: { message: string; visible: boolean; type?: 'success' | 'error' | 'info' }) {
  const y = useRef(new Animated.Value(24)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(y, { toValue: 0, tension: 130, friction: 11, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 130, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: 18, duration: 260, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const iconBg = type === 'success' ? D.green : type === 'error' ? D.red : D.blue;

  return (
    <Animated.View style={[toast.wrap, { opacity: op, transform: [{ translateY: y }, { scale: sc }] }]} pointerEvents="none">
      <View style={toast.pill}>
        <View style={[toast.icon, { backgroundColor: iconBg }]}>
          {type === 'success' ? <CheckIcon size={12} color={D.white} /> : <XIcon size={12} color={D.white} />}
        </View>
        <Text style={toast.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 28, left: 20, right: 20, zIndex: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.obsidian, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 18, elevation: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: D.white, flex: 1, letterSpacing: 0.1 },
});

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FerStatus }) {
  const cfg = {
    'Disponível': { dot: D.greenLight, bg: D.greenBg, text: D.greenText },
    'Em uso': { dot: D.redLight, bg: D.redBg, text: D.red },
    'Em manutenção': { dot: D.amber, bg: D.amberBg, text: D.amberText },
  }[status];
  return (
    <View style={[stb.pill, { backgroundColor: cfg.bg }]}>
      <View style={[stb.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[stb.label, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const stb = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

function CustodyTimer({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - since);
  const isOverdue = elapsed > 4 * 60 * 60 * 1000;

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since), 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <View style={[ct.wrap, isOverdue && ct.wrapOverdue]}>
      <TimerIcon size={10} color={isOverdue ? D.orange : D.amber} />
      <Text style={[ct.text, isOverdue && ct.textOverdue]}>{formatElapsed(elapsed)}</Text>
    </View>
  );
}

const ct = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.amberBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  wrapOverdue: { backgroundColor: D.orangeSoft, borderWidth: 1, borderColor: D.orangeLine },
  text: { fontSize: 10, fontWeight: '700', color: D.amber },
  textOverdue: { color: D.orange },
});

function LocateButton({ codigo, nome }: { codigo: string; nome: string }) {
  const handleLocate = () => {
    Alert.alert(
      '📡 Localizar Ferramenta',
      `${nome} (${codigo})\n\nRastreio via Beacon BLE em desenvolvimento.`,
      [{ text: 'Entendido', style: 'default' }]
    );
  };
  return (
    <TouchableOpacity style={lb.btn} onPress={handleLocate} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <LocateIcon size={13} color={D.blue} />
      <Text style={lb.text}>Localizar</Text>
    </TouchableOpacity>
  );
}

const lb = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.blueBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: `${D.blue}25` },
  text: { fontSize: 10, fontWeight: '700', color: D.blue },
});

function AuditLogModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLoading(true);
      AsyncStorage.getItem(AUDIT_LOG_KEY).then(raw => {
        setLogs(raw ? JSON.parse(raw) : []);
        setLoading(false);
      });
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 13, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideY.setValue(600);
      bgOp.setValue(0);
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 600, duration: 260, useNativeDriver: true }),
      Animated.timing(bgOp, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const acaoColor = (acao: AuditLog['acao']) => acao === 'RETIRADA' ? D.orange : acao === 'DEVOLUCAO' ? D.green : D.blue;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[alm.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      </Animated.View>
      <Animated.View style={[alm.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={alm.handle} />
        <View style={alm.headerRow}>
          <View style={alm.headerLeft}>
            <LogIcon size={18} color={D.orange} />
            <View>
              <Text style={alm.title}>Auditoria de Movimentações</Text>
              <Text style={alm.sub}>{logs.length} registros locais</Text>
            </View>
          </View>
          <TouchableOpacity onPress={close} style={alm.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XIcon size={14} color={D.slate} />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={alm.loadState}>
            <ActivityIndicator color={D.orange} />
            <Text style={alm.loadText}>Carregando registros…</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={alm.emptyState}>
            <Text style={alm.emptyIcon}>📋</Text>
            <Text style={alm.emptyTitle}>Nenhum registro ainda</Text>
            <Text style={alm.emptySub}>Os logs aparecerão aqui após a primeira movimentação</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={l => l.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={alm.logCard}>
                <View style={alm.logTopRow}>
                  <View style={[alm.acaoBadge, { backgroundColor: `${acaoColor(item.acao)}14` }]}>
                    <View style={[alm.acaoDot, { backgroundColor: acaoColor(item.acao) }]} />
                    <Text style={[alm.acaoText, { color: acaoColor(item.acao) }]}>{item.acao}</Text>
                  </View>
                  <Text style={alm.timestamp}>{formatDate(item.timestamp)}</Text>
                  <View style={[alm.metodoBadge, { backgroundColor: item.metodo === 'NFC' ? D.orangeSoft : D.blueBg }]}>
                    <Text style={[alm.metodoText, { color: item.metodo === 'NFC' ? D.orange : D.blue }]}>{item.metodo}</Text>
                  </View>
                </View>
                <View style={alm.logMeta}>
                  <Text style={alm.logMetaText}>🔧 {item.ferramentas.map(f => `${f.nome} ×${f.qty}`).join(' · ')}</Text>
                </View>
                <View style={alm.logPeople}>
                  <Text style={alm.logMetaText}>👤 Responsável: <Text style={alm.boldText}>{item.responsavel}</Text></Text>
                  <Text style={alm.logMetaText}>🎫 Autorizador: <Text style={alm.boldText}>{item.autorizador}</Text></Text>
                </View>
              </View>
            )}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const alm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: D.snow, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SH * 0.85, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.silver, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.cloud },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 16, fontWeight: '800', color: D.obsidian },
  sub: { fontSize: 11, color: D.slate, marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: D.mist, alignItems: 'center', justifyContent: 'center' },
  loadState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  loadText: { fontSize: 14, color: D.slate },
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: D.carbon },
  emptySub: { fontSize: 12, color: D.ash, textAlign: 'center' },
  logCard: { backgroundColor: D.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: D.silver },
  logTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  acaoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  acaoDot: { width: 5, height: 5, borderRadius: 3 },
  acaoText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  timestamp: { fontSize: 10, color: D.slate, flex: 1 },
  metodoBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  metodoText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  logMeta: { marginBottom: 4 },
  logPeople: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  logMetaText: { fontSize: 11, color: D.iron },
  boldText: { fontWeight: '700', color: D.obsidian },
});

// ─── ShiftStatusCard (Almoxarife) ─────────────────────────────────────────────
function ShiftStatusCard({ emUso, disponiveis, noLote, atrasos, onOpenLogs, headerAnim }: {
  emUso: number; disponiveis: number; noLote: number; atrasos: number;
  onOpenLogs: () => void; headerAnim: Animated.Value;
}) {
  const ty = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  return (
    <Animated.View style={[ssc.card, { opacity: headerAnim, transform: [{ translateY: ty }] }]}>
      <View style={ssc.topRow}>
        <View>
          <Text style={ssc.cardLabel}>STATUS DO TURNO</Text>
          <Text style={ssc.cardSub}>Atualizado agora</Text>
        </View>
        <TouchableOpacity style={ssc.logBtn} onPress={onOpenLogs} activeOpacity={0.8}>
          <LogIcon size={13} color={D.iron} />
          <Text style={ssc.logBtnText}>Auditoria</Text>
        </TouchableOpacity>
      </View>
      <View style={ssc.metricsRow}>
        <View style={ssc.metric}>
          <View style={[ssc.metricDot, { backgroundColor: D.redLight }]} />
          <Text style={ssc.metricVal}>{emUso}</Text>
          <Text style={ssc.metricLbl}>Em uso</Text>
        </View>
        <View style={ssc.divider} />
        <View style={ssc.metric}>
          <View style={[ssc.metricDot, { backgroundColor: D.greenLight }]} />
          <Text style={ssc.metricVal}>{disponiveis}</Text>
          <Text style={ssc.metricLbl}>Disponíveis</Text>
        </View>
        <View style={ssc.divider} />
        <View style={ssc.metric}>
          <View style={[ssc.metricDot, { backgroundColor: atrasos > 0 ? D.amber : D.greenLight }]} />
          <Text style={[ssc.metricVal, atrasos > 0 && { color: D.amber }]}>{atrasos}</Text>
          <Text style={ssc.metricLbl}>Atrasos</Text>
        </View>
      </View>
      {atrasos > 0 && (
        <View style={ssc.alertBar}>
          <TimerIcon size={12} color={D.orange} />
          <Text style={ssc.alertText}>{atrasos} {atrasos === 1 ? 'ferramenta' : 'ferramentas'} em custódia há mais de 4h</Text>
        </View>
      )}
    </Animated.View>
  );
}

const ssc = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 14, marginHorizontal: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.6 },
  cardSub: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  logBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricDot: { width: 6, height: 6, borderRadius: 3 },
  metricVal: { fontSize: 22, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  metricLbl: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.14)' },
  alertBar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: D.orangeSoft, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1, borderColor: D.orangeLine },
  alertText: { fontSize: 11, color: D.white, fontWeight: '600', flex: 1 },
});

// ─── MyToolsSection (Colaborador) ─────────────────────────────────────────────
function MyToolsSection({ items, onDevolver }: { items: Ferramenta[]; onDevolver: () => void }) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;

  // Filtra para saber se ainda tem algo que pode ser devolvido
  const ferramentasParaDevolver = items.filter(i => !i.aguardandoDevolucao);

  return (
    <View style={my.wrap}>
      <TouchableOpacity style={my.header} onPress={() => setExpanded(v => !v)} activeOpacity={0.8}>
        <View style={my.headerLeft}>
          <View style={my.headerIconBox}><WrenchIcon size={16} color={D.orange} /></View>
          <View>
            <Text style={my.headerTitle}>Minhas Ferramentas</Text>
            <Text style={my.headerSub}>{items.length} {items.length === 1 ? 'item' : 'itens'} em custódia</Text>
          </View>
        </View>
        <View style={[my.expandBtn, expanded && my.expandBtnActive]}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d={expanded ? 'M18 15L12 9L6 15' : 'M6 9L12 15L18 9'} stroke={expanded ? D.orange : D.slate} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={my.listWrap}>
          {items.map((item, idx) => (
            <View key={item.codigo} style={[my.item, idx < items.length - 1 && my.itemBorder]}>
              <View style={my.itemLeft}>
                <View style={my.itemCode}><Text style={my.itemCodeText}>{item.codigo}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={my.itemName} numberOfLines={1}>{item.nome}</Text>
                  <View style={my.itemTagRow}>
                    {/* Renderiza a Tag de Aguardando Devolução OU o Timer */}
                    {item.aguardandoDevolucao ? (
                      <View style={{ backgroundColor: D.amberBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: D.amber }}>
                        <Text style={{ fontSize: 9, color: D.amberText, fontWeight: '700' }}>AGUARDANDO ALMOXARIFE</Text>
                      </View>
                    ) : item.custodiaDesde ? (
                      <CustodyTimer since={item.custodiaDesde} />
                    ) : (
                      <Text style={my.itemCat}>{item.categoria}</Text>
                    )}
                    <LocateButton codigo={item.codigo} nome={item.nome} />
                  </View>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>
          ))}

          {/* Só mostra o botão se tiver ferramenta que não está pendente */}
          {ferramentasParaDevolver.length > 0 && (
            <TouchableOpacity style={my.devolverBtn} onPress={onDevolver} activeOpacity={0.85}>
              <BackIcon size={15} color={D.orange} />
              <Text style={my.devolverText}>Iniciar Devolução ({ferramentasParaDevolver.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const my = StyleSheet.create({
  wrap: { backgroundColor: D.white, borderRadius: 18, marginBottom: 14, borderWidth: 1.5, borderColor: D.orangeLine, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: D.orangeSoft },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: `${D.orange}18`, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.orangeLine },
  headerTitle: { fontSize: 14, fontWeight: '800', color: D.obsidian },
  headerSub: { fontSize: 11, color: D.slate, marginTop: 1, fontWeight: '500' },
  expandBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: D.mist, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.silver },
  expandBtnActive: { backgroundColor: D.orangeSoft, borderColor: D.orangeLine },
  listWrap: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: D.cloud },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemCode: { backgroundColor: D.mist, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: D.silver },
  itemCodeText: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: D.iron, fontWeight: '600', letterSpacing: 0.5 },
  itemName: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  itemCat: { fontSize: 10, color: D.slate, marginTop: 1 },
  itemTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  devolverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: D.orangeLine, backgroundColor: D.orangeSoft },
  devolverText: { fontSize: 13, fontWeight: '700', color: D.orange },
});

function AvailableCard({ item, index, onAdd, isInLote }: { item: Ferramenta; index: number; onAdd: (f: Ferramenta) => void; isInLote: boolean }) {
  const oy = useRef(new Animated.Value(14)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, delay: index * 28, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, tension: 115, friction: 14, delay: index * 28, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(sc, { toValue: 0.97, duration: 55, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    LayoutAnimation.configureNext({ duration: 220, create: { type: 'easeInEaseOut', property: 'opacity' }, update: { type: 'spring', springDamping: 0.8 } });
    onAdd(item);
  };

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: oy }, { scale: sc }], marginBottom: 7 }}>
      <View style={[av.card, isInLote && av.cardAdded]}>
        <View style={[av.iconBox, isInLote && av.iconBoxAdded]}>
          <WrenchIcon size={16} color={isInLote ? D.green : D.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={av.name} numberOfLines={1}>{item.nome}</Text>
          <View style={av.metaRow}>
            <Text style={av.code}>{item.codigo}</Text>
            <View style={av.sep} />
            <Text style={av.cat}>{item.categoria}</Text>
          </View>
        </View>
        <LocateButton codigo={item.codigo} nome={item.nome} />
        <TouchableOpacity style={[av.addBtn, isInLote && av.addBtnAdded]} onPress={press} activeOpacity={0.8}>
          {isInLote ? <CheckIcon size={14} color={D.white} /> : <PlusIcon size={13} color={D.white} />}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const av = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.white, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: D.silver },
  cardAdded: { borderColor: `${D.green}35`, backgroundColor: D.greenBg },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  iconBoxAdded: { backgroundColor: D.greenBg },
  name: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  code: { fontSize: 10, color: D.slate, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  sep: { width: 1, height: 9, backgroundColor: D.cloud, marginHorizontal: 7 },
  cat: { fontSize: 10, color: D.slate },
  addBtn: { width: 32, height: 32, borderRadius: 9, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
  addBtnAdded: { backgroundColor: D.green },
});

function LoteCard({ item, onRemove, onQtyChange }: { item: LoteItem; onRemove: (c: string) => void; onQtyChange: (c: string, d: number) => void }) {
  const oy = useRef(new Animated.Value(-8)).current;
  const op = useRef(new Animated.Value(0)).current;
  const qtyScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(oy, { toValue: 0, tension: 130, friction: 13, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const bumpQty = () => {
    Animated.sequence([
      Animated.timing(qtyScale, { toValue: 1.35, duration: 75, useNativeDriver: true }),
      Animated.spring(qtyScale, { toValue: 1, tension: 280, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: oy }], marginBottom: 7 }}>
      <View style={lc.card}>
        <View style={lc.iconBox}><WrenchIcon size={14} color={D.orange} /></View>
        <View style={{ flex: 1 }}>
          <Text style={lc.name} numberOfLines={1}>{item.nome}</Text>
          <Text style={lc.code}>{item.codigo}</Text>
        </View>
        <View style={lc.controls}>
          <TouchableOpacity style={lc.qtyMinus} onPress={() => { bumpQty(); onQtyChange(item.codigo, -1); }} activeOpacity={0.7}>
            <MinusIcon size={12} color={D.orange} />
          </TouchableOpacity>
          <Animated.Text style={[lc.qty, { transform: [{ scale: qtyScale }] }]}>{item.qty}</Animated.Text>
          <TouchableOpacity style={lc.qtyPlus} onPress={() => { bumpQty(); onQtyChange(item.codigo, 1); }} activeOpacity={0.7}>
            <PlusIcon size={12} color={D.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.codigo)} style={lc.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <XIcon size={11} color={D.ash} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const lc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.white, borderRadius: 13, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1.5, borderColor: D.orangeLine },
  iconBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '700', color: D.obsidian },
  code: { fontSize: 10, color: D.slate, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyMinus: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: D.orangeLine, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 14, fontWeight: '900', color: D.obsidian, minWidth: 18, textAlign: 'center' },
  qtyPlus: { width: 26, height: 26, borderRadius: 7, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: D.mist, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});

function SectionHdr({ label, count, color = D.slate }: { label: string; count: number; color?: string }) {
  return (
    <View style={shdr.row}>
      <View style={[shdr.bar, { backgroundColor: color }]} />
      <Text style={[shdr.label, { color }]}>{label}</Text>
      <View style={[shdr.badge, { backgroundColor: `${color}18` }]}>
        <Text style={[shdr.num, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

const shdr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  bar: { width: 3.5, height: 14, borderRadius: 2 },
  label: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  num: { fontSize: 11, fontWeight: '800' },
});

function LoteFooter({ count, onSolicitar, anim }: { count: number; onSolicitar: () => void; anim: Animated.Value }) {
  const sc = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  return (
    <Animated.View style={[lf.wrap, { transform: [{ scale: sc }, { translateY: ty }], opacity: anim }]}>
      <TouchableOpacity style={lf.btn} onPress={onSolicitar} activeOpacity={0.88}>
        <View style={lf.leftSection}>
          <NFCChipIcon size={22} color={D.white} />
          <View>
            <Text style={lf.label}>Solicitar Retirada</Text>
            <Text style={lf.sub}>{count} {count === 1 ? 'ferramenta selecionada' : 'ferramentas selecionadas'}</Text>
          </View>
        </View>
        <View style={lf.arrowBox}><ArrowIcon size={16} color={D.white} /></View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const lf = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 200 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: D.orange, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 18, shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  label: { fontSize: 15, fontWeight: '900', color: D.white, letterSpacing: 0.1 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  arrowBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

// ─── AWAITING CONFIRMATION SCREEN ────────────────────────────────────────────
function AwaitingConfirmationScreen({ lote, solicitacaoId, onClose }: { lote: LoteItem[]; solicitacaoId: number; onClose: () => void }) {
  const [status, setStatus] = useState<'waiting' | 'approved' | 'rejected'>('waiting');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideIn = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // 1️⃣ LÓGICA DE ANIMAÇÃO (Mantemos como estava)
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideIn, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    if (status === 'waiting') loop.start();
    else loop.stop();
    return () => loop.stop();
  }, [status]);

  // 2️⃣ LÓGICA SIMPLIFICADA (Substituímos o polling por um timer de 5s)
  useEffect(() => {
    // Inicia o contador de 5 segundos (5000 ms)
    const timer = setTimeout(() => {
      onClose(); // Fecha a tela automaticamente
    }, 5000);

    // Limpa o timer caso o utilizador feche a janela manualmente antes dos 5 segundos
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <Animated.View style={[aw.container, { opacity, transform: [{ translateY: slideIn }] }]}>

      {/* Ícone de espera animado */}
      <Animated.View style={[aw.iconRing, { transform: [{ scale: pulseAnim }], borderColor: D.orangeLine }]}>
        <View style={[aw.iconRingInner, { backgroundColor: `${D.orange}20`, borderColor: `${D.orange}35` }]}>
          <AwaitingIcon size={44} color={D.orange} />
        </View>
      </Animated.View>

      {/* Textos */}
      <View style={aw.textBlock}>
        <Text style={aw.title}>Solicitação Enviada!</Text>
        <Text style={aw.subtitle}>Aguardando aprovação do{'\n'}Almoxarife...</Text>
      </View>

      {/* Lista de Itens */}
      <View style={aw.loteCard}>
        <Text style={aw.loteCardTitle}>ITENS DA SOLICITAÇÃO</Text>
        {lote.map(item => (
          <View key={item.codigo} style={aw.loteRow}>
            <View style={aw.loteDot} />
            <Text style={aw.loteCode}>{item.codigo}</Text>
            <Text style={aw.loteName} numberOfLines={1}>{item.nome}</Text>
            <View style={aw.loteQtyBadge}>
              <Text style={aw.loteQty}>×{item.qty}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Botão de fechar (caso ele não queira esperar os 5s) */}
      <TouchableOpacity style={aw.closeBtn} onPress={onClose} activeOpacity={0.85}>
        <Text style={aw.closeBtnText}>Fechar Janela</Text>
      </TouchableOpacity>

    </Animated.View>
  );
}

const aw = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  iconRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: `${D.orange}12`, borderWidth: 1.5, borderColor: D.orangeLine, alignItems: 'center', justifyContent: 'center' },
  iconRingInner: { width: 82, height: 82, borderRadius: 41, backgroundColor: `${D.orange}20`, borderWidth: 1, borderColor: `${D.orange}35`, alignItems: 'center', justifyContent: 'center' },
  textBlock: { alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '900', color: D.white, letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 22 },
  dotsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: -8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.orange },
  loteCard: { width: '100%', backgroundColor: D.nfcSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.nfcBorder, gap: 10 },
  loteCardTitle: { fontSize: 9, fontWeight: '800', color: D.orange, letterSpacing: 1.8, marginBottom: 2 },
  loteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  loteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.orange },
  loteCode: { fontSize: 10, color: D.orange, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', minWidth: 68 },
  loteName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: '500' },
  loteQtyBadge: { backgroundColor: D.orangeSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  loteQty: { fontSize: 10, fontWeight: '800', color: D.orange },
  loteSeparator: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 2 },
  loteTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loteTotalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '600' },
  loteTotalQty: { fontSize: 14, fontWeight: '900', color: D.orange },
  instructionBar: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: `${D.orange}10`, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: D.orangeLine, width: '100%' },
  instructionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.orange, marginTop: 4, flexShrink: 0 },
  instructionText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 18, fontWeight: '500' },
  closeBtn: { width: '100%', height: 54, borderRadius: 14, backgroundColor: D.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  closeBtnText: { fontSize: 15, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
});

// ════════════════════════════════════════════════════════════════════════════
// ─── MODAL DE LIBERAÇÃO (Colaborador envia solicitação) ──────────────────────
// ════════════════════════════════════════════════════════════════════════════
interface LibModalProps {
  visible: boolean;
  lote: LoteItem[];
  onClose: () => void;
  // Muda de Promise<void> para Promise<number>
  onSuccess: (crachaAlmoxarife: string, metodo: 'NFC' | 'MANUAL') => Promise<number>;
}

function LibModal({ visible, lote, onClose, onSuccess }: LibModalProps) {
  const [mode, setMode] = useState<LibMode>('nfc');
  const [nfcPhase, setNfcPhase] = useState<NFCPhase>('waiting');

  // 1️⃣ MUDANÇA AQUI: Trocámos "crachaColaborador" por "crachaAlmoxarife"
  const [crachaAlmoxarife, setCrachaAlmoxarife] = useState('');

  const [solicitacaoId, setSolicitacaoId] = useState<number | null>(null);

  const [manualPhase, setManualPhase] = useState<ManualPhase>('form');
  const [manualError, setManualError] = useState('');

  // 2️⃣ MUDANÇA AQUI: Trocámos o tipo de 'colaborador' para 'almoxarife'
  const [focusedField, setFocusedField] = useState<'almoxarife' | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(60)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setMode('nfc');
      setNfcPhase('waiting');

      // 3️⃣ MUDANÇA AQUI: Usamos a nova função para limpar o campo ao abrir o modal
      setCrachaAlmoxarife('');

      setManualPhase('form');
      setManualError('');
      setFocusedField(null);
      setSubmitting(false);
      setCountdown(3);
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    } else {
      bgOpacity.setValue(0); contentSlide.setValue(60); contentOpacity.setValue(0); successScale.setValue(0);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [visible]);

  const handleClose = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 60, duration: 240, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const startCountdown = () => {
    let c = 3;
    countdownRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      Animated.sequence([
        Animated.timing(countdownAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(countdownAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      ]).start();
      if (c <= 0) { if (countdownRef.current) clearInterval(countdownRef.current); handleClose(); }
    }, 1000);
  };

  const handleSimulateNFC = () => { setNfcPhase('simulated_connected'); setTimeout(() => setNfcPhase('confirming'), 900); };

  const handleNFCConfirm = async () => {
    setNfcPhase('submitting');
    try {
      const crachaAtual = await AsyncStorage.getItem('userCracha') ?? '0000';
      await onSuccess(crachaAtual, 'NFC');
      setNfcPhase('done');
      Animated.spring(successScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();
      startCountdown();
    } catch { setNfcPhase('error'); }
  };

  // ── Fluxo Manual: Colaborador informa apenas seu próprio crachá ───────────
  const handleManualSubmit = async () => {
    if (!crachaAlmoxarife.trim()) {
      setManualError('Informe o ID do Almoxarife para enviar o pedido');
      return;
    }
    try {
      setSubmitting(true);
      setManualPhase('submitting');
      setManualError('');
      // Envia o crachá do almoxarife para a função onSuccess
      await onSuccess(crachaAlmoxarife.trim(), 'MANUAL');
      setManualPhase('awaiting');
    } catch (e: any) {
      setManualError(e.message || 'Erro ao enviar solicitação');
      setManualPhase('form');
    } finally {
      setSubmitting(false);
    }
  };

  const getNFCText = () => {
    switch (nfcPhase) {
      case 'waiting': return { title: 'Aguardando NFC', sub: 'Aproxime o celular do leitor do Almoxarife', color: D.orange };
      case 'simulated_connected': return { title: 'Leitor Detectado!', sub: 'Sincronizando lote…', color: D.orange };
      case 'confirming': return { title: 'Confirme a Solicitação', sub: 'Verifique os itens antes de enviar', color: D.orange };
      case 'submitting': return { title: 'Enviando…', sub: 'Aguardando resposta da API', color: D.amber };
      case 'done': return { title: 'Solicitação Enviada!', sub: `Encerrando em ${countdown}s…`, color: D.green };
      case 'error': return { title: 'Erro no envio', sub: 'Tente via Identificação Manual', color: D.red };
    }
  };

  const txt = getNFCText();
  const totalQty = lote.reduce((a, c) => a + c.qty, 0);

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[nm.overlay, { opacity: bgOpacity }]} />
      <Animated.View style={[nm.container, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView edges={['top']} style={{ backgroundColor: D.nfcBg }}>
          <View style={nm.header}>
            <View style={nm.headerLeft}>
              <View style={nm.loteTag}>
                <Text style={nm.loteTagText}>{totalQty} {totalQty === 1 ? 'ITEM' : 'ITENS'}</Text>
              </View>
              {manualPhase !== 'awaiting' && (
                <TouchableOpacity
                  style={nm.modeToggle}
                  onPress={() => { setMode(m => m === 'nfc' ? 'manual' : 'nfc'); setNfcPhase('waiting'); setManualError(''); setManualPhase('form'); }}
                  activeOpacity={0.7}
                >
                  {mode === 'nfc'
                    ? <KeyboardIcon size={14} color="rgba(255,255,255,0.5)" />
                    : <NFCChipIcon size={14} color="rgba(255,255,255,0.5)" />
                  }
                  <Text style={nm.modeToggleText}>{mode === 'nfc' ? 'Manual' : 'NFC'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {nfcPhase !== 'done' && manualPhase !== 'awaiting' && (
              <TouchableOpacity onPress={handleClose} style={nm.cancelBtn} activeOpacity={0.7}>
                <Text style={nm.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* ── Fluxo NFC ── */}
        {mode === 'nfc' && (
          <>
            <View style={nm.radarArea}>
              <RadarPulse active={visible} phase={nfcPhase} />
              <View style={nm.phaseTextWrap}>
                <Text style={[nm.phaseTitle, { color: txt.color }]}>{txt.title}</Text>
                <Text style={nm.phaseSub}>{txt.sub}</Text>
              </View>
              {nfcPhase === 'waiting' && (
                <View style={nm.statusRow}>
                  <View style={[nm.statusDot, { backgroundColor: D.orange }]} />
                  <Text style={nm.statusLabel}>Aguardando leitura NFC…</Text>
                </View>
              )}
            </View>
            <View style={nm.contentArea}>
              {(nfcPhase === 'simulated_connected' || nfcPhase === 'confirming') && (
                <View style={nm.itemsCard}>
                  <Text style={nm.itemsCardTitle}>ITENS DO PEDIDO</Text>
                  {lote.map(item => (
                    <View key={item.codigo} style={nm.itemRow}>
                      <View style={nm.itemDot} />
                      <Text style={nm.itemCode}>{item.codigo}</Text>
                      <Text style={nm.itemName} numberOfLines={1}>{item.nome}</Text>
                      <View style={nm.itemQtyBadge}><Text style={nm.itemQty}>×{item.qty}</Text></View>
                    </View>
                  ))}
                </View>
              )}
              {nfcPhase === 'waiting' && (
                <View style={nm.waitingSection}>
                  <TouchableOpacity style={nm.simBtn} onPress={handleSimulateNFC} activeOpacity={0.6}>
                    <Text style={nm.simBtnText}>Simular Aproximação NFC</Text>
                  </TouchableOpacity>
                </View>
              )}
              {nfcPhase === 'confirming' && (
                <TouchableOpacity style={nm.acceptBtn} onPress={handleNFCConfirm} activeOpacity={0.87}>
                  <CheckIcon size={20} color={D.white} />
                  <Text style={nm.acceptBtnText}>Confirmar e Enviar Pedido</Text>
                </TouchableOpacity>
              )}
              {nfcPhase === 'submitting' && (
                <View style={nm.submittingWrap}>
                  <ActivityIndicator color={D.orange} size="small" />
                  <Text style={nm.submittingText}>Enviando solicitação para o Almoxarife…</Text>
                </View>
              )}
              {nfcPhase === 'error' && (
                <View style={nm.errorCard}>
                  <Text style={nm.errorText}>Falha no envio. Tente pelo modo Manual.</Text>
                  <TouchableOpacity onPress={() => { setMode('manual'); setNfcPhase('waiting'); }} style={nm.errorSwitchBtn}>
                    <Text style={nm.errorSwitchText}>Ir para Manual</Text>
                  </TouchableOpacity>
                </View>
              )}
              {nfcPhase === 'done' && (
                <Animated.View style={[nm.doneCard, { transform: [{ scale: successScale }] }]}>
                  <View style={nm.doneIconCircle}><CheckIcon size={32} color={D.green} /></View>
                  <Text style={nm.doneTitle}>Pedido Enviado!</Text>
                  <Text style={nm.doneSub}>Aguarde a aprovação do Almoxarife</Text>
                  <Animated.Text style={[nm.countdown, { transform: [{ scale: countdownAnim }] }]}>Fechando em {countdown}s</Animated.Text>
                </Animated.View>
              )}
            </View>
          </>
        )}

        {/* ── Fluxo Manual — Awaiting ── */}
        {mode === 'manual' && manualPhase === 'awaiting' && (
          <AwaitingConfirmationScreen
            lote={lote}
            solicitacaoId={solicitacaoId || 0} // <--- Passa o ID!
            onClose={handleClose}
          />
        )}

        {/* ── Fluxo Manual — Formulário (apenas crachá do colaborador) ── */}
        {mode === 'manual' && manualPhase !== 'awaiting' && (
          <KeyboardAvoidingView style={nm.manualContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={nm.manualHeader}>
              <KeyboardIcon size={32} color={D.orange} />
              <Text style={nm.manualTitle}>Identificação Manual</Text>
              <Text style={nm.manualSub}>Informe seu ID para enviar a solicitação ao Almoxarife</Text>
            </View>

            <View style={nm.manualLoteResume}>
              <Text style={nm.manualLoteLabel}>FERRAMENTAS NO PEDIDO</Text>
              {lote.map(item => (
                <View key={item.codigo} style={nm.manualLoteRow}>
                  <View style={nm.itemDot} />
                  <Text style={nm.manualLoteCode}>{item.codigo}</Text>
                  <Text style={nm.manualLoteName} numberOfLines={1}>{item.nome}</Text>
                  <Text style={nm.manualLoteQty}>×{item.qty}</Text>
                </View>
              ))}
            </View>

            {/* Campo único: ID do Colaborador */}
            <View style={nm.manualInputWrap}>
              <View style={nm.manualInputLabelRow}>
                <KeyAlmoxarifeIcon size={13} color={D.orange} />
                <Text style={nm.manualInputLabel}>ID DO ALMOXARIFE</Text>
                <View style={nm.requiredBadge}><Text style={nm.requiredText}>Obrigatório</Text></View>
              </View>
              <View style={[nm.manualInput, {
                borderColor: focusedField === 'almoxarife' ? D.orange : D.nfcBorder,
                borderWidth: focusedField === 'almoxarife' ? 1.8 : 1.5,
              }]}>
                <KeyAlmoxarifeIcon size={16} color={focusedField === 'almoxarife' ? D.orange : 'rgba(255,87,34,0.45)'} />
                <TextInput
                  style={nm.manualInputText}
                  placeholder="Ex: 5012 (ID de quem vai aprovar)"
                  placeholderTextColor="rgba(255,255,255,0.22)"
                  value={crachaAlmoxarife}
                  onChangeText={v => { setCrachaAlmoxarife(v); setManualError(''); }}
                  onFocus={() => setFocusedField('almoxarife')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                  autoCorrect={false}
                  editable={!submitting}
                />
                {crachaAlmoxarife.length > 0 && (
                  <View style={nm.inputFilledDot} />
                )}
              </View>
            </View>

            {/* Info box: fluxo explicado */}
            <View style={nm.flowInfoBox}>
              <View style={nm.flowStep}>
                <View style={[nm.flowStepDot, { backgroundColor: D.orange }]} />
                <Text style={nm.flowStepText}>Você envia a solicitação com seu ID</Text>
              </View>
              <View style={nm.flowArrow}><ArrowIcon size={12} color="rgba(255,255,255,0.2)" /></View>
              <View style={nm.flowStep}>
                <View style={[nm.flowStepDot, { backgroundColor: D.greenLight }]} />
                <Text style={nm.flowStepText}>Almoxarife recebe e aprova</Text>
              </View>
            </View>

            {!!manualError && (
              <View style={nm.manualError}>
                <XIcon size={12} color={D.redLight} />
                <Text style={nm.manualErrorText}>{manualError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                nm.manualSubmitBtn,
                // O botão fica desativado se estiver a enviar OU se o crachá do almoxarife estiver vazio
                (submitting || !crachaAlmoxarife.trim()) && nm.manualSubmitBtnDisabled,
              ]}
              onPress={handleManualSubmit}
              // Bloqueia o clique nas mesmas condições
              disabled={submitting || !crachaAlmoxarife.trim()}
              activeOpacity={0.88}
            >
              {submitting ? (
                <ActivityIndicator color={D.white} size="small" />
              ) : (
                <>
                  <ArrowIcon size={18} color={D.white} />
                  <Text style={nm.manualSubmitText}>Enviar Solicitação</Text>
                </>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: D.nfcBg }} />
      </Animated.View>
    </Modal>
  );
}

const nm = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)' },
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: D.nfcBg, flexDirection: 'column' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loteTag: { backgroundColor: D.orangeSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: D.orangeLine },
  loteTagText: { fontSize: 11, fontWeight: '800', color: D.orange, letterSpacing: 1.5 },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeToggleText: { fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: '600' },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  cancelText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
  radarArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 32 },
  phaseTextWrap: { alignItems: 'center', gap: 8 },
  phaseTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  phaseSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500', letterSpacing: 0.5 },
  contentArea: { paddingHorizontal: 20, paddingBottom: 16, gap: 14, maxHeight: SH * 0.42 },
  itemsCard: { backgroundColor: D.nfcSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.nfcBorder, gap: 10 },
  itemsCardTitle: { fontSize: 10, fontWeight: '800', color: D.orange, letterSpacing: 1.8, marginBottom: 2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.orange },
  itemCode: { fontSize: 10, color: D.orange, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', minWidth: 72 },
  itemName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  itemQtyBadge: { backgroundColor: D.orangeSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemQty: { fontSize: 11, fontWeight: '800', color: D.orange },
  waitingSection: { alignItems: 'center', paddingTop: 8 },
  simBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed' },
  simBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
  acceptBtn: { height: 56, borderRadius: 14, backgroundColor: D.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  acceptBtnText: { fontSize: 15, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  submittingWrap: { alignItems: 'center', gap: 12, paddingVertical: 10 },
  submittingText: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  errorCard: { backgroundColor: `${D.red}18`, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: `${D.red}30`, alignItems: 'center' },
  errorText: { fontSize: 13, color: D.redLight, textAlign: 'center', lineHeight: 20 },
  errorSwitchBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: D.redLight },
  errorSwitchText: { fontSize: 12, color: D.redLight, fontWeight: '700' },
  doneCard: { backgroundColor: D.nfcSurface, borderRadius: 20, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: `${D.green}40`, margin: 20 },
  doneIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: `${D.green}15`, borderWidth: 2, borderColor: `${D.green}40`, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 20, fontWeight: '900', color: D.white, letterSpacing: -0.3 },
  doneSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  countdown: { fontSize: 12, color: D.green, fontWeight: '700', marginTop: 4 },
  manualContainer: { flex: 1, padding: 22, gap: 14, justifyContent: 'center' },
  manualHeader: { alignItems: 'center', gap: 8, marginBottom: 4 },
  manualTitle: { fontSize: 22, fontWeight: '900', color: D.white, letterSpacing: -0.3 },
  manualSub: { fontSize: 12, color: 'rgba(255,255,255,0.40)', textAlign: 'center', lineHeight: 18 },
  manualLoteResume: { backgroundColor: D.nfcSurface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.nfcBorder, gap: 8 },
  manualLoteLabel: { fontSize: 9, fontWeight: '800', color: D.orange, letterSpacing: 1.6 },
  manualLoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manualLoteCode: { fontSize: 10, color: D.orange, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', minWidth: 72 },
  manualLoteName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  manualLoteQty: { fontSize: 11, fontWeight: '800', color: D.orange },
  manualInputWrap: { gap: 7 },
  manualInputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  manualInputLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.38)', letterSpacing: 1.6, flex: 1 },
  requiredBadge: { backgroundColor: `${D.orange}18`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: D.orangeLine },
  requiredText: { fontSize: 8, fontWeight: '800', color: D.orange, letterSpacing: 0.5 },
  manualInput: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.nfcSurface, borderRadius: 12, paddingHorizontal: 16, height: 54 },
  manualInputText: { flex: 1, fontSize: 16, color: D.white, fontWeight: '600' },
  inputFilledDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: D.green },
  // Caixa de fluxo explicativo
  flowInfoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  flowStep: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  flowStepDot: { width: 7, height: 7, borderRadius: 4, marginTop: 3, flexShrink: 0 },
  flowStepText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.40)', lineHeight: 16 },
  flowArrow: { paddingHorizontal: 2 },
  manualError: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${D.red}18`, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: `${D.red}30` },
  manualErrorText: { fontSize: 13, color: D.redLight, fontWeight: '600', flex: 1 },
  manualSubmitBtn: { height: 58, borderRadius: 15, backgroundColor: D.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  manualSubmitBtnDisabled: { backgroundColor: 'rgba(255,87,34,0.3)', shadowOpacity: 0 },
  manualSubmitText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
});

// ════════════════════════════════════════════════════════════════════════════
// ─── VIEW DO COLABORADOR ─────────────────────────────────────────────────────
// Catálogo de ferramentas disponíveis + lote + botão "Solicitar Retirada"
// ════════════════════════════════════════════════════════════════════════════
interface ColaboradorViewProps {
  disponíveis: Ferramenta[];
  minhasFerramentas: Ferramenta[];
  lote: LoteItem[];
  loading: boolean;
  onAdd: (f: Ferramenta) => void;
  onRemove: (c: string) => void;
  onQtyChange: (c: string, d: number) => void;
  onDevolver: () => void;
  onSolicitar: () => void;
  fabAnim: Animated.Value;
  isInLote: (c: string) => boolean;
}

function ColaboradorView({
  disponíveis, minhasFerramentas, lote, loading,
  onAdd, onRemove, onQtyChange, onDevolver, onSolicitar,
  fabAnim, isInLote,
}: ColaboradorViewProps) {
  const totalQty = lote.reduce((a, c) => a + c.qty, 0);

  return (
    <>
      <ScrollView
        style={s.body}
        contentContainerStyle={[s.bodyContent, { paddingBottom: lote.length > 0 ? 130 : 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {minhasFerramentas.length > 0 && (
          <View style={s.section}>
            <MyToolsSection items={minhasFerramentas} onDevolver={onDevolver} />
          </View>
        )}
        {lote.length > 0 && (
          <View style={s.section}>
            <SectionHdr label="Meu Pedido" count={totalQty} color={D.orange} />
            {lote.map(item => (
              <LoteCard key={item.codigo} item={item} onRemove={onRemove} onQtyChange={onQtyChange} />
            ))}
            <View style={s.loteNote}>
              <NFCChipIcon size={14} color={D.orange} />
              <Text style={s.loteNoteText}>Toque em "Solicitar Retirada" para enviar ao Almoxarife. Você receberá a confirmação assim que aprovado.</Text>
            </View>
          </View>
        )}
        <View style={s.section}>
          <SectionHdr label="Ferramentas Disponíveis" count={disponíveis.length} color={D.greenLight} />
          {loading ? (
            <View style={s.loadState}>
              <ActivityIndicator color={D.orange} size="large" />
              <Text style={s.loadText}>Carregando ativos…</Text>
            </View>
          ) : disponíveis.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🔧</Text>
              <Text style={s.emptyTitle}>Nenhum ativo disponível</Text>
              <Text style={s.emptySub}>Todos os ativos estão alocados ou em manutenção</Text>
            </View>
          ) : (
            disponíveis.map((item, idx) => (
              <AvailableCard key={item.codigo} item={item} index={idx} onAdd={onAdd} isInLote={isInLote(item.codigo)} />
            ))
          )}
        </View>
      </ScrollView>
      <LoteFooter count={totalQty} onSolicitar={onSolicitar} anim={fabAnim} />
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── VIEW DO ALMOXARIFE ──────────────────────────────────────────────────────
// Dashboard: quem está com o quê, atrasos, histórico de auditoria.
// Não exibe catálogo nem lote — almoxarife não pede ferramentas.
// ════════════════════════════════════════════════════════════════════════════
interface AlmoxarifeViewProps {
  todasFerramentas: Ferramenta[];
  emUso: Ferramenta[];
  disponiveis: number;
  atrasos: number;
  loading: boolean;
  onOpenLogs: () => void;
  headerAnim: Animated.Value;
  onRefresh: () => void;
}

function AlmoxarifeView({
  todasFerramentas, emUso, disponiveis, atrasos, loading, onOpenLogs, headerAnim, onRefresh,
}: AlmoxarifeViewProps) {
  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={[s.bodyContent, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Seção: Em Custódia (quem está com o quê) */}
      <View style={s.section}>
        <SectionHdr label="Em custódia agora" count={emUso.length} color={D.redLight} />
        {loading ? (
          <View style={s.loadState}>
            <ActivityIndicator color={D.orange} size="large" />
            <Text style={s.loadText}>Carregando inventário…</Text>
          </View>
        ) : emUso.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>✅</Text>
            <Text style={s.emptyTitle}>Nenhuma ferramenta alocada</Text>
            <Text style={s.emptySub}>Todo o estoque está disponível no momento</Text>
          </View>
        ) : (
          emUso.map((item, idx) => (
            <View key={item.codigo} style={adv.card}>
              {item.custodiaDesde && (Date.now() - item.custodiaDesde) > 4 * 60 * 60 * 1000 && (
                <View style={adv.overdueStrip} />
              )}
              <View style={[adv.iconBox, { backgroundColor: D.redBg }]}>
                <WrenchIcon size={15} color={D.redLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={adv.name} numberOfLines={1}>{item.nome}</Text>
                <View style={adv.metaRow}>
                  <Text style={adv.code}>{item.codigo}</Text>
                  {item.alocadoPara ? (
                    <>
                      <View style={adv.sep} />
                      <UserColaboradorIcon size={10} color={D.slate} />
                      <Text style={adv.allocText}>{item.alocadoPara}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View style={adv.rightCol}>
                {item.custodiaDesde ? <CustodyTimer since={item.custodiaDesde} /> : <StatusBadge status={item.status} />}
                <LocateButton codigo={item.codigo} nome={item.nome} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Seção: Inventário completo (todos os itens para visão gerencial) */}
      <View style={s.section}>
        <SectionHdr label="Inventário Completo" count={todasFerramentas.length} color={D.greenLight} />
        {!loading && todasFerramentas.filter(f => f.status !== 'Em uso').map(item => (
          <View key={item.codigo} style={[adv.card, { borderColor: D.silver }]}>
            <View style={[adv.iconBox, { backgroundColor: D.orangeSoft }]}>
              <WrenchIcon size={15} color={D.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={adv.name} numberOfLines={1}>{item.nome}</Text>
              <Text style={adv.code}>{item.codigo} · {item.categoria}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
        ))}
      </View>

      {/* Banner informativo: bloqueio de auto-retirada */}
      <View style={adv.infoBlock}>
        <View style={adv.infoIconBox}>
          <LockIcon size={18} color={D.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={adv.infoTitle}>Retiradas bloqueadas para Almoxarife</Text>
          <Text style={adv.infoDesc}>
            Somente Colaboradores podem solicitar ferramentas. Almoxarife detém a custódia legal do estoque e não pode fazer pedidos para si mesmo.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const adv = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.white, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 13, borderWidth: 1.5, borderColor: `${D.red}20`, marginBottom: 7, overflow: 'hidden' },
  overdueStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: D.orange },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  code: { fontSize: 10, color: D.slate, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  sep: { width: 1, height: 9, backgroundColor: D.cloud },
  allocText: { fontSize: 10, color: D.iron, fontWeight: '600' },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  infoBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: D.orangeSoft, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.orangeLine, marginTop: 8 },
  infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${D.orange}18`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoTitle: { fontSize: 12, fontWeight: '800', color: D.obsidian, marginBottom: 4 },
  infoDesc: { fontSize: 11, color: D.iron, lineHeight: 16 },
});

interface DevolucaoModalProps {
  visible: boolean;
  ferramentas: Ferramenta[];
  onClose: () => void;
  onSubmit: (crachaAlmoxarife: string) => Promise<void>;
}

function DevolucaoModal({ visible, ferramentas, onClose, onSubmit }: DevolucaoModalProps) {
  const [cracha, setCracha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (visible) { setCracha(''); setErro(''); setLoading(false); }
  }, [visible]);

  if (!visible) return null;

  const handleAction = async () => {
    if (!cracha.trim()) { setErro('Informe o ID do Almoxarife'); return; }
    try {
      setLoading(true);
      await onSubmit(cracha.trim());
    } catch (e: any) {
      setErro(e.message || 'Erro ao processar a devolução');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={nm.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: D.nfcBg, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: D.nfcBorder }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <BackIcon size={32} color={D.orange} />
            <Text style={[nm.manualTitle, { marginTop: 12 }]}>Devolver Ferramentas</Text>
            <Text style={nm.manualSub}>Entregue as ferramentas ao Almoxarife e digite o ID dele para confirmar a devolução.</Text>
          </View>

          <View style={[nm.manualLoteResume, { marginBottom: 16, maxHeight: 200 }]}>
            <Text style={nm.manualLoteLabel}>ITENS A DEVOLVER ({ferramentas.length})</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ferramentas.map(f => (
                <View key={f.codigo} style={nm.manualLoteRow}>
                  <View style={nm.itemDot} />
                  <Text style={nm.manualLoteCode}>{f.codigo}</Text>
                  <Text style={nm.manualLoteName} numberOfLines={1}>{f.nome}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={nm.manualInputWrap}>
            <View style={nm.manualInputLabelRow}>
              <KeyAlmoxarifeIcon size={13} color={D.orange} />
              <Text style={nm.manualInputLabel}>ID DO ALMOXARIFE</Text>
            </View>
            <View style={[nm.manualInput, { marginBottom: 10, marginTop: 6 }]}>
              <KeyAlmoxarifeIcon size={16} color={D.orange} />
              <TextInput
                style={nm.manualInputText}
                placeholder="Ex: 5012 (Quem está recebendo)"
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={cracha}
                onChangeText={v => { setCracha(v); setErro(''); }}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {!!erro && (
            <View style={[nm.manualError, { marginBottom: 14 }]}>
              <XIcon size={12} color={D.redLight} />
              <Text style={nm.manualErrorText}>{erro}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity style={[nm.cancelBtn, { flex: 1, alignItems: 'center', justifyContent: 'center', height: 54 }]} onPress={onClose} disabled={loading}>
              <Text style={nm.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[nm.manualSubmitBtn, { flex: 2, height: 54 }, (!cracha.trim() || loading) && nm.manualSubmitBtnDisabled]}
              onPress={handleAction}
              disabled={!cracha.trim() || loading}
            >
              {loading ? <ActivityIndicator color={D.white} /> : <Text style={nm.manualSubmitText}>Confirmar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface DevolucaoAprovacaoModalProps {
  visible: boolean;
  mov: any; // Dados da movimentação vindo da API
  onClose: () => void;
  onAprovar: (id: number, status: 'ok' | 'com_defeito', obs: string) => Promise<void>;
  onRecusar: (id: number, motivo: string) => Promise<void>;
}

function DevolucaoAprovacaoModal({ visible, mov, onClose, onAprovar, onRecusar }: DevolucaoAprovacaoModalProps) {
  const [checklist, setChecklist] = useState<'ok' | 'com_defeito'>('ok');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) { setChecklist('ok'); setObs(''); setLoading(false); }
  }, [visible]);

  if (!visible || !mov) return null;

  // O backend envia os relacionamentos, então pegamos os dados assim:
  const ferramentaNome = mov.ferramenta?.nome || 'Ferramenta Desconhecida';
  const ferramentaCodigo = mov.ferramenta?.codigo_patrimonio || '---';
  const colaboradorNome = mov.usuario?.name || mov.usuario?.nome || 'Colaborador';

  const handleAprovar = async () => {
    setLoading(true);
    try { await onAprovar(mov.id, checklist, obs); }
    catch (e) { /* Erro tratado no toast da tela principal */ }
    setLoading(false);
  };

  const handleRecusar = async () => {
    setLoading(true);
    try { await onRecusar(mov.id, obs || 'Recusado pelo almoxarife.'); }
    catch (e) { /* Erro tratado no toast da tela principal */ }
    setLoading(false);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={nm.overlay} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: D.nfcBg, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: D.nfcBorder }}>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <WrenchIcon size={32} color={D.orange} />
            <Text style={[nm.manualTitle, { marginTop: 12, textAlign: 'center' }]}>Devolução Pendente</Text>
            <Text style={nm.manualSub}>{colaboradorNome} está devolvendo esta ferramenta:</Text>
          </View>

          <View style={nm.itemsCard}>
            <View style={nm.itemRow}>
              <View style={nm.itemDot} />
              <Text style={nm.itemCode}>{ferramentaCodigo}</Text>
              <Text style={nm.itemName} numberOfLines={2}>{ferramentaNome}</Text>
            </View>
          </View>

          <Text style={[nm.manualLoteLabel, { marginTop: 20, marginBottom: 8 }]}>CHECKLIST DE RECEBIMENTO</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity
              style={[nm.modeToggle, { flex: 1, justifyContent: 'center', borderColor: checklist === 'ok' ? D.green : D.silver, backgroundColor: checklist === 'ok' ? D.greenBg : 'transparent' }]}
              onPress={() => setChecklist('ok')}
            >
              <CheckIcon size={16} color={checklist === 'ok' ? D.green : D.slate} />
              <Text style={[nm.modeToggleText, { color: checklist === 'ok' ? D.green : D.slate }]}>Tudo OK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[nm.modeToggle, { flex: 1, justifyContent: 'center', borderColor: checklist === 'com_defeito' ? D.redLight : D.silver, backgroundColor: checklist === 'com_defeito' ? D.redBg : 'transparent' }]}
              onPress={() => setChecklist('com_defeito')}
            >
              <XIcon size={16} color={checklist === 'com_defeito' ? D.redLight : D.slate} />
              <Text style={[nm.modeToggleText, { color: checklist === 'com_defeito' ? D.redLight : D.slate }]}>Com Defeito</Text>
            </TouchableOpacity>
          </View>

          <View style={nm.manualInputWrap}>
            <Text style={nm.manualInputLabel}>OBSERVAÇÃO / MOTIVO (OPCIONAL)</Text>
            <View style={[nm.manualInput, { height: 'auto', paddingVertical: 10 }]}>
              <TextInput
                style={[nm.manualInputText, { minHeight: 40 }]}
                placeholder="Ex: Voltou com a ponta gasta..."
                placeholderTextColor="rgba(255,255,255,0.22)"
                value={obs}
                onChangeText={setObs}
                multiline
                editable={!loading}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity style={[nm.cancelBtn, { flex: 1, alignItems: 'center', justifyContent: 'center', height: 54, borderColor: D.redLight }]} onPress={handleRecusar} disabled={loading}>
              <Text style={[nm.cancelText, { color: D.redLight, fontWeight: '700' }]}>Não Recebi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[nm.manualSubmitBtn, { flex: 2, height: 54, backgroundColor: D.green }]} onPress={handleAprovar} disabled={loading}>
              {loading ? <ActivityIndicator color={D.white} /> : <Text style={nm.manualSubmitText}>Confirmar Recebimento</Text>}
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ─── TELA PRINCIPAL ──────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
export default function AlmoxarifadoScreen() {
  // ── Role — fonte única de verdade ─────────────────────────────────────────
  const { user, isLoading: authLoading } = useAuth();
  const { naoLidas, startPolling, stopPolling } = useNotificacoes();
  const isAlmoxarife = user?.role === 'almoxarife';
  const isColaborador = !isAlmoxarife; // colaborador, admin sem papel especial, etc.
  // Estados para a devolução do lado do Almoxarife
  const [devPendenteAtual, setDevPendenteAtual] = useState<any>(null);
  const [devAprovacaoVisible, setDevAprovacaoVisible] = useState(false);

  const [todasFerramentas, setTodasFerramentas] = useState<Ferramenta[]>([]);
  const [minhasFerramentas, setMinhasFerramentas] = useState<Ferramenta[]>([]);
  const [disponíveis, setDisponíveis] = useState<Ferramenta[]>([]);
  const [lote, setLote] = useState<LoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [libModalVisible, setLibModalVisible] = useState(false);
  const [auditLogVisible, setAuditLogVisible] = useState(false);
  const [toastState, setToastState] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' | 'info' });
  // Adicione junto aos outros states, próximo da linha ~1163
  const [devolucaoModalVisible, setDevolucaoModalVisible] = useState(false);
  const {
    solicitacaoAtual,
    modalVisible: solicitacaoModalVisible,
    aprovando,
    recusando,
    aprovar,
    recusar,
    fecharModal,
  } = useSolicitacoesListener();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  // RADAR DO ALMOXARIFE: Busca devoluções pendentes
  useEffect(() => {
    if (!isAlmoxarife) return;

    let isChecking = false;
    const interval = setInterval(async () => {
      // Se já estiver com o modal aberto, não atrapalha
      if (isChecking || devAprovacaoVisible) return;

      isChecking = true;
      try {
        const pendentes = await apiClient.listarDevolucoesPendentes();
        // Se a API retornou algo, abre o modal com a primeira ferramenta da fila
        if (pendentes && pendentes.length > 0) {
          setDevPendenteAtual(pendentes[0]);
          setDevAprovacaoVisible(true);
        }
      } catch (e) {
        // Ignora erros de rede silenciosamente
      } finally {
        isChecking = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAlmoxarife, devAprovacaoVisible]);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    loadData();
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    // FAB só faz sentido para colaborador
    Animated.spring(fabAnim, { toValue: (!isAlmoxarife && lote.length > 0) ? 1 : 0, tension: 110, friction: 12, useNativeDriver: true }).start();
  }, [lote.length, isAlmoxarife]);

  const loadData = async () => {
    try {
      setLoading(true);
      const cracha = await AsyncStorage.getItem('userCracha');
      const custodyTs = await loadCustodyTimestamps();

      const [todasRes, minhasRes] = await Promise.allSettled([
        apiClient.listarFerramentas(),
        cracha ? apiClient.listarMinhasFerramentas(cracha) : Promise.resolve([]),
      ]);

      const todas: Ferramenta[] = todasRes.status === 'fulfilled' ? (todasRes.value ?? []) : [];
      const minhas: Ferramenta[] = minhasRes.status === 'fulfilled' ? (minhasRes.value ?? []) : [];

      // Para o almoxarife, enriquecer todas as ferramentas Em Uso com custodyTimer
      const todasComTimer = todas.map((f: Ferramenta) => f.status === 'Em uso'
        ? { ...f, custodiaDesde: custodyTs[f.codigo] ?? undefined }
        : f
      );

      const minhasComTimer = minhas
        .filter((f: Ferramenta) => f.status === 'Em uso')
        .map((f: Ferramenta) => ({
          ...f,
          custodiaDesde: custodyTs[f.codigo] ?? Date.now(),
        }));

      const newTs = { ...custodyTs };
      minhasComTimer.forEach(f => { if (!newTs[f.codigo]) newTs[f.codigo] = f.custodiaDesde!; });
      await saveCustodyTimestamps(newTs);

      setTodasFerramentas(todasComTimer);
      setMinhasFerramentas(minhasComTimer);
      setDisponíveis(todas.filter((f: Ferramenta) => f.status === 'Disponível'));
    } catch (err: any) {
      showToast('Erro ao carregar ferramentas: ' + (err.message || 'Falha na API'), 'error');
      setTodasFerramentas([]);
      setDisponíveis([]);
      setMinhasFerramentas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovarDevolucao = async (id: number, status: 'ok' | 'com_defeito', obs: string) => {
    try {
      await apiClient.confirmarDevolucao(id, status, obs);
      showToast('Devolução confirmada com sucesso!', 'success');
      setDevAprovacaoVisible(false);
      setDevPendenteAtual(null);
      loadData(); // Atualiza a tela do Almoxarife
    } catch (e: any) {
      showToast(e.message || 'Erro ao confirmar', 'error');
    }
  };

  const handleRecusarDevolucao = async (id: number, motivo: string) => {
    try {
      await apiClient.recusarDevolucao(id, motivo);
      showToast('Devolução recusada.', 'info');
      setDevAprovacaoVisible(false);
      setDevPendenteAtual(null);
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Erro ao recusar', 'error');
    }
  };

  const addToLote = useCallback((ferramenta: Ferramenta) => {
    setLote(prev => {
      if (prev.find(i => i.codigo === ferramenta.codigo)) return prev;
      return [{ ...ferramenta, qty: 1 }, ...prev];
    });
  }, []);

  const removeFromLote = (codigo: string) => {
    LayoutAnimation.configureNext({ duration: 200, delete: { type: 'easeInEaseOut', property: 'opacity' }, update: { type: 'spring', springDamping: 0.9 } });
    setLote(prev => prev.filter(i => i.codigo !== codigo));
  };

  const changeQty = (codigo: string, delta: number) => {
    setLote(prev => prev.map(i => i.codigo === codigo ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  };

  /**
   * handleLibSuccess — GUARD DE ROLE
   * Almoxarife nunca deve chegar aqui via UI normal (FAB oculto),
   * mas adicionamos um guard explícito como segunda camada de defesa.
   */
  const handleLibSuccess = async (crachaAlmoxarife: string, metodo: 'NFC' | 'MANUAL'): Promise<number> => {
    if (isAlmoxarife) throw new Error('Almoxarife não pode solicitar.');

    const response = await apiClient.criarSolicitacao({
      cracha_almoxarife: crachaAlmoxarife,
      ferramentas: lote.map(f => ({
        codigo: f.codigo,
        qtd: f.qty,
        checklist: 'REALIZADO',
        observacao: 'Solicitação via app Marilan'
      })),
    });

    const crachaAtual = await AsyncStorage.getItem('userCracha') ?? 'DESCONHECIDO';
    const log: AuditLog = {
      id: genId(),
      timestamp: Date.now(),
      acao: 'RETIRADA',
      ferramentas: lote.map(f => ({ codigo: f.codigo, nome: f.nome, qty: f.qty })),
      responsavel: crachaAtual,
      autorizador: 'PENDENTE_APROVACAO',
      metodo,
    };
    await saveAuditLog(log);

    // ❌ APAGAMOS O setLote([]) E O showToast DAQUI! A lista vai continuar na tela!

    // Retornamos o ID gerado pelo banco para a tela de espera
    return response.solicitacao.id;
  };

  const handleDevolver = () => setDevolucaoModalVisible(true);

  // Adicione a função que vai conversar com a API
  const handleConfirmarDevolucao = async (crachaAlmoxarife: string) => {
    const crachaColab = await AsyncStorage.getItem('userCracha');
    if (!crachaColab) throw new Error("ID do colaborador não encontrado");

    // Nova requisição (passando apenas o código e o crachá do colaborador)
    await apiClient.solicitarDevolucao({
      cracha_colaborador: crachaColab,
      ferramentas: minhasFerramentas
        .filter(f => !f.aguardandoDevolucao) // Só manda o que já não tá pendente
        .map(f => ({ codigo: f.codigo }))
    });

    showToast(`Solicitação enviada ao Almoxarife!`, 'success');
    setDevolucaoModalVisible(false);
    loadData(); // Vai recarregar e a etiqueta "AGUARDANDO ALMOXARIFE" vai aparecer!
  };

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastState({ visible: true, msg, type });
    setTimeout(() => setToastState(prev => ({ ...prev, visible: false })), 3200);
  };

  const isInLote = (codigo: string) => lote.some(i => i.codigo === codigo);
  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const emUso = todasFerramentas.filter(f => f.status === 'Em uso');
  const atrasos = emUso.filter(f => f.custodiaDesde && (Date.now() - f.custodiaDesde) > 4 * 60 * 60 * 1000).length;

  // Subtítulo dinâmico por role
  const headerSubtitle = isAlmoxarife
    ? `Dashboard · ${emUso.length} alocadas · ${disponíveis.length} disponíveis`
    : 'Solicite ferramentas para o seu turno';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      <SafeAreaView style={s.headerZone} edges={['top']}>
        <View style={s.geoDeco} pointerEvents="none">
          {Array.from({ length: 15 }).map((_, i) => (
            <View key={i} style={[s.geoDot, { opacity: i % 3 === 0 ? 0.22 : 0.10 }]} />
          ))}
        </View>
        <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTY }] }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Almoxarifado</Text>
              <Text style={s.headerSub}>{headerSubtitle}</Text>
            </View>
            <View style={s.headerRight}>
              <HeaderNotificationButton count={naoLidas} size={22} color="rgba(255,255,255,0.85)" />
              {/* Botão de Auditoria só para almoxarife no header */}
              {isAlmoxarife && (
                <TouchableOpacity style={s.auditBtn} onPress={() => setAuditLogVisible(true)} activeOpacity={0.7}>
                  <LogIcon size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={s.auditBtnText}>Auditoria</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.refreshBtn} onPress={loadData} activeOpacity={0.7}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M23 4v6h-6" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* ShiftStatusCard só aparece para o Almoxarife */}
          {isAlmoxarife && (
            <ShiftStatusCard
              emUso={emUso.length}
              disponiveis={disponíveis.length}
              noLote={0}
              atrasos={atrasos}
              onOpenLogs={() => setAuditLogVisible(true)}
              headerAnim={headerAnim}
            />
          )}

          {/* Colaborador: banner de boas-vindas simples */}
          {isColaborador && (
            <Animated.View style={[s.colaboradorBanner, { opacity: headerAnim }]}>
              <NFCChipIcon size={18} color={D.white} />
              <View style={{ flex: 1 }}>
                <Text style={s.colaboradorBannerTitle}>Selecione as ferramentas que precisa</Text>
                <Text style={s.colaboradorBannerSub}>Adicione ao pedido e envie para aprovação do Almoxarife</Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>

      {/* ── VIEW CONDICIONAL POR ROLE ── */}
      {isAlmoxarife ? (
        <AlmoxarifeView
          todasFerramentas={todasFerramentas}
          emUso={emUso}
          disponiveis={disponíveis.length}
          atrasos={atrasos}
          loading={loading}
          onOpenLogs={() => setAuditLogVisible(true)}
          headerAnim={headerAnim}
          onRefresh={loadData}
        />
      ) : (
        <ColaboradorView
          disponíveis={disponíveis}
          minhasFerramentas={minhasFerramentas}
          lote={lote}
          loading={loading}
          onAdd={addToLote}
          onRemove={removeFromLote}
          onQtyChange={changeQty}
          onDevolver={handleDevolver}
          onSolicitar={() => setLibModalVisible(true)}
          fabAnim={fabAnim}
          isInLote={isInLote}
        />
      )}

      {/* Modal de solicitação — só colaborador pode abrir */}
      {isColaborador && (
        <LibModal
          visible={libModalVisible}
          lote={lote}
          onClose={() => {
            setLibModalVisible(false);
            setLote([]); // ✅ Limpa o carrinho só quando a janela fecha
            loadData();  // ✅ Atualiza as ferramentas na tela principal
          }}
          onSuccess={handleLibSuccess}
        />
      )}

      <AuditLogModal visible={auditLogVisible} onClose={() => setAuditLogVisible(false)} />

      {/* Modal de Devolução (Aprovação/Checklist) — só Almoxarife recebe */}
      {isAlmoxarife && (
        <DevolucaoAprovacaoModal
          visible={devAprovacaoVisible}
          mov={devPendenteAtual}
          onClose={() => setDevAprovacaoVisible(false)}
          onAprovar={handleAprovarDevolucao}
          onRecusar={handleRecusarDevolucao}
        />
      )}

      {/* Modal de devolução — só colaborador pode abrir */}
      {isColaborador && (
        <DevolucaoModal
          visible={devolucaoModalVisible}
          ferramentas={minhasFerramentas}
          onClose={() => setDevolucaoModalVisible(false)}
          onSubmit={handleConfirmarDevolucao}
        />
      )}

      {/* Modal de aprovação — só almoxarife recebe via polling */}
      <SolicitacaoModal
        visible={solicitacaoModalVisible}
        solicitacao={solicitacaoAtual}
        aprovando={aprovando}
        recusando={recusando}
        onAprovar={aprovar}
        onRecusar={recusar}
        onFechar={fecharModal}
      />

      <Toast message={toastState.msg} visible={toastState.visible} type={toastState.type} />
    </View>
  );


}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  geoDeco: { position: 'absolute', right: 16, top: 16, flexDirection: 'row', flexWrap: 'wrap', width: 60, gap: 8 },
  geoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: '500', letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  auditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  auditBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  // Banner do colaborador
  colaboradorBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  colaboradorBannerTitle: { fontSize: 13, fontWeight: '800', color: D.white },
  colaboradorBannerSub: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  body: { flex: 1, backgroundColor: D.snow, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 18 },
  section: { marginBottom: 6 },
  loteNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: D.orangeSoft, borderRadius: 10, borderWidth: 1, borderColor: D.orangeLine },
  loteNoteText: { fontSize: 11, color: D.orange, fontWeight: '600', flex: 1 },
  loadState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  loadText: { fontSize: 14, color: D.slate },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: D.carbon },
  emptySub: { fontSize: 12, color: D.ash, textAlign: 'center', maxWidth: 220 },
});