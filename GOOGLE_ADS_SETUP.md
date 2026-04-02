# Setup Google Ads Integration

## 📋 Status Atual

Você tem:
- ✅ Service Account JSON com credenciais (`dashboard-489916-d25d6f2cecfe.json`)
- ✅ Customer ID: `169-854-9372` (Vai Pro Mundo)
- ✅ Endpoints criados para armazenar dados
- ⏳ Integração com API (próxima fase)

## 🔧 PASSO 1: Preparar Arquivos

### 1.1 Copiar credenciais

```bash
# Crie a pasta credentials
mkdir -p apps/dashboard/credentials

# Copie o arquivo JSON para lá
cp C:\Users\suliv\Downloads\dashboard-489916-d25d6f2cecfe.json \
   apps/dashboard/credentials/google-ads.json
```

### 1.2 Verificar estrutura

```
apps/dashboard/
├── credentials/
│   └── google-ads.json          ← Copiar aqui
├── src/
│   ├── app/api/imports/google-ads/
│   │   └── route.ts              ← ✅ Criado
│   └── lib/
│       └── integrations/
│           └── google-ads-client.ts  ← ✅ Criado
└── .google-ads-data.json         ← Será criado aqui
```

---

## 📊 PASSO 2: Carregar Dados do Google Ads

Agora você tem duas opções:

### **OPÇÃO A: Carregar dados exemplo (teste rápido)**

```bash
# No seu terminal, copie o arquivo exemplo
cp apps/dashboard/.google-ads-data.example.json \
   apps/dashboard/.google-ads-data.json
```

Pronto! Agora você tem dados de exemplo de Google Ads.

### **OPÇÃO B: Carregar dados reais (dados do seu Google Ads)**

Você precisa fornecer os dados do seu Google Ads em JSON:

**Formato esperado:**

```json
{
  "customerId": "169-854-9372",
  "accountName": "Vai Pro Mundo",
  "months": [
    {
      "month": "janeiro",
      "year": 2026,
      "spend": 7500.00,
      "impressions": 75000,
      "clicks": 2200,
      "conversions": 307
    },
    {
      "month": "fevereiro",
      "year": 2026,
      "spend": 5000.00,
      "impressions": 50000,
      "clicks": 1600,
      "conversions": 235
    }
  ],
  "campaigns": [
    {
      "campaignId": "campaign_001",
      "campaignName": "Viagens Premium - Jan",
      "spend": 3750.00,
      "impressions": 45000,
      "clicks": 1200,
      "conversions": 150
    }
  ]
}
```

**Como obter seus dados reais do Google Ads:**

1. Acesse: https://ads.google.com/
2. Vá para **Ferramentas > Biblioteca de Modelos > Relatórios**
3. Crie um relatório com as colunas:
   - Data (segmentado por mês)
   - Impressões
   - Cliques
   - Custo
   - Conversões
4. Exporte em CSV
5. Converta para JSON (ou passe o CSV que eu converto)

---

## 🚀 PASSO 3: Testar os Endpoints

### 3.1 Carregar dados via API

```bash
# Teste GET (verifica se há dados salvos)
curl http://localhost:3002/api/imports/google-ads

# Teste POST (carrega novos dados)
curl -X POST http://localhost:3002/api/imports/google-ads \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "customerId": "169-854-9372",
  "accountName": "Vai Pro Mundo",
  "months": [
    {
      "month": "janeiro",
      "year": 2026,
      "spend": 7500.00,
      "impressions": 75000,
      "clicks": 2200,
      "conversions": 307
    }
  ],
  "campaigns": []
}
EOF
```

---

## 📈 PASSO 4: Próxima Fase - Integração Real com API

Quando estiver pronto para conectar de verdade com a Google Ads API, você vai precisar:

### 4.1 Obter Developer Token

```
1. Acesse: https://ads.google.com/ (sua conta principal)
2. Vá para Ferramentas (⚙️)
3. Clique em "Configurações da conta"
4. Na seção "Acesso da API", copie seu "Developer token"
```

**Developer Token:**
```
COLE_AQUI_DEPOIS
```

### 4.2 Obter Refresh Token (OAuth)

A Service Account JSON que você tem serve para autenticação **entre sistemas**, não para OAuth.

Para conectar com a Google Ads API, você precisará fazer um flow OAuth uma vez:

```bash
# Instalamos a biblioteca
npm install google-ads-api

# Você faz login uma vez
npm run google-ads:auth

# Isso gera um refresh_token que usamos nas futuras chamadas
```

### 4.3 Guardar credenciais de forma segura

```bash
# .env.local (NUNCA commitar isso!)
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token
GOOGLE_ADS_CUSTOMER_ID=169-854-9372
```

---

## 🎯 O Que Falta

- [ ] Copiar credenciais para `apps/dashboard/credentials/google-ads.json`
- [ ] Escolher dados (exemplo ou real)
- [ ] Testar endpoints GET/POST
- [ ] Integrar com SDR para cruzar dados
- [ ] Criar dashboard de análise

---

## 📞 Próximo Passo?

Você quer:

1. **Usar dados exemplo primeiro** (teste rápido)?
2. **Fornecer seus dados reais do Google Ads** (dados atuais)?
3. **Esperar para integração automática com API** (solução completa)?

Qual você prefere?
