import { createMiddleware } from "hono/factory";
import { validateSession } from "../lib/session";
import type { SessionUser } from "../lib/session";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: SessionUser };
};

export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Авторизация керак" }, 401);
  }

  const token = authHeader.slice(7);
  const user = await validateSession(c.env.DB, token);
  if (!user) {
    return c.json({ error: "Сессия муддати тугаган" }, 401);
  }

  c.set("user", user);
  await next();
});

export function requireRole(...roles: string[]) {
  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      return c.json({ error: "Рухсат берилмаган" }, 403);
    }
    await next();
  });
}
