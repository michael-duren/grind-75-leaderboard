/// <reference path="../.astro/types.d.ts" />

import type { SessionUser } from './lib/auth';

declare global {
  namespace App {
    interface Locals {
      user: SessionUser | null;
    }
  }
}

export {};
