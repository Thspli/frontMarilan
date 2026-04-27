/**
 * app/login-new.tsx (Refactored)
 * Tela de Login - Integração com API Real
 */

import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { apiClient } from '../services/api';

// ─── Theme ────────────────────────────────────────────────────────────────────
const COLORS = {
  orange: '#F26419',
  orangeLight: '#FF8C42',
  orangeDark: '#C94E0F',
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  gray300: '#D1D1D1',
  gray500: '#8A8A8A',
  gray700: '#4A4F5C',
  black: '#1A1A1A',
  red: '#E53935',
};

// ─── SVG Eye Icons ────────────────────────────────────────────────────────────
function EyeOpen({ color = COLORS.orange }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={12} cy={12} r={1} fill={color} />
    </Svg>
  );
}

function EyeClosed({ color = COLORS.orange }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 15L5.5 12.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M21 15L18.5 12.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 17L9 14.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M16 17L15 14.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M12 17.5V15" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  editable?: boolean;
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

  const labelTop = animLabel.interpolate({ inputRange: [0, 1], outputRange: [18, 6] });
  const labelSize = animLabel.interpolate({ inputRange: [0, 1], outputRange: [16, 11] });
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
        style={[styles.input, !editable && styles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
      />

      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {showPassword ? <EyeOpen /> : <EyeClosed />}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const [cracha, setCracha] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Verificar se já está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await apiClient.initialize();
        if (apiClient.isAuthenticated()) {
          router.replace('/(tabs)/ferramentas');
        }
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    // Validação
    if (!cracha.trim()) {
      setError('Digite o número do crachá');
      return;
    }
    if (!password.trim()) {
      setError('Digite a senha');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const response = await apiClient.login(cracha.trim(), password);

      // Login bem-sucedido - navegar para home
      setTimeout(() => {
        router.replace('/(tabs)/ferramentas');
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.orange} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>M</Text>
            </View>
            <Text style={styles.logoName}>Marilan</Text>
            <Text style={styles.logoTagline}>Gerenciamento de Ferramentas</Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Card */}
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bem-vindo(a)</Text>
          <Text style={styles.cardSubtitle}>Faça login para continuar</Text>

          {error.length > 0 && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <FloatingInput
              label="Crachá"
              value={cracha}
              onChangeText={(val) => {
                setCracha(val);
                setError('');
              }}
              keyboardType="numeric"
              editable={!loading}
            />
            <FloatingInput
              label="Senha"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                setError('');
              }}
              secureTextEntry
              editable={!loading}
            />
            <TouchableOpacity style={styles.forgotBtn} disabled={loading}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <>
                <ActivityIndicator color={COLORS.white} size="small" />
                <Text style={styles.loginBtnText}>Autenticando…</Text>
              </>
            ) : (
              <Text style={styles.loginBtnText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Sistema de Gerenciamento de Ferramentas
            </Text>
            <Text style={styles.infoSubtext}>
              Acesso restrito a colaboradores autorizados
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.orange },
  headerSafe: { backgroundColor: COLORS.orange },
  flex: { flex: 1, backgroundColor: COLORS.white },

  header: {
    backgroundColor: COLORS.orange,
    paddingTop: 16,
    paddingBottom: 48,
    alignItems: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.orangeLight,
    opacity: 0.25,
    top: -60,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.orangeDark,
    opacity: 0.2,
    top: 20,
    left: -30,
  },
  logoContainer: { alignItems: 'center', gap: 6 },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 4,
  },
  logoLetter: { fontSize: 38, fontWeight: '800', color: COLORS.orange },
  logoName: { fontSize: 26, fontWeight: '700', color: COLORS.white, letterSpacing: 0.5 },
  logoTagline: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: { fontSize: 28, fontWeight: '800', color: COLORS.black, letterSpacing: -0.3 },
  cardSubtitle: { fontSize: 15, color: COLORS.gray500, marginTop: 4, marginBottom: 20 },

  errorBox: {
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.red,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { fontSize: 13, color: COLORS.red, fontWeight: '600' },

  form: { gap: 16, marginBottom: 8 },
  inputWrapper: {
    height: 58,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.offWhite,
    position: 'relative',
  },
  inputWrapperFocused: {
    borderColor: COLORS.orange,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  floatingLabel: { position: 'absolute', left: 16, fontWeight: '500' },
  input: { fontSize: 16, color: COLORS.black, paddingBottom: 8, paddingTop: 20 },
  inputDisabled: { color: COLORS.gray500 },
  eyeButton: { position: 'absolute', right: 14, top: 17 },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 4 },
  forgotText: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },

  loginBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    flexDirection: 'row',
    gap: 8,
    shadowColor: COLORS.orangeDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  loginBtnLoading: { opacity: 0.8 },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.white, letterSpacing: 0.3 },

  infoBox: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray300,
    alignItems: 'center',
    gap: 4,
  },
  infoText: { fontSize: 12, color: COLORS.gray500, fontWeight: '600', textAlign: 'center' },
  infoSubtext: { fontSize: 11, color: COLORS.gray500, fontStyle: 'italic' },
});
