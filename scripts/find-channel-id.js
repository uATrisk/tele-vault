// CLI helper to discover private channel ID from updates
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
async function main() {
    const rl = readline.createInterface({ input, output });
    console.log('--- Telegram Channel ID Finder ---');
    console.log('1. Ensure your bot is added to the channel as an Admin.');
    console.log('2. Send any dummy message (e.g. "ping") in the channel right now.\n');
    const botToken = await rl.question('Enter your Telegram Bot Token: ');
    rl.close();
    if (!botToken.trim()) {
        console.error('Bot token is required.');
        process.exit(1);
    }
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/getUpdates`);
        const data = (await res.json());
        if (!data.ok || !data.result) {
            console.error('Failed to query Telegram API:', data);
            process.exit(1);
        }
        const channelPost = data.result.reverse().find((u) => u.channel_post?.chat);
        if (!channelPost?.channel_post) {
            console.log('⚠️ No recent channel posts found in getUpdates.');
            console.log('Please send a new message in the channel and re-run this command.');
        }
        else {
            const chat = channelPost.channel_post.chat;
            console.log(`\n✅ Found Channel: "${chat.title || 'Untitled'}"`);
            console.log(`📌 Channel ID: ${chat.id}`);
            console.log('Use this ID in `npm run setup`.\n');
        }
    }
    catch (err) {
        console.error('Error fetching updates:', err);
        process.exit(1);
    }
}
main();
