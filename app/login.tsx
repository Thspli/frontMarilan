/**
 * app/login.tsx — Marilan v2 Premium
 * Design: Industrial Precision · Laranja Marilan + Branco
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { apiClient } from '../services/api';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Design System ────────────────────────────────────────────────────────────
const D = {
  orange: '#F05A00',
  orange2: '#FF7A2F',
  orange3: '#FF9A5C',
  orangeGlow: 'rgba(240,90,0,0.18)',
  orangeDark: '#B84400',
  white: '#FFFFFF',
  offWhite: '#FDF8F5',
  paper: '#FFF4EE',
  gray100: '#F2F0EE',
  gray200: '#E6E2DE',
  gray300: '#C8C2BB',
  gray500: '#7A736A',
  gray700: '#3A332B',
  black: '#1A1510',
  error: '#D93B2B',
  errorBg: 'rgba(217,59,43,0.08)',
};

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const EyeIcon = ({ open, color = D.orange }: { open: boolean; color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    {open ? (
      <>
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      </>
    ) : (
      <>
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M1 1l22 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      </>
    )}
  </Svg>
);

const ShieldIcon = ({ size = 32 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9 12l2 2 4-4" stroke="rgba(255,255,255,0.9)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Animated Input ────────────────────────────────────────────────────────────
function PremiumInput({
  label,
  value,
  onChangeText,
  secure = false,
  keyboardType = 'default',
  editable = true,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  keyboardType?: any;
  editable?: boolean;
  icon?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const animate = (to: number) => {
    Animated.parallel([
      Animated.spring(floatAnim, { toValue: (value || to) ? 1 : 0, useNativeDriver: false, tension: 200, friction: 18 }),
      Animated.timing(borderAnim, { toValue: to, duration: 200, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: to, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  useEffect(() => {
    if (value) Animated.timing(floatAnim, { toValue: 1, duration: 1, useNativeDriver: false }).start();
  }, []);

  const labelY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [19, 6] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15.5, 10.5] });
  const labelColor = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [D.gray300, focused ? D.orange : D.gray500] });
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [D.gray200, D.orange] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View>
      <Animated.View style={[inp.glow, { opacity: glowOpacity }]} />
      <Animated.View style={[inp.wrap, { borderColor }]}>
        {icon && <View style={inp.iconLeft}>{icon}</View>}
        <View style={inp.inner}>
          <Animated.Text style={[inp.label, ({ top: labelY, fontSize: labelSize, color: labelColor } as any), icon ? { left: 0 } : undefined]}> 
            {label}
          </Animated.Text>
            <TextInput
            style={[inp.field, icon ? { paddingLeft: 0 } : undefined]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => { setFocused(true); animate(1); }}
            onBlur={() => { setFocused(false); animate(0); }}
            secureTextEntry={secure && !showPass}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
            editable={editable}
            placeholderTextColor="transparent"
          />
        </View>
        {secure && (
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={inp.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <EyeIcon open={showPass} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inp = StyleSheet.create({
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    backgroundColor: D.orangeGlow,
    zIndex: -1,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 62,
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: D.white,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  iconLeft: { marginRight: 12, opacity: 0.5 },
  inner: { flex: 1, position: 'relative' },
  label: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  field: {
    fontSize: 16,
    color: D.black,
    fontWeight: '500',
    paddingTop: 22,
    paddingBottom: 6,
    letterSpacing: 0.3,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ─── Loading Dots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 120),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: D.white, marginRight: 2 }}>Autenticando</Text>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{
          width: 5, height: 5, borderRadius: 2.5, backgroundColor: D.white,
          opacity: d,
          transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
        }} />
      ))}
    </View>
  );
}

// ─── Decorative Background Shapes ────────────────────────────────────────────
function BgShapes({ anim }: { anim: Animated.Value }) {
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }, { scale }] }]} pointerEvents="none">
      {/* Large circle top-right */}
      <View style={{
        position: 'absolute',
        width: SW * 0.8,
        height: SW * 0.8,
        borderRadius: SW * 0.4,
        backgroundColor: D.orange2,
        opacity: 0.18,
        top: -SW * 0.35,
        right: -SW * 0.22,
      }} />
      {/* Medium circle top-left */}
      <View style={{
        position: 'absolute',
        width: SW * 0.55,
        height: SW * 0.55,
        borderRadius: SW * 0.275,
        backgroundColor: D.orangeDark,
        opacity: 0.14,
        top: -SW * 0.1,
        left: -SW * 0.2,
      }} />
      {/* Small accent dot */}
      <View style={{
        position: 'absolute',
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: D.white,
        opacity: 0.25,
        top: SH * 0.28,
        right: 32,
      }} />
      <View style={{
        position: 'absolute',
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: D.white,
        opacity: 0.2,
        top: SH * 0.22,
        left: 48,
      }} />
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const [cracha, setCracha] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Entrance animations
  const bgAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(20)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(formAnim, { toValue: 0, tension: 80, friction: 13, useNativeDriver: true }),
        Animated.timing(formOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnAnim, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]),
    ]).start();

    // Check auth
    apiClient.initialize().then(() => {
      if (apiClient.isAuthenticated()) router.replace('/(tabs)/ferramentas');
    });
  }, []);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      ...([1, -1, 1, -1, 1, 0].map(v =>
        Animated.timing(shakeAnim, { toValue: v * 8, duration: 60, useNativeDriver: true })
      ))
    ]).start();
  };

  const handleLogin = async () => {
    if (!cracha.trim()) { setError('Informe o número do crachá'); shake(); return; }
    if (!password.trim()) { setError('Informe a senha'); shake(); return; }

    // Button press animation
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.965, duration: 80, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      setError('');
      setLoading(true);
      await apiClient.login(cracha.trim(), password);
      setTimeout(() => router.replace('/(tabs)/ferramentas'), 300);
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Tente novamente.');
      setPassword('');
      shake();
    } finally {
      setLoading(false);
    }
  };

  const headerScale = bgAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      {/* Header Orange Zone */}
      <SafeAreaView style={s.headerZone} edges={['top']}>
        <BgShapes anim={bgAnim} />
        <Animated.View style={[s.headerContent, { opacity: bgAnim, transform: [{ scale: headerScale }] }]}>
          {/* Logo */}
          <View style={s.logoRow}>
            <View style={s.logoMark}>
              <Svg width={38} height={38} viewBox="0 0 38 38">
                <Defs>
                  <LinearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
                    <Stop offset="1" stopColor="#FFE0CC" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect x={1} y={1} width={36} height={36} rx={10} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                <Path d="M10 27V13l9-5 9 5v14" stroke="url(#lg)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M19 27V19" stroke="url(#lg)" strokeWidth={2} strokeLinecap="round" />
                <Path d="M14 22h10" stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </View>
            <View>
              <Text style={s.logoName}>MARILAN</Text>
              <Text style={s.logoSub}>Gestão de Ferramentas</Text>
            </View>
          </View>

          {/* Shield */}
          <View style={s.shieldRow}>
            <ShieldIcon size={30} />
            <Text style={s.shieldText}>Acesso Seguro · SSL</Text>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Card */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.cardZone}>
        <Animated.View style={[s.card, {
          transform: [{ translateY: cardAnim }, { translateX: shakeAnim }],
          opacity: cardOpacity,
        }]}>
          {/* Card notch indicator */}
          <View style={s.cardHandle} />

          <Text style={s.cardTitle}>Bem-vindo</Text>
          <Text style={s.cardSub}>Identificação obrigatória para acesso</Text>

          {/* Error */}
          {!!error && (
            <Animated.View style={s.errorBox}>
              <View style={s.errorDot} />
              <Text style={s.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Form */}
          <Animated.View style={[s.form, {
            transform: [{ translateY: formAnim }],
            opacity: formOpacity,
          }]}>
            <PremiumInput
              label="Número do Crachá"
              value={cracha}
              onChangeText={v => { setCracha(v); setError(''); }}
              keyboardType="numeric"
              editable={!loading}
              icon={
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect x={2} y={5} width={20} height={14} rx={2} stroke={D.orange} strokeWidth={1.8} />
                  <Circle cx={9} cy={12} r={2.5} stroke={D.orange} strokeWidth={1.6} />
                  <Path d="M14 10h4M14 14h3" stroke={D.orange} strokeWidth={1.6} strokeLinecap="round" />
                </Svg>
              }
            />
            <PremiumInput
              label="Senha"
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
              secure
              editable={!loading}
              icon={
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect x={3} y={11} width={18} height={11} rx={2} stroke={D.orange} strokeWidth={1.8} />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={D.orange} strokeWidth={1.8} strokeLinecap="round" />
                  <Circle cx={12} cy={16} r={1.5} fill={D.orange} />
                </Svg>
              }
            />
            <TouchableOpacity style={s.forgotRow} disabled={loading} activeOpacity={0.65}>
              <Text style={s.forgotText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Login Button */}
          <Animated.View style={[s.btnWrap, {
            transform: [{ translateY: btnAnim }, { scale: btnScale }],
            opacity: btnOpacity,
          }]}>
            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnActive]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              {/* Gradient shimmer overlay */}
              <View style={s.btnShimmer} />
              {loading
                ? <LoadingDots />
                : (
                  <>
                    <Text style={s.loginBtnText}>Entrar no Sistema</Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path d="M5 12h14M12 5l7 7-7 7" stroke={D.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          {/* Footer note */}
          <View style={s.footerNote}>
            <View style={s.footerDot} />
            <Text style={s.footerText}>Sistema restrito · Marilan © 2026</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },

  headerZone: {
    backgroundColor: D.orange,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 18,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoMark: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoName: {
    fontSize: 26,
    fontWeight: '900',
    color: D.white,
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  shieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  shieldText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  cardZone: { flex: 1 },
  card: {
    flex: 1,
    backgroundColor: D.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 40,
    shadowColor: '#1A1510',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  cardHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: D.gray200,
    alignSelf: 'center',
    marginBottom: 28,
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: D.black,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontSize: 14,
    color: D.gray500,
    marginTop: 4,
    marginBottom: 24,
    fontWeight: '400',
    letterSpacing: 0.1,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: D.errorBg,
    borderLeftWidth: 3,
    borderLeftColor: D.error,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  errorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: D.error,
  },
  errorText: {
    fontSize: 13,
    color: D.error,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.1,
  },

  form: { gap: 14 },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    marginTop: -2,
  },
  forgotText: {
    fontSize: 13,
    color: D.orange,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  btnWrap: { marginTop: 28 },
  loginBtn: {
    height: 60,
    borderRadius: 18,
    backgroundColor: D.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
    shadowColor: D.orangeDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginBtnActive: { backgroundColor: D.orangeDark },
  btnShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  loginBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: D.white,
    letterSpacing: 0.3,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: D.gray300,
  },
  footerText: {
    fontSize: 11,
    color: D.gray300,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});