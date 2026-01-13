<script setup lang="ts">
import { useSword, type SwordEffect } from '~/composables/useSword'
import { useParticles } from '~/composables/useParticles'
import { useSound } from '~/composables/useSound'
import { useTouch } from '~/composables/useTouch'
import type { Sword, InkTrail } from '~/types/game'

// Props
const props = defineProps<{
  gestureMode?: boolean
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
  updatePosition, 
  update,
  updateGather,
  onMouseDown,
  onMouseUp,
  onDoubleClick,
  onRightMouseDown,
  onRightMouseUp,
  wave,
  spin
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
  updatePosition(event.clientX - rect.left, event.clientY - rect.top)
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

// 绘制水墨背景
const drawBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = CONFIG.paperColor
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  ctx.globalAlpha = 0.03
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * canvasWidth.value
    const y = Math.random() * canvasHeight.value
    const size = Math.random() * 100 + 20
    ctx.fillStyle = CONFIG.inkLightColor
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
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
  
  // 剑身渐变
  const gradient = ctx.createLinearGradient(-CONFIG.swordWidth / 2, 0, CONFIG.swordWidth / 2, 0)
  gradient.addColorStop(0, CONFIG.inkColor)
  gradient.addColorStop(0.3, CONFIG.inkLightColor)
  gradient.addColorStop(0.5, '#9A9A9A')
  gradient.addColorStop(0.7, CONFIG.inkLightColor)
  gradient.addColorStop(1, CONFIG.inkColor)
  
  // 绘制剑身
  ctx.beginPath()
  ctx.moveTo(0, -CONFIG.swordLength / 2)
  ctx.lineTo(CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
  ctx.lineTo(CONFIG.swordWidth / 3, CONFIG.swordLength / 2)
  ctx.lineTo(-CONFIG.swordWidth / 3, CONFIG.swordLength / 2)
  ctx.lineTo(-CONFIG.swordWidth / 2, CONFIG.swordLength / 4)
  ctx.closePath()
  
  ctx.fillStyle = gradient
  ctx.fill()
  ctx.strokeStyle = CONFIG.inkColor
  ctx.lineWidth = 1
  ctx.stroke()
  
  // 剑光
  ctx.beginPath()
  ctx.moveTo(0, -CONFIG.swordLength / 2 + 5)
  ctx.lineTo(1, CONFIG.swordLength / 4)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()
  
  // 剑格
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.ellipse(0, CONFIG.swordLength / 2, CONFIG.swordWidth * 1.2, 3, 0, 0, Math.PI * 2)
  ctx.fillStyle = CONFIG.vermilion
  ctx.fill()
  
  // 剑柄
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(-CONFIG.swordWidth / 4, CONFIG.swordLength / 2, CONFIG.swordWidth / 2, 15)
  
  ctx.restore()
}

// 监听攻击状态变化
watch(() => attackState.value.type, (newType, oldType) => {
  if (newType && !oldType) {
    const pos = sword.value.position
    const dir = attackState.value.direction
    
    if (newType === 'slash') {
      emitInkSplash(pos.x, pos.y, 8, dir)
      playSound('slash')
    } else if (newType === 'charge') {
      emitSparks(pos.x, pos.y, 20)
      emitInkSplash(pos.x, pos.y, 15, dir)
      playSound('release')
    } else if (newType === 'thrust') {
      emitDust(pos.x, pos.y, 8)
      playSound('thrust')
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
  updateParticles(deltaTime)
  
  // 清除并绘制
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  drawBackground(ctx)
  drawTrail(ctx)
  drawParticles(ctx)
  drawEffects(ctx)
  drawChargeIndicator(ctx)
  drawGatherSwords(ctx)
  drawSword(ctx)
  drawComboIndicator(ctx)
  
  animationFrameId = requestAnimationFrame(render)
}

// 绘制聚集的剑
const drawGatherSwords = (ctx: CanvasRenderingContext2D) => {
  if (!gatherState.value.isGathering) return
  
  gatherState.value.swords.forEach(s => {
    ctx.save()
    ctx.translate(s.x, s.y)
    ctx.rotate(s.angle)
    ctx.globalAlpha = 0.7
    
    // 简化的剑形状
    const gradient = ctx.createLinearGradient(-3, -30, 3, 30)
    gradient.addColorStop(0, CONFIG.inkColor)
    gradient.addColorStop(1, CONFIG.inkLightColor)
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, -30)
    ctx.lineTo(3, 0)
    ctx.lineTo(0, 5)
    ctx.lineTo(-3, 0)
    ctx.closePath()
    ctx.fill()
    
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

onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
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
