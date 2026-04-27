/**
 * hooks/useTools.ts
 * Hook customizado para gerenciar ferramentas com cache e sincronização
 */

import { useState } from 'react';
import { apiClient } from '../services/api';

interface Ferramenta {
  codigo: string;
  nome: string;
  categoria: string;
  status: 'Disponível' | 'Em uso' | 'Em manutenção';
  alocadoPara?: string;
}

interface UseToolsReturn {
  ferramentas: Ferramenta[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  listarMunhas: (cracha: string) => Promise<void>;
  listarDisponiveis: () => Promise<void>;
}

export function useTools(): UseToolsReturn {
  const [ferramentas, setFerramentas] = useState<Ferramenta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listarDisponiveis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.listarFerramentas();
      setFerramentas(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar ferramentas');
      setFerramentas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const listarMunhas = async (cracha: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.listarMinhasFerramentas(cracha);
      setFerramentas(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar minhas ferramentas');
      setFerramentas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = async () => {
    if (ferramentas.length > 0) {
      await listarDisponiveis();
    }
  };

  return {
    ferramentas,
    isLoading,
    error,
    refetch,
    listarMunhas,
    listarDisponiveis,
  };
}
