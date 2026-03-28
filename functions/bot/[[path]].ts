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

const app = new Hono<{ Bindings: Bindings }>().basePath("/bot");

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
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
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

app.post("/webhook", async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  const update = await c.req.json();

  const message = update.message;
  if (!message) return c.json({ ok: true });

  const chatId = message.chat.id;

  // Handle /start command
  if (message.text === "/start") {
    await sendMessage(
      token,
      chatId,
      "Assalomu alaykum! 👋\n\nMen sizga eng yaqin TOK BOR zaryadlash stansiyasini topishga yordam beraman.\n\n📍 Joylashuvingizni yuboring va men sizga eng yaqin stansiyani ko'rsataman.",
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

    const distText = minDist < 1
      ? `${Math.round(minDist * 1000)} m`
      : `${minDist.toFixed(1)} km`;

    const yandexUrl = `https://yandex.uz/maps/?rtext=${userLat},${userLon}~${nearest.latitude},${nearest.longitude}&rtt=auto`;
    const googleUrl = `https://www.google.com/maps/dir/${userLat},${userLon}/${nearest.latitude},${nearest.longitude}`;
    const appleUrl = `https://maps.apple.com/?saddr=${userLat},${userLon}&daddr=${nearest.latitude},${nearest.longitude}&dirflg=d`;

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
          [{ text: "🗺 Apple Maps", url: appleUrl }],
        ],
      },
    );

    return c.json({ ok: true });
  }

  // Unknown message
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
