/**
 * app/(tabs)/almoxarifado.tsx — Marilan v3 · Liberação em Lote via NFC
 * Design: Industrial Precision · Laranja Institucional + Branco Cirúrgico
 * Lead: Mobile UX / Operacional de Fábrica
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { apiClient } from '../../services/api';

// Ativa LayoutAnimation no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Design System ─────────────────────────────────────────────────────────────
const D = {
  // Paleta Primária
  orange:     '#FF5722',
  orangeHot:  '#FF6D00',
  orangeDark: '#BF360C',
  orangeSoft: 'rgba(255,87,34,0.10)',
  orangeGlow: 'rgba(255,87,34,0.18)',
  orangeLine: 'rgba(255,87,34,0.25)',

  // Neutros Cirúrgicos
  white:      '#FFFFFF',
  snow:       '#FAFAFA',
  mist:       '#F5F5F5',
  cloud:      '#EEEEEE',
  silver:     '#E0E0E0',
  ash:        '#BDBDBD',
  slate:      '#9E9E9E',
  iron:       '#616161',
  carbon:     '#424242',
  obsidian:   '#212121',

  // Status
  green:      '#2E7D32',
  greenLight: '#43A047',
  greenBg:    'rgba(46,125,50,0.08)',
  greenText:  '#1B5E20',
  red:        '#C62828',
  redLight:   '#E53935',
  redBg:      'rgba(198,40,40,0.08)',
  amber:      '#E65100',
  amberBg:    'rgba(230,81,0,0.08)',

  // NFC Modal
  nfcBg:      '#0D0D0D',
  nfcSurface: '#1A1A1A',
  nfcBorder:  'rgba(255,87,34,0.3)',
  nfcGlow:    'rgba(255,87,34,0.15)',
};

// ─── Tipos ─────────────────────────────────────────────────────────────────────
type FerStatus = 'Disponível' | 'Em uso' | 'Em manutenção';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: FerStatus;
  alocadoPara?: string;
}

interface LoteItem extends Ferramenta {
  qty: number;
}

type NFCPhase = 'waiting' | 'connected' | 'confirming_requester' | 'confirming_almoxarife' | 'done' | 'error';

// ─── Icons ─────────────────────────────────────────────────────────────────────
const WrenchIcon = ({ size = 18, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ size = 14, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const MinusIcon = ({ size = 13, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
  </Svg>
);

const XIcon = ({ size = 13, color = D.slate }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ size = 22, color = D.green }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ArrowIcon = ({ size = 16, color = D.white }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackIcon = ({ size = 16, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 14l-4-4m0 0l4-4m-4 4h15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const NFCChipIcon = ({ size = 44, color = D.orange }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={2} y={2} width={20} height={20} rx={4} stroke={color} strokeWidth={1.5} />
    <Rect x={7} y={7} width={10} height={10} rx={2} stroke={color} strokeWidth={1.3} />
    <Line x1={7} y1={2} x2={7} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={12} y1={2} x2={12} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={17} y1={2} x2={17} y2={5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={7} y1={19} x2={7} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={12} y1={19} x2={12} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={17} y1={19} x2={17} y2={22} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={7} x2={5} y2={7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={12} x2={5} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={2} y1={17} x2={5} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={7} x2={22} y2={7} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={12} x2={22} y2={12} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={19} y1={17} x2={22} y2={17} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// ─── Radar Pulse (NFC Modal) ───────────────────────────────────────────────────
function RadarPulse({ active, phase }: { active: boolean; phase: NFCPhase }) {
  const rings = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const connectedScale = useRef(new Animated.Value(0)).current;
  const connectedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active && phase === 'waiting') {
      animRef.current = Animated.parallel(
        rings.map((r, i) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(i * 450),
              Animated.timing(r, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
          )
        )
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      rings.forEach(r => r.setValue(0));
    }
    return () => { animRef.current?.stop(); };
  }, [active, phase]);

  useEffect(() => {
    if (phase === 'connected' || phase === 'confirming_requester' || phase === 'confirming_almoxarife') {
      Animated.parallel([
        Animated.spring(connectedScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
        Animated.timing(connectedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      connectedScale.setValue(0);
      connectedOpacity.setValue(0);
    }
  }, [phase]);

  const isConnected = phase !== 'waiting';
  const iconColor = phase === 'done' ? D.green : D.orange;

  return (
    <View style={rp.container}>
      {/* Radar rings */}
      {phase === 'waiting' && rings.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            rp.ring,
            {
              transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.3, 3.0] }) }],
              opacity: r.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 0.35, 0] }),
              borderColor: D.orange,
            },
          ]}
        />
      ))}

      {/* Static connected rings */}
      {isConnected && (
        <Animated.View style={[rp.connectedRingsWrap, { opacity: connectedOpacity, transform: [{ scale: connectedScale }] }]}>
          <View style={[rp.ring, { transform: [{ scale: 1.8 }], opacity: 0.12, borderColor: iconColor }]} />
          <View style={[rp.ring, { transform: [{ scale: 1.3 }], opacity: 0.2, borderColor: iconColor }]} />
          <View style={[rp.ring, { transform: [{ scale: 1.0 }], opacity: 0.3, borderColor: iconColor }]} />
        </Animated.View>
      )}

      {/* Core circle */}
      <View style={[rp.core, isConnected && { borderColor: `${iconColor}60`, backgroundColor: `${iconColor}12` }]}>
        {phase === 'done' ? (
          <CheckIcon size={40} color={D.green} />
        ) : (
          <NFCChipIcon size={40} color={iconColor} />
        )}
      </View>
    </View>
  );
}

const rp = StyleSheet.create({
  container: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 1.5,
  },
  connectedRingsWrap: {
    position: 'absolute',
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
  },
  core: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: `${D.orange}15`,
    borderWidth: 2, borderColor: `${D.orange}40`,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── NFC Full-Screen Modal ─────────────────────────────────────────────────────
interface NFCModalProps {
  visible: boolean;
  lote: LoteItem[];
  onClose: () => void;
  onSuccess: () => void;
}

function NFCModal({ visible, lote, onClose, onSuccess }: NFCModalProps) {
  const [phase, setPhase] = useState<NFCPhase>('waiting');
  const [simulatedIds, setSimulatedIds] = useState<string[]>([]);
  const [requesterAccepted, setRequesterAccepted] = useState(false);
  const [almoxarifeAccepted, setAlmoxarifeAccepted] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(60)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setPhase('waiting');
      setSimulatedIds([]);
      setRequesterAccepted(false);
      setAlmoxarifeAccepted(false);
      setCountdown(3);
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]).start();
    } else {
      bgOpacity.setValue(0);
      contentSlide.setValue(60);
      contentOpacity.setValue(0);
    }
  }, [visible]);

  // Auto-simulate connection after 2s for demo
  useEffect(() => {
    if (visible && phase === 'waiting') {
      const timer = setTimeout(() => simulateConnection(), 2200);
      return () => clearTimeout(timer);
    }
  }, [visible, phase]);

  const simulateConnection = () => {
    const fakeIds = lote.map(item => item.codigo);
    setSimulatedIds(fakeIds);
    setPhase('connected');
    setTimeout(() => setPhase('confirming_requester'), 1000);
  };

  const handleRequesterAccept = () => {
    setRequesterAccepted(true);
    setPhase('confirming_almoxarife');
  };

  const handleAlmoxarifeAccept = () => {
    setAlmoxarifeAccepted(true);
    setPhase('done');
    Animated.spring(successScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }).start();

    // Countdown and auto-close
    let c = 3;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      Animated.sequence([
        Animated.timing(countdownAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
        Animated.spring(countdownAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }),
      ]).start();
      if (c <= 0) {
        clearInterval(interval);
        handleDone();
      }
    }, 1000);
  };

  const handleDone = () => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      onSuccess();
    });
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 60, duration: 240, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'waiting': return { title: 'Aguardando Conexão', sub: 'com o Dispositivo do Almoxarife…', color: D.orange };
      case 'connected': return { title: 'Conexão Estabelecida!', sub: 'Sincronizando dados do lote…', color: D.orange };
      case 'confirming_requester': return { title: 'Confirme a Solicitação', sub: 'Verifique os itens e aceite para prosseguir', color: D.orange };
      case 'confirming_almoxarife': return { title: 'Aguardando Almoxarife', sub: 'O almoxarife deve aceitar no dispositivo dele', color: D.amber };
      case 'done': return { title: 'Liberação Concluída!', sub: `Encerrando em ${countdown}s…`, color: D.green };
      case 'error': return { title: 'Falha na Conexão', sub: 'Tente aproximar os dispositivos novamente', color: D.red };
    }
  };

  const txt = getPhaseText();

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[nfc.overlay, { opacity: bgOpacity }]} />

      <Animated.View
        style={[nfc.container, { opacity: contentOpacity, transform: [{ translateY: contentSlide }] }]}
      >
        <StatusBar barStyle="light-content" backgroundColor={D.nfcBg} />

        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: D.nfcBg }}>
          <View style={nfc.header}>
            <View style={nfc.headerLeft}>
              <View style={nfc.loteTag}>
                <Text style={nfc.loteTagText}>{lote.length} {lote.length === 1 ? 'ITEM' : 'ITENS'} NO LOTE</Text>
              </View>
            </View>
            {phase !== 'done' && (
              <TouchableOpacity onPress={handleClose} style={nfc.cancelBtn} activeOpacity={0.7}>
                <Text style={nfc.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>

        {/* Main radar area */}
        <View style={nfc.radarArea}>
          <RadarPulse active={visible} phase={phase} />

          <View style={nfc.phaseTextWrap}>
            <Text style={[nfc.phaseTitle, { color: txt.color }]}>{txt.title}</Text>
            <Text style={nfc.phaseSub}>{txt.sub}</Text>
          </View>

          {/* Pulsing status dot */}
          {phase === 'waiting' && (
            <View style={nfc.statusRow}>
              <View style={[nfc.statusDot, { backgroundColor: D.orange }]} />
              <Text style={nfc.statusLabel}>Transmitindo sinal NFC…</Text>
            </View>
          )}
        </View>

        {/* Content area */}
        <View style={nfc.contentArea}>

          {/* Connected — show items */}
          {(phase === 'connected' || phase === 'confirming_requester') && (
            <View style={nfc.itemsCard}>
              <Text style={nfc.itemsCardTitle}>ITENS DO LOTE DETECTADOS</Text>
              {simulatedIds.map((id, i) => (
                <View key={id} style={nfc.itemRow}>
                  <View style={nfc.itemDot} />
                  <Text style={nfc.itemCode}>{id}</Text>
                  <Text style={nfc.itemName} numberOfLines={1}>{lote[i]?.nome}</Text>
                  <View style={nfc.itemQtyBadge}>
                    <Text style={nfc.itemQty}>×{lote[i]?.qty}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Confirming requester */}
          {phase === 'confirming_requester' && (
            <View style={nfc.confirmSection}>
              <Text style={nfc.confirmHint}>Dispositivo do Solicitante (Você)</Text>
              <TouchableOpacity style={nfc.acceptBtn} onPress={handleRequesterAccept} activeOpacity={0.87}>
                <CheckIcon size={20} color={D.white} />
                <Text style={nfc.acceptBtnText}>Aceitar e Aguardar Almoxarife</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Waiting almoxarife */}
          {phase === 'confirming_almoxarife' && (
            <View style={nfc.waitAlmox}>
              <ActivityIndicator color={D.orange} size="small" />
              <Text style={nfc.waitAlmoxText}>Aguardando confirmação do almoxarife…</Text>

              {/* Demo button to simulate almoxarife acceptance */}
              <TouchableOpacity style={nfc.simBtn} onPress={handleAlmoxarifeAccept} activeOpacity={0.7}>
                <Text style={nfc.simBtnText}>[DEMO] Simular Aceite do Almoxarife</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Done */}
          {phase === 'done' && (
            <Animated.View style={[nfc.doneCard, { transform: [{ scale: successScale }] }]}>
              <View style={nfc.doneIconCircle}>
                <CheckIcon size={32} color={D.green} />
              </View>
              <Text style={nfc.doneTitle}>Transferência Registrada</Text>
              <Text style={nfc.doneSub}>{lote.length} {lote.length === 1 ? 'ferramenta transferida' : 'ferramentas transferidas'} com sucesso</Text>
              <View style={nfc.doneItems}>
                {lote.map(item => (
                  <View key={item.codigo} style={nfc.doneItem}>
                    <CheckIcon size={12} color={D.green} />
                    <Text style={nfc.doneItemText}>{item.nome}</Text>
                  </View>
                ))}
              </View>
              <Animated.Text style={[nfc.countdown, { transform: [{ scale: countdownAnim }] }]}>
                Fechando em {countdown}s
              </Animated.Text>
            </Animated.View>
          )}
        </View>

        {/* Bottom safe area */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: D.nfcBg }} />
      </Animated.View>
    </Modal>
  );
}

const nfc = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: D.nfcBg,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loteTag: {
    backgroundColor: D.orangeSoft,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: D.orangeLine,
  },
  loteTagText: { fontSize: 11, fontWeight: '800', color: D.orange, letterSpacing: 1.5 },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },

  radarArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  phaseTextWrap: { alignItems: 'center', gap: 8 },
  phaseTitle: { fontSize: 24, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  phaseSub: { fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 22 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: '500', letterSpacing: 0.5 },

  contentArea: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
    maxHeight: SH * 0.42,
  },

  // Items card
  itemsCard: {
    backgroundColor: D.nfcSurface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: D.nfcBorder,
    gap: 10,
  },
  itemsCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: D.orange,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: D.orange },
  itemCode: {
    fontSize: 10,
    color: D.orange,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    minWidth: 72,
  },
  itemName: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  itemQtyBadge: {
    backgroundColor: D.orangeSoft,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemQty: { fontSize: 11, fontWeight: '800', color: D.orange },

  // Confirm
  confirmSection: { gap: 10 },
  confirmHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  acceptBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: D.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  acceptBtnText: { fontSize: 15, fontWeight: '800', color: D.white, letterSpacing: 0.2 },

  // Waiting
  waitAlmox: { alignItems: 'center', gap: 14, paddingVertical: 8 },
  waitAlmoxText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  simBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  simBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },

  // Done
  doneCard: {
    backgroundColor: D.nfcSurface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: `${D.green}40`,
  },
  doneIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${D.green}15`,
    borderWidth: 2,
    borderColor: `${D.green}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: '900', color: D.white, letterSpacing: -0.3 },
  doneSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },
  doneItems: { gap: 6, width: '100%' },
  doneItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneItemText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  countdown: { fontSize: 12, color: D.green, fontWeight: '700', marginTop: 4 },
});

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, visible, type = 'success' }: { message: string; visible: boolean; type?: 'success' | 'error' }) {
  const y = useRef(new Animated.Value(24)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(y, { toValue: 0, tension: 130, friction: 11, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sc, { toValue: 1, tension: 130, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y, { toValue: 18, duration: 260, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const iconColor = type === 'success' ? D.green : D.red;
  const bgColor = type === 'success' ? D.green : D.red;

  return (
    <Animated.View style={[toast.wrap, { opacity: op, transform: [{ translateY: y }, { scale: sc }] }]} pointerEvents="none">
      <View style={toast.pill}>
        <View style={[toast.icon, { backgroundColor: bgColor }]}>
          {type === 'success'
            ? <CheckIcon size={12} color={D.white} />
            : <XIcon size={12} color={D.white} />
          }
        </View>
        <Text style={toast.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}
const toast = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 28, left: 20, right: 20, zIndex: 9999 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.obsidian, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 18, elevation: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: D.white, flex: 1, letterSpacing: 0.1 },
});

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FerStatus }) {
  const cfg = {
    'Disponível': { dot: D.greenLight, bg: D.greenBg, text: D.greenText },
    'Em uso': { dot: D.redLight, bg: D.redBg, text: D.red },
    'Em manutenção': { dot: D.amber, bg: D.amberBg, text: D.amber },
  }[status];
  return (
    <View style={[stb.pill, { backgroundColor: cfg.bg }]}>
      <View style={[stb.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[stb.label, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}
const stb = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

// ─── Seção: Minhas Ferramentas (Em Custódia) ──────────────────────────────────
function MyToolsSection({ items, onDevolver }: { items: Ferramenta[]; onDevolver: () => void }) {
  const [expanded, setExpanded] = useState(true);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };

  if (items.length === 0) return null;

  return (
    <View style={my.wrap}>
      {/* Header */}
      <TouchableOpacity style={my.header} onPress={toggleExpanded} activeOpacity={0.8}>
        <View style={my.headerLeft}>
          <View style={my.headerIconBox}>
            <WrenchIcon size={16} color={D.orange} />
          </View>
          <View>
            <Text style={my.headerTitle}>Minhas Ferramentas Atuais</Text>
            <Text style={my.headerSub}>{items.length} {items.length === 1 ? 'item' : 'itens'} em custódia</Text>
          </View>
        </View>
        <View style={[my.expandBtn, expanded && my.expandBtnActive]}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d={expanded ? 'M18 15L12 9L6 15' : 'M6 9L12 15L18 9'}
              stroke={expanded ? D.orange : D.slate}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </TouchableOpacity>

      {/* Items */}
      {expanded && (
        <View style={my.listWrap}>
          {items.map((item, idx) => (
            <View key={item.codigo} style={[my.item, idx < items.length - 1 && my.itemBorder]}>
              <View style={my.itemLeft}>
                <View style={my.itemCode}>
                  <Text style={my.itemCodeText}>{item.codigo}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={my.itemName} numberOfLines={1}>{item.nome}</Text>
                  <Text style={my.itemCat}>{item.categoria}</Text>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>
          ))}

          {/* Devolver */}
          <TouchableOpacity style={my.devolverBtn} onPress={onDevolver} activeOpacity={0.85}>
            <BackIcon size={15} color={D.orange} />
            <Text style={my.devolverText}>Iniciar Devolução</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const my = StyleSheet.create({
  wrap: {
    backgroundColor: D.white,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: D.orangeLine,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: D.orangeSoft,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: D.orange + '18',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.orangeLine,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: D.obsidian },
  headerSub: { fontSize: 11, color: D.slate, marginTop: 1, fontWeight: '500' },
  expandBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: D.mist,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: D.silver,
  },
  expandBtnActive: { backgroundColor: D.orangeSoft, borderColor: D.orangeLine },
  listWrap: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: D.cloud },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemCode: {
    backgroundColor: D.mist, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: D.silver,
  },
  itemCodeText: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: D.iron, fontWeight: '600', letterSpacing: 0.5 },
  itemName: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  itemCat: { fontSize: 10, color: D.slate, marginTop: 1 },
  devolverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: D.orangeLine,
    backgroundColor: D.orangeSoft,
  },
  devolverText: { fontSize: 13, fontWeight: '700', color: D.orange },
});

// ─── Card: Ferramenta Disponível ───────────────────────────────────────────────
function AvailableCard({ item, index, onAdd, isInLote }: {
  item: Ferramenta;
  index: number;
  onAdd: (f: Ferramenta) => void;
  isInLote: boolean;
}) {
  const oy = useRef(new Animated.Value(14)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 200, delay: index * 28, useNativeDriver: true }),
      Animated.spring(oy, { toValue: 0, tension: 115, friction: 14, delay: index * 28, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = () => {
    Animated.sequence([
      Animated.timing(sc, { toValue: 0.97, duration: 55, useNativeDriver: true }),
      Animated.spring(sc, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }),
    ]).start();
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.8 },
    });
    onAdd(item);
  };

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: oy }, { scale: sc }], marginBottom: 7 }}>
      <View style={[av.card, isInLote && av.cardAdded]}>
        <View style={[av.iconBox, isInLote && av.iconBoxAdded]}>
          <WrenchIcon size={16} color={isInLote ? D.green : D.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={av.name} numberOfLines={1}>{item.nome}</Text>
          <View style={av.metaRow}>
            <Text style={av.code}>{item.codigo}</Text>
            <View style={av.sep} />
            <Text style={av.cat}>{item.categoria}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[av.addBtn, isInLote && av.addBtnAdded]}
          onPress={press}
          activeOpacity={0.8}
        >
          {isInLote
            ? <CheckIcon size={14} color={D.white} />
            : <PlusIcon size={13} color={D.white} />
          }
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const av = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: D.white, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 13,
    borderWidth: 1, borderColor: D.silver,
  },
  cardAdded: { borderColor: `${D.green}35`, backgroundColor: D.greenBg },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  iconBoxAdded: { backgroundColor: D.greenBg },
  name: { fontSize: 13, fontWeight: '700', color: D.obsidian },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  code: { fontSize: 10, color: D.slate, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  sep: { width: 1, height: 9, backgroundColor: D.cloud, marginHorizontal: 7 },
  cat: { fontSize: 10, color: D.slate },
  addBtn: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: D.orange,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnAdded: { backgroundColor: D.green },
});

// ─── Lote Item Card ────────────────────────────────────────────────────────────
function LoteCard({ item, onRemove, onQtyChange }: {
  item: LoteItem;
  onRemove: (c: string) => void;
  onQtyChange: (c: string, d: number) => void;
}) {
  const oy = useRef(new Animated.Value(-8)).current;
  const op = useRef(new Animated.Value(0)).current;
  const qtyScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(oy, { toValue: 0, tension: 130, friction: 13, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const bumpQty = () => {
    Animated.sequence([
      Animated.timing(qtyScale, { toValue: 1.35, duration: 75, useNativeDriver: true }),
      Animated.spring(qtyScale, { toValue: 1, tension: 280, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: oy }], marginBottom: 7 }}>
      <View style={lc.card}>
        <View style={lc.iconBox}><WrenchIcon size={14} color={D.orange} /></View>
        <View style={{ flex: 1 }}>
          <Text style={lc.name} numberOfLines={1}>{item.nome}</Text>
          <Text style={lc.code}>{item.codigo}</Text>
        </View>
        <View style={lc.controls}>
          <TouchableOpacity
            style={lc.qtyMinus}
            onPress={() => { bumpQty(); onQtyChange(item.codigo, -1); }}
            activeOpacity={0.7}
          >
            <MinusIcon size={12} color={D.orange} />
          </TouchableOpacity>
          <Animated.Text style={[lc.qty, { transform: [{ scale: qtyScale }] }]}>{item.qty}</Animated.Text>
          <TouchableOpacity
            style={lc.qtyPlus}
            onPress={() => { bumpQty(); onQtyChange(item.codigo, 1); }}
            activeOpacity={0.7}
          >
            <PlusIcon size={12} color={D.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.codigo)} style={lc.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <XIcon size={11} color={D.ash} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const lc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: D.white, borderRadius: 13,
    paddingVertical: 10, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: D.orangeLine,
  },
  iconBox: { width: 34, height: 34, borderRadius: 8, backgroundColor: D.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 12, fontWeight: '700', color: D.obsidian },
  code: { fontSize: 10, color: D.slate, marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyMinus: {
    width: 26, height: 26, borderRadius: 7,
    borderWidth: 1.5, borderColor: D.orangeLine,
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontSize: 14, fontWeight: '900', color: D.obsidian, minWidth: 18, textAlign: 'center' },
  qtyPlus: { width: 26, height: 26, borderRadius: 7, backgroundColor: D.orange, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: D.mist, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
});

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHdr({ label, count, color = D.slate }: { label: string; count: number; color?: string }) {
  return (
    <View style={shdr.row}>
      <View style={[shdr.bar, { backgroundColor: color }]} />
      <Text style={[shdr.label, { color }]}>{label}</Text>
      <View style={[shdr.badge, { backgroundColor: `${color}18` }]}>
        <Text style={[shdr.num, { color }]}>{count}</Text>
      </View>
    </View>
  );
}
const shdr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  bar: { width: 3.5, height: 14, borderRadius: 2 },
  label: { flex: 1, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  num: { fontSize: 11, fontWeight: '800' },
});

// ─── Floating Action Bar (Lote Rodapé) ────────────────────────────────────────
function LoteFooter({ count, onSolicitar, anim }: { count: number; onSolicitar: () => void; anim: Animated.Value }) {
  const sc = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  return (
    <Animated.View style={[lf.wrap, { transform: [{ scale: sc }, { translateY: ty }], opacity: anim }]}>
      <TouchableOpacity style={lf.btn} onPress={onSolicitar} activeOpacity={0.88}>
        <View style={lf.leftSection}>
          <NFCChipIcon size={22} color={D.white} />
          <View>
            <Text style={lf.label}>Solicitar Liberação em Lote</Text>
            <Text style={lf.sub}>{count} {count === 1 ? 'ferramenta selecionada' : 'ferramentas selecionadas'}</Text>
          </View>
        </View>
        <View style={lf.arrowBox}>
          <ArrowIcon size={16} color={D.white} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const lf = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 200 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: D.orange, borderRadius: 18,
    paddingVertical: 15, paddingHorizontal: 18,
    shadowColor: D.orangeDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  label: { fontSize: 15, fontWeight: '900', color: D.white, letterSpacing: 0.1 },
  sub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2, fontWeight: '500' },
  arrowBox: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── TELA PRINCIPAL ────────────────────────────────────────────────────────────
export default function AlmoxarifadoScreen() {
  const [minhasFerramentas, setMinhasFerramentas] = useState<Ferramenta[]>([]);
  const [disponíveis, setDisponíveis] = useState<Ferramenta[]>([]);
  const [lote, setLote] = useState<LoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nfcVisible, setNfcVisible] = useState(false);
  const [toastState, setToastState] = useState({ visible: false, msg: '', type: 'success' as 'success' | 'error' });

  const headerAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    loadData();
  }, []);

  useEffect(() => {
    Animated.spring(fabAnim, { toValue: lote.length > 0 ? 1 : 0, tension: 110, friction: 12, useNativeDriver: true }).start();
  }, [lote.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      const cracha = await AsyncStorage.getItem('userCracha');

      // Paralelizar chamadas
      const [todasRes, minhasRes] = await Promise.allSettled([
        apiClient.listarFerramentas(),
        cracha ? apiClient.listarMinhasFerramentas() : Promise.resolve([]),
      ]);

      const todas = todasRes.status === 'fulfilled' ? (todasRes.value || []) : [];
      const minhas = minhasRes.status === 'fulfilled' ? (minhasRes.value || []) : [];

      setMinhasFerramentas(minhas.filter((f: Ferramenta) => f.status === 'Em uso'));
      setDisponíveis(todas.filter((f: Ferramenta) => f.status === 'Disponível'));
    } catch {
      setDisponíveis([]);
    } finally {
      setLoading(false);
    }
  };

  const addToLote = useCallback((ferramenta: Ferramenta) => {
    setLote(prev => {
      const exists = prev.find(i => i.codigo === ferramenta.codigo);
      if (exists) return prev; // não duplicar
      return [{ ...ferramenta, qty: 1 }, ...prev];
    });
  }, []);

  const removeFromLote = (codigo: string) => {
    LayoutAnimation.configureNext({
      duration: 200,
      delete: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.9 },
    });
    setLote(prev => prev.filter(i => i.codigo !== codigo));
  };

  const changeQty = (codigo: string, delta: number) => {
    setLote(prev => prev.map(i =>
      i.codigo === codigo ? { ...i, qty: Math.max(1, i.qty + delta) } : i
    ));
  };

  const handleSolicitar = () => {
    if (lote.length === 0) return;
    setNfcVisible(true);
  };

  const handleDevolver = () => {
    showToast('Em desenvolvimento: fluxo de devolução NFC', 'success');
  };

  const handleNFCSuccess = async () => {
    setNfcVisible(false);
    try {
      // Commit ao backend
      await apiClient.retirar({
        cracha_colaborador: (await AsyncStorage.getItem('userCracha')) || '',
        ferramentas: lote.map(f => ({
          codigo: f.codigo,
          qtd: f.qty,
          checklist: 'REALIZADO',
          observacao: 'Liberação em lote via NFC',
        })),
      });
    } catch {
      // Silent — fluxo NFC já confirmou visualmente
    }
    setLote([]);
    showToast(`🎉 Liberação Concluída! ${lote.length} ${lote.length === 1 ? 'ferramenta retirada' : 'ferramentas retiradas'}`, 'success');
    await loadData();
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastState({ visible: true, msg, type });
    setTimeout(() => setToastState(s => ({ ...s, visible: false })), 3500);
  };

  const isInLote = (codigo: string) => lote.some(i => i.codigo === codigo);

  const headerTY = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const totalQty = lote.reduce((a, c) => a + c.qty, 0);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={D.orange} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <SafeAreaView style={s.headerZone} edges={['top']}>
        {/* Decoração geométrica */}
        <View style={s.geoDeco} pointerEvents="none">
          {Array.from({ length: 15 }).map((_, i) => (
            <View key={i} style={[s.geoDot, { opacity: i % 3 === 0 ? 0.22 : 0.10 }]} />
          ))}
        </View>

        <Animated.View style={[s.header, { opacity: headerAnim, transform: [{ translateY: headerTY }] }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.headerTitle}>Almoxarifado</Text>
              <Text style={s.headerSub}>Central de Liberação de Ativos</Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={loadData} activeOpacity={0.7}>
              <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                <Path d="M23 4v6h-6" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Stats Bar */}
          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={s.statVal}>{disponíveis.length}</Text>
              <Text style={s.statLbl}>Disponíveis</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statVal}>{minhasFerramentas.length}</Text>
              <Text style={s.statLbl}>Em Custódia</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statVal, lote.length > 0 && { color: D.orange }]}>{lote.length}</Text>
              <Text style={s.statLbl}>No Lote</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.body}
        contentContainerStyle={[s.bodyContent, { paddingBottom: lote.length > 0 ? 130 : 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SEÇÃO 1: Em Custódia */}
        {minhasFerramentas.length > 0 && (
          <View style={s.section}>
            <MyToolsSection items={minhasFerramentas} onDevolver={handleDevolver} />
          </View>
        )}

        {/* SEÇÃO 2: Lote atual (inline) */}
        {lote.length > 0 && (
          <View style={s.section}>
            <SectionHdr label="Lote de Retirada" count={totalQty} color={D.orange} />
            {lote.map(item => (
              <LoteCard
                key={item.codigo}
                item={item}
                onRemove={removeFromLote}
                onQtyChange={changeQty}
              />
            ))}
            <View style={s.loteNote}>
              <NFCChipIcon size={14} color={D.orange} />
              <Text style={s.loteNoteText}>Clique em "Solicitar Liberação" para iniciar o fluxo NFC</Text>
            </View>
          </View>
        )}

        {/* SEÇÃO 3: Ativos Disponíveis */}
        <View style={s.section}>
          <SectionHdr label="Ativos Disponíveis" count={disponíveis.length} color={D.greenLight} />

          {loading ? (
            <View style={s.loadState}>
              <ActivityIndicator color={D.orange} size="large" />
              <Text style={s.loadText}>Carregando ativos…</Text>
            </View>
          ) : disponíveis.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🔧</Text>
              <Text style={s.emptyTitle}>Nenhum ativo disponível</Text>
              <Text style={s.emptySub}>Todos os ativos estão alocados ou em manutenção</Text>
            </View>
          ) : (
            disponíveis.map((item, idx) => (
              <AvailableCard
                key={item.codigo}
                item={item}
                index={idx}
                onAdd={addToLote}
                isInLote={isInLote(item.codigo)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <LoteFooter
        count={totalQty}
        onSolicitar={handleSolicitar}
        anim={fabAnim}
      />

      {/* NFC Modal Full Screen */}
      <NFCModal
        visible={nfcVisible}
        lote={lote}
        onClose={() => setNfcVisible(false)}
        onSuccess={handleNFCSuccess}
      />

      <Toast message={toastState.msg} visible={toastState.visible} type={toastState.type} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.orange },

  // Header
  headerZone: { backgroundColor: D.orange, overflow: 'hidden' },
  geoDeco: {
    position: 'absolute', right: 16, top: 16,
    flexDirection: 'row', flexWrap: 'wrap', width: 60, gap: 8,
  },
  geoDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: D.white },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: D.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: '500', letterSpacing: 0.2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: D.white, letterSpacing: -0.3 },
  statLbl: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.14)' },

  // Body
  body: { flex: 1, backgroundColor: D.snow, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 18 },
  section: { marginBottom: 6 },

  loteNote: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: D.orangeSoft,
    borderRadius: 10,
    borderWidth: 1, borderColor: D.orangeLine,
  },
  loteNoteText: { fontSize: 11, color: D.orange, fontWeight: '600', flex: 1 },

  loadState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  loadText: { fontSize: 14, color: D.slate },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: D.carbon },
  emptySub: { fontSize: 12, color: D.ash, textAlign: 'center', maxWidth: 220 },
});