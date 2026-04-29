/**
 * components/TrocaConfirmacaoModal.tsx — Marilan v1.1
 *
 * Modal de confirmação de solicitação de troca para Colaboradores.
 * Aparece quando outro colaborador solicita uma ferramenta que está com o usuário.
 * Design: Fundo branco, header laranja, botões de aceitar/recusar.
 * Abre com slide-up animado. Fecha ao aceitar, recusar ou tocar no backdrop.
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { apiClient } from '../services/api';

// ─── Design System (igual ao restante do app) ────────────────────────────────
const D = {
  orange:     '#F05A00',
  orange2:    '#FF7A2F',
  orangeDark: '#B84400',
  orangeSoft: 'rgba(240,90,0,0.10)',
  orangeLine:  'rgba(240,90,0,0.25)',
  white:      '#FFFFFF',
  offWhite:   '#FAFAF9',
  gray50:     '#F7F6F4',
  gray100:    '#F0EDEA',
  gray200:    '#E2DDD8',
  gray300:    '#C8C0B8',
  gray400:    '#AEA49A',
  gray500:    '#7A7068',
  gray700:    '#3A332B',
  black:      '#1A1510',
  green:      '#1A9960',
  greenLight: '#43A047',
  greenBg:    'rgba(26,153,96,0.08)',
  greenBorder:'rgba(26,153,96,0.25)',
  red:        '#D93B2B',
  redLight:   '#E53935',
  redBg:      'rgba(217,59,43,0.08)',
  redBorder:  'rgba(217,59,43,0.30)',
};

// ─── Ícones ──────────────────────────────────────────────────────────────────
const CheckIcon = ({ size = 18, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XIcon = ({ size = 18, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.2}
      strokeLinecap="round" />
  </Svg>
);

const WrenchIcon = ({ size = 14, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const ClockIcon = ({ size = 12, color = D.gray500 }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Barra de Pulse (indica polling ativo) ───────────────────────────────────
function PulseBar() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.pulseContainer}>
      <Animated.View style={[styles.pulseBar, { opacity }]} />
    </View>
  );
}

interface TrocaSolicitacao {
  id: number;
  ferramenta_nome: string;
  ferramenta_codigo: string;
  solicitante_nome: string;
  solicitante_cracha: string;
  criado_em: string;
}

interface TrocaConfirmacaoModalProps {
  visible: boolean;
  solicitacao: TrocaSolicitacao | null;
  onAceitar: () => Promise<void>;
  onRecusar: () => Promise<void>;
  onClose: () => void;
}

export function TrocaConfirmacaoModal({
  visible,
  solicitacao,
  onAceitar,
  onRecusar,
  onClose,
}: TrocaConfirmacaoModalProps) {
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOp = useRef(new Animated.Value(0)).current;
  const [aceitando, setAceitando] = React.useState(false);
  const [recusando, setRecusando] = React.useState(false);

  useEffect(() => {
    if (visible) {
      setAceitando(false);
      setRecusando(false);
      Animated.parallel([
        Animated.timing(bgOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOp, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 600, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleAceitar = async () => {
    if (!solicitacao) return;
    setAceitando(true);
    try {
      await onAceitar();
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao aceitar solicitação');
    } finally {
      setAceitando(false);
    }
  };

  const handleRecusar = async () => {
    if (!solicitacao) return;
    setRecusando(true);
    try {
      await onRecusar();
      onClose();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao recusar solicitação');
    } finally {
      setRecusando(false);
    }
  };

  if (!solicitacao) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <WrenchIcon size={20} color={D.white} />
          </View>
          <Text style={styles.headerTitle}>Solicitação de Troca</Text>
          <Text style={styles.headerSub}>Outro colaborador quer sua ferramenta</Text>
        </View>
        <View style={styles.sep} />
        <View style={styles.body}>
          <PulseBar />
          <View style={styles.toolCard}>
            <View style={styles.toolRow}>
              <View style={styles.toolIconBox}>
                <WrenchIcon size={16} color={D.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName} numberOfLines={1}>{solicitacao.ferramenta_nome}</Text>
                <Text style={styles.toolMeta}>Código: {solicitacao.ferramenta_codigo}</Text>
              </View>
            </View>
            <View style={styles.sepThin} />
            <View style={styles.userRow}>
              <View style={styles.userIconBox}>
                <UserIcon size={16} color={D.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userLabel}>SOLICITADO POR</Text>
                <Text style={styles.userName}>{solicitacao.solicitante_nome}</Text>
                <Text style={styles.userMeta}>Crachá: {solicitacao.solicitante_cracha}</Text>
              </View>
            </View>
            <View style={styles.sepThin} />
            <View style={styles.timeRow}>
              <View style={styles.timeIconBox}>
                <ClockIcon size={14} color={D.gray500} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>SOLICITADO EM</Text>
                <Text style={styles.timeValue}>
                  {new Date(solicitacao.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.question}>Deseja transferir esta ferramenta?</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnRecusar]}
              onPress={handleRecusar}
              disabled={aceitando || recusando}
              activeOpacity={0.8}
            >
              {recusando ? (
                <ActivityIndicator color={D.white} size="small" />
              ) : (
                <>
                  <XIcon size={18} color={D.white} />
                  <Text style={styles.btnTextRecusar}>Recusar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAceitar]}
              onPress={handleAceitar}
              disabled={aceitando || recusando}
              activeOpacity={0.8}
            >
              {aceitando ? (
                <ActivityIndicator color={D.white} size="small" />
              ) : (
                <>
                  <CheckIcon size={18} color={D.white} />
                  <Text style={styles.btnTextAceitar}>Aceitar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26,21,16,0.5)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: D.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 36, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 20 },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  header: { paddingHorizontal: 24, paddingVertical: 16, alignItems: 'center', gap: 8 },
  headerIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: D.black, letterSpacing: -0.3 },
  headerSub: { fontSize: 14, color: D.gray500, textAlign: 'center' },
  sep: { height: 1, backgroundColor: D.gray100 },
  body: { paddingHorizontal: 24, paddingTop: 20, alignItems: 'center', gap: 16 },
  pulseContainer: { width: '100%', height: 3, backgroundColor: D.gray100, borderRadius: 2, overflow: 'hidden' },
  pulseBar: { width: '100%', height: '100%', backgroundColor: D.orange },
  toolCard: { width: '100%', backgroundColor: D.gray50, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: D.gray200 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontSize: 16, fontWeight: '800', color: D.black, letterSpacing: -0.1 },
  toolMeta: { fontSize: 12, color: D.gray500, marginTop: 2 },
  sepThin: { height: 1, backgroundColor: D.gray200, marginVertical: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  userLabel: { fontSize: 9, fontWeight: '800', color: D.gray400, letterSpacing: 1.2 },
  userName: { fontSize: 14, fontWeight: '700', color: D.black, marginTop: 2 },
  userMeta: { fontSize: 12, color: D.gray500, marginTop: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.gray100, alignItems: 'center', justifyContent: 'center' },
  timeLabel: { fontSize: 9, fontWeight: '800', color: D.gray400, letterSpacing: 1.2 },
  timeValue: { fontSize: 12, fontWeight: '600', color: D.gray700, marginTop: 2 },
  question: { fontSize: 16, fontWeight: '700', color: D.black, textAlign: 'center', marginTop: 8 },
  actions: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, height: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnRecusar: { backgroundColor: D.red, shadowColor: D.red, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnAceitar: { backgroundColor: D.green, shadowColor: D.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnTextRecusar: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
  btnTextAceitar: { fontSize: 16, fontWeight: '800', color: D.white, letterSpacing: 0.2 },
});