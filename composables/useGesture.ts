export type GestureType = 
  | 'pointing'      // 食指指向
  | 'fist'          // 握拳
  | 'palm'          // 张开五指
  | 'pinch'         // 双指捏合
  | 'thumbsUp'      // 竖大拇指
  | 'ok'            // OK 手势
  | 'none'          // 无手势

export type GestureState = {
  type: GestureType
  position: { x: number; y: number }
  direction: { x: number; y: number }
  confidence: number
  velocity: { x: number; y: number }
}

export function useGesture() {
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasCamera = ref(false)
  
  const gestureState = ref<GestureState>({
    type: 'none',
    position: { x: 0.5, y: 0.5 },
    direction: { x: 0, y: 0 },
    confidence: 0,
    velocity: { x: 0, y: 0 }
  })

  let hands: any = null
  let camera: any = null
  let videoElement: HTMLVideoElement | null = null
  let lastPosition = { x: 0.5, y: 0.5 }
  let lastTime = Date.now()

  const detectGestureType = (landmarks: any[]): GestureType => {
    if (!landmarks || landmarks.length < 21) return 'none'

    // 手指关键点索引
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]
    
    const thumbIP = landmarks[3]
    const indexPIP = landmarks[6]
    const middlePIP = landmarks[10]
    const ringPIP = landmarks[14]
    const pinkyPIP = landmarks[18]
    
    // 判断手指是否伸直
    const isFingerExtended = (tip: any, pip: any) => tip.y < pip.y
    
    const indexExtended = isFingerExtended(indexTip, indexPIP)
    const middleExtended = isFingerExtended(middleTip, middlePIP)
    const ringExtended = isFingerExtended(ringTip, ringPIP)
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyPIP)
    const thumbExtended = thumbTip.x < thumbIP.x // 简化判断

    // 握拳：所有手指都弯曲
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'fist'
    }

    // 张开五指：所有手指都伸直
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
      return 'palm'
    }

    // 食指指向：只有食指伸直
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'pointing'
    }

    // 竖大拇指：只有拇指伸直
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'thumbsUp'
    }

    // OK 手势：拇指和食指靠近，其他手指伸直
    const thumbIndexDistance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
    if (thumbIndexDistance < 0.05 && middleExtended && ringExtended && pinkyExtended) {
      return 'ok'
    }

    // 双指捏合：拇指和食指靠近
    if (thumbIndexDistance < 0.08) {
      return 'pinch'
    }

    return 'none'
  }

  const initialize = async (video: HTMLVideoElement): Promise<boolean> => {
    if (isInitialized.value) return true
    
    isLoading.value = true
    error.value = null
    videoElement = video

    try {
      // 动态导入 MediaPipe
      const { Hands } = await import('@mediapipe/hands')
      const { Camera } = await import('@mediapipe/camera_utils')

      hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        }
      })

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      })

      hands.onResults((results: any) => {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const landmarks = results.multiHandLandmarks[0]
          const now = Date.now()
          const dt = (now - lastTime) / 1000

          // 使用食指尖端作为位置
          const indexTip = landmarks[8]
          const newPosition = { x: 1 - indexTip.x, y: indexTip.y } // 镜像 x

          // 计算速度
          const velocity = {
            x: (newPosition.x - lastPosition.x) / dt,
            y: (newPosition.y - lastPosition.y) / dt
          }

          // 计算方向
          const direction = {
            x: newPosition.x - lastPosition.x,
            y: newPosition.y - lastPosition.y
          }

          gestureState.value = {
            type: detectGestureType(landmarks),
            position: newPosition,
            direction,
            confidence: results.multiHandedness?.[0]?.score || 0,
            velocity
          }

          lastPosition = newPosition
          lastTime = now
        } else {
          gestureState.value = {
            ...gestureState.value,
            type: 'none',
            confidence: 0
          }
        }
      })

      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      
      video.srcObject = stream
      await video.play()
      hasCamera.value = true

      camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video })
        },
        width: 640,
        height: 480
      })

      await camera.start()
      isInitialized.value = true
      isLoading.value = false
      return true

    } catch (e: any) {
      error.value = e.message || '初始化手势识别失败'
      isLoading.value = false
      return false
    }
  }

  const stop = () => {
    if (camera) {
      camera.stop()
      camera = null
    }
    if (videoElement?.srcObject) {
      const tracks = (videoElement.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoElement.srcObject = null
    }
    isInitialized.value = false
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isInitialized: readonly(isInitialized),
    isLoading: readonly(isLoading),
    error: readonly(error),
    hasCamera: readonly(hasCamera),
    gestureState: readonly(gestureState),
    initialize,
    stop
  }
}
