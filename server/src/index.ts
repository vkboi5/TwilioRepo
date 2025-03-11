// server/src/index.ts
import { createExpressApp } from './server';
import { getPort, getServerCredentials } from './utils/env';
import { log, warn } from './utils/log';

async function main() {
  log('Starting Twilio Voice React Native server...');

  const serverCredentials = getServerCredentials();
  if (!serverCredentials) {
    warn('Incomplete Server Credentials');
    return;
  }

  const port = getPort() ?? 3030;
  const server = createExpressApp(serverCredentials);

  server.listen(port, () => {
    log(`Server running on port ${port}`);
    log('WebSocket server is ready for connections');
  });
}

main().catch(console.error);
