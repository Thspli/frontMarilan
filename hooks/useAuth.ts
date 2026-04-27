/**
 * hooks/useAuth.ts
 * Hook customizado para gerenciamento de autenticação
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface User {
  id: number;
  cracha: string;
  name: string;
  role: 'almoxarife' | 'colaborador' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSignedIn: boolean;
  login: (cracha: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Inicializa a autenticação ao montar o hook
   */
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await apiClient.initialize();
        
        const savedToken = await AsyncStorage.getItem('authToken');
        const savedCracha = await AsyncStorage.getItem('userCracha');
        const savedRole = await AsyncStorage.getItem('userRole');

        if (savedToken && savedCracha && savedRole) {
          setToken(savedToken);
          setUser({
            id: 0, // Será preenchido no login
            cracha: savedCracha,
            name: savedCracha,
            role: savedRole as 'almoxarife' | 'colaborador' | 'admin',
          });
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (cracha: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(cracha, password);
      
      setToken(response.access_token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    token,
    isLoading,
    isSignedIn: !!token,
    login,
    logout,
  };
}
