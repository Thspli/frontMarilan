/**
 * hooks/useSolicitacoesListener.ts — Marilan v1.1
 *
 * Hook autossuficiente: lê userRole diretamente do AsyncStorage
 * (mesma fonte que o almoxarifado.tsx já usa para ler o crachá).
 * Não depende de useAuth nem de nenhum parâmetro externo.
 *
 * USO:
 *   const { solicitacaoAtual, modalVisible, ... } = useSolicitacoesListener();
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../services/api';

export interface FerramentaSolicitada {
  codigo: string;
  nome: string;
  qtd: number;
}

export interface Solicitacao {
  id: number;
  colaborador_nome: string;
  colaborador_cracha: string;
  ferramentas: FerramentaSolicitada[];
  criado_em: string;
}

interface UseSolicitacoesListenerReturn {
  solicitacaoAtual: Solicitacao | null;
  modalVisible: boolean;
  aprovando: boolean;
  recusando: boolean;
  aprovar: () => Promise<void>;
  recusar: () => Promise<void>;
  fecharModal: () => void;
}

const POLLING_INTERVAL_MS = 7000;

export function useSolicitacoesListener(): UseSolicitacoesListenerReturn {
  // Role lido do AsyncStorage — mesma chave gravada pelo apiClient.login()
  const [userRole, setUserRole] = useState<string | null>(null);

  const [solicitacaoAtual, setSolicitacaoAtual] = useState<Solicitacao | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [aprovando, setAprovando] = useState(false);
  const [recusando, setRecusando] = useState(false);

  const fetchingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Lê o role do AsyncStorage uma vez na montagem ──────────────────────
  // O apiClient.login() grava 'userRole' com o valor vindo da API.
  // Aqui apenas consumimos essa mesma chave — zero acoplamento extra.
  useEffect(() => {
    AsyncStorage.getItem('userRole').then(role => {
      setUserRole(role);
    });
  }, []);

  // ── 2. Funções de controle do modal ───────────────────────────────────────
  const fecharModal = useCallback(() => {
    setModalVisible(false);
    setSolicitacaoAtual(null);
  }, []);

  const verificarPendentes = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      const data = await (apiClient as any).listarSolicitacoesPendentes();

      if (Array.isArray(data)) {
        if (data.length > 0) {
          setSolicitacaoAtual(data[0]);
          setModalVisible(true);
        } else {
          fecharModal();
        }
      } else if (data && data.id) {
        setSolicitacaoAtual(data);
        setModalVisible(true);
      } else {
        fecharModal();
      }
    } catch {
      // Falha silenciosa: mantém estado atual, tenta de novo no próximo ciclo
    } finally {
      fetchingRef.current = false;
    }
  }, [fecharModal]);

  // ── 3. Inicia o polling SÓ quando o role for confirmado como almoxarife ───
  // O useEffect depende de `userRole`: fica aguardando até o AsyncStorage
  // responder. Se for colaborador, simplesmente não registra o interval.
  useEffect(() => {
    if (userRole !== 'almoxarife') return;

    verificarPendentes();
    intervalRef.current = setInterval(verificarPendentes, POLLING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userRole, verificarPendentes]);

  // ── 4. Ações dos botões ───────────────────────────────────────────────────
  const aprovar = useCallback(async () => {
    if (!solicitacaoAtual) return;
    setAprovando(true);
    try {
      await (apiClient as any).aprovarSolicitacao(solicitacaoAtual.id);
    } finally {
      setAprovando(false);
      fecharModal();
    }
  }, [solicitacaoAtual, fecharModal]);

  const recusar = useCallback(async () => {
    if (!solicitacaoAtual) return;
    setRecusando(true);
    try {
      await (apiClient as any).recusarSolicitacao(solicitacaoAtual.id);
    } finally {
      setRecusando(false);
      fecharModal();
    }
  }, [solicitacaoAtual, fecharModal]);

  return {
    solicitacaoAtual,
    modalVisible,
    aprovando,
    recusando,
    aprovar,
    recusar,
    fecharModal,
  };
}