/**
 * components/TrocaSolicitacaoModal.tsx — Marilan v1.0
 *
 * Modal que aparece para o colaborador destinatário quando alguém
 * solicita uma transferência de ferramenta para ele.
 * Design espelha o SolicitacaoModal do almoxarife.
 *
 * USO (em ferramentas.tsx):
 *   import { TrocaSolicitacaoModal } from '../../components/TrocaSolicitacaoModal';
 *   import { useTrocaSolicitacaoListener } from '../../hooks/useTrocaSolicitacaoListener';
 *
 *   const { solicitacaoTroca, modalVisible, aceitando, recusando, aceitar, recusar, fechar }
 *     = useTrocaSolicitacaoListener();
 *
 *   <TrocaSolicitacaoModal
 *     visible={modalVisible}
 *     solicitacao={solicitacaoTroca}
 *     aceitando={aceitando}
 *     recusando={recusando}
 *     onAceitar={aceitar}
 *     onRecusar={recusar}
 *     onFechar={fechar}
 *   />
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Tipo declarado localmente para evitar problema de caminho de import
export interface SolicitacaoTroca {
  id: number;
  de_nome: string;
  de_cracha: string;
  ferramentas: Array<{ codigo: string; nome: string; qtd: number }>;
  criado_em: string;
}


// ─── Design System ────────────────────────────────────────────────────────────
const D = {
  orange:      '#FF5722',
  orangeHot:   '#FF6D00',
  orangeDark:  '#BF360C',
  orangeSoft:  'rgba(255,87,34,0.10)',
  orangeLine:  'rgba(255,87,34,0.25)',
  white:       '#FFFFFF',
  snow:        '#FAFAFA',
  mist:        '#F5F5F5',
  cloud:       '#EEEEEE',
  silver:      '#E0E0E0',
  slate:       '#9E9E9E',
  iron:        '#616161',
  obsidian:    '#212121',
  green:       '#2E7D32',
  greenLight:  '#43A047',
  greenBg:     'rgba(46,125,50,0.08)',
  greenBorder: 'rgba(46,125,50,0.25)',
  red:         '#C62828',
  redLight:    '#E53935',
  redBg:       'rgba(198,40,40,0.08)',
  redBorder:   'rgba(198,40,40,0.30)',
  blue:        '#1565C0',
  blueBg:      'rgba(21,101,192,0.08)',
  blueBorder:  'rgba(21,101,192,0.25)',
};

// ─── Ícones ───────────────────────────────────────────────────────────────────
const CheckIcon = ({ size = 18, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const XIcon = ({ size = 18, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
  </Svg>
);

const WrenchIcon = ({ size = 14, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const BadgeIcon = ({ size = 14, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={5} width={20} height={14} rx={2} stroke={color} strokeWidth={1.6} />
    <Circle cx={9} cy={12} r={2.5} stroke={color} strokeWidth={1.5} />
    <Path d="M14 10h4M14 14h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const SwapIcon = ({ size = 18, color = D.blue }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7 16V4m0 0L3 8m4-4l4 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 8v12m0 0l4-4m-4 4l-4-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockIcon = ({ size = 12, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Barra de pulse ───────────────────────────────────────────────────────────
function PulseBar() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { opacity: anim }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { height: 3, backgroundColor: D.blueBg, overflow: 'hidden' },
  fill:  { ...StyleSheet.absoluteFillObject, backgroundColor: D.blue },
});

function formatarHora(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface TrocaSolicitacaoModalProps {
  visible: boolean;
  solicitacao: SolicitacaoTroca | null;
  aceitando: boolean;
  recusando: boolean;
  onAceitar: () => void;
  onRecusar: () => void;
  onFechar: () => void;
}

// ════════════════════════════════════════════════════════════════════════════
export function TrocaSolicitacaoModal({
  visible, solicitacao, aceitando, recusando, onAceitar, onRecusar, onFechar,
}: TrocaSolicitacaoModalProps) {
  const slideY     = useRef(new Animated.Value(500)).current;
  const bgOp       = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const processando = aceitando || recusando;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOp,   { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      ]).start(() => {
        Animated.spring(badgeScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true }).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(bgOp,   { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 500, duration: 260, useNativeDriver: true }),
      ]).start();
      badgeScale.setValue(0);
    }
  }, [visible]);

  if (!solicitacao) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onFechar}>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={processando ? undefined : onFechar} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>
        <PulseBar />
        <View style={s.handle} />

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Animated.View style={[s.notifBadge, { transform: [{ scale: badgeScale }] }]}>
              <View style={s.notifDot} />
              <Text style={s.notifText}>SOLICITAÇÃO DE TROCA</Text>
            </Animated.View>
            <Text style={s.headerTitle}>Alguém quer trocar com você</Text>
          </View>
          <View style={s.timestampPill}>
            <ClockIcon size={11} color={D.slate} />
            <Text style={s.timestampText}>{formatarHora(solicitacao.criado_em)}</Text>
          </View>
        </View>

        {/* Card do remetente */}
        <View style={s.remetenteCard}>
          <View style={s.remetenteIconBox}>
            <UserIcon size={22} color={D.blue} />
          </View>
          <View style={s.remetenteInfo}>
            <Text style={s.remetenteLabel}>SOLICITADO POR</Text>
            <Text style={s.remetenteNome}>{solicitacao.de_nome}</Text>
            <View style={s.crachaRow}>
              <BadgeIcon size={12} color={D.slate} />
              <Text style={s.crachaText}>Crachá #{solicitacao.de_cracha}</Text>
            </View>
          </View>
          <View style={s.swapIconBox}>
            <SwapIcon size={20} color={D.blue} />
          </View>
        </View>

        {/* Lista de ferramentas */}
        <View style={s.listaSection}>
          <View style={s.listaTitleRow}>
            <View style={s.listaBar} />
            <Text style={s.listaTitleText}>FERRAMENTAS A TRANSFERIR</Text>
            <View style={s.listaBadge}>
              <Text style={s.listaBadgeNum}>{solicitacao.ferramentas.length}</Text>
            </View>
          </View>

          <ScrollView style={s.listaScroll} showsVerticalScrollIndicator={false}>
            {solicitacao.ferramentas.map((f, i) => (
              <View key={f.codigo} style={[s.ferramentaRow, i > 0 && { marginTop: 7 }]}>
                <View style={s.ferramentaIconBox}>
                  <WrenchIcon size={14} color={D.orange} />
                </View>
                <View style={s.ferramentaInfo}>
                  <Text style={s.ferramentaNome}>{f.nome}</Text>
                  <Text style={s.ferramentaCodigo}>{f.codigo}</Text>
                </View>
                <View style={s.ferramentaQtyBadge}>
                  <Text style={s.ferramentaQty}>×{f.qtd}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Aviso */}
        <View style={s.avisoRow}>
          <Text style={s.avisoText}>
            Ao aceitar, você assume a custódia dessas ferramentas.
          </Text>
        </View>

        {/* Botões */}
        <View style={s.acoes}>
          <TouchableOpacity
            style={[s.btnRecusar, processando && s.btnDisabled]}
            onPress={onRecusar}
            disabled={processando}
            activeOpacity={0.85}
          >
            {recusando
              ? <ActivityIndicator color={D.redLight} size="small" />
              : <><XIcon size={16} color={D.redLight} /><Text style={s.btnRecusarText}>Recusar</Text></>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnAceitar, processando && s.btnDisabled]}
            onPress={onAceitar}
            disabled={processando}
            activeOpacity={0.85}
          >
            {aceitando
              ? <ActivityIndicator color={D.white} size="small" />
              : <><CheckIcon size={16} color={D.white} /><Text style={s.btnAceitarText}>Aceitar Troca</Text></>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14, shadowRadius: 24, elevation: 20, overflow: 'hidden',
  },
  handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: D.silver, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: D.cloud },
  headerLeft: { gap: 6 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: D.obsidian, letterSpacing: -0.3 },

  notifBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: D.blueBg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: D.blueBorder },
  notifDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: D.blue },
  notifText:  { fontSize: 9, fontWeight: '800', color: D.blue, letterSpacing: 1.4 },

  timestampPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: D.mist, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: D.cloud, marginTop: 4 },
  timestampText: { fontSize: 11, color: D.slate, fontWeight: '600' },

  remetenteCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 20, marginTop: 16, padding: 14, backgroundColor: D.snow, borderRadius: 16, borderWidth: 1.5, borderColor: D.blueBorder },
  remetenteIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: D.blueBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.blueBorder },
  remetenteInfo: { flex: 1, gap: 3 },
  remetenteLabel: { fontSize: 9, fontWeight: '800', color: D.slate, letterSpacing: 1.4 },
  remetenteNome: { fontSize: 15, fontWeight: '800', color: D.obsidian, letterSpacing: -0.2 },
  crachaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  crachaText: { fontSize: 11, color: D.slate, fontWeight: '500' },
  swapIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: D.blueBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: D.blueBorder },

  listaSection: { marginHorizontal: 20, marginTop: 18, gap: 10, flexShrink: 1 },
  listaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listaBar: { width: 3.5, height: 13, borderRadius: 2, backgroundColor: D.blue },
  listaTitleText: { flex: 1, fontSize: 10, fontWeight: '800', color: D.slate, letterSpacing: 1.4, textTransform: 'uppercase' },
  listaBadge: { backgroundColor: D.blueBg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: D.blueBorder },
  listaBadgeNum: { fontSize: 11, fontWeight: '800', color: D.blue },
  listaScroll: { maxHeight: 160, flexShrink: 1 },

  ferramentaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.snow, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, borderWidth: 1, borderColor: D.silver },
  ferramentaIconBox: { width: 34, height: 34, borderRadius: 9, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  ferramentaInfo: { flex: 1, gap: 2 },
  ferramentaNome: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  ferramentaCodigo: { fontSize: 10, color: D.slate, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '500' },
  ferramentaQtyBadge: { backgroundColor: D.mist, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: D.silver },
  ferramentaQty: { fontSize: 12, fontWeight: '800', color: D.iron },

  avisoRow: { marginHorizontal: 20, marginTop: 14, backgroundColor: D.blueBg, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: D.blueBorder },
  avisoText: { fontSize: 11, color: D.blue, fontWeight: '600', lineHeight: 16 },

  acoes: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 16 },
  btnRecusar: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: D.redBg, borderWidth: 1.5, borderColor: D.redBorder },
  btnRecusarText: { fontSize: 15, fontWeight: '800', color: D.redLight, letterSpacing: 0.1 },
  btnAceitar: { flex: 1.6, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: D.blue, shadowColor: '#0D47A1', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 7 },
  btnAceitarText: { fontSize: 15, fontWeight: '800', color: D.white, letterSpacing: 0.1 },
  btnDisabled: { opacity: 0.55 },
});