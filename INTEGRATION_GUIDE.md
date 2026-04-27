# 🚀 Guia de Implementação - Integração API Marilan

## 📋 Visão Geral

Este documento detalha a integração do Frontend React Native com a API Laravel do projeto Marilan. Foram criados serviços, hooks e telas refatoradas para consumir a API real.

---

## 📦 Instalação de Dependências

### 1. Instalar pacotes obrigatórios

```bash
npm install axios @react-native-async-storage/async-storage
```

Ou se usar expo:
```bash
expo install axios @react-native-async-storage/async-storage
```

### 2. Verificar se react-native-nfc-manager está instalado

```bash
npm list react-native-nfc-manager
```

Se não estiver instalado:
```bash
npm install react-native-nfc-manager
```

---

## 🏗️ Estrutura de Arquivos Criados

```
services/
  ├── api.ts                    # Cliente API com Axios + interceptadores
  ├── nfc.ts                    # Gerenciador de NFC (react-native-nfc-manager)

hooks/
  ├── useAuth.ts                # Hook de autenticação
  ├── useTools.ts               # Hook de gerenciamento de ferramentas

app/
  ├── login-new.tsx             # Tela de login refatorada com API
  
app/(tabs)/
  ├── ferramentas-new.tsx       # Tela de ferramentas (Colaborador) com API + NFC
  ├── almoxarifado-new.tsx      # Tela de almoxarifado (Almoxarife) com API + NFC
```

---

## 🔐 Autenticação (API Service)

### Configuração Base

**Arquivo:** `services/api.ts`

```typescript
const API_BASE_URL = 'http://localhost:8000/api';

// Métodos principais:
- apiClient.login(cracha, password)         // POST /login
- apiClient.logout()                         // Limpa token
- apiClient.isAuthenticated()                // Verifica se tem token
- apiClient.getToken()                       // Obtém token atual
```

### Como funciona:

1. **Quando o usuário faz login:**
   - POST `/login` com `cracha` e `password`
   - Recebe `access_token` e dados do usuário
   - Token é salvo em `AsyncStorage` com chave `authToken`
   - Role do usuário é salvo em `userRole` para controlar visibilidade de botões

2. **Interceptadores automáticos:**
   - Toda requisição adiciona `Authorization: Bearer {TOKEN}` automaticamente
   - Se receber 401, o token é limpo automaticamente

3. **Persistência:**
   ```typescript
   // Em qualquer tela, você pode recuperar o token:
   const token = await AsyncStorage.getItem('authToken');
   const role = await AsyncStorage.getItem('userRole');
   const cracha = await AsyncStorage.getItem('userCracha');
   ```

---

## 🔄 Fluxo de Integração por Endpoint

### 1️⃣ Login (`POST /login`)

**Implementação:**
```typescript
// app/login-new.tsx
const handleLogin = async () => {
  try {
    const response = await apiClient.login(cracha, password);
    // response.access_token
    // response.user { id, cracha, name, role }
    router.replace('/(tabs)');
  } catch (error) {
    setError(error.message);
  }
};
```

---

### 2️⃣ Retirada de Ferramentas (`POST /retirar`)

**Utilizado por:** Almoxarife  
**Tela:** `almoxarifado-new.tsx`

**Body esperado:**
```json
{
  "cracha_colaborador": "1236",
  "ferramentas": [
    {
      "codigo": "50036280",
      "qtd": 1,
      "checklist": "REALIZADO",
      "observacao": "Ok"
    }
  ]
}
```

**Implementação:**
```typescript
const handleSubmitCarrinho = async () => {
  const crachaManu = await AsyncStorage.getItem('userCracha');
  
  const response = await apiClient.retirar({
    cracha_colaborador: crachColaborador, // Pedido via prompt
    ferramentas: carrinho.map(f => ({
      codigo: f.codigo,
      qtd: f.qtd,
      checklist: 'REALIZADO',
      observacao: 'Retirada via NFC',
    })),
  });
  
  // Sucesso - limpar carrinho e recarregar
  setCarrinho([]);
  await loadFerramentas();
};
```

---

### 3️⃣ Devolução de Ferramentas (`POST /devolver`)

**Utilizado por:** Colaborador ou Almoxarife  
**Observação:** A API valida se a ferramenta pertence ao crachá do colaborador

**Body esperado:**
```json
{
  "cracha_almoxarife": "1234",
  "cracha_colaborador": "1236",
  "ferramentas": [
    {
      "codigo": "50036280",
      "observacao": "Devolvido com broca cega"
    }
  ]
}
```

**Exemplo de uso futuro:**
```typescript
const handleDevolver = async (ferramentasCodigos: string[]) => {
  const userCracha = await AsyncStorage.getItem('userCracha');
  const almoxarifeCracha = '1234'; // Seria pedido ao usuário
  
  await apiClient.devolver({
    cracha_almoxarife: almoxarifeCracha,
    cracha_colaborador: userCracha,
    ferramentas: ferramentasCodigos.map(codigo => ({
      codigo,
      observacao: 'Devolvido em bom estado',
    })),
  });
};
```

---

### 4️⃣ Troca Entre Colaboradores (`POST /trocar`)

**Utilizado por:** Colaboradores (Manutentores)  
**Tela:** `ferramentas-new.tsx`

**Body esperado:**
```json
{
  "cracha_novo_colaborador": "1237",
  "ferramentas": [
    {
      "codigo": "50038854",
      "qtd": 1,
      "checklist": "REALIZADO",
      "observacao": "Transferência em campo"
    }
  ]
}
```

**Implementação:**
```typescript
const handleSwap = async () => {
  const userCracha = await AsyncStorage.getItem('userCracha');
  
  const response = await apiClient.trocar({
    cracha_novo_colaborador: userCracha,
    ferramentas: [
      {
        codigo: tool.codigo,
        qtd: 1,
        checklist: 'REALIZADO',
        observacao: 'Troca via NFC',
      },
    ],
  });
};
```

---

## 📱 NFC Manager (react-native-nfc-manager)

### Serviço NFC (`services/nfc.ts`)

```typescript
// Inicializar
const supported = await nfcService.initialize();

// Ler uma tag
const result = await nfcService.readTag();
if (result.success) {
  console.log('Tag ID:', result.data); // ID da tag lida
} else {
  console.log('Erro:', result.error);
}

// Ler múltiplas tags em sequência
const tags = await nfcService.readMultipleTags(
  async (tagId, index) => {
    console.log(`Tag ${index}: ${tagId}`);
    return true; // Continuar lendo
  },
  0 // 0 = sem limite de tags
);

// Parar leitura
await nfcService.stop();
```

### Verificação de Suporte

```typescript
const supported = await nfcService.checkNFCSupport();
if (!supported) {
  // Mostrar button "Digitar Manualmente"
}
```

### Manifest Android

O projeto já tem `react-native-nfc-manager` instalado. Certifique-se de que `app.json` tem:

```json
{
  "plugins": [
    ["react-native-nfc-manager", { "nfcPermission": "true" }]
  ]
}
```

Se não estiver, adicione e rode:
```bash
expo prebuild --clean
```

---

## 🎯 Uso Prático nas Telas

### Tela de Ferramentas (Colaborador)

```typescript
// ferramentas-new.tsx
import { apiClient } from '../../services/api';
import { nfcService } from '../../services/nfc';

export default function FerramentasScreen() {
  const [ferramentas, setFerramentas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFerramentas();
  }, []);

  const loadFerramentas = async () => {
    try {
      const cracha = await AsyncStorage.getItem('userCracha');
      const data = await apiClient.listarMinhasFerramentas(cracha);
      setFerramentas(data);
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapVia NFC = async (tool) => {
    const result = await nfcService.readTag();
    if (result.success) {
      await apiClient.trocar({
        cracha_novo_colaborador: userCracha,
        ferramentas: [{ codigo: tool.codigo, ... }],
      });
    }
  };
}
```

### Tela de Almoxarifado

```typescript
// almoxarifado-new.tsx
const handleNFCRead = async () => {
  const result = await nfcService.readTag();
  if (result.success) {
    handleAddToolToCarrinho(result.data); // result.data = código
  }
};

const handleSubmitCarrinho = async () => {
  await apiClient.retirar({
    cracha_colaborador: crachColaborador,
    ferramentas: carrinho.map(f => ({...})),
  });
};
```

---

## 🔧 Substituindo Arquivos Antigos

### Passo 1: Backup (Opcional)
```bash
mv app/login.tsx app/login-old.tsx
mv app/(tabs)/ferramentas.tsx app/(tabs)/ferramentas-old.tsx
mv app/(tabs)/almoxarifado.tsx app/(tabs)/almoxarifado-old.tsx
```

### Passo 2: Renomear Novos
```bash
mv app/login-new.tsx app/login.tsx
mv app/(tabs)/ferramentas-new.tsx app/(tabs)/ferramentas.tsx
mv app/(tabs)/almoxarifado-new.tsx app/(tabs)/almoxarifado.tsx
```

### Passo 3: Atualizar imports (se necessário)
Procure por referências a `login-new.tsx` ou `ferramentas-new.tsx` e ajuste.

---

## ⚙️ Variáveis de Ambiente

Se usar variáveis de ambiente, adicione a `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api
EXPO_PUBLIC_ENABLE_NFC=true
```

E atualize `services/api.ts`:

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
```

---

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                    APLICATIVO MOBILE                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  login.tsx ─────┐                                      │
│                 ├──→ apiClient.login()                  │
│  ferramentas.tsx │   [Bearer Token]                     │
│                 │                                       │
│  almoxarifado.tsx ──→ apiClient.retirar()             │
│                 │   apiClient.devolver()               │
│                 │   apiClient.trocar()                 │
│                 │   apiClient.listarFerramentas()      │
│                 │   nfcService.readTag()               │
│                 │                                       │
│  AsyncStorage ──┤ (Persistência de token)             │
│                 │                                       │
└────────┬────────┴─────────────────────────────────────┐
         │                                              │
         ▼                                              ▼
    ┌─────────┐                                  ┌──────────┐
    │   NFC   │                                  │  Laravel │
    │ Manager │                                  │   API    │
    └─────────┘                                  └──────────┘
         │                                              │
         └──→ Lê tag de ferramenta/crachá             │
             Envia código para API ────────────────────┘
```

---

## 🐛 Tratamento de Erros

### Exemplo Completo:

```typescript
try {
  const response = await apiClient.retirar({
    cracha_colaborador: '1236',
    ferramentas: [...],
  });
  
  // Sucesso
  showToast('✅ Retirada registrada!');
} catch (error) {
  // Erro da API
  if (error.message.includes('403')) {
    Alert.alert('Acesso Negado', 'Você não tem permissão');
  } else if (error.message.includes('404')) {
    Alert.alert('Não Encontrado', 'Ferramenta não existe');
  } else {
    Alert.alert('Erro', error.message);
  }
  
  // Logging para debug
  console.error('[API Error]', error);
}
```

---

## ✅ Checklist de Implementação

- [ ] Instalar `axios` e `@react-native-async-storage/async-storage`
- [ ] Criar `services/api.ts` com cliente API
- [ ] Criar `services/nfc.ts` com gerenciador NFC
- [ ] Criar `hooks/useAuth.ts` (opcional mas recomendado)
- [ ] Criar `hooks/useTools.ts` (opcional mas recomendado)
- [ ] Refatorar `app/login.tsx` com integração real
- [ ] Refatorar `app/(tabs)/ferramentas.tsx` com API + NFC
- [ ] Refatorar `app/(tabs)/almoxarifado.tsx` com API + NFC
- [ ] Testar login com crachá/senha do backend
- [ ] Testar leitura de NFC em device físico
- [ ] Testar integração de todos os endpoints
- [ ] Revisar tratamento de erros em cada tela
- [ ] Adicionar logs de debug se necessário
- [ ] Testar persistência de token (logout e reabrir app)
- [ ] Validar regra de negócio: 403 ao tentar devolver ferramenta de outro usuário

---

## 🚀 Próximas Etapas

1. **Testes com Backend Real:**
   - Configure `http://localhost:8000/api` no seu backend Laravel
   - Teste os 4 endpoints principais

2. **Melhorias de UX:**
   - Adicionar loading states em todas as requisições
   - Implementar retry automático em caso de timeout
   - Melhorar mensagens de erro para o usuário

3. **Segurança:**
   - Usar `@react-native-secure-storage` em produção (em vez de AsyncStorage)
   - Implementar refresh token se a API usar
   - Adicionar certificate pinning para APIs sensíveis

4. **Performance:**
   - Implementar cache de ferramentas com TTL
   - Usar React Query ou SWR para sincronização
   - Lazy load de imagens e recursos

---

## 📞 Suporte

Para dúvidas específicas da API, consulte a documentação do backend Laravel em anexo.

Para dúvidas sobre React Native:
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
- [react-native-nfc-manager](https://github.com/revtel/react-native-nfc-manager)

---

**Versão:** 1.0  
**Última atualização:** Abril 2026  
**Ambiente:** React Native + Expo
