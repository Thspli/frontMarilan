/**
 * components/NotificationBadge.tsx
 * Ícone de notificações com badge de contagem
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationBadgeProps {
  count: number;
  size?: number;
  color?: string;
}

export function NotificationBadge({
  count,
  size = 24,
  color = '#333',
}: NotificationBadgeProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="notifications" size={size} color={color} />
      {count > 0 && (
        <View style={[styles.badge, { minWidth: count > 9 ? 22 : 18 }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 9,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});
