// Telegram Channel & Bot Doctor Diagnostics

import { TelegramClient } from './telegram';
import { DoctorReport, DoctorCheckResult } from './types';

export async function runDoctor(tg: TelegramClient): Promise<DoctorReport> {
  const checks: DoctorCheckResult[] = [];
  let overallOk = true;

  // 1. Check Bot Token via getMe
  let botUser: any = null;
  try {
    botUser = await tg.getMe();
    checks.push({
      name: 'bot_token_valid',
      status: 'pass',
      detail: `Connected as @${botUser.username} (ID: ${botUser.id})`
    });
  } catch (err: any) {
    checks.push({
      name: 'bot_token_valid',
      status: 'fail',
      detail: tg.sanitize(err.message || 'Failed to authenticate bot token')
    });
    return { ok: false, checks };
  }

  // 2. Check Chat metadata via getChat
  let chat: any = null;
  try {
    chat = await tg.getChat();
    if (chat.type !== 'channel') {
      checks.push({
        name: 'chat_type_channel',
        status: 'fail',
        detail: `Expected chat type "channel", got "${chat.type}". Storage must be a private channel.`
      });
      overallOk = false;
    } else {
      checks.push({
        name: 'chat_type_channel',
        status: 'pass',
        detail: `Chat is a channel ("${chat.title}")`
      });
    }

    // 3. Privacy check: Channel must have NO public username
    if (chat.username) {
      checks.push({
        name: 'channel_privacy_no_username',
        status: 'fail',
        detail: `DANGER: Channel is PUBLIC (@${chat.username})! Anyone can discover stored data. Convert it to a Private Channel immediately.`
      });
      overallOk = false;
    } else {
      checks.push({
        name: 'channel_privacy_no_username',
        status: 'pass',
        detail: 'Channel is strictly private (no public username)'
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'chat_accessible',
      status: 'fail',
      detail: tg.sanitize(err.message || 'Cannot access storage channel')
    });
    return { ok: false, checks };
  }

  // 4. Member Count: Must be <= 2 (owner + bot)
  try {
    const memberCount = await tg.getChatMemberCount();
    if (memberCount > 2) {
      checks.push({
        name: 'channel_member_count',
        status: 'fail',
        detail: `Channel has ${memberCount} members! Expected at most 2 (you and your bot). Remove any unauthorized members immediately.`
      });
      overallOk = false;
    } else {
      checks.push({
        name: 'channel_member_count',
        status: 'pass',
        detail: `Member count verified (${memberCount} members: owner and bot)`
      });
    }
  } catch (err: any) {
    checks.push({
      name: 'channel_member_count',
      status: 'warn',
      detail: `Could not retrieve member count: ${tg.sanitize(err.message)}`
    });
  }

  // 5. Bot Admin Rights (post, edit/pin, delete)
  try {
    const member = await tg.getChatMember(botUser.id);
    if (member.status !== 'administrator') {
      checks.push({
        name: 'bot_admin_status',
        status: 'fail',
        detail: `Bot status is "${member.status}". Bot must be added as an Administrator.`
      });
      overallOk = false;
    } else {
      const canPost = member.can_post_messages !== false;
      const canEdit = member.can_edit_messages !== false; // In channels, can_edit_messages is required to pin!
      const canDelete = member.can_delete_messages !== false;

      if (!canPost || !canEdit || !canDelete) {
        checks.push({
          name: 'bot_permissions',
          status: 'fail',
          detail: `Missing admin permissions: post=${canPost}, edit/pin=${canEdit}, delete=${canDelete}.`
        });
        overallOk = false;
      } else {
        checks.push({
          name: 'bot_permissions',
          status: 'pass',
          detail: 'Bot possesses all required permissions (post, edit/pin, delete)'
        });
      }
    }
  } catch (err: any) {
    checks.push({
      name: 'bot_admin_status',
      status: 'warn',
      detail: `Could not check bot permissions: ${tg.sanitize(err.message)}`
    });
  }

  return { ok: overallOk, checks };
}
