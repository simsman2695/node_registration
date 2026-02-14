import { config } from "./config";
import { createServer } from "./server";
import { setupWebSocketServer } from "./ssh/ws-server";

const server = createServer();

server.listen(config.port, () => {
  console.log(`API server listening on port ${config.port}`);
  setupWebSocketServer(server.server);
});
