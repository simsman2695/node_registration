import { config } from "./config";
import { createServer } from "./server";

const server = createServer();

server.listen(config.port, () => {
  console.log(`API server listening on port ${config.port}`);
});
