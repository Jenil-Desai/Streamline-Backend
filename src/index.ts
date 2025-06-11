import { Hono } from 'hono'
import { Bindings } from './types/bindings';
import { v1Router } from './routes/v1';

const app = new Hono<{
  Bindings: Bindings;
}>()

app.route("api/v1", v1Router);

export default app
