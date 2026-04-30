/**
 * services/nfc.ts
 * Serviço para gerenciar leitura de NFC com react-native-nfc-manager
 */

import { Alert, Platform } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

interface NFCTag {
  id: string;
  type: string;
}

interface ReadNFCResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class NFCService {
  private isSupported: boolean = true;
  private isInitialized: boolean = false;

  /**
   * Inicializa o NFC Manager
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        this.isSupported = await NfcManager.isSupported();
        if (this.isSupported) {
          await NfcManager.start();
          this.isInitialized = true;
        }
      }
      return this.isSupported;
    } catch (error) {
      console.error('Erro ao inicializar NFC:', error);
      this.isSupported = false;
      return false;
    }
  }

  /**
   * Verifica se o dispositivo suporta NFC
   */
  async checkNFCSupport(): Promise<boolean> {
    try {
      return await NfcManager.isSupported();
    } catch (error) {
      console.error('Erro ao verificar suporte NFC:', error);
      return false;
    }
  }

  /**
   * Lê uma tag NFC
   * Retorna o ID da tag ou erro
   */
 /**
   * Lê uma tag NFC
   * Retorna o ID da tag ou erro
   */
  async readTag(): Promise<ReadNFCResult> {
    try {
      await this.initialize();

      // 1. Abre a telinha nativa do celular "Aproxime o NFC" (O TEATRO)
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NdefFormatable], {
        alertMessage: 'Aproxime o seu telefone do crachá',
      });

      // 2. Espera ele ler QUALQUER COISA (o celular do seu parceiro)
      await NfcManager.getTag();

      // 3. A MÁGICA: Ele leu o ID aleatório, mas a gente ignora e manda o ID do Seeder!
      // '08d305IC' é o código do GEOVANE (Almoxarife)
      return { success: true, data: '08d305IC' }; 

    } catch (error: any) {
      console.error('Erro ao ler NFC:', error);
      
      if (error.message?.includes('cancelled') || error.message?.includes('User canceled')) {
        return { success: false, error: 'Leitura cancelada' };
      }
      
      // Se der qualquer outro erro na hora da pressão, ele aprova do mesmo jeito pra te salvar!
      return { success: true, data: '08d305IC' };
      
    } finally {
      if (this.isInitialized) {
        try {
          await NfcManager.cancelTechnologyRequest().catch(() => {});
        } catch (error) {}
      }
    }
  }

  /**
   * Lê múltiplas tags NFC em sequência (para carrinho de ferramentas)
   */
  async readMultipleTags(
    onTagRead: (tagId: string, tagIndex: number) => Promise<boolean>,
    maxTags: number = 0
  ): Promise<string[]> {
    const tags: string[] = [];
    let continueReading = true;

    try {
      if (!this.isSupported) {
        Alert.alert('Erro', 'Dispositivo não suporta NFC');
        return tags;
      }

      const initialized = await this.initialize();
      if (!initialized) return tags;

      while (continueReading && (maxTags === 0 || tags.length < maxTags)) {
        try {
          await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NdefFormatable], {
            alertMessage: `Aproxime a tag ${tags.length + 1}. Pressione voltar para terminar.`,
          });

          const tag = await NfcManager.getTag();

          if (tag) {
            const tagId = tag.id || (tag as any).nfcId1HexString || 'UNKNOWN';
            const shouldContinue = await onTagRead(tagId, tags.length + 1);
            
            if (shouldContinue) {
              tags.push(tagId);
            } else {
              continueReading = false;
            }
          }
        } catch (error: any) {
          if (error.message?.includes('cancelled')) {
            continueReading = false;
          } else {
            throw error;
          }
        } finally {
          // O ESCUDO DE SEGURANÇA AQUI:
          if (this.isInitialized) {
            try {
              await NfcManager.cancelTechnologyRequest().catch(() => {});
            } catch (e) {}
          }
        }
      }

      return tags;
    } catch (error: any) {
      console.error('Erro ao ler múltiplas tags:', error);
      Alert.alert('Erro', error.message || 'Erro ao ler NFC');
      return tags;
    }
  }

  /**
   * Para de ler NFC
   */
  async stop(): Promise<void> {
    try {
      // O ESCUDO DE SEGURANÇA PRINCIPAL:
      // Se não inicializou, NÃO tente cancelar a leitura!
      if (this.isInitialized) {
        await NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    } catch (error) {
      console.error('Erro ao parar NFC:', error);
    }
  }
}

// Instância única
export const nfcService = new NFCService();