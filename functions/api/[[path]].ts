import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { cors } from "hono/cors";
import { authRouter } from "../../src/server/routes/auth";
import { servicesRouter } from "../../src/server/routes/services";
import { doctorsRouter } from "../../src/server/routes/doctors";
import { ordersRouter } from "../../src/server/routes/orders";
import { dashboardRouter } from "../../src/server/routes/dashboard";

type Bindings = { DB: D1Database };

const app = new Hono<{ Bindings: Bindings }>()
  .basePath("/api")
  .onError((err, c) => {
    console.error(
      `[ERROR] ${c.req.method} ${c.req.path} — ${err.message}`,
      err.stack,
    );
    return c.json(
      { error: "Серверда хатолик юз берди", detail: err.message },
      500,
    );
  })
  .use("*", async (c, next) => {
    const origin = c.req.header("origin") || "*";
    return cors({ origin, credentials: true })(c, next);
  })
  .route("/auth", authRouter)
  .route("/services", servicesRouter)
  .route("/doctors", doctorsRouter)
  .route("/orders", ordersRouter)
  .route("/dashboard", dashboardRouter);

export const onRequest = handle(app);
