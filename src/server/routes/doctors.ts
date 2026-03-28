import { Hono } from "hono";
import { authMiddleware, requireRole } from "../middleware/auth";
import { hashPassword } from "../lib/password";
import {
  getDoctors,
  getDoctorById,
  getDoctorByUserId,
  createDoctor,
  updateDoctor,
  createUser,
  getUserByPhone,
  logActivity,
} from "../db/queries";

type Env = {
  Bindings: { DB: D1Database };
  Variables: { user: { id: string; phone: string; role: string; full_name: string } };
};

export const doctorsRouter = new Hono<Env>();

doctorsRouter.use("*", authMiddleware);

// Get own doctor profile
doctorsRouter.get("/me", async (c) => {
  const user = c.get("user");
  const doctor = await getDoctorByUserId(c.env.DB, user.id);
  if (!doctor) {
    return c.json({ error: "Шифокор топилмади" }, 404);
  }
  return c.json({ doctor: { ...doctor, full_name: user.full_name, phone: user.phone } });
});

// List doctors
doctorsRouter.get("/", requireRole("admin"), async (c) => {
  const result = await getDoctors(c.env.DB);
  return c.json({ doctors: result.results });
});

// Get single doctor
doctorsRouter.get("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const doctor = await getDoctorById(c.env.DB, id);
  if (!doctor) {
    return c.json({ error: "Шифокор топилмади" }, 404);
  }
  return c.json({ doctor });
});

// Create doctor (admin only) - creates user + doctor record
doctorsRouter.post("/", requireRole("admin"), async (c) => {
  const { full_name, phone, password, specialty } = await c.req.json<{
    full_name: string;
    phone: string;
    password: string;
    specialty: string;
  }>();

  if (!full_name || !phone || !password || !specialty) {
    return c.json(
      { error: "Исм, телефон, парол ва мутахассислик керак" },
      400,
    );
  }

  const existing = await getUserByPhone(c.env.DB, phone);
  if (existing) {
    return c.json({ error: "Бу телефон рақам аллақачон рўйхатдан ўтган" }, 400);
  }

  const userId = crypto.randomUUID();
  const doctorId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  await createUser(c.env.DB, {
    id: userId,
    phone,
    password_hash: passwordHash,
    role: "doctor",
    full_name,
  });

  await createDoctor(c.env.DB, {
    id: doctorId,
    user_id: userId,
    specialty,
  });

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "doctor_created",
    entity_type: "doctor",
    entity_id: doctorId,
    details: JSON.stringify({ full_name, specialty }),
  });

  return c.json({ id: doctorId, user_id: userId }, 201);
});

// Update doctor (admin only)
doctorsRouter.put("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ full_name?: string; phone?: string; specialty?: string }>();

  const doctor = await getDoctorById(c.env.DB, id);
  if (!doctor) {
    return c.json({ error: "Шифокор топилмади" }, 404);
  }

  const userUpdates: string[] = [];
  const userValues: string[] = [];

  if (body.full_name) {
    userUpdates.push("full_name = ?");
    userValues.push(body.full_name);
  }
  if (body.phone) {
    userUpdates.push("phone = ?");
    userValues.push(body.phone);
  }
  if (userUpdates.length > 0) {
    userUpdates.push("updated_at = unixepoch()");
    userValues.push(doctor.user_id);
    await c.env.DB
      .prepare(`UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`)
      .bind(...userValues)
      .run();
  }

  if (body.specialty) {
    await updateDoctor(c.env.DB, id, { specialty: body.specialty });
  }

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "doctor_updated",
    entity_type: "doctor",
    entity_id: id,
    details: JSON.stringify(body),
  });

  return c.json({ ok: true });
});

// Deactivate doctor (admin only)
doctorsRouter.delete("/:id", requireRole("admin"), async (c) => {
  const id = c.req.param("id");
  await updateDoctor(c.env.DB, id, { is_active: 0 });

  const user = c.get("user");
  await logActivity(c.env.DB, {
    user_id: user.id,
    action: "doctor_deactivated",
    entity_type: "doctor",
    entity_id: id,
  });

  return c.json({ ok: true });
});
