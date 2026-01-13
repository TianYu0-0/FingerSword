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
  | 'none'

export type GestureActionState = {
  currentAction: GestureAction
  isCharging: boolean
  chargeStartTime: number
  isGathering: boolean
  gatherStartTime: number
  lastGestureType: GestureType
  lastActionTime: number
}

export function useGestureActions() {
  const state = ref<GestureActionState>({
    currentAction: 'none',
    isCharging: false,
    chargeStartTime: 0,
    isGathering: false,
    gatherStartTime: 0,
    lastGestureType: 'none',
    lastActionTime: 0
  })

  const actionCallbacks = ref<{
    onMove?: (x: number, y: number) => void
    onSlash?: () => void
    onCharge?: () => void
    onRelease?: (chargeLevel: number) => void
    onGather?: () => void
    onSwordRain?: () => void
    onWave?: () => void
    onThrust?: (x: number, y: number) => void
  }>({})

  // 设置回调函数
  const setCallbacks = (callbacks: typeof actionCallbacks.value) => {
    actionCallbacks.value = callbacks
  }

  // 处理手势状态变化
  const processGesture = (gesture: GestureState, canvasWidth: number, canvasHeight: number) => {
    const now = Date.now()
    const prevGesture = state.value.lastGestureType
    const currentGesture = gesture.type

    // 位置映射到画布坐标
    const x = gesture.position.x * canvasWidth
    const y = gesture.position.y * canvasHeight

    // 1. 始终处理移动（食指指向）
    if (currentGesture === 'pointing' || currentGesture === 'palm') {
      actionCallbacks.value.onMove?.(x, y)
    }

    // 2. 检测手势变化触发动作
    if (currentGesture !== prevGesture) {
      // 握拳 -> 开始聚剑
      if (currentGesture === 'fist' && !state.value.isGathering) {
        state.value.isGathering = true
        state.value.gatherStartTime = now
        actionCallbacks.value.onGather?.()
        state.value.currentAction = 'gather'
      }

      // 握拳后张开 -> 万剑齐发
      if (prevGesture === 'fist' && currentGesture === 'palm' && state.value.isGathering) {
        actionCallbacks.value.onSwordRain?.()
        state.value.isGathering = false
        state.value.currentAction = 'swordRain'
      }

      // 双指捏合 -> 开始蓄力
      if (currentGesture === 'pinch' && !state.value.isCharging) {
        state.value.isCharging = true
        state.value.chargeStartTime = now
        actionCallbacks.value.onCharge?.()
        state.value.currentAction = 'charge'
      }

      // 双指张开（捏合后） -> 释放蓄力
      if (prevGesture === 'pinch' && state.value.isCharging) {
        const chargeTime = now - state.value.chargeStartTime
        const chargeLevel = Math.min(1, chargeTime / 1500)
        actionCallbacks.value.onRelease?.(chargeLevel)
        state.value.isCharging = false
        state.value.currentAction = 'release'
      }

      // 张开五指（非从握拳） -> 剑气波
      if (currentGesture === 'palm' && prevGesture !== 'fist' && prevGesture !== 'pinch') {
        // 检查速度判断是否是快速张开
        const speed = Math.hypot(gesture.velocity.x, gesture.velocity.y)
        if (speed > 0.5) {
          actionCallbacks.value.onWave?.()
          state.value.currentAction = 'wave'
        }
      }

      // OK 手势 -> 突刺
      if (currentGesture === 'ok') {
        actionCallbacks.value.onThrust?.(x, y)
        state.value.currentAction = 'thrust'
      }

      // 食指快速移动 -> 斩击
      if (currentGesture === 'pointing') {
        const speed = Math.hypot(gesture.velocity.x, gesture.velocity.y)
        if (speed > 1.5 && now - state.value.lastActionTime > 300) {
          actionCallbacks.value.onSlash?.()
          state.value.currentAction = 'slash'
          state.value.lastActionTime = now
        }
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
      lastActionTime: 0
    }
  }

  return {
    state: readonly(state),
    setCallbacks,
    processGesture,
    reset
  }
}
