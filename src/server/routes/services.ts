import { Hono } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  logActivity,
} from "../db/queries";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: { id: string; phone: string; role: string; full_name: string } };
};

export const servicesRouter = new Hono<Env>();

servicesRouter.use("*", authMiddleware);

// List services
servicesRouter.get("/", async (c) => {
  const user = c.get("user");
  const includeInactive = user.role === "admin";
  const result = await getServices(c.env.DB, includeInactive);
  return c.json({ services: result.results });
});

// Get single service
servicesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const service = await getServiceById(c.env.DB, id);
  if (!service) {
    return c.json({ error: "Хизмат топилмади" }, 404);
  }
  return c.json({ service });
});

// Create service (admin only)
servicesRouter.post("/", requireRole("admin"), async (c) => {
  const { name, description, official_price } = await c.req.json<{
    name: string;
    description?: string;
    official_price: number;
  }>();

  if (!name || official_price == null) {
    return c.json({ error: "Ном ва нарх керак" }, 400);
  }

  const id = crypto.randomUUID();
  await createService(c.env.DB, { id, name, description, official_price });

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "service_created",
    entity_type: "service",
    entity_id: id,
    details: JSON.stringify({ name, official_price }),
  });

  return c.json({ id }, 201);
});

// Update service (admin only)
servicesRouter.put("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const existing = await getServiceById(c.env.DB, id);
  if (!existing) {
    return c.json({ error: "Хизмат топилмади" }, 404);
  }

  const body = await c.req.json();
  await updateService(c.env.DB, id, body);

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "service_updated",
    entity_type: "service",
    entity_id: id,
    details: JSON.stringify(body),
  });

  return c.json({ ok: true });
});

// Soft delete service (admin only)
servicesRouter.delete("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await updateService(c.env.DB, id, { is_active: 0 });

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "service_deleted",
    entity_type: "service",
    entity_id: id,
  });

  return c.json({ ok: true });
});
