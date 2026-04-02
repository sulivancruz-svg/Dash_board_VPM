# 🔐 Configuração de Variáveis de Ambiente

Você vai precisar configurar 3 tokens. Coloque no arquivo `.env.local`:

## 1️⃣ Developer Token (da Google Ads)

```
GOOGLE_ADS_DEVELOPER_TOKEN=seu_token_aqui
```

**Como obter:**
- Acesse https://ads.google.com/
- ⚙️ Ferramentas → Configurações da conta
- Acesso da API → Copie "Developer token"

---

## 2️⃣ Refresh Token (OAuth)

```
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_aqui
```

**Como obter:**
```bash
cd apps/dashboard
npx ts-node scripts/google-ads-auth.ts
```

Isso abre um navegador, você faz login, e o token é salvo automaticamente.

---

## 3️⃣ Customer ID (você já tem!)

```
GOOGLE_ADS_CUSTOMER_ID=169-854-9372
```

---

## Seu `.env.local` vai ficar assim:

```env
# Google Ads
GOOGLE_ADS_DEVELOPER_TOKEN=abc123def456ghi789
GOOGLE_ADS_CUSTOMER_ID=169-854-9372
GOOGLE_ADS_REFRESH_TOKEN=1//0gBcd1234efgh5678ijkl...

# Outras (opcionais por enquanto)
META_ACCESS_TOKEN=eaa1234...
PIPEDRIVE_API_TOKEN=abc1234...
```

---

## ⏳ Ordem de Passos:

1. ✅ Copiar credenciais JSON para `credentials/google-ads.json`
2. ⏳ Obter Developer Token
3. ⏳ Rodar script de auth para Refresh Token
4. ✅ Salvar no `.env.local`
5. ✅ Começar integração
