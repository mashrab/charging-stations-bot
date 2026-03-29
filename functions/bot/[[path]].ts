import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

type Bindings = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN: string;
};

type Station = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
};

type BrandOwner = {
  brand_id: number;
  brand_name: string;
  role: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath("/bot");

// Fetch user's profile photo file_id
async function getUserPhotoFileId(
  token: string,
  userId: number,
): Promise<string | null> {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${userId}&limit=1`,
  );
  const data = (await res.json()) as {
    ok: boolean;
    result?: { photos: { file_id: string }[][] };
  };
  if (data.ok && data.result && data.result.photos.length > 0) {
    const sizes = data.result.photos[0];
    return sizes[sizes.length - 1].file_id;
  }
  return null;
}

// Save or update user info from Telegram
async function upsertUser(
  token: string,
  db: D1Database,
  from: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
  },
  location?: { latitude: number; longitude: number },
) {
  const photoFileId = await getUserPhotoFileId(token, from.id);

  await db
    .prepare(
      `INSERT INTO users (telegram_id, first_name, last_name, username, language_code, is_premium, photo_file_id, last_location_lat, last_location_lon, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(telegram_id) DO UPDATE SET
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         username = excluded.username,
         language_code = excluded.language_code,
         is_premium = excluded.is_premium,
         photo_file_id = COALESCE(excluded.photo_file_id, photo_file_id),
         last_location_lat = COALESCE(excluded.last_location_lat, last_location_lat),
         last_location_lon = COALESCE(excluded.last_location_lon, last_location_lon),
         last_active_at = datetime('now'),
         updated_at = datetime('now')`,
    )
    .bind(
      from.id,
      from.first_name,
      from.last_name ?? null,
      from.username ?? null,
      from.language_code ?? null,
      from.is_premium ? 1 : 0,
      photoFileId,
      location?.latitude ?? null,
      location?.longitude ?? null,
    )
    .run();
}

// Log a request — returns the log id for click tracking
async function logRequest(
  db: D1Database,
  telegramId: number,
  type: string,
  userLat?: number,
  userLon?: number,
  stationId?: number,
  distanceKm?: number,
): Promise<number | null> {
  const result = await db
    .prepare(
      `INSERT INTO request_logs (telegram_id, request_type, user_lat, user_lon, nearest_station_id, distance_km)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(telegramId, type, userLat ?? null, userLon ?? null, stationId ?? null, distanceKm ?? null)
    .first<{ id: number }>();
  return result?.id ?? null;
}

// Check if user is a brand owner
async function getBrandOwner(
  db: D1Database,
  telegramId: number,
): Promise<BrandOwner | null> {
  const row = await db
    .prepare(
      `SELECT bo.brand_id, b.name as brand_name, bo.role
       FROM brand_owners bo
       JOIN brands b ON b.id = bo.brand_id
       WHERE bo.telegram_id = ?`,
    )
    .bind(telegramId)
    .first<BrandOwner>();
  return row ?? null;
}

// Haversine formula — returns distance in km
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  extra?: Record<string, unknown>,
) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function sendVenue(
  token: string,
  chatId: number,
  latitude: number,
  longitude: number,
  title: string,
  address: string,
  replyMarkup?: Record<string, unknown>,
) {
  await fetch(`https://api.telegram.org/bot${token}/sendVenue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      latitude,
      longitude,
      title,
      address,
      reply_markup: replyMarkup,
    }),
  });
}

// ── Owner stats commands ──────────────────────────────────────

async function handleStats(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const stats = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM request_logs rl JOIN charging_stations cs ON cs.id = rl.nearest_station_id WHERE cs.brand_id = ? AND rl.request_type = 'location' AND date(rl.created_at) = date('now')) as today,
        (SELECT COUNT(*) FROM request_logs rl JOIN charging_stations cs ON cs.id = rl.nearest_station_id WHERE cs.brand_id = ? AND rl.request_type = 'location' AND rl.created_at >= datetime('now', '-7 days')) as week,
        (SELECT COUNT(*) FROM request_logs rl JOIN charging_stations cs ON cs.id = rl.nearest_station_id WHERE cs.brand_id = ? AND rl.request_type = 'location' AND rl.created_at >= datetime('now', '-30 days')) as month,
        (SELECT COUNT(DISTINCT rl.telegram_id) FROM request_logs rl JOIN charging_stations cs ON cs.id = rl.nearest_station_id WHERE cs.brand_id = ? AND rl.request_type = 'location') as total_users,
        (SELECT ROUND(AVG(rl.distance_km), 1) FROM request_logs rl JOIN charging_stations cs ON cs.id = rl.nearest_station_id WHERE cs.brand_id = ? AND rl.request_type = 'location') as avg_distance`,
    )
    .bind(owner.brand_id, owner.brand_id, owner.brand_id, owner.brand_id, owner.brand_id)
    .first<{ today: number; week: number; month: number; total_users: number; avg_distance: number }>();

  const s = stats!;
  await sendMessage(
    token,
    chatId,
    `📊 <b>${owner.brand_name} — Statistika</b>\n\n` +
      `▫️ Bugun: <b>${s.today}</b> so'rov\n` +
      `▫️ Hafta: <b>${s.week}</b> so'rov\n` +
      `▫️ Oy: <b>${s.month}</b> so'rov\n` +
      `▫️ Jami foydalanuvchilar: <b>${s.total_users}</b>\n` +
      `▫️ O'rtacha masofa: <b>${s.avg_distance ?? 0}</b> km`,
  );
}

async function handleToday(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const { results } = await db
    .prepare(
      `SELECT strftime('%H', rl.created_at) as hour, COUNT(*) as cnt, COUNT(DISTINCT rl.telegram_id) as users
       FROM request_logs rl
       JOIN charging_stations cs ON cs.id = rl.nearest_station_id
       WHERE cs.brand_id = ? AND rl.request_type = 'location' AND date(rl.created_at) = date('now')
       GROUP BY hour ORDER BY hour`,
    )
    .bind(owner.brand_id)
    .all<{ hour: string; cnt: number; users: number }>();

  if (!results || results.length === 0) {
    await sendMessage(token, chatId, `📊 <b>${owner.brand_name}</b>\n\nBugun hali so'rovlar yo'q.`);
    return;
  }

  let text = `📊 <b>${owner.brand_name} — Bugun</b>\n\n`;
  text += `<code>Soat  So'rov  Foydalanuvchi</code>\n`;
  for (const r of results) {
    text += `<code>${r.hour}:00   ${String(r.cnt).padStart(5)}   ${String(r.users).padStart(5)}</code>\n`;
  }
  await sendMessage(token, chatId, text);
}

async function handleWeek(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const { results } = await db
    .prepare(
      `SELECT date(rl.created_at) as day, COUNT(*) as cnt, COUNT(DISTINCT rl.telegram_id) as users
       FROM request_logs rl
       JOIN charging_stations cs ON cs.id = rl.nearest_station_id
       WHERE cs.brand_id = ? AND rl.request_type = 'location' AND rl.created_at >= datetime('now', '-7 days')
       GROUP BY day ORDER BY day`,
    )
    .bind(owner.brand_id)
    .all<{ day: string; cnt: number; users: number }>();

  if (!results || results.length === 0) {
    await sendMessage(token, chatId, `📊 <b>${owner.brand_name}</b>\n\nSo'nggi 7 kunda so'rovlar yo'q.`);
    return;
  }

  let text = `📊 <b>${owner.brand_name} — So'nggi 7 kun</b>\n\n`;
  text += `<code>Sana        So'rov  Foydalanuvchi</code>\n`;
  for (const r of results) {
    text += `<code>${r.day}   ${String(r.cnt).padStart(5)}   ${String(r.users).padStart(5)}</code>\n`;
  }
  await sendMessage(token, chatId, text);
}

async function handleMonth(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const { results } = await db
    .prepare(
      `SELECT date(rl.created_at) as day, COUNT(*) as cnt, COUNT(DISTINCT rl.telegram_id) as users
       FROM request_logs rl
       JOIN charging_stations cs ON cs.id = rl.nearest_station_id
       WHERE cs.brand_id = ? AND rl.request_type = 'location' AND rl.created_at >= datetime('now', '-30 days')
       GROUP BY day ORDER BY day`,
    )
    .bind(owner.brand_id)
    .all<{ day: string; cnt: number; users: number }>();

  if (!results || results.length === 0) {
    await sendMessage(token, chatId, `📊 <b>${owner.brand_name}</b>\n\nSo'nggi 30 kunda so'rovlar yo'q.`);
    return;
  }

  let text = `📊 <b>${owner.brand_name} — So'nggi 30 kun</b>\n\n`;
  text += `<code>Sana        So'rov  Foydalanuvchi</code>\n`;
  for (const r of results) {
    text += `<code>${r.day}   ${String(r.cnt).padStart(5)}   ${String(r.users).padStart(5)}</code>\n`;
  }
  await sendMessage(token, chatId, text);
}

async function handleTop(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const { results } = await db
    .prepare(
      `SELECT cs.name, COUNT(*) as cnt, COUNT(DISTINCT rl.telegram_id) as users
       FROM request_logs rl
       JOIN charging_stations cs ON cs.id = rl.nearest_station_id
       WHERE cs.brand_id = ? AND rl.request_type = 'location'
       GROUP BY cs.id ORDER BY cnt DESC LIMIT 5`,
    )
    .bind(owner.brand_id)
    .all<{ name: string; cnt: number; users: number }>();

  if (!results || results.length === 0) {
    await sendMessage(token, chatId, `📊 <b>${owner.brand_name}</b>\n\nHali ma'lumot yo'q.`);
    return;
  }

  let text = `📊 <b>${owner.brand_name} — Top stansiyalar</b>\n\n`;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    text += `${i + 1}. <b>${r.name}</b>\n   So'rovlar: ${r.cnt} | Foydalanuvchilar: ${r.users}\n\n`;
  }
  await sendMessage(token, chatId, text);
}

async function handleUsers(
  token: string,
  db: D1Database,
  chatId: number,
  owner: BrandOwner,
) {
  const stats = await db
    .prepare(
      `SELECT
        COUNT(DISTINCT rl.telegram_id) as total,
        (SELECT COUNT(DISTINCT rl2.telegram_id) FROM request_logs rl2 JOIN charging_stations cs2 ON cs2.id = rl2.nearest_station_id WHERE cs2.brand_id = ? AND rl2.request_type = 'location' AND date(rl2.created_at) = date('now')) as dau,
        (SELECT COUNT(DISTINCT rl2.telegram_id) FROM request_logs rl2 JOIN charging_stations cs2 ON cs2.id = rl2.nearest_station_id WHERE cs2.brand_id = ? AND rl2.request_type = 'location' AND rl2.created_at >= datetime('now', '-7 days')) as wau,
        (SELECT COUNT(DISTINCT rl2.telegram_id) FROM request_logs rl2 JOIN charging_stations cs2 ON cs2.id = rl2.nearest_station_id WHERE cs2.brand_id = ? AND rl2.request_type = 'location' AND rl2.created_at >= datetime('now', '-30 days')) as mau
       FROM request_logs rl
       JOIN charging_stations cs ON cs.id = rl.nearest_station_id
       WHERE cs.brand_id = ? AND rl.request_type = 'location'`,
    )
    .bind(owner.brand_id, owner.brand_id, owner.brand_id, owner.brand_id)
    .first<{ total: number; dau: number; wau: number; mau: number }>();

  const s = stats!;
  await sendMessage(
    token,
    chatId,
    `👥 <b>${owner.brand_name} — Foydalanuvchilar</b>\n\n` +
      `▫️ DAU (bugun): <b>${s.dau}</b>\n` +
      `▫️ WAU (hafta): <b>${s.wau}</b>\n` +
      `▫️ MAU (oy): <b>${s.mau}</b>\n` +
      `▫️ Jami: <b>${s.total}</b>`,
  );
}

// ── Webhook handler ───────────────────────────────────────────

app.post("/webhook", async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  const update = await c.req.json();

  const message = update.message;
  if (!message) return c.json({ ok: true });

  const chatId = message.chat.id;
  const telegramId = message.from?.id;

  // Save user info
  if (message.from) {
    await upsertUser(token, c.env.DB, message.from, message.location ?? undefined);
  }

  // Check if user is a brand owner
  const owner = telegramId ? await getBrandOwner(c.env.DB, telegramId) : null;

  // Handle owner commands
  if (owner && message.text) {
    const cmd = message.text.trim().toLowerCase();
    switch (cmd) {
      case "/stats":
        await logRequest(c.env.DB, telegramId!, "owner_stats");
        await handleStats(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
      case "/today":
        await logRequest(c.env.DB, telegramId!, "owner_today");
        await handleToday(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
      case "/week":
        await logRequest(c.env.DB, telegramId!, "owner_week");
        await handleWeek(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
      case "/month":
        await logRequest(c.env.DB, telegramId!, "owner_month");
        await handleMonth(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
      case "/top":
        await logRequest(c.env.DB, telegramId!, "owner_top");
        await handleTop(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
      case "/users":
        await logRequest(c.env.DB, telegramId!, "owner_users");
        await handleUsers(token, c.env.DB, chatId, owner);
        return c.json({ ok: true });
    }
  }

  // Handle /start command
  if (message.text === "/start") {
    await logRequest(c.env.DB, telegramId!, "start");

    const keyboard: { text: string; request_location?: boolean }[][] = [
      [{ text: "📍 Joylashuvimni yuborish", request_location: true }],
    ];

    let welcomeText =
      "Assalomu alaykum! 👋\n\nMen sizga eng yaqin elektromobil zaryadlash stansiyasini topishga yordam beraman.\n\n📍 Joylashuvingizni yuboring — men sizga eng yaqin stansiyani ko'rsataman.";

    if (owner) {
      welcomeText +=
        `\n\n🔑 <b>${owner.brand_name}</b> admin sifatida kirdingiz.\n\n` +
        `Buyruqlar:\n` +
        `/stats — Umumiy statistika\n` +
        `/today — Bugungi ko'rsatkichlar\n` +
        `/week — Haftalik ko'rsatkichlar\n` +
        `/month — Oylik ko'rsatkichlar\n` +
        `/top — Top stansiyalar\n` +
        `/users — DAU / WAU / MAU`;
    }

    await sendMessage(token, chatId, welcomeText, {
      reply_markup: { keyboard, resize_keyboard: true },
    });
    return c.json({ ok: true });
  }

  // Handle location
  if (message.location) {
    const userLat = message.location.latitude;
    const userLon = message.location.longitude;

    const { results } = await c.env.DB.prepare(
      "SELECT id, name, latitude, longitude FROM charging_stations",
    ).all<Station>();

    if (!results || results.length === 0) {
      await sendMessage(token, chatId, "Stansiyalar topilmadi.");
      return c.json({ ok: true });
    }

    // Find nearest station
    let nearest = results[0];
    let minDist = haversine(userLat, userLon, nearest.latitude, nearest.longitude);

    for (let i = 1; i < results.length; i++) {
      const dist = haversine(userLat, userLon, results[i].latitude, results[i].longitude);
      if (dist < minDist) {
        minDist = dist;
        nearest = results[i];
      }
    }

    // Log the location request
    await logRequest(c.env.DB, telegramId!, "location", userLat, userLon, nearest.id, minDist);

    const distText = minDist < 1
      ? `${Math.round(minDist * 1000)} m`
      : `${minDist.toFixed(1)} km`;

    const yandexUrl = `https://yandex.uz/maps/?rtext=${userLat},${userLon}~${nearest.latitude},${nearest.longitude}&rtt=auto`;
    const googleUrl = `https://www.google.com/maps/dir/${userLat},${userLon}/${nearest.latitude},${nearest.longitude}`;
    const otherMapsUrl = `https://maps.apple.com/?daddr=${nearest.latitude},${nearest.longitude}&saddr=${userLat},${userLon}`;

    await sendVenue(
      token,
      chatId,
      nearest.latitude,
      nearest.longitude,
      nearest.name,
      `📏 ${distText} masofada`,
      {
        inline_keyboard: [
          [{ text: "🗺 Yandex Xarita", url: yandexUrl }],
          [{ text: "🗺 Google Maps", url: googleUrl }],
          [{ text: "🗺 Boshqa xarita ilova", url: otherMapsUrl }],
        ],
      },
    );

    return c.json({ ok: true });
  }

  // Unknown message
  await logRequest(c.env.DB, telegramId!, "other");
  await sendMessage(
    token,
    chatId,
    "📍 Iltimos, joylashuvingizni yuboring yoki pastdagi tugmani bosing.",
    {
      reply_markup: {
        keyboard: [
          [{ text: "📍 Joylashuvimni yuborish", request_location: true }],
        ],
        resize_keyboard: true,
      },
    },
  );

  return c.json({ ok: true });
});

export const onRequest = handle(app);
