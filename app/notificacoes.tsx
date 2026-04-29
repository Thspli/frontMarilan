/**
 * app/notificacoes.tsx
 * Tela modal de notificações
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { NotificationsPanel } from '@/components/NotificationsPanel';

export default function NotificacoesScreen() {
  const router = useRouter();
  const { notificacoes, naoLidas, loading, buscar, marcarLida, marcarTodasLidas } =
    useNotificacoes();

  useEffect(() => {
    // Buscar notificações ao abrir a tela
    buscar();
  }, [buscar]);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notificações',
          presentation: 'modal',
          headerBackTitle: 'Voltar',
        }}
      />
      <NotificationsPanel
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        loading={loading}
        onMarkAsRead={marcarLida}
        onMarkAllAsRead={marcarTodasLidas}
        onRefresh={buscar}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
