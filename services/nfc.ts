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
  async readTag(): Promise<ReadNFCResult> {
    try {
      if (!this.isSupported) {
        return {
          success: false,
          error: 'Dispositivo não suporta NFC',
        };
      }

      await this.initialize();

      // Solicitar tecnologia NFC
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NdefFormatable], {
        alertMessage: 'Aproxime o seu telefone de uma tag NFC',
      });

      const tag = await NfcManager.getTag();

      if (tag) {
        // Extrair ID da tag (geralmente disponível como tag.id)
        const tagId = tag.id || (tag as any).nfcId1HexString || 'UNKNOWN';
        
        return {
          success: true,
          data: tagId,
        };
      }

      return {
        success: false,
        error: 'Nenhuma tag NFC detectada',
      };
    } catch (error: any) {
      console.error('Erro ao ler NFC:', error);
      
      // Verificar se foi cancelado pelo usuário
      if (error.message?.includes('cancelled')) {
        return {
          success: false,
          error: 'Leitura cancelada',
        };
      }

      return {
        success: false,
        error: error.message || 'Erro ao ler NFC',
      };
    } finally {
      // Limpar tecnologia NFC
      if (Platform.OS === 'android') {
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch (error) {
          // Ignorar erros ao cancelar
        }
      }
    }
  }

  /**
   * Lê múltiplas tags NFC em sequência (para carrinho de ferramentas)
   * Param: onTagRead - callback para quando uma tag é lida
   * Param: maxTags - número máximo de tags a ler (0 = infinito)
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

      await this.initialize();

      while (continueReading && (maxTags === 0 || tags.length < maxTags)) {
        try {
          await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NdefFormatable], {
            alertMessage: `Aproxime a tag ${tags.length + 1}. Pressione voltar para terminar.`,
          });

          const tag = await NfcManager.getTag();

          if (tag) {
            const tagId = tag.id || (tag as any).nfcId1HexString || 'UNKNOWN';
            
            // Chamar callback para verificar se deve continuar
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
          if (Platform.OS === 'android') {
            try {
              await NfcManager.cancelTechnologyRequest();
            } catch (e) {
              // Ignorar
            }
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
      if (Platform.OS === 'android') {
        await NfcManager.cancelTechnologyRequest();
      }
      // Não fazer stop completo para manter o NFC ativo
    } catch (error) {
      console.error('Erro ao parar NFC:', error);
    }
  }
}

// Instância única
export const nfcService = new NFCService();
