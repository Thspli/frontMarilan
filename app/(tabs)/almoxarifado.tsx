/**
 * app/(tabs)/almoxarifado.tsx
 * Tela de Almoxarifado — Paleta Marilan (laranja + branco)
 * Fluxo: Clica ferramenta → NFC almoxarife autoriza → registra retirada
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
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

// ─── Design System Marilan ────────────────────────────────────────────────────
const C = {
  orange: '#F26419',
  orangeLight: '#FF8C42',
  orangeDark: '#C94E0F',
  orangeGhost: 'rgba(242,100,25,0.08)',
  white: '#FFFFFF',
  offWhite: '#F7F8FA',
  gray100: '#F2F3F5',
  gray200: '#E4E6EA',
  gray300: '#CDD0D7',
  gray400: '#B0B5BE',
  gray500: '#8A8F9E',
  gray600: '#636875',
  gray700: '#4A4F5C',
  black: '#1A1C22',
  green: '#22C55E',
  greenDim: 'rgba(34,197,94,0.10)',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconWrench = ({ size = 18, color = C.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconSearch = ({ size = 16, color = C.gray400 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const IconX = ({ size = 16, color = C.gray500 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const IconReturn = ({ size = 16, color = C.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 9L4 4m0 0l5 5M4 4v5.5A6.5 6.5 0 0 0 10.5 16H20"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconCheck = ({ size = 20, color = C.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconNFC = ({ size = 34, color = C.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2Z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M8.5 8.5C9.8 7.2 11.6 6.5 13.5 6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M6.5 6.5C8.3 4.7 10.8 3.5 13.5 3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.4} />
    <Circle cx={10} cy={14} r={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M12.5 14H18V20L16 18.5L14 20V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const IconChevronRight = ({ size = 16, color = C.gray300 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: 'Disponível' | 'Em uso' | 'Em manutenção';
}

interface EmprestimoAtivo extends Ferramenta {
  pegouEm: Date;
  autorizadoPor: string;
}

type NFCPhase = 'waiting' | 'reading' | 'authorized';

// ─── NFC Pulse ────────────────────────────────────────────────────────────────
function NFCPulse({ active }: { active: boolean }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      const a = Animated.parallel(
        rings.map((r, i) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(i * 400),
              Animated.timing(r, { toValue: 1, duration: 1300, useNativeDriver: true }),
              Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
          )
        )
      );
      animRef.current = a;
      a.start();
    } else {
      animRef.current?.stop();
      rings.forEach(r => r.setValue(0));
    }
    return () => { animRef.current?.stop(); };
  }, [active]);

  return (
    <View style={nfcS.wrapper}>
      {rings.map((r, i) => (
        <Animated.View key={i} style={[nfcS.ring, {
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.1] }) }],
          opacity: r.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.38, 0] }),
        }]} />
      ))}
      <View style={nfcS.core}>
        <IconNFC size={32} color={C.orange} />
      </View>
    </View>
  );
}
const nfcS = StyleSheet.create({
  wrapper: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderColor: C.orange },
  core: { width: 74, height: 74, borderRadius: 37, backgroundColor: C.orangeGhost, borderWidth: 2, borderColor: C.orange + '30', alignItems: 'center', justifyContent: 'center' },
});

// ─── Authorization Modal ──────────────────────────────────────────────────────
interface AuthModalProps {
  visible: boolean;
  ferramenta: Ferramenta | null;
  onClose: () => void;
  onAuthorized: (ferramenta: Ferramenta, autorizadoPor: string) => void;
}

function AuthorizationModal({ visible, ferramenta, onClose, onAuthorized }: AuthModalProps) {
  const [phase, setPhase] = useState<NFCPhase>('waiting');
  const [crachaManu, setCrachaManu] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [tagRead, setTagRead] = useState('');

  const slideY = useRef(new Animated.Value(500)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const manualH = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPhase('waiting');
      setCrachaManu('');
      setShowManual(false);
      setTagRead('');
      manualH.setValue(0);
      successScale.setValue(0);

      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 72, friction: 13 }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => startNFC());
    } else {
      slideY.setValue(500);
      bgOpacity.setValue(0);
    }
  }, [visible]);

  const startNFC = async () => {
    setPhase('reading');
    try {
      const result = await nfcService.readTag();
      if (result.success && result.data) {
        setTagRead(result.data);
        setPhase('authorized');
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 140, friction: 8 }).start();
      } else {
        setPhase('waiting');
      }
    } catch {
      setPhase('waiting');
    }
  };

  const dismiss = () => {
    nfcService.stop();
    Animated.parallel([
      Animated.timing(slideY, { toValue: 500, duration: 260, useNativeDriver: true }),
      Animated.timing(bgOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const toggleManual = () => {
    const next = !showManual;
    setShowManual(next);
    Animated.spring(manualH, { toValue: next ? 1 : 0, useNativeDriver: false, tension: 100, friction: 12 }).start();
    if (!next) { setCrachaManu(''); Keyboard.dismiss(); }
  };

  const confirmManual = () => {
    if (!crachaManu.trim()) return;
    Keyboard.dismiss();
    setTagRead(crachaManu.trim());
    setPhase('authorized');
    Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 140, friction: 8 }).start();
  };

  const confirmRetirada = () => {
    if (!ferramenta) return;
    dismiss();
    setTimeout(() => onAuthorized(ferramenta, tagRead), 320);
  };

  const manualHeight = manualH.interpolate({ inputRange: [0, 1], outputRange: [0, 90] });
  const manualOpacity = manualH.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  if (!ferramenta) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[mS.backdrop, { opacity: bgOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />
      </Animated.View>

      <Animated.View style={[mS.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={mS.handle} />

        {/* Tool info row */}
        <View style={mS.toolRow}>
          <View style={mS.toolIcon}>
            <IconWrench size={20} color={C.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={mS.toolName} numberOfLines={1}>{ferramenta.nome}</Text>
            <Text style={mS.toolMeta}>{ferramenta.categoria} · {ferramenta.codigo}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={mS.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconX size={16} color={C.gray500} />
          </TouchableOpacity>
        </View>
        <View style={mS.divider} />

        {/* ── Waiting / Reading ── */}
        {phase !== 'authorized' && (
          <View style={mS.body}>
            <NFCPulse active={phase === 'reading'} />

            <View style={mS.textBlock}>
              <Text style={mS.phaseTitle}>
                {phase === 'reading' ? 'Aguardando crachá...' : 'Autorização necessária'}
              </Text>
              <Text style={mS.phaseDesc}>
                O almoxarife deve aproximar o crachá{'\n'}NFC para liberar a retirada
              </Text>
            </View>

            {phase === 'waiting' && (
              <TouchableOpacity style={mS.primaryBtn} onPress={startNFC} activeOpacity={0.85}>
                <Text style={mS.primaryBtnText}>Iniciar leitura NFC</Text>
              </TouchableOpacity>
            )}

            {/* Manual fallback */}
            <TouchableOpacity style={mS.manualToggleBtn} onPress={toggleManual} activeOpacity={0.7}>
              <Text style={mS.manualToggleText}>
                {showManual ? 'Cancelar entrada manual' : 'Inserir crachá manualmente'}
              </Text>
            </TouchableOpacity>

            <Animated.View style={{ height: manualHeight, opacity: manualOpacity, width: '100%', overflow: 'hidden' }}>
              <View style={mS.manualRow}>
                <TextInput
                  style={mS.manualInput}
                  placeholder="Número do crachá do almoxarife"
                  placeholderTextColor={C.gray400}
                  value={crachaManu}
                  onChangeText={setCrachaManu}
                  keyboardType="numeric"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={confirmManual}
                />
                <TouchableOpacity
                  style={[mS.manualOkBtn, !crachaManu.trim() && mS.manualOkBtnDisabled]}
                  onPress={confirmManual}
                  activeOpacity={0.8}
                  disabled={!crachaManu.trim()}
                >
                  <Text style={mS.manualOkText}>OK</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

        {/* ── Authorized ── */}
        {phase === 'authorized' && (
          <View style={mS.body}>
            <Animated.View style={[mS.successCircle, { transform: [{ scale: successScale }] }]}>
              <IconCheck size={34} color={C.green} />
            </Animated.View>

            <View style={mS.textBlock}>
              <Text style={[mS.phaseTitle, { color: C.green }]}>Autorizado!</Text>
              <Text style={mS.phaseDesc}>
                Crachá <Text style={{ fontWeight: '700', color: C.black }}>{tagRead}</Text> verificado.{'\n'}
                Confirme para registrar a retirada.
              </Text>
            </View>

            <TouchableOpacity style={mS.primaryBtn} onPress={confirmRetirada} activeOpacity={0.85}>
              <Text style={mS.primaryBtnText}>Confirmar Retirada</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={dismiss} style={mS.cancelBtn}>
              <Text style={mS.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const mS = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 16 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, fontWeight: '700', color: C.black },
  toolMeta: { fontSize: 12, color: C.gray500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.gray100, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: C.gray100 },

  body: { paddingHorizontal: 24, paddingTop: 28, alignItems: 'center', gap: 16, minHeight: 310 },
  textBlock: { alignItems: 'center', gap: 6 },
  phaseTitle: { fontSize: 20, fontWeight: '800', color: C.black, letterSpacing: -0.3, textAlign: 'center' },
  phaseDesc: { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 22 },

  primaryBtn: {
    width: '100%', height: 52, borderRadius: 16, backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    shadowColor: C.orangeDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: C.white, letterSpacing: 0.2 },

  manualToggleBtn: { paddingVertical: 6 },
  manualToggleText: { fontSize: 13, color: C.orange, fontWeight: '600' },
  manualRow: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  manualInput: { flex: 1, height: 48, backgroundColor: C.gray100, borderRadius: 12, borderWidth: 1.5, borderColor: C.gray200, paddingHorizontal: 14, fontSize: 15, color: C.black },
  manualOkBtn: { width: 58, height: 48, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center' },
  manualOkBtnDisabled: { backgroundColor: C.gray200 },
  manualOkText: { fontSize: 14, fontWeight: '800', color: C.white },

  successCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.greenDim, borderWidth: 2, borderColor: C.green + '40', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, color: C.gray400, fontWeight: '500' },
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 130, friction: 10 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 14, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[tS.wrap, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <View style={tS.pill}>
        <View style={tS.dot} />
        <Text style={tS.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const tS = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 28, left: 24, right: 24, zIndex: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.black, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  text: { fontSize: 14, fontWeight: '600', color: C.white },
});

// ─── Emprestimo Card ──────────────────────────────────────────────────────────
function EmprestimoCard({ item, index, onReturn }: { item: EmprestimoAtivo; index: number; onReturn: (c: string) => void }) {
  const ox = useRef(new Animated.Value(-24)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(ox, { toValue: 0, useNativeDriver: true, delay: index * 50, tension: 100, friction: 13 }),
      Animated.timing(op, { toValue: 1, duration: 240, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const mins = Math.round((Date.now() - item.pegouEm.getTime()) / 60000);
  const since = mins < 1 ? 'agora mesmo' : mins === 1 ? '1 min atrás' : `${mins} min atrás`;

  return (
    <Animated.View style={[eS.wrap, { opacity: op, transform: [{ translateX: ox }] }]}>
      <View style={eS.card}>
        <View style={eS.accent} />
        <View style={eS.icon}>
          <IconWrench size={15} color={C.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={eS.name} numberOfLines={1}>{item.nome}</Text>
          <Text style={eS.meta}>{item.codigo} · {since}</Text>
        </View>
        <TouchableOpacity style={eS.returnBtn} onPress={() => onReturn(item.codigo)} activeOpacity={0.75}>
          <IconReturn size={13} color={C.orange} />
          <Text style={eS.returnText}>Devolver</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
const eS = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.gray200, overflow: 'hidden' },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, backgroundColor: C.orange, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  icon: { width: 36, height: 36, borderRadius: 9, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: C.black },
  meta: { fontSize: 11, color: C.gray500, marginTop: 2 },
  returnBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 9, backgroundColor: C.orangeGhost, borderWidth: 1, borderColor: C.orange + '30' },
  returnText: { fontSize: 11, fontWeight: '700', color: C.orange },
});

// ─── Ferramenta Row ───────────────────────────────────────────────────────────
function FerramentaRow({ item, index, onPress }: { item: Ferramenta; index: number; onPress: (f: Ferramenta) => void }) {
  const oy = useRef(new Animated.Value(10)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, delay: index * 30, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, useNativeDriver: true, delay: index * 30, tension: 120, friction: 14 }),
    ]).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(sc, { toValue: 0.975, duration: 70, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, useNativeDriver: true, tension: 220, friction: 10 }),
    ]).start();
    onPress(item);
  };

  return (
    <Animated.View style={[fS.wrap, { opacity: op, transform: [{ translateY: oy }, { scale: sc }] }]}>
      <TouchableOpacity style={fS.card} onPress={handlePress} activeOpacity={1}>
        <View style={fS.icon}>
          <IconWrench size={17} color={C.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={fS.name} numberOfLines={1}>{item.nome}</Text>
          <Text style={fS.cat}>{item.categoria}</Text>
        </View>
        <View style={fS.right}>
          <Text style={fS.code}>{item.codigo}</Text>
          <View style={fS.freeBadge}>
            <View style={fS.freeDot} />
            <Text style={fS.freeText}>Livre</Text>
          </View>
        </View>
        <IconChevronRight size={16} color={C.gray300} />
      </TouchableOpacity>
    </Animated.View>
  );
}
const fS = StyleSheet.create({
  wrap: { marginBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1, borderColor: C.gray200 },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: C.black },
  cat: { fontSize: 12, color: C.gray500, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  code: { fontSize: 11, color: C.gray400, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.greenDim, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 50 },
  freeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.green },
  freeText: { fontSize: 10, fontWeight: '700', color: C.green },
});

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label, count, accentColor }: { label: string; count: number; accentColor?: string }) {
  const color = accentColor || C.gray500;
  return (
    <View style={slS.row}>
      <View style={[slS.bar, { backgroundColor: color }]} />
      <Text style={slS.label}>{label}</Text>
      <View style={[slS.badge, { backgroundColor: color + '18' }]}>
        <Text style={[slS.badgeNum, { color }]}>{count}</Text>
      </View>
    </View>
  );
}
const slS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  bar: { width: 3, height: 14, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: '800', color: C.gray500, letterSpacing: 1.1, textTransform: 'uppercase', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 50 },
  badgeNum: { fontSize: 11, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [emprestimos, setEmprestimos] = useState<EmprestimoAtivo[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFerr, setSelectedFerr] = useState<Ferramenta | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => { loadFerramentas(); }, []);

  const loadFerramentas = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.listarFerramentas();
      setFerramentas((data || []).filter((f: Ferramenta) => f.status === 'Disponível'));
    } catch {
      setFerramentas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (ferramenta: Ferramenta) => {
    setSelectedFerr(ferramenta);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedFerr(null), 400);
  };

  const handleAuthorized = useCallback((ferramenta: Ferramenta, autorizadoPor: string) => {
    setFerramentas(prev => prev.filter(f => f.codigo !== ferramenta.codigo));
    setEmprestimos(prev => [{ ...ferramenta, pegouEm: new Date(), autorizadoPor }, ...prev]);
    showToast(`${ferramenta.nome} retirada com sucesso!`);
  }, []);

  const handleReturn = useCallback((codigo: string) => {
    const item = emprestimos.find(e => e.codigo === codigo);
    if (!item) return;
    setEmprestimos(prev => prev.filter(e => e.codigo !== codigo));
    setFerramentas(prev => [{ codigo: item.codigo, nome: item.nome, categoria: item.categoria, status: 'Disponível' }, ...prev]);
    showToast('Ferramenta devolvida');
  }, [emprestimos]);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  const filtered = ferramentas.filter(f => {
    if (!query) return true;
    const q = query.toLowerCase();
    return f.nome.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q);
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <SafeAreaView style={s.headerBg} edges={['top']}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.title}>Almoxarifado</Text>
            <Text style={s.sub}>
              {ferramentas.length} {ferramentas.length === 1 ? 'ferramenta disponível' : 'ferramentas disponíveis'}
            </Text>
          </View>
          {emprestimos.length > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeNum}>{emprestimos.length}</Text>
              <Text style={s.badgeLabel}>com você</Text>
            </View>
          )}
        </View>

        <View style={s.searchWrap}>
          <IconSearch size={15} color={query ? C.orange : C.gray400} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nome, código ou categoria..."
            placeholderTextColor={C.gray400}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconX size={14} color={C.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Body */}
      <ScrollView
        style={s.body}
        contentContainerStyle={s.bodyContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Empréstimos ativos */}
        {emprestimos.length > 0 && (
          <View style={s.section}>
            <SectionLabel label="Com você agora" count={emprestimos.length} accentColor={C.orange} />
            {emprestimos.map((item, i) => (
              <EmprestimoCard key={item.codigo} item={item} index={i} onReturn={handleReturn} />
            ))}
          </View>
        )}

        {/* Ferramentas disponíveis */}
        <View style={s.section}>
          <SectionLabel label="Disponíveis" count={filtered.length} accentColor={C.green} />

          {isLoading ? (
            <View style={s.centerState}>
              <ActivityIndicator color={C.orange} />
              <Text style={s.stateText}>Carregando ferramentas...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.centerState}>
              <Text style={s.emptyEmoji}>🔧</Text>
              <Text style={s.stateTitle}>{query ? 'Nenhum resultado' : 'Nenhuma ferramenta disponível'}</Text>
              {!!query && <Text style={s.stateText}>Tente outro termo de busca</Text>}
            </View>
          ) : (
            filtered.map((item, i) => (
              <FerramentaRow key={item.codigo} item={item} index={i} onPress={openModal} />
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AuthorizationModal
        visible={modalVisible}
        ferramenta={selectedFerr}
        onClose={closeModal}
        onAuthorized={handleAuthorized}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.offWhite },

  headerBg: { backgroundColor: C.orange },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: '500' },
  badge: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  badgeNum: { fontSize: 22, fontWeight: '800', color: C.white, lineHeight: 26 },
  badgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.white, borderRadius: 14, paddingHorizontal: 14, height: 46, marginHorizontal: 20, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, color: C.black, paddingVertical: 0 },

  body: { flex: 1 },
  bodyContent: { paddingTop: 20, paddingHorizontal: 20 },
  section: { marginBottom: 12 },

  centerState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  stateText: { fontSize: 14, color: C.gray500 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: C.gray600 },
  emptyEmoji: { fontSize: 36 },
});