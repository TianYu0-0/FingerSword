/**
 * 关卡敌人管理 - 封装敌人相关的通用逻辑
 *
 * @param levelState - 关卡状态（从 useLevel 获取）
 * @param levelConfig - 关卡配置（从 useLevel 获取）
 * @param damageEnemy - 伤害敌人函数
 * @param spawnEnemy - 生成敌人函数
 * @param updateEnemies - 更新敌人函数
 * @param updateTime - 更新时间函数
 */
export function useLevelEnemies(
  levelState: any,
  levelConfig: any,
  damageEnemy: (enemyId: string, damage: number) => boolean,
  spawnEnemy: (canvasWidth: number, canvasHeight: number) => any,
  updateEnemies: (deltaTime: number, canvasWidth: number, canvasHeight: number) => void,
  updateTime: (deltaTime: number) => void
) {
  // 敌人生成定时器
  let spawnTimer: ReturnType<typeof setInterval> | null = null
  let gameLoopTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 处理敌人被击中
   */
  const handleEnemyHit = (enemyId: string) => {
    console.log('[handleEnemyHit] 敌人被击中', {
      enemyId,
      isPlaying: levelState.value.isPlaying,
      hasEnemies: levelConfig.value?.enemies.maxCount > 0
    })

    if (levelState.value.isPlaying && levelConfig.value?.enemies.maxCount && levelConfig.value.enemies.maxCount > 0) {
      const killed = damageEnemy(enemyId, 100)  // 一击必杀
      console.log('[handleEnemyHit] 伤害结果:', killed ? '击杀' : '未击杀')
    } else {
      console.log('[handleEnemyHit] 条件不满足，未处理伤害')
    }
  }

  /**
   * 开始敌人生成循环
   */
  const startEnemySpawn = (canvasWidth: number, canvasHeight: number, onTimeUp?: () => void) => {
    console.log('[useLevelEnemies] 开始敌人生成', {
      isPlaying: levelState.value.isPlaying,
      isPaused: levelState.value.isPaused,
      maxCount: levelConfig.value?.enemies.maxCount
    })

    // 清理旧的定时器
    stopEnemySpawn()

    const needsEnemies = levelConfig.value?.enemies.maxCount && levelConfig.value.enemies.maxCount > 0

    // 即使不需要敌人，也要启动时间更新循环（用于剑阵修炼等关卡）
    const spawnInterval = levelConfig.value?.enemies.spawnInterval || 1500

    // 敌人生成定时器（只在需要敌人时启动）
    if (needsEnemies) {
      console.log('[useLevelEnemies] 启动敌人生成定时器，间隔:', spawnInterval)
      spawnTimer = setInterval(() => {
        if (levelState.value.isPlaying && !levelState.value.isPaused) {
          console.log('[useLevelEnemies] 生成敌人')
          spawnEnemy(canvasWidth, canvasHeight)
        }
      }, spawnInterval)
    }

    // 游戏循环定时器（所有关卡都需要）
    gameLoopTimer = setInterval(() => {
      if (levelState.value.isPlaying && !levelState.value.isPaused) {
        updateTime(0.1)

        // 如果有敌人，更新敌人位置
        if (needsEnemies) {
          updateEnemies(0.1, canvasWidth, canvasHeight)
        }

        // 检查时间是否到了
        if (levelState.value.timeRemaining <= 0) {
          onTimeUp?.()
        }
      }
    }, 100)
  }

  /**
   * 停止敌人生成循环
   */
  const stopEnemySpawn = () => {
    if (spawnTimer) {
      clearInterval(spawnTimer)
      spawnTimer = null
    }
    if (gameLoopTimer) {
      clearInterval(gameLoopTimer)
      gameLoopTimer = null
    }
  }

  return {
    handleEnemyHit,
    startEnemySpawn,
    stopEnemySpawn
  }
}
