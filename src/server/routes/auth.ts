import { Hono } from "hono";
import { hashPassword, verifyPassword } from "../lib/password";
import { createSession, deleteSession } from "../lib/session";
import { getUserByPhone, createUser, getAdminCount } from "../db/queries";
import { authMiddleware } from "../middleware/auth";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: { id: string; phone: string; role: string; full_name: string } };
};

export const authRouter = new Hono<Env>();

// Login
authRouter.post("/login", async (c) => {
  const { phone, password } = await c.req.json<{
    phone: string;
    password: string;
  }>();

  if (!phone || !password) {
    return c.json({ error: "Телефон рақам ва парол керак" }, 400);
  }

  const user = await getUserByPhone(c.env.DB, phone);
  if (!user) {
    return c.json({ error: "Телефон рақам ёки парол нотўғри" }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: "Телефон рақам ёки парол нотўғри" }, 401);
  }

  const token = await createSession(c.env.DB, user.id);

  return c.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      full_name: user.full_name,
    },
  });
});

// Logout
authRouter.post("/logout", authMiddleware, async (c) => {
  const authHeader = c.req.header("Authorization")!;
  const token = authHeader.slice(7);
  await deleteSession(c.env.DB, token);
  return c.json({ ok: true });
});

// Get current user
authRouter.get("/me", authMiddleware, async (c) => {
  return c.json({ user: c.get("user") });
});

// One-time admin setup
authRouter.post("/setup", async (c) => {
  const adminCount = await getAdminCount(c.env.DB);
  if (adminCount > 0) {
    return c.json({ error: "Админ аллақачон мавжуд" }, 400);
  }

  const passwordHash = await hashPassword("12345678");
  const id = crypto.randomUUID();

  await createUser(c.env.DB, {
    id,
    phone: "+998123456789",
    password_hash: passwordHash,
    role: "admin",
    full_name: "Administrator",
  });

  return c.json({ ok: true, message: "Админ яратилди" });
});
