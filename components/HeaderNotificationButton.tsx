/**
 * components/HeaderNotificationButton.tsx
 * Botão de notificações para o header
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationBadge } from './NotificationBadge';

interface HeaderNotificationButtonProps {
  count: number;
  size?: number;
  color?: string;
}

export function HeaderNotificationButton({
  count,
  size = 24,
  color = '#333',
}: HeaderNotificationButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push('/notificacoes' as any);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.button}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
    >
      <NotificationBadge count={count} size={size} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
