/**
 * components/SolicitacaoModal.tsx — Marilan v1
 *
 * Modal de aprovação/recusa de solicitações para o Almoxarife.
 * Design: Fundo branco, header laranja, botões arredondados.
 * Abre com slide-up animado. Fecha ao aprovar, recusar ou tocar no backdrop.
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
import type { Solicitacao } from '../hooks/useSolicitacoesListener';

// ─── Design System (igual ao restante do app) ────────────────────────────────
const D = {
  orange:     '#FF5722',
  orangeHot:  '#FF6D00',
  orangeDark: '#BF360C',
  orangeSoft: 'rgba(255,87,34,0.10)',
  orangeLine: 'rgba(255,87,34,0.25)',
  white:      '#FFFFFF',
  snow:       '#FAFAFA',
  mist:       '#F5F5F5',
  cloud:      '#EEEEEE',
  silver:     '#E0E0E0',
  slate:      '#9E9E9E',
  iron:       '#616161',
  obsidian:   '#212121',
  green:      '#2E7D32',
  greenLight: '#43A047',
  greenBg:    'rgba(46,125,50,0.08)',
  greenBorder:'rgba(46,125,50,0.25)',
  red:        '#C62828',
  redLight:   '#E53935',
  redBg:      'rgba(198,40,40,0.08)',
  redBorder:  'rgba(198,40,40,0.30)',
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

const BadgeIcon = ({ size = 14, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={5} width={20} height={14} rx={2} stroke={color} strokeWidth={1.6} />
    <Circle cx={9} cy={12} r={2.5} stroke={color} strokeWidth={1.5} />
    <Path d="M14 10h4M14 14h3" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const ClockIcon = ({ size = 12, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.7} />
    <Path d="M12 7v5l3 3" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Barra de Pulse (indica polling ativo) ───────────────────────────────────
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
  track: { height: 3, backgroundColor: D.orangeSoft, overflow: 'hidden' },
  fill:  { ...StyleSheet.absoluteFillObject, backgroundColor: D.orange },
});

// ─── Formatar data da solicitação ────────────────────────────────────────────
function formatarHora(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
interface SolicitacaoModalProps {
  visible: boolean;
  solicitacao: Solicitacao | null;
  aprovando: boolean;
  recusando: boolean;
  onAprovar: () => void;
  onRecusar: () => void;
  onFechar: () => void;
}

export function SolicitacaoModal({
  visible,
  solicitacao,
  aprovando,
  recusando,
  onAprovar,
  onRecusar,
  onFechar,
}: SolicitacaoModalProps) {
  const slideY  = useRef(new Animated.Value(500)).current;
  const bgOp    = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;

  const processando = aprovando || recusando;

  useEffect(() => {
    if (visible) {
      // Sequência: fundo aparece → sheet sobe → badge de notificação "pinga"
      Animated.parallel([
        Animated.timing(bgOp, {
          toValue: 1, duration: 300, useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0, tension: 65, friction: 12, useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(badgeScale, {
          toValue: 1, tension: 120, friction: 8, useNativeDriver: true,
        }).start();
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

  const totalItens = solicitacao.ferramentas.reduce((acc, f) => acc + f.qtd, 0);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onFechar}
    >
      {/* ── Backdrop ── */}
      <Animated.View style={[s.backdrop, { opacity: bgOp }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          // Impede fechar tocando no backdrop enquanto processa
          onPress={processando ? undefined : onFechar}
        />
      </Animated.View>

      {/* ── Sheet ── */}
      <Animated.View style={[s.sheet, { transform: [{ translateY: slideY }] }]}>

        {/* Barra de polling pulsante no topo */}
        <PulseBar />

        {/* Handle */}
        <View style={s.handle} />

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {/* Badge animado de "nova solicitação" */}
            <Animated.View style={[s.notifBadge, { transform: [{ scale: badgeScale }] }]}>
              <View style={s.notifDot} />
              <Text style={s.notifText}>NOVA SOLICITAÇÃO</Text>
            </Animated.View>

            <Text style={s.headerTitle}>Aguardando Aprovação</Text>
          </View>

          {/* Timestamp */}
          <View style={s.timestampPill}>
            <ClockIcon size={11} color={D.slate} />
            <Text style={s.timestampText}>{formatarHora(solicitacao.criado_em)}</Text>
          </View>
        </View>

        {/* ── Dados do Colaborador ── */}
        <View style={s.colaboradorCard}>
          <View style={s.colaboradorIconBox}>
            <UserIcon size={22} color={D.orange} />
          </View>
          <View style={s.colaboradorInfo}>
            <Text style={s.colaboradorLabel}>COLABORADOR</Text>
            <Text style={s.colaboradorNome}>{solicitacao.colaborador_nome}</Text>
            <View style={s.crachaRow}>
              <BadgeIcon size={12} color={D.slate} />
              <Text style={s.crachaText}>Crachá #{solicitacao.colaborador_cracha}</Text>
            </View>
          </View>
          {/* Contador de itens */}
          <View style={s.totalBadge}>
            <Text style={s.totalBadgeNum}>{totalItens}</Text>
            <Text style={s.totalBadgeLabel}>{totalItens === 1 ? 'item' : 'itens'}</Text>
          </View>
        </View>

        {/* ── Lista de Ferramentas ── */}
        <View style={s.listaSection}>
          <View style={s.listaTitleRow}>
            <View style={s.listaBar} />
            <Text style={s.listaTitleText}>FERRAMENTAS SOLICITADAS</Text>
            <View style={s.listaBadge}>
              <Text style={s.listaBadgeNum}>{solicitacao.ferramentas.length}</Text>
            </View>
          </View>

          <ScrollView
            style={s.listaScroll}
            showsVerticalScrollIndicator={false}
            // Limita altura para não empurrar os botões para fora
            contentContainerStyle={{ gap: 7 }}
          >
            {solicitacao.ferramentas.map((ferramenta, idx) => (
              <View key={`${ferramenta.codigo}-${idx}`} style={s.ferramentaRow}>
                <View style={s.ferramentaIconBox}>
                  <WrenchIcon size={13} color={D.orange} />
                </View>

                <View style={s.ferramentaInfo}>
                  <Text style={s.ferramentaNome} numberOfLines={1}>
                    {ferramenta.nome}
                  </Text>
                  <Text style={s.ferramentaCodigo}>{ferramenta.codigo}</Text>
                </View>

                <View style={s.ferramentaQtyBadge}>
                  <Text style={s.ferramentaQty}>×{ferramenta.qtd}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Botões de Ação ── */}
        <View style={s.acoes}>
          {/* Recusar */}
          <TouchableOpacity
            style={[
              s.btnRecusar,
              processando && s.btnDisabled,
            ]}
            onPress={onRecusar}
            disabled={processando}
            activeOpacity={0.85}
          >
            {recusando ? (
              <ActivityIndicator color={D.redLight} size="small" />
            ) : (
              <>
                <XIcon size={17} color={D.redLight} />
                <Text style={s.btnRecusarText}>Recusar</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Aprovar */}
          <TouchableOpacity
            style={[
              s.btnAprovar,
              processando && s.btnDisabled,
            ]}
            onPress={onAprovar}
            disabled={processando}
            activeOpacity={0.85}
          >
            {aprovando ? (
              <ActivityIndicator color={D.white} size="small" />
            ) : (
              <>
                <CheckIcon size={17} color={D.white} />
                <Text style={s.btnAprovarText}>Aprovar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Espaço seguro para iOS */}
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Backdrop semitransparente
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },

  // Sheet deslizante de baixo
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: D.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Sombra pronunciada para dar profundidade
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },

  handle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: D.silver,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: D.cloud,
  },
  headerLeft: { gap: 6 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: D.obsidian,
    letterSpacing: -0.3,
  },

  // Badge "NOVA SOLICITAÇÃO"
  notifBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: D.orangeSoft,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: D.orangeLine,
  },
  notifDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: D.orange,
  },
  notifText: {
    fontSize: 9,
    fontWeight: '800',
    color: D.orange,
    letterSpacing: 1.4,
  },

  // Timestamp
  timestampPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: D.mist,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: D.cloud,
    marginTop: 4,
  },
  timestampText: { fontSize: 11, color: D.slate, fontWeight: '600' },

  // Card do colaborador
  colaboradorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    backgroundColor: D.snow,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: D.orangeLine,
  },
  colaboradorIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: D.orangeSoft,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: D.orangeLine,
  },
  colaboradorInfo: { flex: 1, gap: 3 },
  colaboradorLabel: {
    fontSize: 9, fontWeight: '800',
    color: D.slate, letterSpacing: 1.4,
  },
  colaboradorNome: {
    fontSize: 15, fontWeight: '800',
    color: D.obsidian, letterSpacing: -0.2,
  },
  crachaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  crachaText: { fontSize: 11, color: D.slate, fontWeight: '500' },

  // Badge total de itens
  totalBadge: {
    alignItems: 'center',
    backgroundColor: D.orangeSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: D.orangeLine,
  },
  totalBadgeNum: { fontSize: 22, fontWeight: '900', color: D.orange, lineHeight: 26 },
  totalBadgeLabel: { fontSize: 9, fontWeight: '700', color: D.orange, letterSpacing: 0.5 },

  // Seção da lista
  listaSection: {
    marginHorizontal: 20,
    marginTop: 18,
    gap: 10,
  },
  listaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listaBar: {
    width: 3.5, height: 13, borderRadius: 2,
    backgroundColor: D.orange,
  },
  listaTitleText: {
    flex: 1,
    fontSize: 10, fontWeight: '800',
    color: D.slate, letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  listaBadge: {
    backgroundColor: D.orangeSoft,
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: D.orangeLine,
  },
  listaBadgeNum: { fontSize: 11, fontWeight: '800', color: D.orange },

  // Scroll da lista
  listaScroll: { maxHeight: 180 },

  // Linha de cada ferramenta
  ferramentaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: D.snow,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: D.silver,
  },
  ferramentaIconBox: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: D.orangeSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  ferramentaInfo: { flex: 1, gap: 2 },
  ferramentaNome: {
    fontSize: 13, fontWeight: '700',
    color: D.obsidian,
  },
  ferramentaCodigo: {
    fontSize: 10, color: D.slate,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '500',
  },
  ferramentaQtyBadge: {
    backgroundColor: D.mist,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: D.silver,
  },
  ferramentaQty: { fontSize: 12, fontWeight: '800', color: D.iron },

  // Botões de ação
  acoes: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },

  // Recusar — bordas vermelhas, fundo branco
  btnRecusar: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: D.redBg,
    borderWidth: 1.5,
    borderColor: D.redBorder,
  },
  btnRecusarText: {
    fontSize: 15, fontWeight: '800',
    color: D.redLight, letterSpacing: 0.1,
  },

  // Aprovar — fundo laranja sólido
  btnAprovar: {
    flex: 1.6,  // Aprovar é mais largo para dar ênfase visual
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: D.orange,
    shadowColor: D.orangeDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
  },
  btnAprovarText: {
    fontSize: 15, fontWeight: '800',
    color: D.white, letterSpacing: 0.1,
  },

  // Estado desabilitado durante o processamento
  btnDisabled: { opacity: 0.55 },
});