// Telegram Bot API client with rate limiting, streaming, and secret protection

import { Env } from './types';

export class TelegramClient {
  private botToken: string;
  private defaultChatId: string;
  private baseUrl: string;

  constructor(env: Env) {
    this.botToken = env.TELEGRAM_BOT_TOKEN;
    this.defaultChatId = env.TELEGRAM_CHAT_ID;

    // Honor TELEGRAM_API_BASE ONLY when ENVIRONMENT=dev
    if (env.ENVIRONMENT === 'dev' && env.TELEGRAM_API_BASE) {
      this.baseUrl = env.TELEGRAM_API_BASE.replace(/\/+$/, '');
    } else {
      this.baseUrl = 'https://api.telegram.org';
    }
  }

  public getChatId(): string {
    return this.defaultChatId;
  }

  /**
   * Sanitizes any string to ensure the Telegram bot token is never exposed in logs or errors.
   */
  public sanitize(text: string): string {
    if (!this.botToken) return text;
    return text.replaceAll(this.botToken, '[REDACTED_BOT_TOKEN]');
  }

  private getApiUrl(method: string): string {
    return `${this.baseUrl}/bot${this.botToken}/${method}`;
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    isIdempotent = true,
    maxRetries = 3
  ): Promise<Response> {
    let attempts = 0;
    let delay = 1000;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const res = await fetch(url, init);

        if (res.status === 429) {
          const body = (await res.json().catch(() => ({}))) as {
            parameters?: { retry_after?: number };
          };
          const retryAfterSec = body.parameters?.retry_after || 1;
          const waitMs = Math.min(retryAfterSec * 1000 + Math.random() * 200, 10000);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        if (res.status >= 500 && isIdempotent) {
          await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
          delay = Math.min(delay * 2, 8000);
          continue;
        }

        return res;
      } catch (err: any) {
        if (!isIdempotent || attempts >= maxRetries) {
          throw new Error(`Telegram network request failed: ${this.sanitize(err.message || String(err))}`);
        }
        await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
        delay = Math.min(delay * 2, 8000);
      }
    }

    throw new Error('Telegram request exceeded maximum retries');
  }

  public async getMe(): Promise<any> {
    const url = this.getApiUrl('getMe');
    const res = await this.fetchWithRetry(url, { method: 'GET' }, true);
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`getMe failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }
    return data.result;
  }

  public async getChat(chatId = this.defaultChatId): Promise<any> {
    const url = this.getApiUrl(`getChat?chat_id=${encodeURIComponent(chatId)}`);
    const res = await this.fetchWithRetry(url, { method: 'GET' }, true);
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`getChat failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }
    return data.result;
  }

  public async getChatMemberCount(chatId = this.defaultChatId): Promise<number> {
    const url = this.getApiUrl(`getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`);
    const res = await this.fetchWithRetry(url, { method: 'GET' }, true);
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`getChatMemberCount failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }
    return data.result;
  }

  public async getChatMember(userId: number, chatId = this.defaultChatId): Promise<any> {
    const url = this.getApiUrl(
      `getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(userId)}`
    );
    const res = await this.fetchWithRetry(url, { method: 'GET' }, true);
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`getChatMember failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }
    return data.result;
  }

  public async sendDocument(
    documentBlobOrBuffer: Blob | ArrayBuffer | Uint8Array,
    fileName = 'chunk.bin',
    chatId = this.defaultChatId
  ): Promise<{ messageId: number; fileId: string; size: number }> {
    const url = this.getApiUrl('sendDocument');
    const formData = new FormData();
    formData.append('chat_id', chatId);

    const blob =
      documentBlobOrBuffer instanceof Blob
        ? documentBlobOrBuffer
        : new Blob([documentBlobOrBuffer as BlobPart], { type: 'application/octet-stream' });

    formData.append('document', blob, fileName);

    // sendDocument is non-idempotent; do not retry blindly
    const res = await this.fetchWithRetry(url, { method: 'POST', body: formData }, false);
    const data = (await res.json()) as any;

    if (!data.ok || !data.result?.document?.file_id) {
      throw new Error(`sendDocument failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }

    return {
      messageId: data.result.message_id,
      fileId: data.result.document.file_id,
      size: data.result.document.file_size || blob.size
    };
  }

  public async getFile(fileId: string): Promise<string> {
    const url = this.getApiUrl(`getFile?file_id=${encodeURIComponent(fileId)}`);
    const res = await this.fetchWithRetry(url, { method: 'GET' }, true);
    const data = (await res.json()) as any;

    if (!data.ok || !data.result?.file_path) {
      throw new Error(`getFile failed: ${this.sanitize(data.description || 'Unknown error')}`);
    }

    return data.result.file_path;
  }

  /**
   * Fetches the file download stream directly from Telegram servers without buffering into memory.
   */
  public async getDownloadStream(filePath: string): Promise<Response> {
    const downloadUrl = `${this.baseUrl}/file/bot${this.botToken}/${filePath}`;
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Telegram download stream failed: HTTP ${res.status}`);
    }
    return res;
  }

  public async deleteMessage(messageId: number, chatId = this.defaultChatId): Promise<boolean> {
    const url = this.getApiUrl(
      `deleteMessage?chat_id=${encodeURIComponent(chatId)}&message_id=${encodeURIComponent(messageId)}`
    );
    const res = await this.fetchWithRetry(url, { method: 'POST' }, true);
    const data = (await res.json()) as any;
    return !!data.ok;
  }

  public async pinChatMessage(messageId: number, chatId = this.defaultChatId): Promise<boolean> {
    const url = this.getApiUrl(
      `pinChatMessage?chat_id=${encodeURIComponent(chatId)}&message_id=${encodeURIComponent(messageId)}`
    );
    const res = await this.fetchWithRetry(url, { method: 'POST' }, true);
    const data = (await res.json()) as any;
    return !!data.ok;
  }
}
