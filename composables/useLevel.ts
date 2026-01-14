import type { Vector2D } from '~/types/game'

export type LevelId = 'tutorial' | 'slayMonster' | 'swordTrail' | 'swordRain' | 'swordShield'

export type LevelStatus = 'locked' | 'unlocked' | 'completed'

export type LevelDifficulty = 1 | 2 | 3 | 4 | 5

export type Enemy = {
  id: string
  type: 'monster' | 'target' | 'projectile'
  position: Vector2D
  size: number
  health: number
  maxHealth: number
  speed: number
  direction: Vector2D
  isAlive: boolean
  spawnTime: number
  imageIndex?: number  // 小怪图片索引（0-4）
}

export type LevelConfig = {
  id: LevelId
  name: string
  description: string
  difficulty: LevelDifficulty
  duration: number  // 秒，0 表示无限制
  targetScore: number
  enemies: {
    types: Enemy['type'][]
    spawnInterval: number  // 毫秒
    maxCount: number
  }
  trail?: {
    points: Vector2D[]  // 轨迹路径点
    width: number  // 轨迹宽度
    loop: boolean  // 是否循环
  }
}

export type LevelState = {
  currentLevel: LevelId | null
  isPlaying: boolean
  isPaused: boolean
  score: number
  combo: number
  maxCombo: number
  kills: number
  timeRemaining: number
  enemies: Enemy[]
  startTime: number
}

const STORAGE_KEY = 'finger-sword-level-status'

// 从 localStorage 读取关卡状态
const loadLevelStatus = (): Record<LevelId, LevelStatus> => {
  if (typeof window === 'undefined') {
    return {
      tutorial: 'unlocked',
      slayMonster: 'locked',
      swordTrail: 'locked',
      swordRain: 'locked',
      swordShield: 'locked'
    }
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('[useLevel] 读取存储失败:', e)
  }
  
  return {
    tutorial: 'unlocked',
    slayMonster: 'locked',
    swordTrail: 'locked',
    swordRain: 'locked',
    swordShield: 'locked'
  }
}

// 保存关卡状态到 localStorage
const saveLevelStatus = (status: Record<LevelId, LevelStatus>) => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
    console.log('[useLevel] 关卡状态已保存:', status)
  } catch (e) {
    console.error('[useLevel] 保存存储失败:', e)
  }
}

let generateId = () => Math.random().toString(36).substr(2, 9)

// 生成圆形轨迹
const generateCircleTrail = (centerX: number, centerY: number, radius: number, pointCount: number): Vector2D[] => {
  const points: Vector2D[] = []
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius
    })
  }
  return points
}

// 生成S形轨迹
const generateSTrail = (startX: number, startY: number, width: number, height: number, pointCount: number): Vector2D[] => {
  const points: Vector2D[] = []
  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1)
    const x = startX + t * width
    const y = startY + Math.sin(t * Math.PI * 2) * height / 2
    points.push({ x, y })
  }
  return points
}

const levelConfigs: Record<LevelId, LevelConfig> = {
  tutorial: {
    id: 'tutorial',
    name: '御剑入门',
    description: '学习基本操作，熟悉剑的控制',
    difficulty: 1,
    duration: 0,
    targetScore: 0,
    enemies: { types: ['target'], spawnInterval: 0, maxCount: 0 }
  },
  slayMonster: {
    id: 'slayMonster',
    name: '御剑斩妖',
    description: '屏幕随机出现妖怪，限时击杀',
    difficulty: 2,
    duration: 60,
    targetScore: 500,
    enemies: { types: ['monster'], spawnInterval: 1500, maxCount: 5 }
  },
  swordTrail: {
    id: 'swordTrail',
    name: '剑阵修炼',
    description: '沿轨迹划动，练习精准控制',
    difficulty: 2,
    duration: 90,
    targetScore: 800,
    enemies: { types: ['target'], spawnInterval: 0, maxCount: 0 },
    trail: {
      points: generateCircleTrail(
        typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
        typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
        150,
        60
      ),  // 圆形轨迹，动态居中
      width: 40,
      loop: true
    }
  },
  swordRain: {
    id: 'swordRain',
    name: '万剑归宗',
    description: '聚剑后瞄准目标万剑齐发',
    difficulty: 3,
    duration: 90,
    targetScore: 1000,
    enemies: { types: ['monster'], spawnInterval: 2000, maxCount: 8 }
  },
  swordShield: {
    id: 'swordShield',
    name: '万剑护体',
    description: '剑阵环绕，抵挡攻击',
    difficulty: 4,
    duration: 120,
    targetScore: 1500,
    enemies: { types: ['monster'], spawnInterval: 800, maxCount: 10 }
  }
}

export function useLevel() {
  const state = ref<LevelState>({
    currentLevel: null,
    isPlaying: false,
    isPaused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    kills: 0,
    timeRemaining: 0,
    enemies: [],
    startTime: 0
  })

  const levelStatus = ref<Record<LevelId, LevelStatus>>(loadLevelStatus())

  const currentConfig = computed(() => {
    if (!state.value.currentLevel) return null
    return levelConfigs[state.value.currentLevel]
  })

  // 开始关卡
  const startLevel = (levelId: LevelId) => {
    const config = levelConfigs[levelId]
    if (!config) return false

    state.value = {
      currentLevel: levelId,
      isPlaying: true,
      isPaused: false,
      score: 0,
      combo: 0,
      maxCombo: 0,
      kills: 0,
      timeRemaining: config.duration,
      enemies: [],
      startTime: Date.now()
    }

    console.log('[useLevel] 开始关卡:', levelId)
    return true
  }

  // 暂停关卡
  const pauseLevel = () => {
    state.value.isPaused = true
  }

  // 继续关卡
  const resumeLevel = () => {
    state.value.isPaused = false
  }

  // 结束关卡
  const endLevel = (success: boolean) => {
    state.value.isPlaying = false
    
    if (success && state.value.currentLevel) {
      levelStatus.value[state.value.currentLevel] = 'completed'
      
      // 解锁下一关
      const levels: LevelId[] = ['tutorial', 'slayMonster', 'swordTrail', 'swordRain', 'swordShield']
      const currentIndex = levels.indexOf(state.value.currentLevel)
      if (currentIndex < levels.length - 1) {
        const nextLevel = levels[currentIndex + 1]
        if (levelStatus.value[nextLevel] === 'locked') {
          levelStatus.value[nextLevel] = 'unlocked'
        }
      }
      
      // 保存到 localStorage
      saveLevelStatus(levelStatus.value)
    }

    console.log('[useLevel] 关卡结束:', success ? '成功' : '失败', '得分:', state.value.score)
    return {
      score: state.value.score,
      kills: state.value.kills,
      maxCombo: state.value.maxCombo,
      success
    }
  }

  // 生成敌人
  const spawnEnemy = (canvasWidth: number, canvasHeight: number) => {
    const config = currentConfig.value
    if (!config || config.enemies.maxCount === 0) return null
    if (state.value.enemies.length >= config.enemies.maxCount) return null

    const type = config.enemies.types[Math.floor(Math.random() * config.enemies.types.length)]
    
    // 从屏幕边缘生成
    const side = Math.floor(Math.random() * 4)
    let x: number, y: number, dirX: number, dirY: number
    
    switch (side) {
      case 0: // 上
        x = Math.random() * canvasWidth
        y = -50
        dirX = (Math.random() - 0.5) * 0.5
        dirY = 1
        break
      case 1: // 右
        x = canvasWidth + 50
        y = Math.random() * canvasHeight
        dirX = -1
        dirY = (Math.random() - 0.5) * 0.5
        break
      case 2: // 下
        x = Math.random() * canvasWidth
        y = canvasHeight + 50
        dirX = (Math.random() - 0.5) * 0.5
        dirY = -1
        break
      default: // 左
        x = -50
        y = Math.random() * canvasHeight
        dirX = 1
        dirY = (Math.random() - 0.5) * 0.5
    }

    const enemy: Enemy = {
      id: generateId(),
      type,
      position: { x, y },
      size: type === 'monster' ? 60 : type === 'projectile' ? 20 : 40,
      health: type === 'monster' ? 100 : 50,
      maxHealth: type === 'monster' ? 100 : 50,
      speed: type === 'projectile' ? 300 : 80,
      direction: { x: dirX, y: dirY },
      isAlive: true,
      spawnTime: Date.now(),
      imageIndex: type === 'monster' ? Math.floor(Math.random() * 5) : undefined  // 随机选择0-4的图片
    }

    state.value.enemies.push(enemy)
    return enemy
  }

  // 更新敌人位置
  const updateEnemies = (deltaTime: number, canvasWidth: number, canvasHeight: number) => {
    state.value.enemies.forEach(enemy => {
      if (!enemy.isAlive) return

      // 移动
      enemy.position.x += enemy.direction.x * enemy.speed * deltaTime
      enemy.position.y += enemy.direction.y * enemy.speed * deltaTime

      // 检查是否出界
      const margin = 100
      if (
        enemy.position.x < -margin ||
        enemy.position.x > canvasWidth + margin ||
        enemy.position.y < -margin ||
        enemy.position.y > canvasHeight + margin
      ) {
        enemy.isAlive = false
      }
    })

    // 移除死亡敌人
    state.value.enemies = state.value.enemies.filter(e => e.isAlive)
  }

  // 检查剑与敌人碰撞
  const checkHit = (swordPosition: Vector2D, swordSize: number): Enemy | null => {
    for (const enemy of state.value.enemies) {
      if (!enemy.isAlive) continue

      const dx = enemy.position.x - swordPosition.x
      const dy = enemy.position.y - swordPosition.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < (enemy.size + swordSize) / 2) {
        return enemy
      }
    }
    return null
  }

  // 伤害敌人
  const damageEnemy = (enemyId: string, damage: number) => {
    const enemy = state.value.enemies.find(e => e.id === enemyId)
    if (!enemy || !enemy.isAlive) return false

    enemy.health -= damage

    if (enemy.health <= 0) {
      enemy.isAlive = false
      state.value.kills++
      state.value.combo++
      state.value.maxCombo = Math.max(state.value.maxCombo, state.value.combo)
      
      // 计分
      const baseScore = enemy.type === 'monster' ? 100 : 50
      const comboBonus = Math.floor(state.value.combo * 0.1 * baseScore)
      state.value.score += baseScore + comboBonus

      return true
    }

    return false
  }

  // 重置连击
  const resetCombo = () => {
    state.value.combo = 0
  }

  // 更新时间
  const updateTime = (deltaTime: number) => {
    if (!state.value.isPlaying || state.value.isPaused) return

    const config = currentConfig.value
    if (!config || config.duration === 0) return

    state.value.timeRemaining -= deltaTime

    if (state.value.timeRemaining <= 0) {
      state.value.timeRemaining = 0
      endLevel(state.value.score >= config.targetScore)
    }
  }

  // 增加分数
  const addScore = (score: number) => {
    state.value.score += score
  }

  // 获取关卡列表
  const getLevelList = () => {
    return Object.values(levelConfigs).map(config => ({
      ...config,
      status: levelStatus.value[config.id]
    }))
  }

  return {
    state: readonly(state),
    levelStatus: readonly(levelStatus),
    currentConfig,
    startLevel,
    pauseLevel,
    resumeLevel,
    endLevel,
    spawnEnemy,
    updateEnemies,
    checkHit,
    damageEnemy,
    resetCombo,
    updateTime,
    addScore,
    getLevelList
  }
}
