/// <reference path="../.astro/types.d.ts" />

import type { User } from './types/database';
import type { AuthUser } from './lib/auth';

declare namespace App {
  interface Locals {
    user?: User;
    authUser?: AuthUser;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
