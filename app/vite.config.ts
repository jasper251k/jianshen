import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 发布在 jasper251k.github.io/jianshen/ 下
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/jianshen/' : '/',
  plugins: [
    react(),
    // 添加到主屏幕后像 App 一样全屏打开；页面缓存在手机里，健身房没信号也能用
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: {
        name: '训练记',
        short_name: '训练记',
        description: '记组数、体重、热量、静息心率',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
}))
