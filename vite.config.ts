import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ielts-speaking-studio/',
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    manifest: true,
    rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom'], three: ['three', '@react-three/fiber'] } } }
  },
  server: { host: '127.0.0.1', port: 5174, strictPort: true }
});
