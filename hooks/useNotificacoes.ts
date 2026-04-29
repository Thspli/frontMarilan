/**
 * hooks/useNotificacoes.ts
 * Hook para gerenciar notificações in-app
 * Integrado com API Marilan e polling automático
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';

export interface Notificacao {
  id: number;
  user_id: number;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'sucesso';
  lida: boolean;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = 'https://inf-viewpicture-database-blowing.trycloudflare.com/api';

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiRef = useRef<AxiosInstance | null>(null);

  // Contar notificações não lidas
  const naoLidas = notificacoes.filter(n => !n.lida).length;

  // Inicializar axios com token
  const initializeApi = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        setError('Token não encontrado');
        return null;
      }

      if (!apiRef.current) {
        apiRef.current = axios.create({
          baseURL: API_BASE_URL,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
      return apiRef.current;
    } catch (err) {
      console.error('Erro ao inicializar API:', err);
      setError('Erro ao configurar conexão');
      return null;
    }
  }, []);

  // Buscar notificações do servidor
  const buscar = useCallback(async () => {
    const api = apiRef.current || (await initializeApi());
    if (!api) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Notificacao[]>('/notificacoes');
      // Garantir ordenação: mais recente primeiro
      const sorted = data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotificacoes(sorted);
    } catch (err) {
      const mensagem = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : 'Erro ao buscar notificações';
      console.error('Erro ao buscar notificações:', err);
      setError(mensagem);
    } finally {
      setLoading(false);
    }
  }, [initializeApi]);

  // Marcar uma notificação como lida
  const marcarLida = useCallback(
    async (id: number) => {
      const api = apiRef.current || (await initializeApi());
      if (!api) return;

      try {
        await api.patch(`/notificacoes/${id}/ler`);
        // Atualizar estado local
        setNotificacoes(prev =>
          prev.map(n => (n.id === id ? { ...n, lida: true } : n))
        );
      } catch (err) {
        console.error('Erro ao marcar notificação como lida:', err);
        setError('Erro ao marcar como lida');
      }
    },
    [initializeApi]
  );

  // Marcar todas as notificações como lidas
  const marcarTodasLidas = useCallback(async () => {
    const api = apiRef.current || (await initializeApi());
    if (!api) return;

    try {
      await api.post('/notificacoes/ler-tudo');
      // Atualizar estado local
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError('Erro ao marcar todas como lidas');
    }
  }, [initializeApi]);

  // Iniciar polling automático
  const startPolling = useCallback(() => {
    // Buscar imediatamente
    buscar();

    // Polling a cada 60 segundos
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      buscar();
    }, 60000);
  }, [buscar]);

  // Parar polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Setup inicial: inicializar e começar polling
  useEffect(() => {
    initializeApi().then(() => {
      startPolling();
    });

    // Listener para AppState (quando app volta do background)
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        // App voltou ao foreground — buscar notificações
        buscar();
      }
    });

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [initializeApi, startPolling, stopPolling, buscar]);

  return {
    notificacoes,
    naoLidas,
    loading,
    error,
    buscar,
    marcarLida,
    marcarTodasLidas,
    startPolling,
    stopPolling,
  };
}
