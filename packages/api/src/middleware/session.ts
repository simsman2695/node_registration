import session from "express-session";
import { RedisStore } from "connect-redis";
import redis from "../redis";
import { config } from "../config";

const store = new RedisStore({ client: redis, prefix: "sess:" });

export const sessionMiddleware = session({
  store,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true behind HTTPS reverse proxy
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: "lax",
  },
});
