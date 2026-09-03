import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.erickjonesphd.com',
  // The Hugo site served pages at /about/ etc. Keep the trailing slash so the
  // old URLs, the _redirects rules, and any external links all still resolve.
  trailingSlash: 'always',
  build: { format: 'directory' },
});
