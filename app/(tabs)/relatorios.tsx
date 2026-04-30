/**
 * app/(tabs)/relatorios.tsx — Marilan v2.3
 */

import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  RefreshControl,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, type Ferramenta } from '../../services/api';

// ─── Design System ─────────────────────────────────────────────────────────────
const D = {
  orange:     '#F05A00',
  orange2:    '#FF7A2F',
  orangeGlow: 'rgba(240,90,0,0.10)',
  orangeDim:  'rgba(240,90,0,0.07)',
  orangeDark: '#B84400',
  orangeLine: 'rgba(240,90,0,0.25)',
  white:      '#FFFFFF',
  offWhite:   '#FAFAF9',
  gray50:     '#F5F3F0',
  gray100:    '#EEE9E4',
  gray200:    '#DDD6CF',
  gray300:    '#C0B8AE',
  gray400:    '#A09690',
  gray500:    '#706860',
  gray700:    '#3A332B',
  black:      '#1A1510',
  green:      '#1A9960',
  greenBg:    'rgba(26,153,96,0.07)',
  greenText:  '#116640',
  red:        '#D93B2B',
  redBg:      'rgba(217,59,43,0.08)',
  amber:      '#C97800',
  amberBg:    'rgba(201,120,0,0.08)',
  amberText:  '#7A4800',
};

type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

const STATUS_CFG: Record<ToolStatus, { dot: string; bg: string; text: string }> = {
  'Disponível':    { dot: D.green,  bg: D.greenBg, text: D.greenText },
  'Em uso':        { dot: D.red,    bg: D.redBg,   text: D.red       },
  'Em manutenção': { dot: D.amber,  bg: D.amberBg, text: D.amberText },
};

// ══════════════════════════════════════════════════════════════════════════════
// ─── COMPONENTE: ACESSO NEGADO ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function AcessoNegado() {
  const router = useRouter();
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOp = useRef(new Animated.Value(0)).current;
  const contentOp = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(20)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 70, friction: 9, useNativeDriver: true }),
        Animated.timing(iconOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(contentY, { toValue: 0, tension: 90, friction: 12, useNativeDriver: true }),
        Animated.timing(contentOp, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleVoltar = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start(() => router.replace('/(tabs)/ferramentas'));
  };

  return (
    <View style={an.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orangeDark} />
      <View style={an.dotPattern} pointerEvents="none">
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={i} style={[an.dot, { opacity: i % 3 === 0 ? 0.18 : 0.08 }]} />
        ))}
      </View>
      <SafeAreaView style={an.safe} edges={['top', 'bottom']}>
        <Animated.View style={[an.iconWrap, { opacity: iconOp, transform: [{ scale: iconScale }] }]}>
          <View style={an.iconOuterRing}>
            <View style={an.iconInnerRing}>
              <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
                <Rect x={3} y={11} width={18} height={11} rx={2} stroke={D.white} strokeWidth={1.8} />
                <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={D.white} strokeWidth={1.8} strokeLinecap="round" />
                <Circle cx={12} cy={16} r={1.5} fill={D.white} />
              </Svg>
            </View>
          </View>
        </Animated.View>
        <Animated.View style={[an.content, { opacity: contentOp, transform: [{ translateY: contentY }] }]}>
          <View style={an.restrictedBadge}>
            <View style={an.restrictedDot} />
            <Text style={an.restrictedBadgeText}>ACESSO RESTRITO</Text>
          </View>
          <Text style={an.title}>Área Protegida</Text>
          <Text style={an.message}>Área restrita a gestores do Almoxarifado.</Text>
          <Text style={an.subMessage}>
            Sua conta não possui permissão para visualizar relatórios gerenciais.
          </Text>
          <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }], marginTop: 20 }}>
            <TouchableOpacity style={an.backBtn} onPress={handleVoltar} activeOpacity={0.88}>
              <Text style={an.backBtnText}>Voltar para Ferramentas</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const an = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orangeDark },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  dotPattern: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', padding: 24, gap: 20 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  iconWrap: { marginBottom: 32 },
  iconOuterRing: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  iconInnerRing: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', width: '100%', gap: 14 },
  restrictedBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  restrictedDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FF6B6B' },
  restrictedBadgeText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 2 },
  title: { fontSize: 30, fontWeight: '900', color: D.white, letterSpacing: -0.5, textAlign: 'center', marginTop: 2 },
  message: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  subMessage: { fontSize: 13, color: 'rgba(255,255,255,0.48)', textAlign: 'center', lineHeight: 20 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 14, backgroundColor: D.white, width: '100%' },
  backBtnText: { fontSize: 15, fontWeight: '800', color: D.orange },
});

// ─── Ícones ──────────────────────────────────────────────────────────────────
const WrenchIcon = ({ size = 16, color = D.orange }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const UserIcon = ({ size = 13, color = D.red }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
    <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

const DownloadIcon = ({ size = 18, color = D.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RefreshIcon = ({ size = 16, color = D.white }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M21 3v5h-5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Componentes Visuais ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status as ToolStatus] ?? { dot: D.gray400, bg: D.gray100, text: D.gray500 };
  return (
    <View style={[sb.pill, { backgroundColor: c.bg }]}>
      <View style={[sb.dot, { backgroundColor: c.dot }]} />
      <Text style={[sb.label, { color: c.text }]}>{status}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  dot:   { width: 5.5, height: 5.5, borderRadius: 3 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

function SectionHeader({ label, count, color = D.gray500 }: { label: string; count: number; color?: string }) {
  return (
    <View style={sh.row}>
      <View style={[sh.bar, { backgroundColor: color }]} />
      <Text style={sh.label}>{label}</Text>
      <View style={[sh.badge, { backgroundColor: `${color}18` }]}>
        <Text style={[sh.num, { color }]}>{count}</Text>
      </View>
    </View>
  );
}
const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  bar:   { width: 3.5, height: 15, borderRadius: 2 },
  label: { flex: 1, fontSize: 10, fontWeight: '800', color: D.gray500, letterSpacing: 1.2, textTransform: 'uppercase' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  num:   { fontSize: 11, fontWeight: '800' },
});

function StatBox({ value, label, anim, color = D.white }: { value: number; label: string; anim: Animated.Value; color?: string }) {
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  return (
    <Animated.View style={[stb.box, { transform: [{ scale }], opacity: anim }]}>
      <Text style={[stb.value, { color }]}>{value}</Text>
      <Text style={stb.label}>{label}</Text>
    </Animated.View>
  );
}
const stb = StyleSheet.create({
  box:   { flex: 1, alignItems: 'center' },
  value: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
});

function OccupancyBar({ pct, anim }: { pct: number; anim: Animated.Value }) {
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] });
  return (
    <View style={occ.track}>
      <Animated.View style={[occ.fill, { width }]} />
      <View style={[occ.rest, { left: `${pct}%` as any }]} />
    </View>
  );
}
const occ = StyleSheet.create({
  track: { height: 10, backgroundColor: D.gray100, borderRadius: 99, overflow: 'hidden', position: 'relative' },
  fill:  { height: '100%', backgroundColor: D.red, borderRadius: 99, position: 'absolute', left: 0 },
  rest:  { position: 'absolute', right: 0, top: 0, bottom: 0, backgroundColor: D.greenBg, borderRadius: 99 },
});

function ToolRow({ item, index }: { item: Ferramenta; index: number }) {
  const oy = useRef(new Animated.Value(12)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 220, delay: index * 40, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, tension: 110, friction: 14, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const isInUse = item.status === 'Em uso';

  return (
    <Animated.View style={[tr.wrap, { opacity: op, transform: [{ translateY: oy }] }]}>
      <View style={[tr.card, isInUse && tr.cardAccent]}>
        {isInUse && <View style={tr.accentBar} />}
        <View style={[tr.iconBox, isInUse ? { backgroundColor: D.redBg } : { backgroundColor: D.orangeDim }]}>
          <WrenchIcon size={15} color={isInUse ? D.red : D.orange} />
        </View>
        <View style={tr.content}>
          <View style={tr.topRow}>
            <Text style={tr.name} numberOfLines={1}>{item.nome}</Text>
            <StatusBadge status={item.status} />
          </View>
          <View style={tr.metaRow}>
            <Text style={tr.code}>{item.codigo}</Text>
            <View style={tr.sep} />
            <Text style={tr.cat}>{item.categoria}</Text>
          </View>
          {isInUse && item.alocadoPara && item.alocadoPara !== '—' && (
            <View style={tr.allocRow}>
              <UserIcon size={11} color={D.red} />
              <Text style={tr.allocText}>{item.alocadoPara}</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
const tr = StyleSheet.create({
  wrap:       { marginBottom: 7 },
  card:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.white, borderRadius: 15, paddingVertical: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: D.gray200, overflow: 'hidden' },
  cardAccent: { borderColor: `${D.red}28`, borderWidth: 1.5 },
  accentBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, backgroundColor: D.red },
  iconBox:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content:    { flex: 1, gap: 4 },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:       { flex: 1, fontSize: 13, fontWeight: '700', color: D.black },
  metaRow:    { flexDirection: 'row', alignItems: 'center' },
  code:       { fontSize: 10, color: D.gray400, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  sep:        { width: 1, height: 9, backgroundColor: D.gray200, marginHorizontal: 7 },
  cat:        { fontSize: 10, color: D.gray500 },
  allocRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  allocText:  { fontSize: 11, fontWeight: '700', color: D.red },
});

function MetricCard({ label, value, sub, color, icon, anim }: {
  label: string; value: number; sub: string; color: string; icon: React.ReactNode; anim: Animated.Value;
}) {
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  return (
    <Animated.View style={[mc.card, { transform: [{ scale }], opacity: anim }]}>
      <View style={[mc.iconBox, { backgroundColor: `${color}13` }]}>{icon}</View>
      <Text style={[mc.value, { color }]}>{value}</Text>
      <Text style={mc.label}>{label}</Text>
      <Text style={mc.sub}>{sub}</Text>
    </Animated.View>
  );
}
const mc = StyleSheet.create({
  card:    { flex: 1, backgroundColor: D.white, borderRadius: 16, padding: 16, alignItems: 'center', gap: 5, borderWidth: 1, borderColor: D.gray200 },
  iconBox: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  value:   { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  label:   { fontSize: 12, fontWeight: '700', color: D.black },
  sub:     { fontSize: 10, color: D.gray400, textAlign: 'center' },
});

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const y  = useRef(new Animated.Value(20)).current;
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(y,  { toValue: 0, tension: 140, friction: 12, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y,  { toValue: 20, duration: 240, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0,  duration: 240, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[tos.wrap, { opacity: op, transform: [{ translateY: y }] }]} pointerEvents="none">
      <View style={tos.pill}>
        <View style={tos.iconBox}>
          <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
            <Path d="M20 6L9 17L4 12" stroke={D.white} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Text style={tos.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const tos = StyleSheet.create({
  wrap:    { position: 'absolute', bottom: 24, left: 20, right: 20, zIndex: 9999 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: D.black, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 10 },
  iconBox: { width: 26, height: 26, borderRadius: 13, backgroundColor: D.green, alignItems: 'center', justifyContent: 'center' },
  text:    { fontSize: 14, fontWeight: '600', color: D.white, flex: 1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// ─── TELA PRINCIPAL ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function RelatoriosScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={guard.loadWrap}>
        <StatusBar barStyle="light-content" backgroundColor={D.orangeDark} />
        <ActivityIndicator color={D.white} size="large" />
        <Text style={guard.loadText}>Verificando permissões…</Text>
      </View>
    );
  }

  if (!user || user.role !== 'almoxarife') {
    return <AcessoNegado />;
  }

  return <RelatoriosContent />;
}

const guard = StyleSheet.create({
  loadWrap: { flex: 1, backgroundColor: D.orangeDark, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});

function RelatoriosContent() {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [movimentacoesCount, setMovimentacoesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Novo estado de refresh
  const [exporting, setExporting] = useState(false);
  const [modalFormatoVisible, setModalFormatoVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '' });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const stat1Anim  = useRef(new Animated.Value(0)).current;
  const stat2Anim  = useRef(new Animated.Value(0)).current;
  const stat3Anim  = useRef(new Animated.Value(0)).current;
  const card1Anim  = useRef(new Animated.Value(0)).current;
  const card2Anim  = useRef(new Animated.Value(0)).current;
  const barAnim    = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  const resumo = useMemo(() => {
    const total       = ferramentas.length;
    const emUso       = ferramentas.filter(f => f.status === 'Em uso').length;
    const disponiveis = ferramentas.filter(f => f.status === 'Disponível').length;
    const manutencao  = ferramentas.filter(f => f.status === 'Em manutenção').length;
    const ocupacao    = total ? Math.round((emUso / total) * 100) : 0;
    return { total, emUso, disponiveis, manutencao, ocupacao };
  }, [ferramentas]);

  // Extraímos o carregamento para poder usar no Pull-to-Refresh
  const carregarDados = async () => {
    try {
      setLoading(true);
      const [ferramentasApi, relatorio] = await Promise.all([
        apiClient.listarFerramentas(),
        apiClient.listarRelatoriosMovimentacoes(),
      ]);
      setFerramentas(ferramentasApi);
      setMovimentacoesCount(Array.isArray(relatorio) ? relatorio.length : 0);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível carregar os dados do relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.stagger(80, [
        Animated.spring(stat1Anim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(stat2Anim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.spring(stat3Anim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();

    setTimeout(() => {
      Animated.stagger(100, [
        Animated.spring(card1Anim, { toValue: 1, tension: 100, friction: 12, useNativeDriver: true }),
        Animated.spring(card2Anim, { toValue: 1, tension: 100, friction: 12, useNativeDriver: true }),
      ]).start();
      Animated.timing(barAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, 500);

    carregarDados();
  }, []);

  // Função disparada no Pull-to-Refresh ou pelo botão do cabeçalho
  const onRefresh = async () => {
    setRefreshing(true);
    await carregarDados();
    setRefreshing(false);
  };

  const showToast = (msg: string) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: '' }), 3200);
  };

  // Melhoria no botão de Baixar: Agora permite escolher entre PDF e Excel
  const promptExportarRelatorio = () => {
    setModalFormatoVisible(true);
  };

  const processarExportacao = async (formato: 'excel' | 'pdf') => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();

    try {
      setExporting(true);
      const path = await apiClient.baixarRelatorio(formato);
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(path);
        showToast(`Relatório em ${formato.toUpperCase()} gerado com sucesso!`);
      } else {
        Alert.alert('Aviso', 'Compartilhamento não disponível neste dispositivo.');
      }
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível gerar o arquivo.');
    } finally {
      setExporting(false);
    }
  };

  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      <SafeAreaView style={s.headerZone} edges={['top']}>
        <View style={s.dotGrid} pointerEvents="none">
          {Array.from({ length: 16 }).map((_, i) => (
            <View key={i} style={s.dot} />
          ))}
        </View>

        <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTY }] }]}>
          <View style={s.headerTop}>
            <View style={{ flexShrink: 1 }}>
              <Text style={s.headerTitle}>Relatórios</Text>
              <Text style={s.headerSub}>
                Painel gerencial · Almoxarife · {movimentacoesCount} movimentação{movimentacoesCount === 1 ? '' : 'es'}
              </Text>
            </View>
            
            {/* NOVO: Ações no topo (Live Pill + Botão Refresh) */}
            <View style={s.headerActions}>
              <View style={s.livePill}>
                <Animated.View style={[s.liveDot, { opacity: headerAnim }]} />
                <Text style={s.liveText}>Ao vivo</Text>
              </View>
              <TouchableOpacity style={s.refreshBtn} onPress={onRefresh} disabled={loading || refreshing}>
                {refreshing ? <ActivityIndicator size="small" color={D.white} /> : <RefreshIcon color={D.white} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.statsBar}>
            <StatBox value={resumo.total}       label="Total"       anim={stat1Anim} />
            <View style={s.statsDivider} />
            <StatBox value={resumo.disponiveis} label="Disponíveis" anim={stat2Anim} />
            <View style={s.statsDivider} />
            <StatBox value={resumo.emUso}       label="Em uso"      anim={stat3Anim} />
          </View>
        </Animated.View>
      </SafeAreaView>

      <View style={s.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.bodyContent, { paddingBottom: 100 }]}
          refreshControl={ // NOVO: Pull to refresh adicionado
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={D.orange}
              colors={[D.orange]}
            />
          }
        >
          {loading && !refreshing && (
            <View style={s.loadingOverlay}>
              <ActivityIndicator color={D.orange} size="large" />
              <Text style={s.loadingText}>Carregando informações do relatório...</Text>
            </View>
          )}

          <View style={s.section}>
            <SectionHeader label="Distribuição" count={resumo.total} color={D.orange} />
            <View style={s.metricsRow}>
              <MetricCard
                label="Disponíveis" value={resumo.disponiveis} sub="prontas p/ uso"
                color={D.green} anim={card1Anim}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M20 6L9 17L4 12" stroke={D.green} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              />
              <MetricCard
                label="Em uso" value={resumo.emUso} sub="alocadas agora"
                color={D.red} anim={card2Anim}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={8} r={4} stroke={D.red} strokeWidth={1.8} /><Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={D.red} strokeWidth={1.8} strokeLinecap="round" /></Svg>}
              />
              <MetricCard
                label="Manutenção" value={resumo.manutencao} sub="fora de serviço"
                color={D.amber} anim={card2Anim}
                icon={<Svg width={20} height={20} viewBox="0 0 24 24" fill="none"><Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v4l3 3" stroke={D.amber} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
              />
            </View>
          </View>

          <View style={s.section}>
            <SectionHeader label="Taxa de ocupação" count={resumo.ocupacao} color={D.red} />
            <View style={s.occCard}>
              <View style={s.occTop}>
                <View style={s.occPctWrap}>
                  <Text style={s.occPct}>{resumo.ocupacao}%</Text>
                  <Text style={s.occPctLabel}>ocupação</Text>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={s.occDesc}>das ferramentas do inventário estão atualmente alocadas para colaboradores.</Text>
                </View>
              </View>
              <OccupancyBar pct={resumo.ocupacao} anim={barAnim} />
              <View style={s.occLegend}>
                {[
                  { color: D.red,   label: 'Em uso' },
                  { color: D.green, label: 'Disponível' },
                  { color: D.amber, label: 'Manutenção' },
                ].map(({ color, label }) => (
                  <View key={label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: color }]} />
                    <Text style={s.legendText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={s.section}>
            <SectionHeader label="Inventário detalhado" count={ferramentas.length} color={D.green} />
            {ferramentas.map((item, i) => (
              <ToolRow key={item.id} item={item} index={i} />
            ))}
          </View>
        </ScrollView>

        {/* Botão Flutuante Atualizado */}
        <Animated.View style={[s.exportFab, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity style={s.exportBtn} onPress={promptExportarRelatorio} disabled={exporting} activeOpacity={0.87}>
            {exporting ? (
              <ActivityIndicator color={D.white} size="small" />
            ) : (
              <>
                <DownloadIcon size={20} color={D.white} />
                <View>
                  <Text style={s.exportLabel}>Baixar Relatório</Text>
                  <Text style={s.exportSub}>Escolha entre PDF ou Excel</Text>
                </View>
                <View style={s.exportArrow}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Path d="M5 12h14M12 5l7 7-7 7" stroke={D.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* NOVO MODAL DE ESCOLHA DE FORMATO */}
      <Modal visible={modalFormatoVisible} transparent animationType="fade" onRequestClose={() => setModalFormatoVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: D.white, width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 }}>
            
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: D.orangeDim, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <DownloadIcon size={26} color={D.orange} />
            </View>
            
            <Text style={{ fontSize: 20, fontWeight: '900', color: D.black, marginBottom: 8, letterSpacing: -0.5 }}>Exportar Relatório</Text>
            <Text style={{ fontSize: 14, color: D.gray500, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
              Escolha em qual formato você deseja baixar o inventário atual do almoxarifado.
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: D.red, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: D.red, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                onPress={() => { setModalFormatoVisible(false); processarExportacao('pdf'); }}
                activeOpacity={0.8}
              >
                <Text style={{ color: D.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>GERAR PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: D.green, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: D.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                onPress={() => { setModalFormatoVisible(false); processarExportacao('excel'); }}
                activeOpacity={0.8}
              >
                <Text style={{ color: D.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>GERAR EXCEL</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ marginTop: 24, paddingVertical: 10, width: '100%', alignItems: 'center' }}
              onPress={() => setModalFormatoVisible(false)}
            >
              <Text style={{ color: D.gray500, fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast message={toast.msg} visible={toast.visible} />
    </View>
  );
}

// ─── Styles da tela principal ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: D.orange },
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  dotGrid: {
    position: 'absolute', right: 20, top: 20,
    flexDirection: 'row', flexWrap: 'wrap', width: 72, gap: 8, opacity: 0.18,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },
  header:    { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 8 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 99,
    paddingVertical: 7, paddingHorizontal: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginTop: 4,
  },
  liveDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#5CFF9A' },
  liveText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  refreshBtn: { 
    width: 36, height: 36, borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.12)', 
    alignItems: 'center', justifyContent: 'center', 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', 
    marginTop: 4 
  },

  statsBar:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.14)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6 },
  statsDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  body:        { flex: 1, backgroundColor: D.offWhite, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20 },
  section:     { marginBottom: 8 },
  loadingOverlay: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  loadingText: { marginTop: 14, fontSize: 13, color: D.gray500, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 9, marginBottom: 8 },
  occCard: {
    backgroundColor: D.white, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: D.gray200, gap: 14,
  },
  occTop:      { flexDirection: 'row', gap: 16, alignItems: 'center' },
  occPctWrap:  { alignItems: 'center' },
  occPct:      { fontSize: 36, fontWeight: '900', color: D.red, letterSpacing: -1.5 },
  occPctLabel: { fontSize: 10, color: D.gray400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: -2 },
  occDesc:     { fontSize: 13, color: D.gray500, lineHeight: 20 },
  occLegend:   { flexDirection: 'row', gap: 18 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 7, height: 7, borderRadius: 3.5 },
  legendText:  { fontSize: 11, color: D.gray500, fontWeight: '500' },
  exportFab: { position: 'absolute', bottom: 28, left: 20, right: 20, zIndex: 200 },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.orange, borderRadius: 18,
    paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: D.orangeDark, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38, shadowRadius: 18, elevation: 10,
  },
  exportLabel: { fontSize: 15, fontWeight: '800', color: D.white },
  exportSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  exportArrow: {
    marginLeft: 'auto', width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
});