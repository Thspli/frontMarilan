/**
 * app/(tabs)/ferramentas.tsx (Refactored)
 * Tela de Ferramentas - Colaborador
 * Integração com API real + NFC Manager
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { apiClient } from '../../services/api';
import { nfcService } from '../../services/nfc';

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

// ─── Types ────────────────────────────────────────────────────────────────────
type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: ToolStatus;
  alocadoPara?: string;
}

type ModalStep = 'swap' | 'waiting_approval' | 'receiver_view';

// ─── Toast Component ──────────────────────────────────────────────────────────
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
    zIndex: 9999,
  },
  icon: { fontSize: 20 },
  text: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
});

// ─── NFC Pulse Icon ───────────────────────────────────────────────────────────
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
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
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
  ring: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: C.orange },
  iconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.orangeGhost, borderWidth: 2, borderColor: `${C.orange}30`, alignItems: 'center', justifyContent: 'center' },
});

// ─── Swap Modal ───────────────────────────────────────────────────────────────
interface SwapModalProps {
  visible: boolean;
  tool: Ferramenta | null;
  onClose: () => void;
  onSuccess: (toolCodigo: string) => void;
}

function SwapModal({ visible, tool, onClose, onSuccess }: SwapModalProps) {
  const [step, setStep] = useState<ModalStep>('swap');
  const [isLoading, setIsLoading] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);
  const [manualCracha, setManualCracha] = useState('');
  const [manualObservacao, setManualObservacao] = useState('');
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('swap');
      setIsLoading(false);
      setManualCracha('');
      setManualObservacao('');
      checkNFCSupport();
      startNFCReading();
      
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const checkNFCSupport = async () => {
    const supported = await nfcService.checkNFCSupport();
    setNfcSupported(supported);
  };

  const startNFCReading = async () => {
    if (!tool) return;
    
    try {
      const result = await nfcService.readTag();
      if (result.success) {
        // Simular espera por aprovação e então prosseguir para troca
        setStep('waiting_approval');
        setTimeout(() => {
          handleManualSwap();
        }, 2000);
      } else {
        console.log('NFC read cancelled or failed');
      }
    } catch (error) {
      console.error('Erro ao ler NFC:', error);
    }
  };

  const handleManualSwap = async () => {
    if (!tool || !manualCracha.trim()) return;
    
    try {
      setIsLoading(true);
      const userCracha = await AsyncStorage.getItem('userCracha');
      
      if (!userCracha) {
        throw new Error('Dados de usuário não encontrados');
      }

      const response = await apiClient.trocar({
        cracha_novo_colaborador: manualCracha.trim(),
        ferramentas: [
          {
            codigo: tool.codigo,
            qtd: 1,
            checklist: 'REALIZADO',
            observacao: manualObservacao.trim() || 'Troca manual',
          },
        ],
      });

      handleClose();
      setTimeout(() => onSuccess(tool.codigo), 320);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao transferir ferramenta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      nfcService.stop();
    });
  };

  if (!tool) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[modalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[modalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.toolHeader}>
            <View style={modalStyles.toolIconBox}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.toolName}>{tool.nome}</Text>
              <Text style={modalStyles.toolCode}>{tool.codigo}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M18 6L6 18M6 6l12 12" stroke={C.gray500} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={modalStyles.divider} />

          {step === 'swap' && (
            <View style={modalStyles.stepContainer}>
              <View style={modalStyles.swapHeader}>
                <NfcPulseIcon />
                <View style={modalStyles.swapText}>
                  <Text style={modalStyles.stepTitle}>Troca de Ferramenta</Text>
                  <Text style={modalStyles.stepSubtitle}>Aproxime o dispositivo NFC ou{'\n'}preencha os dados manualmente</Text>
                </View>
              </View>

              <View style={modalStyles.swapForm}>
                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.inputLabel}>Crachá do Novo Colaborador</Text>
                  <TextInput
                    style={modalStyles.input}
                    placeholder="Digite o número do crachá..."
                    placeholderTextColor={C.gray400}
                    value={manualCracha}
                    onChangeText={setManualCracha}
                    keyboardType="numeric"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={modalStyles.inputGroup}>
                  <Text style={modalStyles.inputLabel}>Observação (opcional)</Text>
                  <TextInput
                    style={[modalStyles.input, modalStyles.inputMultiline]}
                    placeholder="Ex: Troca por manutenção..."
                    placeholderTextColor={C.gray400}
                    value={manualObservacao}
                    onChangeText={setManualObservacao}
                    multiline
                    numberOfLines={2}
                    autoCapitalize="sentences"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[modalStyles.confirmBtn, (!manualCracha.trim()) && modalStyles.confirmBtnDisabled]}
                onPress={handleManualSwap}
                activeOpacity={0.7}
                disabled={!manualCracha.trim()}
              >
                <Text style={[modalStyles.confirmBtnText, (!manualCracha.trim()) && modalStyles.confirmBtnTextDisabled]}>
                  Confirmar Troca
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'waiting_approval' && (
            <View style={modalStyles.stepContainer}>
              <View style={modalStyles.waitingIconBox}>
                <ActivityIndicator size="large" color={C.orange} />
              </View>
              <Text style={modalStyles.stepTitle}>Processando Troca</Text>
              <Text style={modalStyles.stepSubtitle}>Enviando solicitação de transferência...</Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  divider: { height: 1, backgroundColor: C.gray100, marginHorizontal: 20, marginBottom: 4 },
  toolHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  toolIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, fontWeight: '700', color: C.black },
  toolCode: { fontSize: 12, color: C.gray500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.gray100, alignItems: 'center', justifyContent: 'center' },
  stepContainer: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 20, gap: 8, minHeight: 260 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.black, marginTop: 12, textAlign: 'center' },
  stepSubtitle: { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 22 },
  manualBtn: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16 },
  manualBtnText: { fontSize: 13, color: C.orange, fontWeight: '600', textDecorationLine: 'underline' },
  waitingIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  manualIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  swapHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  swapText: { flex: 1 },
  swapForm: { width: '100%', gap: 16, marginTop: 20 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.gray700 },
  input: { borderWidth: 1.5, borderColor: C.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.black, backgroundColor: C.white },
  inputMultiline: { height: 60, textAlignVertical: 'top', paddingTop: 12 },
  confirmBtn: { backgroundColor: C.orange, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  confirmBtnDisabled: { backgroundColor: C.gray200 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
  confirmBtnTextDisabled: { color: C.gray500 },
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
      <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
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
    'Disponível': { color: C.statusGreen, bg: C.statusGreenBg, dot: C.statusGreen },
    'Em uso': { color: C.statusRed, bg: C.statusRedBg, dot: C.statusRed },
    'Em manutenção': { color: C.statusAmber, bg: C.statusAmberBg, dot: C.statusAmber },
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
    <TouchableOpacity style={[styles.card, isInUse && styles.cardInteractive]} onPress={() => isInUse && onPress(item)} activeOpacity={isInUse ? 0.75 : 1}>
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
            <Text style={styles.metaLabel}>CÓD</Text>
            <Text style={styles.metaValue}>{item.codigo}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>CAT</Text>
            <Text style={styles.metaValue}>{item.categoria}</Text>
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

function FilterTabs({ active, onSelect, counts }: { active: string; onSelect: (f: string) => void; counts: Record<string, number> }) {
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
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('Todos');
  const [selectedTool, setSelectedTool] = useState<Ferramenta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [userCracha, setUserCracha] = useState<string | null>(null);

  // Carregar ferramentas na inicialização
  useEffect(() => {
    loadFerramentas();
  }, []);

  const loadFerramentas = async () => {
    try {
      setIsLoading(true);
      const cracha = await AsyncStorage.getItem('userCracha');
      setUserCracha(cracha);

      if (cracha) {
        const data = await apiClient.listarMinhasFerramentas(cracha);
        setFerramentas(data || []);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar ferramentas');
      setFerramentas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const counts = {
    Todos: ferramentas.length,
    'Disponível': ferramentas.filter(f => f.status === 'Disponível').length,
    'Em uso': ferramentas.filter(f => f.status === 'Em uso').length,
    'Em manutenção': ferramentas.filter(f => f.status === 'Em manutenção').length,
  };

  const filtered = ferramentas.filter(item => {
    const matchFilter = filter === 'Todos' || item.status === filter;
    const q = query.toLowerCase();
    const matchQuery = !q || item.nome.toLowerCase().includes(q) || item.codigo.toLowerCase().includes(q) || (item.alocadoPara?.toLowerCase().includes(q) ?? false);
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

  const handleSwapSuccess = (toolCodigo: string) => {
    showToast(`✅ Ferramenta ${toolCodigo} transferida com sucesso!`);
    // Recarregar ferramentas após troca bem-sucedida
    setTimeout(() => loadFerramentas(), 1000);
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={{ marginTop: 12, color: C.gray500 }}>Carregando ferramentas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ferramentas</Text>
            <Text style={styles.headerSub}>{counts.Todos} ferramentas cadastradas</Text>
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
          <TextInput style={styles.searchInput} placeholder="Buscar por nome ou código…" placeholderTextColor={C.gray400} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" />
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
          keyExtractor={item => item.codigo}
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
      <SwapModal visible={modalVisible} tool={selectedTool} onClose={handleModalClose} onSuccess={handleSwapSuccess} />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },
  headerSafe: { backgroundColor: C.orange },
  body: { flex: 1, backgroundColor: C.offWhite, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingTop: 20 },
  header: { backgroundColor: C.orange, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 },
  headerContent: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500', textAlign: 'center' },
  statSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 14, marginHorizontal: 16, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: C.black, paddingVertical: 0 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, marginBottom: 4, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.gray200, gap: 5 },
  filterChipActive: { backgroundColor: C.orange, borderColor: C.orange },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.gray500 },
  filterChipTextActive: { color: C.white },
  filterCount: { backgroundColor: C.gray100, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: C.gray500 },
  filterCountTextActive: { color: C.white },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardInteractive: { borderWidth: 1.5, borderColor: `${C.statusRed}20` },
  cardLeft: {},
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 6 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toolName: { flex: 1, fontSize: 15, fontWeight: '700', color: C.black },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '700', color: C.gray400, letterSpacing: 0.5 },
  metaValue: { fontSize: 12, fontWeight: '600', color: C.gray700 },
  metaDivider: { width: 1, height: 12, backgroundColor: C.gray200, marginHorizontal: 10 },
  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.statusRedBg, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start' },
  allocText: { fontSize: 12, fontWeight: '600', color: C.statusRed },
  swapHint: { fontSize: 11, color: `${C.statusRed}80`, fontStyle: 'italic' },
  badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.gray700 },
  emptyText: { fontSize: 14, color: C.gray500 },
});
