import { Hono } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/password";
import {
  getOrders,
  getOrderById,
  createOrder,
  createOrderItem,
  updateOrder,
  updateOrderItemPrice,
  getUserByPhone,
  createUser,
  getDoctorByUserId,
  getServiceById,
  logActivity,
} from "../db/queries";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: { id: string; phone: string; role: string; full_name: string } };
};

export const ordersRouter = new Hono<Env>();

ordersRouter.use("*", authMiddleware);

// List orders (role-based filtering)
ordersRouter.get("/", async (c) => {
  const user = c.get("user");
  const filters: { patient_id?: string; doctor_id?: string; status?: string } = {};

  if (user.role === "patient") {
    filters.patient_id = user.id;
  } else if (user.role === "doctor") {
    const doctor = await getDoctorByUserId(c.env.DB, user.id);
    if (doctor) {
      filters.doctor_id = doctor.id;
    }
  }

  const statusParam = c.req.query("status");
  if (statusParam) filters.status = statusParam;

  const result = await getOrders(c.env.DB, filters);
  return c.json({ orders: result.results });
});

// Get order detail
ordersRouter.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const order = await getOrderById(c.env.DB, id);

  if (!order) {
    return c.json({ error: "Буюртма топилмади" }, 404);
  }

  // Patients can only see their own orders
  if (user.role === "patient" && order.patient_id !== user.id) {
    return c.json({ error: "Рухсат берилмаган" }, 403);
  }

  return c.json({ order });
});

// Create order (admin/doctor)
ordersRouter.post("/", requireRole("admin", "doctor"), async (c) => {
  const user = c.get("user");
  const {
    patient_phone,
    patient_name,
    patient_password,
    doctor_id,
    notes,
    order_date,
    items,
  } = await c.req.json<{
    patient_phone: string;
    patient_name: string;
    patient_password: string;
    doctor_id?: string;
    notes?: string;
    order_date?: string;
    items: Array<{ service_id: string; quantity?: number }>;
  }>();

  if (!patient_phone || !patient_name || !patient_password) {
    return c.json({ error: "Бемор маълумотлари керак" }, 400);
  }

  if (!items || items.length === 0) {
    return c.json({ error: "Камида битта хизмат керак" }, 400);
  }

  // Find or create patient
  let patient = await getUserByPhone(c.env.DB, patient_phone);
  if (!patient) {
    const patientId = crypto.randomUUID();
    const passwordHash = await hashPassword(patient_password);
    await createUser(c.env.DB, {
      id: patientId,
      phone: patient_phone,
      password_hash: passwordHash,
      role: "patient",
      full_name: patient_name,
    });
    patient = {
      id: patientId,
      phone: patient_phone,
      password_hash: passwordHash,
      role: "patient",
      full_name: patient_name,
      created_at: 0,
      updated_at: 0,
    };
  }

  // If doctor is creating, auto-assign to themselves
  let assignedDoctorId = doctor_id;
  if (user.role === "doctor" && !assignedDoctorId) {
    const doc = await getDoctorByUserId(c.env.DB, user.id);
    if (doc) assignedDoctorId = doc.id;
  }

  const orderId = crypto.randomUUID();
  await createOrder(c.env.DB, {
    id: orderId,
    patient_id: patient.id,
    doctor_id: assignedDoctorId,
    notes,
    order_date,
    created_by: user.id,
  });

  // Create order items
  for (const item of items) {
    const service = await getServiceById(c.env.DB, item.service_id);
    if (!service) continue;

    await createOrderItem(c.env.DB, {
      id: crypto.randomUUID(),
      order_id: orderId,
      service_id: item.service_id,
      official_price: service.official_price,
      quantity: item.quantity ?? 1,
    });
  }

  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "order_created",
    entity_type: "order",
    entity_id: orderId,
    details: JSON.stringify({
      patient_name: patient.full_name,
      items_count: items.length,
    }),
  });

  return c.json({ id: orderId }, 201);
});

// Update order (admin)
ordersRouter.put("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await updateOrder(c.env.DB, id, body);

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "order_updated",
    entity_type: "order",
    entity_id: id,
    details: JSON.stringify(body),
  });

  return c.json({ ok: true });
});

// Complete order (doctor sets actual prices)
ordersRouter.put("/:id/complete", requireRole("admin", "doctor"), async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  const order = await getOrderById(c.env.DB, id);
  if (!order) {
    return c.json({ error: "Буюртма топилмади" }, 404);
  }

  const { items } = await c.req.json<{
    items: Array<{ id: string; actual_price: number }>;
  }>();

  // Update each item's actual price
  for (const item of items) {
    await updateOrderItemPrice(c.env.DB, item.id, item.actual_price);
  }

  // Mark order as completed
  await updateOrder(c.env.DB, id, { status: "completed" });

  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "order_completed",
    entity_type: "order",
    entity_id: id,
    details: JSON.stringify({ items }),
  });

  return c.json({ ok: true });
});

// Cancel order (admin only)
ordersRouter.delete("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await updateOrder(c.env.DB, id, { status: "cancelled" });

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "order_cancelled",
    entity_type: "order",
    entity_id: id,
  });

  return c.json({ ok: true });
});
