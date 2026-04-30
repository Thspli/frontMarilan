/**
 * app/login.tsx — Marilan · Flat Design 2.0
 * Clean, geometric, logo-ready header
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
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
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { apiClient } from '../services/api';

const { width: SW } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  orange: '#F05A00',
  orangeLight: '#FF7A30',
  orangePale: 'rgba(240,90,0,0.08)',
  white: '#FFFFFF',
  offWhite: '#F9F7F5',
  gray100: '#F0EDE9',
  gray200: '#DDD8D2',
  gray400: '#A09890',
  gray600: '#6A6058',
  black: '#1C1714',
  error: '#D93B2B',
  errorPale: 'rgba(217,59,43,0.07)',
};

// ─── Geometric Background Dots ─────────────────────────────────────────────────
// A grid of circles — pure flat, no gradients
function DotGrid() {
  const cols = 7;
  const rows = 5;
  const gap = SW / (cols + 1);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const size = (r + c) % 3 === 0 ? 8 : (r + c) % 3 === 1 ? 5 : 3;
          const opacity = (r + c) % 3 === 0 ? 0.18 : (r + c) % 3 === 1 ? 0.10 : 0.06;
          return (
            <View
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: C.white,
                opacity,
                left: gap * (c + 1) - size / 2,
                top: 28 + gap * 0.8 * (r + 1) - size / 2,
              }}
            />
          );
        })
      )}
      {/* Accent larger circles */}
      <View style={{ position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', right: 28, top: 24 }} />
      <View style={{ position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', right: 66, top: 60 }} />
      <View style={{ position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.10)', left: 24, top: 40 }} />
      <View style={{ position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', left: 52, top: 70 }} />
    </View>
  );
}

// ─── Eye Icon ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      {open ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={C.gray400} strokeWidth={1.8} strokeLinecap="round" />
          <Circle cx={12} cy={12} r={3} stroke={C.gray400} strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke={C.gray400} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke={C.gray400} strokeWidth={1.8} strokeLinecap="round" />
          <Path d="M1 1l22 22" stroke={C.gray400} strokeWidth={1.8} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────
function Field({
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
  const focusAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.gray200, C.orange],
  });

  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <Animated.View style={[fi.box, { borderColor }]}>
        {icon && <View style={fi.iconLeft}>{icon}</View>}
        <TextInput
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secure && !showPass}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          editable={editable}
          placeholderTextColor={C.gray400}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={fi.eye} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <EyeIcon open={showPass} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: { gap: 7 },
  label: { fontSize: 11, fontWeight: '700', color: C.gray600, letterSpacing: 0.8, textTransform: 'uppercase' },
  box: {
    flexDirection: 'row', alignItems: 'center',
    height: 54, borderRadius: 12, borderWidth: 1.5,
    backgroundColor: C.white, paddingHorizontal: 14, gap: 10,
  },
  iconLeft: { opacity: 0.45 },
  input: { flex: 1, fontSize: 15, color: C.black, fontWeight: '500' },
  eye: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke="rgba(255,255,255,0.3)" strokeWidth={2.5} />
        <Path d="M12 3a9 9 0 0 1 9 9" stroke={C.white} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
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

  // Entrance anims
  const headerAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(-20)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(logoAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardAnim, { toValue: 0, tension: 70, friction: 13, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    apiClient.initialize().then(() => {
      if (apiClient.isAuthenticated()) router.replace('/(tabs)/ferramentas');
    });
  }, []);

  const shake = () => {
    shakeAnim.setValue(0);
    Animated.sequence(
      [1, -1, 1, -1, 0.5, 0].map(v =>
        Animated.timing(shakeAnim, { toValue: v * 9, duration: 58, useNativeDriver: true })
      )
    ).start();
  };

  const handleLogin = async () => {
    if (!cracha.trim()) { setError('Informe o número do crachá'); shake(); return; }
    if (!password.trim()) { setError('Informe a senha'); shake(); return; }

    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      setError('');
      setLoading(true);
      await apiClient.login(cracha.trim(), password);
      setTimeout(() => router.replace('/(tabs)/ferramentas'), 280);
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Tente novamente.');
      setPassword('');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* ── Orange Header Zone ─────────────────────────────────────────── */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <DotGrid />

          {/* Logo slot — centered, prominent */}
          <Animated.View style={[s.logoArea, {
            opacity: logoOpacity,
            transform: [{ translateY: logoAnim }],
          }]}>

            <Image
              source={require('../assets/images/marilan-branco1.png')}
              style={s.logoImage}
              resizeMode="contain"
            />

            <Text style={s.tagline}>Gestão de Ferramentas</Text>
          </Animated.View>

          {/* Bottom notch row */}
          <View style={s.headerBottom}>
            <View style={s.pill}>
              <View style={s.pillDot} />
              <Text style={s.pillText}>Acesso corporativo</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* ── White Card ────────────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <Animated.View style={[s.card, {
          opacity: cardOpacity,
          transform: [{ translateY: cardAnim }, { translateX: shakeAnim }],
        }]}>
          <View style={s.cardHandle} />

          <Text style={s.cardTitle}>Entrar</Text>
          <Text style={s.cardSub}>Identifique-se para acessar o sistema</Text>

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Circle cx={12} cy={12} r={9} stroke={C.error} strokeWidth={2} />
                <Path d="M12 8v4M12 16h.01" stroke={C.error} strokeWidth={2} strokeLinecap="round" />
              </Svg>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Fields */}
          <View style={s.form}>
            <Field
              label="Nº do Crachá"
              value={cracha}
              onChangeText={v => { setCracha(v); setError(''); }}
              keyboardType="numeric"
              editable={!loading}
              icon={
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Rect x={2} y={5} width={20} height={14} rx={2} stroke={C.orange} strokeWidth={1.8} />
                  <Circle cx={9} cy={12} r={2.5} stroke={C.orange} strokeWidth={1.7} />
                  <Path d="M14 10h4M14 14h3" stroke={C.orange} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
              }
            />
            <Field
              label="Senha"
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
              secure
              editable={!loading}
              icon={
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Rect x={3} y={11} width={18} height={11} rx={2} stroke={C.orange} strokeWidth={1.8} />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={C.orange} strokeWidth={1.8} strokeLinecap="round" />
                  <Circle cx={12} cy={16} r={1.5} fill={C.orange} />
                </Svg>
              }
            />
          </View>

          {/* CTA */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 28 }}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnLoading]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <Spinner />
              ) : (
                <>
                  <Text style={s.btnText}>Entrar no Sistema</Text>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12h14M12 5l7 7-7 7" stroke={C.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={s.footer}>
            <View style={s.footerLine} />
            <Text style={s.footerText}>Marilan · Sistema Restrito · 2026</Text>
            <View style={s.footerLine} />
          </View>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },

  // Header
  header: {
    height: 310,
    backgroundColor: C.orange,
    overflow: 'hidden',
  },

  // Logo zone — all the space above the card
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 10,
  },

  // ─── PARA USAR A LOGO REAL, descomente e ajuste o tamanho: ───────────────
   logoImage: {
   width: 220,
  height: 72,
   },
  // ──────────────────────────────────────────────────────────────────────────

  // Placeholder (remova quando tiver a logo)
  logoPlaceholder: {
    width: 220,
    height: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoPlaceholderText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  logoPlaceholderSub: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },

  tagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  headerBottom: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5CFF9A',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.3,
  },

  // Card
  card: {
    flexGrow: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 26,
    paddingBottom: 40,
    // subtle flat shadow via border
    borderTopWidth: 1,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: C.gray200,
  },
  cardHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.gray200,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 26,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.black,
    letterSpacing: -0.6,
  },
  cardSub: {
    fontSize: 13,
    color: C.gray400,
    marginTop: 5,
    marginBottom: 24,
    fontWeight: '400',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.errorPale,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 18,
    borderLeftWidth: 3,
    borderLeftColor: C.error,
  },
  errorText: {
    fontSize: 13,
    color: C.error,
    fontWeight: '600',
    flex: 1,
  },

  // Form
  form: { gap: 16 },

  // Button
  btn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: C.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnLoading: { backgroundColor: C.orangeLight },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 32,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.gray200,
  },
  footerText: {
    fontSize: 10,
    color: C.gray400,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
});