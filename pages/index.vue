<script setup lang="ts">
const isStarting = ref(false)

const handleStart = () => {
  isStarting.value = true
  setTimeout(() => {
    navigateTo('/game')
  }, 800)
}
</script>

<template>
  <div class="home-container">
    <!-- 背景图片 -->
    <div class="bg-image"></div>
    
    <!-- 背景装饰 -->
    <div class="bg-decor">
      <svg viewBox="0 0 1200 400" class="mountain-svg" preserveAspectRatio="xMidYMax slice">
        <path d="M0,400 Q150,200 300,350 T600,300 T900,350 T1200,280 L1200,400 Z" 
              fill="#6B6B6B" fill-opacity="0.3"/>
        <path d="M0,400 Q100,300 200,380 T400,320 T600,380 T800,300 T1000,380 T1200,350 L1200,400 Z" 
              fill="#3D3D3D" fill-opacity="0.4"/>
      </svg>
    </div>

    <!-- 主内容 -->
    <main class="main-content" :class="{ 'animate-ink-fade-in': !isStarting, 'fade-out': isStarting }">
      <h1 class="ink-title title">指尖剑仙</h1>
      <p class="slogan">以指御剑，斩妖除魔</p>
      
      <!-- 装饰剑图案 -->
      <div class="sword-icon animate-float">
        <svg viewBox="0 0 100 100">
          <defs>
            <linearGradient id="swordGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#3D3D3D"/>
              <stop offset="50%" stop-color="#9A9A9A"/>
              <stop offset="100%" stop-color="#3D3D3D"/>
            </linearGradient>
          </defs>
          <path d="M50,5 L56,65 L50,80 L44,65 Z" fill="url(#swordGradient)" stroke="#1A1A1A" stroke-width="0.8"/>
          <path d="M50,10 L52,45 L50,55 L48,45 Z" fill="white" fill-opacity="0.4"/>
          <ellipse cx="50" cy="65" rx="14" ry="4" fill="#C41E3A" stroke="#1A1A1A" stroke-width="0.5"/>
          <rect x="45" y="65" width="10" height="18" fill="#8B6914" stroke="#1A1A1A" stroke-width="0.5"/>
          <ellipse cx="50" cy="83" rx="6" ry="2" fill="#6B5010" stroke="#1A1A1A" stroke-width="0.3"/>
        </svg>
        <div class="sword-glow"></div>
      </div>
      
      <button class="btn-seal" @click="handleStart">开始修炼</button>
      <NuxtLink to="/tutorial" class="tutorial-link">御剑入门教学</NuxtLink>
      <p class="version">v0.1.0 · 御剑入门版</p>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
}

.bg-image {
  position: absolute;
  inset: 0;
  background-image: url('/images/bg-mountain.jpg');
  background-size: cover;
  background-position: center;
  opacity: 0.15;
  pointer-events: none;
}

.bg-decor {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  pointer-events: none;
  opacity: 0.3;
}

.mountain-svg {
  width: 100%;
  height: 100%;
}

.main-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1rem;
}

.fade-out {
  opacity: 0;
  transform: scale(1.1);
  transition: all 0.7s ease;
}

.title {
  font-size: 4rem;
  margin-bottom: 1rem;
  letter-spacing: 0.2em;
}

@media (min-width: 768px) {
  .title {
    font-size: 6rem;
  }
}

.slogan {
  color: #6B6B6B;
  font-size: 1.25rem;
  margin-bottom: 3rem;
  font-family: 'ZCOOL XiaoWei', serif;
  letter-spacing: 0.3em;
}

@media (min-width: 768px) {
  .slogan {
    font-size: 1.5rem;
  }
}

.sword-icon {
  position: relative;
  width: 12rem;
  height: 12rem;
  margin-bottom: 3rem;
}

.sword-icon svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 6px rgba(26, 26, 26, 0.3));
}

.sword-glow {
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 1px solid rgba(107, 107, 107, 0.2);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.tutorial-link {
  display: block;
  margin-top: 1rem;
  color: #6B6B6B;
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s;
}

.tutorial-link:hover {
  color: #C41E3A;
}

.version {
  margin-top: 2rem;
  color: rgba(107, 107, 107, 0.5);
  font-size: 0.875rem;
}
</style>
