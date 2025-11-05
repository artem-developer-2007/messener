import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
<<<<<<< HEAD
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss()
  ],
  
  // ✅ ВАЖНО: Базовый путь зависит от режима
  base: mode === 'development' ? '/' : './',
  
=======
export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
<<<<<<< HEAD
  
  // ✅ ВАЖНО: явно укажите папку сборки
  build: {
    outDir: './dist',
    assetsDir: 'assets',
    
    // ✅ Оптимизации для Electron
    rollupOptions: mode === 'development' ? undefined : {
      output: {
        // Упрощаем структуру чанков для Electron
        manualChunks: undefined,
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    
    // ✅ Увеличиваем лимит для больших приложений
    chunkSizeWarningLimit: 1000
  },
  
  // ✅ Оптимизации для production сборки
  esbuild: {
    drop: mode === 'development' ? [] : ['console', 'debugger']
  }
}))
=======
  // ВАЖНО: явно укажите папку сборки
  build: {
    outDir: './dist'
  }
})
>>>>>>> 0dd18585cf3beb9146e60a185cd7943f679b8751
