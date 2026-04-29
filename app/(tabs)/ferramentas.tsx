/**
 * app/(tabs)/ferramentas.tsx — Marilan v3.0
 *
 * RBAC v3 — Transferência P2P condicional por role:
 *
 *   COLABORADOR  → Pode transferir ferramentas que estão em seu nome.
 *                  Botão "Toque para transferir" e SwapModal visíveis.
 *
 *   ALMOXARIFE   → Visão read-only do inventário completo.
 *                  Sem botão de troca — Almoxarife gerencia estoque,
 *                  não trabalha em campo com as ferramentas.
 *
 * O hook useAuth() fornece o role — mesma fonte usada em almoxarifado e relatorios.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { apiClient } from '../../services/api';
import { nfcService } from '../../services/nfc';
import { useAuth } from '@/hooks/useAuth';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { HeaderNotificationButton } from '@/components/HeaderNotificationButton';

const { width: SW } = Dimensions.get('window');

// ─── Design System ─────────────────────────────────────────────────────────────
const D = {
  orange: '#F05A00',
  orange2: '#FF7A2F',
  orange3: '#FFB085',
  orangeGlow: 'rgba(240,90,0,0.10)',
  orangeDark: '#B84400',
  orangeDim: 'rgba(240,90,0,0.08)',
  white: '#FFFFFF',
  offWhite: '#FAFAF9',
  gray50: '#F7F6F4',
  gray100: '#F0EDEA',
  gray200: '#E2DDD8',
  gray300: '#C8C0B8',
  gray400: '#AEA49A',
  gray500: '#7A7068',
  gray700: '#3A332B',
  black: '#1A1510',
  green: '#1A9960',
  greenBg: 'rgba(26,153,96,0.08)',
  greenText: '#116640',
  red: '#D93B2B',
  redBg: 'rgba(217,59,43,0.08)',
  amber: '#C97800',
  amberBg: 'rgba(201,120,0,0.08)',
};

type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';
interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: ToolStatus;
  alocadoPara?: string;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const WrenchIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = ({ size = 16, color = D.gray400 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ChevronIcon = ({ color = D.gray300 }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ color = D.red, size = 12 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const XIcon = ({ size = 14, color = D.gray500 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const NFCIcon = ({ size = 38, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={2} width={20} height={20} rx={3} stroke={color} strokeWidth={1.5} />
    <Path d="M8 8.5C9.2 7.3 10.8 6.5 12.6 6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M6 6.5C7.8 4.7 10.1 3.5 12.6 3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.35} />
    <Circle cx={9.5} cy={14} r={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M12 14h6v6l-2-1.5L14 20V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ArrowRight = ({ color = D.white }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Ícone de bloqueio (Almoxarife read-only) ─────────────────────────────────
const EyeIcon = ({ size = 12, color = D.gray500 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
  </Svg>
);

// ─── Status Badge ──────────────────────────────────────────────────────────────
const STATUS = {
  'Disponível': { dot: D.green, bg: D.greenBg, text: D.greenText },
  'Em uso': { dot: D.red, bg: D.redBg, text: D.red },
  'Em manutenção': { dot: D.amber, bg: D.amberBg, text: D.amber },
};

function StatusBadge({ status }: { status: ToolStatus }) {
  const c = STATUS[status] || STATUS['Disponível'];
  return (
    <View style={[sb.pill, { backgroundColor: c.bg }]}>
      <View style={[sb.dot, { backgroundColor: c.dot }]} />
      <Text style={[sb.label, { color: c.text }]}>{status}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 99 },
  dot: { width: 5.5, height: 5.5, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── NFC Pulse ─────────────────────────────────────────────────────────────────
function NFCPulse({ active }: { active: boolean }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const ref = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const a = Animated.parallel(
        rings.map((r, i) =>
          Animated.loop(Animated.sequence([
            Animated.delay(i * 360),
            Animated.timing(r, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]))
        )
      );
      ref.current = a;
      a.start();
    } else {
      ref.current?.stop();
      rings.forEach(r => r.setValue(0));
    }
    return () => { ref.current?.stop(); };
  }, [active]);

  return (
    <View style={np.wrap}>
      {rings.map((r, i) => (
        <Animated.View key={i} style={[np.ring, {
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] }) }],
          opacity: r.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.28, 0] }),
        }]} />
      ))}
      <View style={np.core}>
        <NFCIcon size={34} color={D.orange} />
      </View>
    </View>
  );
}
const np = StyleSheet.create({
  wrap: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, borderColor: D.orange },
  core: { width: 76, height: 76, borderRadius: 38, backgroundColor: D.orangeDim, borderWidth: 2, borderColor: `${D.orange}25`, alignItems: 'center', justifyContent: 'center' },
});

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const y = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(y, { toValue: 0, tension: 130, friction: 11, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 130, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: 14, duration: 260, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[ts.wrap, { opacity: op, transform: [{ translateY: y }, { scale: sc }] }]} pointerEvents="none">
      <View style={ts.pill}>
        <View style={ts.iconBox}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M20 6L9 17L4 12" stroke={D.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={ts.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const ts = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, left: 20, right: 20, zIndex: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.black, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 10 },
  iconBox: { width: 26, height: 26, borderRadius: 13, backgroundColor: D.green, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: D.white, flex: 1, letterSpacing: 0.1 },
});

// ─── Modal de Confirmação de Troca ────────────────────────────────────────────
function TrocaSuccessModal({
  visible, ferramenta, outroNome, tipo, onClose,
}: {
  visible: boolean; ferramenta: string; outroNome: string;
  tipo: 'enviou' | 'recebeu'; onClose: () => void;
}) {
  const bgOp      = useRef(new Animated.Value(0)).current;
  const cardY     = useRef(new Animated.Value(60)).current;
  const cardOp    = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgOp,   { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(cardY,  { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
          Animated.timing(cardOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.spring(iconScale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
      ]).start();
    } else {
      bgOp.setValue(0); cardY.setValue(60); cardOp.setValue(0); iconScale.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const isRecebeu = tipo === 'recebeu';

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[tsm.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[tsm.card, { opacity: cardOp, transform: [{ translateY: cardY }] }]}>
        <Animated.View style={[tsm.iconRing, { transform: [{ scale: iconScale }] }]}>
          <View style={tsm.iconInner}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
              <Path d="M20 6L9 17L4 12" stroke={D.green} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </Animated.View>
        <View style={[tsm.badge, isRecebeu && tsm.badgeOrange]}>
          <View style={[tsm.badgeDot, isRecebeu && tsm.badgeDotOrange]} />
          <Text style={[tsm.badgeText, isRecebeu && tsm.badgeTextOrange]}>
            {isRecebeu ? 'FERRAMENTA RECEBIDA' : 'TRANSFERÊNCIA CONCLUÍDA'}
          </Text>
        </View>
        <Text style={tsm.title}>{isRecebeu ? 'Você recebeu uma\nferramenta!' : 'Transferência\nrealizada!'}</Text>
        <View style={tsm.detailCard}>
          <View style={tsm.detailRow}>
            <View style={tsm.detailIconBox}><WrenchIcon size={15} color={D.orange} /></View>
            <View style={{ flex: 1 }}>
              <Text style={tsm.detailLabel}>FERRAMENTA</Text>
              <Text style={tsm.detailValue}>{ferramenta}</Text>
            </View>
          </View>
          <View style={tsm.detailSep} />
          <View style={tsm.detailRow}>
            <View style={tsm.detailIconBox}><UserIcon size={15} color={D.orange} /></View>
            <View style={{ flex: 1 }}>
              <Text style={tsm.detailLabel}>{isRecebeu ? 'ENVIADO POR' : 'ENVIADO PARA'}</Text>
              <Text style={tsm.detailValue}>{outroNome}</Text>
            </View>
          </View>
        </View>
        <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
          <TouchableOpacity style={tsm.btn} onPress={handleClose} activeOpacity={0.88}>
            <Text style={tsm.btnText}>Entendido</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const tsm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,21,16,0.6)' },
  card: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: D.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 28, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 50 : 36, alignItems: 'center', gap: 18, shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20 },
  iconRing: { width: 96, height: 96, borderRadius: 48, backgroundColor: D.greenBg, borderWidth: 1.5, borderColor: `${D.green}30`, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  iconInner: { width: 70, height: 70, borderRadius: 35, backgroundColor: D.greenBg, borderWidth: 1, borderColor: `${D.green}40`, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: D.greenBg, borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: `${D.green}30` },
  badgeOrange: { backgroundColor: D.orangeDim, borderColor: `${D.orange}30` },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.green },
  badgeDotOrange: { backgroundColor: D.orange },
  badgeText: { fontSize: 10, fontWeight: '800', color: D.green, letterSpacing: 1.4 },
  badgeTextOrange: { color: D.orange },
  title: { fontSize: 26, fontWeight: '900', color: D.black, letterSpacing: -0.5, textAlign: 'center', lineHeight: 34 },
  detailCard: { width: '100%', backgroundColor: D.gray50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.gray200, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIconBox: { width: 36, height: 36, borderRadius: 9, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '800', color: D.gray400, letterSpacing: 1.2 },
  detailValue: { fontSize: 14, fontWeight: '700', color: D.black, marginTop: 2 },
  detailSep: { height: 1, backgroundColor: D.gray200 },
  btn: { width: '100%', height: 56, borderRadius: 14, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center', shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  btnText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
});

// ─── Hook: polling para quem recebeu a ferramenta ─────────────────────────────
function useTrocaRecebidaListener() {
  const [trocaRecebida, setTrocaRecebida] = useState<{ ferramenta: string; deNome: string } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const buscandoRef  = useRef(false);

  useEffect(() => {
    const verificar = async () => {
      if (buscandoRef.current) return;
      buscandoRef.current = true;
      try {
        const cracha = await AsyncStorage.getItem('userCracha');
        if (!cracha) return;
        const response = await apiClient.verificarTrocaRecebida(cracha);
        if (response) {
          setTrocaRecebida({ ferramenta: response.ferramenta_nome, deNome: response.de_nome });
          setModalVisible(true);
        }
      } catch {
        // silencioso
      } finally {
        buscandoRef.current = false;
      }
    };

    verificar();
    intervaloRef.current = setInterval(verificar, 8000);
    return () => { if (intervaloRef.current) clearInterval(intervaloRef.current); };
  }, []);

  const fechar = async () => {
    try {
      const cracha = await AsyncStorage.getItem('userCracha');
      if (cracha) await apiClient.confirmarVisualizacaoTroca(cracha);
    } catch {}
    setModalVisible(false);
    setTrocaRecebida(null);
  };

  return { trocaRecebida, modalVisible, fechar };
}

// ─── Swap Modal ────────────────────────────────────────────────────────────────
function SwapModal({ visible, tool, onClose, onSuccess }: {
  visible: boolean; tool: Ferramenta | null;
  onClose: () => void; onSuccess: (codigo: string, paraNome: string) => void;
}) {
  const [cracha, setCracha] = useState('');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);
  const slideY = useRef(new Animated.Value(400)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setCracha(''); setObs(''); setLoading(false);
      nfcService.readTag().catch(() => {});
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 13, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideY.setValue(400); bgOp.setValue(0);
    }
  }, [visible]);

  const close = () => {
    nfcService.stop();
    Animated.parallel([
      Animated.timing(slideY, { toValue: 400, duration: 260, useNativeDriver: true }),
      Animated.timing(bgOp, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const submit = async () => {
    if (!cracha.trim() || !tool) return;
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    try {
      setLoading(true);
      await apiClient.trocar({
        cracha_novo_colaborador: cracha.trim(),
        ferramentas: [{ codigo: tool.codigo, qtd: 1, checklist: 'REALIZADO', observacao: obs.trim() || 'Troca via app' }],
      });
      close();
      setTimeout(() => onSuccess(tool.nome, cracha.trim()), 320);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha ao transferir');
    } finally {
      setLoading(false);
    }
  };

  if (!tool) return null;
  const canSubmit = cracha.trim().length > 0 && !loading;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[ms.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      </Animated.View>
      <Animated.View style={[ms.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={ms.handle} />
        <View style={ms.toolRow}>
          <View style={ms.toolIconBox}><WrenchIcon size={20} color={D.orange} /></View>
          <View style={{ flex: 1 }}>
            <Text style={ms.toolName} numberOfLines={1}>{tool.nome}</Text>
            <Text style={ms.toolMeta}>{tool.categoria} · {tool.codigo}</Text>
          </View>
          <TouchableOpacity onPress={close} style={ms.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <XIcon size={14} />
          </TouchableOpacity>
        </View>
        <View style={ms.sep} />
        <View style={ms.body}>
          <NFCPulse active={true} />
          <Text style={ms.title}>Transferir Ferramenta</Text>
          <Text style={ms.sub}>Insira o crachá do colaborador{'\n'}que receberá esta ferramenta</Text>
          <View style={ms.inputWrap}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Rect x={2} y={5} width={20} height={14} rx={2} stroke={D.orange} strokeWidth={1.8} />
              <Circle cx={9} cy={12} r={2.5} stroke={D.orange} strokeWidth={1.6} />
              <Path d="M14 10h4M14 14h3" stroke={D.orange} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <TextInput
              style={ms.input}
              placeholder="Crachá do colaborador"
              placeholderTextColor={D.gray300}
              value={cracha}
              onChangeText={setCracha}
              keyboardType="numeric"
              autoCorrect={false}
            />
          </View>
          <View style={[ms.inputWrap, { height: 52 }]}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={D.gray300} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <TextInput
              style={[ms.input, { paddingTop: 0 }]}
              placeholder="Observação (opcional)"
              placeholderTextColor={D.gray300}
              value={obs}
              onChangeText={setObs}
              autoCapitalize="sentences"
            />
          </View>
          <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[ms.confirmBtn, !canSubmit && ms.confirmBtnDisabled]}
              onPress={submit}
              disabled={!canSubmit}
              activeOpacity={0.88}
            >
              {loading
                ? <ActivityIndicator color={D.white} size="small" />
                : (
                  <>
                    <Text style={[ms.confirmText, !canSubmit && ms.confirmTextDisabled]}>Confirmar Transferência</Text>
                    <ArrowRight color={canSubmit ? D.white : D.gray400} />
                  </>
                )
              }
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}
const ms = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,21,16,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: D.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 36, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 14 },
  toolIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, fontWeight: '800', color: D.black, letterSpacing: -0.1 },
  toolMeta: { fontSize: 12, color: D.gray500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: D.gray100, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: D.gray100 },
  body: { paddingHorizontal: 24, paddingTop: 24, alignItems: 'center', gap: 14 },
  title: { fontSize: 22, fontWeight: '900', color: D.black, letterSpacing: -0.3, textAlign: 'center' },
  sub: { fontSize: 14, color: D.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', height: 56, borderRadius: 14, borderWidth: 1.5, borderColor: D.gray200, backgroundColor: D.gray50, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 15, color: D.black, fontWeight: '500' },
  confirmBtn: { width: '100%', height: 58, borderRadius: 16, backgroundColor: D.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6, marginTop: 4 },
  confirmBtnDisabled: { backgroundColor: D.gray200, shadowOpacity: 0 },
  confirmText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  confirmTextDisabled: { color: D.gray400 },
});

// ─── Filter Chips ──────────────────────────────────────────────────────────────
const FILTERS: Array<ToolStatus | 'Todos'> = ['Todos', 'Disponível', 'Em uso', 'Em manutenção'];

function FilterChips({ active, onSelect, counts }: { active: string; onSelect: (v: string) => void; counts: Record<string, number> }) {
  return (
    <View style={fc.row}>
      {FILTERS.map(f => {
        const on = active === f;
        return (
          <TouchableOpacity key={f} style={[fc.chip, on && fc.chipOn]} onPress={() => onSelect(f)} activeOpacity={0.75}>
            <Text style={[fc.label, on && fc.labelOn]}>{f}</Text>
            <View style={[fc.count, on && fc.countOn]}>
              <Text style={[fc.countNum, on && fc.countNumOn]}>{counts[f] ?? 0}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const fc = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 18, gap: 7, marginTop: 14, marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: D.white, borderWidth: 1.5, borderColor: D.gray200 },
  chipOn: { backgroundColor: D.orange, borderColor: D.orange },
  label: { fontSize: 12, fontWeight: '600', color: D.gray500 },
  labelOn: { color: D.white },
  count: { backgroundColor: D.gray100, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countOn: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countNum: { fontSize: 10, fontWeight: '800', color: D.gray500 },
  countNumOn: { color: D.white },
});

// ─── Tool Card ─────────────────────────────────────────────────────────────────
/**
 * canTransfer: boolean — passa `true` só para colaboradores.
 * Almoxarife vê o mesmo card mas sem o accent vermelho e sem o hint de "toque p/ transferir".
 */
function ToolCard({ item, index, onPress, canTransfer }: {
  item: Ferramenta; index: number;
  onPress: (f: Ferramenta) => void;
  canTransfer: boolean;
}) {
  const oy = useRef(new Animated.Value(16)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  // Ferramenta "Em uso" só é interativa se o usuário pode transferir
  const isInUse = item.status === 'Em uso';
  const isInteractive = isInUse && canTransfer;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 220, delay: index * 38, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, tension: 110, friction: 14, delay: index * 38, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    if (!isInteractive) return;
    Animated.sequence([
      Animated.timing(sc, { toValue: 0.978, duration: 65, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, tension: 280, friction: 10, useNativeDriver: true }),
    ]).start();
    onPress(item);
  };

  return (
    <Animated.View style={[tc.outer, { opacity: op, transform: [{ translateY: oy }, { scale: sc }] }]}>
      <TouchableOpacity
        style={[tc.card, isInteractive && tc.cardInteractive]}
        onPress={press}
        activeOpacity={isInteractive ? 0.92 : 1}
      >
        {/* Accent bar vermelho só para colaborador com ferramenta em uso */}
        {isInteractive && <View style={tc.accent} />}

        <View style={[tc.iconBox, isInUse && tc.iconBoxRed]}>
          <WrenchIcon size={18} color={isInUse ? D.red : D.orange} />
        </View>

        <View style={tc.content}>
          <View style={tc.topRow}>
            <Text style={tc.name} numberOfLines={1}>{item.nome}</Text>
            <StatusBadge status={item.status} />
          </View>
          <View style={tc.metaRow}>
            <Text style={tc.code}>{item.codigo}</Text>
            <View style={tc.sep} />
            <Text style={tc.cat}>{item.categoria}</Text>
          </View>

          {/* Linha de alocação + hint de troca — só colaborador */}
          {isInUse && item.alocadoPara && canTransfer && (
            <View style={tc.allocRow}>
              <UserIcon size={11} color={D.red} />
              <Text style={tc.allocText}>{item.alocadoPara}</Text>
              <Text style={tc.tapHint}>Toque para transferir →</Text>
            </View>
          )}

          {/* Linha de alocação sem hint — almoxarife (read-only) */}
          {isInUse && item.alocadoPara && !canTransfer && (
            <View style={tc.allocRow}>
              <UserIcon size={11} color={D.red} />
              <Text style={tc.allocText}>{item.alocadoPara}</Text>
              <View style={tc.readOnlyBadge}>
                <EyeIcon size={9} color={D.gray500} />
                <Text style={tc.readOnlyText}>somente leitura</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seta de ação só para colaborador interativo */}
        {isInteractive && <ChevronIcon color={D.red + '60'} />}
      </TouchableOpacity>
    </Animated.View>
  );
}
const tc = StyleSheet.create({
  outer: { marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.white, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: D.gray200, overflow: 'hidden' },
  cardInteractive: { borderColor: `${D.red}25`, borderWidth: 1.5 },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: D.red },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  iconBoxRed: { backgroundColor: D.redBg },
  content: { flex: 1, gap: 5 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: D.black, letterSpacing: -0.1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  code: { fontSize: 11, color: D.gray400, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '500' },
  sep: { width: 1, height: 10, backgroundColor: D.gray200, marginHorizontal: 8 },
  cat: { fontSize: 11, color: D.gray500, fontWeight: '500' },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.redBg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, alignSelf: 'flex-start' },
  allocText: { fontSize: 11, fontWeight: '700', color: D.red },
  tapHint: { fontSize: 10, color: `${D.red}70`, fontStyle: 'italic' },
  // Badge read-only para almoxarife
  readOnlyBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: D.gray100, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  readOnlyText: { fontSize: 9, color: D.gray500, fontWeight: '600', fontStyle: 'italic' },
});

// ─── Header Stats ──────────────────────────────────────────────────────────────
function StatBox({ value, label, anim }: { value: number; label: string; anim: Animated.Value }) {
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  return (
    <Animated.View style={[stb.box, { transform: [{ scale }], opacity: anim }]}>
      <Text style={stb.value}>{value}</Text>
      <Text style={stb.label}>{label}</Text>
    </Animated.View>
  );
}
const stb = StyleSheet.create({
  box: { flex: 1, alignItems: 'center' },
  value: { fontSize: 26, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function FerramentasScreen() {
  // ── Role — decide se o botão de troca aparece ─────────────────────────────
  const { user } = useAuth();
  const { naoLidas, startPolling, stopPolling } = useNotificacoes();
  const canTransfer = user?.role === 'colaborador';

  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Todos');
  const [selected, setSelected] = useState<Ferramenta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, msg: '' });

  const [trocaEnviada, setTrocaEnviada] = useState<{ ferramenta: string; paraNome: string } | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  // Polling de troca recebida — válido para colaborador (almoxarife não recebe P2P)
  const { trocaRecebida, modalVisible: recebidaVisible, fechar: fecharRecebida } = useTrocaRecebidaListener();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statAnim1 = useRef(new Animated.Value(0)).current;
  const statAnim2 = useRef(new Animated.Value(0)).current;
  const statAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(80, [
        Animated.spring(statAnim1, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(statAnim2, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(statAnim3, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
    load();
    startPolling();
    
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const load = async () => {
    try {
      setLoading(true);
      const cracha = await AsyncStorage.getItem('userCracha');
      const data = cracha ? await apiClient.listarMinhasFerramentas(cracha) : [];
      setFerramentas(data || []);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
      setFerramentas([]);
    } finally {
      setLoading(false);
    }
  };

  const counts = {
    Todos: ferramentas.length,
    'Disponível': ferramentas.filter(f => f.status === 'Disponível').length,
    'Em uso': ferramentas.filter(f => f.status === 'Em uso').length,
    'Em manutenção': ferramentas.filter(f => f.status === 'Em manutenção').length,
  };

  const filtered = ferramentas.filter(f => {
    const matchF = filter === 'Todos' || f.status === filter;
    const q = query.toLowerCase();
    const matchQ = !q || f.nome.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q);
    return matchF && matchQ;
  });

  const showToast = (msg: string) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: '' }), 3200);
  };

  const handleCardPress = (t: Ferramenta) => {
    // Guard: só colaborador pode abrir modal de troca
    if (!canTransfer) return;
    setSelected(t);
    setModalVisible(true);
  };

  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      {/* Header */}
      <SafeAreaView style={s.headerZone} edges={['top']}>
        <View style={s.dotGrid} pointerEvents="none">
          {Array.from({ length: 16 }).map((_, i) => (
            <View key={i} style={s.dot} />
          ))}
        </View>
        <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTY }] }]}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.headerTitle}>Ferramentas</Text>
              <Text style={s.headerSub}>
                {counts.Todos} itens · {canTransfer ? 'toque em "Em uso" para transferir' : 'visão gerencial'}
              </Text>
            </View>
            <View style={s.headerActions}>
              <HeaderNotificationButton count={naoLidas} size={24} color="rgba(255,255,255,0.85)" />
              <TouchableOpacity onPress={load} style={s.refreshBtn} activeOpacity={0.7}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M23 4v6h-6" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
          </View>
          <View style={s.statsBar}>
            <StatBox value={counts['Disponível']} label="Disponíveis" anim={statAnim1} />
            <View style={s.statsDivider} />
            <StatBox value={counts['Em uso']} label="Em uso" anim={statAnim2} />
            <View style={s.statsDivider} />
            <StatBox value={counts['Em manutenção']} label="Manutenção" anim={statAnim3} />
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Body */}
      <View style={s.body}>
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <SearchIcon size={16} color={query ? D.orange : D.gray400} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar por nome ou código…"
              placeholderTextColor={D.gray300}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <XIcon size={13} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FilterChips active={filter} onSelect={setFilter} counts={counts} />

        {loading ? (
          <View style={s.loadState}>
            <ActivityIndicator color={D.orange} size="large" />
            <Text style={s.loadText}>Carregando ferramentas…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={f => f.codigo}
            renderItem={({ item, index }) => (
              <ToolCard
                item={item}
                index={index}
                onPress={handleCardPress}
                canTransfer={canTransfer}
              />
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🔧</Text>
                <Text style={s.emptyTitle}>Nenhuma ferramenta</Text>
                <Text style={s.emptySub}>{query ? 'Tente outro termo de busca' : 'Sua lista está vazia'}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Modal de transferência — só renderiza para colaborador */}
      {canTransfer && (
        <SwapModal
          visible={modalVisible}
          tool={selected}
          onClose={() => { setModalVisible(false); setTimeout(() => setSelected(null), 400); }}
          onSuccess={(ferramenta, paraNome) => {
            setTrocaEnviada({ ferramenta, paraNome });
            setSuccessModalVisible(true);
            setTimeout(load, 900);
          }}
        />
      )}

      {/* Confirmação — quem ENVIOU (colaborador) */}
      {canTransfer && (
        <TrocaSuccessModal
          visible={successModalVisible}
          ferramenta={trocaEnviada?.ferramenta ?? ''}
          outroNome={trocaEnviada?.paraNome ?? ''}
          tipo="enviou"
          onClose={() => { setSuccessModalVisible(false); setTrocaEnviada(null); }}
        />
      )}

      {/* Confirmação — quem RECEBEU via polling (colaborador) */}
      {canTransfer && (
        <TrocaSuccessModal
          visible={recebidaVisible}
          ferramenta={trocaRecebida?.ferramenta ?? ''}
          outroNome={trocaRecebida?.deNome ?? ''}
          tipo="recebeu"
          onClose={fecharRecebida}
        />
      )}

      <Toast message={toast.msg} visible={toast.visible} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  dotGrid: { position: 'absolute', right: 20, top: 20, flexDirection: 'row', flexWrap: 'wrap', width: 72, gap: 8, opacity: 0.18 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  statsBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.14)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6 },
  statsDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  body: { flex: 1, backgroundColor: D.offWhite, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 18, overflow: 'hidden' },
  searchRow: { paddingHorizontal: 18 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: D.white, borderRadius: 14, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: D.gray200 },
  searchInput: { flex: 1, fontSize: 14, color: D.black, fontWeight: '500' },
  listContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  loadState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText: { fontSize: 14, color: D.gray500, fontWeight: '500' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: D.gray700 },
  emptySub: { fontSize: 14, color: D.gray400 },
});