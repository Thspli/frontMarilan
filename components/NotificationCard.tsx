/**
 * components/NotificationCard.tsx
 * Card para exibir uma notificação individual
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Notificacao } from '@/hooks/useNotificacoes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationCardProps {
  notificacao: Notificacao;
  onPress?: () => void;
  onMarkAsRead?: (id: number) => void;
}

const getTypeStyles = (tipo: 'info' | 'alerta' | 'sucesso') => {
  switch (tipo) {
    case 'alerta':
      return {
        backgroundColor: '#FEF3E2',
        borderLeftColor: '#FF9800',
        iconColor: '#FF9800',
        iconName: 'warning' as const,
      };
    case 'sucesso':
      return {
        backgroundColor: '#E8F5E9',
        borderLeftColor: '#4CAF50',
        iconColor: '#4CAF50',
        iconName: 'checkmark-circle' as const,
      };
    case 'info':
    default:
      return {
        backgroundColor: '#E3F2FD',
        borderLeftColor: '#2196F3',
        iconColor: '#2196F3',
        iconName: 'information-circle' as const,
      };
  }
};

export function NotificationCard({
  notificacao,
  onPress,
  onMarkAsRead,
}: NotificationCardProps) {
  const colorScheme = useColorScheme();
  const typeStyles = getTypeStyles(notificacao.tipo);

  const handlePress = () => {
    if (!notificacao.lida && onMarkAsRead) {
      onMarkAsRead(notificacao.id);
    }
    onPress?.();
  };

  // Formatar data relativa
  const tempoRelativo = formatDistanceToNow(
    new Date(notificacao.created_at),
    {
      addSuffix: true,
      locale: ptBR,
    }
  );

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: typeStyles.backgroundColor,
            borderLeftColor: typeStyles.borderLeftColor,
            opacity: notificacao.lida ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={typeStyles.iconName}
            size={24}
            color={typeStyles.iconColor}
          />
          {!notificacao.lida && (
            <View style={[styles.badge, { backgroundColor: typeStyles.borderLeftColor }]} />
          )}
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.titulo} numberOfLines={1}>
            {notificacao.titulo}
          </Text>
          <Text style={styles.mensagem} numberOfLines={2}>
            {notificacao.mensagem}
          </Text>
          <Text style={styles.timestamp}>{tempoRelativo}</Text>
        </View>

        {!notificacao.lida && (
          <View style={styles.indicadorNaoLida}>
            <View style={[styles.bolinha, { backgroundColor: typeStyles.borderLeftColor }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  contentContainer: {
    flex: 1,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mensagem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  indicadorNaoLida: {
    marginLeft: 8,
  },
  bolinha: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
