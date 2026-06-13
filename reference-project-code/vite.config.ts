import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5544,
    open: true,
  },
  define: {
    __IS_PRO__: false,
    __VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __VERSION_DATE__: JSON.stringify(new Date().toISOString()),
    __COMMIT_HASH__: JSON.stringify('dev'),
    'process.env.KEEPTRACK_API_KEY': JSON.stringify(process.env.KEEPTRACK_API_KEY ?? ''),
  },
  resolve: {
    alias: {
      '@ootk/src/interpolator/ChebyshevCoefficients': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@ootk/src/interpolator/ChebyshevInterpolator': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@ootk/src/main': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@ootk': path.resolve(__dirname, './node_modules/ootk'),
      '@app/engine/ootk/src/coordinate/ClassicalElements': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/coordinate/ITRF': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/coordinate/J2000': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/coordinate/Tle': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/interpolator/LagrangeInterpolator': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/interpolator/SegmentedLagrangeInterpolator': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/interpolator/StateInterpolator': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/objects': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app/engine/ootk/src/main': path.resolve(__dirname, './node_modules/ootk/dist/main.js'),
      '@app': path.resolve(__dirname, './src'),
      '@css': path.resolve(__dirname, './src/styles'),
      '@public': path.resolve(__dirname, './public'),
      '@wallpapers': path.resolve(__dirname, './src/wallpapers.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['material-icons'],
  },
});

// Made with Bob
