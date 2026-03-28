const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionUser {
  id: string;
  phone: string;
  role: string;
  full_name: string;
}

export async function createSession(
  db: D1Database,
  userId: string,
): Promise<string> {
  const token = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_TTL_SECONDS;

  await db
    .prepare(
      "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    )
    .bind(token, userId, expiresAt, now)
    .run();

  return token;
}

export async function validateSession(
  db: D1Database,
  token: string,
): Promise<SessionUser | null> {
  const now = Math.floor(Date.now() / 1000);

  const row = await db
    .prepare(
      `SELECT u.id, u.phone, u.role, u.full_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > ?`,
    )
    .bind(token, now)
    .first<SessionUser>();

  return row ?? null;
}

export async function deleteSession(
  db: D1Database,
  token: string,
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
}
