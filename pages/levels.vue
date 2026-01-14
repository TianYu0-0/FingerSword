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
      <h1 class="page-title ink-title">关卡选择</h1>
    </header>

    <div class="levels-grid">
      <NuxtLink
        v-for="level in levels"
        :key="level.id"
        :to="level.status !== 'locked' ? (level.id === 'tutorial' ? '/tutorial' : `/game?level=${level.id}`) : '#'"
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
  background-color: #F5F0E6;
  padding: 2rem;
}

.levels-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
}

.back-btn {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  text-decoration: none;
  color: #1A1A1A;
  transition: all 0.2s;
}

.back-btn:hover {
  background-color: rgba(107, 107, 107, 0.1);
}

.page-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 2.5rem;
  color: #1A1A1A;
  margin: 0;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.level-card {
  padding: 1.5rem;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.level-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(196, 30, 58, 0.05) 0%, rgba(46, 74, 98, 0.05) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.level-card:hover:not(.disabled)::before {
  opacity: 1;
}

.level-card:hover:not(.disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(26, 26, 26, 0.15);
}

.level-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.level-card.disabled::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(107, 107, 107, 0.05) 10px,
    rgba(107, 107, 107, 0.05) 20px
  );
  pointer-events: none;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.level-difficulty {
  font-size: 1rem;
}

.level-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.status-locked {
  color: #6B6B6B;
  background: rgba(107, 107, 107, 0.1);
}

.status-unlocked {
  color: #2E7D32;
  background: rgba(46, 125, 50, 0.1);
}

.status-completed {
  color: #C41E3A;
  background: rgba(196, 30, 58, 0.1);
}

.level-name {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: 1.75rem;
  color: #1A1A1A;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.level-description {
  font-size: 0.875rem;
  color: #6B6B6B;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.level-info {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: #6B6B6B;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(26, 26, 26, 0.1);
}

.level-duration,
.level-target {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .levels-container {
    padding: 1rem;
  }

  .levels-header {
    margin-bottom: 2rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .levels-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}
</style>
