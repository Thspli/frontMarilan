import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, G, Ellipse } from 'react-native-svg';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  orange: '#F26419',
  orangeLight: '#FF8C42',
  orangeDark: '#C94E0F',
  orangeGhost: 'rgba(242,100,25,0.08)',
  white: '#FFFFFF',
  offWhite: '#F7F8FA',
  gray100: '#F0F1F3',
  gray200: '#E2E4E8',
  gray400: '#B0B5BE',
  gray500: '#8A8F9E',
  gray700: '#4A4F5C',
  black: '#1A1C22',

  statusGreen: '#27AE60',
  statusGreenBg: 'rgba(39,174,96,0.10)',
  statusRed: '#E53935',
  statusRedBg: 'rgba(229,57,53,0.10)',
  statusAmber: '#F59E0B',
  statusAmberBg: 'rgba(245,158,11,0.10)',
};

// ─── Static Data ──────────────────────────────────────────────────────────────
type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  id: string;
  codigo: string;
  nome: string;
  status: ToolStatus;
  alocadoPara?: string;
}

const CURRENT_USER = 'Você (Dev)';

const INITIAL_FERRAMENTAS: Ferramenta[] = [
  { id: '1', codigo: 'FRR-0001', nome: 'Furadeira de Impacto', status: 'Disponível' },
  { id: '2', codigo: 'FRR-0002', nome: 'Esmerilhadeira Angular', status: 'Em uso', alocadoPara: 'Carlos Mendes' },
  { id: '3', codigo: 'FRR-0003', nome: 'Serra Circular', status: 'Em manutenção' },
  { id: '4', codigo: 'FRR-0004', nome: 'Parafusadeira Elétrica', status: 'Disponível' },
  { id: '5', codigo: 'FRR-0005', nome: 'Lixadeira Orbital', status: 'Em uso', alocadoPara: 'Ana Paula' },
  { id: '6', codigo: 'FRR-0006', nome: 'Martelo Demolidor', status: 'Disponível' },
  { id: '7', codigo: 'FRR-0007', nome: 'Compressor de Ar', status: 'Em manutenção' },
  { id: '8', codigo: 'FRR-0008', nome: 'Nível a Laser', status: 'Disponível' },
  { id: '9', codigo: 'FRR-0009', nome: 'Policorte', status: 'Em uso', alocadoPara: 'Roberto Lima' },
  { id: '10', codigo: 'FRR-0010', nome: 'Chave de Impacto', status: 'Disponível' },
  { id: '11', codigo: 'FRR-0011', nome: 'Soprador Térmico', status: 'Em manutenção' },
  { id: '12', codigo: 'FRR-0012', nome: 'Serra Tico-Tico', status: 'Disponível' },
  { id: '13', codigo: 'FRR-0013', nome: 'Rotomartelo', status: 'Em uso', alocadoPara: 'Fernanda Costa' },
  { id: '14', codigo: 'FRR-0014', nome: 'Fresadora Manual', status: 'Disponível' },
  { id: '15', codigo: 'FRR-0015', nome: 'Bomba D\'água', status: 'Em manutenção' },
];

// ─── Modal Steps ──────────────────────────────────────────────────────────────
type ModalStep = 'nfc' | 'waiting_approval' | 'receiver_view';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toastStyles.container, { opacity }]} pointerEvents="none">
      <Text style={toastStyles.icon}>✅</Text>
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: C.black,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  icon: { fontSize: 20 },
  text: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
});

// ─── NFC Pulse Animation ──────────────────────────────────────────────────────
function NfcPulseIcon() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const a1 = createPulse(ring1, 0);
    const a2 = createPulse(ring2, 400);
    const a3 = createPulse(ring3, 800);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const ringStyle = (anim: Animated.Value) => ({
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }],
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.5, 0] }),
  });

  return (
    <View style={nfcStyles.wrapper}>
      {[ring1, ring2, ring3].map((r, i) => (
        <Animated.View key={i} style={[nfcStyles.ring, ringStyle(r)]} />
      ))}
      <View style={nfcStyles.iconBox}>
        <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
          {/* NFC tap icon */}
          <Path d="M20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2Z" stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M8.5 8.5C9.8 7.2 11.6 6.5 13.5 6.5" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M6.5 6.5C8.3 4.7 10.8 3.5 13.5 3.5" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.4} />
          <Circle cx={10} cy={13} r={2.5} stroke={C.orange} strokeWidth={1.8} />
          <Path d="M12.5 13H18V19L16 17.5L14 19V13" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </View>
  );
}

const nfcStyles = StyleSheet.create({
  wrapper: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: C.orange,
  },
  iconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.orangeGhost,
    borderWidth: 2, borderColor: `${C.orange}30`,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Swap Modal ───────────────────────────────────────────────────────────────
interface SwapModalProps {
  visible: boolean;
  tool: Ferramenta | null;
  onClose: () => void;
  onSuccess: (toolId: string) => void;
}

function SwapModal({ visible, tool, onClose, onSuccess }: SwapModalProps) {
  const [step, setStep] = useState<ModalStep>('nfc');
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setStep('nfc');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();

      // ─── NFC Listener (simulação) ──────────────────────────────────────────
      // REAL IMPLEMENTATION — descomente para usar com react-native-nfc-manager:
      //
      // import NfcManager, { NfcTech } from 'react-native-nfc-manager';
      //
      // const startNfc = async () => {
      //   try {
      //     await NfcManager.start();
      //     await NfcManager.requestTechnology(NfcTech.Ndef);
      //     const tag = await NfcManager.getTag();
      //     console.log('Tag lida:', tag);
      //     setStep('waiting_approval');
      //   } catch (err) {
      //     console.warn('NFC error:', err);
      //   } finally {
      //     NfcManager.cancelTechnologyRequest();
      //   }
      // };
      // startNfc();
      //
      // ─── Fim NFC Listener ─────────────────────────────────────────────────
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const goToWaiting = () => setStep('waiting_approval');
  const goToReceiver = () => setStep('receiver_view');

  const handleAccept = () => {
    handleClose();
    setTimeout(() => onSuccess(tool!.id), 320);
  };

  const handleReject = () => {
    handleClose();
  };

  if (!tool) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={modalStyles.handle} />

          {/* Tool info header */}
          <View style={modalStyles.toolHeader}>
            <View style={modalStyles.toolIconBox}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                  stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.toolName}>{tool.nome}</Text>
              <Text style={modalStyles.toolCode}>{tool.codigo}  ·  Em uso por {tool.alocadoPara}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke={C.gray500} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={modalStyles.divider} />

          {/* ── STEP 1: NFC ── */}
          {step === 'nfc' && (
            <View style={modalStyles.stepContainer}>
              <NfcPulseIcon />
              <Text style={modalStyles.stepTitle}>Aproxime o dispositivo</Text>
              <Text style={modalStyles.stepSubtitle}>Aguardando aproximação NFC{'\n'}à ferramenta ou ao crachá do colega...</Text>

              <TouchableOpacity style={modalStyles.manualBtn} onPress={goToWaiting} activeOpacity={0.7}>
                <Text style={modalStyles.manualBtnText}>Não possui NFC? Solicitar Manualmente</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP 2: Aguardando aprovação ── */}
          {step === 'waiting_approval' && (
            <View style={modalStyles.stepContainer}>
              <View style={modalStyles.waitingIconBox}>
                <ActivityIndicator size="large" color={C.orange} />
              </View>
              <Text style={modalStyles.stepTitle}>Aguardando Aprovação</Text>
              <Text style={modalStyles.stepSubtitle}>
                Notificação enviada para{'\n'}
                <Text style={{ fontWeight: '700', color: C.gray700 }}>{tool.alocadoPara}</Text>
                {'\n'}aguardando resposta...
              </Text>

              {/* DEV ONLY button */}
              <View style={modalStyles.devBtnWrapper}>
                <View style={modalStyles.devBadge}>
                  <Text style={modalStyles.devBadgeText}>⚙ DEV</Text>
                </View>
                <TouchableOpacity style={modalStyles.devBtn} onPress={goToReceiver} activeOpacity={0.8}>
                  <Text style={modalStyles.devBtnText}>Simular Tela do Recebedor</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── STEP 3: Visão do recebedor ── */}
          {step === 'receiver_view' && (
            <View style={modalStyles.stepContainer}>
              <View style={modalStyles.receiverAvatar}>
                <Text style={modalStyles.receiverAvatarText}>
                  {CURRENT_USER.charAt(0).toUpperCase()}
                </Text>
              </View>

              <Text style={modalStyles.stepTitle}>Solicitação de Troca</Text>
              <Text style={modalStyles.receiverMsg}>
                <Text style={{ fontWeight: '700', color: C.orange }}>{CURRENT_USER}</Text>
                {' '}deseja pegar esta ferramenta
              </Text>

              <View style={modalStyles.toolPill}>
                <Text style={modalStyles.toolPillText}>🔧 {tool.nome}</Text>
              </View>

              <View style={modalStyles.actionRow}>
                <TouchableOpacity style={[modalStyles.actionBtn, modalStyles.rejectBtn]} onPress={handleReject} activeOpacity={0.85}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6L6 18M6 6l12 12" stroke={C.statusRed} strokeWidth={2.2} strokeLinecap="round" />
                  </Svg>
                  <Text style={[modalStyles.actionBtnText, { color: C.statusRed }]}>Recusar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[modalStyles.actionBtn, modalStyles.acceptBtn]} onPress={handleAccept} activeOpacity={0.85}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17L4 12" stroke={C.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <Text style={[modalStyles.actionBtnText, { color: C.white }]}>Aceitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.gray200,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  divider: { height: 1, backgroundColor: C.gray100, marginHorizontal: 20, marginBottom: 4 },

  // Tool header
  toolHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  toolIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.orangeGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  toolName: { fontSize: 15, fontWeight: '700', color: C.black },
  toolCode: { fontSize: 12, color: C.gray500, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.gray100,
    alignItems: 'center', justifyContent: 'center',
  },

  // Step container
  stepContainer: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 20,
    gap: 8,
    minHeight: 260,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.black, marginTop: 12, textAlign: 'center' },
  stepSubtitle: { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 22 },

  // Manual button
  manualBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16 },
  manualBtnText: { fontSize: 13, color: C.orange, fontWeight: '600', textDecorationLine: 'underline' },

  // Waiting
  waitingIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.orangeGhost,
    alignItems: 'center', justifyContent: 'center',
  },

  // Dev button
  devBtnWrapper: {
    marginTop: 28,
    alignItems: 'center',
    gap: 6,
  },
  devBadge: {
    backgroundColor: '#2D2D2D',
    borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  devBadgeText: { fontSize: 10, color: '#FFD700', fontWeight: '700', letterSpacing: 1 },
  devBtn: {
    borderWidth: 1.5, borderColor: '#2D2D2D', borderStyle: 'dashed',
    borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10,
  },
  devBtnText: { fontSize: 13, color: '#2D2D2D', fontWeight: '600' },

  // Receiver view
  receiverAvatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  receiverAvatarText: { fontSize: 30, fontWeight: '800', color: C.white },
  receiverMsg: { fontSize: 15, color: C.gray700, textAlign: 'center', lineHeight: 24, marginTop: 4 },
  toolPill: {
    backgroundColor: C.orangeGhost,
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
    marginTop: 6,
  },
  toolPillText: { fontSize: 14, fontWeight: '600', color: C.orangeDark },

  // Action buttons
  actionRow: {
    flexDirection: 'row', gap: 12,
    marginTop: 24, width: '100%',
  },
  actionBtn: {
    flex: 1, height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  rejectBtn: {
    backgroundColor: C.statusRedBg,
    borderWidth: 1.5, borderColor: `${C.statusRed}30`,
  },
  acceptBtn: {
    backgroundColor: C.statusGreen,
    shadowColor: C.statusGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});

// ─── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color = C.gray400 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ToolIcon({ color = C.orange }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ color = C.orange }: { color?: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ClearIcon({ color = C.gray400 }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ToolStatus }) {
  const config = {
    'Disponível':    { color: C.statusGreen,  bg: C.statusGreenBg,  dot: C.statusGreen  },
    'Em uso':        { color: C.statusRed,    bg: C.statusRedBg,    dot: C.statusRed    },
    'Em manutenção': { color: C.statusAmber,  bg: C.statusAmberBg,  dot: C.statusAmber  },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: config.dot }]} />
      <Text style={[styles.badgeText, { color: config.color }]}>{status}</Text>
    </View>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────
function ToolCard({ item, onPress }: { item: Ferramenta; onPress: (item: Ferramenta) => void }) {
  const isInUse = item.status === 'Em uso';

  return (
    <TouchableOpacity
      style={[styles.card, isInUse && styles.cardInteractive]}
      onPress={() => isInUse && onPress(item)}
      activeOpacity={isInUse ? 0.75 : 1}
    >
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <ToolIcon />
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.toolName} numberOfLines={1}>{item.nome}</Text>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>ID</Text>
            <Text style={styles.metaValue}>{item.id}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>CÓD</Text>
            <Text style={styles.metaValue}>{item.codigo}</Text>
          </View>
        </View>

        {isInUse && item.alocadoPara && (
          <View style={styles.allocRow}>
            <UserIcon color={C.statusRed} />
            <Text style={styles.allocText} numberOfLines={1}>{item.alocadoPara}</Text>
            <Text style={styles.swapHint}>  Toque para solicitar troca →</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const FILTERS: Array<ToolStatus | 'Todos'> = ['Todos', 'Disponível', 'Em uso', 'Em manutenção'];

function FilterTabs({
  active, onSelect, counts,
}: {
  active: string;
  onSelect: (f: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => {
        const isActive = active === f;
        return (
          <TouchableOpacity key={f} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => onSelect(f)} activeOpacity={0.7}>
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{f}</Text>
            {counts[f] !== undefined && (
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>{counts[f]}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FerramentasScreen() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>(INITIAL_FERRAMENTAS);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Todos');
  const [selectedTool, setSelectedTool] = useState<Ferramenta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const counts = {
    Todos:           ferramentas.length,
    'Disponível':    ferramentas.filter(f => f.status === 'Disponível').length,
    'Em uso':        ferramentas.filter(f => f.status === 'Em uso').length,
    'Em manutenção': ferramentas.filter(f => f.status === 'Em manutenção').length,
  };

  const filtered = ferramentas.filter(item => {
    const matchFilter = filter === 'Todos' || item.status === filter;
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      item.nome.toLowerCase().includes(q) ||
      item.codigo.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      (item.alocadoPara?.toLowerCase().includes(q) ?? false);
    return matchFilter && matchQuery;
  });

  const handleCardPress = (tool: Ferramenta) => {
    setSelectedTool(tool);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedTool(null), 400);
  };

  const handleSwapSuccess = (toolId: string) => {
    setFerramentas(prev =>
      prev.map(f =>
        f.id === toolId
          ? { ...f, alocadoPara: CURRENT_USER }
          : f
      )
    );
    showToast(`✅ Ferramenta transferida para ${CURRENT_USER}!`);
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ferramentas</Text>
            <Text style={styles.headerSub}>{counts.Todos} itens cadastrados</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Disponível']}</Text>
              <Text style={styles.statLabel}>Disponíveis</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Em uso']}</Text>
              <Text style={styles.statLabel}>Em uso</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Em manutenção']}</Text>
              <Text style={styles.statLabel}>Manutenção</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={styles.body}>
        {/* Search */}
        <View style={styles.searchWrapper}>
          <SearchIcon color={query ? C.orange : C.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, código ou ID…"
            placeholderTextColor={C.gray400}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <FilterTabs active={filter} onSelect={setFilter} counts={counts} />

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ToolCard item={item} onPress={handleCardPress} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyTitle}>Nenhuma ferramenta encontrada</Text>
              <Text style={styles.emptyText}>Tente outro termo ou filtro.</Text>
            </View>
          }
        />
      </View>

      {/* Swap Modal */}
      <SwapModal
        visible={modalVisible}
        tool={selectedTool}
        onClose={handleModalClose}
        onSuccess={handleSwapSuccess}
      />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },
  headerSafe: { backgroundColor: C.orange },
  body: {
    flex: 1, backgroundColor: C.offWhite,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', paddingTop: 20,
  },

  header: {
    backgroundColor: C.orange,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.orangeLight, opacity: 0.22, top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.orangeDark, opacity: 0.18, top: 10, left: -20,
  },
  headerContent: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500', textAlign: 'center' },
  statSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.white,
    borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14,
    height: 48, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.black, paddingVertical: 0 },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16,
    marginTop: 12, marginBottom: 4, gap: 8,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 20, backgroundColor: C.white,
    borderWidth: 1.5, borderColor: C.gray200, gap: 5,
  },
  filterChipActive: { backgroundColor: C.orange, borderColor: C.orange },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.gray500 },
  filterChipTextActive: { color: C.white },
  filterCount: {
    backgroundColor: C.gray100, borderRadius: 10,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: C.gray500 },
  filterCountTextActive: { color: C.white },

  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardInteractive: {
    borderWidth: 1.5, borderColor: `${C.statusRed}20`,
  },
  cardLeft: {},
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.orangeGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 6 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  toolName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.black },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '700', color: C.gray400, letterSpacing: 0.5 },
  metaValue: { fontSize: 12, fontWeight: '600', color: C.gray700 },
  metaDivider: { width: 1, height: 12, backgroundColor: C.gray200, marginHorizontal: 10 },

  allocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.statusRedBg,
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  allocText: { fontSize: 12, fontWeight: '600', color: C.statusRed },
  swapHint: { fontSize: 11, color: `${C.statusRed}80`, fontStyle: 'italic' },

  badge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.gray700 },
  emptyText: { fontSize: 14, color: C.gray500 },
});