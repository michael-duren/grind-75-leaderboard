import { defineMiddleware } from 'astro:middleware';
import { getSessionUser, SESSION_COOKIE } from './lib/auth';

/**
 * Resolve the current user once per request and stash it on `locals` so pages
 * and API routes can read `Astro.locals.user` without re-querying.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const token = context.cookies.get(SESSION_COOKIE)?.value;
  context.locals.user = await getSessionUser(token);
  return next();
});
