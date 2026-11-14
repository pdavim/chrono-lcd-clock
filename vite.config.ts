import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vite 8 always injects `/@vite/client` in dev mode even when `server.hmr` /
 * `server.ws` are `false`, causing the browser client to open a WebSocket to
 * port 24678 and reject with `Error: WebSocket closed without opened.` behind
 * reverse proxies (such as Cloud Run / AI Studio preview with DISABLE_HMR=true).
 */
function quietDisabledHmrPlugin(): Plugin {
  return {
    name: 'chrono80:quiet-disabled-hmr',
    apply: 'serve',
    enforce: 'post',
    transform(code, id) {
      if (process.env.DISABLE_HMR !== 'true') {
        return null;
      }
      const cleanId = id.replace(/\\/g, '/').split('?')[0];
      if (cleanId.endsWith('/vite/dist/client/client.mjs')) {
        return code
          .replace('await wsTransport.connect(handlers);', 'return;')
          .replace('await wsTransport.disconnect();', 'return;')
          .replace('wsTransport.send(data);', 'return;')
          .replace(
            'setupForwardConsoleHandler(transport, forwardConsole);',
            '/* Forward console WebSocket disabled via DISABLE_HMR */'
          );
      }
      if (cleanId.includes('pwa-entry-point-loaded')) {
        return code.replace(/import\.meta\.hot\./g, 'import.meta.hot?.');
      }
      return null;
    },
  };
}

export default defineConfig(() => {
  const hmrDisabled = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon.svg',
          'icon.svg',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'apple-touch-icon-152x152.png',
          'apple-touch-icon-167x167.png',
        ],
        manifest: {
          id: '/',
          name: 'Chrono80 LCD Timer',
          short_name: 'Chrono80',
          description:
            'Full-screen horizontal iPad and desktop timer clock featuring an authentic 1980s Timex 7-segment LCD aesthetic, stopwatch, countdown timer, interval training, live millisecond clock, and customizable display.',
          theme_color: '#0b0f12',
          background_color: '#0b0f12',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'any',
          start_url: '/',
          scope: '/',
          categories: ['utilities', 'productivity', 'sports', 'lifestyle'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        },
        devOptions: {
          enabled: true,
          type: 'module',
          suppressWarnings: true,
        },
      }),
      quietDisabledHmrPlugin(),
    ],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: !hmrDisabled,
      ws: hmrDisabled ? (false as const) : undefined,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: hmrDisabled ? null : {},
    },
  };
});

