#!/usr/bin/env node

/**
 * Script para obter Refresh Token do Google Ads via OAuth
 *
 * Uso:
 * npx ts-node scripts/google-ads-auth.ts
 *
 * Isso abrirá um navegador para você fazer login e autorizar acesso.
 * Depois salva o refresh_token no .env.local
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import http from 'http';

const CLIENT_ID = '111655542007217314717'; // Do seu arquivo JSON
const CLIENT_SECRET = 'PASTE_FROM_GOOGLE_CLOUD'; // Você vai precisar disso
const REDIRECT_URI = 'http://localhost:3000/api/auth/google-callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

async function getRefreshToken() {
  console.log('\n🔐 Google Ads OAuth Flow\n');
  console.log('Passos:');
  console.log('1. Um navegador vai abrir');
  console.log('2. Faça login com sua conta Google');
  console.log('3. Autorize o acesso ao Google Ads');
  console.log('4. Copie o código que aparece na URL\n');

  // Gerar URL de autorização
  const scopes = [
    'https://www.googleapis.com/auth/adwords',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Isso nos dá um refresh_token
    scope: scopes,
    prompt: 'consent', // Força o consentimento mesmo se já foi feito
  });

  console.log(`🔗 Abra este link no navegador:\n${authUrl}\n`);

  // Ler o código da entrada padrão
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Cole o código de autorização aqui: ', async (code) => {
    rl.close();

    try {
      console.log('\n⏳ Trocando código por tokens...');

      const { tokens } = await oauth2Client.getToken(code);

      console.log('\n✅ Sucesso!\n');
      console.log('Tokens obtidos:');
      console.log(`Access Token: ${tokens.access_token?.substring(0, 20)}...`);
      console.log(`Refresh Token: ${tokens.refresh_token}`);
      console.log(`Expires In: ${tokens.expiry_date}\n`);

      // Salvar no .env.local
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }

      // Remover linhas antigas
      envContent = envContent
        .split('\n')
        .filter(
          (line) =>
            !line.startsWith('GOOGLE_ADS_REFRESH_TOKEN=') &&
            !line.startsWith('GOOGLE_ADS_ACCESS_TOKEN=')
        )
        .join('\n')
        .trim();

      // Adicionar novos tokens
      envContent += `\nGOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token}`;
      envContent += `\nGOOGLE_ADS_ACCESS_TOKEN=${tokens.access_token}`;

      fs.writeFileSync(envPath, envContent + '\n', 'utf-8');

      console.log('💾 Tokens salvos em .env.local');
      console.log('\n✨ Você está pronto para usar a Google Ads API!');
    } catch (error) {
      console.error('❌ Erro ao obter tokens:', error);
      process.exit(1);
    }
  });
}

getRefreshToken().catch(console.error);
