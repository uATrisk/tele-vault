import { MockTelegramServer } from './index';

const port = Number(process.env.PORT) || 8788;
const server = new MockTelegramServer();

server.start(port).then((actualPort) => {
  console.log(`🤖 Mock Telegram server listening on http://127.0.0.1:${actualPort}`);
});
