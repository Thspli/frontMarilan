/**
 * hooks/useTrocaSolicitacaoListener.ts — Marilan v1.2
 *
 * Escuta solicitações de troca P2P pendentes para o colaborador logado.
 * Polling a cada 5s via AppState — relê credenciais ao voltar ao foreground.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { apiClient } from '../services/api';
import type { SolicitacaoTroca } from '../components/TrocaSolicitacaoModal';

export type { SolicitacaoTroca };

interface UseTrocaSolicitacaoListenerReturn {
  solicitacaoTroca: SolicitacaoTroca | null;
  modalVisible: boolean;
  aceitando: boolean;
  recusando: boolean;
  aceitar: () => Promise<void>;
  recusar: () => Promise<void>;
  fechar: () => void;
}

const POLLING_INTERVAL_MS = 5000;

export function useTrocaSolicitacaoListener(): UseTrocaSolicitacaoListenerReturn {
  const [userRole,  setUserRole]  = useState<string | null>(null);
  const [meuCracha, setMeuCracha] = useState<string | null>(null);

  const [solicitacaoTroca, setSolicitacaoTroca] = useState<SolicitacaoTroca | null>(null);
  const [modalVisible,     setModalVisible]     = useState(false);
  const [aceitando,        setAceitando]        = useState(false);
  const [recusando,        setRecusando]        = useState(false);

  const fetchingRef  = useRef(false);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const lerCredenciais = useCallback(() => {
    Promise.all([
      AsyncStorage.getItem('userRole'),
      AsyncStorage.getItem('userCracha'),
    ]).then(([role, cracha]) => {
      setUserRole(role);
      setMeuCracha(cracha);
    });
  }, []);

  useEffect(() => {
    lerCredenciais();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') lerCredenciais();
    });
    return () => sub.remove();
  }, [lerCredenciais]);

  const fechar = useCallback(() => {
    setModalVisible(false);
    setSolicitacaoTroca(null);
  }, []);

  const verificarPendentes = useCallback(async () => {
    if (fetchingRef.current || !meuCracha) return;
    fetchingRef.current = true;
    try {
      const data = await apiClient.listarTrocasSolicitadasParaMim(meuCracha);
      if (Array.isArray(data) && data.length > 0) {
        setSolicitacaoTroca(data[0]);
        setModalVisible(true);
      } else {
        fechar();
      }
    } catch {
      // silencioso
    } finally {
      fetchingRef.current = false;
    }
  }, [meuCracha, fechar]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (userRole !== 'colaborador' || !meuCracha) return;

    verificarPendentes();
    intervalRef.current = setInterval(verificarPendentes, POLLING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userRole, meuCracha, verificarPendentes]);

  const aceitar = useCallback(async () => {
    if (!solicitacaoTroca || !meuCracha) return;
    setAceitando(true);
    try {
      await apiClient.aceitarTrocaSolicitada(solicitacaoTroca.id, meuCracha);
    } finally {
      setAceitando(false);
      fechar();
    }
  }, [solicitacaoTroca, meuCracha, fechar]);

  const recusar = useCallback(async () => {
    if (!solicitacaoTroca) return;
    setRecusando(true);
    try {
      await apiClient.recusarTrocaSolicitada(solicitacaoTroca.id);
    } finally {
      setRecusando(false);
      fechar();
    }
  }, [solicitacaoTroca, fechar]);

  return { solicitacaoTroca, modalVisible, aceitando, recusando, aceitar, recusar, fechar };
}