<script setup lang="ts">
import GameCanvas from '~/components/game/GameCanvas.vue'
import { useGesture } from '~/composables/useGesture'
import { useGestureActions } from '~/composables/useGestureActions'
import { useTutorial } from '~/composables/useTutorial'
import { useLevel } from '~/composables/useLevel'

const route = useRoute()
const levelId = computed(() => route.query.level as string || null)
const isTutorialMode = computed(() => levelId.value === 'tutorial')
const isSlayMonsterMode = computed(() => levelId.value === 'slayMonster')

const showHelp = ref(false)
const showModeSelector = ref(false)
const controlMode = ref<'mouse' | 'gesture'>('gesture')  // 默认为手势模式
const showGesturePanel = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const gameCanvasRef = ref<InstanceType<typeof GameCanvas> | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

const { 
  isInitialized, 
  isLoading, 
  error,
  permissionStatus,
  gestureState,
  checkPermission,
  initialize,
  stop 
} = useGesture()

const {
  state: gestureActionState,
  setCallbacks,
  processGesture,
  reset: resetGestureActions
} = useGestureActions()

// 教程系统
const {
  state: tutorialState,
  currentStepData,
  progress: tutorialProgress,
  isComplete: isTutorialComplete,
  targetPosition,
  showTarget,
  startTutorial,
  skipTutorial,
  handleAction: handleTutorialAction,
  generateTarget
} = useTutorial()

// 关卡系统
const { 
  state: levelState,
  currentConfig: levelConfig,
  levelStatus, 
  startLevel, 
  endLevel,
  spawnEnemy,
  updateEnemies,
  checkHit,
  damageEnemy,
  updateTime
} = useLevel()

// 关卡结束状态
const showLevelResult = ref(false)
const levelResult = ref<{ score: number; kills: number; maxCombo: number; success: boolean } | null>(null)

// 敌人生成定时器
let spawnTimer: ReturnType<typeof setInterval> | null = null
let gameLoopTimer: ReturnType<typeof setInterval> | null = null

// 教程模式初始化
onMounted(() => {
  if (isTutorialMode.value) {
    startTutorial()
    startLevel('tutorial')
    nextTick(() => {
      generateTarget(window.innerWidth, window.innerHeight)
    })
  }

  // 御剑斩妖模式初始化
  if (isSlayMonsterMode.value) {
    startLevel('slayMonster')

    // 敌人生成定时器
    spawnTimer = setInterval(() => {
      if (levelState.value.isPlaying && !levelState.value.isPaused) {
        spawnEnemy(window.innerWidth, window.innerHeight)
      }
    }, 1500)

    // 游戏循环（更新时间和敌人）
    gameLoopTimer = setInterval(() => {
      if (levelState.value.isPlaying && !levelState.value.isPaused) {
        updateTime(0.1)  // 每100ms更新一次
        updateEnemies(0.1, window.innerWidth, window.innerHeight)  // 更新敌人位置

        // 检查时间是否结束
        if (levelState.value.timeRemaining <= 0) {
          handleLevelEnd()
        }
      }
    }, 100)
  }

  // 自动初始化手势模式
  if (controlMode.value === 'gesture') {
    showGesturePanel.value = true
    nextTick(async () => {
      if (videoRef.value) {
        const success = await initialize(videoRef.value)
        if (success) {
          setupGestureCallbacks()
        }
      }
    })
  }
})

// 关卡结束处理
const handleLevelEnd = () => {
  const result = endLevel(levelState.value.score >= (levelConfig.value?.targetScore || 0))
  levelResult.value = result
  showLevelResult.value = true
  
  // 清理定时器
  if (spawnTimer) clearInterval(spawnTimer)
  if (gameLoopTimer) clearInterval(gameLoopTimer)
}

// 敌人被击中处理
const handleEnemyHit = (enemyId: string) => {
  if (isSlayMonsterMode.value) {
    damageEnemy(enemyId, 100)  // 一击必杀
  }
}

// 重试关卡
const retryLevel = () => {
  showLevelResult.value = false
  levelResult.value = null
  
  if (isSlayMonsterMode.value) {
    startLevel('slayMonster')
    
    spawnTimer = setInterval(() => {
      if (levelState.value.isPlaying && !levelState.value.isPaused) {
        spawnEnemy(window.innerWidth, window.innerHeight)
      }
    }, 1500)
    
    gameLoopTimer = setInterval(() => {
      if (levelState.value.isPlaying && !levelState.value.isPaused) {
        updateTime(0.1)
        updateEnemies(0.1, window.innerWidth, window.innerHeight)
        if (levelState.value.timeRemaining <= 0) {
          handleLevelEnd()
        }
      }
    }, 100)
  }
}

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer)
  if (gameLoopTimer) clearInterval(gameLoopTimer)
})

// 监听教程完成，解锁下一关
watch(isTutorialComplete, (complete) => {
  if (complete && isTutorialMode.value) {
    console.log('[game] 教程完成，解锁下一关')
    endLevel(true)  // 标记教程关卡完成，解锁下一关
  }
})

// 控制模式图标
const modeIcons = {
  mouse: '🖱️',
  gesture: '✋'
}

const modeNames = {
  mouse: '鼠标模式',
  gesture: '手势模式'
}

// 手势类型中文映射
const gestureNames: Record<string, string> = {
  pointing: '食指指向',
  fist: '握拳',
  palm: '张开手掌',
  thumbsUp: '竖大拇指',
  twoFingers: '双指并拢',
  none: '无手势'
}

// 动作类型中文映射
const actionNames: Record<string, string> = {
  move: '移动',
  slash: '斩击',
  charge: '蓄力中',
  release: '释放蓄力',
  gather: '聚剑',
  swordRain: '万剑齐发',
  wave: '剑气波',
  thrust: '突刺',
  sweep: '横扫',
  none: '无'
}

// 设置手势动作回调
const setupGestureCallbacks = () => {
  if (!gameCanvasRef.value) {
    console.error('[game] gameCanvasRef 为空，无法设置手势回调')
    return
  }

  setCallbacks({
    onMove: (x: number, y: number) => {
      // 更新剑的位置
      gameCanvasRef.value?.updatePosition(x, y)

      // 教程模式：发射移动事件
      if (isTutorialMode.value) {
        handleTutorialAction('move', { x, y })
      }
    },
    onSlash: () => {
      // 触发斩击
      gameCanvasRef.value?.onMouseDown(new MouseEvent('mousedown', { button: 0 }))
      setTimeout(() => {
        gameCanvasRef.value?.onMouseUp(new MouseEvent('mouseup', { button: 0 }))
      }, 50)

      // 教程模式：发射斩击事件
      if (isTutorialMode.value) {
        handleTutorialAction('slash')
      }
    },
    onCharge: (chargeLevel: number) => {
      // 握拳 -> 开始蓄力（模拟鼠标左键按住）
      console.log('[game] 开始蓄力')
      gameCanvasRef.value?.onMouseDown(new MouseEvent('mousedown', { button: 0 }))

      // 教程模式：发射蓄力事件
      if (isTutorialMode.value) {
        handleTutorialAction('charge', { chargeLevel })
      }
    },
    onRelease: (chargeLevel: number) => {
      // 张开手掌 -> 释放蓄力（模拟鼠标左键松开）
      console.log('[game] 释放蓄力:', chargeLevel)
      gameCanvasRef.value?.onMouseUp(new MouseEvent('mouseup', { button: 0 }))
    },
    onGather: () => {
      // 开始聚剑
      gameCanvasRef.value?.onRightMouseDown()
    },
    onSwordRain: () => {
      // 万剑齐发
      gameCanvasRef.value?.onRightMouseUp()
    },
    onWave: () => {
      // 剑气波
      gameCanvasRef.value?.wave()
    },
    onThrust: () => {
      // 突刺
      gameCanvasRef.value?.onDoubleClick()

      // 教程模式：发射突刺事件
      if (isTutorialMode.value) {
        handleTutorialAction('thrust')
      }
    },
    onSweep: () => {
      // 横扫
      gameCanvasRef.value?.sweep()
    }
  })

  console.log('[game] 手势回调已设置')
}

// 选择控制模式
const selectControlMode = async (mode: 'mouse' | 'gesture') => {
  console.log('[game] selectControlMode:', mode)

  // 如果从手势模式切换出去，停止手势识别
  if (controlMode.value === 'gesture' && mode !== 'gesture') {
    stop()
    showGesturePanel.value = false
    resetGestureActions()
  }

  // 如果切换到手势模式
  if (mode === 'gesture') {
    showGesturePanel.value = true
    // 等待 DOM 更新后再初始化
    await nextTick()
    console.log('[game] videoRef.value:', videoRef.value)
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      console.log('[game] initialize result:', success)
      if (success) {
        controlMode.value = mode
        // 设置手势回调
        setupGestureCallbacks()
      }
    } else {
      console.error('[game] videoRef 为空，无法初始化手势识别')
    }
  } else {
    controlMode.value = mode
  }

  showModeSelector.value = false
}

// 切换手势控制
const toggleGestureControl = async () => {
  if (controlMode.value === 'gesture') {
    controlMode.value = 'mouse'
    showGesturePanel.value = false
    stop()
    resetGestureActions()
  } else {
    showGesturePanel.value = true
    await nextTick()
    if (videoRef.value) {
      const success = await initialize(videoRef.value)
      if (success) {
        controlMode.value = 'gesture'
        // 设置手势回调
        setupGestureCallbacks()
      }
    }
  }
}

// 关闭手势面板
const closeGesturePanel = () => {
  showGesturePanel.value = false
  if (controlMode.value === 'gesture') {
    controlMode.value = 'mouse'
    stop()
    resetGestureActions()
  }
}

// 手势状态变化时处理动作
watch(gestureState, (newState) => {
  if (controlMode.value === 'gesture' && isInitialized.value) {
    // 获取实际画布尺寸
    let canvasWidth = window.innerWidth
    let canvasHeight = window.innerHeight

    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      canvasWidth = rect.width
      canvasHeight = rect.height
    }

    processGesture(newState, canvasWidth, canvasHeight)
  }
}, { deep: true })
</script>

<template>
  <div ref="containerRef" class="game-container">
    <GameCanvas 
      ref="gameCanvasRef" 
      class="canvas-layer" 
      :gesture-mode="controlMode === 'gesture'"
      :tutorial-mode="isTutorialMode"
      :level-mode="isSlayMonsterMode"
      :enemies="levelState.enemies"
      :target-position="targetPosition"
      :show-target="showTarget"
      @sword-move="(pos: { x: number; y: number }) => handleTutorialAction('move', pos)"
      @sword-slash="() => handleTutorialAction('slash')"
      @sword-charge="(data: { chargeLevel: number }) => handleTutorialAction('charge', data)"
      @sword-thrust="() => handleTutorialAction('thrust')"
      @enemy-hit="handleEnemyHit"
    />
    
    <!-- 教程引导面板 -->
    <div v-if="isTutorialMode && tutorialState.isActive && !isTutorialComplete" class="tutorial-overlay">
      <div class="tutorial-panel ink-card">
        <div class="tutorial-progress">
          <div class="progress-bar" :style="{ width: `${tutorialProgress * 100}%` }"></div>
        </div>
        <div class="tutorial-step">
          <h3 class="step-title">{{ currentStepData?.title }}</h3>
          <p class="step-description">{{ currentStepData?.description }}</p>
          <p class="step-instruction">💡 {{ currentStepData?.instruction }}</p>
        </div>
        <button class="skip-btn" @click="skipTutorial">跳过教学</button>
      </div>
    </div>
    
    <!-- 教程完成面板 -->
    <div v-if="isTutorialMode && isTutorialComplete" class="tutorial-complete-overlay">
      <div class="complete-panel ink-card">
        <h2>🎉 恭喜少侠，御剑入门！</h2>
        <p>你已掌握以下技能：</p>
        <ul class="skill-list">
          <li>✅ 御剑初成 - 控制剑移动</li>
          <li>✅ 剑气凌厉 - 释放剑气斩击</li>
          <li>✅ 气贯长虹 - 蓄力强力斩</li>
          <li>✅ 瞬影突刺 - 瞬移突刺</li>
        </ul>
        <NuxtLink to="/levels" class="continue-btn ink-card">进入江湖</NuxtLink>
      </div>
    </div>
    
    <!-- 御剑斩妖关卡UI -->
    <div v-if="isSlayMonsterMode && levelState.isPlaying" class="level-hud">
      <div class="hud-item time">
        <span class="hud-label">⏱️</span>
        <span class="hud-value">{{ Math.ceil(levelState.timeRemaining) }}s</span>
      </div>
      <div class="hud-item score">
        <span class="hud-label">🎯</span>
        <span class="hud-value">{{ levelState.score }}</span>
      </div>
      <div class="hud-item kills">
        <span class="hud-label">💀</span>
        <span class="hud-value">{{ levelState.kills }}</span>
      </div>
      <div class="hud-item combo" v-if="levelState.combo > 1">
        <span class="hud-value combo-text">{{ levelState.combo }}连击!</span>
      </div>
    </div>
    
    <!-- 关卡结算面板 -->
    <div v-if="showLevelResult" class="level-result-overlay">
      <div class="result-panel ink-card">
        <h2 :class="levelResult?.success ? 'success' : 'fail'">
          {{ levelResult?.success ? '🎉 关卡通过！' : '💔 挑战失败' }}
        </h2>
        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-label">得分</span>
            <span class="stat-value">{{ levelResult?.score }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">击杀</span>
            <span class="stat-value">{{ levelResult?.kills }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最高连击</span>
            <span class="stat-value">{{ levelResult?.maxCombo }}</span>
          </div>
        </div>
        <div class="result-actions">
          <NuxtLink to="/levels" class="result-btn ink-card">返回关卡</NuxtLink>
          <button class="result-btn ink-card retry" @click="retryLevel">再来一次</button>
        </div>
      </div>
    </div>
    
    <header class="game-header">
      <NuxtLink to="/" class="back-btn ink-card">← 返回</NuxtLink>
      <div class="header-right">
        <div class="mode-selector-wrapper">
          <button 
            class="mode-btn ink-card" 
            @click="showModeSelector = !showModeSelector"
          >
            {{ modeIcons[controlMode] }}
          </button>
          <Transition name="slide">
            <div v-if="showModeSelector" class="mode-dropdown ink-card">
              <button
                v-for="mode in ['mouse', 'gesture'] as const"
                :key="mode"
                class="mode-option"
                :class="{ active: controlMode === mode }"
                @click="selectControlMode(mode)"
              >
                <span class="mode-icon">{{ modeIcons[mode] }}</span>
                <span class="mode-name">{{ modeNames[mode] }}</span>
              </button>
            </div>
          </Transition>
        </div>
        <button class="help-btn ink-card" @click="showHelp = !showHelp">?</button>
      </div>
    </header>
    
    <!-- 手势控制面板 -->
    <Transition name="fade">
      <div v-if="showGesturePanel" class="gesture-panel ink-card">
        <h3 class="panel-title">手势控制</h3>
        
        <!-- 权限引导 -->
        <div v-if="permissionStatus === 'denied'" class="permission-guide">
          <div class="permission-icon">🚫</div>
          <p class="permission-title">摄像头权限被拒绝</p>
          <p class="permission-desc">请按以下步骤开启：</p>
          <ol class="permission-steps">
            <li>点击浏览器地址栏左侧的 🔒 图标</li>
            <li>找到"摄像头"选项</li>
            <li>选择"允许"</li>
            <li>刷新页面重试</li>
          </ol>
        </div>
        
        <!-- 摄像头预览 -->
        <div v-else class="camera-preview">
          <video ref="videoRef" class="gesture-video" autoplay playsinline muted />
          <div v-if="isLoading" class="gesture-status loading">
            <span class="loading-spinner"></span>
            正在初始化摄像头...
          </div>
          <div v-else-if="error" class="gesture-status error">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
          <div v-else-if="isInitialized" class="gesture-status success">
            <span class="success-icon">✓</span>
            <div class="status-info">
              <div class="status-row">
                <span class="status-label">手势:</span>
                <span class="status-value" :class="gestureState.type !== 'none' ? 'active' : ''">
                  {{ gestureNames[gestureState.type] || gestureState.type }}
                </span>
              </div>
              <div class="status-row">
                <span class="status-label">置信度:</span>
                <span class="status-value">{{ (gestureState.confidence * 100).toFixed(0) }}%</span>
                <div class="confidence-bar">
                  <div class="confidence-fill" :style="{ width: `${gestureState.confidence * 100}%` }"></div>
                </div>
              </div>
              <div class="status-row" v-if="gestureState.type !== 'none'">
                <span class="status-label">位置:</span>
                <span class="status-value">
                  ({{ (gestureState.position.x * 100).toFixed(0) }}, {{ (gestureState.position.y * 100).toFixed(0) }})
                </span>
              </div>
              <div class="status-row" v-if="gestureActionState.currentAction !== 'none'">
                <span class="status-label">动作:</span>
                <span class="status-value action">{{ actionNames[gestureActionState.currentAction] || gestureActionState.currentAction }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="gesture-tips">
          <p>👆 食指指向 - 控制剑位置</p>
          <p>✌️ 双指并拢保持3秒 - 聚剑</p>
          <p>✌️ 结束双指并拢 - 万剑齐发</p>
          <p>✊ 握拳保持3秒 - 开始蓄力</p>
          <p>🖐️ 张开手掌 - 释放蓄力</p>
        </div>
        <button class="close-btn" @click="closeGesturePanel">关闭</button>
      </div>
    </Transition>
    
    <Transition name="fade">
      <div v-if="showHelp" class="help-panel ink-card">
        <h3 class="help-title">操作说明</h3>

        <!-- 鼠标模式操作说明 -->
        <ul v-if="controlMode === 'mouse'" class="help-list">
          <li><span class="highlight">移动鼠标</span> - 控制剑的位置</li>
          <li><span class="highlight">左键单击</span> - 剑气斩击</li>
          <li><span class="highlight">左键长按</span> - 蓄力斩</li>
          <li><span class="highlight">右键长按</span> - 聚剑</li>
          <li><span class="highlight">右键松开</span> - 万剑齐发</li>
        </ul>

        <!-- 手势模式操作说明 -->
        <ul v-else-if="controlMode === 'gesture'" class="help-list">
          <li><span class="highlight">👆 食指指向</span> - 控制剑位置</li>
          <li><span class="highlight">✌️ 双指并拢保持3秒</span> - 聚剑</li>
          <li><span class="highlight">✌️ 结束双指并拢</span> - 万剑齐发</li>
          <li><span class="highlight">✊ 握拳保持3秒</span> - 开始蓄力</li>
          <li><span class="highlight">🖐️ 张开手掌</span> - 释放蓄力</li>
        </ul>

        <button class="close-btn" @click="showHelp = false">关闭</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #F5F0E6;
}

.canvas-layer {
  position: absolute;
  inset: 0;
}

.game-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
}

.back-btn, .help-btn {
  pointer-events: auto;
  color: #1A1A1A;
  text-decoration: none;
  transition: background-color 0.2s;
}

.back-btn {
  padding: 0.5rem 1rem;
}

.back-btn:hover, .help-btn:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.help-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  border: none;
}

.help-panel {
  position: absolute;
  top: 5rem;
  right: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 16rem;
}

.help-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.125rem;
  color: #1A1A1A;
  margin-bottom: 0.75rem;
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-list li {
  font-size: 0.875rem;
  color: #6B6B6B;
  margin-bottom: 0.5rem;
}

.highlight {
  color: #C41E3A;
}

.close-btn {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: rgba(107, 107, 107, 0.5);
  background: none;
  border: none;
  cursor: pointer;
}

.close-btn:hover {
  color: #1A1A1A;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.mode-selector-wrapper {
  position: relative;
  pointer-events: auto;
}

.mode-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.mode-btn:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.mode-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  padding: 0.5rem;
  min-width: 140px;
  z-index: 30;
}

.mode-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.mode-option:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.mode-option.active {
  background-color: rgba(196, 30, 58, 0.1);
  color: #C41E3A;
}

.mode-icon {
  font-size: 1.25rem;
}

.mode-name {
  font-size: 0.875rem;
  color: #1A1A1A;
}

.mode-option.active .mode-name {
  color: #C41E3A;
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.gesture-panel {
  position: absolute;
  top: 5rem;
  left: 1rem;
  z-index: 20;
  padding: 1rem;
  width: 280px;
}

.panel-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.125rem;
  color: #1A1A1A;
  margin-bottom: 0.75rem;
}

.gesture-video {
  width: 100%;
  height: 180px;
  background: #000;
  border-radius: 4px;
  object-fit: cover;
  transform: scaleX(-1);
}

.gesture-status {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #6B6B6B;
  text-align: center;
}

.gesture-status.error {
  color: #C41E3A;
}

.gesture-status.success {
  color: #2E7D32;
}

.status-info {
  margin-top: 0.5rem;
  text-align: left;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.25rem 0;
  font-size: 0.75rem;
}

.status-label {
  color: #6B6B6B;
  min-width: 50px;
}

.status-value {
  color: #1A1A1A;
  font-weight: 500;
}

.status-value.active {
  color: #2E7D32;
  font-weight: 600;
}

.status-value.action {
  color: #C41E3A;
  font-weight: 600;
  text-transform: uppercase;
}

.confidence-bar {
  flex: 1;
  height: 4px;
  background: rgba(107, 107, 107, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: linear-gradient(90deg, #C41E3A, #2E7D32);
  transition: width 0.2s ease;
}

.gesture-tips {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: #6B6B6B;
}

.gesture-tips p {
  margin: 0.25rem 0;
}

/* 权限引导样式 */
.permission-guide {
  text-align: center;
  padding: 1rem 0;
}

.permission-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.permission-title {
  font-size: 1rem;
  font-weight: bold;
  color: #C41E3A;
  margin-bottom: 0.5rem;
}

.permission-desc {
  font-size: 0.875rem;
  color: #6B6B6B;
  margin-bottom: 0.5rem;
}

.permission-steps {
  text-align: left;
  font-size: 0.75rem;
  color: #6B6B6B;
  padding-left: 1.5rem;
  margin: 0;
}

.permission-steps li {
  margin: 0.25rem 0;
}

.camera-preview {
  position: relative;
}

.gesture-status.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(107, 107, 107, 0.3);
  border-top-color: #6B6B6B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon, .success-icon {
  margin-right: 0.25rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 教程引导样式 */
.tutorial-overlay {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.tutorial-panel {
  padding: 20px 30px;
  text-align: center;
  pointer-events: auto;
  min-width: 300px;
}

.tutorial-progress {
  height: 4px;
  background: rgba(107, 107, 107, 0.2);
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #d4a574, #C41E3A);
  transition: width 0.3s ease;
}

.step-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 24px;
  color: #d4a574;
  margin: 0 0 8px 0;
}

.step-description {
  font-size: 14px;
  color: #999;
  margin: 0 0 12px 0;
}

.step-instruction {
  font-size: 16px;
  color: #f5f5f5;
  margin: 0;
  padding: 12px;
  background: rgba(212, 165, 116, 0.1);
  border-radius: 8px;
}

.skip-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(107, 107, 107, 0.3);
  color: #6B6B6B;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.skip-btn:hover {
  border-color: rgba(196, 30, 58, 0.5);
  color: #C41E3A;
}

/* 教程完成面板 */
.tutorial-complete-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
}

.complete-panel {
  padding: 40px 60px;
  text-align: center;
}

.complete-panel h2 {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 32px;
  color: #d4a574;
  margin: 0 0 16px 0;
}

.complete-panel p {
  color: #999;
  margin: 0 0 16px 0;
}

.skill-list {
  list-style: none;
  padding: 0;
  margin: 0 0 24px 0;
  text-align: left;
}

.skill-list li {
  padding: 8px 0;
  color: #f5f5f5;
  font-size: 14px;
}

.continue-btn {
  display: inline-block;
  padding: 12px 32px;
  font-size: 16px;
  text-decoration: none;
  color: #d4a574;
}

/* 关卡HUD */
.level-hud {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 24px;
  z-index: 100;
}

.hud-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(212, 165, 116, 0.3);
}

.hud-label {
  font-size: 18px;
}

.hud-value {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 20px;
  color: #f5f5f5;
}

.hud-item.time .hud-value {
  color: #FFD700;
}

.hud-item.combo {
  background: rgba(196, 30, 58, 0.8);
  border-color: #C41E3A;
}

.combo-text {
  color: #FFD700;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 关卡结算面板 */
.level-result-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 300;
}

.result-panel {
  padding: 40px 60px;
  text-align: center;
  min-width: 360px;
}

.result-panel h2 {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 32px;
  margin: 0 0 24px 0;
}

.result-panel h2.success {
  color: #4CAF50;
}

.result-panel h2.fail {
  color: #C41E3A;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 14px;
  color: #999;
  margin-bottom: 4px;
}

.stat-value {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 28px;
  color: #d4a574;
}

.result-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.result-btn {
  padding: 12px 24px;
  font-size: 16px;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: none;
}

.result-btn.retry {
  color: #4CAF50;
}
</style>
