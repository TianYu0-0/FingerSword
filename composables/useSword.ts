import type { Vector2D, Sword, InkTrail } from '~/types/game'

export type AttackType = 'slash' | 'charge' | 'thrust' | 'wave' | 'swordRain'

export type AttackState = {
  isAttacking: boolean
  type: AttackType | null
  chargeLevel: number // 0-1，蓄力程度
  startTime: number
  direction: Vector2D
}

export type SwordEffect = {
  id: string
  type: 'slashWave' | 'chargeBlast' | 'thrust' | 'impact'
  position: Vector2D
  direction: Vector2D
  size: number
  opacity: number
  age: number
  maxAge: number
}

export function useSword() {
  const sword = ref<Sword>({
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    angle: -Math.PI / 4,
    length: 80,
    isCharging: false,
    chargeLevel: 0
  })

  const trail = ref<InkTrail[]>([])
  const effects = ref<SwordEffect[]>([])
  
  const attackState = ref<AttackState>({
    isAttacking: false,
    type: null,
    chargeLevel: 0,
    startTime: 0,
    direction: { x: 0, y: -1 }
  })

  const targetPosition = ref<Vector2D>({ x: 400, y: 300 })
  const isMouseDown = ref(false)
  const mouseDownTime = ref(0)
  
  // 配置参数
  const config = {
    followSpeed: 0.15,
    trailMaxLength: 30,
    trailFadeSpeed: 0.03,
    chargeTime: 1500, // 蓄力满需要的时间（毫秒）
    slashDuration: 200,
    chargeDuration: 400,
    thrustDuration: 150
  }

  // 更新剑的位置
  const updatePosition = (mouseX: number, mouseY: number) => {
    targetPosition.value = { x: mouseX, y: mouseY }
  }

  // 物理更新
  const update = (deltaTime: number) => {
    const dt = deltaTime / 16 // 归一化到 60fps
    
    // 平滑跟随鼠标
    const dx = targetPosition.value.x - sword.value.position.x
    const dy = targetPosition.value.y - sword.value.position.y
    
    sword.value.velocity.x = dx * config.followSpeed
    sword.value.velocity.y = dy * config.followSpeed
    
    sword.value.position.x += sword.value.velocity.x * dt
    sword.value.position.y += sword.value.velocity.y * dt

    // 根据移动方向更新剑的角度
    const speed = Math.hypot(sword.value.velocity.x, sword.value.velocity.y)
    if (speed > 2) {
      const targetAngle = Math.atan2(sword.value.velocity.y, sword.value.velocity.x) - Math.PI / 2
      sword.value.angle += (targetAngle - sword.value.angle) * 0.1
    }

    // 更新蓄力状态
    if (isMouseDown.value && !attackState.value.isAttacking) {
      const holdTime = Date.now() - mouseDownTime.value
      sword.value.chargeLevel = Math.min(1, holdTime / config.chargeTime)
      sword.value.isCharging = holdTime > 200 // 200ms 后开始蓄力
    }

    // 添加拖尾
    if (speed > 1) {
      trail.value.unshift({
        x: sword.value.position.x,
        y: sword.value.position.y,
        opacity: Math.min(1, speed / 10),
        width: 2 + speed / 5
      })
    }

    // 更新拖尾
    trail.value = trail.value
      .map(t => ({ ...t, opacity: t.opacity - config.trailFadeSpeed }))
      .filter(t => t.opacity > 0)
      .slice(0, config.trailMaxLength)

    // 更新特效
    effects.value = effects.value
      .map(e => ({
        ...e,
        age: e.age + deltaTime,
        opacity: 1 - e.age / e.maxAge,
        size: e.size + (e.type === 'slashWave' ? 2 : e.type === 'chargeBlast' ? 5 : 0)
      }))
      .filter(e => e.age < e.maxAge)

    // 更新攻击状态
    if (attackState.value.isAttacking) {
      const elapsed = Date.now() - attackState.value.startTime
      const duration = attackState.value.type === 'charge' 
        ? config.chargeDuration 
        : attackState.value.type === 'thrust'
          ? config.thrustDuration
          : config.slashDuration

      if (elapsed >= duration) {
        attackState.value.isAttacking = false
        attackState.value.type = null
      }
    }
  }

  // 生成唯一 ID
  const generateId = () => Math.random().toString(36).substring(2, 9)

  // 剑气斩击
  const slash = () => {
    if (attackState.value.isAttacking) return

    attackState.value = {
      isAttacking: true,
      type: 'slash',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: {
        x: Math.cos(sword.value.angle + Math.PI / 2),
        y: Math.sin(sword.value.angle + Math.PI / 2)
      }
    }

    // 添加斩击特效
    effects.value.push({
      id: generateId(),
      type: 'slashWave',
      position: { ...sword.value.position },
      direction: { ...attackState.value.direction },
      size: 50,
      opacity: 1,
      age: 0,
      maxAge: 300
    })
  }

  // 蓄力斩
  const chargeSlash = () => {
    if (attackState.value.isAttacking) return
    if (sword.value.chargeLevel < 0.3) {
      slash() // 蓄力不足时普通斩击
      return
    }

    const power = sword.value.chargeLevel

    attackState.value = {
      isAttacking: true,
      type: 'charge',
      chargeLevel: power,
      startTime: Date.now(),
      direction: {
        x: Math.cos(sword.value.angle + Math.PI / 2),
        y: Math.sin(sword.value.angle + Math.PI / 2)
      }
    }

    // 添加蓄力斩特效
    effects.value.push({
      id: generateId(),
      type: 'chargeBlast',
      position: { ...sword.value.position },
      direction: { ...attackState.value.direction },
      size: 80 * power,
      opacity: 1,
      age: 0,
      maxAge: 500
    })

    sword.value.isCharging = false
    sword.value.chargeLevel = 0
  }

  // 瞬移突刺
  const thrust = (targetX: number, targetY: number) => {
    if (attackState.value.isAttacking) return

    const dx = targetX - sword.value.position.x
    const dy = targetY - sword.value.position.y
    const dist = Math.hypot(dx, dy)

    attackState.value = {
      isAttacking: true,
      type: 'thrust',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: { x: dx / dist, y: dy / dist }
    }

    // 快速移动到目标位置
    sword.value.position.x = targetX
    sword.value.position.y = targetY
    targetPosition.value = { x: targetX, y: targetY }

    // 添加突刺特效
    effects.value.push({
      id: generateId(),
      type: 'thrust',
      position: { ...sword.value.position },
      direction: { ...attackState.value.direction },
      size: 30,
      opacity: 1,
      age: 0,
      maxAge: 200
    })
  }

  // 鼠标按下
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) { // 左键
      isMouseDown.value = true
      mouseDownTime.value = Date.now()
    }
  }

  // 鼠标松开
  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) { // 左键
      const holdTime = Date.now() - mouseDownTime.value
      
      if (holdTime > 200 && sword.value.isCharging) {
        chargeSlash()
      } else if (holdTime < 200) {
        slash()
      }

      isMouseDown.value = false
      sword.value.isCharging = false
      sword.value.chargeLevel = 0
    }
  }

  // 双击
  const onDoubleClick = (e: MouseEvent) => {
    thrust(e.offsetX, e.offsetY)
  }

  return {
    sword: readonly(sword),
    trail: readonly(trail),
    effects: readonly(effects),
    attackState: readonly(attackState),
    updatePosition,
    update,
    slash,
    chargeSlash,
    thrust,
    onMouseDown,
    onMouseUp,
    onDoubleClick
  }
}
