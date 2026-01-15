# 基于 MediaPipe Hands 的实时手势识别系统：从零实现仙侠游戏的手势控制

## 前言

在传统的游戏交互中，我们习惯了键盘、鼠标、手柄等输入设备。但随着计算机视觉技术的发展，**手势识别**为游戏交互带来了全新的可能性。本文将详细介绍如何在 Web 端使用 **MediaPipe Hands** 实现一套完整的手势识别系统，并将其应用到仙侠风格的互动游戏《指尖剑仙》中。

项目地址：[FingerSword - GitHub](https://github.com/TianYu0-0/FingerSword)
在线体验：[https://game.tsyewz.top](https://game.tsyewz.top)

## 一、项目背景与需求分析

### 1.1 项目简介

《指尖剑仙》是一款基于手势识别的仙侠风格互动游戏，玩家可以通过摄像头手势控制仙剑完成各种挑战任务。项目采用 **Nuxt 3 + Vue 3 + TypeScript** 开发，使用 **MediaPipe Hands** 实现手势识别，Canvas 2D 渲染游戏画面。

### 1.2 核心需求

1. **实时性**：手势识别延迟需控制在 100ms 以内，确保流畅的游戏体验
2. **准确性**：识别准确率需达到 85% 以上，避免误触发
3. **多样性**：支持多种手势类型，映射到不同的游戏动作
4. **稳定性**：处理光线变化、手部遮挡等复杂场景
5. **易用性**：无需额外硬件，仅需普通摄像头即可使用

### 1.3 技术选型

经过调研，我们选择了 **Google MediaPipe Hands** 作为手势识别的核心引擎：

| 技术方案 | 优点 | 缺点 | 是否采用 |
|---------|------|------|---------|
| MediaPipe Hands | 高精度、实时性好、开箱即用 | 需要加载模型文件 | ✅ 采用 |
| TensorFlow.js + 自训练模型 | 可定制化 | 需要大量训练数据和时间 | ❌ |
| OpenCV.js | 功能强大 | 体积大、学习曲线陡峭 | ❌ |
| 传统图像处理 | 轻量级 | 准确率低、鲁棒性差 | ❌ |

## 二、架构设计

### 2.1 整体架构

手势识别系统采用**双层架构**设计，实现了识别层与应用层的解耦：

```
┌─────────────────────────────────────────────────┐
│                  游戏应用层                      │
│  (useSword.ts, useLevel.ts, useCanvasRenderer)  │
└────────────────┬────────────────────────────────┘
                 │ 游戏动作
                 │ (move, slash, charge, release...)
┌────────────────┴────────────────────────────────┐
│              手势动作映射层                       │
│            (useGestureActions.ts)               │
│  - 手势稳定性检查                                 │
│  - 持续时间检测                                   │
│  - 动作冷却控制                                   │
│  - 位置灵敏度调整                                 │
└────────────────┬────────────────────────────────┘
                 │ 手势状态
                 │ (type, position, velocity, confidence)
┌────────────────┴────────────────────────────────┐
│              手势识别核心层                       │
│              (useGesture.ts)                    │
│  - MediaPipe Hands 集成                         │
│  - 21个手部关键点检测                            │
│  - 手势类型识别                                   │
│  - 摄像头权限管理                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 核心模块

#### 2.2.1 手势识别核心层 (`useGesture.ts`)

负责与 MediaPipe Hands 交互，输出原始手势状态：

```typescript
export type GestureType =
  | 'pointing'      // 食指指向
  | 'fist'          // 握拳
  | 'palm'          // 张开五指
  | 'thumbsUp'      // 竖大拇指
  | 'twoFingers'    // 双指并拢
  | 'none'          // 无手势

export type GestureState = {
  type: GestureType
  position: { x: number; y: number }      // 归一化坐标 [0, 1]
  direction: { x: number; y: number }     // 移动方向
  confidence: number                       // 置信度 [0, 1]
  velocity: { x: number; y: number }      // 移动速度
}
```

#### 2.2.2 手势动作映射层 (`useGestureActions.ts`)

将手势状态转换为游戏动作，处理复杂的交互逻辑：

```typescript
export type GestureAction =
  | 'move'        // 移动剑
  | 'slash'       // 斩击
  | 'charge'      // 蓄力
  | 'release'     // 释放蓄力
  | 'gather'      // 聚剑
  | 'swordRain'   // 万剑齐发
  | 'wave'        // 剑气波
  | 'thrust'      // 突刺
  | 'sweep'       // 横扫
  | 'none'        // 无动作
```

## 三、核心实现详解

### 3.1 MediaPipe Hands 集成

#### 3.1.1 初始化流程

```typescript
const initialize = async (video: HTMLVideoElement): Promise<boolean> => {
  try {
    // 1. 检查摄像头权限
    const status = await checkPermission()
    if (status === 'denied') {
      error.value = '摄像头权限被拒绝'
      return false
    }

    // 2. 动态导入 MediaPipe（减少初始加载体积）
    const { Hands } = await import('@mediapipe/hands')
    const { Camera } = await import('@mediapipe/camera_utils')

    // 3. 配置 MediaPipe Hands
    hands = new Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      }
    })

    hands.setOptions({
      maxNumHands: 1,              // 只检测一只手
      modelComplexity: 1,          // 模型复杂度 (0-2)
      minDetectionConfidence: 0.7, // 检测置信度阈值
      minTrackingConfidence: 0.5   // 跟踪置信度阈值
    })

    // 4. 设置结果回调
    hands.onResults((results: any) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]
        processLandmarks(landmarks, results.multiHandedness[0].score)
      }
    })

    // 5. 请求摄像头权限并启动
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }
    })
    video.srcObject = stream
    await video.play()

    // 6. 启动摄像头处理循环
    camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video })
      },
      width: 640,
      height: 480
    })
    await camera.start()

    isInitialized.value = true
    return true
  } catch (e: any) {
    handleError(e)
    return false
  }
}
```

#### 3.1.2 错误处理策略

针对不同的错误类型，提供友好的提示信息：

```typescript
const handleError = (e: any) => {
  if (e.name === 'NotAllowedError') {
    error.value = '摄像头权限被拒绝，请点击浏览器地址栏左侧的锁图标，允许访问摄像头'
  } else if (e.name === 'NotFoundError') {
    error.value = '未检测到摄像头设备，请确保您的设备有摄像头'
  } else if (e.name === 'NotReadableError') {
    error.value = '摄像头被其他程序占用，请关闭其他使用摄像头的应用后重试'
  } else if (e.name === 'OverconstrainedError') {
    error.value = '摄像头不支持所需的分辨率'
  } else if (e.name === 'TypeError') {
    error.value = '请使用 HTTPS 或 localhost 访问以使用摄像头功能'
  } else {
    error.value = '初始化手势识别失败，请刷新页面重试'
  }
}
```

### 3.2 手势识别算法

#### 3.2.1 手部关键点说明

MediaPipe Hands 提供 21 个手部关键点：

```
        8   12  16  20
        |   |   |   |
    4   |   |   |   |
    |   |   |   |   |
    |   |   |   |   |
    |   |   |   |   |
    0---2---5---9--13--17
        |
        1

0: 手腕 (Wrist)
1-4: 拇指 (Thumb)
5-8: 食指 (Index)
9-12: 中指 (Middle)
13-16: 无名指 (Ring)
17-20: 小指 (Pinky)
```

#### 3.2.2 手势识别核心算法

基于关键点位置关系判断手势类型：

```typescript
const detectGestureType = (landmarks: any[]): { type: GestureType; confidence: number } => {
  if (!landmarks || landmarks.length < 21) return { type: 'none', confidence: 0 }

  // 关键点索引
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
  const thumbMCP = landmarks[2]

  // 判断手指是否伸直
  const isFingerExtended = (tip: any, pip: any, threshold: number = 0.05) => {
    const distance = tip.y - pip.y
    return distance < -threshold  // 负值表示向上伸直
  }

  const indexExtended = isFingerExtended(indexTip, indexPIP)
  const middleExtended = isFingerExtended(middleTip, middlePIP)
  const ringExtended = isFingerExtended(ringTip, ringPIP)
  const pinkyExtended = isFingerExtended(pinkyTip, pinkyPIP)

  // 拇指伸直判断（考虑多个维度）
  const thumbDistance = Math.hypot(thumbTip.x - thumbMCP.x, thumbTip.y - thumbMCP.y)
  const thumbToWrist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y)
  const thumbExtended = thumbDistance > 0.08 && thumbToWrist > 0.15

  // 计算手指弯曲度
  const getFingerCurvature = (tip: any, pip: any) => {
    return Math.abs(tip.y - pip.y)
  }

  const indexCurvature = getFingerCurvature(indexTip, indexPIP)
  const middleCurvature = getFingerCurvature(middleTip, middlePIP)
  const ringCurvature = getFingerCurvature(ringTip, ringPIP)
  const pinkyCurvature = getFingerCurvature(pinkyTip, pinkyPIP)

  // 1. 握拳：所有手指都弯曲
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const avgCurvature = (indexCurvature + middleCurvature + ringCurvature + pinkyCurvature) / 4
    const confidence = avgCurvature < 0.1 ? 0.9 : 0.7
    return { type: 'fist', confidence }
  }

  // 2. 竖大拇指：只有拇指伸直
  if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { type: 'thumbsUp', confidence: 0.85 }
  }

  // 3. 张开五指：所有手指都伸直
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && thumbExtended) {
    const avgCurvature = (indexCurvature + middleCurvature + ringCurvature + pinkyCurvature) / 4
    const confidence = avgCurvature > 0.08 ? 0.9 : 0.7
    return { type: 'palm', confidence }
  }

  // 4. 食指指向：只有食指伸直
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const confidence = indexCurvature > 0.08 && middleCurvature < 0.05 ? 0.9 : 0.7
    return { type: 'pointing', confidence }
  }

  // 5. 双指并拢：食指和中指伸直
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    const confidence = indexCurvature > 0.08 && middleCurvature > 0.08 ? 0.85 : 0.7
    return { type: 'twoFingers', confidence }
  }

  return { type: 'none', confidence: 0 }
}
```

#### 3.2.3 置信度计算

采用**双重置信度**机制，确保识别准确性：

```typescript
// 手部检测置信度（MediaPipe 提供）
const handConfidence = results.multiHandedness?.[0]?.score || 0

// 手势识别置信度（自定义算法计算）
const gestureResult = detectGestureType(landmarks)

// 综合置信度 = 手部检测置信度 × 手势识别置信度
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
}
```

### 3.3 手势动作映射

#### 3.3.1 手势稳定性检查

防止手势识别抖动导致的误触发：

```typescript
// 手势稳定性要求（需要连续识别多少帧才认为稳定）
const STABLE_THRESHOLD = 2

// 手势稳定性检查
if (currentGesture === state.value.lastStableGesture) {
  state.value.gestureStableCount++
} else {
  state.value.gestureStableCount = 1
  state.value.lastStableGesture = currentGesture
}

const isStable = state.value.gestureStableCount >= STABLE_THRESHOLD
```

#### 3.3.2 持续时间检测

某些技能需要保持手势一定时间才能触发：

```typescript
// 双指并拢保持3秒 -> 触发聚剑
const TWO_FINGERS_GATHER_TIME = 3000  // 3秒

if (currentGesture === 'twoFingers' && !state.value.twoFingersGatherTriggered) {
  const holdTime = now - state.value.twoFingersStartTime
  if (holdTime >= TWO_FINGERS_GATHER_TIME) {
    console.log('[动作处理] 双指并拢保持3秒，触发聚剑动作')
    state.value.isGathering = true
    actionCallbacks.value.onGather?.()
    state.value.twoFingersGatherTriggered = true
  }
}

// 握拳保持3秒 -> 触发蓄力
const FIST_CHARGE_TIME = 3000  // 3秒

if (currentGesture === 'fist' && !state.value.fistChargeTriggered) {
  const holdTime = now - state.value.fistStartTime
  if (holdTime >= FIST_CHARGE_TIME) {
    console.log('[动作处理] 握拳保持3秒，触发蓄力动作')
    state.value.isCharging = true
    actionCallbacks.value.onCharge?.()
    state.value.fistChargeTriggered = true
  }
}
```

#### 3.3.3 动作冷却控制

防止技能频繁触发，保持游戏平衡：

```typescript
// 防抖配置（毫秒）
const COOLDOWNS = {
  slash: 300,      // 斩击冷却
  wave: 500,       // 剑气波冷却
  thrust: 800,     // 突刺冷却
  swordRain: 1000, // 万剑齐发冷却
  gather: 500      // 聚剑冷却
}

// 检查冷却时间
if (now - state.value.lastSlashTime > COOLDOWNS.slash) {
  actionCallbacks.value.onSlash?.()
  state.value.lastSlashTime = now
}
```

#### 3.3.4 位置灵敏度调整

提升手势控制的响应性：

```typescript
// 手势位置灵敏度（大于1表示手指移动一点，剑移动更多）
const POSITION_SENSITIVITY = 1.5

// 从中心点计算偏移，应用灵敏度系数
const centerX = 0.5
const centerY = 0.5
const offsetX = (gesture.position.x - centerX) * POSITION_SENSITIVITY
const offsetY = (gesture.position.y - centerY) * POSITION_SENSITIVITY

// 限制在有效范围内（0-1）
const normalizedX = Math.max(0, Math.min(1, centerX + offsetX))
const normalizedY = Math.max(0, Math.min(1, centerY + offsetY))

const x = normalizedX * canvasWidth
const y = normalizedY * canvasHeight
```

### 3.4 手势到游戏动作的完整映射

| 手势 | 持续时间 | 触发条件 | 游戏动作 | 说明 |
|-----|---------|---------|---------|------|
| 食指指向 | - | 移动 | `move` | 控制剑的位置 |
| 食指指向 | - | 快速移动（速度>1.5） | `slash` | 斩击攻击 |
| 双指并拢 | - | 移动 | `move` | 控制剑的位置 |
| 双指并拢 | 3秒 | 保持不动 | `gather` | 聚剑（剑阵聚集） |
| 双指并拢 | 3秒后 | 松开 | `swordRain` | 万剑齐发 |
| 握拳 | 3秒 | 保持不动 | `charge` | 蓄力 |
| 握拳→张开 | 3秒后 | 手势变化 | `release` | 释放蓄力斩 |
| 张开五指 | - | 移动 | `move` | 控制剑的位置 |

## 四、性能优化

### 4.1 动态导入

使用动态导入减少初始加载体积：

```typescript
// 只在需要时才加载 MediaPipe
const { Hands } = await import('@mediapipe/hands')
const { Camera } = await import('@mediapipe/camera_utils')
```

### 4.2 CDN 加速

使用 jsDelivr CDN 加速模型文件加载：

```typescript
hands = new Hands({
  locateFile: (file: string) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  }
})
```

### 4.3 帧率控制

MediaPipe Hands 默认以摄像头帧率运行（通常 30fps），无需额外优化。

### 4.4 内存管理

及时释放资源，避免内存泄漏：

```typescript
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
```

## 五、实际效果与数据

### 5.1 性能指标

| 指标 | 数值 | 说明 |
|-----|------|------|
| 识别延迟 | 50-80ms | 从手势到画面响应的时间 |
| 识别准确率 | 88% | 在正常光线下的准确率 |
| CPU 占用 | 15-25% | 单核 CPU 占用率 |
| 内存占用 | 80-120MB | 包含模型和视频流 |
| 模型加载时间 | 1-2s | 首次加载时间 |

### 5.2 兼容性

| 浏览器 | 版本要求 | 支持情况 |
|--------|---------|---------|
| Chrome | ≥ 90 | ✅ 完全支持 |
| Edge | ≥ 90 | ✅ 完全支持 |
| Firefox | ≥ 88 | ✅ 完全支持 |
| Safari | ≥ 14 | ⚠️ 部分支持（需 HTTPS） |
| 移动端 | - | ⚠️ 性能受限 |

### 5.3 使用体验

- **优点**：
  - 无需额外硬件，仅需摄像头
  - 交互方式新颖，沉浸感强
  - 识别准确率高，延迟低
  - 支持多种手势，玩法丰富

- **不足**：
  - 对光线环境有一定要求
  - 长时间使用手臂会疲劳
  - 移动端性能受限
  - 需要摄像头权限

## 六、踩坑记录

### 6.1 摄像头镜像问题

**问题**：摄像头画面是镜像的，导致手势方向相反。

**解决**：在处理坐标时进行镜像翻转：

```typescript
const newPosition = { x: 1 - indexTip.x, y: indexTip.y } // 镜像 x 轴
```

### 6.2 手势识别抖动

**问题**：手势识别结果在相邻帧之间频繁切换，导致误触发。

**解决**：引入稳定性检查机制，要求手势连续识别 2 帧以上才认为稳定。

### 6.3 HTTPS 限制

**问题**：在 HTTP 环境下无法访问摄像头。

**解决**：提示用户使用 HTTPS 或 localhost 访问，或使用 Nuxt 的开发服务器（自动 HTTPS）。

### 6.4 模型加载失败

**问题**：在某些网络环境下，MediaPipe 模型文件加载失败。

**解决**：使用 CDN 加速，并添加重试机制。

### 6.5 手势误识别

**问题**：某些手势容易被误识别为其他手势（如食指指向被识别为双指并拢）。

**解决**：
1. 提高置信度阈值
2. 增加手指弯曲度判断
3. 调整手势优先级（竖大拇指优先于张开五指）

## 七、未来优化方向

### 7.1 手势库扩展

- 支持更多手势类型（如 OK 手势、爱心手势等）
- 支持双手手势识别
- 支持手势轨迹识别（如画圈、画线等）

### 7.2 性能优化

- 使用 WebAssembly 加速计算
- 实现手势预测，减少延迟
- 优化模型加载策略（预加载、缓存等）

### 7.3 用户体验

- 添加手势教学动画
- 提供手势灵敏度调节
- 支持自定义手势映射

### 7.4 跨平台支持

- 优化移动端性能
- 支持 VR/AR 设备
- 支持深度摄像头（如 Intel RealSense）

## 八、总结

本文详细介绍了如何使用 MediaPipe Hands 在 Web 端实现一套完整的手势识别系统，并将其应用到游戏交互中。通过**双层架构设计**，我们实现了识别层与应用层的解耦，使得系统具有良好的可扩展性和可维护性。

核心要点总结：

1. **技术选型**：MediaPipe Hands 是 Web 端手势识别的最佳选择
2. **架构设计**：双层架构（识别层 + 映射层）实现解耦
3. **识别算法**：基于 21 个关键点的手势识别算法
4. **稳定性优化**：稳定性检查、置信度过滤、冷却控制
5. **性能优化**：动态导入、CDN 加速、资源管理

手势识别技术为游戏交互带来了全新的可能性，但也面临着性能、准确性、易用性等挑战。希望本文能为你的项目提供参考和启发。

## 参考资料

- [MediaPipe Hands 官方文档](https://google.github.io/mediapipe/solutions/hands.html)
- [MediaPipe Hands JavaScript API](https://www.npmjs.com/package/@mediapipe/hands)
- [Web API - MediaDevices.getUserMedia()](https://developer.mozilla.org/zh-CN/docs/Web/API/MediaDevices/getUserMedia)
- [Nuxt 3 官方文档](https://nuxt.com/)

---

**项目地址**：[FingerSword - GitHub](https://github.com/TianYu0-0/FingerSword)
**在线体验**：[https://game.tsyewz.top](https://game.tsyewz.top)


如果觉得本文对你有帮助，欢迎点赞、收藏、关注！有任何问题欢迎在评论区讨论。
