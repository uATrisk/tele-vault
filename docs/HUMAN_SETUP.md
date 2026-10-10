# TeleVault - Human Setup Guide

This guide contains the click-by-click steps you need to configure your Telegram bot, private storage channel, and Cloudflare account. You can complete these steps while the automated build proceeds.

---

## Step 1: Create your Telegram Bot

1. Open Telegram on your phone or desktop.
2. Search for **`@BotFather`** (ensure it has the official blue verification checkmark) and click **Start**.
3. Send the command:
   ```text
   /newbot
   ```
4. Choose a friendly name for your bot (e.g. `My Vault Storage`).
5. Choose a username for your bot ending in `bot` (e.g. `my_televault_private_bot`).
6. **BotFather** will reply with your **HTTP API Token** (looks like `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).
7. Keep this token safe. **Do not paste it into public chats, tickets, or commits.**

---

## Step 2: Create your Private Telegram Storage Channel

1. In Telegram, click the **New Message** icon and choose **New Channel**.
2. Channel Name: e.g. `TeleVault Storage` (any name you like).
3. Set the Channel Type to **Private Channel**.
   > ⚠️ **CRITICAL:** Do NOT create a public link or username for this channel. A public channel allows anyone to probe your stored data. The TeleVault Doctor check will strictly block setup if the channel is public.
4. When prompted to add subscribers, search for your bot's username and add it.
5. In the channel settings, go to **Administrators** -> **Add Admin**:
   - Select your bot.
   - Grant the following permissions:
     - ✅ **Post Messages**
     - ✅ **Edit Messages of Others** *(required by Telegram to pin messages in channels)*
     - ✅ **Delete Messages of Others**
   - Save permissions.
6. Make sure **NO OTHER USERS OR BOTS** are in the channel. The channel must contain only **2 members**: you (the owner) and your bot.

---

## Step 3: Find your Channel ID

1. In your new private channel, type and send any dummy message (e.g. `hello`).
2. In your terminal in the `televault` folder, run:
   ```bash
   npm run find-channel-id
   ```
3. When prompted, paste your bot token (input is hidden).
4. The tool will read updates from your bot, locate your channel, and output your channel ID (starts with `-100`, e.g. `-1002345678901`).
5. You can delete the dummy message from the channel.

---

## Step 4: Login to Cloudflare

1. If you don't have a Cloudflare account, sign up at [dash.cloudflare.com](https://dash.cloudflare.com) (free tier is 100% sufficient).
2. In your terminal in the `televault` folder, run:
   ```bash
   npx wrangler login
   ```
3. A browser window will open. Click **Allow** to authorize Wrangler.

---

## Step 5: Configure Credentials with `npm run setup`

When you reach **Human Gate A** (or anytime you are ready):
1. In the `televault` project folder, run:
   ```bash
   npm run setup
   ```
2. You will be prompted securely for:
   - Your Telegram Bot Token
   - Your Telegram Channel ID (e.g. `-100...`)
3. The script will:
   - Generate a cryptographically secure `ACCESS_TOKEN` (used to log into your web UI)
   - Generate a secure `SESSION_SECRET` (used to sign authentication cookies)
   - Write `.dev.vars` for local development
   - Display your `ACCESS_TOKEN` **once** on screen.
4. **Copy the `ACCESS_TOKEN` immediately and save it in your password manager!** You will need it to log in to the web app on any device.

---

## Step 6: First-Run Vault Initialization (In Browser)

Once the app is running (locally via `npm run dev` or deployed on Cloudflare):
1. Visit the app URL in your browser.
2. Enter your `ACCESS_TOKEN` to authenticate.
3. The setup wizard will:
   - Run the automated **Doctor check** to verify channel privacy and bot admin permissions.
   - Prompt you to choose a master **Passphrase** (at least 14 characters or 5 random words).
   - Generate your **Recovery Key** (52 characters in groups of 4).
   - Require you to confirm your Recovery Key by retyping the last 8 characters.
4. **Store your Passphrase and Recovery Key securely!**
   > ⚠️ **Zero Knowledge Warning:** If you lose both your passphrase and recovery key, your photos and videos cannot be decrypted by anyone, including the author, Cloudflare, or Telegram.
