export default defineNuxtConfig({
  compatibilityDate: '2024-12-20',
  devtools: { enabled: true },
  
  // 静态站点生成配置
  ssr: false,
  
  modules: [],

  app: {
    head: {
      title: '指尖剑仙 - 以指御剑，斩妖除魔',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '一款基于手势识别的仙侠风格互动游戏' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],
})
