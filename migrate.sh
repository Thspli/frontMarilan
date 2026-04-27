#!/bin/bash
# 🔄 Script de Migração - Substituir arquivos antigos pelos novos

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🔄 MARILAN - Script de Migração para API Real"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ─── Passo 1: Fazer backup dos arquivos antigos ──────────────────────────────
echo -e "${YELLOW}[1/4] Fazendo backup dos arquivos antigos...${NC}"

if [ -f "app/login.tsx" ]; then
    mv app/login.tsx app/login-backup.tsx
    echo -e "${GREEN}✓${NC} app/login.tsx → app/login-backup.tsx"
else
    echo -e "${YELLOW}⚠${NC} app/login.tsx não encontrado (ignorando)"
fi

if [ -f "app/(tabs)/ferramentas.tsx" ]; then
    mv "app/(tabs)/ferramentas.tsx" "app/(tabs)/ferramentas-backup.tsx"
    echo -e "${GREEN}✓${NC} app/(tabs)/ferramentas.tsx → app/(tabs)/ferramentas-backup.tsx"
else
    echo -e "${YELLOW}⚠${NC} app/(tabs)/ferramentas.tsx não encontrado (ignorando)"
fi

if [ -f "app/(tabs)/almoxarifado.tsx" ]; then
    mv "app/(tabs)/almoxarifado.tsx" "app/(tabs)/almoxarifado-backup.tsx"
    echo -e "${GREEN}✓${NC} app/(tabs)/almoxarifado.tsx → app/(tabs)/almoxarifado-backup.tsx"
else
    echo -e "${YELLOW}⚠${NC} app/(tabs)/almoxarifado.tsx não encontrado (ignorando)"
fi

echo ""

# ─── Passo 2: Renomear novos arquivos ──────────────────────────────────────────
echo -e "${YELLOW}[2/4] Ativando novos arquivos refatorados...${NC}"

if [ -f "app/login-new.tsx" ]; then
    mv app/login-new.tsx app/login.tsx
    echo -e "${GREEN}✓${NC} app/login-new.tsx → app/login.tsx"
else
    echo -e "${RED}✗${NC} app/login-new.tsx não encontrado!"
fi

if [ -f "app/(tabs)/ferramentas-new.tsx" ]; then
    mv "app/(tabs)/ferramentas-new.tsx" "app/(tabs)/ferramentas.tsx"
    echo -e "${GREEN}✓${NC} app/(tabs)/ferramentas-new.tsx → app/(tabs)/ferramentas.tsx"
else
    echo -e "${RED}✗${NC} app/(tabs)/ferramentas-new.tsx não encontrado!"
fi

if [ -f "app/(tabs)/almoxarifado-new.tsx" ]; then
    mv "app/(tabs)/almoxarifado-new.tsx" "app/(tabs)/almoxarifado.tsx"
    echo -e "${GREEN}✓${NC} app/(tabs)/almoxarifado-new.tsx → app/(tabs)/almoxarifado.tsx"
else
    echo -e "${RED}✗${NC} app/(tabs)/almoxarifado-new.tsx não encontrado!"
fi

echo ""

# ─── Passo 3: Instalar dependências ────────────────────────────────────────────
echo -e "${YELLOW}[3/4] Instalando dependências necessárias...${NC}"

if ! npm list axios >/dev/null 2>&1; then
    echo -e "${YELLOW}→${NC} Instalando axios..."
    npm install axios
    echo -e "${GREEN}✓${NC} axios instalado"
else
    echo -e "${GREEN}✓${NC} axios já está instalado"
fi

if ! npm list @react-native-async-storage/async-storage >/dev/null 2>&1; then
    echo -e "${YELLOW}→${NC} Instalando @react-native-async-storage/async-storage..."
    npm install @react-native-async-storage/async-storage
    echo -e "${GREEN}✓${NC} @react-native-async-storage/async-storage instalado"
else
    echo -e "${GREEN}✓${NC} @react-native-async-storage/async-storage já está instalado"
fi

echo ""

# ─── Passo 4: Listar arquivos criados ──────────────────────────────────────────
echo -e "${YELLOW}[4/4] Verificando arquivos novos...${NC}"

echo ""
echo "Serviços criados:"
[ -f "services/api.ts" ] && echo -e "${GREEN}✓${NC} services/api.ts" || echo -e "${RED}✗${NC} services/api.ts"
[ -f "services/nfc.ts" ] && echo -e "${GREEN}✓${NC} services/nfc.ts" || echo -e "${RED}✗${NC} services/nfc.ts"

echo ""
echo "Hooks criados:"
[ -f "hooks/useAuth.ts" ] && echo -e "${GREEN}✓${NC} hooks/useAuth.ts" || echo -e "${RED}✗${NC} hooks/useAuth.ts"
[ -f "hooks/useTools.ts" ] && echo -e "${GREEN}✓${NC} hooks/useTools.ts" || echo -e "${RED}✗${NC} hooks/useTools.ts"

echo ""
echo "Documentação criada:"
[ -f "QUICKSTART.md" ] && echo -e "${GREEN}✓${NC} QUICKSTART.md" || echo -e "${RED}✗${NC} QUICKSTART.md"
[ -f "INTEGRATION_GUIDE.md" ] && echo -e "${GREEN}✓${NC} INTEGRATION_GUIDE.md" || echo -e "${RED}✗${NC} INTEGRATION_GUIDE.md"
[ -f "TECHNICAL_SUMMARY.md" ] && echo -e "${GREEN}✓${NC} TECHNICAL_SUMMARY.md" || echo -e "${RED}✗${NC} TECHNICAL_SUMMARY.md"
[ -f "TROUBLESHOOTING.md" ] && echo -e "${GREEN}✓${NC} TROUBLESHOOTING.md" || echo -e "${RED}✗${NC} TROUBLESHOOTING.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Migração concluída!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Próximos passos:"
echo "   1. Abra services/api.ts e ajuste a URL da API"
echo "   2. Execute: npm start"
echo "   3. Leia QUICKSTART.md para mais informações"
echo ""
echo "📚 Documentação:"
echo "   → QUICKSTART.md        - Como começar rapidinho"
echo "   → INTEGRATION_GUIDE.md - Documentação completa"
echo "   → TECHNICAL_SUMMARY.md - Detalhes técnicos"
echo "   → TROUBLESHOOTING.md   - Resolver problemas"
echo ""
