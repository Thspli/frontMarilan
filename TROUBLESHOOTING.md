/**
 * 🔧 GUIA DE RESOLUÇÃO DE ERROS
 * Problemas comuns e suas soluções
 */

# Erro 1: "Cannot find module 'axios' or its corresponding type declarations"

**Causa:** Axios não está instalado

**Solução:**
```bash
npm install axios
# ou
expo install axios
```

Depois:
```bash
npm start -- --clear
# ou
expo start --clear
```

---

# Erro 2: "Cannot find module '@react-native-async-storage/async-storage'"

**Causa:** AsyncStorage não está instalado

**Solução:**
```bash
npm install @react-native-async-storage/async-storage
# ou
expo install @react-native-async-storage/async-storage
```

---

# Erro 3: "Parameter 'config' implicitly has an 'any' type"

**Causa:** TypeScript strict mode

**Solução:** Se estiver em `services/api.ts`, a linha:
```typescript
this.api.interceptors.request.use(async (config) => {
```

Mude para:
```typescript
this.api.interceptors.request.use(async (config: any) => {
```

E:
```typescript
this.api.interceptors.response.use(
  (response: any) => response,
  (error: any) => {
```

---

# Erro 4: "Module not found: Can't resolve 'react-native-nfc-manager'"

**Causa:** NFC Manager não está instalado (raro, já está no package.json)

**Solução:**
```bash
npm list react-native-nfc-manager
npm install react-native-nfc-manager
```

---

# Erro 5: "'apiClient' is not defined"

**Causa:** Import faltando

**Solução:** Adicione no topo da tela:
```typescript
import { apiClient } from '../../services/api';
```

Verifique o caminho relativo correto baseado no local do arquivo.

---

# Erro 6: API retorna 401 (Unauthorized)

**Causa:** Token inválido ou expirado

**Solução:**
1. Fazer login novamente
2. Verificar se token foi salvo em AsyncStorage:
   ```typescript
   const token = await AsyncStorage.getItem('authToken');
   console.log('Token:', token);
   ```
3. Verificar se a API está retornando token válido

---

# Erro 7: API retorna 403 (Forbidden)

**Causa:** Usuário não tem permissão para operação

**Exemplo:** Tentar devolver ferramenta de outro usuário

**Solução:** Verificar a regra de negócio da API e validar dados antes de enviar

---

# Erro 8: NFC não funciona em emulador

**Causa:** Emulador não simula NFC

**Solução:** Testar em device real (celular)

---

# Erro 9: "Cannot read properties of null (reading 'access_token')"

**Causa:** Login retornou resposta inesperada

**Solução:**
1. Verificar structure da resposta no Postman/Insomnia
2. Confirmar que backend retorna `{ access_token, user }`
3. Adicionar console.log para debug:
   ```typescript
   const response = await apiClient.login(cracha, password);
   console.log('Login response:', response);
   ```

---

# Erro 10: "App keeps crashing after login"

**Causa:** Router não está configurado corretamente

**Solução:**
1. Verifique que `expo-router` está instalado
2. Certifique-se que tem pasta `app/(tabs)/` estruturada
3. Adicione `_layout.tsx` se falta

---

# 🔍 Debug Tips

## Ver o que está sendo enviado para API:

```typescript
// Em services/api.ts, adicione antes de return response.data:
console.log('[API Request]', config.method.toUpperCase(), config.url);
console.log('[API Response]', response.data);
```

## Ver o que está em AsyncStorage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAllKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    console.log('AsyncStorage items:', items);
  } catch (error) {
    console.error(error);
  }
};

getAllKeys();
```

## Ver headers sendo enviados:

```typescript
// Em qualquer requisição que usa apiClient:
console.log('Headers:', apiClient.getToken());
```

---

# 📋 Checklist de Testes

```
[ ] npm install rodou sem erros
[ ] App abre sem crashes
[ ] Tela de login renderiza
[ ] Pode fazer login com credenciais reais
[ ] Token é salvo em AsyncStorage
[ ] Ao reabrir app, está autenticado (sem fazer login de novo)
[ ] Listar ferramentas funciona
[ ] Buscar por nome funciona
[ ] Filtrar por status funciona
[ ] NFC read funciona em device real
[ ] Retirada de ferramenta funciona
[ ] Toast de sucesso aparece
[ ] Tratamento de erro da API funciona
[ ] Logout funciona (volta para login)
[ ] App em background e foreground não causa crashes
```

---

# 🚨 Se tudo der errado:

## Limpar cache e reinstalar:

```bash
# Windows
del node_modules
del package-lock.json
npm install
expo start --clear

# Mac/Linux
rm -rf node_modules
rm package-lock.json
npm install
expo start --clear
```

## Resetar projeto Expo:

```bash
expo prebuild --clean
expo start --clear
```

## Verificar versões:

```bash
node --version      # Deve ser 16+
npm --version       # Deve ser 8+
expo --version      # Verificar se está atualizado
```

---

# 📞 Se o problema não estiver listado:

1. Procure a mensagem de erro em:
   - [React Native Docs](https://reactnative.dev/docs/getting-started)
   - [Expo Docs](https://docs.expo.dev)

2. Verifique o console do terminal (onde rodou `expo start`)

3. Verifique o console do app (Expo DevTools ou React Native DevTools)

4. Procure em StackOverflow com a mensagem exata do erro

---

**Última atualização:** Abril 2026  
**Mantido por:** Equipe de Desenvolvimento
