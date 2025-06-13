import { Context } from "hono";
import { getPrisma } from "../lib/prisma";
import { profileSchema, ProfileSchema } from "../schemas/user/profile";
import { createFactory } from "hono/factory";

const factory = createFactory();

export const getUserProfile = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "unauthorized" }, 403);
  }

  const cachkey = `user:${user_id}:profile`;
  const cachedProfile = await c.env.SL_CACHE.get(cachkey);
  if (cachedProfile) {
    return c.json({ success: true, profile: JSON.parse(cachedProfile) });
  }

  const prisma = getPrisma(c.env.DATABASE_URL);

  try {
    const user = await prisma.user.findUnique({
      where: { id: user_id },
      select: {
        first_name: true,
        last_name: true,
        email: true,
        bio: true,
        watchTime: true,
        movies_watched: true,
        shows_watched: true,
        created_at: true,
        country: true,
      },
    });

    await c.env.SL_CACHE.put(cachkey, JSON.stringify(user), { expirationTtl: 30 * 60 });

    return c.json({ success: true, profile: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
})

export const updateUserProfile = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "unauthorized" }, 403);
  }

  const body = await c.req.json<ProfileSchema>();
  const validatedBody = profileSchema.safeParse(body);
  if (!validatedBody.success) {
    return c.json({ success: false, error: validatedBody.error.message }, 400);
  }

  const { first_name, last_name, email, bio, country } = validatedBody.data;
  const prisma = getPrisma(c.env.DATABASE_URL);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user_id },
      data: { first_name, last_name, email, bio, country },
      select: {
        first_name: true,
        last_name: true,
        email: true,
        bio: true,
        watchTime: true,
        movies_watched: true,
        shows_watched: true,
        created_at: true,
        country: true,
      },
    });

    const cachkey = `user:${user_id}:profile`;
    await c.env.SL_CACHE.put(cachkey, JSON.stringify(updatedUser), { expirationTtl: 30 * 60 });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});

export const destroyUserProfile = factory.createHandlers(async (c: Context) => {
  const user_id = c.get("userId");
  if (!user_id) {
    return c.json({ success: false, error: "unauthorized" }, 403);
  }

  const prisma = getPrisma(c.env.DATABASE_URL);
  try {
    await prisma.user.delete({
      where: { id: user_id },
    });

    const cachkey = `user:${user_id}:profile`;
    await c.env.SL_CACHE.delete(cachkey);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: "Internal Server Error" }, 500);
  }
});
