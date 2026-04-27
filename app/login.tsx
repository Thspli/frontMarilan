import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

// ─── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  orange: '#F26419',
  orangeLight: '#FF8C42',
  orangeDark: '#C94E0F',
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  gray300: '#D1D1D1',
  gray500: '#8A8A8A',
  black: '#1A1A1A',
};

// ─── SVG Eye Icons ────────────────────────────────────────────────────────────
function EyeOpen({ color = COLORS.orange }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={1} fill={color} />
    </Svg>
  );
}

function EyeClosed({ color = COLORS.orange }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      {/* upper lid arc */}
      <Path
        d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* lashes */}
      <Path d="M3 15L5.5 12.5"   stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M21 15L18.5 12.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 17L9 14.5"     stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 17L15 14.5"   stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 17.5V15"      stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Floating Label Input ─────────────────────────────────────────────────────
function FloatingInput({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(animLabel, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(animLabel, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    }
  };

  const labelTop   = animLabel.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize  = animLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 11] });
  const labelColor = animLabel.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.gray500, focused ? COLORS.orange : COLORS.gray500],
  });

  return (
    <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
      <Animated.Text style={[styles.floatingLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />

      {secureTextEntry && (
        <TouchableOpacity
          onPress={() => setShowPassword(v => !v)}
          style={styles.eyeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {showPassword ? <EyeOpen /> : <EyeClosed />}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.orange} />

      {/* ── Header ─────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.logoContainer}>
          {/* Substitua o logoBox pelo seu <Image source={...} /> */}
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>M</Text>
          </View>
          <Text style={styles.logoName}>Marilan</Text>
          <Text style={styles.logoTagline}>Plataforma Institucional</Text>
        </View>
      </View>

      {/* ── Card ───────────────────────────────────────── */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bem-vindo(a)</Text>
            <Text style={styles.cardSubtitle}>Faça login para continuar</Text>

            <View style={styles.form}>
              <FloatingInput
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <FloatingInput
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnLoading]}
              onPress={handleLogin}
              activeOpacity={0.85}>
              <Text style={styles.loginBtnText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            Em caso de problemas, contate o suporte técnico.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.orange },
  flex: { flex: 1 },

  header: {
    backgroundColor: COLORS.orange,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.orangeLight, opacity: 0.25,
    top: -60, right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.orangeDark, opacity: 0.2,
    top: 20, left: -30,
  },
  logoContainer: { alignItems: 'center', gap: 6 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, marginBottom: 4,
  },
  logoLetter: { fontSize: 38, fontWeight: '800', color: COLORS.orange },
  logoName: { fontSize: 26, fontWeight: '700', color: COLORS.white, letterSpacing: 0.5 },
  logoTagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500',
  },

  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingTop: 36, paddingBottom: 36,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 8,
  },
  cardTitle: { fontSize: 28, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 15, color: COLORS.gray500, marginTop: 4, marginBottom: 28 },

  form: { gap: 16, marginBottom: 8 },
  inputWrapper: {
    height: 58, borderWidth: 1.5, borderColor: COLORS.gray300,
    borderRadius: 14, paddingHorizontal: 16, justifyContent: 'flex-end',
    backgroundColor: COLORS.offWhite, position: 'relative',
  },
  inputWrapperFocused: {
    borderColor: COLORS.orange, backgroundColor: COLORS.white,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  floatingLabel: { position: 'absolute', left: 16, fontWeight: '500' },
  input: { fontSize: 16, color: COLORS.black, paddingBottom: 8, paddingTop: 20 },
  eyeButton: { position: 'absolute', right: 14, top: 17 },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotText: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },

  loginBtn: {
    backgroundColor: COLORS.orange, borderRadius: 16, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
    shadowColor: COLORS.orangeDark, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  loginBtnLoading: { opacity: 0.7 },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.white, letterSpacing: 0.3 },

  footer: {
    textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.6)',
    marginTop: 24, paddingHorizontal: 32, lineHeight: 18,
    backgroundColor: COLORS.orange, paddingBottom: 8,
  },
});