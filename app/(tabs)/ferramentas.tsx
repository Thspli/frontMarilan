import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  orange: '#F26419',
  orangeLight: '#FF8C42',
  orangeDark: '#C94E0F',
  orangeGhost: 'rgba(242,100,25,0.08)',
  white: '#FFFFFF',
  offWhite: '#F7F8FA',
  gray100: '#F0F1F3',
  gray200: '#E2E4E8',
  gray400: '#B0B5BE',
  gray500: '#8A8F9E',
  gray700: '#4A4F5C',
  black: '#1A1C22',

  statusGreen: '#27AE60',
  statusGreenBg: 'rgba(39,174,96,0.10)',
  statusRed: '#E53935',
  statusRedBg: 'rgba(229,57,53,0.10)',
  statusAmber: '#F59E0B',
  statusAmberBg: 'rgba(245,158,11,0.10)',
};

// ─── Static Data ──────────────────────────────────────────────────────────────
type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  id: string;
  codigo: string;
  nome: string;
  status: ToolStatus;
  alocadoPara?: string;
}

const FERRAMENTAS: Ferramenta[] = [
  { id: '1', codigo: 'FRR-0001', nome: 'Furadeira de Impacto', status: 'Disponível' },
  { id: '2', codigo: 'FRR-0002', nome: 'Esmerilhadeira Angular', status: 'Em uso', alocadoPara: 'Carlos Mendes' },
  { id: '3', codigo: 'FRR-0003', nome: 'Serra Circular', status: 'Em manutenção' },
  { id: '4', codigo: 'FRR-0004', nome: 'Parafusadeira Elétrica', status: 'Disponível' },
  { id: '5', codigo: 'FRR-0005', nome: 'Lixadeira Orbital', status: 'Em uso', alocadoPara: 'Ana Paula' },
  { id: '6', codigo: 'FRR-0006', nome: 'Martelo Demolidor', status: 'Disponível' },
  { id: '7', codigo: 'FRR-0007', nome: 'Compressor de Ar', status: 'Em manutenção' },
  { id: '8', codigo: 'FRR-0008', nome: 'Nível a Laser', status: 'Disponível' },
  { id: '9', codigo: 'FRR-0009', nome: 'Policorte', status: 'Em uso', alocadoPara: 'Roberto Lima' },
  { id: '10', codigo: 'FRR-0010', nome: 'Chave de Impacto', status: 'Disponível' },
  { id: '11', codigo: 'FRR-0011', nome: 'Soprador Térmico', status: 'Em manutenção' },
  { id: '12', codigo: 'FRR-0012', nome: 'Serra Tico-Tico', status: 'Disponível' },
  { id: '13', codigo: 'FRR-0013', nome: 'Rotomartelo', status: 'Em uso', alocadoPara: 'Fernanda Costa' },
  { id: '14', codigo: 'FRR-0014', nome: 'Fresadora Manual', status: 'Disponível' },
  { id: '15', codigo: 'FRR-0015', nome: 'Bomba D\'água', status: 'Em manutenção' },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function SearchIcon({ color = C.gray400 }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ToolIcon({ color = C.orange }: { color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UserIcon({ color = C.orange }: { color?: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ClearIcon({ color = C.gray400 }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ToolStatus }) {
  const config = {
    'Disponível':     { color: C.statusGreen,  bg: C.statusGreenBg,  dot: C.statusGreen  },
    'Em uso':         { color: C.statusRed,    bg: C.statusRedBg,    dot: C.statusRed    },
    'Em manutenção':  { color: C.statusAmber,  bg: C.statusAmberBg,  dot: C.statusAmber  },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.badgeDot, { backgroundColor: config.dot }]} />
      <Text style={[styles.badgeText, { color: config.color }]}>{status}</Text>
    </View>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────
function ToolCard({ item }: { item: Ferramenta }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <ToolIcon />
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.toolName} numberOfLines={1}>{item.nome}</Text>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>ID</Text>
            <Text style={styles.metaValue}>{item.id}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>CÓD</Text>
            <Text style={styles.metaValue}>{item.codigo}</Text>
          </View>
        </View>

        {item.status === 'Em uso' && item.alocadoPara && (
          <View style={styles.allocRow}>
            <UserIcon color={C.statusRed} />
            <Text style={styles.allocText} numberOfLines={1}>
              {item.alocadoPara}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
const FILTERS: Array<ToolStatus | 'Todos'> = ['Todos', 'Disponível', 'Em uso', 'Em manutenção'];

function FilterTabs({
  active,
  onSelect,
  counts,
}: {
  active: string;
  onSelect: (f: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <View style={styles.filterRow}>
      {FILTERS.map((f) => {
        const isActive = active === f;
        return (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onSelect(f)}
            activeOpacity={0.7}>
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {f}
            </Text>
            {counts[f] !== undefined && (
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                  {counts[f]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FerramentasScreen() {
  const [query, setQuery]   = useState('');
  const [filter, setFilter] = useState<string>('Todos');

  const counts = useMemo(() => ({
    Todos:           FERRAMENTAS.length,
    'Disponível':    FERRAMENTAS.filter(f => f.status === 'Disponível').length,
    'Em uso':        FERRAMENTAS.filter(f => f.status === 'Em uso').length,
    'Em manutenção': FERRAMENTAS.filter(f => f.status === 'Em manutenção').length,
  }), []);

  const filtered = useMemo(() => {
    return FERRAMENTAS.filter(item => {
      const matchFilter = filter === 'Todos' || item.status === filter;
      const q = query.toLowerCase();
      const matchQuery =
        !q ||
        item.nome.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.id.includes(q) ||
        (item.alocadoPara?.toLowerCase().includes(q) ?? false);
      return matchFilter && matchQuery;
    });
  }, [query, filter]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Ferramentas</Text>
            <Text style={styles.headerSub}>{counts.Todos} itens cadastrados</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Disponível']}</Text>
              <Text style={styles.statLabel}>Disponíveis</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Em uso']}</Text>
              <Text style={styles.statLabel}>Em uso</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{counts['Em manutenção']}</Text>
              <Text style={styles.statLabel}>Manutenção</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={styles.body}>
        {/* Search */}
        <View style={styles.searchWrapper}>
          <SearchIcon color={query ? C.orange : C.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, código ou ID…"
            placeholderTextColor={C.gray400}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ClearIcon />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <FilterTabs active={filter} onSelect={setFilter} counts={counts} />

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ToolCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyTitle}>Nenhuma ferramenta encontrada</Text>
              <Text style={styles.emptyText}>Tente outro termo ou filtro.</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },
  headerSafe: { backgroundColor: C.orange },
  body: {
    flex: 1,
    backgroundColor: C.offWhite,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingTop: 20,
  },

  // Header
  header: {
    backgroundColor: C.orange,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: C.orangeLight, opacity: 0.22,
    top: -50, right: -40,
  },
  circle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.orangeDark, opacity: 0.18,
    top: 10, left: -20,
  },
  headerContent: { marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500', textAlign: 'center' },
  statSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.black,
    paddingVertical: 0,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.gray200,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: C.orange,
    borderColor: C.orange,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.gray500,
  },
  filterChipTextActive: { color: C.white },
  filterCount: {
    backgroundColor: C.gray100,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: C.gray500 },
  filterCountTextActive: { color: C.white },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  // Card
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {},
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.orangeGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 6 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: C.black,
  },

  // Meta
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gray400,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.gray700,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.gray200,
    marginHorizontal: 10,
  },

  // Alloc
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.statusRedBg,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  allocText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.statusRed,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Empty
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.gray700 },
  emptyText: { fontSize: 14, color: C.gray500 },
});