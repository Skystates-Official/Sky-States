import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  site: 'https://skystates.us',
  server: {
    host: true,
  },
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [tailwind({
    applyBaseStyles: false,
  })],
});
