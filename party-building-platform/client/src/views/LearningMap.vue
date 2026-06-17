<template>
  <div class="learning-map-page container">
    <div class="page-header">
      <div>
        <h1 class="page-title">🗺️ 学习地图</h1>
        <p class="page-subtitle">按专题、阶段和难度组织学习内容，闯关式学习更有动力</p>
      </div>
      <div class="stats-summary">
        <div class="stat-item">
          <div class="stat-icon">🏆</div>
          <div class="stat-info">
            <div class="stat-value">{{ store.userStats.completed_lessons }}/{{ store.userStats.total_lessons }}</div>
            <div class="stat-label">已完成课时</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-value">{{ store.userStats.earned_points }}</div>
            <div class="stat-label">获得积分</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value">{{ store.userStats.current_streak }}天</div>
            <div class="stat-label">连续学习</div>
          </div>
        </div>
      </div>
    </div>

    <div class="overall-progress card">
      <div class="progress-header">
        <span class="progress-title">总体学习进度</span>
        <span class="progress-percent">{{ overallPercent }}%</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: overallPercent + '%' }"></div>
      </div>
      <div class="progress-details">
        <span>专题 {{ store.userStats.completed_topics }}/{{ store.userStats.total_topics }}</span>
        <span>阶段 {{ store.userStats.completed_levels }}/{{ store.userStats.total_levels }}</span>
        <span>累计学习 {{ formatMinutes(store.userStats.total_study_minutes) }}</span>
      </div>
    </div>

    <div v-if="!store.currentTopicId" class="topics-grid">
      <div
        v-for="topic in sortedTopics"
        :key="topic.id"
        class="topic-card card"
        :class="{ 'is-locked': isTopicLocked(topic) }"
        :style="{ borderLeftColor: topic.color }"
        @click="handleTopicClick(topic)"
      >
        <div class="topic-header">
          <div class="topic-icon" :style="{ backgroundColor: topic.color + '20', color: topic.color }">
            {{ topic.icon }}
          </div>
          <div class="topic-info">
            <h3 class="topic-name">
              {{ topic.name }}
              <span v-if="isTopicLocked(topic)" class="lock-badge">🔒</span>
            </h3>
            <p class="topic-desc">{{ topic.description }}</p>
          </div>
        </div>
        <div class="topic-meta">
          <span class="meta-tag">📚 {{ topic.total_levels }} 个阶段</span>
          <span class="meta-tag">📖 {{ topic.total_lessons }} 课时</span>
        </div>
        <div class="topic-progress">
          <div class="progress-header-sm">
            <span>学习进度</span>
            <span class="progress-text">{{ topic.progress }}%</span>
          </div>
          <div class="progress-bar-sm">
            <div
              class="progress-bar-fill-sm"
              :style="{ width: topic.progress + '%', backgroundColor: topic.color }"
            ></div>
          </div>
        </div>
        <div class="topic-footer">
          <button v-if="topic.progress > 0 && topic.progress < 100" class="btn btn-primary btn-sm">
            继续学习 →
          </button>
          <button v-else-if="topic.progress === 100" class="btn btn-secondary btn-sm" disabled>
            ✅ 已完成
          </button>
          <button v-else-if="isTopicLocked(topic)" class="btn btn-secondary btn-sm" disabled>
            🔒 未解锁
          </button>
          <button v-else class="btn btn-primary btn-sm">
            开始学习 →
          </button>
        </div>
      </div>
    </div>

    <LearningPath
      v-else-if="store.currentTopic && !store.currentLevelId"
      :topic="store.currentTopic"
      :levels="store.levelsByTopic"
    />

    <LevelDetail
      v-else-if="store.currentLevel"
      :level="store.currentLevel"
      :lessons="store.lessonsByLevel"
    />

    <StageResultModal
      v-if="store.showStageResult && store.stageResult"
      :result="store.stageResult"
      @close="store.closeStageResult()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLearningMapStore } from '@/stores/learningMap'
import type { LearningTopic } from '@/types'
import LearningPath from '@/components/LearningPath.vue'
import LevelDetail from '@/components/LevelDetail.vue'
import StageResultModal from '@/components/StageResultModal.vue'

const store = useLearningMapStore()

const sortedTopics = computed(() => {
  return [...store.topics].sort((a, b) => a.sort_order - b.sort_order)
})

const overallPercent = computed(() => {
  const stats = store.userStats
  if (stats.total_lessons === 0) return 0
  return Math.round((stats.completed_lessons / stats.total_lessons) * 100)
})

const isTopicLocked = (topic: LearningTopic): boolean => {
  const sorted = sortedTopics.value
  const index = sorted.findIndex(t => t.id === topic.id)
  if (index === 0) return false
  const prevTopic = sorted[index - 1]
  return prevTopic.progress < 100
}

const handleTopicClick = (topic: LearningTopic) => {
  if (!isTopicLocked(topic)) {
    store.selectTopic(topic.id)
  }
}

const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`
  }
  return `${mins}分钟`
}
</script>

<style scoped>
.learning-map-page {
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;
}

.page-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.stats-summary {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  font-size: 28px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
}

.overall-progress {
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-title {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-percent {
  font-weight: 700;
  color: var(--primary-color);
}

.progress-bar-bg {
  height: 12px;
  background: var(--bg-light);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--primary-light));
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-details {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.topics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.topic-card {
  border-left: 4px solid var(--primary-color);
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.topic-card:not(.is-locked):hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.topic-card.is-locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.topic-header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.topic-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.topic-info {
  flex: 1;
  min-width: 0;
}

.topic-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lock-badge {
  font-size: 14px;
}

.topic-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.topic-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-light);
  padding: 4px 10px;
  border-radius: 12px;
}

.topic-progress {
  padding-top: 4px;
}

.progress-header-sm {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.progress-text {
  font-weight: 600;
  color: var(--text-primary);
}

.progress-bar-sm {
  height: 6px;
  background: var(--bg-light);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill-sm {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.topic-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
