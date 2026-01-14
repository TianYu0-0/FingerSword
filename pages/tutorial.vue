<script setup lang="ts">
import GameCanvas from '~/components/game/GameCanvas.vue'
import { useGesture } from '~/composables/useGesture'
import { useGestureActions } from '~/composables/useGestureActions'
import { useTutorial } from '~/composables/useTutorial'

const showHelp = ref(false)
const showModeSelector = ref(false)
const controlMode = ref<'mouse' | 'gesture'>('gesture')  // 默认手势模式
const showGesturePanel = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const {
  isInitialized,
  isLoading,
  error,
  permissionStatus,
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

const {
  state: tutorialState,
  currentStepData,
  progress,
  isComplete,
  targetPosition,
  targetRadius,
  showTarget,
  setControlMode,
  startTutorial,
  handleAction,
  generateTarget,
  skipTutorial
} = useTutorial()

const showSuccessMessage = ref(false)
const successMessage = ref('')

// 控制模式图标
const modeIcons = {
  mouse: '🖱️',
  gesture: '✋'
}

const modeNames = {
  mouse: '鼠标模式',
  gesture: '手势模式'
}

// 手势类型中文映射
const gestureNames: Record<string, string> = {
  pointing: '食指指向',
  fist: '握拳',
  palm: '张开手掌',
  thumbsUp: '竖大拇指',
  twoFingers: '双指并拢',
  none: '无手势'
}

// 动作类型中文映射
const actionNames: Record<string, string> = {
  move: '移动',
  slash: '斩击',
  charge: '蓄力中',
  release: '释放蓄力',
  gather: '聚剑',
  swordRain: '万剑齐发',
  wave: '剑气波',
  thrust: '突刺',
  sweep: '横扫',
  none: '无'
}

// 设置手势动作回调
const setupGestureCallbacks = () => {
  if (!gameCanvasRef.value) {
    console.error('[tutorial] gameCanvasRef 为空，无法设置手势回调')
    return
  }

  setCallbacks({
    onMove: (x: number, y: number) => {
      gameCanvasRef.value?.updatePosition(x, y)
      handleAction('move', { x, y })
    },
    onSlash: () => {
      gameCanvasRef.value?.onMouseDown(new MouseEvent('mousedown', { button: 0 }))
      setTimeout(() => {
        gameCanvasRef.value?.onMouseUp(new MouseEvent('mouseup', { button: 0 }))
      }, 50)
      handleAction('slash')
    },
    onCharge: (chargeLevel: number) => {
      gameCanvasRef.value?.onMouseDown(new MouseEvent('mousedown', { button: 0 }))
      handleAction('charge', { chargeLevel })
    },
    onRelease: (chargeLevel: number) => {
      gameCanvasRef.value?.onMouseUp(new MouseEvent('mouseup', { button: 0 }))
    },
    onGather: () => {
      gameCanvasRef.value?.onRightMouseDown()
    },
    onSwordRain: () => {
      gameCanvasRef.value?.onRightMouseUp()
    },
    onWave: () => {
      gameCanvasRef.value?.wave()
    },
    onThrust: () => {
      gameCanvasRef.value?.onDoubleClick()
      handleAction('thrust')
    },
    onSweep: () => {
      gameCanvasRef.value?.sweep()
    }
  })

  console.log('[tutorial] 手势回调已设置')
}

// 选择控制模式
const selectControlMode = async (mode: 'mouse' | 'gesture') => {
  console.log('[tutorial] selectControlMode:', mode)

  // 如果从手势模式切换出去，停止手势识别
  if (controlMode.value === 'gesture' && mode !== 'gesture') {
    stop()
    showGesturePanel.value = false
    resetGestureActions()
  }

  // 如果切换到手势模式
  if (mode === 'gesture') {
    showGesturePanel.value = true
    await nextTick()
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      if (success) {
        controlMode.value = mode
        setupGestureCallbacks()
      }
    } else {
      console.error('[tutorial] videoRef 为空，无法初始化手势识别')
    }
  } else {
    controlMode.value = mode
  }

  // 更新教学系统的控制模式
  setControlMode(mode)
  showModeSelector.value = false
}

// 关闭手势面板
const closeGesturePanel = () => {
  showGesturePanel.value = false
  if (controlMode.value === 'gesture') {
    controlMode.value = 'mouse'
    setControlMode('mouse')
    stop()
    resetGestureActions()
  }
}

// 手势状态变化时处理动作
watch(gestureState, (newState) => {
  if (controlMode.value === 'gesture' && isInitialized.value) {
    let canvasWidth = window.innerWidth
    let canvasHeight = window.innerHeight

    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      canvasWidth = rect.width
      canvasHeight = rect.height
    }

    processGesture(newState, canvasWidth, canvasHeight)
  }
}, { deep: true })

// 监听步骤完成
watch(() => tutorialState.value.currentStep, (newStep, oldStep) => {
  if (newStep > oldStep && oldStep < tutorialState.value.steps.length) {
    const completedStep = tutorialState.value.steps[oldStep]
    successMessage.value = completedStep.successMessage
    showSuccessMessage.value = true

    setTimeout(() => {
      showSuccessMessage.value = false

      if (!isComplete.value && currentStepData.value?.requiredAction === 'move') {
        generateTarget(window.innerWidth, window.innerHeight)
      }
    }, 1500)
  }
})

const handleStart = () => {
  startTutorial(controlMode.value)
  if (currentStepData.value?.requiredAction === 'move') {
    generateTarget(window.innerWidth, window.innerHeight)
  }
}

const handleComplete = () => {
  navigateTo('/levels')
}

onMounted(() => {
  // 如果默认是手势模式，自动初始化
  if (controlMode.value === 'gesture') {
    showGesturePanel.value = true
    nextTick(async () => {
      if (videoRef.value) {
        const success = await initialize(videoRef.value)
        if (success) {
          setupGestureCallbacks()
        }
      }
    })
  }
})

onUnmounted(() => {
  if (controlMode.value === 'gesture') {
    stop()
  }
})
</script>

<template>
  <div ref="containerRef" class="tutorial-container">
    <GameCanvas
      ref="gameCanvasRef"
      class="canvas-layer"
      :gesture-mode="controlMode === 'gesture'"
      :tutorial-mode="true"
      :target-position="targetPosition"
      :show-target="showTarget"
      :target-radius="targetRadius"
      @sword-move="(pos: { x: number; y: number }) => handleAction('move', pos)"
      @sword-slash="() => handleAction('slash')"
      @sword-charge="(data: { chargeLevel: number }) => handleAction('charge', data)"
      @sword-thrust="() => handleAction('thrust')"
    />

    <!-- 开始界面 -->
    <div v-if="!tutorialState.isActive" class="start-overlay">
      <div class="start-content animate-ink-fade-in">
        <h1 class="ink-title">御剑入门</h1>
        <p class="subtitle">习得基本剑术</p>
        <button class="btn-seal" @click="handleStart">开始修炼</button>
        <NuxtLink to="/" class="skip-link">返回首页</NuxtLink>
      </div>
    </div>

    <!-- 教学步骤提示 -->
    <div v-if="tutorialState.isActive && !isComplete && currentStepData" class="step-panel">
      <div class="step-header">
        <span class="step-number">第 {{ tutorialState.currentStep + 1 }} 式</span>
        <h2 class="step-title">{{ currentStepData.title }}</h2>
      </div>
      <p class="step-description">{{ currentStepData.description }}</p>
      <p class="step-instruction">{{ currentStepData.instruction }}</p>
      <div class="progress-bar-container">
        <div class="progress-fill" :style="{ width: `${progress * 100}%` }"></div>
      </div>
      <button class="skip-btn" @click="skipTutorial">跳过教学</button>
    </div>

    <!-- 成功提示 -->
    <Transition name="fade">
      <div v-if="showSuccessMessage" class="success-message">
        <span class="success-text">{{ successMessage }}</span>
      </div>
    </Transition>

    <!-- 完成界面 -->
    <div v-if="isComplete" class="complete-overlay">
      <div class="complete-content animate-ink-fade-in">
        <h1 class="ink-title">御剑入门</h1>
        <p class="complete-subtitle">恭喜少侠，御剑入门！</p>
        <div class="skills-learned">
          <h3>已习得技能</h3>
          <ul>
            <li v-for="step in tutorialState.steps" :key="step.id">
              <span class="skill-icon">✓</span>
              <span>{{ step.title }}</span>
            </li>
          </ul>
        </div>
        <button class="btn-seal" @click="handleComplete">进入江湖</button>
      </div>
    </div>

    <!-- 顶部导航 -->
    <header class="tutorial-header">
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
                v-for="mode in ['mouse', 'gesture'] as const"
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
            <div class="status-info">
              <div class="status-row">
                <span class="status-label">手势:</span>
                <span class="status-value" :class="gestureState.type !== 'none' ? 'active' : ''">
                  {{ gestureNames[gestureState.type] || gestureState.type }}
                </span>
              </div>
              <div class="status-row">
                <span class="status-label">置信度:</span>
                <span class="status-value">{{ (gestureState.confidence * 100).toFixed(0) }}%</span>
                <div class="confidence-bar">
                  <div class="confidence-fill" :style="{ width: `${gestureState.confidence * 100}%` }"></div>
                </div>
              </div>
              <div class="status-row" v-if="gestureActionState.currentAction !== 'none'">
                <span class="status-label">动作:</span>
                <span class="status-value action">{{ actionNames[gestureActionState.currentAction] || gestureActionState.currentAction }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="gesture-tips">
          <p>👆 食指指向 - 控制剑位置</p>
          <p>✌️ 双指并拢保持3秒 - 聚剑</p>
          <p>✌️ 结束双指并拢 - 万剑齐发</p>
          <p>✊ 握拳保持3秒 - 开始蓄力</p>
          <p>🖐️ 张开手掌 - 释放蓄力</p>
        </div>
        <button class="close-btn" @click="closeGesturePanel">关闭</button>
      </div>
    </Transition>

    <!-- 帮助面板 -->
    <Transition name="fade">
      <div v-if="showHelp" class="help-panel ink-card">
        <h3 class="help-title">操作说明</h3>

        <!-- 鼠标模式操作说明 -->
        <ul v-if="controlMode === 'mouse'" class="help-list">
          <li><span class="highlight">移动鼠标</span> - 控制剑的位置</li>
          <li><span class="highlight">左键单击</span> - 剑气斩击</li>
          <li><span class="highlight">左键长按</span> - 蓄力斩</li>
          <li><span class="highlight">双击</span> - 瞬移突刺</li>
        </ul>

        <!-- 手势模式操作说明 -->
        <ul v-else-if="controlMode === 'gesture'" class="help-list">
          <li><span class="highlight">👆 食指指向</span> - 控制剑位置</li>
          <li><span class="highlight">✌️ 双指并拢保持3秒</span> - 聚剑</li>
          <li><span class="highlight">✌️ 结束双指并拢</span> - 万剑齐发</li>
          <li><span class="highlight">✊ 握拳保持3秒</span> - 开始蓄力</li>
          <li><span class="highlight">🖐️ 张开手掌</span> - 释放蓄力</li>
        </ul>

        <button class="close-btn" @click="showHelp = false">关闭</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tutorial-container {
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

.tutorial-header {
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

/* 开始界面 */
.start-overlay, .complete-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 240, 230, 0.95);
  z-index: 50;
}

.start-content, .complete-content {
  text-align: center;
}

.subtitle, .complete-subtitle {
  color: #6B6B6B;
  font-size: 1.25rem;
  margin: 1rem 0 2rem;
  font-family: 'ZCOOL XiaoWei', serif;
}

.skip-link {
  display: block;
  margin-top: 1.5rem;
  color: #6B6B6B;
  font-size: 0.875rem;
  text-decoration: none;
}

.skip-link:hover {
  color: #1A1A1A;
}

/* 步骤面板 */
.step-panel {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 240, 230, 0.95);
  padding: 1.5rem 2rem;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(26, 26, 26, 0.1);
  text-align: center;
  min-width: 300px;
  z-index: 30;
}

.step-header {
  margin-bottom: 0.75rem;
}

.step-number {
  font-size: 0.875rem;
  color: #C41E3A;
}

.step-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.5rem;
  color: #1A1A1A;
  margin: 0.25rem 0;
}

.step-description {
  color: #6B6B6B;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.step-instruction {
  color: #1A1A1A;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.progress-bar-container {
  width: 100%;
  height: 4px;
  background: rgba(26, 26, 26, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #C41E3A;
  transition: width 0.3s ease;
}

.skip-btn {
  margin-top: 1rem;
  background: none;
  border: none;
  color: #6B6B6B;
  font-size: 0.75rem;
  cursor: pointer;
}

.skip-btn:hover {
  color: #1A1A1A;
}

/* 成功消息 */
.success-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 40;
}

.success-text {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 3rem;
  color: #C41E3A;
  text-shadow: 2px 2px 4px rgba(26, 26, 26, 0.2);
}

/* 完成界面 */
.skills-learned {
  margin: 2rem 0;
  text-align: left;
}

.skills-learned h3 {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.125rem;
  color: #1A1A1A;
  margin-bottom: 1rem;
}

.skills-learned ul {
  list-style: none;
  padding: 0;
}

.skills-learned li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: #1A1A1A;
}

.skill-icon {
  color: #C41E3A;
  font-weight: bold;
}

/* 手势控制面板 */
.gesture-panel {
  position: absolute;
  top: 5rem;
  left: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 280px;
  pointer-events: auto;
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

.status-info {
  margin-top: 0.5rem;
  text-align: left;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  font-size: 0.75rem;
}

.status-label {
  color: #6B6B6B;
  min-width: 50px;
}

.status-value {
  color: #1A1A1A;
  font-weight: 500;
}

.status-value.active {
  color: #2E7D32;
  font-weight: 600;
}

.status-value.action {
  color: #C41E3A;
  font-weight: 600;
  text-transform: uppercase;
}

.confidence-bar {
  flex: 1;
  height: 4px;
  background: rgba(107, 107, 107, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #C41E3A, #2E7D32);
  transition: width 0.2s ease;
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

/* 帮助面板 */
.help-panel {
  position: absolute;
  top: 5rem;
  right: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 16rem;
  pointer-events: auto;
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

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
