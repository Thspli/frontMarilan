/**
 * app/(tabs)/almoxarifado.tsx
 * Tela de Almoxarifado / Retirada — Marilan
 *
 * Instalar se ainda não tiver: expo install react-native-nfc-manager
 * (o NFC real é mockado aqui — veja o bloco "NFC Mock")
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

// ─── Theme ─────────────────────────────────────────────────────────────────────
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

  amber: '#F59E0B',
  amberBg: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.35)',

  green: '#27AE60',
  greenBg: 'rgba(39,174,96,0.10)',

  blue: '#2563EB',
  blueBg: 'rgba(37,99,235,0.08)',

  overlay: 'rgba(26,28,34,0.72)',
};

// ─── Data ───────────────────────────────────────────────────────────────────────
type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  id: string;
  codigo: string;
  nome: string;
  status: ToolStatus;
  categoria: string;
}

const INITIAL_TOOLS: Ferramenta[] = [
  { id: '1',  codigo: 'FRR-0001', nome: 'Furadeira de Impacto',   status: 'Disponível',    categoria: 'Elétrica'   },
  { id: '4',  codigo: 'FRR-0004', nome: 'Parafusadeira Elétrica', status: 'Disponível',    categoria: 'Elétrica'   },
  { id: '6',  codigo: 'FRR-0006', nome: 'Martelo Demolidor',      status: 'Disponível',    categoria: 'Impacto'    },
  { id: '8',  codigo: 'FRR-0008', nome: 'Nível a Laser',          status: 'Disponível',    categoria: 'Medição'    },
  { id: '10', codigo: 'FRR-0010', nome: 'Chave de Impacto',       status: 'Disponível',    categoria: 'Impacto'    },
  { id: '12', codigo: 'FRR-0012', nome: 'Serra Tico-Tico',        status: 'Disponível',    categoria: 'Corte'      },
  { id: '14', codigo: 'FRR-0014', nome: 'Fresadora Manual',       status: 'Disponível',    categoria: 'Corte'      },
];

// ─── NFC Mock ──────────────────────────────────────────────────────────────────
// Em produção, substitua por: import NfcManager, { NfcTech } from 'react-native-nfc-manager';
const NfcMock = {
  isSupported: async () => true,
  start: async () => {},
  requestTechnology: async () => {},
  cancelTechnologyRequest: async () => {},
  getTag: async () => ({ id: 'ALMOX-CARD-001', ndefMessage: [] }),
};

// ─── Icons ─────────────────────────────────────────────────────────────────────
const SearchIcon = ({ color = C.gray400 }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ClearIcon = ({ color = C.gray400 }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ToolIcon = ({ color = C.orange, size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ReturnIcon = ({ color = C.amber }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M3 12h18M3 12l6-6M3 12l6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PickupIcon = ({ color = C.white }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12H3m18 0l-6-6m6 6l-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const NfcIcon = ({ color = C.white, size = 48 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 12a8 8 0 0 1-8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M4 12a8 8 0 0 1 8-8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M17 12a5 5 0 0 1-5 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M7 12a5 5 0 0 1 5-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx={12} cy={12} r={2} fill={color} />
  </Svg>
);

const UserBadgeIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={18} height={18} rx={4} stroke={color} strokeWidth={1.8} />
    <Circle cx={12} cy={9} r={3} stroke={color} strokeWidth={1.8} />
    <Path d="M6 20c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// ─── NFC Pulse Animation ───────────────────────────────────────────────────────
function NfcPulse() {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const a1 = createAnim(pulse1, 0);
    const a2 = createAnim(pulse2, 400);
    const a3 = createAnim(pulse3, 800);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const ringStyle = (val: Animated.Value) => ({
    scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.0] }),
    opacity: val.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 0.4, 0] }),
  });

  const makeRingStyle = (val: Animated.Value) => {
    const s = ringStyle(val);
    return {
      transform: [{ scale: s.scale }],
      opacity: s.opacity,
    };
  };

  return (
    <View style={styles.nfcPulseContainer}>
      {[pulse1, pulse2, pulse3].map((p, i) => (
        <Animated.View key={i} style={[styles.nfcRing, makeRingStyle(p)]} />
      ))}
      <View style={styles.nfcIconCircle}>
        <NfcIcon size={36} color={C.white} />
      </View>
    </View>
  );
}

// ─── Authorization Modal ───────────────────────────────────────────────────────
type ModalAction = 'retirar' | 'devolver';

interface AuthModalProps {
  visible: boolean;
  action: ModalAction;
  tool: Ferramenta | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function AuthModal({ visible, action, tool, onSuccess, onCancel }: AuthModalProps) {
  const [nfcStatus, setNfcStatus] = useState<'waiting' | 'reading' | 'success' | 'error'>('waiting');
  const [showManual, setShowManual] = useState(false);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  // Abre NFC listener ao montar
  useEffect(() => {
    if (!visible) {
      setNfcStatus('waiting');
      setShowManual(false);
      slideAnim.setValue(300);
      successScale.setValue(0);
      return;
    }

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();

    // Inicia o listener NFC
    startNfc();

    // Fallback: mostra "Assinatura Manual" após 8s
    const fallbackTimer = setTimeout(() => setShowManual(true), 8000);
    return () => clearTimeout(fallbackTimer);
  }, [visible]);

  const startNfc = async () => {
    try {
      const supported = await NfcMock.isSupported();
      if (!supported) { setShowManual(true); return; }
      await NfcMock.start();
      setNfcStatus('reading');
      await NfcMock.requestTechnology();
      // Mock: simula leitura com delay
    } catch {
      setShowManual(true);
    }
  };

  const handleValidate = () => {
    setNfcStatus('success');
    Animated.spring(successScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 180,
    }).start(() => {
      setTimeout(onSuccess, 700);
    });
  };

  const isSuccess = nfcStatus === 'success';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Top accent */}
          <View style={[styles.modalAccent, { backgroundColor: action === 'retirar' ? C.orange : C.amber }]} />

          {/* Tool info pill */}
          {tool && (
            <View style={styles.modalToolPill}>
              <ToolIcon color={action === 'retirar' ? C.orange : C.amber} size={16} />
              <Text style={styles.modalToolCode}>{tool.codigo}</Text>
              <View style={styles.modalToolDivider} />
              <Text style={styles.modalToolName} numberOfLines={1}>{tool.nome}</Text>
            </View>
          )}

          {/* Action label */}
          <View style={[styles.modalActionBadge, {
            backgroundColor: action === 'retirar' ? C.orangeGhost : C.amberBg,
          }]}>
            <Text style={[styles.modalActionText, {
              color: action === 'retirar' ? C.orange : C.amber,
            }]}>
              {action === 'retirar' ? '↓  RETIRADA' : '↑  DEVOLUÇÃO'}
            </Text>
          </View>

          {/* NFC area */}
          {!isSuccess ? (
            <>
              <Text style={styles.modalTitle}>Aguardando Aprovação{'\n'}do Almoxarife</Text>
              <Text style={styles.modalSubtitle}>
                Aproxime o cartão do responsável{'\n'}ou dispositivo NFC
              </Text>

              <NfcPulse />

              {/* Botão de teste (simula NFC aprovado) */}
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: action === 'retirar' ? C.orange : C.amber }]}
                onPress={handleValidate}
                activeOpacity={0.85}>
                <UserBadgeIcon color={C.white} />
                <Text style={styles.testButtonText}>Simular Leitura NFC</Text>
              </TouchableOpacity>

              {/* Assinatura manual (fallback) */}
              {showManual && (
                <TouchableOpacity style={styles.manualLink} onPress={handleValidate}>
                  <Text style={styles.manualLinkText}>Assinatura Manual do Almoxarife</Text>
                </TouchableOpacity>
              )}

              {/* Cancelar */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
                <Text style={styles.successCheck}>✓</Text>
              </Animated.View>
              <Text style={styles.successTitle}>
                {action === 'retirar' ? 'Retirada Aprovada!' : 'Devolução Aprovada!'}
              </Text>
              <Text style={styles.successSub}>Autorizado pelo Almoxarife</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── "Comigo" Card ─────────────────────────────────────────────────────────────
function ComigoBanner({ tool, onReturn }: { tool: Ferramenta | null; onReturn: () => void }) {
  const anim = useRef(new Animated.Value(tool ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: tool ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 160,
    }).start();
  }, [tool]);

  return (
    <View style={styles.comigoSection}>
      <View style={styles.comigoHeader}>
        <Text style={styles.comigoSectionLabel}>COMIGO AGORA</Text>
        {tool && (
          <View style={styles.comigoActiveDot} />
        )}
      </View>

      {tool ? (
        <Animated.View style={[styles.comigoCard, { transform: [{ scale: anim }], opacity: anim }]}>
          <View style={styles.comigoCardLeft}>
            <View style={styles.comigoIconBox}>
              <ToolIcon color={C.amber} size={22} />
            </View>
          </View>
          <View style={styles.comigoCardBody}>
            <Text style={styles.comigoToolName} numberOfLines={1}>{tool.nome}</Text>
            <View style={styles.comigoMeta}>
              <Text style={styles.comigoMetaText}>{tool.codigo}</Text>
              <View style={styles.comigoMetaDot} />
              <Text style={styles.comigoMetaText}>{tool.categoria}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.returnBtn} onPress={onReturn} activeOpacity={0.8}>
            <ReturnIcon color={C.amber} />
            <Text style={styles.returnBtnText}>Devolver</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={styles.comigoEmpty}>
          <Text style={styles.comigoEmptyIcon}>🔧</Text>
          <Text style={styles.comigoEmptyText}>Nenhuma ferramenta retirada</Text>
        </View>
      )}
    </View>
  );
}

// ─── Available Tool Row ────────────────────────────────────────────────────────
function AvailableToolCard({ item, onPickup, disabled }: {
  item: Ferramenta;
  onPickup: () => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.availCard, disabled && styles.availCardDisabled]}>
      <View style={styles.availIconBox}>
        <ToolIcon color={disabled ? C.gray400 : C.orange} size={18} />
      </View>
      <View style={styles.availBody}>
        <Text style={[styles.availName, disabled && { color: C.gray400 }]} numberOfLines={1}>
          {item.nome}
        </Text>
        <View style={styles.availMeta}>
          <Text style={styles.availCode}>{item.codigo}</Text>
          <View style={styles.availMetaDot} />
          <Text style={styles.availCat}>{item.categoria}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.pickupBtn, disabled && styles.pickupBtnDisabled]}
        onPress={onPickup}
        disabled={disabled}
        activeOpacity={0.85}>
        <PickupIcon color={disabled ? C.gray400 : C.white} />
        <Text style={[styles.pickupBtnText, disabled && { color: C.gray400 }]}>Retirar</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [tools, setTools] = useState<Ferramenta[]>(INITIAL_TOOLS);
  const [myTool, setMyTool] = useState<Ferramenta | null>(null);
  const [query, setQuery] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<ModalAction>('retirar');
  const [pendingTool, setPendingTool] = useState<Ferramenta | null>(null);

  const available = useMemo(() =>
    tools.filter(t => {
      const q = query.toLowerCase();
      return (
        !q ||
        t.nome.toLowerCase().includes(q) ||
        t.codigo.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q)
      );
    }),
    [tools, query]
  );

  const openPickup = useCallback((tool: Ferramenta) => {
    setPendingTool(tool);
    setPendingAction('retirar');
    setModalVisible(true);
  }, []);

  const openReturn = useCallback(() => {
    if (!myTool) return;
    setPendingTool(myTool);
    setPendingAction('devolver');
    setModalVisible(true);
  }, [myTool]);

  const handleModalSuccess = useCallback(() => {
    setModalVisible(false);

    if (pendingAction === 'retirar' && pendingTool) {
      // Remove da lista de disponíveis
      setTools(prev => prev.filter(t => t.id !== pendingTool.id));
      // Coloca no "Comigo"
      setMyTool(pendingTool);
    } else if (pendingAction === 'devolver' && myTool) {
      // Volta para a lista de disponíveis
      setTools(prev => [{ ...myTool, status: 'Disponível' }, ...prev]);
      setMyTool(null);
    }

    setPendingTool(null);
  }, [pendingAction, pendingTool, myTool]);

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
    setPendingTool(null);
  }, []);

  const hasMyTool = !!myTool;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* ── Header ── */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Almoxarifado</Text>
            <Text style={styles.headerSub}>Retirada e Devolução de Ferramentas</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{INITIAL_TOOLS.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tools.length}</Text>
              <Text style={styles.statLabel}>Disponíveis</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{hasMyTool ? 1 : 0}</Text>
              <Text style={styles.statLabel}>Comigo</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Body ── */}
      <View style={styles.body}>
        {/* Comigo */}
        <ComigoBanner tool={myTool} onReturn={openReturn} />

        {/* Divider */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>FERRAMENTAS DISPONÍVEIS</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Search */}
        <View style={styles.searchWrapper}>
          <SearchIcon color={query ? C.orange : C.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, código ou categoria…"
            placeholderTextColor={C.gray400}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={available}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AvailableToolCard
              item={item}
              onPickup={() => openPickup(item)}
              disabled={hasMyTool}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Nenhuma ferramenta disponível</Text>
              <Text style={styles.emptyText}>
                {query ? 'Tente outro termo de busca.' : 'Todas as ferramentas estão em uso.'}
              </Text>
            </View>
          }
        />

        {/* Aviso quando já tem uma ferramenta */}
        {hasMyTool && (
          <View style={styles.limitBanner}>
            <Text style={styles.limitBannerText}>
              ⚠️  Devolva a ferramenta atual antes de retirar outra
            </Text>
          </View>
        )}
      </View>

      {/* ── Auth Modal ── */}
      <AuthModal
        visible={modalVisible}
        action={pendingAction}
        tool={pendingTool}
        onSuccess={handleModalSuccess}
        onCancel={handleModalCancel}
      />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },
  headerSafe: { backgroundColor: C.orange },
  body: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 8,
  },

  // Header
  header: {
    backgroundColor: C.orange,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
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
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.70)', marginTop: 2, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.70)', marginTop: 2, fontWeight: '500', textAlign: 'center' },
  statSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.20)', marginVertical: 4 },

  // Comigo section
  comigoSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  comigoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  comigoSectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.gray500, letterSpacing: 1.2,
  },
  comigoActiveDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.amber,
  },

  comigoCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: C.amberBorder,
    shadowColor: C.amber,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  comigoCardLeft: {},
  comigoIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.amberBg,
    alignItems: 'center', justifyContent: 'center',
  },
  comigoCardBody: { flex: 1, gap: 4 },
  comigoToolName: { fontSize: 15, fontWeight: '700', color: C.black },
  comigoMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comigoMetaText: { fontSize: 12, color: C.gray500, fontWeight: '500' },
  comigoMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray400 },

  returnBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.amberBg,
    borderWidth: 1.5, borderColor: C.amberBorder,
    borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  returnBtnText: { fontSize: 13, fontWeight: '700', color: C.amber },

  comigoEmpty: {
    backgroundColor: C.gray100,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.gray200,
    borderStyle: 'dashed',
  },
  comigoEmptyIcon: { fontSize: 24 },
  comigoEmptyText: { fontSize: 13, color: C.gray500, fontWeight: '500' },

  // Divider
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginVertical: 4, gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.gray200 },
  dividerLabel: { fontSize: 11, fontWeight: '700', color: C.gray400, letterSpacing: 1.2 },

  // Search
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 14, height: 46,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.black, paddingVertical: 0 },

  // Available card
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 90 },

  availCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3,
    elevation: 1,
  },
  availCardDisabled: { opacity: 0.5 },
  availIconBox: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: C.orangeGhost,
    alignItems: 'center', justifyContent: 'center',
  },
  availBody: { flex: 1, gap: 3 },
  availName: { fontSize: 14, fontWeight: '700', color: C.black },
  availMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  availCode: { fontSize: 11, color: C.gray500, fontWeight: '600' },
  availMetaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: C.gray400 },
  availCat: { fontSize: 11, color: C.gray500 },

  pickupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.orange,
    borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  pickupBtnDisabled: { backgroundColor: C.gray200 },
  pickupBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  // Limit banner
  limitBanner: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: C.amberBg,
    borderWidth: 1, borderColor: C.amberBorder,
    borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  limitBannerText: { fontSize: 13, color: C.amber, fontWeight: '600', textAlign: 'center' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 50, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.gray700 },
  emptyText: { fontSize: 14, color: C.gray500 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    alignItems: 'center',
    minHeight: 480,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.gray200,
    marginBottom: 16,
  },
  modalAccent: {
    width: 48, height: 4, borderRadius: 2, marginBottom: 16,
  },
  modalToolPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.gray100,
    borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
    marginBottom: 12,
  },
  modalToolCode: { fontSize: 12, fontWeight: '700', color: C.gray700 },
  modalToolDivider: { width: 1, height: 12, backgroundColor: C.gray400 },
  modalToolName: { fontSize: 12, color: C.gray500, fontWeight: '500', maxWidth: 160 },
  modalActionBadge: {
    borderRadius: 20, paddingVertical: 5, paddingHorizontal: 16, marginBottom: 16,
  },
  modalActionText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  modalTitle: {
    fontSize: 22, fontWeight: '800', color: C.black,
    textAlign: 'center', letterSpacing: -0.3, lineHeight: 30,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 20,
    marginBottom: 28,
  },

  // NFC pulse
  nfcPulseContainer: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  nfcRing: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2,
    borderColor: C.orange,
  },
  nfcIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },

  testButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  testButtonText: { fontSize: 15, fontWeight: '700', color: C.white },

  manualLink: { paddingVertical: 8, marginBottom: 4 },
  manualLinkText: { fontSize: 13, color: C.gray500, textDecorationLine: 'underline' },

  cancelBtn: {
    paddingVertical: 10, paddingHorizontal: 24,
  },
  cancelBtnText: { fontSize: 14, color: C.gray400, fontWeight: '600' },

  // Success
  successContainer: { alignItems: 'center', gap: 12, paddingTop: 24, paddingBottom: 24 },
  successCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  successCheck: { fontSize: 38, color: C.white, fontWeight: '800' },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.black },
  successSub: { fontSize: 14, color: C.gray500 },
});