import { verify } from "hono/jwt";
import { createMiddleware } from "hono/factory";
import { type Context, type Next } from "hono";

export const verifyToken = createMiddleware(async (c: Context, next: Next) => {
  const token = c.req.header("Authorization");
  if (!token) {
    c.status(403);
    return c.json({ error: "unauthorized" });
  }

  const payload = await verify(token, c.env.JWT_SECRET);
  if (!payload.id) {
    c.status(403);
    return c.json({ error: "Invalid User" });
  }
  c.set("userId", payload.id);
  await next();
});
