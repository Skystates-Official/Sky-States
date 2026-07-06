import { getLegacyRedirect } from './lib/legacy-redirects.js';

/** @type {import('astro').MiddlewareHandler} */
export const onRequest = async (context, next) => {
  const redirectTarget = getLegacyRedirect(context.url.pathname);
  if (redirectTarget) {
    const destination = new URL(redirectTarget, context.url.origin);
    return context.redirect(destination.toString(), 301);
  }

  const response = await next();
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const headers = new Headers(response.headers);
    headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
    );
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Surrogate-Control', 'no-store');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    headers.delete('etag');
    headers.delete('last-modified');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};
