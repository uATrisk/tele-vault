// TeleVault Cloudflare Deployment CLI
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export async function runDeployCLI() {
  console.log('============================================');
  console.log('       TeleVault Cloudflare Deployment      ');
  console.log('============================================\n');

  const rootDir = process.cwd();
  const workerDir = path.join(rootDir, 'apps/worker');
  const devVarsPath = path.join(rootDir, '.dev.vars');

  let botToken = process.env.TELEGRAM_BOT_TOKEN;
  let chatId = process.env.TELEGRAM_CHAT_ID;
  let accessToken = process.env.ACCESS_TOKEN;
  let sessionSecret = process.env.SESSION_SECRET;

  if (fs.existsSync(devVarsPath)) {
    const devVars = fs.readFileSync(devVarsPath, 'utf8');
    const tokenMatch = devVars.match(/TELEGRAM_BOT_TOKEN=(.+)/);
    const chatMatch = devVars.match(/TELEGRAM_CHAT_ID=(.+)/);
    const accessMatch = devVars.match(/ACCESS_TOKEN=(.+)/);
    const sessionMatch = devVars.match(/SESSION_SECRET=(.+)/);

    if (tokenMatch) botToken = tokenMatch[1].trim();
    if (chatMatch) chatId = chatMatch[1].trim();
    if (accessMatch) accessToken = accessMatch[1].trim();
    if (sessionMatch) sessionSecret = sessionMatch[1].trim();
  }

  if (!botToken || !chatId || !accessToken || !sessionSecret) {
    console.error('❌ Missing required secrets. Please run `npm run setup` first.');
    process.exit(1);
  }

  // 1. Build Web App & Monorepo
  console.log('Step 1: Building production Web SPA bundle and crypto package...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Production bundle built.\n');

  // 2. Check Wrangler Authentication
  console.log('Step 2: Checking Cloudflare authentication via Wrangler...');
  try {
    execSync('npx wrangler whoami', { stdio: 'inherit', cwd: workerDir });
  } catch {
    console.error('❌ You are not logged into Cloudflare. Please run `npx wrangler login` first.');
    process.exit(1);
  }

  // 3. Apply D1 Migrations (Remote)
  console.log('\nStep 3: Applying D1 migrations on remote Cloudflare D1 database...');
  try {
    execSync('npx wrangler d1 migrations apply televault-db --remote', {
      stdio: 'inherit',
      cwd: workerDir
    });
    console.log('✅ D1 migrations applied.\n');
  } catch (err: any) {
    console.warn('⚠️ If the database does not exist yet, create it with: npx wrangler d1 create televault-db');
    console.warn('and paste the database_id into apps/worker/wrangler.toml before deploying.\n');
  }

  // 4. Set Cloudflare Secrets
  console.log('Step 4: Uploading encrypted secrets to Cloudflare Worker...');
  const secrets: Record<string, string> = {
    TELEGRAM_BOT_TOKEN: botToken,
    TELEGRAM_CHAT_ID: chatId,
    ACCESS_TOKEN: accessToken,
    SESSION_SECRET: sessionSecret,
    ENVIRONMENT: 'production'
  };

  for (const [key, val] of Object.entries(secrets)) {
    try {
      execSync(`echo "${val}" | npx wrangler secret put ${key}`, {
        stdio: 'pipe',
        cwd: workerDir
      });
      console.log(`✅ Secret ${key} set.`);
    } catch {
      console.warn(`⚠️ Could not automatically pipe secret ${key}.`);
    }
  }

  // 5. Deploy Worker + Assets
  console.log('\nStep 5: Deploying Cloudflare Worker and static assets...');
  execSync('npx wrangler deploy', { stdio: 'inherit', cwd: workerDir });

  console.log('\n============================================');
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('Your private TeleVault instance is now live on Cloudflare Workers Free Tier!');
  console.log('============================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runDeployCLI().catch((err) => {
    console.error('Deployment failed:', err);
    process.exit(1);
  });
}
