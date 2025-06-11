import { Hono } from 'hono'
import { type Context } from 'hono';
import { getPrisma } from './lib/prisma';
import { Bindings } from './types/bindings';

const app = new Hono<{
  Bindings: Bindings;
}>()

app.get('/', async (c: Context) => {
  const prisma = getPrisma(c.env.DATABASE_URL);
  const users = await prisma.user.findMany();
  return c.json(users);
})

export default app
