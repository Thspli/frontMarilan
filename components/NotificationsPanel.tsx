/**
 * components/NotificationsPanel.tsx
 * Painel com lista de notificações
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationCard } from './NotificationCard';
import { Notificacao } from '@/hooks/useNotificacoes';

interface NotificationsPanelProps {
  notificacoes: Notificacao[];
  naoLidas: number;
  loading: boolean;
  onMarkAsRead?: (id: number) => void;
  onMarkAllAsRead?: () => void;
  onRefresh?: () => void;
}

export function NotificationsPanel({
  notificacoes,
  naoLidas,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationsPanelProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com título e botão "marcar tudo como lido" */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Notificações</Text>
          {naoLidas > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{naoLidas}</Text>
            </View>
          )}
        </View>
        {naoLidas > 0 && onMarkAllAsRead && (
          <TouchableOpacity
            onPress={onMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Ionicons name="checkmark-done" size={20} color="#2196F3" />
            <Text style={styles.markAllText}>Marcar tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de notificações */}
      {notificacoes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma notificação</Text>
        </View>
      ) : (
        <FlatList
          data={notificacoes}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <NotificationCard
              notificacao={item}
              onMarkAsRead={onMarkAsRead}
              onPress={() => {
                // Aqui pode adicionar navegação se necessário
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2196F3"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  markAllText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
