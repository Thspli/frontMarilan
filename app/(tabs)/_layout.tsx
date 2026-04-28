/**
 * app/(tabs)/_layout.tsx — Marilan v5.2
 * 
 * SEGURANÇA: Guard de Rota baseado em Role
 * 
 * A aba "Relatórios" só é renderizada se userRole === 'almoxarife'.
 * Ao trocar de conta, o useAuth re-executa e o layout reage instantaneamente,
 * pois lê diretamente do estado global do hook (AsyncStorage → estado React).
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { IconFerramentas } from '@/components/icons/IconFerramentas';
import { IconAlmoxarifado } from '@/components/icons/IconAlmoxarifado';
import { IconRelatorios } from '@/components/icons/IconRelatorios';

export default function TabLayout() {
  const orangeMarilan = '#FF6B00';
  const white = '#FFFFFF';
  const darkOrange = '#A64000';
  const appBackgroundColor = '#F8F9FA';

  // ─── GUARD: Lê role do estado global (hidratado do AsyncStorage no boot) ────
  // useAuth já inicializa com AsyncStorage.getItem('userRole'), então ao trocar
  // de conta (logout → login) o estado é atualizado e esse componente re-renderiza.
  const { user, isLoading } = useAuth();

  // Só mostra a aba depois que o estado de auth foi hidratado E o role é almoxarife.
  // Enquanto isLoading=true, a aba simplesmente não aparece (evita flash de permissão).
  const canAccessRelatorios = !isLoading && user?.role === 'almoxarife';

  return (
    <View style={{ flex: 1, backgroundColor: appBackgroundColor }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: white,
          tabBarInactiveTintColor: darkOrange,
          headerShown: false,

          tabBarStyle: {
            backgroundColor: orangeMarilan,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: Platform.OS === 'ios' ? 90 : 70,
            position: 'relative',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          },
          tabBarLabelStyle: {
            fontWeight: '700',
            fontSize: 12,
            marginTop: 2,
          },
        }}
      >
        {/* ── Aba sempre visível ── */}
        <Tabs.Screen
          name="ferramentas"
          options={{
            title: 'Ferramentas',
            tabBarIcon: ({ color }) => <IconFerramentas size={26} color={color} />,
          }}
        />

        {/* ── Aba sempre visível ── */}
        <Tabs.Screen
          name="almoxarifado"
          options={{
            title: 'Almoxarifado',
            tabBarIcon: ({ color }) => <IconAlmoxarifado size={26} color={color} />,
          }}
        />

        {/*
         * ── GUARD DE ROTA — Aba "Relatórios" ──────────────────────────────────
         *
         * Estratégia: sempre declaramos a Tabs.Screen para que o expo-router
         * não quebre em deep links. Controlamos a visibilidade via `href`:
         *
         *   - Se autorizado  → href='/relatorios' (link normal, ícone visível)
         *   - Se não autorizado → href=null (remove o item do tab bar)
         *
         * Isso é mais seguro que renderização condicional do <Tabs.Screen> porque:
         *   1. Evita re-mount do navegador ao alternar accounts.
         *   2. A rota '/relatorios' ainda existe para o expo-router, mas não é
         *      acessível pelo menu — qualquer acesso direto é bloqueado dentro
         *      do próprio componente RelatoriosScreen (segunda camada de defesa).
         */}
        <Tabs.Screen
          name="relatorios"
          options={{
            title: 'Relatórios',
            // href=null → expo-router v3+ oculta o item do tab bar
            // sem desmontar o stack de navegação
            href: canAccessRelatorios ? '/relatorios' : null,
            tabBarIcon: ({ color }) => <IconRelatorios size={26} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}