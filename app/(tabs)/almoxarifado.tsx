/**
 * app/(tabs)/almoxarifado.tsx — Marilan v5 · Sistema de Gestão Inteligente
 *
 * CAMADAS DE INTELIGÊNCIA:
 *   1. Cronômetro de Custódia — tempo real de posse por ferramenta
 *   2. Log de Auditoria Local — registro persistente de cada movimentação
 *   3. Botão "Localizar" — infra pronta para integração Beacon/BLE
 *   4. Dashboard "Status do Turno" — card gerencial no topo
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Chave de armazenamento para logs e timestamps de custódia ─────────────────
const AUDIT_LOG_KEY = 'marilan_audit_logs';
const CUSTODY_TIMESTAMPS_KEY = 'marilan_custody_timestamps';

// ─── Design System ─────────────────────────────────────────────────────────────
const D = {
  orange:     '#FF5722',
  orangeHot:  '#FF6D00',
  orangeDark: '#BF360C',
  orangeSoft: 'rgba(255,87,34,0.10)',
  orangeGlow: 'rgba(255,87,34,0.18)',
  orangeLine: 'rgba(255,87,34,0.25)',
  white:      '#FFFFFF',
  snow:       '#FAFAFA',
  mist:       '#F5F5F5',
  cloud:      '#EEEEEE',
  silver:     '#E0E0E0',
  ash:        '#BDBDBD',
  slate:      '#9E9E9E',
  iron:       '#616161',
  carbon:     '#424242',
  obsidian:   '#212121',
  green:      '#2E7D32',
  greenLight: '#43A047',
  greenBg:    'rgba(46,125,50,0.08)',
  greenText:  '#1B5E20',
  red:        '#C62828',
  redLight:   '#E53935',
  redBg:      'rgba(198,40,40,0.08)',
  amber:      '#E65100',
  amberBg:    'rgba(230,81,0,0.08)',
  amberText:  '#BF360C',
  blue:       '#1565C0',
  blueBg:     'rgba(21,101,192,0.08)',
  blueLight:  '#1976D2',
  nfcBg:      '#0D0D0D',
  nfcSurface: '#1A1A1A',
  nfcBorder:  'rgba(255,87,34,0.3)',
};

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type FerStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: FerStatus;
  alocadoPara?: string;
  // Timestamp de quando entrou em custódia (injetado localmente)
  custodiaDesde?: number;
}

interface LoteItem extends Ferramenta {
  qty: number;
}

/**
 * Log de Auditoria — salvo em AsyncStorage a cada movimentação.
 * Em produção, sincronizar com endpoint POST /logs ou similar.
 */
interface AuditLog {
  id: string;
  timestamp: number;         // Unix ms
  acao: 'RETIRADA' | 'DEVOLUCAO' | 'TROCA';
  ferramentas: Array<{ codigo: string; nome: string; qty: number }>;
  responsavel: string;       // Crachá do almoxarife que autorizou
  autorizador: string;       // Crachá do colaborador que recebeu
  metodo: 'NFC' | 'MANUAL';
}

type LibMode = 'nfc' | 'manual';
type NFCPhase = 'waiting' | 'simulated_connected' | 'confirming' | 'submitting' | 'done' | 'error';

// ─── Utilidades ────────────────────────────────────────────────────────────────

/** Formata ms em "Xh Ym" ou "Ym Zs" */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Gera id único simples */
function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Salva log no AsyncStorage */
async function saveAuditLog(log: AuditLog): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);           // mais recente primeiro
    const capped = logs.slice(0, 500);  // limite de 500 entradas
    await AsyncStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(capped));
  } catch (err) {
    console.error('[AuditLog] Falha ao salvar:', err);
  }
}

/** Lê timestamps de custódia { [codigo]: timestamp_inicio } */
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
  } catch {}
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
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

/** Ícone de Localizar — infra para Beacon/BLE */
const LocateIcon = ({ size = 14, color = D.blue }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    <Path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.3} strokeDasharray="2 3" />
  </Svg>
);

/** Ícone de Histórico de Log */
const LogIcon = ({ size = 14, color = D.iron }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

/** Ícone de Cronômetro */
const TimerIcon = ({ size = 12, color = D.amber }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={1.8} />
    <Path d="M12 9v4l3 3M9 2h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Radar Pulse ───────────────────────────────────────────────────────────────
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

// ─── Toast ─────────────────────────────────────────────────────────────────────
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

// ─── Status Badge ──────────────────────────────────────────────────────────────
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

// ─── [1] Cronômetro de Custódia ────────────────────────────────────────────────
/**
 * Exibe tempo decorrido desde custodiaDesde, atualizando a cada segundo.
 * Fica laranja após 4h (alerta de longa permanência).
 */
function CustodyTimer({ since }: { since: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - since);
  const isOverdue = elapsed > 4 * 60 * 60 * 1000; // > 4 horas

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since), 1000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <View style={[ct.wrap, isOverdue && ct.wrapOverdue]}>
      <TimerIcon size={10} color={isOverdue ? D.orange : D.amber} />
      <Text style={[ct.text, isOverdue && ct.textOverdue]}>
        {formatElapsed(elapsed)}
      </Text>
    </View>
  );
}

const ct = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.amberBg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  wrapOverdue: { backgroundColor: D.orangeSoft, borderWidth: 1, borderColor: D.orangeLine },
  text: { fontSize: 10, fontWeight: '700', color: D.amber },
  textOverdue: { color: D.orange },
});

// ─── [3] Botão Localizar ───────────────────────────────────────────────────────
/**
 * Acionamento: abre um Alert informativo.
 * Comentário de integração: em produção, acionar SDK de Beacon/BLE
 * para triangular posição do ativo no mapa da planta industrial.
 * Ex: BeaconManager.startRangingBeaconsInRegion(region) no Android,
 *     CLLocationManager.startRangingBeacons no iOS.
 */
function LocateButton({ codigo, nome }: { codigo: string; nome: string }) {
  const handleLocate = () => {
    // TODO (Integração Beacon/BLE):
    //   1. Chamar BeaconManager.startRangingBeaconsInRegion({ id: codigo })
    //   2. Receber lista de beacons próximos com RSSI/distância estimada
    //   3. Cruzar com mapa da planta (GeoJSON salvo localmente)
    //   4. Abrir MapView centrado na posição triangulada
    //   Nota: diferencial frente a painéis fixos — rastreio em tempo real
    //   de ativos em movimento dentro da planta sem infraestrutura de câmeras.
    Alert.alert(
      '📡 Localizar Ferramenta',
      `${nome} (${codigo})\n\nRastreio via Beacon BLE em desenvolvimento.\n\nEste botão acionará triangulação por beacons instalados na planta, exibindo a posição em tempo real no mapa industrial — algo impossível em sistemas de controle de acesso fixo.`,
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

// ─── [2] Modal de Logs de Auditoria ───────────────────────────────────────────
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

        <View style={alm.infoBar}>
          <Text style={alm.infoText}>
            💡 Logs salvos localmente. Em produção, sincronizar com POST /logs para auditoria centralizada e rastreabilidade jurídica.
          </Text>
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
  infoBar: { marginHorizontal: 20, marginTop: 12, marginBottom: 8, backgroundColor: D.blueBg, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: `${D.blue}20` },
  infoText: { fontSize: 11, color: D.blue, lineHeight: 16 },
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

// ─── [4] Card "Status do Turno" ────────────────────────────────────────────────
/**
 * Dashboard gerencial exibido no topo da tela.
 * Mostra ferramentas em uso, disponíveis, no lote atual,
 * e alertas de "atraso" (custódia > 4h).
 */
function ShiftStatusCard({
  emUso,
  disponiveis,
  noLote,
  atrasos,
  onOpenLogs,
  headerAnim,
}: {
  emUso: number;
  disponiveis: number;
  noLote: number;
  atrasos: number;
  onOpenLogs: () => void;
  headerAnim: Animated.Value;
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
          <View style={[ssc.metricDot, { backgroundColor: D.orange }]} />
          <Text style={[ssc.metricVal, noLote > 0 && { color: D.orange }]}>{noLote}</Text>
          <Text style={ssc.metricLbl}>No lote</Text>
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
          <Text style={ssc.alertText}>
            {atrasos} {atrasos === 1 ? 'ferramenta' : 'ferramentas'} em custódia há mais de 4h
          </Text>
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

// ─── Seção: Minhas Ferramentas (com Cronômetro + Localizar) ───────────────────
function MyToolsSection({ items, onDevolver }: { items: Ferramenta[]; onDevolver: () => void }) {
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

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
                <View style={my.itemCode}>
                  <Text style={my.itemCodeText}>{item.codigo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={my.itemName} numberOfLines={1}>{item.nome}</Text>
                  <View style={my.itemTagRow}>
                    {/* [1] Cronômetro de custódia */}
                    {item.custodiaDesde ? (
                      <CustodyTimer since={item.custodiaDesde} />
                    ) : (
                      <Text style={my.itemCat}>{item.categoria}</Text>
                    )}
                    {/* [3] Botão Localizar */}
                    <LocateButton codigo={item.codigo} nome={item.nome} />
                  </View>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>
          ))}

          <TouchableOpacity style={my.devolverBtn} onPress={onDevolver} activeOpacity={0.85}>
            <BackIcon size={15} color={D.orange} />
            <Text style={my.devolverText}>Iniciar Devolução</Text>
          </TouchableOpacity>
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

// ─── Card: Ferramenta Disponível ───────────────────────────────────────────────
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
        {/* [3] Botão Localizar também nas disponíveis */}
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

// ─── Lote Item Card ────────────────────────────────────────────────────────────
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

// ─── Section Header ────────────────────────────────────────────────────────────
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

// ─── Floating Action Bar ───────────────────────────────────────────────────────
function LoteFooter({ count, onSolicitar, anim }: { count: number; onSolicitar: () => void; anim: Animated.Value }) {
  const sc = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  return (
    <Animated.View style={[lf.wrap, { transform: [{ scale: sc }, { translateY: ty }], opacity: anim }]}>
      <TouchableOpacity style={lf.btn} onPress={onSolicitar} activeOpacity={0.88}>
        <View style={lf.leftSection}>
          <NFCChipIcon size={22} color={D.white} />
          <View>
            <Text style={lf.label}>Solicitar Liberação em Lote</Text>
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

// ─── Modal de Liberação ────────────────────────────────────────────────────────
interface LibModalProps {
  visible: boolean;
  lote: LoteItem[];
  onClose: () => void;
  onSuccess: (crachaColaborador: string, metodo: 'NFC' | 'MANUAL') => Promise<void>;
}

function LibModal({ visible, lote, onClose, onSuccess }: LibModalProps) {
  const [mode, setMode] = useState<LibMode>('nfc');
  const [nfcPhase, setNfcPhase] = useState<NFCPhase>('waiting');
  const [crachaColaborador, setCrachaColaborador] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [countdown, setCountdown] = useState(3);
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(60)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setMode('nfc'); setNfcPhase('waiting'); setCrachaColaborador(''); setSubmitting(false); setManualError(''); setCountdown(3);
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

  const handleManualSubmit = async () => {
    if (!crachaColaborador.trim()) { setManualError('Informe o crachá do colaborador'); return; }
    try {
      setSubmitting(true); setManualError('');
      await onSuccess(crachaColaborador.trim(), 'MANUAL');
      setNfcPhase('done');
      Animated.spring(successScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();
      startCountdown();
    } catch (e: any) { setManualError(e.message || 'Erro ao efetuar retirada'); } finally { setSubmitting(false); }
  };

  const getNFCText = () => {
    switch (nfcPhase) {
      case 'waiting': return { title: 'Aguardando NFC', sub: 'Aproxime o celular do dispositivo do Almoxarife', color: D.orange };
      case 'simulated_connected': return { title: 'Dispositivo Detectado!', sub: 'Sincronizando lote…', color: D.orange };
      case 'confirming': return { title: 'Confirme a Retirada', sub: 'Verifique os itens antes de confirmar', color: D.orange };
      case 'submitting': return { title: 'Registrando…', sub: 'Aguarde a confirmação da API', color: D.amber };
      case 'done': return { title: 'Retirada Registrada!', sub: `Encerrando em ${countdown}s…`, color: D.green };
      case 'error': return { title: 'Erro na Retirada', sub: 'Verifique a conexão e tente via Manual', color: D.red };
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
              <View style={nm.loteTag}><Text style={nm.loteTagText}>{totalQty} {totalQty === 1 ? 'ITEM' : 'ITENS'} NO LOTE</Text></View>
              <TouchableOpacity style={nm.modeToggle} onPress={() => { setMode(m => m === 'nfc' ? 'manual' : 'nfc'); setNfcPhase('waiting'); setManualError(''); }} activeOpacity={0.7}>
                {mode === 'nfc' ? <KeyboardIcon size={14} color="rgba(255,255,255,0.5)" /> : <NFCChipIcon size={14} color="rgba(255,255,255,0.5)" />}
                <Text style={nm.modeToggleText}>{mode === 'nfc' ? 'Manual' : 'NFC'}</Text>
              </TouchableOpacity>
            </View>
            {nfcPhase !== 'done' && (
              <TouchableOpacity onPress={handleClose} style={nm.cancelBtn} activeOpacity={0.7}>
                <Text style={nm.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

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
                  <Text style={nm.statusLabel}>Transmitindo sinal NFC…</Text>
                </View>
              )}
            </View>

            <View style={nm.contentArea}>
              {(nfcPhase === 'simulated_connected' || nfcPhase === 'confirming') && (
                <View style={nm.itemsCard}>
                  <Text style={nm.itemsCardTitle}>ITENS DETECTADOS NO LOTE</Text>
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
                  <Text style={nm.acceptBtnText}>Confirmar e Registrar</Text>
                </TouchableOpacity>
              )}
              {nfcPhase === 'submitting' && (
                <View style={nm.submittingWrap}>
                  <ActivityIndicator color={D.orange} size="small" />
                  <Text style={nm.submittingText}>Registrando retirada e salvando log de auditoria…</Text>
                </View>
              )}
              {nfcPhase === 'error' && (
                <View style={nm.errorCard}>
                  <Text style={nm.errorText}>Não foi possível registrar. Tente o fluxo Manual.</Text>
                  <TouchableOpacity onPress={() => { setMode('manual'); setNfcPhase('waiting'); }} style={nm.errorSwitchBtn}>
                    <Text style={nm.errorSwitchText}>Ir para Manual</Text>
                  </TouchableOpacity>
                </View>
              )}
              {nfcPhase === 'done' && (
                <Animated.View style={[nm.doneCard, { transform: [{ scale: successScale }] }]}>
                  <View style={nm.doneIconCircle}><CheckIcon size={32} color={D.green} /></View>
                  <Text style={nm.doneTitle}>Log Salvo + API Confirmada</Text>
                  <Text style={nm.doneSub}>{totalQty} {totalQty === 1 ? 'item retirado' : 'itens retirados'} · Auditoria registrada</Text>
                  <Animated.Text style={[nm.countdown, { transform: [{ scale: countdownAnim }] }]}>Fechando em {countdown}s</Animated.Text>
                </Animated.View>
              )}
            </View>
          </>
        )}

        {mode === 'manual' && nfcPhase !== 'done' && (
          <KeyboardAvoidingView style={nm.manualContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={nm.manualHeader}>
              <KeyboardIcon size={32} color={D.orange} />
              <Text style={nm.manualTitle}>Liberação Manual</Text>
              <Text style={nm.manualSub}>Insira o crachá para registrar na API e salvar o log de auditoria</Text>
            </View>
            <View style={nm.manualLoteResume}>
              <Text style={nm.manualLoteLabel}>FERRAMENTAS NO LOTE</Text>
              {lote.map(item => (
                <View key={item.codigo} style={nm.manualLoteRow}>
                  <View style={nm.itemDot} />
                  <Text style={nm.manualLoteCode}>{item.codigo}</Text>
                  <Text style={nm.manualLoteName} numberOfLines={1}>{item.nome}</Text>
                  <Text style={nm.manualLoteQty}>×{item.qty}</Text>
                </View>
              ))}
            </View>
            <View style={nm.manualInputWrap}>
              <Text style={nm.manualInputLabel}>CRACHÁ DO COLABORADOR</Text>
              <View style={nm.manualInput}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Rect x={2} y={5} width={20} height={14} rx={2} stroke={D.orange} strokeWidth={1.8} />
                  <Circle cx={9} cy={12} r={2.5} stroke={D.orange} strokeWidth={1.6} />
                  <Path d="M14 10h4M14 14h3" stroke={D.orange} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
                <TextInput style={nm.manualInputText} placeholder="Ex: 1236" placeholderTextColor="rgba(255,255,255,0.25)" value={crachaColaborador} onChangeText={v => { setCrachaColaborador(v); setManualError(''); }} keyboardType="numeric" autoCorrect={false} editable={!submitting} />
              </View>
            </View>
            {!!manualError && (<View style={nm.manualError}><Text style={nm.manualErrorText}>{manualError}</Text></View>)}
            <TouchableOpacity style={[nm.manualSubmitBtn, submitting && nm.manualSubmitBtnDisabled]} onPress={handleManualSubmit} disabled={submitting} activeOpacity={0.88}>
              {submitting ? <ActivityIndicator color={D.white} size="small" /> : (<><CheckIcon size={18} color={D.white} /><Text style={nm.manualSubmitText}>Confirmar + Salvar Auditoria</Text></>)}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}

        {mode === 'manual' && nfcPhase === 'done' && (
          <View style={nm.manualContainer}>
            <Animated.View style={[nm.doneCard, { transform: [{ scale: successScale }] }]}>
              <View style={nm.doneIconCircle}><CheckIcon size={32} color={D.green} /></View>
              <Text style={nm.doneTitle}>Log Salvo + API Confirmada</Text>
              <Text style={nm.doneSub}>{totalQty} {totalQty === 1 ? 'item retirado' : 'itens retirados'} · Auditoria registrada</Text>
              <Animated.Text style={[nm.countdown, { transform: [{ scale: countdownAnim }] }]}>Fechando em {countdown}s</Animated.Text>
            </Animated.View>
          </View>
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
  acceptBtn: { height: 56, borderRadius: 14, backgroundColor: D.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
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
  manualContainer: { flex: 1, padding: 24, gap: 18, justifyContent: 'center' },
  manualHeader: { alignItems: 'center', gap: 10, marginBottom: 8 },
  manualTitle: { fontSize: 22, fontWeight: '900', color: D.white, letterSpacing: -0.3 },
  manualSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 20 },
  manualLoteResume: { backgroundColor: D.nfcSurface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: D.nfcBorder, gap: 8 },
  manualLoteLabel: { fontSize: 9, fontWeight: '800', color: D.orange, letterSpacing: 1.6 },
  manualLoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manualLoteCode: { fontSize: 10, color: D.orange, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600', minWidth: 72 },
  manualLoteName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  manualLoteQty: { fontSize: 11, fontWeight: '800', color: D.orange },
  manualInputWrap: { gap: 8 },
  manualInputLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.6 },
  manualInput: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.nfcSurface, borderRadius: 12, paddingHorizontal: 16, height: 54, borderWidth: 1.5, borderColor: D.nfcBorder },
  manualInputText: { flex: 1, fontSize: 16, color: D.white, fontWeight: '600' },
  manualError: { backgroundColor: `${D.red}18`, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: `${D.red}30` },
  manualErrorText: { fontSize: 13, color: D.redLight, fontWeight: '600' },
  manualSubmitBtn: { height: 58, borderRadius: 15, backgroundColor: D.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  manualSubmitBtnDisabled: { backgroundColor: D.iron, shadowOpacity: 0 },
  manualSubmitText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
});

// ─── TELA PRINCIPAL ────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [minhasFerramentas, setMinhasFerramentas] = useState<Ferramenta[]>([]);
  const [disponíveis, setDisponíveis] = useState<Ferramenta[]>([]);
  const [lote, setLote] = useState<LoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [libModalVisible, setLibModalVisible] = useState(false);
  const [auditLogVisible, setAuditLogVisible] = useState(false);
  const [toastState, setToastState] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' | 'info' });
  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    loadData();
  }, []);

  useEffect(() => {
    Animated.spring(fabAnim, { toValue: lote.length > 0 ? 1 : 0, tension: 110, friction: 12, useNativeDriver: true }).start();
  }, [lote.length]);

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

      // Injeta timestamp de custódia em cada ferramenta "Em uso"
      const minhasComTimer = minhas
        .filter((f: Ferramenta) => f.status === 'Em uso')
        .map((f: Ferramenta) => ({
          ...f,
          // Se já existe registro local, usa; caso contrário cria agora
          custodiaDesde: custodyTs[f.codigo] ?? Date.now(),
        }));

      // Atualiza timestamps para novas entradas
      const newTs = { ...custodyTs };
      minhasComTimer.forEach(f => { if (!newTs[f.codigo]) newTs[f.codigo] = f.custodiaDesde!; });
      await saveCustodyTimestamps(newTs);

      setMinhasFerramentas(minhasComTimer);
      setDisponíveis(todas.filter((f: Ferramenta) => f.status === 'Disponível'));
    } catch (err: any) {
      showToast('Erro ao carregar ferramentas: ' + (err.message || 'Falha na API'), 'error');
      setDisponíveis([]);
      setMinhasFerramentas([]);
    } finally {
      setLoading(false);
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

  // ── [2] Callback: registra na API + salva log de auditoria local ─────────────
  const handleLibSuccess = async (crachaColaborador: string, metodo: 'NFC' | 'MANUAL') => {
    const crachaAlmoxarife = await AsyncStorage.getItem('userCracha') ?? 'desconhecido';

    // 1. Chama API
    await apiClient.retirar({
      cracha_colaborador: crachaColaborador,
      ferramentas: lote.map(f => ({ codigo: f.codigo, qtd: f.qty, checklist: 'REALIZADO', observacao: 'Retirada via app Marilan' })),
    });

    // 2. Monta e salva log de auditoria local
    const log: AuditLog = {
      id: genId(),
      timestamp: Date.now(),
      acao: 'RETIRADA',
      ferramentas: lote.map(f => ({ codigo: f.codigo, nome: f.nome, qty: f.qty })),
      responsavel: crachaAlmoxarife,
      autorizador: crachaColaborador,
      metodo,
    };
    await saveAuditLog(log);

    // 3. Registra timestamps de custódia para as ferramentas retiradas
    const custodyTs = await loadCustodyTimestamps();
    lote.forEach(f => { custodyTs[f.codigo] = Date.now(); });
    await saveCustodyTimestamps(custodyTs);

    // 4. Limpa lote, toast, recarrega
    setLote([]);
    showToast(`✅ ${lote.length} ${lote.length === 1 ? 'ferramenta retirada' : 'ferramentas retiradas'} · Log salvo`, 'success');
    await loadData();
  };

  const handleDevolver = () => showToast('Fluxo de devolução em desenvolvimento', 'info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastState({ visible: true, msg, type });
    setTimeout(() => setToastState(s => ({ ...s, visible: false })), 3800);
  };

  const isInLote = (codigo: string) => lote.some(i => i.codigo === codigo);
  const totalQty = lote.reduce((a, c) => a + c.qty, 0);
  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  // Calcula "atrasos" (ferramentas em custódia > 4h)
  const atrasos = minhasFerramentas.filter(f => f.custodiaDesde && (Date.now() - f.custodiaDesde) > 4 * 60 * 60 * 1000).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      {/* ── Header ─────────────────────────────────────────────────── */}
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
              <Text style={s.headerSub}>Sistema de Gestão Industrial</Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={loadData} activeOpacity={0.7}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path d="M23 4v6h-6" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* [4] Card Status do Turno */}
          <ShiftStatusCard
            emUso={minhasFerramentas.length}
            disponiveis={disponíveis.length}
            noLote={lote.length}
            atrasos={atrasos}
            onOpenLogs={() => setAuditLogVisible(true)}
            headerAnim={headerAnim}
          />
        </Animated.View>
      </SafeAreaView>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={[s.bodyContent, { paddingBottom: lote.length > 0 ? 130 : 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Minhas ferramentas com cronômetro + localizar */}
        {minhasFerramentas.length > 0 && (
          <View style={s.section}>
            <MyToolsSection items={minhasFerramentas} onDevolver={handleDevolver} />
          </View>
        )}

        {/* Lote atual */}
        {lote.length > 0 && (
          <View style={s.section}>
            <SectionHdr label="Lote de Retirada" count={totalQty} color={D.orange} />
            {lote.map(item => (
              <LoteCard key={item.codigo} item={item} onRemove={removeFromLote} onQtyChange={changeQty} />
            ))}
            <View style={s.loteNote}>
              <NFCChipIcon size={14} color={D.orange} />
              <Text style={s.loteNoteText}>Clique em "Solicitar Liberação" para confirmar via NFC ou crachá manual. Log de auditoria será salvo automaticamente.</Text>
            </View>
          </View>
        )}

        {/* Ferramentas disponíveis */}
        <View style={s.section}>
          <SectionHdr label="Ativos Disponíveis" count={disponíveis.length} color={D.greenLight} />
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
              <AvailableCard key={item.codigo} item={item} index={idx} onAdd={addToLote} isInLote={isInLote(item.codigo)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <LoteFooter count={totalQty} onSolicitar={() => setLibModalVisible(true)} anim={fabAnim} />

      {/* Modal de Liberação */}
      <LibModal visible={libModalVisible} lote={lote} onClose={() => setLibModalVisible(false)} onSuccess={handleLibSuccess} />

      {/* [2] Modal de Auditoria */}
      <AuditLogModal visible={auditLogVisible} onClose={() => setAuditLogVisible(false)} />

      <Toast message={toastState.msg} visible={toastState.visible} type={toastState.type} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  geoDeco: { position: 'absolute', right: 16, top: 16, flexDirection: 'row', flexWrap: 'wrap', width: 60, gap: 8 },
  geoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: '500', letterSpacing: 0.2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
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