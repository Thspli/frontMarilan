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

  const { user, isLoading } = useAuth();
  const showRelatoriosTab = !isLoading && user?.role === 'almoxarife'; 

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
        }}>
        
        <Tabs.Screen
          name="ferramentas"
          options={{
            title: 'Ferramentas',
            tabBarIcon: ({ color }) => <IconFerramentas size={26} color={color} />,
          }}
        />

        <Tabs.Screen
          name="almoxarifado"
          options={{
            title: 'Almoxarifado',
            tabBarIcon: ({ color }) => <IconAlmoxarifado size={26} color={color} />,
          }}
        />

        {/* NOVA TELA PROTEGIDA */}
        {showRelatoriosTab ? (
          <Tabs.Screen
            name="relatorios"
            options={{
              title: 'Relatórios',
              href: '/relatorios',
              tabBarIcon: ({ color }) => <IconRelatorios size={26} color={color} />,
            }}
          />
        ) : null}
      </Tabs>
    </View>
  );
}