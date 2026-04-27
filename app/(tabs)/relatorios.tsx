/**
 * app/(tabs)/relatorios.tsx — Redesenhado
 * Design System Marilan v2 · Flat Design 2.0
 */

import React, { useMemo } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  primary: '#FF823A',
  primaryDim: '#FFF0E6',
  primaryDark: '#D9621A',
  white: '#FFFFFF',
  pageBg: '#F5F5F7',
  textPrimary: '#1A1A1F',
  textSecondary: '#6B6B7A',
  textTertiary: '#A0A0AE',
  textInverse: '#FFFFFF',
  borderLight: '#EBEBEF',
  statusGreen: '#2D9A5F',
  statusGreenBg: '#EEF8F3',
  statusGreenText: '#1A6B3F',
  statusRed: '#E53535',
  statusRedBg: '#FFF1F1',
  statusRedText: '#9B1F1F',
  statusAmber: '#D97706',
  statusAmberBg: '#FFFBEB',
  statusAmberText: '#92460A',
  radius: { sm: 8, md: 12, lg: 16, xl: 20, full: 999 },
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_FERRAMENTAS = [
  { ID: 1, Nome: 'Furadeira de Impacto',     Codigo: 'FRR-0001', Status: 'Disponível',    'Alocado Para': '—'           },
  { ID: 2, Nome: 'Esmerilhadeira Angular',   Codigo: 'FRR-0002', Status: 'Em uso',         'Alocado Para': 'Carlos Mendes' },
  { ID: 3, Nome: 'Serra Circular',           Codigo: 'FRR-0003', Status: 'Em uso',         'Alocado Para': 'Ana Souza'   },
  { ID: 4, Nome: 'Chave Inglesa 12"',        Codigo: 'FRR-0004', Status: 'Em manutenção',  'Alocado Para': '—'           },
  { ID: 5, Nome: 'Parafusadeira Sem Fio',    Codigo: 'FRR-0005', Status: 'Disponível',    'Alocado Para': '—'           },
  { ID: 6, Nome: 'Nível a Laser',            Codigo: 'FRR-0006', Status: 'Em uso',         'Alocado Para': 'João Lima'   },
];

type Status = 'Disponível' | 'Em uso' | 'Em manutenção';

const STATUS_CONFIG: Record<Status, { color: string; bg: string; text: string }> = {
  'Disponível':    { color: T.statusGreen,  bg: T.statusGreenBg,  text: T.statusGreenText  },
  'Em uso':        { color: T.statusRed,    bg: T.statusRedBg,    text: T.statusRedText    },
  'Em manutenção': { color: T.statusAmber,  bg: T.statusAmberBg,  text: T.statusAmberText  },
};

// ─── Badge de Status ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as Status] ?? { color: T.textTertiary, bg: T.pageBg, text: T.textSecondary };
  return (
    <View style={[badgeS.pill, { backgroundColor: cfg.bg }]}>
      <View style={[badgeS.dot, { backgroundColor: cfg.color }]} />
      <Text style={[badgeS.label, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}
const badgeS = StyleSheet.create({
  pill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: T.radius.full },
  dot:   { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 11, fontWeight: '600' },
});

// ─── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, icon }: {
  label: string; value: number; color: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={metS.card}>
      <View style={[metS.iconBox, { backgroundColor: `${color}18` }]}>{icon}</View>
      <Text style={metS.value}>{value}</Text>
      <Text style={metS.label}>{label}</Text>
    </View>
  );
}
const metS = StyleSheet.create({
  card: { flex: 1, backgroundColor: T.white, borderRadius: T.radius.lg, padding: 16, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: T.borderLight },
  iconBox: { width: 40, height: 40, borderRadius: T.radius.md, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 26, fontWeight: '700', color: T.textPrimary, letterSpacing: -0.5 },
  label: { fontSize: 11, color: T.textSecondary, fontWeight: '500', textAlign: 'center' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const resumo = useMemo(() => ({
    total:       MOCK_FERRAMENTAS.length,
    emUso:       MOCK_FERRAMENTAS.filter(f => f.Status === 'Em uso').length,
    disponiveis: MOCK_FERRAMENTAS.filter(f => f.Status === 'Disponível').length,
    manutencao:  MOCK_FERRAMENTAS.filter(f => f.Status === 'Em manutenção').length,
    ocupacao:    Math.round((MOCK_FERRAMENTAS.filter(f => f.Status === 'Em uso').length / MOCK_FERRAMENTAS.length) * 100),
  }), []);

  const exportarExcel = async () => {
    try {
      const ws = XLSX.utils.json_to_sheet(MOCK_FERRAMENTAS);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventário');
      const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) { Alert.alert('Erro', 'Diretório temporário não encontrado.'); return; }
      const path = cacheDir + 'Inventario_Ferramentas.xlsx';
      await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
      const ok = await Sharing.isAvailableAsync();
      if (ok) await Sharing.shareAsync(path);
      else Alert.alert('Aviso', 'Compartilhamento não disponível neste dispositivo.');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível gerar a planilha.');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.primary} />

      <SafeAreaView style={s.headerBg} edges={['top']}>
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Relatórios</Text>
            <Text style={s.headerSub}>Painel gerencial · Almoxarife</Text>
          </View>
          <View style={s.headerBadge}>
            <Text style={s.headerBadgeLabel}>Ao vivo</Text>
            <View style={s.liveDot} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={s.body} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false}>

        {/* Métricas */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Resumo do Inventário</Text>
          <View style={s.metricsRow}>
            <MetricCard label="Total" value={resumo.total} color={T.primary}
              icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={T.primary} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg>} />
            <MetricCard label="Disponíveis" value={resumo.disponiveis} color={T.statusGreen}
              icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M20 6L9 17L4 12" stroke={T.statusGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>} />
          </View>
          <View style={[s.metricsRow, { marginTop: 10 }]}>
            <MetricCard label="Em uso" value={resumo.emUso} color={T.statusRed}
              icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={8} r={4} stroke={T.statusRed} strokeWidth={1.8} /><Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={T.statusRed} strokeWidth={1.8} strokeLinecap="round" /></Svg>} />
            <MetricCard label="Manutenção" value={resumo.manutencao} color={T.statusAmber}
              icon={<Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 8v4l3 3" stroke={T.statusAmber} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>} />
          </View>
        </View>

        {/* Taxa de ocupação */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Taxa de Ocupação</Text>
          <View style={s.occupancyCard}>
            <View style={s.occupancyRow}>
              <Text style={s.occupancyPct}>{resumo.ocupacao}%</Text>
              <Text style={s.occupancyDesc}>das ferramentas estão em uso no momento</Text>
            </View>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${resumo.ocupacao}%` }]} />
            </View>
            <View style={s.barLegend}>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: T.statusRed }]} /><Text style={s.legendLabel}>Em uso</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: T.statusGreen }]} /><Text style={s.legendLabel}>Disponível</Text></View>
              <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: T.statusAmber }]} /><Text style={s.legendLabel}>Manutenção</Text></View>
            </View>
          </View>
        </View>

        {/* Lista */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Inventário Detalhado</Text>
          <View style={s.tableCard}>
            {/* Header */}
            <View style={[s.tableRow, s.tableHeader]}>
              <Text style={[s.tableCell, s.thText, { flex: 2 }]}>Ferramenta</Text>
              <Text style={[s.tableCell, s.thText, { flex: 1, textAlign: 'right' }]}>Status</Text>
            </View>
            {/* Rows */}
            {MOCK_FERRAMENTAS.map((f, i) => (
              <View key={f.ID} style={[s.tableRow, i % 2 === 0 && s.tableRowAlt]}>
                <View style={{ flex: 2 }}>
                  <Text style={s.rowName} numberOfLines={1}>{f.Nome}</Text>
                  <Text style={s.rowCode}>{f.Codigo}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <StatusBadge status={f.Status} />
                  {f['Alocado Para'] !== '—' && (
                    <Text style={s.rowUser} numberOfLines={1}>{f['Alocado Para']}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Exportar */}
        <View style={s.section}>
          <TouchableOpacity style={s.exportBtn} onPress={exportarExcel} activeOpacity={0.82}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={T.white} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" stroke={T.white} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <View>
              <Text style={s.exportBtnLabel}>Exportar Inventário</Text>
              <Text style={s.exportBtnSub}>Salvar planilha Excel (.xlsx)</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.exportNote}>
            O arquivo incluirá ID, nome, código, status e colaborador responsável.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.primary },
  headerBg: { backgroundColor: T.primary },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: T.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: T.radius.full, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 },
  headerBadgeLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.statusGreen },

  body: { flex: 1, backgroundColor: T.pageBg, borderTopLeftRadius: T.radius.xl, borderTopRightRadius: T.radius.xl, marginTop: -20 },
  bodyContent: { paddingBottom: 48 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: T.textTertiary, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },

  metricsRow: { flexDirection: 'row', gap: 10 },

  // Ocupação
  occupancyCard: { backgroundColor: T.white, borderRadius: T.radius.lg, padding: 18, borderWidth: 1, borderColor: T.borderLight },
  occupancyRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  occupancyPct: { fontSize: 32, fontWeight: '700', color: T.primary, letterSpacing: -1 },
  occupancyDesc: { fontSize: 13, color: T.textSecondary, flex: 1, lineHeight: 19 },
  barTrack: { height: 8, backgroundColor: T.pageBg, borderRadius: T.radius.full, overflow: 'hidden', marginBottom: 12 },
  barFill: { height: '100%', backgroundColor: T.statusRed, borderRadius: T.radius.full },
  barLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendLabel: { fontSize: 11, color: T.textSecondary, fontWeight: '500' },

  // Tabela
  tableCard: { backgroundColor: T.white, borderRadius: T.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: T.borderLight },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: T.borderLight },
  tableCell: { fontSize: 12 },
  thText: { fontWeight: '700', color: T.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' },
  rowName: { fontSize: 13, fontWeight: '600', color: T.textPrimary, marginBottom: 2 },
  rowCode: { fontSize: 11, color: T.textTertiary },
  rowUser: { fontSize: 11, color: T.textTertiary, marginTop: 3, textAlign: 'right' },

  // Exportar
  exportBtn: { backgroundColor: T.primary, borderRadius: T.radius.md, height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14 },
  exportBtnLabel: { fontSize: 14, fontWeight: '700', color: T.white },
  exportBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  exportNote: { fontSize: 12, color: T.textTertiary, marginTop: 10, lineHeight: 17 },
});