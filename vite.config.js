import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        // 手动拆包：核心依赖独立成 vendor chunk，便于长期缓存
        // exceljs 与 @splinetool 走动态 import 自动分包，不在此配置
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-three': ['three'],
          'vendor-gsap': ['gsap']
        }
      }
    }
  }
});
