<script setup lang="ts">
import GameCanvas from '~/components/game/GameCanvas.vue'
import { useGesture } from '~/composables/useGesture'
import { useGestureActions } from '~/composables/useGestureActions'
import { useTutorial } from '~/composables/useTutorial'

const route = useRoute()
const isTutorialMode = computed(() => route.query.level === 'tutorial')

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
  permissionStatus,
  gestureState,
  checkPermission,
  initialize,
  stop 
} = useGesture()

const {
  state: gestureActionState,
  setCallbacks,
  processGesture,
  reset: resetGestureActions
} = useGestureActions()

// 教程系统
const {
  state: tutorialState,
  currentStepData,
  progress: tutorialProgress,
  isComplete: isTutorialComplete,
  targetPosition,
  showTarget,
  startTutorial,
  skipTutorial,
  handleAction: handleTutorialAction,
  generateTarget
} = useTutorial()

// 教程模式初始化
onMounted(() => {
  if (isTutorialMode.value) {
    startTutorial()
    // 生成第一个目标
    nextTick(() => {
      generateTarget(window.innerWidth, window.innerHeight)
    })
  }
})

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
  console.log('[game] selectControlMode:', mode)
  
  // 如果从手势模式切换出去，停止手势识别
  if (controlMode.value === 'gesture' && mode !== 'gesture') {
    stop()
    showGesturePanel.value = false
    resetGestureActions()
  }
  
  // 如果切换到手势模式
  if (mode === 'gesture') {
    showGesturePanel.value = true
    // 等待 DOM 更新后再初始化
    await nextTick()
    console.log('[game] videoRef.value:', videoRef.value)
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      console.log('[game] initialize result:', success)
      if (success) {
        controlMode.value = mode
      }
    } else {
      console.error('[game] videoRef 为空，无法初始化手势识别')
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
    <GameCanvas 
      ref="gameCanvasRef" 
      class="canvas-layer" 
      :gesture-mode="controlMode === 'gesture'"
      :tutorial-mode="isTutorialMode"
      :target-position="targetPosition"
      :show-target="showTarget"
      @sword-move="(pos: { x: number; y: number }) => handleTutorialAction('move', pos)"
      @sword-slash="() => handleTutorialAction('slash')"
      @sword-charge="(data: { chargeLevel: number }) => handleTutorialAction('charge', data)"
      @sword-thrust="() => handleTutorialAction('thrust')"
    />
    
    <!-- 教程引导面板 -->
    <div v-if="isTutorialMode && tutorialState.isActive && !isTutorialComplete" class="tutorial-overlay">
      <div class="tutorial-panel ink-card">
        <div class="tutorial-progress">
          <div class="progress-bar" :style="{ width: `${tutorialProgress * 100}%` }"></div>
        </div>
        <div class="tutorial-step">
          <h3 class="step-title">{{ currentStepData?.title }}</h3>
          <p class="step-description">{{ currentStepData?.description }}</p>
          <p class="step-instruction">💡 {{ currentStepData?.instruction }}</p>
        </div>
        <button class="skip-btn" @click="skipTutorial">跳过教学</button>
      </div>
    </div>
    
    <!-- 教程完成面板 -->
    <div v-if="isTutorialMode && isTutorialComplete" class="tutorial-complete-overlay">
      <div class="complete-panel ink-card">
        <h2>🎉 恭喜少侠，御剑入门！</h2>
        <p>你已掌握以下技能：</p>
        <ul class="skill-list">
          <li>✅ 御剑初成 - 控制剑移动</li>
          <li>✅ 剑气凌厉 - 释放剑气斩击</li>
          <li>✅ 气贯长虹 - 蓄力强力斩</li>
          <li>✅ 瞬影突刺 - 瞬移突刺</li>
        </ul>
        <NuxtLink to="/levels" class="continue-btn ink-card">进入江湖</NuxtLink>
      </div>
    </div>
    
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
        
        <!-- 权限引导 -->
        <div v-if="permissionStatus === 'denied'" class="permission-guide">
          <div class="permission-icon">🚫</div>
          <p class="permission-title">摄像头权限被拒绝</p>
          <p class="permission-desc">请按以下步骤开启：</p>
          <ol class="permission-steps">
            <li>点击浏览器地址栏左侧的 🔒 图标</li>
            <li>找到"摄像头"选项</li>
            <li>选择"允许"</li>
            <li>刷新页面重试</li>
          </ol>
        </div>
        
        <!-- 摄像头预览 -->
        <div v-else class="camera-preview">
          <video ref="videoRef" class="gesture-video" autoplay playsinline muted />
          <div v-if="isLoading" class="gesture-status loading">
            <span class="loading-spinner"></span>
            正在初始化摄像头...
          </div>
          <div v-else-if="error" class="gesture-status error">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
          <div v-else-if="isInitialized" class="gesture-status success">
            <span class="success-icon">✓</span>
            识别中: {{ gestureState.type === 'none' ? '等待手势' : gestureState.type }}
          </div>
        </div>
        
        <div class="gesture-tips">
          <p>👆 食指指向 - 控制剑位置</p>
          <p>✊ 握拳 - 聚剑蓄力</p>
          <p>🖐️ 张开手掌 - 剑气冲击波</p>
          <p>👌 OK手势 - 瞬移突刺</p>
          <p>👍 竖大拇指 - 剑气护盾</p>
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

/* 权限引导样式 */
.permission-guide {
  text-align: center;
  padding: 1rem 0;
}

.permission-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.permission-title {
  font-size: 1rem;
  font-weight: bold;
  color: #C41E3A;
  margin-bottom: 0.5rem;
}

.permission-desc {
  font-size: 0.875rem;
  color: #6B6B6B;
  margin-bottom: 0.5rem;
}

.permission-steps {
  text-align: left;
  font-size: 0.75rem;
  color: #6B6B6B;
  padding-left: 1.5rem;
  margin: 0;
}

.permission-steps li {
  margin: 0.25rem 0;
}

.camera-preview {
  position: relative;
}

.gesture-status.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(107, 107, 107, 0.3);
  border-top-color: #6B6B6B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .success-icon {
  margin-right: 0.25rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 教程引导样式 */
.tutorial-overlay {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.tutorial-panel {
  padding: 20px 30px;
  text-align: center;
  pointer-events: auto;
  min-width: 300px;
}

.tutorial-progress {
  height: 4px;
  background: rgba(107, 107, 107, 0.2);
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #d4a574, #C41E3A);
  transition: width 0.3s ease;
}

.step-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 24px;
  color: #d4a574;
  margin: 0 0 8px 0;
}

.step-description {
  font-size: 14px;
  color: #999;
  margin: 0 0 12px 0;
}

.step-instruction {
  font-size: 16px;
  color: #f5f5f5;
  margin: 0;
  padding: 12px;
  background: rgba(212, 165, 116, 0.1);
  border-radius: 8px;
}

.skip-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(107, 107, 107, 0.3);
  color: #6B6B6B;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: rgba(196, 30, 58, 0.5);
  color: #C41E3A;
}

/* 教程完成面板 */
.tutorial-complete-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
}

.complete-panel {
  padding: 40px 60px;
  text-align: center;
}

.complete-panel h2 {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 32px;
  color: #d4a574;
  margin: 0 0 16px 0;
}

.complete-panel p {
  color: #999;
  margin: 0 0 16px 0;
}

.skill-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  text-align: left;
}

.skill-list li {
  padding: 8px 0;
  color: #f5f5f5;
  font-size: 14px;
}

.continue-btn {
  display: inline-block;
  padding: 12px 32px;
  font-size: 16px;
  text-decoration: none;
  color: #d4a574;
}
</style>
