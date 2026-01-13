<script setup lang="ts">
import { useLevel } from '~/composables/useLevel'

const { getLevelList } = useLevel()
const levels = getLevelList()

const difficultyStars = (difficulty: number) => '⭐'.repeat(difficulty)

const statusText = (status: string) => {
  switch (status) {
    case 'locked': return '🔒 未解锁'
    case 'unlocked': return '可挑战'
    case 'completed': return '✅ 已通关'
    default: return ''
  }
}

const statusClass = (status: string) => {
  switch (status) {
    case 'locked': return 'status-locked'
    case 'unlocked': return 'status-unlocked'
    case 'completed': return 'status-completed'
    default: return ''
  }
}
</script>

<template>
  <div class="levels-container">
    <header class="levels-header">
      <NuxtLink to="/" class="back-btn ink-card">← 返回</NuxtLink>
      <h1 class="page-title">关卡选择</h1>
    </header>

    <div class="levels-grid">
      <NuxtLink
        v-for="level in levels"
        :key="level.id"
        :to="level.status !== 'locked' ? `/game?level=${level.id}` : '#'"
        class="level-card ink-card"
        :class="[statusClass(level.status), { disabled: level.status === 'locked' }]"
      >
        <div class="level-header">
          <span class="level-difficulty">{{ difficultyStars(level.difficulty) }}</span>
          <span class="level-status" :class="statusClass(level.status)">
            {{ statusText(level.status) }}
          </span>
        </div>
        
        <h2 class="level-name">{{ level.name }}</h2>
        <p class="level-description">{{ level.description }}</p>
        
        <div class="level-info">
          <span v-if="level.duration > 0" class="level-duration">
            ⏱️ {{ level.duration }}秒
          </span>
          <span v-if="level.targetScore > 0" class="level-target">
            🎯 目标: {{ level.targetScore }}分
          </span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.levels-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
  padding: 20px;
}

.levels-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 40px;
}

.back-btn {
  padding: 10px 20px;
  font-size: 16px;
  text-decoration: none;
}

.page-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 36px;
  color: #d4a574;
  margin: 0;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.level-card {
  padding: 24px;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
}

.level-card:hover:not(.disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(212, 165, 116, 0.3);
}

.level-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.level-difficulty {
  font-size: 14px;
}

.level-status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.status-locked {
  color: #666;
  background: rgba(102, 102, 102, 0.2);
}

.status-unlocked {
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.2);
}

.status-completed {
  color: #FFD700;
  background: rgba(255, 215, 0, 0.2);
}

.level-name {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 24px;
  color: #f5f5f5;
  margin: 0 0 8px 0;
}

.level-description {
  font-size: 14px;
  color: #999;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.level-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #888;
}

.level-duration,
.level-target {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
