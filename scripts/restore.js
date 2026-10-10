// TeleVault Disaster Recovery Restore CLI
import { restoreFromTelegram } from '../apps/worker/src/restore';
import * as fs from 'node:fs';
import * as path from 'node:path';
export { restoreFromTelegram };
export async function runRestoreCLI() {
    console.log('============================================');
    console.log('   TeleVault Disaster Recovery Assistant    ');
    console.log('============================================\n');
    // Try reading from .dev.vars if available
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;
    const devVarsPath = path.join(process.cwd(), '.dev.vars');
    if (fs.existsSync(devVarsPath)) {
        const devVars = fs.readFileSync(devVarsPath, 'utf8');
        const tokenMatch = devVars.match(/TELEGRAM_BOT_TOKEN=(.+)/);
        const chatMatch = devVars.match(/TELEGRAM_CHAT_ID=(.+)/);
        if (tokenMatch)
            botToken = tokenMatch[1].trim();
        if (chatMatch)
            chatId = chatMatch[1].trim();
    }
    if (!botToken || !chatId) {
        console.error('❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment or .dev.vars');
        process.exit(1);
    }
    console.log(`📡 Inspecting pinned snapshot in channel ${chatId}...`);
    console.log('Run `npm run restore` with local D1 bindings or wrangler d1 execute.');
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runRestoreCLI();
}
