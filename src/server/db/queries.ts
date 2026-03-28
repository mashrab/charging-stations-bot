// ─── Users ───

export async function getUserByPhone(db: D1Database, phone: string) {
  return db
    .prepare("SELECT * FROM users WHERE phone = ?")
    .bind(phone)
    .first<{
      id: string;
      phone: string;
      password_hash: string;
      role: string;
      full_name: string;
      created_at: number;
      updated_at: number;
    }>();
}

export async function getUserById(db: D1Database, id: string) {
  return db
    .prepare("SELECT id, phone, role, full_name, created_at FROM users WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      phone: string;
      role: string;
      full_name: string;
      created_at: number;
    }>();
}

export async function createUser(
  db: D1Database,
  data: {
    id: string;
    phone: string;
    password_hash: string;
    role: string;
    full_name: string;
  },
) {
  await db
    .prepare(
      "INSERT INTO users (id, phone, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(data.id, data.phone, data.password_hash, data.role, data.full_name)
    .run();
}

export async function getAdminCount(db: D1Database) {
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    .first<{ count: number }>();
  return row?.count ?? 0;
}

// ─── Doctors ───

export async function getDoctors(db: D1Database) {
  return db
    .prepare(
      `SELECT d.id, d.user_id, d.specialty, d.is_active, d.created_at,
              u.full_name, u.phone
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC`,
    )
    .all<{
      id: string;
      user_id: string;
      specialty: string;
      is_active: number;
      created_at: number;
      full_name: string;
      phone: string;
    }>();
}

export async function getDoctorById(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT d.id, d.user_id, d.specialty, d.is_active, d.created_at,
              u.full_name, u.phone
       FROM doctors d
       JOIN users u ON u.id = d.user_id
       WHERE d.id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      user_id: string;
      specialty: string;
      is_active: number;
      created_at: number;
      full_name: string;
      phone: string;
    }>();
}

export async function getDoctorByUserId(db: D1Database, userId: string) {
  return db
    .prepare("SELECT * FROM doctors WHERE user_id = ?")
    .bind(userId)
    .first<{ id: string; user_id: string; specialty: string; is_active: number }>();
}

export async function createDoctor(
  db: D1Database,
  data: { id: string; user_id: string; specialty: string },
) {
  await db
    .prepare("INSERT INTO doctors (id, user_id, specialty) VALUES (?, ?, ?)")
    .bind(data.id, data.user_id, data.specialty)
    .run();
}

export async function updateDoctor(
  db: D1Database,
  id: string,
  data: { specialty?: string; is_active?: number },
) {
  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (data.specialty !== undefined) {
    sets.push("specialty = ?");
    values.push(data.specialty);
  }
  if (data.is_active !== undefined) {
    sets.push("is_active = ?");
    values.push(data.is_active);
  }

  if (sets.length === 0) return;
  values.push(id);

  await db
    .prepare(`UPDATE doctors SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

// ─── Services ───

export async function getServices(db: D1Database, includeInactive = false) {
  const where = includeInactive ? "" : "WHERE is_active = 1";
  return db
    .prepare(`SELECT * FROM services ${where} ORDER BY created_at DESC`)
    .all<{
      id: string;
      name: string;
      description: string | null;
      official_price: number;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>();
}

export async function getServiceById(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM services WHERE id = ?").bind(id).first<{
    id: string;
    name: string;
    description: string | null;
    official_price: number;
    is_active: number;
  }>();
}

export async function createService(
  db: D1Database,
  data: {
    id: string;
    name: string;
    description?: string;
    official_price: number;
  },
) {
  await db
    .prepare(
      "INSERT INTO services (id, name, description, official_price) VALUES (?, ?, ?, ?)",
    )
    .bind(data.id, data.name, data.description ?? null, data.official_price)
    .run();
}

export async function updateService(
  db: D1Database,
  id: string,
  data: { name?: string; description?: string; official_price?: number; is_active?: number },
) {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    sets.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    sets.push("description = ?");
    values.push(data.description);
  }
  if (data.official_price !== undefined) {
    sets.push("official_price = ?");
    values.push(data.official_price);
  }
  if (data.is_active !== undefined) {
    sets.push("is_active = ?");
    values.push(data.is_active);
  }

  if (sets.length === 0) return;
  sets.push("updated_at = unixepoch()");
  values.push(id);

  await db
    .prepare(`UPDATE services SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

// ─── Orders ───

export async function getOrders(
  db: D1Database,
  filters: { patient_id?: string; doctor_id?: string; status?: string },
) {
  const wheres: string[] = [];
  const values: string[] = [];

  if (filters.patient_id) {
    wheres.push("o.patient_id = ?");
    values.push(filters.patient_id);
  }
  if (filters.doctor_id) {
    wheres.push("o.doctor_id = ?");
    values.push(filters.doctor_id);
  }
  if (filters.status) {
    wheres.push("o.status = ?");
    values.push(filters.status);
  }

  const where = wheres.length > 0 ? `WHERE ${wheres.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT o.*,
              p.full_name as patient_name, p.phone as patient_phone,
              d_user.full_name as doctor_name,
              (SELECT GROUP_CONCAT(s.name, ', ')
               FROM order_items oi
               JOIN services s ON s.id = oi.service_id
               WHERE oi.order_id = o.id) as service_names,
              (SELECT COALESCE(SUM(COALESCE(oi2.actual_price, oi2.official_price) * oi2.quantity), 0)
               FROM order_items oi2
               WHERE oi2.order_id = o.id) as total_price
       FROM orders o
       JOIN users p ON p.id = o.patient_id
       LEFT JOIN doctors d ON d.id = o.doctor_id
       LEFT JOIN users d_user ON d_user.id = d.user_id
       ${where}
       ORDER BY o.created_at DESC`,
    )
    .bind(...values)
    .all();
}

export async function getOrderById(db: D1Database, id: string) {
  const order = await db
    .prepare(
      `SELECT o.*,
              p.full_name as patient_name, p.phone as patient_phone,
              d_user.full_name as doctor_name
       FROM orders o
       JOIN users p ON p.id = o.patient_id
       LEFT JOIN doctors d ON d.id = o.doctor_id
       LEFT JOIN users d_user ON d_user.id = d.user_id
       WHERE o.id = ?`,
    )
    .bind(id)
    .first();

  if (!order) return null;

  const items = await db
    .prepare(
      `SELECT oi.*, s.name as service_name
       FROM order_items oi
       JOIN services s ON s.id = oi.service_id
       WHERE oi.order_id = ?`,
    )
    .bind(id)
    .all();

  return { ...order, items: items.results };
}

export async function createOrder(
  db: D1Database,
  data: {
    id: string;
    patient_id: string;
    doctor_id?: string;
    notes?: string;
    order_date?: string;
    created_by: string;
  },
) {
  await db
    .prepare(
      "INSERT INTO orders (id, patient_id, doctor_id, notes, order_date, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      data.id,
      data.patient_id,
      data.doctor_id ?? null,
      data.notes ?? null,
      data.order_date ?? null,
      data.created_by,
    )
    .run();
}

export async function createOrderItem(
  db: D1Database,
  data: {
    id: string;
    order_id: string;
    service_id: string;
    official_price: number;
    quantity: number;
  },
) {
  await db
    .prepare(
      "INSERT INTO order_items (id, order_id, service_id, official_price, quantity) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(data.id, data.order_id, data.service_id, data.official_price, data.quantity)
    .run();
}

export async function updateOrder(
  db: D1Database,
  id: string,
  data: { doctor_id?: string; status?: string; notes?: string },
) {
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (data.doctor_id !== undefined) {
    sets.push("doctor_id = ?");
    values.push(data.doctor_id);
  }
  if (data.status !== undefined) {
    sets.push("status = ?");
    values.push(data.status);
  }
  if (data.notes !== undefined) {
    sets.push("notes = ?");
    values.push(data.notes);
  }

  if (sets.length === 0) return;
  sets.push("updated_at = unixepoch()");
  values.push(id);

  await db
    .prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function updateOrderItemPrice(
  db: D1Database,
  id: string,
  actual_price: number,
) {
  await db
    .prepare("UPDATE order_items SET actual_price = ? WHERE id = ?")
    .bind(actual_price, id)
    .run();
}

// ─── Activity Log ───

export async function logActivity(
  db: D1Database,
  data: {
    user_id: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: string;
  },
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      id,
      data.user_id,
      data.action,
      data.entity_type ?? null,
      data.entity_id ?? null,
      data.details ?? null,
    )
    .run();
}

export async function getActivityLog(db: D1Database, limit = 50) {
  return db
    .prepare(
      `SELECT al.*, u.full_name as user_name
       FROM activity_log al
       JOIN users u ON u.id = al.user_id
       ORDER BY al.created_at DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all();
}

// ─── Dashboard Stats ───

export async function getDashboardStats(db: D1Database) {
  const [orders, revenue, patients, activeOrders] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) as count FROM orders")
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT
           COALESCE(SUM(official_price * quantity), 0) as official_total,
           COALESCE(SUM(COALESCE(actual_price, official_price) * quantity), 0) as actual_total
         FROM order_items`,
      )
      .first<{ official_total: number; actual_total: number }>(),
    db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'")
      .first<{ count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'in_progress')",
      )
      .first<{ count: number }>(),
  ]);

  return {
    total_orders: orders?.count ?? 0,
    official_revenue: revenue?.official_total ?? 0,
    actual_revenue: revenue?.actual_total ?? 0,
    total_patients: patients?.count ?? 0,
    active_orders: activeOrders?.count ?? 0,
  };
}
