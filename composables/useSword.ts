import type { Vector2D, Sword, InkTrail } from '~/types/game'

export type AttackType = 'slash' | 'charge' | 'thrust' | 'wave' | 'swordRain' | 'shield' | 'sweep'

export type AttackState = {
  isAttacking: boolean
  type: AttackType | null
  chargeLevel: number // 0-1，蓄力程度
  startTime: number
  direction: Vector2D
}

export type SwordEffect = {
  id: string
  type: 'slashWave' | 'chargeBlast' | 'thrust' | 'impact' | 'wave' | 'swordRain' | 'spin' | 'comboHit'
  position: Vector2D
  direction: Vector2D
  size: number
  opacity: number
  age: number
  maxAge: number
  extra?: any // 额外数据
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
  
  // 连击系统
  const comboState = ref({
    count: 0,
    lastAttackTime: 0,
    comboWindow: 800 // 连击窗口时间（毫秒）
  })

  // 右键聚剑状态
  const gatherState = ref({
    isGathering: false,
    swords: [] as Array<{ x: number; y: number; angle: number; id: string }>,
    startTime: 0
  })

  // 护盾状态
  const shieldState = ref({
    isActive: false,
    startTime: 0,
    duration: 2000 // 护盾持续时间
  })

  // 剑阵旋转状态
  const formationState = ref({
    rotation: 0,
    rotationSpeed: 0,
    isExpanded: false
  })

  // 配置参数
  const config = {
    followSpeed: 0.15,
    trailMaxLength: 30,
    trailFadeSpeed: 0.03,
    chargeTime: 1500, // 蓄力满需要的时间（毫秒）
    slashDuration: 200,
    chargeDuration: 400,
    thrustDuration: 150,
    waveDuration: 500,
    swordRainDuration: 800,
    spinDuration: 600
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

  // 瞬移突刺（沿当前方向快速刺一下再返回）
  const thrust = (targetX: number, targetY: number) => {
    console.log('[useSword] thrust:', targetX, targetY, 'isAttacking:', attackState.value.isAttacking)
    // 突刺可以打断普通斩击
    if (attackState.value.isAttacking && attackState.value.type !== 'slash') {
      console.log('[useSword] thrust 被阻止：正在进行其他攻击')
      return
    }

    // 使用剑当前的方向（基于剑的角度）
    const direction = {
      x: Math.cos(sword.value.angle),
      y: Math.sin(sword.value.angle)
    }
    
    // 保存原始位置
    const originalX = sword.value.position.x
    const originalY = sword.value.position.y
    const thrustDistance = 150  // 突刺距离

    attackState.value = {
      isAttacking: true,
      type: 'thrust',
      chargeLevel: 0,
      startTime: Date.now(),
      direction
    }

    // 快速前刺
    sword.value.position.x = originalX + direction.x * thrustDistance
    sword.value.position.y = originalY + direction.y * thrustDistance

    // 添加突刺特效
    effects.value.push({
      id: generateId(),
      type: 'thrust',
      position: { x: originalX, y: originalY },
      direction,
      size: thrustDistance,
      opacity: 1,
      age: 0,
      maxAge: 200
    })

    // 延迟返回原位置
    setTimeout(() => {
      sword.value.position.x = originalX
      sword.value.position.y = originalY
      targetPosition.value = { x: originalX, y: originalY }
    }, 100)
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
    console.log('[useSword] onDoubleClick:', e.offsetX, e.offsetY)
    thrust(e.offsetX, e.offsetY)
  }

  // 剑气波（环形攻击）
  const wave = () => {
    if (attackState.value.isAttacking) return

    attackState.value = {
      isAttacking: true,
      type: 'wave',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: { x: 0, y: -1 }
    }

    // 添加环形剑气特效
    effects.value.push({
      id: generateId(),
      type: 'wave',
      position: { ...sword.value.position },
      direction: { x: 0, y: 0 },
      size: 20,
      opacity: 1,
      age: 0,
      maxAge: config.waveDuration
    })

    // 更新连击
    updateCombo()
  }

  // 回旋斩（360度旋转攻击）
  const spin = () => {
    if (attackState.value.isAttacking) return

    attackState.value = {
      isAttacking: true,
      type: 'slash',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: { x: 0, y: -1 }
    }

    // 添加回旋特效
    effects.value.push({
      id: generateId(),
      type: 'spin',
      position: { ...sword.value.position },
      direction: { x: 0, y: 0 },
      size: 60,
      opacity: 1,
      age: 0,
      maxAge: config.spinDuration
    })

    updateCombo()
  }

  // 万剑归宗（右键长按释放）
  const swordRain = () => {
    console.log('[swordRain] 触发，isGathering:', gatherState.value.isGathering, 'swords:', gatherState.value.swords.length)

    if (!gatherState.value.isGathering) {
      console.log('[swordRain] 未在聚剑状态，跳过')
      return
    }
    if (gatherState.value.swords.length === 0) {
      console.log('[swordRain] 没有聚集的剑，跳过')
      return
    }

    // 使用主剑的方向作为基准方向
    const mainDirection = {
      x: Math.cos(sword.value.angle),
      y: Math.sin(sword.value.angle)
    }
    console.log('[swordRain] 主剑方向:', mainDirection, '剑数量:', gatherState.value.swords.length)

    attackState.value = {
      isAttacking: true,
      type: 'swordRain',
      chargeLevel: 1,
      startTime: Date.now(),
      direction: mainDirection
    }

    // 保存剑的副本（因为即将清空）
    const swordsToFire = [...gatherState.value.swords]
    console.log('[swordRain] 准备发射剑数:', swordsToFire.length)

    // 先重置聚剑状态
    gatherState.value.isGathering = false
    gatherState.value.swords = []

    // 为每把聚集的剑添加特效，所有剑使用主剑的朝向平行发射
    swordsToFire.forEach((s, i) => {
      setTimeout(() => {
        // 使用主剑的方向作为发射方向（平行发射）
        const dirX = mainDirection.x
        const dirY = mainDirection.y

        console.log('[swordRain] 发射剑', i, 'position:', s.x, s.y, 'mainDirection:', mainDirection)

        effects.value.push({
          id: generateId(),
          type: 'swordRain',
          position: { x: s.x, y: s.y },
          direction: { x: dirX, y: dirY },
          size: 50,
          opacity: 1,
          age: 0,
          maxAge: 600,
          extra: {
            startX: s.x,
            startY: s.y,
            angle: sword.value.angle  // 使用主剑的角度
          }
        })
      }, i * 30) // 加快发射间隔
    })
  }

  // 开始聚剑（右键按下）
  const startGather = () => {
    gatherState.value.isGathering = true
    gatherState.value.startTime = Date.now()
    gatherState.value.swords = []
  }

  // 更新聚剑（在 update 中调用）
  const updateGather = () => {
    if (!gatherState.value.isGathering) return

    const elapsed = Date.now() - gatherState.value.startTime
    const maxSwords = 48  // 增加到48把剑（翻倍）

    // 每 100ms 添加一把剑（加快生成速度）
    const shouldHaveSwords = Math.min(maxSwords, Math.floor(elapsed / 100))
    
    while (gatherState.value.swords.length < shouldHaveSwords) {
      const index = gatherState.value.swords.length
      // 多圈分布
      const ring = Math.floor(index / 8)  // 每圈8把剑
      const indexInRing = index % 8
      const angle = (indexInRing / 8) * Math.PI * 2 + ring * 0.3
      const radius = 60 + ring * 40  // 不同圈不同半径

      gatherState.value.swords.push({
        id: generateId(),
        x: sword.value.position.x + Math.cos(angle) * radius,
        y: sword.value.position.y + Math.sin(angle) * radius,
        angle: sword.value.angle  // 使用主剑的朝向
      })
    }

    // 更新剑的位置跟随主剑（旋转效果）
    gatherState.value.swords.forEach((s, i) => {
      const ring = Math.floor(i / 8)
      const indexInRing = i % 8
      const rotationSpeed = 0.003 - ring * 0.0005  // 内圈转得快
      const angle = (indexInRing / 8) * Math.PI * 2 + ring * 0.3 + Date.now() * rotationSpeed
      const radius = 60 + ring * 40
      s.x = sword.value.position.x + Math.cos(angle) * radius
      s.y = sword.value.position.y + Math.sin(angle) * radius
      s.angle = sword.value.angle  // 使用主剑的朝向
    })
  }

  // 更新连击计数
  const updateCombo = () => {
    const now = Date.now()
    if (now - comboState.value.lastAttackTime < comboState.value.comboWindow) {
      comboState.value.count++
      
      // 连击特效
      if (comboState.value.count >= 3) {
        effects.value.push({
          id: generateId(),
          type: 'comboHit',
          position: { ...sword.value.position },
          direction: { x: 0, y: -1 },
          size: 30 + comboState.value.count * 10,
          opacity: 1,
          age: 0,
          maxAge: 300,
          extra: { combo: comboState.value.count }
        })
      }
    } else {
      comboState.value.count = 1
    }
    comboState.value.lastAttackTime = now
  }

  // 右键按下
  const onRightMouseDown = () => {
    startGather()
  }

  // 右键松开
  const onRightMouseUp = () => {
    if (gatherState.value.isGathering) {
      swordRain()
    }
  }

  // 剑气护盾（左右键同按）
  const shield = () => {
    if (shieldState.value.isActive) return

    shieldState.value.isActive = true
    shieldState.value.startTime = Date.now()

    attackState.value = {
      isAttacking: true,
      type: 'shield',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: { x: 0, y: 0 }
    }

    // 添加护盾特效
    effects.value.push({
      id: generateId(),
      type: 'wave',
      position: { ...sword.value.position },
      direction: { x: 0, y: 0 },
      size: 60,
      opacity: 0.8,
      age: 0,
      maxAge: shieldState.value.duration,
      extra: { isShield: true }
    })
  }

  // 更新护盾状态
  const updateShield = () => {
    if (!shieldState.value.isActive) return

    const elapsed = Date.now() - shieldState.value.startTime
    if (elapsed >= shieldState.value.duration) {
      shieldState.value.isActive = false
      attackState.value.isAttacking = false
      attackState.value.type = null
    }
  }

  // 剑气横扫（快速移动鼠标）
  const sweep = () => {
    if (attackState.value.isAttacking) return

    attackState.value = {
      isAttacking: true,
      type: 'sweep',
      chargeLevel: 0,
      startTime: Date.now(),
      direction: {
        x: sword.value.velocity.x,
        y: sword.value.velocity.y
      }
    }

    // 添加横扫特效
    const angle = Math.atan2(sword.value.velocity.y, sword.value.velocity.x)
    for (let i = -2; i <= 2; i++) {
      effects.value.push({
        id: generateId(),
        type: 'slashWave',
        position: { ...sword.value.position },
        direction: {
          x: Math.cos(angle + i * 0.3),
          y: Math.sin(angle + i * 0.3)
        },
        size: 40,
        opacity: 0.8 - Math.abs(i) * 0.15,
        age: Math.abs(i) * 30,
        maxAge: 400
      })
    }

    updateCombo()
  }

  // 剑阵顺时针旋转
  const rotateClockwise = () => {
    formationState.value.rotationSpeed = 0.05
  }

  // 剑阵逆时针旋转
  const rotateCounterClockwise = () => {
    formationState.value.rotationSpeed = -0.05
  }

  // 停止旋转
  const stopRotation = () => {
    formationState.value.rotationSpeed = 0
  }

  // 剑阵散开/收拢切换
  const toggleFormation = () => {
    formationState.value.isExpanded = !formationState.value.isExpanded
  }

  // 更新剑阵旋转
  const updateFormation = () => {
    formationState.value.rotation += formationState.value.rotationSpeed
  }

  return {
    sword: readonly(sword),
    trail: readonly(trail),
    effects: readonly(effects),
    attackState: readonly(attackState),
    comboState: readonly(comboState),
    gatherState: readonly(gatherState),
    shieldState: readonly(shieldState),
    formationState: readonly(formationState),
    updatePosition,
    update,
    updateGather,
    updateShield,
    updateFormation,
    slash,
    chargeSlash,
    thrust,
    wave,
    spin,
    swordRain,
    startGather,
    shield,
    sweep,
    rotateClockwise,
    rotateCounterClockwise,
    stopRotation,
    toggleFormation,
    onMouseDown,
    onMouseUp,
    onDoubleClick,
    onRightMouseDown,
    onRightMouseUp
  }
}
