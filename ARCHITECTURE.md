# 🏗️ Arquitetura Marilan - Diagrama Técnico

## 📊 Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APLICATIVO MOBILE (React Native)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         TELAS (UI)                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │   │
│  │  │  login.tsx       │  │ ferramentas.tsx  │  │almoxarifado.tsx  │  │   │
│  │  │                  │  │                  │  │                  │  │   │
│  │  │ • Autenticação   │  │ • Listar minhas  │  │ • Carrinho       │  │   │
│  │  │ • Validação      │  │   ferramentas    │  │ • NFC read       │  │   │
│  │  │ • Token save     │  │ • Filtro status  │  │ • Retirada       │  │   │
│  │  │ • Error handling │  │ • Buscar nome    │  │ • Validação      │  │   │
│  │  └────────┬─────────┘  │ • NFC read       │  │ • Qty control    │  │   │
│  │           │            │ • Trocar ferram. │  │ • Prompt crachá  │  │   │
│  │           │            │ • Modal NFC      │  │ • Submit         │  │   │
│  │           │            └────────┬─────────┘  └────────┬─────────┘  │   │
│  │           │                     │                     │            │   │
│  └───────────┼─────────────────────┼─────────────────────┼────────────┘   │
│              │                     │                     │                │
│  ┌───────────┼─────────────────────┼─────────────────────┼────────────┐   │
│  │           ▼                     ▼                     ▼             │   │
│  │      ┌──────────────────────────────────────────────────────────┐  │   │
│  │      │         HOOKS & SERVIÇOS (Business Logic)              │  │   │
│  │      ├──────────────────────────────────────────────────────────┤  │   │
│  │      │                                                          │  │   │
│  │      │  useAuth()          → Gerencia autenticação             │  │   │
│  │      │  useTools()         → Gerencia ferramentas              │  │   │
│  │      │  apiClient          → Requisições HTTP                 │  │   │
│  │      │  nfcService         → Leitura NFC                      │  │   │
│  │      │                                                          │  │   │
│  │      └────────┬──────────────────────────────────────────────┬─┘  │   │
│  │               │                                              │     │   │
│  └───────────────┼──────────────────────────────────────────────┼─────┘   │
│                  │                                              │         │
│  ┌───────────────┼──────────────────────────────────────────────┼─────┐   │
│  │               ▼                                              ▼     │   │
│  │      ┌────────────────────────────────────────────────────────┐   │   │
│  │      │      DADOS PERSISTENTES (AsyncStorage)              │   │   │
│  │      ├────────────────────────────────────────────────────────┤   │   │
│  │      │  • authToken   → JWT Token                          │   │   │
│  │      │  • userRole    → "almoxarife" | "colaborador"       │   │   │
│  │      │  • userCracha  → "1234" (número do crachá)          │   │   │
│  │      └────────────────────────────────────────────────────────┘   │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │
                                │ HTTP + Bearer Token
                                ▼
                ┌────────────────────────────────────┐
                │  BACKEND LARAVEL (API REST)        │
                ├────────────────────────────────────┤
                │  http://localhost:8000/api         │
                │                                    │
                │  Endpoints:                        │
                │  ✓ POST   /login                  │
                │  ✓ POST   /retirar                │
                │  ✓ POST   /devolver               │
                │  ✓ POST   /trocar                 │
                │  ✓ GET    /ferramentas            │
                │  ✓ GET    /colaborador/{c}/ferr...│
                │                                    │
                │  Resposta: JSON                    │
                │  Status: 200, 401, 403, 404, 500  │
                └────────────────────────────────────┘
```

---

## 🔄 Fluxo de Autenticação

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE LOGIN                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  USUÁRIO                  APP                        API                   │
│     │                      │                          │                    │
│     │───Entra Crachá───────>│                          │                   │
│     │                      │                          │                    │
│     │───Entra Senha───────>│                          │                    │
│     │                      │                          │                    │
│     │                      │─POST /login────────────>│                    │
│     │                      │ {cracha, password}      │                    │
│     │                      │                          │                    │
│     │                      │<─200 OK───────────────│                    │
│     │                      │ {access_token, user}   │                    │
│     │                      │                          │                    │
│     │<─Redireciona────────│                          │                    │
│     │  para /(tabs)       │                          │                    │
│     │                      │───Salva em AsyncStorage │                    │
│     │                      │ • authToken             │                    │
│     │                      │ • userRole              │                    │
│     │                      │ • userCracha            │                    │
│     │                      │                          │                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Fluxo de Retirada de Ferramentas

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE RETIRADA (ALMOXARIFE)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ALMOXARIFE                  APP                      API                  │
│     │                         │                       │                    │
│     │─Abre Almoxarifado─────>│                       │                    │
│     │                         │──GET /ferramentas───>│                    │
│     │                         │                       │                    │
│     │                         │<─200 OK──────────   │                    │
│     │                         │ [Ferr. Disponíveis]  │                    │
│     │                         │                       │                    │
│     │─NFC ou Digite Código──>│                       │                    │
│     │                         │─readTag() (NFC)──────>│                    │
│     │                         │ nfcService.readTag()  │                    │
│     │                         │<─Código lido────     │                    │
│     │                         │                       │                    │
│     │─Adiciona ao Carrinho──>│                       │                    │
│     │  (repete para +)        │ [Ferramenta 1]       │                    │
│     │                         │ [Ferramenta 2]       │                    │
│     │                         │ [Ferramenta ...]     │                    │
│     │                         │                       │                    │
│     │─Clica Confirmar───────>│                       │                    │
│     │                         │ Pede crachá collab   │                    │
│     │─Digite Crachá Collab──>│                       │                    │
│     │                         │                       │                    │
│     │                         │──POST /retirar─────>│                    │
│     │                         │ {cracha_collab,      │                    │
│     │                         │  ferramentas[]}      │                    │
│     │                         │                       │                    │
│     │                         │<─200 OK───────────│                    │
│     │                         │ {success: true}     │                    │
│     │                         │                       │                    │
│     │<─Toast "Sucesso"──────│                       │                    │
│     │ Carrinho limpa         │                       │                    │
│     │ Lista atualiza         │                       │                    │
│     │                         │                       │                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Troca de Ferramentas

```
┌────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE TROCA (COLABORADOR)                           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  COLABORADOR               APP                       API                   │
│     │                       │                        │                    │
│     │─Abre Ferramentas─────>│                        │                    │
│     │                       │──GET /colaborador/{..}>│                    │
│     │                       │     /ferramentas       │                    │
│     │                       │<─200 OK──────────────│                    │
│     │                       │ [Minhas Ferramentas]   │                    │
│     │                       │ (Status: Em uso)       │                    │
│     │                       │                        │                    │
│     │─Toca em "Em uso"─────>│                        │                    │
│     │                       │ Abre Modal NFC         │                    │
│     │                       │                        │                    │
│     │─Aproxima NFC────────>│                        │                    │
│     │                       │ nfcService.readTag()   │                    │
│     │                       │<─Tag ID lido────────│                    │
│     │                       │                        │                    │
│     │<─Modal: "Lido!"──────│                        │                    │
│     │                       │                        │                    │
│     │─Confirma Troca──────>│                        │                    │
│     │                       │                        │                    │
│     │                       │──POST /trocar────────>│                    │
│     │                       │ {cracha_novo,          │                    │
│     │                       │  ferramentas[]}        │                    │
│     │                       │                        │                    │
│     │                       │<─200 OK──────────────│                    │
│     │                       │ {success: true}       │                    │
│     │                       │                        │                    │
│     │<─Toast "Sucesso"─────│                        │                    │
│     │ Modal fecha            │                        │                    │
│     │ Lista atualiza         │                        │                    │
│     │ Ferramenta muda dono   │                        │                    │
│     │                       │                        │                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Arquitetura de Componentes

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE APRESENTAÇÃO                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Login UI    │  │  Ferramentas UI  │  │  Almoxarifado UI        │   │
│  │              │  │                  │  │                         │   │
│  │  • Input     │  │  • FlatList      │  │  • Carrinho             │   │
│  │  • Button    │  │  • Filtros       │  │  • Modal NFC            │   │
│  │  • Error     │  │  • Busca         │  │  • Input Manual         │   │
│  │  • Loading   │  │  • Modal NFC     │  │  • Qty Controls         │   │
│  └──────────────┘  └──────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                  △
                                  │
┌──────────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE LÓGICA DE NEGÓCIO                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │ useAuth()    │  │ useTools()   │  │ Componentes Customizados    │   │
│  │              │  │              │  │                             │   │
│  │ • Login      │  │ • Listar     │  │ • Toast                     │   │
│  │ • Logout     │  │ • Refetch    │  │ • Card                      │   │
│  │ • Persiste   │  │ • Cache      │  │ • Badge Status              │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
                                  △
                                  │
┌──────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE SERVIÇOS                               │
│  ┌────────────────────────────────────┐  ┌─────────────────────────┐    │
│  │       apiClient (API Service)      │  │   nfcService (NFC)     │    │
│  │                                    │  │                        │    │
│  │ • login()                          │  │ • initialize()         │    │
│  │ • retirar()                        │  │ • checkSupport()       │    │
│  │ • devolver()                       │  │ • readTag()            │    │
│  │ • trocar()                         │  │ • readMultipleTags()   │    │
│  │ • listarFerramentas()              │  │ • stop()               │    │
│  │ • listarMinhasFerramentas()        │  │                        │    │
│  │                                    │  │ (React Native NFC Mgr) │    │
│  │ (Axios + Interceptadores)          │  │                        │    │
│  └────────────────────────────────────┘  └─────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
                                  △
                                  │
┌──────────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE ARMAZENAMENTO                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  AsyncStorage (Local)        │  │  API Backend (Remoto)          │ │
│  │                              │  │                                │ │
│  │ • authToken                  │  │ • http://localhost:8000/api    │ │
│  │ • userRole                   │  │                                │ │
│  │ • userCracha                 │  │ Endpoints:                     │ │
│  │                              │  │ • POST /login                 │ │
│  │ (Chave-valor persistente)    │  │ • POST /retirar               │ │
│  │                              │  │ • POST /devolver              │ │
│  │                              │  │ • POST /trocar                │ │
│  │                              │  │ • GET /ferramentas            │ │
│  │                              │  │ • GET /colaborador/.../ferrm  │ │
│  └──────────────────────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Fluxo de Segurança

```
LOGIN
  ↓
POST /login {cracha, password}
  ↓
Backend valida credenciais
  ↓
Se OK: Retorna {access_token, user}
Se ERRO: Retorna 401
  ↓
App salva token em AsyncStorage
  ↓

TODAS AS REQUISIÇÕES SEGUINTES
  ↓
Header: Authorization: Bearer {token}
  ↓
Se resposta = 401 (token expirado)
  ↓
apiClient.logout() → Remove token
  ↓
Redireciona para login
```

---

## 📱 Estrutura de Dados

### Usuario (Após Login)
```typescript
{
  id: 1,
  cracha: "1234",
  name: "João Silva",
  role: "almoxarife" | "colaborador" | "admin"
}
```

### Ferramenta
```typescript
{
  codigo: "50036280",           // ID da ferramenta na API
  nome: "Furadeira de Impacto",
  categoria: "Elétrica",
  status: "Disponível" | "Em uso" | "Em manutenção",
  alocadoPara?: "Carlos Mendes"
}
```

### Request: Retirada
```typescript
{
  cracha_colaborador: "1236",
  ferramentas: [
    {
      codigo: "50036280",
      qtd: 1,
      checklist: "REALIZADO",
      observacao: "Ok"
    }
  ]
}
```

### Request: Troca
```typescript
{
  cracha_novo_colaborador: "1237",
  ferramentas: [
    {
      codigo: "50038854",
      qtd: 1,
      checklist: "REALIZADO",
      observacao: "Transferência em campo"
    }
  ]
}
```

---

## 🔄 Ciclo de Vida da Aplicação

```
1. BOOT
   ├─ Verify AsyncStorage for token
   ├─ If token exists: restore session
   └─ If no token: show login

2. LOGIN STATE
   ├─ User enters cracha + password
   ├─ Call apiClient.login()
   ├─ Save token to AsyncStorage
   └─ Navigate to /(tabs)

3. AUTHENTICATED STATE
   ├─ User can access all features
   ├─ Token auto-added to requests
   ├─ If 401: logout automatically
   └─ Users can logout manually

4. LOGOUT STATE
   ├─ Remove token from AsyncStorage
   ├─ Clear user data
   └─ Redirect to login
```

---

Este diagrama técnico ilustra como todos os componentes trabalham juntos para integrar o frontend React Native com a API Laravel do Marilan.
