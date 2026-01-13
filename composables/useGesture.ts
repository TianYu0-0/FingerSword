export type GestureType =
  | 'pointing'      // 食指指向
  | 'fist'          // 握拳
  | 'palm'          // 张开五指
  | 'thumbsUp'      // 竖大拇指
  | 'twoFingers'    // 双指并拢
  | 'none'          // 无手势

export type GestureState = {
  type: GestureType
  position: { x: number; y: number }
  direction: { x: number; y: number }
  confidence: number
  velocity: { x: number; y: number }
}

export type CameraPermissionStatus = 'unknown' | 'checking' | 'granted' | 'denied' | 'prompt'

export function useGesture() {
  const isInitialized = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const hasCamera = ref(false)
  const permissionStatus = ref<CameraPermissionStatus>('unknown')
  
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

  const detectGestureType = (landmarks: any[]): { type: GestureType; confidence: number } => {
    if (!landmarks || landmarks.length < 21) return { type: 'none', confidence: 0 }

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

    const wrist = landmarks[0]
    const thumbMCP = landmarks[2]  // 拇指掌骨关节

    // 判断手指是否伸直（更严格的判断）
    const isFingerExtended = (tip: any, pip: any, threshold: number = 0.05) => {
      const distance = tip.y - pip.y
      return distance < -threshold  // 负值表示向上伸直
    }

    const indexExtended = isFingerExtended(indexTip, indexPIP)
    const middleExtended = isFingerExtended(middleTip, middlePIP)
    const ringExtended = isFingerExtended(ringTip, ringPIP)
    const pinkyExtended = isFingerExtended(pinkyTip, pinkyPIP)

    // 拇指伸直判断（改进版：考虑多个维度）
    const thumbDistance = Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y)
    const thumbToWrist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y)
    const thumbExtended = thumbDistance > 0.08 && thumbToWrist > 0.15

    // 计算手指弯曲度（用于更精确的判断）
    const getFingerCurvature = (tip: any, pip: any) => {
      return Math.abs(tip.y - pip.y)
    }

    const indexCurvature = getFingerCurvature(indexTip, indexPIP)
    const middleCurvature = getFingerCurvature(middleTip, middlePIP)
    const ringCurvature = getFingerCurvature(ringTip, ringPIP)
    const pinkyCurvature = getFingerCurvature(pinkyTip, pinkyPIP)

    // 握拳：所有手指都弯曲（更严格的判断）
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      const avgCurvature = (indexCurvature + middleCurvature + ringCurvature + pinkyCurvature) / 4
      const confidence = avgCurvature < 0.1 ? 0.9 : 0.7  // 弯曲度越小，置信度越高
      console.log('[手势识别] 识别为握拳, confidence:', confidence)
      return { type: 'fist', confidence }
    }

    // 竖大拇指：只有拇指伸直（优先级提高，放在张开五指之前）
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      console.log('[手势识别] 识别为竖大拇指')
      return { type: 'thumbsUp', confidence: 0.85 }
    }

    // 张开五指：所有手指都伸直
    if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
      const avgCurvature = (indexCurvature + middleCurvature + ringCurvature + pinkyCurvature) / 4
      const confidence = avgCurvature > 0.08 ? 0.9 : 0.7  // 伸直度越大，置信度越高
      console.log('[手势识别] 识别为张开五指, confidence:', confidence)
      return { type: 'palm', confidence }
    }

    // 食指指向：只有食指伸直
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      const confidence = indexCurvature > 0.08 && middleCurvature < 0.05 ? 0.9 : 0.7
      console.log('[手势识别] 识别为食指指向, confidence:', confidence)
      return { type: 'pointing', confidence }
    }

    // 双指并拢：食指和中指伸直，无名指和小指弯曲
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      const confidence = indexCurvature > 0.08 && middleCurvature > 0.08 ? 0.85 : 0.7
      console.log('[手势识别] 识别为双指并拢, confidence:', confidence)
      return { type: 'twoFingers', confidence }
    }

    return { type: 'none', confidence: 0 }
  }

  // 检查摄像头权限
  const checkPermission = async (): Promise<CameraPermissionStatus> => {
    permissionStatus.value = 'checking'
    
    try {
      // 检查浏览器是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        permissionStatus.value = 'denied'
        error.value = '您的浏览器不支持摄像头功能'
        return 'denied'
      }

      // 检查权限 API
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
          permissionStatus.value = result.state as CameraPermissionStatus
          return result.state as CameraPermissionStatus
        } catch {
          // 某些浏览器不支持 camera 权限查询
          permissionStatus.value = 'prompt'
          return 'prompt'
        }
      }

      permissionStatus.value = 'prompt'
      return 'prompt'
    } catch {
      permissionStatus.value = 'unknown'
      return 'unknown'
    }
  }

  const initialize = async (video: HTMLVideoElement): Promise<boolean> => {
    console.log('[useGesture] initialize 开始')
    if (isInitialized.value) {
      console.log('[useGesture] 已初始化，跳过')
      return true
    }
    
    isLoading.value = true
    error.value = null
    videoElement = video
    console.log('[useGesture] videoElement:', video)

    try {
      // 先检查权限
      console.log('[useGesture] 检查摄像头权限...')
      const status = await checkPermission()
      console.log('[useGesture] 权限状态:', status)
      if (status === 'denied') {
        error.value = '摄像头权限被拒绝，请在浏览器设置中允许访问摄像头'
        isLoading.value = false
        return false
      }

      // 动态导入 MediaPipe
      console.log('[useGesture] 导入 MediaPipe...')
      const { Hands } = await import('@mediapipe/hands')
      const { Camera } = await import('@mediapipe/camera_utils')
      console.log('[useGesture] MediaPipe 导入成功')

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

          // 检测手势类型和置信度
          const gestureResult = detectGestureType(landmarks)
          const handConfidence = results.multiHandedness?.[0]?.score || 0

          // 综合置信度：手部检测置信度 * 手势识别置信度
          const finalConfidence = handConfidence * gestureResult.confidence

          // 只有置信度足够高才更新手势状态
          if (finalConfidence > 0.5) {
            gestureState.value = {
              type: gestureResult.type,
              position: newPosition,
              direction,
              confidence: finalConfidence,
              velocity
            }
          } else {
            // 置信度不足，保持位置但标记为无手势
            gestureState.value = {
              ...gestureState.value,
              position: newPosition,
              direction,
              velocity,
              type: 'none',
              confidence: finalConfidence
            }
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
      console.log('[useGesture] 请求摄像头权限...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      console.log('[useGesture] 摄像头流获取成功:', stream)
      
      permissionStatus.value = 'granted'
      video.srcObject = stream
      await video.play()
      hasCamera.value = true
      console.log('[useGesture] 视频播放成功')

      camera = new Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video })
        },
        width: 640,
        height: 480
      })

      console.log('[useGesture] 启动摄像头...')
      await camera.start()
      console.log('[useGesture] 摄像头启动成功')
      isInitialized.value = true
      isLoading.value = false
      return true

    } catch (e: any) {
      console.error('[useGesture] 初始化失败:', e)
      // 处理不同的错误类型
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        permissionStatus.value = 'denied'
        error.value = '摄像头权限被拒绝，请点击浏览器地址栏左侧的锁图标，允许访问摄像头'
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        error.value = '未检测到摄像头设备，请确保您的设备有摄像头'
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        error.value = '摄像头被其他程序占用，请关闭其他使用摄像头的应用后重试'
      } else if (e.name === 'OverconstrainedError') {
        error.value = '摄像头不支持所需的分辨率'
      } else if (e.name === 'TypeError') {
        error.value = '请使用 HTTPS 或 localhost 访问以使用摄像头功能'
      } else {
        error.value = e.message || '初始化手势识别失败，请刷新页面重试'
      }
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
    permissionStatus: readonly(permissionStatus),
    gestureState: readonly(gestureState),
    checkPermission,
    initialize,
    stop
  }
}
