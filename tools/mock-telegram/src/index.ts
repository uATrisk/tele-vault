import http from 'node:http';
import { AddressInfo } from 'node:net';

export interface MockTelegramMember {
  status: 'creator' | 'administrator' | 'member';
  user: { id: number; is_bot: boolean; first_name: string; username?: string };
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_delete_messages?: boolean;
  can_pin_messages?: boolean;
}

export interface MockTelegramChat {
  id: number;
  type: 'channel' | 'supergroup' | 'group' | 'private';
  title: string;
  username?: string; // If present, channel is public!
  pinned_message?: any;
  members: MockTelegramMember[];
}

export interface StoredFile {
  file_id: string;
  file_path: string;
  file_size: number;
  mime_type?: string;
  data: Buffer;
  caption?: string;
  file_name?: string;
}

export interface FaultInjectionConfig {
  statusCode?: number;
  retryAfter?: number;
  remainingCalls?: number;
  dropConnection?: boolean;
  delayMs?: number;
}

export class MockTelegramServer {
  private server: http.Server;
  private port: number = 0;
  private messageCounter = 1000;
  private fileCounter = 5000;

  public chats = new Map<number, MockTelegramChat>();
  public messages = new Map<number, any>();
  public files = new Map<string, StoredFile>();
  public faultConfig: FaultInjectionConfig | null = null;

  constructor() {
    this.initDefaultChat();
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  public initDefaultChat(chatId = -1001234567890, isPublic = false, memberCount = 2) {
    const defaultChat: MockTelegramChat = {
      id: chatId,
      type: 'channel',
      title: 'TeleVault Private Storage',
      username: isPublic ? 'public_channel_leak' : undefined,
      members: [
        {
          status: 'creator',
          user: { id: 111, is_bot: false, first_name: 'Owner' }
        },
        {
          status: 'administrator',
          user: { id: 222, is_bot: true, first_name: 'TeleVault Bot', username: 'televault_bot' },
          can_post_messages: true,
          can_edit_messages: true,
          can_delete_messages: true
        }
      ]
    };

    if (memberCount > 2) {
      for (let i = 3; i <= memberCount; i++) {
        defaultChat.members.push({
          status: 'member',
          user: { id: 100 + i, is_bot: false, first_name: `Stranger_${i}` }
        });
      }
    }

    this.chats.set(chatId, defaultChat);
  }

  public reset() {
    this.chats.clear();
    this.messages.clear();
    this.files.clear();
    this.faultConfig = null;
    this.messageCounter = 1000;
    this.fileCounter = 5000;
    this.initDefaultChat();
  }

  public injectFault(config: FaultInjectionConfig) {
    this.faultConfig = config;
  }

  public async start(port = 0): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(port, '127.0.0.1', () => {
        const addr = this.server.address() as AddressInfo;
        this.port = addr.port;
        resolve(this.port);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => (err ? reject(err) : resolve()));
    });
  }

  public getPort(): number {
    return this.port;
  }

  public getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // 1. Check fault injection
    if (this.faultConfig) {
      if (this.faultConfig.dropConnection) {
        this.faultConfig = null;
        req.destroy();
        return;
      }

      if (this.faultConfig.delayMs) {
        await new Promise((r) => setTimeout(r, this.faultConfig!.delayMs));
      }

      if (this.faultConfig.statusCode) {
        const code = this.faultConfig.statusCode;
        const retryAfter = this.faultConfig.retryAfter;

        if (this.faultConfig.remainingCalls !== undefined) {
          this.faultConfig.remainingCalls--;
          if (this.faultConfig.remainingCalls <= 0) {
            this.faultConfig = null;
          }
        }

        if (code === 429) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              ok: false,
              error_code: 429,
              description: 'Too Many Requests: retry after ' + (retryAfter || 1),
              parameters: { retry_after: retryAfter || 1 }
            })
          );
          return;
        }

        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: code, description: 'Injected Error' }));
        return;
      }
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Test API
    if (pathname === '/test/reset') {
      this.reset();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (pathname === '/test/inspect') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          files: Array.from(this.files.values()).map((f) => ({
            file_id: f.file_id,
            file_size: f.file_size,
            caption: f.caption,
            file_name: f.file_name,
            content_base64: f.data.toString('base64')
          })),
          messages: Array.from(this.messages.values())
        })
      );
      return;
    }

    // Telegram Bot API endpoints
    // Download route: /file/bot<token>/<file_path>
    if (pathname.startsWith('/file/bot')) {
      const filePath = pathname.replace(/^\/file\/bot[^/]+\//, '');
      const file = Array.from(this.files.values()).find((f) => f.file_path === filePath);
      if (!file) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 404, description: 'File not found' }));
        return;
      }

      // Enforce 20 MB download cap check
      if (file.file_size > 20 * 1024 * 1024) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: false,
            error_code: 400,
            description: 'Bad Request: file is too big to download via Bot API (cap 20 MB)'
          })
        );
        return;
      }

      res.writeHead(200, {
        'Content-Type': file.mime_type || 'application/octet-stream',
        'Content-Length': file.data.length
      });
      res.end(file.data);
      return;
    }

    // Standard RPC route: /bot<token>/<method>
    const methodMatch = pathname.match(/^\/bot[^/]+\/([a-zA-Z0-9_]+)$/);
    if (!methodMatch) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error_code: 404, description: 'Not Found' }));
      return;
    }

    const method = methodMatch[1];
    const bodyBuf = await this.readBody(req);

    if (method === 'getMe') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          result: {
            id: 222,
            is_bot: true,
            first_name: 'TeleVault Bot',
            username: 'televault_bot'
          }
        })
      );
      return;
    }

    if (method === 'getChat') {
      const params = this.parseParams(req, url, bodyBuf);
      const chatId = Number(params.chat_id);
      const chat = this.chats.get(chatId);
      if (!chat) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Chat not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          result: {
            id: chat.id,
            type: chat.type,
            title: chat.title,
            username: chat.username,
            pinned_message: chat.pinned_message
          }
        })
      );
      return;
    }

    if (method === 'getChatMemberCount') {
      const params = this.parseParams(req, url, bodyBuf);
      const chatId = Number(params.chat_id);
      const chat = this.chats.get(chatId);
      if (!chat) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Chat not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: chat.members.length }));
      return;
    }

    if (method === 'getChatMember') {
      const params = this.parseParams(req, url, bodyBuf);
      const chatId = Number(params.chat_id);
      const userId = Number(params.user_id);
      const chat = this.chats.get(chatId);
      if (!chat) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Chat not found' }));
        return;
      }

      const member = chat.members.find((m) => m.user.id === userId);
      if (!member) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'User not found in chat' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: member }));
      return;
    }

    if (method === 'sendDocument') {
      const { params, fileData, fileName } = this.parseMultipartOrForm(req, bodyBuf);
      const chatId = Number(params.chat_id);
      const chat = this.chats.get(chatId);
      if (!chat) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Chat not found' }));
        return;
      }

      if (!fileData) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'No document provided' }));
        return;
      }

      // Check 50 MB upload cap
      if (fileData.length > 50 * 1024 * 1024) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'File size exceeds 50 MB' }));
        return;
      }

      const msgId = ++this.messageCounter;
      const fileId = `file_${++this.fileCounter}_${Date.now()}`;
      const filePath = `documents/${fileId}.bin`;

      const stored: StoredFile = {
        file_id: fileId,
        file_path: filePath,
        file_size: fileData.length,
        mime_type: 'application/octet-stream',
        data: fileData,
        caption: params.caption,
        file_name: fileName
      };
      this.files.set(fileId, stored);

      const msgObj = {
        message_id: msgId,
        chat: { id: chat.id, title: chat.title, type: chat.type },
        date: Math.floor(Date.now() / 1000),
        document: {
          file_id: fileId,
          file_unique_id: 'uniq_' + fileId,
          file_name: fileName,
          file_size: fileData.length
        },
        caption: params.caption
      };
      this.messages.set(msgId, msgObj);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: msgObj }));
      return;
    }

    if (method === 'getFile') {
      const params = this.parseParams(req, url, bodyBuf);
      const fileId = params.file_id;
      const file = this.files.get(fileId);
      if (!file) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'File not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          result: {
            file_id: file.file_id,
            file_unique_id: 'uniq_' + file.file_id,
            file_size: file.file_size,
            file_path: file.file_path
          }
        })
      );
      return;
    }

    if (method === 'deleteMessage') {
      const params = this.parseParams(req, url, bodyBuf);
      const msgId = Number(params.message_id);
      const msg = this.messages.get(msgId);
      if (msg?.document?.file_id) {
        this.files.delete(msg.document.file_id);
      }
      this.messages.delete(msgId);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: true }));
      return;
    }

    if (method === 'pinChatMessage') {
      const params = this.parseParams(req, url, bodyBuf);
      const chatId = Number(params.chat_id);
      const msgId = Number(params.message_id);
      const chat = this.chats.get(chatId);
      const msg = this.messages.get(msgId);
      if (!chat || !msg) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error_code: 400, description: 'Chat or message not found' }));
        return;
      }

      chat.pinned_message = msg;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result: true }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error_code: 404, description: `Unsupported method: ${method}` }));
  }

  private async readBody(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });
  }

  private parseParams(req: http.IncomingMessage, url: URL, bodyBuf: Buffer): Record<string, any> {
    const params: Record<string, any> = {};
    for (const [k, v] of url.searchParams.entries()) {
      params[k] = v;
    }

    const cType = req.headers['content-type'] || '';
    if (cType.includes('application/json') && bodyBuf.length > 0) {
      try {
        const json = JSON.parse(bodyBuf.toString('utf8'));
        Object.assign(params, json);
      } catch {}
    } else if (cType.includes('application/x-www-form-urlencoded') && bodyBuf.length > 0) {
      const parsed = new URLSearchParams(bodyBuf.toString('utf8'));
      for (const [k, v] of parsed.entries()) {
        params[k] = v;
      }
    }
    return params;
  }

  private parseMultipartOrForm(
    req: http.IncomingMessage,
    bodyBuf: Buffer
  ): { params: Record<string, string>; fileData: Buffer | null; fileName?: string } {
    const cType = req.headers['content-type'] || '';
    const params: Record<string, string> = {};
    let fileData: Buffer | null = null;
    let fileName: string | undefined;

    if (cType.includes('multipart/form-data')) {
      const boundaryMatch = cType.match(/boundary=([^\s;]+)/);
      if (boundaryMatch) {
        const boundary = boundaryMatch[1];
        const parts = this.splitMultipart(bodyBuf, boundary);
        for (const part of parts) {
          const headerStr = part.headers.toString('utf8');
          const nameMatch = headerStr.match(/name="([^"]+)"/);
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          if (nameMatch) {
            const fieldName = nameMatch[1];
            if (filenameMatch) {
              fileName = filenameMatch[1];
              fileData = part.body;
            } else {
              params[fieldName] = part.body.toString('utf8').trim();
            }
          }
        }
      }
    } else {
      // Direct raw binary stream fallback
      fileData = bodyBuf;
    }

    return { params, fileData, fileName };
  }

  private splitMultipart(buf: Buffer, boundary: string): Array<{ headers: Buffer; body: Buffer }> {
    const result: Array<{ headers: Buffer; body: Buffer }> = [];
    const boundaryBuf = Buffer.from('--' + boundary);
    let startIdx = 0;

    while (startIdx < buf.length) {
      const foundIdx = buf.indexOf(boundaryBuf, startIdx);
      if (foundIdx === -1) break;

      const partStart = foundIdx + boundaryBuf.length;
      if (buf[partStart] === 0x2d && buf[partStart + 1] === 0x2d) {
        // Ending --
        break;
      }

      // Skip \r\n
      let contentStart = partStart;
      if (buf[contentStart] === 0x0d && buf[contentStart + 1] === 0x0a) {
        contentStart += 2;
      }

      const nextFound = buf.indexOf(boundaryBuf, contentStart);
      if (nextFound === -1) break;

      const partBuffer = buf.subarray(contentStart, nextFound - 2); // strip trailing \r\n
      const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd !== -1) {
        result.push({
          headers: partBuffer.subarray(0, headerEnd),
          body: partBuffer.subarray(headerEnd + 4)
        });
      }

      startIdx = nextFound;
    }

    return result;
  }
}
