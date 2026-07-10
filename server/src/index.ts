import { loadConfig } from './config.js';
import { createHttpAppServer } from './app.js';

const config = loadConfig();
const { server } = createHttpAppServer(config);
server.listen(config.PORT, () => {
  console.log(`HOANTIENVIP API listening on http://localhost:${config.PORT}`);
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
