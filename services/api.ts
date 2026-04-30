/**
 * services/api.ts
 * Serviço de API para integração com backend Marilan
 * Base URL: http://localhost:8000/api
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance } from 'axios';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = 'https://defeat-for    gotten-reduction-compared.trycloudflare.com/api';

interface LoginRequest {
  cracha: string;
  password: string;
}

export interface CriarSolicitacaoRequest {
  cracha_almoxarife: string;
  ferramentas: Array<{
    codigo: string;
    qtd: number;
    checklist: string;
    observacao: string;
  }>;
}

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    cracha: string;
    name: string;
    role: 'almoxarife' | 'colaborador' | 'admin';
  };
}

interface RetirarRequest {
  cracha_colaborador: string;
  ferramentas: Array<{
    codigo: string;
    qtd: number;
    checklist: string;
    observacao: string;
  }>;
}

interface DevolverRequest {
  cracha_almoxarife: string;
  cracha_colaborador: string;
  ferramentas: Array<{
    codigo: string;
    observacao: string;
  }>;
}

interface TrocarRequest {
  cracha_novo_colaborador: string;
  ferramentas: Array<{
    codigo: string;
    qtd: number;
    checklist: string;
    observacao: string;
  }>;
}

export interface Ferramenta {
  id: number;
  codigo: string;
  nome: string;
  categoria: string;
  status: 'Disponível' | 'Em uso' | 'Em manutenção';
  alocadoPara?: string;
}

export interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'sucesso';
  lida: boolean;
  created_at: string;
}

export class APIClient {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Interceptor para adicionar token às requisições
    this.api.interceptors.request.use(async (config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Interceptor para tratamento de erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expirado ou inválido
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Inicializa o cliente com token armazenado
   */
  async initialize(): Promise<void> {
    try {
      this.token = await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Erro ao carregar token do armazenamento:', error);
    }
  }

  // --- FLUXO DE DEVOLUÇÃO ---

  async solicitarDevolucao(request: { cracha_colaborador: string; ferramentas: { codigo: string }[] }): Promise<any> {
    try {
      const response = await this.api.post('/devolucao/solicitar', request);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  async listarDevolucoesPendentes(): Promise<any> {
    try {
      const response = await this.api.get('/devolucao/pendentes');
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  async confirmarDevolucao(id: number, checklistStatus: 'ok' | 'com_defeito', observacao?: string): Promise<any> {
    try {
      const response = await this.api.post(`/devolucao/${id}/confirmar`, {
        checklist_status: checklistStatus,
        observacao: observacao
      });
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  async recusarDevolucao(id: number, motivo: string): Promise<any> {
    try {
      const response = await this.api.post(`/devolucao/${id}/recusar`, { motivo });
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Verificar status de uma solicitação específica (Polling)
   */
  /**
   * Verificar status de uma solicitação específica (Polling)
   */
  async verificarStatusSolicitacao(id: number): Promise<'pendente' | 'aprovada' | 'recusada'> {
    try {
      console.log(`[Polling] A perguntar ao servidor o status do Pedido #${id}...`);
      
      // O ?t=${Date.now()} força o telemóvel a não usar cache antigo
      const response = await this.api.get(`/solicitacoes/${id}/status?t=${Date.now()}`);
      
      console.log(`[Polling] Resposta do Pedido #${id}:`, response.data.status);
      return response.data.status;
      
    } catch (error) {
      console.error(`[Polling] ERRO de rede ou 404 no Pedido #${id}:`, error);
      return 'pendente'; 
    }
  }

  async criarSolicitacao(request: CriarSolicitacaoRequest): Promise<any> {
    try {
      const response = await this.api.post('/solicitacoes', request);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }
  /**
   * Login com crachá e senha
   */
  async login(cracha: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.api.post<LoginResponse>('/login', {
        cracha,
        password,
      });

      // Salvar token
      this.token = response.data.access_token;
      await AsyncStorage.setItem('authToken', this.token);
      await AsyncStorage.setItem('userRole', response.data.user.role);
      await AsyncStorage.setItem('userCracha', response.data.user.cracha);

      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Logout - limpa token
   */
  async logout(): Promise<void> {
    this.clearToken();
  }

  /**
   * Retirada de ferramentas (Almoxarife)
   */
  async retirar(request: RetirarRequest): Promise<any> {
    try {
      const response = await this.api.post('/retirar', request);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Devolução de ferramentas (Colaborador + Almoxarife)
   */
  async devolver(request: DevolverRequest): Promise<any> {
    try {
      const response = await this.api.post('/devolver', request);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Troca entre colaboradores (Transferência)
   */
  async trocar(request: TrocarRequest): Promise<any> {
    try {
      const response = await this.api.post('/trocar', request);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Listar ferramentas disponíveis
   */
  async listarFerramentas(): Promise<Ferramenta[]> {
    try {
      const response = await this.api.get<Ferramenta[]>('/ferramentas');
      return response.data.map((item: any) => ({
        ...item,
        alocadoPara: item.alocadoPara ?? item.alocado ?? item.alocado_para ?? undefined,
      }));
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * ─── BUSCA DE USUÁRIO VIA NFC ────────────────────────────────────────────
   */
  async buscarUsuarioPorNFC(nfcId: string): Promise<{ cracha: string; nome: string; role: string }> {
    try {
      // O nfcId normalmente vem como hexadecimal do chip
      const response = await this.api.get(`/usuario/por-nfc/${nfcId}`);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Listar ferramentas de um colaborador
   */
  async listarMinhasFerramentas(cracha?: string): Promise<Ferramenta[]> {
    try {
      const endpoint = cracha ? `/ferramentas?cracha=${encodeURIComponent(cracha)}` : '/ferramentas';
      const response = await this.api.get<Ferramenta[]>(endpoint);
      return response.data.map((item: any) => ({
        ...item,
        alocadoPara: item.alocadoPara ?? item.alocado ?? item.alocado_para ?? undefined,
      }));
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  async listarRelatoriosMovimentacoes(): Promise<any> {
    try {
      const response = await this.api.get('/relatorios/movimentacoes');
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  async baixarRelatorio(formato: 'excel' | 'pdf'): Promise<string> {
    try {
      const extension = formato === 'excel' ? 'xlsx' : 'pdf';
      const fileName = `Relatorio_Marilan.${extension}`;
      const cacheDirectory = ((FileSystem as unknown) as { cacheDirectory?: string }).cacheDirectory ?? '';
      const fileUri = `${cacheDirectory}${fileName}`;
      const url = `${this.api.defaults.baseURL}/relatorios/movimentacoes?formato=${formato}`;
      const headers = this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
      const result = await FileSystem.downloadAsync(url, fileUri, { headers });
      return result.uri;
    } catch (error: any) {
      throw new Error(this.extractErrorMessage(error));
    }
  }
async listarSolicitacoesPendentes(): Promise<any> {
  try {
    const response = await this.api.get('/solicitacoes/pendentes');
    return response.data;
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}

async aprovarSolicitacao(id: number): Promise<any> {
  try {
    const response = await this.api.post(`/solicitacoes/${id}/aprovar`);
    return response.data;
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}

async recusarSolicitacao(id: number): Promise<any> {
  try {
    const response = await this.api.post(`/solicitacoes/${id}/recusar`);
    return response.data;
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}
async verificarTrocaRecebida(cracha: string): Promise<{ ferramenta_nome: string; de_nome: string } | null> {
  try {
    const response = await this.api.get(`/trocas/recebidas/pendente?cracha=${encodeURIComponent(cracha)}`);
    return response.data ?? null;
  } catch {
    return null;
  }
}

/**
   * ─── NOTIFICAÇÕES ────────────────────────────────────────────────────────
   */

  /**
   * Buscar todas as notificações do utilizador logado
   */
  async listarNotificacoes(): Promise<Notificacao[]> {
    try {
      const response = await this.api.get<Notificacao[]>('/notificacoes');
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Marcar uma notificação específica como lida
   */
  async marcarNotificacaoLida(id: number): Promise<any> {
    try {
      const response = await this.api.patch(`/notificacoes/${id}/ler`);
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

  /**
   * Marcar todas as notificações do utilizador como lidas
   */
  async marcarTodasNotificacoesLidas(): Promise<any> {
    try {
      const response = await this.api.post('/notificacoes/ler-tudo');
      return response.data;
    } catch (error) {
      throw new Error(this.extractErrorMessage(error));
    }
  }

async confirmarVisualizacaoTroca(cracha: string): Promise<void> {
  try {
    await this.api.post('/trocas/recebidas/visualizar', { cracha });
  } catch {}
}

// ── Troca P2P com aceite do destinatário ─────────────────────────────────

async solicitarTrocaP2P(request: {
  de_cracha: string;
  para_cracha: string;
  ferramentas: Array<{ codigo: string; qtd: number }>;
}): Promise<{ id: number }> {
  try {
    const response = await this.api.post('/trocas/solicitar', request);
    return response.data;
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}

async listarTrocasSolicitadasParaMim(para_cracha: string): Promise<any[]> {
  try {
    const response = await this.api.get(`/trocas/pendentes?para_cracha=${encodeURIComponent(para_cracha)}`);
    return response.data ?? [];
  } catch {
    return [];
  }
}

async aceitarTrocaSolicitada(id: number, para_cracha: string): Promise<void> {
  try {
    await this.api.post(`/trocas/${id}/aceitar`, { para_cracha });
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}

async recusarTrocaSolicitada(id: number): Promise<void> {
  try {
    await this.api.post(`/trocas/${id}/recusar`);
  } catch (error) {
    throw new Error(this.extractErrorMessage(error));
  }
}
  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Obter token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Definir token manualmente
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Limpar token
   */
  private clearToken(): void {
    this.token = null;
    AsyncStorage.removeItem('authToken');
    AsyncStorage.removeItem('userRole');
    AsyncStorage.removeItem('userCracha');
  }

  /**
   * Extrair mensagem de erro da resposta
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors) {
      const firstError = Object.values(error.response.data.errors)[0];
      if (Array.isArray(firstError)) {
        return firstError[0];
      }
      return String(firstError);
    }
    if (error.message) {
      return error.message;
    }
    return 'Erro ao conectar com a API';
  }
}

// Instância única
export const apiClient = new APIClient();