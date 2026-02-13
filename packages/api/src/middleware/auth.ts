import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "../config";
import db from "../db";
import type { User } from "../types";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await db("users").where({ id }).first();
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email || !email.endsWith("@cpedge.ai")) {
            return done(null, false, {
              message: "Only @cpedge.ai accounts are allowed",
            } as any);
          }

          let user: User | undefined = await db("users")
            .where({ google_id: profile.id })
            .first();

          if (user) {
            [user] = await db("users")
              .where({ id: user.id })
              .update({
                email,
                display_name: profile.displayName,
                avatar_url: profile.photos?.[0]?.value || null,
                updated_at: new Date(),
              })
              .returning("*");
          } else {
            [user] = await db("users")
              .insert({
                google_id: profile.id,
                email,
                display_name: profile.displayName,
                avatar_url: profile.photos?.[0]?.value || null,
              })
              .returning("*");
          }

          return done(null, user);
        } catch (err: any) {
          return done(err);
        }
      }
    )
  );
}

export { passport };
