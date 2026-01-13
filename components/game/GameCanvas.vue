<script setup lang="ts">
import { useSword, type SwordEffect } from '~/composables/useSword'
import { useParticles } from '~/composables/useParticles'
import { useSound } from '~/composables/useSound'
import { useTouch } from '~/composables/useTouch'
import type { Sword, InkTrail } from '~/types/game'

// Props
const props = defineProps<{
  gestureMode?: boolean
  tutorialMode?: boolean
  targetPosition?: { x: number; y: number }
  showTarget?: boolean
}>()

// Emits
const emit = defineEmits<{
  'sword-move': [pos: { x: number; y: number }]
  'sword-slash': []
  'sword-charge': [data: { chargeLevel: number }]
  'sword-thrust': []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 使用 composables
const { 
  sword, 
  trail, 
  effects,
  attackState,
  comboState,
  gatherState,
  shieldState,
  formationState,
  updatePosition, 
  update,
  updateGather,
  updateShield,
  updateFormation,
  onMouseDown,
  onMouseUp,
  onDoubleClick,
  onRightMouseDown,
  onRightMouseUp,
  wave,
  spin,
  shield,
  sweep,
  rotateClockwise,
  rotateCounterClockwise,
  stopRotation,
  toggleFormation
} = useSword()

const {
  emitInkSplash,
  emitSparks,
  emitDust,
  update: updateParticles,
  draw: drawParticles
} = useParticles()

const { play: playSound } = useSound()
const { bindToElement } = useTouch()

// 触摸事件解绑函数
let unbindTouch: (() => void) | null = null

// Canvas 尺寸
const canvasWidth = ref(800)
const canvasHeight = ref(600)

// 动画帧ID
let animationFrameId: number | null = null
let lastTime = 0

// 配置
const CONFIG = {
  inkColor: '#1A1A1A',
  inkLightColor: '#6B6B6B',
  paperColor: '#F5F0E6',
  swordLength: 60,
  swordWidth: 8,
  vermilion: '#C41E3A',
}

// 背景图片
const bgImage = ref<HTMLImageElement | null>(null)
const swordImage = ref<HTMLImageElement | null>(null)

// 加载图片
const loadImages = () => {
  // 加载背景图
  const bg = new Image()
  bg.src = '/images/bg-mountain.jpg'
  bg.onload = () => {
    bgImage.value = bg
  }
  
  // 加载剑图片
  const sw = new Image()
  sw.src = '/images/sword.png'
  sw.onload = () => {
    swordImage.value = sw
  }
}

// 更新 Canvas 尺寸
const updateCanvasSize = () => {
  if (!containerRef.value || !canvasRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  canvasWidth.value = rect.width
  canvasHeight.value = rect.height
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
}

// 鼠标移动处理
const handleMouseMove = (event: MouseEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  updatePosition(x, y)
  
  // 教程模式：发射移动事件
  if (props.tutorialMode) {
    emit('sword-move', { x, y })
  }
}

// 鼠标按下处理（区分左右键）
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    onMouseDown(event)
  } else if (event.button === 2) {
    onRightMouseDown()
  }
}

// 鼠标松开处理（区分左右键）
const handleMouseUp = (event: MouseEvent) => {
  if (event.button === 0) {
    onMouseUp(event)
  } else if (event.button === 2) {
    onRightMouseUp()
  }
}

// 滚轮事件处理
const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  if (event.deltaY < 0) {
    rotateClockwise()
  } else {
    rotateCounterClockwise()
  }
  // 短暂后停止旋转
  setTimeout(() => stopRotation(), 100)
}

// 滚轮点击处理
const handleMiddleClick = (event: MouseEvent) => {
  if (event.button === 1) {
    event.preventDefault()
    toggleFormation()
  }
}

// 绘制视差背景
const drawBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = CONFIG.paperColor
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // 绘制背景图片（视差效果）
  if (bgImage.value) {
    const parallaxX = (sword.value.position.x / canvasWidth.value - 0.5) * 50
    const parallaxY = (sword.value.position.y / canvasHeight.value - 0.5) * 30
    
    const scale = 1.1
    const imgW = canvasWidth.value * scale
    const imgH = canvasHeight.value * scale
    const imgX = (canvasWidth.value - imgW) / 2 - parallaxX
    const imgY = (canvasHeight.value - imgH) / 2 - parallaxY
    
    ctx.globalAlpha = 0.3
    ctx.drawImage(bgImage.value, imgX, imgY, imgW, imgH)
    ctx.globalAlpha = 1
  }
  
  ctx.globalAlpha = 1
}

// 绘制拖尾
const drawTrail = (ctx: CanvasRenderingContext2D) => {
  const trailData = trail.value
  if (trailData.length < 2) return
  
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
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

// 绘制攻击特效
const drawEffects = (ctx: CanvasRenderingContext2D) => {
  effects.value.forEach((effect: SwordEffect) => {
    ctx.save()
    ctx.globalAlpha = effect.opacity
    ctx.translate(effect.position.x, effect.position.y)
    
    if (effect.type === 'slashWave') {
      // 剑气斩击波
      const angle = Math.atan2(effect.direction.y, effect.direction.x)
      ctx.rotate(angle)
      
      ctx.beginPath()
      ctx.moveTo(0, -effect.size / 4)
      ctx.quadraticCurveTo(effect.size, 0, 0, effect.size / 4)
      ctx.strokeStyle = CONFIG.inkColor
      ctx.lineWidth = 3
      ctx.stroke()
      
      // 墨迹飞溅
      for (let i = 0; i < 5; i++) {
        const sx = Math.random() * effect.size * 0.8
        const sy = (Math.random() - 0.5) * effect.size * 0.3
        const r = 2 + Math.random() * 3
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = CONFIG.inkColor
        ctx.fill()
      }
    } else if (effect.type === 'chargeBlast') {
      // 蓄力斩爆发
      ctx.beginPath()
      ctx.arc(0, 0, effect.size, 0, Math.PI * 2)
      ctx.strokeStyle = CONFIG.vermilion
      ctx.lineWidth = 4
      ctx.stroke()
      
      // 内圈
      ctx.beginPath()
      ctx.arc(0, 0, effect.size * 0.6, 0, Math.PI * 2)
      ctx.strokeStyle = CONFIG.inkColor
      ctx.lineWidth = 2
      ctx.stroke()
    } else if (effect.type === 'thrust') {
      // 突刺特效
      const angle = Math.atan2(effect.direction.y, effect.direction.x)
      ctx.rotate(angle)
      
      ctx.beginPath()
      ctx.moveTo(-effect.size * 2, 0)
      ctx.lineTo(0, -effect.size / 3)
      ctx.lineTo(effect.size, 0)
      ctx.lineTo(0, effect.size / 3)
      ctx.closePath()
      ctx.fillStyle = CONFIG.inkLightColor
      ctx.fill()
    } else if (effect.type === 'swordRain') {
      // 万剑齐发特效 - 飞行的剑
      const progress = effect.age / effect.maxAge
      const speed = 800  // 飞行速度
      const distance = progress * speed
      
      // 计算当前位置
      const currentX = effect.direction.x * distance
      const currentY = effect.direction.y * distance
      
      ctx.translate(currentX, currentY)
      
      // 使用图片绘制飞行的剑
      const flyAngle = effect.extra?.angle || Math.atan2(effect.direction.y, effect.direction.x)
      ctx.rotate(flyAngle + Math.PI / 2)
      
      if (swordImage.value) {
        const imgWidth = 16
        const imgHeight = 82  // 保持宽高比
        ctx.drawImage(swordImage.value, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight)
      } else {
        // 备用绘制
        ctx.fillStyle = CONFIG.inkColor
        ctx.beginPath()
        ctx.moveTo(0, -20)
        ctx.lineTo(3, 0)
        ctx.lineTo(0, 6)
        ctx.lineTo(-3, 0)
        ctx.closePath()
        ctx.fill()
      }
      
      // 拖尾效果
      ctx.rotate(-(flyAngle + Math.PI / 2))
      ctx.globalAlpha = 0.3
      for (let i = 1; i <= 3; i++) {
        const tailX = -effect.direction.x * i * 15
        const tailY = -effect.direction.y * i * 15
        ctx.beginPath()
        ctx.arc(tailX, tailY, 3 - i * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = CONFIG.inkLightColor
        ctx.fill()
      }
    }
    
    ctx.restore()
  })
}

// 绘制蓄力指示器
const drawChargeIndicator = (ctx: CanvasRenderingContext2D) => {
  if (!sword.value.isCharging) return
  
  const { x, y } = sword.value.position
  const level = sword.value.chargeLevel
  
  ctx.save()
  ctx.globalAlpha = 0.6
  
  // 蓄力圆环
  ctx.beginPath()
  ctx.arc(x, y, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * level)
  ctx.strokeStyle = level > 0.8 ? CONFIG.vermilion : CONFIG.inkColor
  ctx.lineWidth = 3
  ctx.stroke()
  
  // 蓄力粒子
  if (level > 0.3) {
    for (let i = 0; i < level * 8; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 20
      const px = x + Math.cos(angle) * dist
      const py = y + Math.sin(angle) * dist
      
      ctx.beginPath()
      ctx.arc(px, py, 2, 0, Math.PI * 2)
      ctx.fillStyle = CONFIG.inkColor
      ctx.fill()
    }
  }
  
  ctx.restore()
}

// 绘制剑
const drawSword = (ctx: CanvasRenderingContext2D) => {
  const s = sword.value
  
  ctx.save()
  ctx.translate(s.position.x, s.position.y)
  ctx.rotate(s.angle + Math.PI / 2)
  
  // 蓄力时剑发光
  if (s.isCharging && s.chargeLevel > 0.3) {
    ctx.shadowColor = CONFIG.vermilion
    ctx.shadowBlur = 10 + s.chargeLevel * 20
  }
  
  // 使用图片绘制剑（图片分辨率 235x1212，剑尖向上）
  if (swordImage.value) {
    const imgWidth = 30
    const imgHeight = 155  // 保持宽高比 235:1212 ≈ 1:5.16
    ctx.drawImage(swordImage.value, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight)
  } else {
    // 备用：绘制简单剑形
    const gradient = ctx.createLinearGradient(-CONFIG.swordWidth / 2, 0, CONFIG.swordWidth / 2, 0)
    gradient.addColorStop(0, CONFIG.inkColor)
    gradient.addColorStop(0.5, '#9A9A9A')
    gradient.addColorStop(1, CONFIG.inkColor)
    
    ctx.beginPath()
    ctx.moveTo(0, -CONFIG.swordLength / 2)
    ctx.lineTo(CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
    ctx.lineTo(0, CONFIG.swordLength / 2)
    ctx.lineTo(-CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()
  }
  
  ctx.restore()
}

// 监听攻击状态变化
watch(() => attackState.value.type, (newType, oldType) => {
  if (newType && newType !== oldType) {
    const pos = sword.value.position
    const dir = attackState.value.direction
    
    if (newType === 'slash') {
      emitInkSplash(pos.x, pos.y, 8, dir)
      playSound('slash')
      // 教程模式：发射斩击事件
      if (props.tutorialMode) {
        emit('sword-slash')
      }
    } else if (newType === 'charge') {
      emitSparks(pos.x, pos.y, 20)
      emitInkSplash(pos.x, pos.y, 15, dir)
      playSound('release')
      // 教程模式：发射蓄力事件
      if (props.tutorialMode) {
        emit('sword-charge', { chargeLevel: attackState.value.chargeLevel })
      }
    } else if (newType === 'thrust') {
      emitDust(pos.x, pos.y, 8)
      playSound('thrust')
      // 教程模式：发射突刺事件
      if (props.tutorialMode) {
        emit('sword-thrust')
      }
    }
  }
})

// 主渲染循环
const render = (timestamp: number) => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const deltaTime = lastTime ? timestamp - lastTime : 16
  lastTime = timestamp
  
  // 更新游戏状态
  update(deltaTime)
  updateGather()
  updateShield()
  updateFormation()
  updateParticles(deltaTime)
  
  // 清除并绘制
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  drawBackground(ctx)
  drawTrail(ctx)
  drawParticles(ctx)
  drawEffects(ctx)
  drawChargeIndicator(ctx)
  drawGatherSwords(ctx)
  drawShield(ctx)
  drawTutorialTarget(ctx)  // 教程目标
  drawSword(ctx)
  drawComboIndicator(ctx)
  
  animationFrameId = requestAnimationFrame(render)
}

// 绘制教程目标
const drawTutorialTarget = (ctx: CanvasRenderingContext2D) => {
  if (!props.tutorialMode || !props.showTarget || !props.targetPosition) return
  
  const { x, y } = props.targetPosition
  const radius = 50
  const time = Date.now() * 0.003
  
  ctx.save()
  
  // 外圈脉冲
  const pulseRadius = radius + Math.sin(time) * 10
  ctx.beginPath()
  ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()
  
  // 内圈
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.8)'
  ctx.lineWidth = 3
  ctx.stroke()
  
  // 中心点
  ctx.beginPath()
  ctx.arc(x, y, 5, 0, Math.PI * 2)
  ctx.fillStyle = CONFIG.vermilion
  ctx.fill()
  
  // 十字准星
  ctx.strokeStyle = 'rgba(212, 165, 116, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x - radius, y)
  ctx.lineTo(x - 15, y)
  ctx.moveTo(x + 15, y)
  ctx.lineTo(x + radius, y)
  ctx.moveTo(x, y - radius)
  ctx.lineTo(x, y - 15)
  ctx.moveTo(x, y + 15)
  ctx.lineTo(x, y + radius)
  ctx.stroke()
  
  ctx.restore()
}

// 绘制护盾
const drawShield = (ctx: CanvasRenderingContext2D) => {
  if (!shieldState.value.isActive) return
  
  const elapsed = Date.now() - shieldState.value.startTime
  const progress = elapsed / shieldState.value.duration
  const alpha = 0.6 * (1 - progress)
  
  ctx.save()
  ctx.globalAlpha = alpha
  
  // 护盾外圈
  ctx.strokeStyle = CONFIG.vermilion
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(sword.value.position.x, sword.value.position.y, 70, 0, Math.PI * 2)
  ctx.stroke()
  
  // 护盾内圈
  ctx.strokeStyle = CONFIG.inkColor
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sword.value.position.x, sword.value.position.y, 50, 0, Math.PI * 2)
  ctx.stroke()
  
  // 护盾填充
  const gradient = ctx.createRadialGradient(
    sword.value.position.x, sword.value.position.y, 0,
    sword.value.position.x, sword.value.position.y, 70
  )
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.7, `rgba(196, 30, 58, ${alpha * 0.2})`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(sword.value.position.x, sword.value.position.y, 70, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.restore()
}

// 绘制聚集的剑
const drawGatherSwords = (ctx: CanvasRenderingContext2D) => {
  if (!gatherState.value.isGathering) return
  
  gatherState.value.swords.forEach(s => {
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)
    ctx.globalAlpha = 0.8
    
    // 使用图片绘制剑（图片分辨率 235x1212，剑尖向上）
    if (swordImage.value) {
      const imgWidth = 20
      const imgHeight = 103  // 保持宽高比
      ctx.drawImage(swordImage.value, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight)
    } else {
      // 备用绘制
      ctx.fillStyle = CONFIG.inkColor
      ctx.beginPath()
      ctx.moveTo(0, -25)
      ctx.lineTo(4, 0)
      ctx.lineTo(0, 8)
      ctx.lineTo(-4, 0)
      ctx.closePath()
      ctx.fill()
    }
    
    ctx.restore()
  })
}

// 绘制连击指示器
const drawComboIndicator = (ctx: CanvasRenderingContext2D) => {
  if (comboState.value.count < 2) return
  
  const now = Date.now()
  const timeSinceLastAttack = now - comboState.value.lastAttackTime
  if (timeSinceLastAttack > 800) return
  
  ctx.save()
  ctx.font = 'bold 24px "ZCOOL XiaoWei", serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = CONFIG.vermilion
  ctx.globalAlpha = 1 - timeSinceLastAttack / 800
  ctx.fillText(`${comboState.value.count} 连击!`, canvasWidth.value / 2, 50)
  ctx.restore()
}

// 全局右键松开监听（确保万剑齐发能触发）
const handleGlobalMouseUp = (event: MouseEvent) => {
  if (event.button === 2) {
    onRightMouseUp()
  }
}

onMounted(() => {
  loadImages()
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
  window.addEventListener('mouseup', handleGlobalMouseUp)
  animationFrameId = requestAnimationFrame(render)
  
  // 绑定触摸事件
  if (containerRef.value) {
    unbindTouch = bindToElement(containerRef.value, {
      onStart: (data) => {
        if (data) {
          updatePosition(data.position.x, data.position.y)
          if (data.isDoubleTap) {
            // 双击触发突刺
            onDoubleClick({ offsetX: data.position.x, offsetY: data.position.y } as MouseEvent)
          } else {
            onMouseDown({ button: 0 } as MouseEvent)
          }
        }
      },
      onMove: (data) => {
        if (data) {
          updatePosition(data.position.x, data.position.y)
        }
      },
      onEnd: (data) => {
        if (data) {
          onMouseUp({ button: 0 } as MouseEvent)
        }
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
  window.removeEventListener('mouseup', handleGlobalMouseUp)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  if (unbindTouch) unbindTouch()
})
</script>

<template>
  <div 
    ref="containerRef" 
    class="game-canvas-container"
    @mousemove="handleMouseMove"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @dblclick="onDoubleClick"
    @wheel.prevent="handleWheel"
    @auxclick="handleMiddleClick"
    @contextmenu.prevent
  >
    <canvas ref="canvasRef" :width="canvasWidth" :height="canvasHeight" />
  </div>
</template>

<style scoped>
.game-canvas-container {
  width: 100%;
  height: 100%;
  cursor: none;
}
canvas {
  display: block;
}
</style>
