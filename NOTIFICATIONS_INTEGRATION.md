# Integração do Sistema de Notificações — Marilan Frontend

**Versão:** 1.0 | **Data:** 29/04/2026

---

## 📋 Visão Geral

O sistema de notificações foi completamente integrado ao frontend Expo/React Native. Ele funciona com **polling automático a cada 60 segundos** e busca imediatamente quando o app retorna do background (AppState listener).

### Funcionalidades Implementadas

✅ Hook `useNotificacoes` com gerenciamento de estado  
✅ Componente `NotificationCard` com visual por tipo  
✅ Painel completo de notificações (`NotificationsPanel`)  
✅ Badge no header com contagem de não lidas  
✅ Polling automático cada 60s  
✅ Listener de AppState (busca ao app ficar ativo)  
✅ Rotas para marcar como lida (individual e em lote)  
✅ Tela modal acessível via `/notificacoes`

---

## 🏗️ Estrutura de Arquivos

```
hooks/
├── useNotificacoes.ts         ← Hook principal com polling e AppState
│
components/
├── NotificationCard.tsx        ← Card individual com tipo/ícone
├── NotificationBadge.tsx       ← Badge para exibir contagem
├── NotificationsPanel.tsx      ← Painel com lista de notificações
└── HeaderNotificationButton.tsx ← Botão interativo para o header
│
app/
├── notificacoes.tsx            ← Tela modal (acessível via /notificacoes)
└── (tabs)/
    ├── ferramentas.tsx         ← Integrado com badge + polling
    └── almoxarifado.tsx        ← Integrado com badge + polling
```

---

## 🔌 Como Usar

### 1. **Usar o Hook em Qualquer Tela**

```tsx
import { useNotificacoes } from '@/hooks/useNotificacoes';

export default function MinhaTelaScreen() {
  const { 
    notificacoes,        // Notificacao[]
    naoLidas,            // number
    loading,             // boolean
    buscar,              // () => Promise<void>
    marcarLida,          // (id: number) => Promise<void>
    marcarTodasLidas,    // () => Promise<void>
  } = useNotificacoes();

  return (
    <View>
      {/* notificacoes tem { id, titulo, mensagem, tipo, lida, ... } */}
      <Text>Notificações não lidas: {naoLidas}</Text>
    </View>
  );
}
```

### 2. **Adicionar Badge no Header (Qualquer Tela)**

```tsx
import { HeaderNotificationButton } from '@/components/HeaderNotificationButton';
import { useNotificacoes } from '@/hooks/useNotificacoes';

export default function MyScreen() {
  const { naoLidas } = useNotificacoes();
  
  return (
    <View style={styles.header}>
      <Text>Minha Tela</Text>
      
      {/* Badge automático que navega para /notificacoes */}
      <HeaderNotificationButton 
        count={naoLidas} 
        size={24} 
        color="white" 
      />
    </View>
  );
}
```

### 3. **Exibir Lista Completa de Notificações**

Já existe uma tela pronta em `/notificacoes`:

```tsx
// Navegar para a tela
import { useRouter } from 'expo-router';

export default function SomeScreen() {
  const router = useRouter();
  
  return (
    <Button onPress={() => router.push('/notificacoes')} 
            title="Ver Notificações" />
  );
}
```

### 4. **Marcar uma Notificação como Lida**

```tsx
const { marcarLida } = useNotificacoes();

// Ao tocar em um card
<TouchableOpacity onPress={() => marcarLida(notificacao.id)}>
  <NotificationCard notificacao={notificacao} />
</TouchableOpacity>
```

### 5. **Marcar Todas como Lidas**

```tsx
const { marcarTodasLidas } = useNotificacoes();

<Button 
  onPress={marcarTodasLidas} 
  title="Marcar tudo como lido" 
/>
```

---

## 🔄 Polling e AppState

### Como Funciona

1. **Ao inicializar o hook** (`useNotificacoes`):
   - Busca imediatamente do servidor
   - Inicia polling automático a cada **60 segundos**

2. **Ao app voltar do background**:
   - AppState listener detecta estado `'active'`
   - Busca imediatamente (não espera 60s)

3. **Ao parar polling** (cleanup):
   - Limpa intervalo
   - Remove listeners de AppState

### Para Customizar o Intervalo

Edite em [hooks/useNotificacoes.ts](hooks/useNotificacoes.ts) linha ~130:

```typescript
// Mudar de 60000ms (60s) para outro valor
pollingIntervalRef.current = setInterval(() => {
  buscar();
}, 60000);  // ← Aqui
```

---

## 🎨 Mapeamento Visual por Tipo

| `tipo`    | Cor         | Ícone                | Uso                                 |
|-----------|-------------|----------------------|-------------------------------------|
| `info`    | Azul        | ℹ️ (information-circle) | Retiradas, transferências           |
| `alerta`  | Laranja     | ⚠️ (warning)         | Não devolvidas, atrasos             |
| `sucesso` | Verde       | ✅ (checkmark-circle)  | Devoluções, manutenção concluída    |

Veja [components/NotificationCard.tsx](components/NotificationCard.tsx) para customizar as cores.

---

## 📝 Exemplo Completo: Integração em Uma Tela

```tsx
import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { NotificationsPanel } from '@/components/NotificationsPanel';

export default function NotificacoesScreen() {
  const { 
    notificacoes, 
    naoLidas, 
    loading, 
    buscar, 
    marcarLida, 
    marcarTodasLidas 
  } = useNotificacoes();

  useEffect(() => {
    // Buscar ao abrir a tela
    buscar();
  }, [buscar]);

  return (
    <NotificationsPanel
      notificacoes={notificacoes}
      naoLidas={naoLidas}
      loading={loading}
      onMarkAsRead={marcarLida}
      onMarkAllAsRead={marcarTodasLidas}
      onRefresh={buscar}
    />
  );
}
```

---

## 🔒 Autenticação

- **Token automático:** O hook lê `authToken` do AsyncStorage e o configura automaticamente.
- **Renovação:** Se o token expirar, a requisição retornará erro 401, e será necessário fazer login novamente.

---

## 🐛 Troubleshooting

### Badge não aparece

- Verifique se `naoLidas > 0`
- Confirme que o token está em AsyncStorage (`authToken`)
- Veja se o servidor retorna notificações com `lida: false`

### Polling não funciona

- Verifique se o hook está sendo iniciado
- Confirme que `startPolling()` é chamado no `useEffect`
- Veja se há intervalo ativo: `console.log(pollingIntervalRef.current)`

### AppState listener não pega "active"

- Teste mudando de app e voltando
- No Expo, o AppState pode não funcionar em development, teste em APK/IPA
- Verifique console.log em `AppState.addEventListener`

### Erro 401 "Token não encontrado"

- Usuário não está logado
- Token expirou → fazer login novamente
- Verificar se `AsyncStorage.setItem('authToken', ...)` foi chamado no login

---

## 📊 API Endpoints Utilizados

Todos configurados automaticamente no hook com Bearer token:

| Método | Endpoint              | Descrição                         |
|--------|----------------------|-----------------------------------|
| GET    | `/api/notificacoes`   | Buscar notificações do usuário   |
| PATCH  | `/api/notificacoes/{id}/ler` | Marcar uma como lida    |
| POST   | `/api/notificacoes/ler-tudo`  | Marcar todas como lidas |

---

## 🚀 Próximos Passos (Opcional)

- [ ] Persistir notificações em cache local (AsyncStorage)
- [ ] Sound/vibração ao receber nova notificação
- [ ] Deeplinks para notificações (toque abre tela específica)
- [ ] Paginação se lista crescer muito
- [ ] Filtros por tipo (info, alerta, sucesso)
- [ ] Exclusão lógica de notificações antigas (7 dias)

---

## 📞 Suporte

Para dúvidas sobre:
- **Hook:** Veja [hooks/useNotificacoes.ts](hooks/useNotificacoes.ts)
- **Componentes:** Veja [components/NotificationCard.tsx](components/NotificationCard.tsx)
- **API:** Consulte a documentação em [DOCUMENTATION_API.md](DOCUMENTATION_API.md)
