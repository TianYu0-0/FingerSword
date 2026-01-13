/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // 水墨风格配色
        'ink': {
          dark: '#1A1A1A',    // 浓墨黑
          DEFAULT: '#3D3D3D', // 中墨
          light: '#6B6B6B',   // 淡墨灰
        },
        'paper': '#F5F0E6',   // 宣纸米白
        'vermilion': '#C41E3A', // 朱红
        'indigo': '#2E4A62',  // 藏青
        'ochre': '#8B6914',   // 赭石
      },
      fontFamily: {
        'brush': ['"ZCOOL XiaoWei"', 'serif'], // 书法字体
      },
      animation: {
        'ink-spread': 'inkSpread 0.6s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
        'brush-stroke': 'brushStroke 0.3s ease-out',
      },
      keyframes: {
        inkSpread: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        brushStroke: {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
      },
    },
  },
  plugins: [],
}
