export type TouchState = {
  isPressed: boolean
  position: { x: number; y: number }
  startPosition: { x: number; y: number }
  startTime: number
  lastTapTime: number
}

export function useTouch() {
  const touchState = ref<TouchState>({
    isPressed: false,
    position: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    startTime: 0,
    lastTapTime: 0
  })

  const doubleTapThreshold = 300 // 双击判定时间阈值（毫秒）
  const longPressThreshold = 200 // 长按判定时间阈值（毫秒）

  // 转换触摸坐标
  const getTouchPosition = (touch: Touch, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  // 触摸开始
  const handleTouchStart = (e: TouchEvent, element: HTMLElement) => {
    e.preventDefault()
    const touch = e.touches[0]
    const pos = getTouchPosition(touch, element)
    
    touchState.value = {
      ...touchState.value,
      isPressed: true,
      position: pos,
      startPosition: pos,
      startTime: Date.now()
    }

    return {
      position: pos,
      isDoubleTap: Date.now() - touchState.value.lastTapTime < doubleTapThreshold
    }
  }

  // 触摸移动
  const handleTouchMove = (e: TouchEvent, element: HTMLElement) => {
    e.preventDefault()
    if (!touchState.value.isPressed) return null

    const touch = e.touches[0]
    const pos = getTouchPosition(touch, element)
    touchState.value.position = pos

    return { position: pos }
  }

  // 触摸结束
  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault()
    const now = Date.now()
    const holdTime = now - touchState.value.startTime
    const isLongPress = holdTime > longPressThreshold
    const isDoubleTap = now - touchState.value.lastTapTime < doubleTapThreshold

    const result = {
      position: touchState.value.position,
      startPosition: touchState.value.startPosition,
      holdTime,
      isLongPress,
      isDoubleTap
    }

    touchState.value.isPressed = false
    touchState.value.lastTapTime = now

    return result
  }

  // 绑定事件到元素
  const bindToElement = (
    element: HTMLElement,
    callbacks: {
      onStart?: (data: ReturnType<typeof handleTouchStart>) => void
      onMove?: (data: ReturnType<typeof handleTouchMove>) => void
      onEnd?: (data: ReturnType<typeof handleTouchEnd>) => void
    }
  ) => {
    const onTouchStart = (e: TouchEvent) => {
      const data = handleTouchStart(e, element)
      callbacks.onStart?.(data)
    }

    const onTouchMove = (e: TouchEvent) => {
      const data = handleTouchMove(e, element)
      if (data) callbacks.onMove?.(data)
    }

    const onTouchEnd = (e: TouchEvent) => {
      const data = handleTouchEnd(e)
      callbacks.onEnd?.(data)
    }

    element.addEventListener('touchstart', onTouchStart, { passive: false })
    element.addEventListener('touchmove', onTouchMove, { passive: false })
    element.addEventListener('touchend', onTouchEnd, { passive: false })
    element.addEventListener('touchcancel', onTouchEnd, { passive: false })

    // 返回解绑函数
    return () => {
      element.removeEventListener('touchstart', onTouchStart)
      element.removeEventListener('touchmove', onTouchMove)
      element.removeEventListener('touchend', onTouchEnd)
      element.removeEventListener('touchcancel', onTouchEnd)
    }
  }

  return {
    touchState: readonly(touchState),
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    bindToElement
  }
}
