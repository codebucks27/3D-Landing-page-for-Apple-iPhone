import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { loadEnv, normalizePath, transformWithOxc } from 'vite';
import { defineConfig } from 'vitest/config';

const root = normalizePath(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig(({ command, mode, isPreview }) => {
  const nodeEnv = command === 'build' || isPreview ? 'production' : mode === 'test' ? 'test' : 'development';
  process.env.NODE_ENV = nodeEnv;
  // Vite permits a development override from .env; CRA fixes NODE_ENV per command.
  process.env.VITE_USER_NODE_ENV = nodeEnv === 'development' ? 'development' : '';

  // CRA only exposes these public values to browser code.
  const env = loadEnv(mode, root, ['REACT_APP_', 'PUBLIC_URL']);
  const publicUrl = (env.PUBLIC_URL || '').replace(/\/$/, '');
  const clientEnv = {
    ...Object.fromEntries(
      Object.entries(env).filter(([key]) => key.startsWith('REACT_APP_')),
    ),
    NODE_ENV: nodeEnv,
    PUBLIC_URL: publicUrl,
  };

  return {
    appType: 'spa',
    base: publicUrl ? `${publicUrl}/` : '/',
    envPrefix: 'REACT_APP_',
    define: {
      'process.env': JSON.stringify(clientEnv),
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
    plugins: [
      {
        name: 'jsx-in-source-js',
        enforce: 'pre',
        transform(code, id) {
          if (!id.split('?')[0].startsWith(root + 'src/') || !/\.js(?:\?|$)/.test(id)) {
            return null;
          }
          return transformWithOxc(code, id, {
            lang: 'jsx',
            jsx: { runtime: 'automatic', development: command === 'serve' },
          });
        },
      },
      react(),
      {
        name: 'cra-public-html-env',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html.replace(/%([A-Z0-9_]+)%/g, (placeholder, key) =>
              Object.hasOwn(clientEnv, key) ? clientEnv[key] : placeholder,
            );
          },
        },
      },
    ],
    optimizeDeps: { rolldownOptions: { moduleTypes: { '.js': 'jsx' } } },
    build: { outDir: 'build' },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/setupTests.js',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
    },
  };
});
