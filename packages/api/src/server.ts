import restify from "restify";
import { apiKeyAuth } from "./middleware/api-key";
import { registerHealthRoutes } from "./routes/health";
import { registerNodeRoutes } from "./routes/nodes";
import { registerAuthRoutes } from "./routes/auth";

export function createServer(): restify.Server {
  const server = restify.createServer({ name: "node-registration-api" });

  // Core plugins
  server.use(restify.plugins.bodyParser());
  server.use(restify.plugins.queryParser());

  // Shim: express-session expects req.originalUrl
  server.use((req: any, _res, next) => {
    if (!req.originalUrl) {
      req.originalUrl = req.url;
    }
    return next();
  });

  // API key middleware (sets req.apiKeyAuthenticated if valid)
  server.use(apiKeyAuth);

  // Register routes
  registerHealthRoutes(server);
  registerNodeRoutes(server);
  registerAuthRoutes(server);

  // Error handler
  server.on("restifyError", (req, res, err, next) => {
    const status = err.statusCode || 500;
    console.error(`[${req.method}] ${req.url} - ${status}: ${err.message}`);
    return next();
  });

  return server;
}
