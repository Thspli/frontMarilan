/**
 * app/(tabs)/almoxarifado.tsx — Marilan v2 Premium
 * Design: Industrial Precision · Laranja Marilan + Branco
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { apiClient } from '../../services/api';
import { nfcService } from '../../services/nfc';

// ─── Design System ─────────────────────────────────────────────────────────────
const D = {
  orange: '#F05A00',
  orange2: '#FF7A2F',
  orangeGlow: 'rgba(240,90,0,0.1)',
  orangeDim: 'rgba(240,90,0,0.07)',
  orangeDark: '#B84400',
  white: '#FFFFFF',
  offWhite: '#FAFAF9',
  gray50: '#F5F3F0',
  gray100: '#EEE9E4',
  gray200: '#DDD6CF',
  gray300: '#C0B8AE',
  gray400: '#A09690',
  gray500: '#706860',
  gray700: '#3A332B',
  black: '#1A1510',
  green: '#1A9960',
  greenBg: 'rgba(26,153,96,0.07)',
  greenText: '#116640',
  red: '#D93B2B',
};

interface Ferramenta { codigo: string; nome: string; categoria: string; status: string; }
interface CartItem extends Ferramenta { qty: number; }
type NfcPhase = 'idle' | 'reading' | 'done';

// ─── Icons ────────────────────────────────────────────────────────────────────
const WrenchIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = ({ color = D.gray400, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const XIcon = ({ size = 13, color = D.gray400 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const PlusIcon = ({ color = D.white, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const MinusIcon = ({ color = D.orange, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const NFCIcon = ({ size = 36, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={2} width={20} height={20} rx={3} stroke={color} strokeWidth={1.5} />
    <Path d="M8 8.5C9.2 7.3 10.8 6.5 12.6 6.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M6 6.5C7.8 4.7 10.1 3.5 12.6 3.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.3} />
    <Circle cx={9.5} cy={14} r={2.5} stroke={color} strokeWidth={1.8} />
    <Path d="M12 14h6v6l-2-1.5L14 20V14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ size = 28, color = D.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CartIcon = ({ size = 20, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={3} y1={6} x2={21} y2={6} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── NFC Pulse ──────────────────────────────────────────────────────────────────
function NFCPulseAnim({ active }: { active: boolean }) {
  const rings = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  const ref = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      ref.current = Animated.parallel(
        rings.map((r, i) =>
          Animated.loop(Animated.sequence([
            Animated.delay(i * 380),
            Animated.timing(r, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]))
        )
      );
      ref.current.start();
    } else {
      ref.current?.stop();
      rings.forEach(r => r.setValue(0));
    }
    return () => { ref.current?.stop(); };
  }, [active]);

  return (
    <View style={na.wrap}>
      {rings.map((r, i) => (
        <Animated.View key={i} style={[na.ring, {
          transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.3] }) }],
          opacity: r.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.25, 0] }),
        }]} />
      ))}
      <View style={na.core}>
        <NFCIcon size={34} color={D.orange} />
      </View>
    </View>
  );
}
const na = StyleSheet.create({
  wrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 94, height: 94, borderRadius: 47, borderWidth: 1.5, borderColor: D.orange },
  core: { width: 78, height: 78, borderRadius: 39, backgroundColor: D.orangeDim, borderWidth: 2, borderColor: `${D.orange}22`, alignItems: 'center', justifyContent: 'center' },
});

// ─── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const y = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(y, { toValue: 0, tension: 140, friction: 12, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 140, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: 16, duration: 240, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[tos.wrap, { opacity: op, transform: [{ translateY: y }, { scale: sc }] }]} pointerEvents="none">
      <View style={tos.pill}>
        <View style={tos.iconBox}><CheckIcon size={13} color={D.white} /></View>
        <Text style={tos.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const tos = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, left: 20, right: 20, zIndex: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.black, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 10 },
  iconBox: { width: 26, height: 26, borderRadius: 13, backgroundColor: D.green, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: D.white, flex: 1 },
});

// ─── NFC Authorization Modal ────────────────────────────────────────────────────
interface AuthModalProps {
  visible: boolean;
  ferramenta: Ferramenta | null;
  onClose: () => void;
  onAuthorized: (f: Ferramenta, cracha: string) => void;
}

function AuthModal({ visible, ferramenta, onClose, onAuthorized }: AuthModalProps) {
  const [phase, setPhase] = useState<NfcPhase>('idle');
  const [cracha, setCracha] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [tagRead, setTagRead] = useState('');

  const slideY = useRef(new Animated.Value(500)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const successSc = useRef(new Animated.Value(0)).current;
  const manualH = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setPhase('idle'); setCracha(''); setShowManual(false); setTagRead('');
      manualH.setValue(0); successSc.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 72, friction: 13, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => startNFC());
    } else {
      slideY.setValue(500); bgOp.setValue(0);
    }
  }, [visible]);

  const startNFC = async () => {
    setPhase('reading');
    try {
      const r = await nfcService.readTag();
      if (r.success && r.data) {
        setTagRead(r.data); setPhase('done');
        Animated.spring(successSc, { toValue: 1, tension: 150, friction: 9, useNativeDriver: true }).start();
      } else setPhase('idle');
    } catch { setPhase('idle'); }
  };

  const dismiss = () => {
    nfcService.stop();
    Animated.parallel([
      Animated.timing(slideY, { toValue: 500, duration: 260, useNativeDriver: true }),
      Animated.timing(bgOp, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const toggleManual = () => {
    const next = !showManual; setShowManual(next);
    Animated.spring(manualH, { toValue: next ? 1 : 0, useNativeDriver: false, tension: 100, friction: 12 }).start();
    if (!next) { setCracha(''); Keyboard.dismiss(); }
  };

  const confirmManual = () => {
    if (!cracha.trim()) return;
    Keyboard.dismiss();
    setTagRead(cracha.trim()); setPhase('done');
    Animated.spring(successSc, { toValue: 1, tension: 150, friction: 9, useNativeDriver: true }).start();
  };

  const confirmRetirada = () => {
    if (!ferramenta) return;
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 65, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    dismiss();
    setTimeout(() => onAuthorized(ferramenta, tagRead), 320);
  };

  const manualHeight = manualH.interpolate({ inputRange: [0, 1], outputRange: [0, 94] });
  const manualOp = manualH.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  if (!ferramenta) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[am.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} />
      </Animated.View>

      <Animated.View style={[am.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={am.handle} />

        {/* Tool info */}
        <View style={am.toolRow}>
          <View style={am.toolIcon}><WrenchIcon size={20} color={D.orange} /></View>
          <View style={{ flex: 1 }}>
            <Text style={am.toolName} numberOfLines={1}>{ferramenta.nome}</Text>
            <Text style={am.toolMeta}>{ferramenta.categoria} · {ferramenta.codigo}</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={am.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <XIcon size={13} />
          </TouchableOpacity>
        </View>
        <View style={am.sep} />

        {/* Idle / Reading */}
        {phase !== 'done' && (
          <View style={am.body}>
            <NFCPulseAnim active={phase === 'reading'} />
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={am.title}>
                {phase === 'reading' ? 'Aguardando crachá NFC…' : 'Autorização necessária'}
              </Text>
              <Text style={am.sub}>Almoxarife deve aproximar o crachá{'\n'}para autorizar a retirada</Text>
            </View>

            {phase === 'idle' && (
              <TouchableOpacity style={am.primaryBtn} onPress={startNFC} activeOpacity={0.87}>
                <NFCIcon size={18} color={D.white} />
                <Text style={am.primaryBtnText}>Iniciar leitura NFC</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={am.linkBtn} onPress={toggleManual} activeOpacity={0.7}>
              <Text style={am.linkText}>{showManual ? '← Cancelar entrada manual' : 'Inserir crachá manualmente'}</Text>
            </TouchableOpacity>

            <Animated.View style={{ height: manualHeight, opacity: manualOp, width: '100%', overflow: 'hidden' }}>
              <View style={am.manualRow}>
                <View style={am.manualInput}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Rect x={2} y={5} width={20} height={14} rx={2} stroke={D.orange} strokeWidth={1.8} />
                    <Circle cx={9} cy={12} r={2.5} stroke={D.orange} strokeWidth={1.6} />
                    <Path d="M14 10h4M14 14h3" stroke={D.orange} strokeWidth={1.5} strokeLinecap="round" />
                  </Svg>
                  <TextInput
                    style={am.manualField}
                    placeholder="Nº do crachá"
                    placeholderTextColor={D.gray300}
                    value={cracha}
                    onChangeText={setCracha}
                    keyboardType="numeric"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={confirmManual}
                  />
                </View>
                <TouchableOpacity
                  style={[am.manualOk, !cracha.trim() && am.manualOkDisabled]}
                  onPress={confirmManual}
                  disabled={!cracha.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={am.manualOkText}>OK</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}

        {/* Authorized */}
        {phase === 'done' && (
          <View style={am.body}>
            <Animated.View style={[am.successCircle, { transform: [{ scale: successSc }] }]}>
              <CheckIcon size={36} color={D.green} />
            </Animated.View>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={[am.title, { color: D.green }]}>Autorizado!</Text>
              <Text style={am.sub}>
                Crachá <Text style={{ fontWeight: '800', color: D.black }}>{tagRead}</Text> verificado.{'\n'}
                Confirme para registrar a retirada.
              </Text>
            </View>
            <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
              <TouchableOpacity style={am.primaryBtn} onPress={confirmRetirada} activeOpacity={0.87}>
                <CheckIcon size={18} color={D.white} />
                <Text style={am.primaryBtnText}>Confirmar Retirada</Text>
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity onPress={dismiss} style={am.cancelBtn}>
              <Text style={am.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}
const am = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,21,16,0.52)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.white, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingVertical: 14 },
  toolIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 15, fontWeight: '800', color: D.black },
  toolMeta: { fontSize: 12, color: D.gray500, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: D.gray100, alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: D.gray100 },
  body: { paddingHorizontal: 24, paddingTop: 26, alignItems: 'center', gap: 16, minHeight: 320 },
  title: { fontSize: 21, fontWeight: '900', color: D.black, letterSpacing: -0.3, textAlign: 'center' },
  sub: { fontSize: 14, color: D.gray500, textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    width: '100%', height: 58, borderRadius: 16, backgroundColor: D.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  linkBtn: { paddingVertical: 6 },
  linkText: { fontSize: 13, color: D.orange, fontWeight: '600' },
  manualRow: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  manualInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, backgroundColor: D.gray50, borderRadius: 13, borderWidth: 1.5, borderColor: D.gray200, paddingHorizontal: 14 },
  manualField: { flex: 1, fontSize: 15, color: D.black, fontWeight: '500' },
  manualOk: { width: 60, height: 52, borderRadius: 13, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
  manualOkDisabled: { backgroundColor: D.gray200 },
  manualOkText: { fontSize: 15, fontWeight: '800', color: D.white },
  successCircle: { width: 86, height: 86, borderRadius: 43, backgroundColor: D.greenBg, borderWidth: 2, borderColor: `${D.green}35`, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 13, color: D.gray400, fontWeight: '500' },
});

// ─── Cart Item ─────────────────────────────────────────────────────────────────
function CartCard({ item, onRemove, onQtyChange, index }: {
  item: CartItem;
  onRemove: (c: string) => void;
  onQtyChange: (c: string, d: number) => void;
  index: number;
}) {
  const oy = useRef(new Animated.Value(-10)).current;
  const op = useRef(new Animated.Value(0)).current;
  const qtyScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(oy, { toValue: 0, tension: 120, friction: 13, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateQty = () => {
    Animated.sequence([
      Animated.timing(qtyScale, { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.spring(qtyScale, { toValue: 1, tension: 260, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const changeQty = (d: number) => {
    animateQty();
    onQtyChange(item.codigo, d);
  };

  return (
    <Animated.View style={[cc.wrap, { opacity: op, transform: [{ translateY: oy }] }]}>
      <View style={cc.card}>
        <View style={cc.left}>
          <View style={cc.iconBox}><WrenchIcon size={16} color={D.orange} /></View>
          <View style={{ flex: 1 }}>
            <Text style={cc.name} numberOfLines={1}>{item.nome}</Text>
            <Text style={cc.meta}>{item.codigo} · {item.categoria}</Text>
          </View>
        </View>
        <View style={cc.right}>
          <TouchableOpacity style={cc.qtyBtn} onPress={() => changeQty(-1)} activeOpacity={0.7}>
            <MinusIcon size={13} color={D.orange} />
          </TouchableOpacity>
          <Animated.Text style={[cc.qty, { transform: [{ scale: qtyScale }] }]}>{item.qty}</Animated.Text>
          <TouchableOpacity style={[cc.qtyBtn, cc.qtyBtnPlus]} onPress={() => changeQty(1)} activeOpacity={0.7}>
            <PlusIcon size={13} color={D.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(item.codigo)} style={cc.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <XIcon size={12} color={D.gray400} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
const cc = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: {
    backgroundColor: D.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: D.gray200,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12, gap: 10,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 9, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: D.black },
  meta: { fontSize: 11, color: D.gray500, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: D.orange + '60', alignItems: 'center', justifyContent: 'center' },
  qtyBtnPlus: { backgroundColor: D.orange, borderColor: D.orange },
  qty: { fontSize: 15, fontWeight: '800', color: D.black, minWidth: 20, textAlign: 'center' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: D.gray100, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});

// ─── Tool Row (available) ──────────────────────────────────────────────────────
function AvailableRow({ item, index, onPress }: { item: Ferramenta; index: number; onPress: (f: Ferramenta) => void }) {
  const oy = useRef(new Animated.Value(10)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, delay: index * 30, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, tension: 120, friction: 14, delay: index * 30, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(sc, { toValue: 0.975, duration: 60, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, tension: 260, friction: 10, useNativeDriver: true }),
    ]).start();
    onPress(item);
  };

  return (
    <Animated.View style={[ar.wrap, { opacity: op, transform: [{ translateY: oy }, { scale: sc }] }]}>
      <TouchableOpacity style={ar.card} onPress={press} activeOpacity={1}>
        <View style={ar.iconBox}><WrenchIcon size={16} color={D.orange} /></View>
        <View style={{ flex: 1 }}>
          <Text style={ar.name} numberOfLines={1}>{item.nome}</Text>
          <Text style={ar.meta}>{item.categoria}</Text>
        </View>
        <View style={ar.right}>
          <Text style={ar.code}>{item.codigo}</Text>
          <View style={ar.freeBadge}>
            <View style={ar.freeDot} />
            <Text style={ar.freeText}>Livre</Text>
          </View>
        </View>
        <View style={ar.addBtn}>
          <PlusIcon size={13} color={D.white} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const ar = StyleSheet.create({
  wrap: { marginBottom: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.white, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 13,
    borderWidth: 1, borderColor: D.gray200,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700', color: D.black },
  meta: { fontSize: 11, color: D.gray500, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  code: { fontSize: 10, color: D.gray400, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  freeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: D.greenBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  freeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: D.green },
  freeText: { fontSize: 10, fontWeight: '700', color: D.greenText },
  addBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
});

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, count, color = D.gray500 }: { label: string; count: number; color?: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.bar, { backgroundColor: color }]} />
      <Text style={sh.label}>{label}</Text>
      <View style={[sh.badge, { backgroundColor: `${color}18` }]}>
        <Text style={[sh.badgeNum, { color }]}>{count}</Text>
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11, marginTop: 4 },
  bar: { width: 3.5, height: 15, borderRadius: 2 },
  label: { flex: 1, fontSize: 10, fontWeight: '800', color: D.gray500, letterSpacing: 1.2, textTransform: 'uppercase' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeNum: { fontSize: 11, fontWeight: '800' },
});

// ─── Cart FAB ──────────────────────────────────────────────────────────────────
function CartFAB({ count, onPress, anim }: { count: number; onPress: () => void; anim: Animated.Value }) {
  const sc = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  return (
    <Animated.View style={[fab.wrap, { transform: [{ scale: sc }, { translateY: ty }], opacity: anim }]}>
      <TouchableOpacity style={fab.btn} onPress={onPress} activeOpacity={0.87}>
        <CartIcon size={20} color={D.white} />
        <Text style={fab.label}>{count} {count === 1 ? 'item' : 'itens'} no carrinho</Text>
        <View style={fab.arrow}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12h14M12 5l7 7-7 7" stroke={D.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const fab = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 28, left: 20, right: 20, zIndex: 200 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.orange, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.38, shadowRadius: 18, elevation: 10,
  },
  label: { flex: 1, fontSize: 15, fontWeight: '800', color: D.white, letterSpacing: 0.1 },
  arrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

// ─── Cart Summary Modal ────────────────────────────────────────────────────────
function CartModal({ visible, cart, onClose, onConfirm, loading }: {
  visible: boolean; cart: CartItem[];
  onClose: () => void; onConfirm: (cracha: string) => void; loading: boolean;
}) {
  const [cracha, setCracha] = useState('');
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setCracha('');
      Animated.parallel([
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 13, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: 600, duration: 250, useNativeDriver: true }),
        Animated.timing(bgOp, { toValue: 0, duration: 210, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(bgOp, { toValue: 0, duration: 210, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const totalQty = cart.reduce((a, c) => a + c.qty, 0);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[cm.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={close} />
      </Animated.View>
      <Animated.View style={[cm.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={cm.handle} />
        <View style={cm.header}>
          <View style={cm.headerLeft}>
            <CartIcon size={20} color={D.orange} />
            <Text style={cm.headerTitle}>Confirmar Retirada</Text>
          </View>
          <View style={cm.countBadge}>
            <Text style={cm.countText}>{totalQty} {totalQty === 1 ? 'item' : 'itens'}</Text>
          </View>
        </View>
        <View style={cm.sep} />

        <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 14 }} showsVerticalScrollIndicator={false}>
          {cart.map(item => (
            <View key={item.codigo} style={cm.itemRow}>
              <WrenchIcon size={14} color={D.orange} />
              <Text style={cm.itemName} numberOfLines={1}>{item.nome}</Text>
              <Text style={cm.itemQty}>×{item.qty}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={cm.sep} />
        <View style={cm.form}>
          <Text style={cm.formLabel}>Crachá do Colaborador</Text>
          <View style={cm.inputWrap}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Rect x={2} y={5} width={20} height={14} rx={2} stroke={D.orange} strokeWidth={1.8} />
              <Circle cx={9} cy={12} r={2.5} stroke={D.orange} strokeWidth={1.6} />
              <Path d="M14 10h4M14 14h3" stroke={D.orange} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <TextInput
              style={cm.input}
              placeholder="Número do crachá"
              placeholderTextColor={D.gray300}
              value={cracha}
              onChangeText={setCracha}
              keyboardType="numeric"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[cm.confirmBtn, (!cracha.trim() || loading) && cm.confirmBtnDisabled]}
            onPress={() => onConfirm(cracha.trim())}
            disabled={!cracha.trim() || loading}
            activeOpacity={0.87}
          >
            {loading
              ? <ActivityIndicator color={D.white} size="small" />
              : (
                <>
                  <Text style={[cm.confirmText, (!cracha.trim() || loading) && cm.confirmTextDisabled]}>
                    Registrar Retirada
                  </Text>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12h14M12 5l7 7-7 7" stroke={(!cracha.trim() || loading) ? D.gray400 : D.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </>
              )
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}
const cm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,21,16,0.52)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.white, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20,
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: D.black },
  countBadge: { backgroundColor: D.orangeDim, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  countText: { fontSize: 12, fontWeight: '700', color: D.orange },
  sep: { height: 1, backgroundColor: D.gray100 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: D.gray100 },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600', color: D.black },
  itemQty: { fontSize: 13, fontWeight: '800', color: D.orange },
  form: { paddingHorizontal: 22, paddingTop: 18, gap: 12 },
  formLabel: { fontSize: 12, fontWeight: '700', color: D.gray500, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: D.gray200,
    backgroundColor: D.gray50, paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, color: D.black, fontWeight: '500' },
  confirmBtn: {
    height: 58, borderRadius: 16, backgroundColor: D.orange,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  confirmBtnDisabled: { backgroundColor: D.gray200, shadowOpacity: 0 },
  confirmText: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  confirmTextDisabled: { color: D.gray400 },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selected, setSelected] = useState<Ferramenta | null>(null);
  const [authModal, setAuthModal] = useState(false);
  const [cartModal, setCartModal] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '' });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    load();
  }, []);

  useEffect(() => {
    Animated.spring(fabAnim, { toValue: cart.length > 0 ? 1 : 0, tension: 120, friction: 12, useNativeDriver: true }).start();
  }, [cart.length]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await apiClient.listarFerramentas();
      setFerramentas((data || []).filter((f: Ferramenta) => f.status === 'Disponível'));
    } catch { setFerramentas([]); }
    finally { setLoading(false); }
  };

  const addToCart = useCallback((f: Ferramenta, cracha: string) => {
    setCart(prev => {
      const ex = prev.find(c => c.codigo === f.codigo);
      if (ex) return prev.map(c => c.codigo === f.codigo ? { ...c, qty: c.qty + 1 } : c);
      return [{ ...f, qty: 1 }, ...prev];
    });
    showToast(`${f.nome} adicionada!`);
  }, []);

  const removeFromCart = (codigo: string) => setCart(prev => prev.filter(c => c.codigo !== codigo));
  const changeQty = (codigo: string, d: number) =>
    setCart(prev => prev.map(c => c.codigo === codigo ? { ...c, qty: Math.max(1, c.qty + d) } : c));

  const submitRetirada = async (crachColaborador: string) => {
    try {
      setSubmitLoading(true);
      await apiClient.retirar({
        cracha_colaborador: crachColaborador,
        ferramentas: cart.map(f => ({ codigo: f.codigo, qtd: f.qty, checklist: 'REALIZADO', observacao: 'Retirada via app' })),
      });
      setCart([]);
      setCartModal(false);
      showToast('Retirada registrada com sucesso!');
      await load();
    } catch (e: any) {
      showToast('Erro: ' + (e.message || 'Falha ao registrar'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: '' }), 3200);
  };

  const filtered = ferramentas.filter(f => {
    if (!query) return true;
    const q = query.toLowerCase();
    return f.nome.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q) || f.categoria.toLowerCase().includes(q);
  });

  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      {/* Header */}
      <SafeAreaView style={s.headerZone} edges={['top']}>
        {/* Dot grid decoration */}
        <View style={s.dots} pointerEvents="none">
          {Array.from({ length: 12 }).map((_, i) => <View key={i} style={s.dot} />)}
        </View>

        <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTY }] }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.title}>Almoxarifado</Text>
              <Text style={s.sub}>{ferramentas.length} ferramentas disponíveis</Text>
            </View>
            {cart.length > 0 && (
              <TouchableOpacity style={s.cartBadge} onPress={() => setCartModal(true)} activeOpacity={0.8}>
                <CartIcon size={16} color={D.white} />
                <Text style={s.cartBadgeNum}>{cart.reduce((a, c) => a + c.qty, 0)}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <SearchIcon size={15} color={query ? D.orange : D.gray400} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar ferramentas…"
              placeholderTextColor={D.gray300}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <XIcon size={12} color={D.gray400} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Body */}
      <ScrollView style={s.body} contentContainerStyle={[s.bodyContent, { paddingBottom: cart.length > 0 ? 120 : 40 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Cart */}
        {cart.length > 0 && (
          <View style={s.section}>
            <SectionHeader label="Carrinho" count={cart.reduce((a, c) => a + c.qty, 0)} color={D.orange} />
            {cart.map((item, i) => (
              <CartCard key={item.codigo} item={item} index={i} onRemove={removeFromCart} onQtyChange={changeQty} />
            ))}
          </View>
        )}

        {/* Available */}
        <View style={s.section}>
          <SectionHeader label="Disponíveis" count={filtered.length} color={D.green} />
          {loading ? (
            <View style={s.loadState}>
              <ActivityIndicator color={D.orange} />
              <Text style={s.loadText}>Carregando…</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🔧</Text>
              <Text style={s.emptyTitle}>{query ? 'Sem resultados' : 'Nenhuma ferramenta'}</Text>
              {!!query && <Text style={s.emptySub}>Tente outro termo</Text>}
            </View>
          ) : (
            filtered.map((item, i) => (
              <AvailableRow
                key={item.codigo}
                item={item}
                index={i}
                onPress={f => { setSelected(f); setAuthModal(true); }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <CartFAB count={cart.reduce((a, c) => a + c.qty, 0)} onPress={() => setCartModal(true)} anim={fabAnim} />

      <AuthModal
        visible={authModal}
        ferramenta={selected}
        onClose={() => { setAuthModal(false); setTimeout(() => setSelected(null), 400); }}
        onAuthorized={(f, cracha) => addToCart(f, cracha)}
      />

      <CartModal
        visible={cartModal}
        cart={cart}
        onClose={() => setCartModal(false)}
        onConfirm={submitRetirada}
        loading={submitLoading}
      />

      <Toast message={toast.msg} visible={toast.visible} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  dots: {
    position: 'absolute', right: 18, top: 18,
    flexDirection: 'row', flexWrap: 'wrap', width: 54, gap: 8, opacity: 0.2,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  header: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  cartBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  cartBadgeNum: { fontSize: 16, fontWeight: '900', color: D.white },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.white, borderRadius: 14,
    paddingHorizontal: 16, height: 48,
  },
  searchInput: { flex: 1, fontSize: 14, color: D.black, fontWeight: '500' },

  body: { flex: 1, backgroundColor: D.offWhite, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 10 },

  loadState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  loadText: { fontSize: 14, color: D.gray500 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: D.gray700 },
  emptySub: { fontSize: 13, color: D.gray400 },
});