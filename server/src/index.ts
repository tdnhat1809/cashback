import { loadConfig } from './config.js';
import { createHttpAppServer } from './app.js';

const config = loadConfig();
const { server, database } = createHttpAppServer(config);
server.listen(config.PORT, () => {
  console.log(`HOANTIENVIP API listening on http://localhost:${config.PORT}`);
});

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  server.close(() => {
    database.close();
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
