/**
 * app/(tabs)/almoxarifado-new.tsx (Refactored)
 * Tela de Almoxarifado / Retirada - Integração com API Real
 * Gerenciado por: Almoxarife
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { apiClient } from '../../services/api';
import { nfcService } from '../../services/nfc';

// ─── Theme ─────────────────────────────────────────────────────────────────────
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
  amber: '#F59E0B',
  amberBg: 'rgba(245,158,11,0.10)',
  green: '#27AE60',
  greenBg: 'rgba(39,174,96,0.10)',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ToolStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: ToolStatus;
}

interface ToolNoCarrinho extends Ferramenta {
  qtd: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = ({ color = C.gray400 }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
    <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ClearIcon = ({ color = C.gray400 }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ToolIcon = ({ color = C.orange, size = 20 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon = ({ color = C.orange }: { color?: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H5H21M8 6V4C8 3.4 8.4 3 9 3H15C15.6 3 16 3.4 16 4V6M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6H19Z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Toast Component ──────────────────────────────────────────────────────────
function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2200),
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[toastStyles.container, { opacity }]} pointerEvents="none">
      <Text style={toastStyles.icon}>✅</Text>
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: C.black,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
  },
  icon: { fontSize: 20 },
  text: { color: C.white, fontSize: 14, fontWeight: '600', flex: 1 },
});

// ─── NFC Reading Modal ────────────────────────────────────────────────────────
interface NFCModalProps {
  visible: boolean;
  loading: boolean;
  lastTagRead: string | null;
  onClose: () => void;
  onAddTool: (codigo: string) => void;
}

function NFCReadingModal({ visible, loading, lastTagRead, onClose, onAddTool }: NFCModalProps) {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 300, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      nfcService.stop();
    });
  };

  const handleAdd = () => {
    if (lastTagRead) {
      onAddTool(lastTagRead);
      handleClose();
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[nfcModalStyles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />

        <Animated.View style={[nfcModalStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={nfcModalStyles.handle} />

          <View style={nfcModalStyles.content}>
            <View style={nfcModalStyles.header}>
              <Text style={nfcModalStyles.title}>Ler Ferramenta (NFC)</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 6L6 18M6 6l12 12" stroke={C.gray500} strokeWidth={2} strokeLinecap="round" />
                </Svg>
              </TouchableOpacity>
            </View>

            {loading ? (
              <>
                <View style={nfcModalStyles.iconBox}>
                  <ActivityIndicator size="large" color={C.orange} />
                </View>
                <Text style={nfcModalStyles.subtitle}>Aproxime o telefone da ferramenta ou crachá...</Text>
              </>
            ) : lastTagRead ? (
              <>
                <View style={[nfcModalStyles.iconBox, { backgroundColor: C.greenBg }]}>
                  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                    <Path d="M20 6L9 17L4 12" stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <Text style={nfcModalStyles.subtitle}>Ferramenta Lida!</Text>
                <Text style={nfcModalStyles.codeDisplay}>{lastTagRead}</Text>

                <TouchableOpacity style={nfcModalStyles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
                  <PlusIcon />
                  <Text style={nfcModalStyles.addBtnText}>Adicionar ao Carrinho</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const nfcModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 30 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray200, alignSelf: 'center', marginTop: 12, marginBottom: 12 },
  content: { paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', minHeight: 280 },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: C.black },
  iconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  subtitle: { fontSize: 16, fontWeight: '600', color: C.gray700, textAlign: 'center', marginTop: 12 },
  codeDisplay: { fontSize: 18, fontWeight: '700', color: C.orange, marginTop: 16, marginBottom: 20, letterSpacing: 1 },
  addBtn: { width: '100%', height: 48, backgroundColor: C.orange, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  addBtnText: { fontSize: 15, fontWeight: '700', color: C.white },
});

// ─── Tool Card for Carrinho ───────────────────────────────────────────────────
interface ToolCarrinhoCardProps {
  item: ToolNoCarrinho;
  onRemove: (codigo: string) => void;
  onChangeQty: (codigo: string, qty: number) => void;
}

function ToolCarrinhoCard({ item, onRemove, onChangeQty }: ToolCarrinhoCardProps) {
  return (
    <View style={carrinhoCardStyles.card}>
      <View style={carrinhoCardStyles.left}>
        <View style={carrinhoCardStyles.iconBox}>
          <ToolIcon />
        </View>
      </View>

      <View style={carrinhoCardStyles.middle}>
        <Text style={carrinhoCardStyles.toolName}>{item.nome}</Text>
        <View style={carrinhoCardStyles.metaRow}>
          <Text style={carrinhoCardStyles.metaLabel}>CÓD: {item.codigo}</Text>
          <Text style={carrinhoCardStyles.metaLabel}>·  {item.categoria}</Text>
        </View>
      </View>

      <View style={carrinhoCardStyles.right}>
        <View style={carrinhoCardStyles.qtyControl}>
          <TouchableOpacity onPress={() => onChangeQty(item.codigo, Math.max(1, item.qtd - 1))} style={carrinhoCardStyles.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={carrinhoCardStyles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={carrinhoCardStyles.qtyValue}>{item.qtd}</Text>
          <TouchableOpacity onPress={() => onChangeQty(item.codigo, item.qtd + 1)} style={carrinhoCardStyles.qtyBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={carrinhoCardStyles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => onRemove(item.codigo)} style={carrinhoCardStyles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <TrashIcon color={C.orange} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const carrinhoCardStyles = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: {},
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1 },
  toolName: { fontSize: 13, fontWeight: '700', color: C.black },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  metaLabel: { fontSize: 11, color: C.gray500 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gray100, borderRadius: 8, paddingHorizontal: 4, gap: 4 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: '700', color: C.orange },
  qtyValue: { fontSize: 12, fontWeight: '700', color: C.black, minWidth: 20, textAlign: 'center' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [ferramentasDisp, setFerramentasDisp] = useState<Ferramenta[]>([]);
  const [carrinho, setCarrinho] = useState<ToolNoCarrinho[]>([]);
  const [query, setQuery] = useState('');
  const [nfcModalVisible, setNfcModalVisible] = useState(false);
  const [nfcLoading, setNfcLoading] = useState(false);
  const [lastTagRead, setLastTagRead] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userCracha, setUserCracha] = useState<string | null>(null);
  const [codigoManu, setCodigoManu] = useState('');

  useEffect(() => {
    loadFerramentas();
  }, []);

  const loadFerramentas = async () => {
    try {
      setIsLoading(true);
      const cracha = await AsyncStorage.getItem('userCracha');
      setUserCracha(cracha);

      const data = await apiClient.listarFerramentas();
      const disponiveis = data.filter(f => f.status === 'Disponível');
      setFerramentasDisp(disponiveis || []);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao carregar ferramentas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNFCModalOpen = async () => {
    setNfcModalVisible(true);
    setNfcLoading(true);
    setLastTagRead(null);

    try {
      const result = await nfcService.readTag();
      if (result.success && result.data) {
        setLastTagRead(result.data);
      } else {
        showToast('Falha ao ler NFC');
      }
    } catch (error: any) {
      console.error('NFC error:', error);
    } finally {
      setNfcLoading(false);
    }
  };

  const handleAddToolToCarrinho = (codigo: string) => {
    const existe = carrinho.find(t => t.codigo === codigo);
    if (existe) {
      handleChangeQty(codigo, existe.qtd + 1);
    } else {
      const ferramenta = ferramentasDisp.find(f => f.codigo === codigo);
      if (ferramenta) {
        setCarrinho([...carrinho, { ...ferramenta, qtd: 1 }]);
      }
    }
  };

  const handleAddToolByCode = () => {
    if (codigoManu.trim()) {
      handleAddToolToCarrinho(codigoManu.trim());
      setCodigoManu('');
      showToast('Ferramenta adicionada ao carrinho');
    }
  };

  const handleRemoveTool = (codigo: string) => {
    setCarrinho(carrinho.filter(t => t.codigo !== codigo));
  };

  const handleChangeQty = (codigo: string, qty: number) => {
    setCarrinho(carrinho.map(t => (t.codigo === codigo ? { ...t, qtd: qty } : t)));
  };

  const handleSubmitCarrinho = async () => {
    if (carrinho.length === 0) {
      Alert.alert('Carrinho Vazio', 'Adicione ferramentas antes de confirmar');
      return;
    }

    try {
      setIsSubmitting(true);
      const crachaManu = await AsyncStorage.getItem('userCracha');
      if (!crachaManu) throw new Error('Crachá do almoxarife não encontrado');

      // Solicitar crachá do colaborador
      Alert.prompt('Crachá do Colaborador', 'Digite o número do crachá do colaborador:', [
        {
          text: 'Cancelar',
          onPress: () => setIsSubmitting(false),
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async (crachColaborador: string | undefined) => {
            if (!crachColaborador) {
              setIsSubmitting(false);
              return;
            }

            try {
              const response = await apiClient.retirar({
                cracha_colaborador: crachColaborador,
                ferramentas: carrinho.map(f => ({
                  codigo: f.codigo,
                  qtd: f.qtd,
                  checklist: 'REALIZADO',
                  observacao: 'Retirada via NFC',
                })),
              });

              setCarrinho([]);
              showToast(`✅ Retirada registrada com sucesso!`);
              await loadFerramentas();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Erro ao processar retirada');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
      setIsSubmitting(false);
    }
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 3000);
  };

  const filtered = ferramentasDisp.filter(item => {
    const q = query.toLowerCase();
    return !q || item.nome.toLowerCase().includes(q) || item.codigo.toLowerCase().includes(q);
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={{ marginTop: 12, color: C.gray500 }}>Carregando ferramentas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.orange} />

      {/* Header */}
      <SafeAreaView style={styles.headerSafe} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Almoxarifado</Text>
            <Text style={styles.headerSub}>Retirada de Ferramentas</Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{ferramentasDisp.length}</Text>
              <Text style={styles.statLabel}>Disponíveis</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{carrinho.length}</Text>
              <Text style={styles.statLabel}>No Carrinho</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={styles.body}>
        {carrinho.length > 0 && (
          <View style={styles.carrinhoSection}>
            <View style={styles.carrinhoHeader}>
              <Text style={styles.carrinhoTitle}>Carrinho de Retirada ({carrinho.length})</Text>
              {carrinho.length > 0 && (
                <TouchableOpacity onPress={() => setCarrinho([])}>
                  <Text style={styles.limparLink}>Limpar</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={carrinho}
              keyExtractor={item => item.codigo}
              renderItem={({ item }) => <ToolCarrinhoCard item={item} onRemove={handleRemoveTool} onChangeQty={handleChangeQty} />}
              scrollEnabled={false}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitCarrinho} disabled={isSubmitting} activeOpacity={0.8}>
              {isSubmitting ? <ActivityIndicator color={C.white} size="small" /> : <Text style={styles.submitBtnText}>Confirmar Retirada</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Search & Add */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>Adicionar Ferramentas</Text>
          <View style={styles.searchWrapper}>
            <SearchIcon color={query ? C.orange : C.gray400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ferramenta..."
              placeholderTextColor={C.gray400}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ClearIcon />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="Ou digite o código..."
              placeholderTextColor={C.gray400}
              value={codigoManu}
              onChangeText={setCodigoManu}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.codeBtn} onPress={handleAddToolByCode} activeOpacity={0.8}>
              <Text style={styles.codeBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.nfcBtn} onPress={handleNFCModalOpen} activeOpacity={0.8}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2Z" stroke={C.white} strokeWidth={1.5} strokeLinecap="round" />
              <Path d="M8.5 8.5C9.8 7.2 11.6 6.5 13.5 6.5" stroke={C.white} strokeWidth={1.8} strokeLinecap="round" />
              <Path d="M6.5 6.5C8.3 4.7 10.8 3.5 13.5 3.5" stroke={C.white} strokeWidth={1.8} strokeLinecap="round" strokeOpacity={0.4} />
            </Svg>
            <Text style={styles.nfcBtnText}>Ler com NFC</Text>
          </TouchableOpacity>
        </View>

        {/* Ferramenta List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Ferramentas Disponíveis ({filtered.length})</Text>
          <FlatList
            data={filtered}
            keyExtractor={item => item.codigo}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.toolItem} onPress={() => handleAddToolToCarrinho(item.codigo)} activeOpacity={0.7}>
                <View style={styles.toolItemIcon}>
                  <ToolIcon />
                </View>
                <View style={styles.toolItemBody}>
                  <Text style={styles.toolItemName}>{item.nome}</Text>
                  <Text style={styles.toolItemCode}>{item.codigo}  ·  {item.categoria}</Text>
                </View>
                <PlusIcon />
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.empty}>Nenhuma ferramenta encontrada</Text>}
          />
        </View>
      </View>

      {/* NFC Modal */}
      <NFCReadingModal visible={nfcModalVisible} loading={nfcLoading} lastTagRead={lastTagRead} onClose={() => setNfcModalVisible(false)} onAddTool={handleAddToolToCarrinho} />

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.orange },
  headerSafe: { backgroundColor: C.orange },
  header: { paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500' },

  body: { flex: 1, backgroundColor: C.offWhite, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },

  carrinhoSection: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100, padding: 16 },
  carrinhoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  carrinhoTitle: { fontSize: 14, fontWeight: '700', color: C.black },
  limparLink: { fontSize: 12, color: C.orange, fontWeight: '600' },
  submitBtn: { marginTop: 12, height: 48, backgroundColor: C.orange, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  controlsSection: { padding: 16, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.gray100, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.gray700, letterSpacing: 0.3 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.offWhite, borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.black, paddingVertical: 0 },

  inputRow: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1, backgroundColor: C.offWhite, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14, color: C.black },
  codeBtn: { backgroundColor: C.amber, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  codeBtnText: { fontSize: 12, fontWeight: '700', color: C.black },

  nfcBtn: { height: 48, backgroundColor: C.orange, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nfcBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  listSection: { padding: 16, flex: 1 },
  toolItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  toolItemIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.orangeGhost, alignItems: 'center', justifyContent: 'center' },
  toolItemBody: { flex: 1 },
  toolItemName: { fontSize: 13, fontWeight: '700', color: C.black },
  toolItemCode: { fontSize: 11, color: C.gray500, marginTop: 2 },
  empty: { textAlign: 'center', color: C.gray500, fontSize: 14, marginTop: 20 },
});
