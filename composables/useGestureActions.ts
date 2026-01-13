import type { GestureType, GestureState } from './useGesture'

export type GestureAction =
  | 'move'
  | 'slash'
  | 'charge'
  | 'release'
  | 'gather'
  | 'swordRain'
  | 'wave'
  | 'thrust'
  | 'sweep'
  | 'none'

export type GestureActionState = {
  currentAction: GestureAction
  isCharging: boolean
  chargeStartTime: number
  isGathering: boolean
  gatherStartTime: number
  lastGestureType: GestureType
  lastActionTime: number
  lastSlashTime: number
  lastWaveTime: number
  lastThrustTime: number
  lastSwordRainTime: number
  gestureStableCount: number  // 手势稳定计数
  lastStableGesture: GestureType  // 上次稳定的手势
  twoFingersStartTime: number  // 双指并拢开始时间
  twoFingersGatherTriggered: boolean  // 双指并拢是否已触发聚剑
  fistStartTime: number  // 握拳开始时间
  fistChargeTriggered: boolean  // 握拳是否已触发蓄力
}

export function useGestureActions() {
  const state = ref<GestureActionState>({
    currentAction: 'none',
    isCharging: false,
    chargeStartTime: 0,
    isGathering: false,
    gatherStartTime: 0,
    lastGestureType: 'none',
    lastActionTime: 0,
    lastSlashTime: 0,
    lastWaveTime: 0,
    lastThrustTime: 0,
    lastSwordRainTime: 0,
    gestureStableCount: 0,
    lastStableGesture: 'none',
    twoFingersStartTime: 0,
    twoFingersGatherTriggered: false,
    fistStartTime: 0,
    fistChargeTriggered: false
  })

  // 防抖配置（毫秒）
  const COOLDOWNS = {
    slash: 300,      // 斩击冷却
    wave: 500,       // 剑气波冷却
    thrust: 800,     // 突刺冷却
    swordRain: 1000, // 万剑齐发冷却
    gather: 500      // 聚剑冷却
  }

  // 双指并拢保持时间要求（毫秒）
  const TWO_FINGERS_GATHER_TIME = 3000  // 3秒

  // 握拳保持时间要求（毫秒）
  const FIST_CHARGE_TIME = 3000  // 3秒

  // 手势稳定性要求（需要连续识别多少帧才认为稳定）
  const STABLE_THRESHOLD = 2  // 降低到2帧，更容易触发

  const actionCallbacks = ref<{
    onMove?: (x: number, y: number) => void
    onSlash?: () => void
    onCharge?: () => void
    onRelease?: (chargeLevel: number) => void
    onGather?: () => void
    onSwordRain?: () => void
    onWave?: () => void
    onThrust?: (x: number, y: number) => void
    onSweep?: () => void
  }>({})

  // 设置回调函数
  const setCallbacks = (callbacks: typeof actionCallbacks.value) => {
    actionCallbacks.value = callbacks
  }

  // 处理手势状态变化
  const processGesture = (gesture: GestureState, canvasWidth: number, canvasHeight: number) => {
    const now = Date.now()
    const currentGesture = gesture.type

    console.log('[动作处理] 收到手势:', {
      type: currentGesture,
      confidence: gesture.confidence.toFixed(2),
      position: gesture.position
    })

    // 手势稳定性检查
    if (currentGesture === state.value.lastStableGesture) {
      state.value.gestureStableCount++
    } else {
      state.value.gestureStableCount = 1
      state.value.lastStableGesture = currentGesture
    }

    // 只有手势稳定后才处理（防止误识别）
    const isStable = state.value.gestureStableCount >= STABLE_THRESHOLD
    const prevGesture = state.value.lastGestureType

    console.log('[动作处理] 稳定性检查:', {
      isStable,
      stableCount: state.value.gestureStableCount,
      threshold: STABLE_THRESHOLD,
      prevGesture,
      currentGesture
    })

    // 位置映射到画布坐标
    const x = gesture.position.x * canvasWidth
    const y = gesture.position.y * canvasHeight

    // 1. 始终处理移动（食指指向、张开手掌或双指并拢）
    if (currentGesture === 'pointing' || currentGesture === 'palm' || currentGesture === 'twoFingers') {
      actionCallbacks.value.onMove?.(x, y)
    }

    // 2. 检测手势变化 - 手势变化时即使不稳定也要处理
    const hasGestureChanged = currentGesture !== prevGesture

    // 如果手势没有变化且不稳定，则跳过动作处理
    if (!hasGestureChanged && !isStable) {
      state.value.lastGestureType = currentGesture
      return
    }

    // 3. 检测手势变化触发动作
    if (currentGesture !== prevGesture) {
      console.log('[动作处理] 手势变化:', prevGesture, '->', currentGesture)

      // 双指并拢 -> 开始计时
      if (currentGesture === 'twoFingers') {
        console.log('[动作处理] 检测到双指并拢，开始计时')
        state.value.twoFingersStartTime = now
        state.value.twoFingersGatherTriggered = false
      }

      // 握拳 -> 开始计时
      if (currentGesture === 'fist') {
        console.log('[动作处理] 检测到握拳，开始计时')
        state.value.fistStartTime = now
        state.value.fistChargeTriggered = false
      }

      // 结束双指并拢 -> 触发万剑齐发（如果已经触发了聚剑）
      if (prevGesture === 'twoFingers' && state.value.twoFingersGatherTriggered) {
        console.log('[动作处理] 结束双指并拢，尝试触发万剑齐发')
        if (now - state.value.lastSwordRainTime > COOLDOWNS.swordRain) {
          console.log('[动作处理] ✅ 触发万剑齐发')
          actionCallbacks.value.onSwordRain?.()
          state.value.isGathering = false
          state.value.currentAction = 'swordRain'
          state.value.lastSwordRainTime = now
          state.value.twoFingersGatherTriggered = false
        } else {
          console.log('[动作处理] ❌ 万剑齐发冷却中')
        }
      }

      // 张开手掌 -> 释放蓄力（如果正在蓄力）
      if (currentGesture === 'palm' && state.value.fistChargeTriggered) {
        console.log('[动作处理] 检测到张开手掌，释放蓄力')
        const chargeTime = now - state.value.chargeStartTime
        const chargeLevel = Math.min(1, chargeTime / 1500)
        console.log('[动作处理] ✅ 释放蓄力, 蓄力等级:', chargeLevel)
        actionCallbacks.value.onRelease?.(chargeLevel)
        state.value.isCharging = false
        state.value.currentAction = 'release'
        state.value.fistChargeTriggered = false
      }
    }

    // 4. 双指并拢保持检查 - 超过3秒触发聚剑
    if (currentGesture === 'twoFingers' && !state.value.twoFingersGatherTriggered) {
      const holdTime = now - state.value.twoFingersStartTime
      if (holdTime >= TWO_FINGERS_GATHER_TIME) {
        console.log('[动作处理] 双指并拢保持3秒，✅ 触发聚剑动作')
        state.value.isGathering = true
        state.value.gatherStartTime = now
        actionCallbacks.value.onGather?.()
        state.value.currentAction = 'gather'
        state.value.twoFingersGatherTriggered = true
      }
    }

    // 5. 握拳保持检查 - 超过3秒触发蓄力
    if (currentGesture === 'fist' && !state.value.fistChargeTriggered) {
      const holdTime = now - state.value.fistStartTime
      if (holdTime >= FIST_CHARGE_TIME) {
        console.log('[动作处理] 握拳保持3秒，✅ 触发蓄力动作')
        state.value.isCharging = true
        state.value.chargeStartTime = now
        actionCallbacks.value.onCharge?.(0)
        state.value.currentAction = 'charge'
        state.value.fistChargeTriggered = true
      }
    }

    // 6. 食指快速移动 -> 斩击（带冷却）
    if (currentGesture === 'pointing') {
      const speed = Math.hypot(gesture.velocity.x, gesture.velocity.y)
      if (speed > 1.5 && now - state.value.lastSlashTime > COOLDOWNS.slash) {
        actionCallbacks.value.onSlash?.()
        state.value.currentAction = 'slash'
        state.value.lastSlashTime = now
      }
    }

    state.value.lastGestureType = currentGesture
  }

  // 重置状态
  const reset = () => {
    state.value = {
      currentAction: 'none',
      isCharging: false,
      chargeStartTime: 0,
      isGathering: false,
      gatherStartTime: 0,
      lastGestureType: 'none',
      lastActionTime: 0,
      lastSlashTime: 0,
      lastWaveTime: 0,
      lastThrustTime: 0,
      lastSwordRainTime: 0,
      gestureStableCount: 0,
      lastStableGesture: 'none',
      twoFingersStartTime: 0,
      twoFingersGatherTriggered: false,
      fistStartTime: 0,
      fistChargeTriggered: false
    }
  }

  return {
    state: readonly(state),
    setCallbacks,
    processGesture,
    reset
  }
}
