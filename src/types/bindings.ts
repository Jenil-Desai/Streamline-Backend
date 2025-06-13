import type { KVNamespace } from '@cloudflare/workers-types';

export type Bindings = {
  DATABASE_URL: string;
  JWT_SECRET: string;

  SL_CACHE: KVNamespace;
}
