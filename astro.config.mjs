import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  server: {
    host: true,
    allowedHosts: ['192.168.29.64']
  },
  integrations: [tailwind({
    applyBaseStyles: false,
  })],
});
