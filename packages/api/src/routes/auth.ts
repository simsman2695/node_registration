import { Server, Request, Response, Next } from "restify";
import { sessionMiddleware } from "../middleware/session";
import { passport } from "../middleware/auth";

export function registerAuthRoutes(server: Server): void {
  // Apply session and passport middleware
  server.use(sessionMiddleware as any);
  server.use(passport.initialize() as any);
  server.use(passport.session() as any);

  // GET /auth/google - Initiate OAuth
  server.get("/auth/google", (req: Request, res: Response, next: Next) => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
    } as any)(req, res, next);
  });

  // GET /auth/google/callback - OAuth callback
  // Handle manually since Passport's redirect helpers don't work with Restify
  server.get(
    "/auth/google/callback",
    (req: Request, res: Response, next: Next) => {
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          res.redirect("/login?error=auth_failed", next);
          return;
        }
        (req as any).logIn(user, (loginErr: any) => {
          if (loginErr) {
            return next(loginErr);
          }
          res.redirect("/dashboard", next);
        });
      })(req, res, next);
    }
  );

  // GET /auth/me - Current user
  server.get("/auth/me", (req: Request, res: Response, next: Next) => {
    if ((req as any).user) {
      res.send(200, (req as any).user);
    } else {
      res.send(401, { error: "Not authenticated" });
    }
    return next();
  });

  // POST /auth/logout - Destroy session
  server.post("/auth/logout", (req: Request, res: Response, next: Next) => {
    (req as any).logout((err: any) => {
      if (err) {
        res.send(500, { error: "Logout failed" });
        return next();
      }
      (req as any).session?.destroy(() => {
        res.send(200, { message: "Logged out" });
        return next();
      });
    });
  });
}
