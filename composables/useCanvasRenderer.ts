import type { Sword, InkTrail, Vector2D } from '~/types/game'
import type { SwordEffect } from './useSword'

export type RendererConfig = {
  inkColor: string
  inkLightColor: string
  paperColor: string
  swordLength: number
  swordWidth: number
  vermilion: string
}

const DEFAULT_CONFIG: RendererConfig = {
  inkColor: '#1A1A1A',
  inkLightColor: '#6B6B6B',
  paperColor: '#F5F0E6',
  swordLength: 60,
  swordWidth: 8,
  vermilion: '#C41E3A',
}

export function useCanvasRenderer(config: Partial<RendererConfig> = {}) {
  const CONFIG = { ...DEFAULT_CONFIG, ...config }

  // 绘制水墨背景
  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = CONFIG.paperColor
    ctx.fillRect(0, 0, width, height)
    
    ctx.globalAlpha = 0.03
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = Math.random() * 100 + 20
      ctx.fillStyle = CONFIG.inkLightColor
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // 绘制拖尾
  const drawTrail = (ctx: CanvasRenderingContext2D, trail: InkTrail[]) => {
    if (trail.length < 2) return
    
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    for (let i = 1; i < trail.length; i++) {
      const t = trail[i]
      const prev = trail[i - 1]
      
      ctx.beginPath()
      ctx.strokeStyle = CONFIG.inkColor
      ctx.globalAlpha = t.opacity * 0.6
      ctx.lineWidth = t.width
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(t.x, t.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // 绘制剑
  const drawSword = (ctx: CanvasRenderingContext2D, sword: Sword) => {
    ctx.save()
    ctx.translate(sword.position.x, sword.position.y)
    ctx.rotate(sword.angle)

    // 剑身
    const gradient = ctx.createLinearGradient(0, -CONFIG.swordLength, 0, 0)
    gradient.addColorStop(0, CONFIG.inkColor)
    gradient.addColorStop(0.7, CONFIG.inkLightColor)
    gradient.addColorStop(1, CONFIG.paperColor)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(0, -CONFIG.swordLength)
    ctx.lineTo(-CONFIG.swordWidth / 2, -CONFIG.swordLength + 15)
    ctx.lineTo(-CONFIG.swordWidth / 2, 0)
    ctx.lineTo(CONFIG.swordWidth / 2, 0)
    ctx.lineTo(CONFIG.swordWidth / 2, -CONFIG.swordLength + 15)
    ctx.closePath()
    ctx.fill()

    // 剑柄
    ctx.fillStyle = CONFIG.vermilion
    ctx.fillRect(-CONFIG.swordWidth / 2 - 2, 0, CONFIG.swordWidth + 4, 15)

    // 蓄力指示器
    if (sword.isCharging && sword.chargeLevel > 0) {
      ctx.strokeStyle = CONFIG.vermilion
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.5 + sword.chargeLevel * 0.5
      ctx.beginPath()
      ctx.arc(0, -CONFIG.swordLength / 2, 20 + sword.chargeLevel * 30, 0, Math.PI * 2 * sword.chargeLevel)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    ctx.restore()
  }

  // 绘制攻击特效
  const drawEffects = (ctx: CanvasRenderingContext2D, effects: SwordEffect[]) => {
    effects.forEach(effect => {
      ctx.save()
      ctx.globalAlpha = effect.opacity

      if (effect.type === 'slashWave') {
        // 剑气波
        ctx.strokeStyle = CONFIG.inkColor
        ctx.lineWidth = 3
        ctx.beginPath()
        const startAngle = Math.atan2(effect.direction.y, effect.direction.x) - Math.PI / 4
        const endAngle = startAngle + Math.PI / 2
        ctx.arc(effect.position.x, effect.position.y, effect.size, startAngle, endAngle)
        ctx.stroke()
      } else if (effect.type === 'chargeBlast') {
        // 蓄力爆发
        const gradient = ctx.createRadialGradient(
          effect.position.x, effect.position.y, 0,
          effect.position.x, effect.position.y, effect.size
        )
        gradient.addColorStop(0, CONFIG.vermilion)
        gradient.addColorStop(0.5, CONFIG.inkColor)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(effect.position.x, effect.position.y, effect.size, 0, Math.PI * 2)
        ctx.fill()
      } else if (effect.type === 'thrust') {
        // 突刺线
        ctx.strokeStyle = CONFIG.inkColor
        ctx.lineWidth = 4
        ctx.setLineDash([10, 5])
        ctx.beginPath()
        ctx.moveTo(
          effect.position.x - effect.direction.x * 100,
          effect.position.y - effect.direction.y * 100
        )
        ctx.lineTo(effect.position.x, effect.position.y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.restore()
    })
  }

  // 绘制蓄力指示器（独立版本）
  const drawChargeIndicator = (ctx: CanvasRenderingContext2D, sword: Sword) => {
    if (!sword.isCharging || sword.chargeLevel <= 0) return

    ctx.save()
    ctx.strokeStyle = CONFIG.vermilion
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.3 + sword.chargeLevel * 0.7

    const radius = 40 + sword.chargeLevel * 40
    ctx.beginPath()
    ctx.arc(sword.position.x, sword.position.y, radius, 0, Math.PI * 2 * sword.chargeLevel)
    ctx.stroke()

    // 蓄力满时的光环
    if (sword.chargeLevel >= 1) {
      ctx.globalAlpha = 0.2
      ctx.fillStyle = CONFIG.vermilion
      ctx.beginPath()
      ctx.arc(sword.position.x, sword.position.y, radius + 10, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  // 绘制目标指示器（用于教学）
  const drawTarget = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, pulse = true) => {
    ctx.save()
    
    const time = Date.now() / 1000
    const pulseScale = pulse ? 1 + Math.sin(time * 3) * 0.1 : 1
    const currentRadius = radius * pulseScale

    // 外圈
    ctx.strokeStyle = CONFIG.vermilion
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2)
    ctx.stroke()

    // 内圈
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(x, y, currentRadius * 0.6, 0, Math.PI * 2)
    ctx.stroke()

    // 中心点
    ctx.fillStyle = CONFIG.vermilion
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }

  return {
    CONFIG,
    drawBackground,
    drawTrail,
    drawSword,
    drawEffects,
    drawChargeIndicator,
    drawTarget
  }
}
