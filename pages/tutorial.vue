<script setup lang="ts">
import { useTutorial } from '~/composables/useTutorial'
import { useSword } from '~/composables/useSword'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const { 
  sword, trail, effects, attackState,
  updatePosition, update, onMouseDown, onMouseUp, onDoubleClick
} = useSword()

const {
  state: tutorialState,
  currentStepData,
  progress,
  isComplete,
  targetPosition,
  targetRadius,
  showTarget,
  startTutorial,
  handleAction,
  generateTarget,
  skipTutorial
} = useTutorial()

const canvasWidth = ref(800)
const canvasHeight = ref(600)
let animationFrameId: number | null = null
let lastTime = 0

const showSuccessMessage = ref(false)
const successMessage = ref('')

const CONFIG = {
  inkColor: '#1A1A1A',
  inkLightColor: '#6B6B6B',
  paperColor: '#F5F0E6',
  vermilion: '#C41E3A',
  swordLength: 60,
  swordWidth: 8,
}

const updateCanvasSize = () => {
  if (!containerRef.value || !canvasRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  canvasWidth.value = rect.width
  canvasHeight.value = rect.height
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
}

const handleMouseMove = (event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  updatePosition(x, y)
  
  if (currentStepData.value?.requiredAction === 'move') {
    handleAction('move', { x: sword.value.position.x, y: sword.value.position.y })
  }
}

const handleMouseDown = (e: MouseEvent) => {
  onMouseDown(e)
}

const handleMouseUp = (e: MouseEvent) => {
  onMouseUp(e)
  
  if (attackState.value.type === 'slash') {
    handleAction('slash')
  } else if (attackState.value.type === 'charge') {
    handleAction('charge', { chargeLevel: sword.value.chargeLevel })
  }
}

const handleDoubleClick = (e: MouseEvent) => {
  onDoubleClick(e)
  handleAction('thrust')
}

// 监听步骤完成
watch(() => tutorialState.value.currentStep, (newStep, oldStep) => {
  if (newStep > oldStep && oldStep < tutorialState.value.steps.length) {
    const completedStep = tutorialState.value.steps[oldStep]
    successMessage.value = completedStep.successMessage
    showSuccessMessage.value = true
    
    setTimeout(() => {
      showSuccessMessage.value = false
      
      if (!isComplete.value && currentStepData.value?.requiredAction === 'move') {
        generateTarget(canvasWidth.value, canvasHeight.value)
      }
    }, 1500)
  }
})

// 绘制函数
const drawBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = CONFIG.paperColor
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
}

const drawTarget = (ctx: CanvasRenderingContext2D) => {
  if (!showTarget.value) return
  
  const { x, y } = targetPosition.value
  const r = targetRadius.value
  
  ctx.save()
  ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.2
  
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = CONFIG.vermilion
  ctx.lineWidth = 3
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2)
  ctx.strokeStyle = CONFIG.vermilion
  ctx.lineWidth = 2
  ctx.stroke()
  
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fillStyle = CONFIG.vermilion
  ctx.fill()
  
  ctx.restore()
}

const drawTrail = (ctx: CanvasRenderingContext2D) => {
  const trailData = trail.value
  if (trailData.length < 2) return
  
  ctx.lineCap = 'round'
  for (let i = 1; i < trailData.length; i++) {
    const t = trailData[i]
    const prev = trailData[i - 1]
    ctx.beginPath()
    ctx.strokeStyle = CONFIG.inkColor
    ctx.globalAlpha = t.opacity * 0.5
    ctx.lineWidth = t.width
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(t.x, t.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

const drawSword = (ctx: CanvasRenderingContext2D) => {
  const s = sword.value
  ctx.save()
  ctx.translate(s.position.x, s.position.y)
  ctx.rotate(s.angle + Math.PI / 2)
  
  if (s.isCharging && s.chargeLevel > 0.3) {
    ctx.shadowColor = CONFIG.vermilion
    ctx.shadowBlur = 10 + s.chargeLevel * 20
  }
  
  const gradient = ctx.createLinearGradient(-CONFIG.swordWidth / 2, 0, CONFIG.swordWidth / 2, 0)
  gradient.addColorStop(0, CONFIG.inkColor)
  gradient.addColorStop(0.5, '#9A9A9A')
  gradient.addColorStop(1, CONFIG.inkColor)
  
  ctx.beginPath()
  ctx.moveTo(0, -CONFIG.swordLength / 2)
  ctx.lineTo(CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
  ctx.lineTo(CONFIG.swordWidth / 3, CONFIG.swordLength / 2)
  ctx.lineTo(-CONFIG.swordWidth / 3, CONFIG.swordLength / 2)
  ctx.lineTo(-CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()
  
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.ellipse(0, CONFIG.swordLength / 2, CONFIG.swordWidth * 1.2, 3, 0, 0, Math.PI * 2)
  ctx.fillStyle = CONFIG.vermilion
  ctx.fill()
  
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(-CONFIG.swordWidth / 4, CONFIG.swordLength / 2, CONFIG.swordWidth / 2, 15)
  ctx.restore()
}

const drawChargeIndicator = (ctx: CanvasRenderingContext2D) => {
  if (!sword.value.isCharging) return
  const { x, y } = sword.value.position
  const level = sword.value.chargeLevel
  
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * level)
  ctx.strokeStyle = level > 0.8 ? CONFIG.vermilion : CONFIG.inkColor
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}

const render = (timestamp: number) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const deltaTime = lastTime ? timestamp - lastTime : 16
  lastTime = timestamp
  
  update(deltaTime)
  
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  drawBackground(ctx)
  drawTarget(ctx)
  drawTrail(ctx)
  drawChargeIndicator(ctx)
  drawSword(ctx)
  
  animationFrameId = requestAnimationFrame(render)
}

const handleStart = () => {
  startTutorial()
  if (currentStepData.value?.requiredAction === 'move') {
    generateTarget(canvasWidth.value, canvasHeight.value)
  }
}

const handleComplete = () => {
  navigateTo('/game')
}

onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
  animationFrameId = requestAnimationFrame(render)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
})
</script>

<template>
  <div class="tutorial-container">
    <div 
      ref="containerRef" 
      class="canvas-wrapper"
      @mousemove="handleMouseMove"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent
    >
      <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" />
    </div>

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
      <div class="progress-bar">
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
    </header>
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

.canvas-wrapper {
  width: 100%;
  height: 100%;
  cursor: none;
}

canvas {
  display: block;
}

.tutorial-header {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 100;
}

.back-btn {
  padding: 0.5rem 1rem;
  text-decoration: none;
  color: #1A1A1A;
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

.progress-bar {
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

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
