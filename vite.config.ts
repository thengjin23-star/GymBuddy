import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg'],
          manifest: {
            name: 'FitFlow AI',
            short_name: 'FitFlow',
            description: '你的專屬 AI 健身教練，隨時隨地為你量身打造訓練計畫。',
            start_url: '/',
            display: 'standalone',
            background_color: '#09090b',
            theme_color: '#a3e635',
            lang: 'zh-TW',
            icons: [
              { src: '/icon.svg', sizes: '192x192 512x512', type: 'image/svg+xml', purpose: 'any maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
            // Firestore and the Gemini API must always hit the network; caching
            // their responses would serve stale workout data
            navigateFallbackDenylist: [/^\/__/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts',
                  expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
        }),
      ],
      build: {
        rollupOptions: {
          output: {
            // 將大型第三方套件拆成獨立 chunk，改善手機端首次載入速度
            manualChunks: {
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              'vendor-charts': ['recharts'],
              'vendor-ai': ['@google/genai'],
              'vendor-ui': ['motion/react', 'lucide-react', 'react-markdown'],
            }
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
