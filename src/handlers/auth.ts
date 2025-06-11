import { createFactory } from "hono/factory";
import { registerSchema, RegisterSchema } from "../schemas/auth/register";
import { getPrisma } from "../lib/prisma";
import { Context } from "hono";
import { hash, verify } from "hashless";
import { onboardSchema, OnboardSchema } from "../schemas/auth/onboard";
import { loginSchema, LoginSchema } from "../schemas/auth/login";
import { sign } from "hono/jwt";

const factory = createFactory();

export const registerUser = factory.createHandlers(async (c: Context) => {
  const body = await c.req.json<RegisterSchema>();

  const validatedBody = registerSchema.safeParse(body);
  if (!validatedBody.success) {
    return c.json({ success: false, error: "Invalid input", details: validatedBody.error.errors }, 400);
  }
  const { first_name, last_name, email, password } = validatedBody.data;
  const prisma = getPrisma(c.env.DATABASE_URL);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return c.json({ success: false, error: "User already exists" }, 409);
    }

    const hashedPassword = await hash(password);
    await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
      },
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
})

export const onBoardUser = factory.createHandlers(async (c: Context) => {
  const body = await c.req.json<OnboardSchema>();
  const validatedBody = onboardSchema.safeParse(body);
  if (!validatedBody.success) {
    return c.json({ success: false, error: "Invalid input", details: validatedBody.error.errors }, 400);
  }

  const { user_id, bio, country } = validatedBody.data;
  const prisma = getPrisma(c.env.DATABASE_URL);

  try {
    const user = await prisma.user.update({
      where: { id: user_id },
      data: {
        bio,
        country,
      },
    });

    const token = await sign({ id: user.id, onboarded: user.on_boarded, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET);
    return c.json({ success: true, token }, 200);
  } catch (error) {
    console.error("Onboarding error:", error);
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});

export const loginUser = factory.createHandlers(async (c: Context) => {
  const body = await c.req.json<LoginSchema>();
  const validatedBody = loginSchema.safeParse(body);
  if (!validatedBody.success) {
    return c.json({ success: false, error: "Invalid input", details: validatedBody.error.errors }, 400);
  }

  const { email, password } = validatedBody.data;
  const prisma = getPrisma(c.env.DATABASE_URL);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const isPasswordValid = await verify(password, user.password);
    if (!isPasswordValid) {
      return c.json({ success: false, error: "Invalid password" }, 401);
    }

    const token = await sign({ id: user.id, onboarded: user.on_boarded, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET);
    return c.json({ success: true, token }, 200);
  } catch (error) {
    return c.json({ success: false, error: "Internal server error" }, 500);
  }
});
