import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockTelegramServer } from './index';

describe('Mock Telegram Server', () => {
  let server: MockTelegramServer;
  let baseUrl: string;

  beforeAll(async () => {
    server = new MockTelegramServer();
    const port = await server.start(0);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await server.stop();
  });

  it('handles getMe', async () => {
    const res = await fetch(`${baseUrl}/bot12345/getMe`);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.result.username).toBe('televault_bot');
  });

  it('handles getChat and member count', async () => {
    const res = await fetch(`${baseUrl}/bot12345/getChat?chat_id=-1001234567890`);
    const data = (await res.json()) as any;
    expect(data.ok).toBe(true);
    expect(data.result.type).toBe('channel');

    const countRes = await fetch(`${baseUrl}/bot12345/getChatMemberCount?chat_id=-1001234567890`);
    const countData = (await countRes.json()) as any;
    expect(countData.ok).toBe(true);
    expect(countData.result).toBe(2);
  });

  it('handles sendDocument, getFile, and download', async () => {
    const boundary = '----WebKitFormBoundaryXYZ';
    const fakeChunk = Buffer.from('test encrypted chunk payload');
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n-1001234567890\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="chunk_0.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      fakeChunk,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const sendRes = await fetch(`${baseUrl}/bot12345/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    const sendData = (await sendRes.json()) as any;
    expect(sendData.ok).toBe(true);
    const fileId = sendData.result.document.file_id;
    const msgId = sendData.result.message_id;

    // getFile
    const getRes = await fetch(`${baseUrl}/bot12345/getFile?file_id=${fileId}`);
    const getData = (await getRes.json()) as any;
    expect(getData.ok).toBe(true);
    const filePath = getData.result.file_path;

    // download
    const downRes = await fetch(`${baseUrl}/file/bot12345/${filePath}`);
    expect(downRes.status).toBe(200);
    const downBuf = await downRes.arrayBuffer();
    expect(Buffer.from(downBuf).equals(fakeChunk)).toBe(true);

    // pin
    const pinRes = await fetch(`${baseUrl}/bot12345/pinChatMessage?chat_id=-1001234567890&message_id=${msgId}`);
    const pinData = (await pinRes.json()) as any;
    expect(pinData.ok).toBe(true);

    // check pinned_message in getChat
    const chatRes = await fetch(`${baseUrl}/bot12345/getChat?chat_id=-1001234567890`);
    const chatData = (await chatRes.json()) as any;
    expect(chatData.result.pinned_message.message_id).toBe(msgId);

    // delete
    const delRes = await fetch(`${baseUrl}/bot12345/deleteMessage?chat_id=-1001234567890&message_id=${msgId}`);
    const delData = (await delRes.json()) as any;
    expect(delData.ok).toBe(true);
  });

  it('supports fault injection: 429 rate limit with retry_after', async () => {
    server.injectFault({ statusCode: 429, retryAfter: 3, remainingCalls: 1 });

    const res = await fetch(`${baseUrl}/bot12345/getMe`);
    expect(res.status).toBe(429);
    const data = (await res.json()) as any;
    expect(data.parameters.retry_after).toBe(3);

    // Next call succeeds because remainingCalls was 1
    const nextRes = await fetch(`${baseUrl}/bot12345/getMe`);
    expect(nextRes.status).toBe(200);
  });
});
