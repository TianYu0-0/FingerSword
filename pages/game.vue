<script setup lang="ts">
import GameCanvas from '~/components/game/GameCanvas.vue'
import { useGesture } from '~/composables/useGesture'
import { useGestureActions } from '~/composables/useGestureActions'

const showHelp = ref(false)
const showModeSelector = ref(false)
const controlMode = ref<'mouse' | 'touch' | 'gesture'>('mouse')
const showGesturePanel = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)

const { 
  isInitialized, 
  isLoading, 
  error, 
  gestureState,
  initialize,
  stop 
} = useGesture()

const {
  state: gestureActionState,
  setCallbacks,
  processGesture,
  reset: resetGestureActions
} = useGestureActions()

// 控制模式图标
const modeIcons = {
  mouse: '🖱️',
  touch: '👆',
  gesture: '✋'
}

const modeNames = {
  mouse: '鼠标模式',
  touch: '触摸模式',
  gesture: '手势模式'
}

// 选择控制模式
const selectControlMode = async (mode: 'mouse' | 'touch' | 'gesture') => {
  // 如果从手势模式切换出去，停止手势识别
  if (controlMode.value === 'gesture' && mode !== 'gesture') {
    stop()
    showGesturePanel.value = false
    resetGestureActions()
  }
  
  // 如果切换到手势模式
  if (mode === 'gesture') {
    showGesturePanel.value = true
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      if (success) {
        controlMode.value = mode
      }
    }
  } else {
    controlMode.value = mode
  }
  
  showModeSelector.value = false
}

// 切换手势控制
const toggleGestureControl = async () => {
  if (controlMode.value === 'gesture') {
    controlMode.value = 'mouse'
    showGesturePanel.value = false
    stop()
  } else {
    showGesturePanel.value = true
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      if (success) {
        controlMode.value = 'gesture'
      }
    }
  }
}

// 关闭手势面板
const closeGesturePanel = () => {
  showGesturePanel.value = false
  if (controlMode.value === 'gesture') {
    controlMode.value = 'mouse'
    stop()
    resetGestureActions()
  }
}

// 手势状态变化时处理动作
watch(gestureState, (newState) => {
  if (controlMode.value === 'gesture' && isInitialized.value) {
    // 使用画布尺寸进行坐标映射
    const canvasWidth = window.innerWidth
    const canvasHeight = window.innerHeight
    processGesture(newState, canvasWidth, canvasHeight)
  }
}, { deep: true })
</script>

<template>
  <div class="game-container">
    <GameCanvas ref="gameCanvasRef" class="canvas-layer" :gesture-mode="controlMode === 'gesture'" />
    
    <header class="game-header">
      <NuxtLink to="/" class="back-btn ink-card">← 返回</NuxtLink>
      <div class="header-right">
        <div class="mode-selector-wrapper">
          <button 
            class="mode-btn ink-card" 
            @click="showModeSelector = !showModeSelector"
          >
            {{ modeIcons[controlMode] }}
          </button>
          <Transition name="slide">
            <div v-if="showModeSelector" class="mode-dropdown ink-card">
              <button 
                v-for="mode in ['mouse', 'touch', 'gesture'] as const" 
                :key="mode"
                class="mode-option"
                :class="{ active: controlMode === mode }"
                @click="selectControlMode(mode)"
              >
                <span class="mode-icon">{{ modeIcons[mode] }}</span>
                <span class="mode-name">{{ modeNames[mode] }}</span>
              </button>
            </div>
          </Transition>
        </div>
        <button class="help-btn ink-card" @click="showHelp = !showHelp">?</button>
      </div>
    </header>
    
    <!-- 手势控制面板 -->
    <Transition name="fade">
      <div v-if="showGesturePanel" class="gesture-panel ink-card">
        <h3 class="panel-title">手势控制</h3>
        <video ref="videoRef" class="gesture-video" autoplay playsinline muted />
        <div v-if="isLoading" class="gesture-status">正在初始化摄像头...</div>
        <div v-else-if="error" class="gesture-status error">{{ error }}</div>
        <div v-else-if="isInitialized" class="gesture-status success">
          手势: {{ gestureState.type }}
        </div>
        <div class="gesture-tips">
          <p>👆 食指指向 - 控制剑位置</p>
          <p>✊ 握拳 - 蓄力</p>
          <p>🖐️ 张开手掌 - 释放</p>
        </div>
        <button class="close-btn" @click="closeGesturePanel">关闭</button>
      </div>
    </Transition>
    
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

.header-right {
  display: flex;
  gap: 0.5rem;
}

.mode-selector-wrapper {
  position: relative;
  pointer-events: auto;
}

.mode-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.mode-btn:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.mode-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  padding: 0.5rem;
  min-width: 140px;
  z-index: 30;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.mode-option:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.mode-option.active {
  background-color: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}

.mode-icon {
  font-size: 1.25rem;
}

.mode-name {
  font-size: 0.875rem;
  color: #1A1A1A;
}

.mode-option.active .mode-name {
  color: #C41E3A;
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.gesture-panel {
  position: absolute;
  top: 5rem;
  left: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 280px;
}

.panel-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.125rem;
  color: #1A1A1A;
  margin-bottom: 0.75rem;
}

.gesture-video {
  width: 100%;
  height: 180px;
  background: #000;
  border-radius: 4px;
  object-fit: cover;
  transform: scaleX(-1);
}

.gesture-status {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6B6B6B;
  text-align: center;
}

.gesture-status.error {
  color: #C41E3A;
}

.gesture-status.success {
  color: #2E7D32;
}

.gesture-tips {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #6B6B6B;
}

.gesture-tips p {
  margin: 0.25rem 0;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
