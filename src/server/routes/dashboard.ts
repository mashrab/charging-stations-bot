import { Hono } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth";
import { getDashboardStats, getActivityLog } from "../db/queries";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: { id: string; phone: string; role: string; full_name: string } };
};

export const dashboardRouter = new Hono<Env>();

dashboardRouter.use("*", authMiddleware, requireRole("admin"));

dashboardRouter.get("/stats", async (c) => {
  const stats = await getDashboardStats(c.env.DB);
  return c.json({ stats });
});

dashboardRouter.get("/activity", async (c) => {
  const result = await getActivityLog(c.env.DB);
  return c.json({ activity: result.results });
});
