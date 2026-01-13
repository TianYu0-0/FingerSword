<script setup lang="ts">
import GameCanvas from '~/components/game/GameCanvas.vue'

const showHelp = ref(false)
</script>

<template>
  <div class="game-container">
    <GameCanvas class="canvas-layer" />
    
    <header class="game-header">
      <NuxtLink to="/" class="back-btn ink-card">← 返回</NuxtLink>
      <button class="help-btn ink-card" @click="showHelp = !showHelp">?</button>
    </header>
    
    <Transition name="fade">
      <div v-if="showHelp" class="help-panel ink-card">
        <h3 class="help-title">操作说明</h3>
        <ul class="help-list">
          <li><span class="highlight">移动鼠标</span> - 控制剑的位置</li>
          <li><span class="highlight">左键单击</span> - 剑气斩击</li>
          <li><span class="highlight">左键长按</span> - 蓄力斩</li>
          <li><span class="highlight">右键长按</span> - 聚剑</li>
          <li><span class="highlight">右键松开</span> - 万剑齐发</li>
        </ul>
        <button class="close-btn" @click="showHelp = false">关闭</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #F5F0E6;
}

.canvas-layer {
  position: absolute;
  inset: 0;
}

.game-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}

.back-btn, .help-btn {
  pointer-events: auto;
  color: #1A1A1A;
  text-decoration: none;
  transition: background-color 0.2s;
}

.back-btn {
  padding: 0.5rem 1rem;
}

.back-btn:hover, .help-btn:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.help-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  border: none;
}

.help-panel {
  position: absolute;
  top: 5rem;
  right: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 16rem;
}

.help-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.125rem;
  color: #1A1A1A;
  margin-bottom: 0.75rem;
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-list li {
  font-size: 0.875rem;
  color: #6B6B6B;
  margin-bottom: 0.5rem;
}

.highlight {
  color: #C41E3A;
}

.close-btn {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: rgba(107, 107, 107, 0.5);
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  color: #1A1A1A;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
