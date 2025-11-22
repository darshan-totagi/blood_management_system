import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'local-dev-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Not secure for local development
      maxAge: sessionTtl,
    },
  });
}

// Create a mock user for local development
const mockUser = {
  claims: {
    sub: 'local-dev-user',
    email: 'dev@example.com',
    first_name: 'Local',
    last_name: 'Developer',
    profile_image_url: 'https://via.placeholder.com/150',
    exp: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
  },
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days
};

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Mock user creation disabled

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Dev login route: explicit manual login using mock user
  app.get("/api/login", async (req, res) => {
    try {
      await storage.upsertUser({
        id: mockUser.claims.sub,
        email: mockUser.claims.email,
        firstName: mockUser.claims.first_name,
        lastName: mockUser.claims.last_name,
        profileImageUrl: mockUser.claims.profile_image_url,
      });
      req.login(mockUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        return res.redirect("/");
      });
    } catch (error) {
      console.error("Error during dev login:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};