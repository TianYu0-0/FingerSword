export type Particle = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
  type: 'ink' | 'spark' | 'dust'
}

export type ParticleEmitter = {
  x: number
  y: number
  rate: number
  spread: number
  speed: number
  color: string
  type: Particle['type']
}

export function useParticles() {
  const particles = ref<Particle[]>([])
  const maxParticles = 200

  const generateId = () => Math.random().toString(36).substring(2, 9)

  // 创建单个粒子
  const createParticle = (
    x: number, 
    y: number, 
    options: Partial<Particle> = {}
  ): Particle => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1 + Math.random() * 3
    
    return {
      id: generateId(),
      x,
      y,
      vx: Math.cos(angle) * speed + (options.vx || 0),
      vy: Math.sin(angle) * speed + (options.vy || 0),
      size: options.size || 2 + Math.random() * 4,
      opacity: options.opacity || 1,
      color: options.color || '#1A1A1A',
      life: 0,
      maxLife: options.maxLife || 500 + Math.random() * 500,
      type: options.type || 'ink'
    }
  }

  // 墨迹飞溅效果
  const emitInkSplash = (x: number, y: number, count = 10, direction?: { x: number; y: number }) => {
    for (let i = 0; i < count; i++) {
      const angle = direction 
        ? Math.atan2(direction.y, direction.x) + (Math.random() - 0.5) * Math.PI * 0.5
        : Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      
      particles.value.push({
        id: generateId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 6,
        opacity: 0.6 + Math.random() * 0.4,
        color: Math.random() > 0.3 ? '#1A1A1A' : '#6B6B6B',
        life: 0,
        maxLife: 300 + Math.random() * 400,
        type: 'ink'
      })
    }
    
    // 限制粒子数量
    if (particles.value.length > maxParticles) {
      particles.value = particles.value.slice(-maxParticles)
    }
  }

  // 火花效果（蓄力斩）
  const emitSparks = (x: number, y: number, count = 15) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6
      
      particles.value.push({
        id: generateId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 3,
        opacity: 1,
        color: Math.random() > 0.5 ? '#C41E3A' : '#FF6B35',
        life: 0,
        maxLife: 200 + Math.random() * 300,
        type: 'spark'
      })
    }
  }

  // 尘埃效果
  const emitDust = (x: number, y: number, count = 5) => {
    for (let i = 0; i < count; i++) {
      particles.value.push({
        id: generateId(),
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        size: 3 + Math.random() * 5,
        opacity: 0.3,
        color: '#6B6B6B',
        life: 0,
        maxLife: 800 + Math.random() * 400,
        type: 'dust'
      })
    }
  }

  // 更新粒子
  const update = (deltaTime: number) => {
    const dt = deltaTime / 16
    
    particles.value = particles.value
      .map(p => {
        const progress = p.life / p.maxLife
        
        // 根据类型应用不同物理
        let gravity = 0
        let friction = 0.98
        
        if (p.type === 'ink') {
          gravity = 0.1
          friction = 0.96
        } else if (p.type === 'spark') {
          gravity = 0.05
          friction = 0.99
        } else if (p.type === 'dust') {
          gravity = -0.02 // 向上飘
          friction = 0.99
        }
        
        return {
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          vx: p.vx * friction,
          vy: p.vy * friction + gravity,
          opacity: p.opacity * (1 - progress * 0.5),
          size: p.type === 'spark' ? p.size * (1 - progress * 0.3) : p.size,
          life: p.life + deltaTime
        }
      })
      .filter(p => p.life < p.maxLife && p.opacity > 0.01)
  }

  // 绘制粒子
  const draw = (ctx: CanvasRenderingContext2D) => {
    particles.value.forEach(p => {
      ctx.save()
      ctx.globalAlpha = p.opacity
      
      if (p.type === 'ink') {
        // 墨迹粒子 - 不规则形状
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.7, Math.random() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'spark') {
        // 火花粒子 - 发光点
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, p.color)
        gradient.addColorStop(0.5, p.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'dust') {
        // 尘埃粒子 - 模糊圆
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      
      ctx.restore()
    })
  }

  // 清空粒子
  const clear = () => {
    particles.value = []
  }

  return {
    particles: readonly(particles),
    emitInkSplash,
    emitSparks,
    emitDust,
    update,
    draw,
    clear
  }
}
