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
    <main class="main-content" :class="{ 'fade-out': isStarting }">
      <!-- 水墨动画标题 -->
      <h1 class="ink-title title ink-brush-animate">指尖剑仙</h1>
      <p class="slogan ink-brush-animate delay-1">以指御剑，斩妖除魔</p>
      
      <!-- 装饰剑图案 -->
      <div class="sword-icon ink-brush-animate delay-2 animate-float">
        <img src="/images/sword.png" alt="仙剑" class="sword-image" />
        <div class="sword-glow"></div>
      </div>
      
      <button class="btn-seal ink-brush-animate delay-3" @click="handleStart">开始修炼</button>
      <NuxtLink to="/tutorial" class="tutorial-link">御剑入门教学</NuxtLink>
      <p class="version">v0.1.0 · 御剑入门版</p>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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

.sword-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(26, 26, 26, 0.3));
  border-radius: 8px;
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

/* 水墨书法动画 */
.ink-brush-animate {
  opacity: 0;
  animation: inkBrush 1.5s ease-out forwards;
}

.ink-brush-animate.delay-1 {
  animation-delay: 0.5s;
}

.ink-brush-animate.delay-2 {
  animation-delay: 1s;
}

.ink-brush-animate.delay-3 {
  animation-delay: 1.5s;
}

@keyframes inkBrush {
  0% {
    opacity: 0;
    filter: blur(8px);
    transform: translateY(20px) scale(0.9);
    clip-path: inset(0 100% 0 0);
  }
  30% {
    opacity: 0.5;
    filter: blur(4px);
    clip-path: inset(0 70% 0 0);
  }
  60% {
    opacity: 0.8;
    filter: blur(2px);
    clip-path: inset(0 30% 0 0);
  }
  100% {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
    clip-path: inset(0 0 0 0);
  }
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
