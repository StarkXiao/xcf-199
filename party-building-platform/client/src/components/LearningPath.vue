<template>
  <div class="learning-path">
    <div class="breadcrumb card">
      <button class="breadcrumb-back" @click="goBack">
        ← 返回专题列表
      </button>
      <div class="breadcrumb-info">
        <span class="breadcrumb-icon" :style="{ color: topic.color }">{{ topic.icon }}</span>
        <span class="breadcrumb-name">{{ topic.name }}</span>
      </div>
    </div>

    <div class="path-header card">
      <div class="path-header-left">
        <div class="path-icon" :style="{ backgroundColor: topic.color + '20', color: topic.color }">
          {{ topic.icon }}
        </div>
        <div>
          <h2 class="path-title">{{ topic.name }}</h2>
          <p class="path-desc">{{ topic.description }}</p>
        </div>
      </div>
      <div class="path-stats">
        <div class="path-stat">
          <span class="path-stat-label">专题进度</span>
          <span class="path-stat-value" :style="{ color: topic.color }">{{ topic.progress }}%</span>
        </div>
      </div>
    </div>

    <div class="path-container">
      <div class="path-line">
        <div
          class="path-line-fill"
          :style="{ height: progressHeight + '%', backgroundColor: topic.color }"
        ></div>
      </div>

      <div class="levels-list">
        <div
          v-for="(level, index) in levels"
          :key="level.id"
          class="level-node"
          :class="{
            'is-locked': level.status === 'locked',
            'is-current': level.status === 'current',
            'is-completed': level.status === 'completed'
          }"
          @click="handleLevelClick(level)"
        >
          <div class="level-node-header">
            <div
              class="level-dot"
              :style="{
                backgroundColor: getLevelDotColor(level.status),
                borderColor: getLevelDotBorder(level.status)
              }"
            >
              <span v-if="level.status === 'completed'" class="level-dot-icon">✓</span>
              <span v-else-if="level.status === 'locked'" class="level-dot-icon">🔒</span>
              <span v-else class="level-dot-number">{{ level.level_number }}</span>
            </div>
            <div class="level-connector" v-if="index < levels.length - 1"></div>
          </div>

          <div class="level-card card">
            <div class="level-card-header">
              <div class="level-title-row">
                <span class="level-icon">{{ level.icon }}</span>
                <div>
                  <h3 class="level-name">第{{ level.level_number }}阶段 · {{ level.name }}</h3>
                  <div class="level-tags">
                    <span
                      class="difficulty-tag"
                      :style="{ backgroundColor: store.difficultyColor(level.difficulty) + '20', color: store.difficultyColor(level.difficulty) }"
                    >
                      {{ store.difficultyText(level.difficulty) }}
                    </span>
                    <span class="status-tag" :class="level.status">
                      {{ store.levelStatusText(level.status) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="level-points">
                <span class="points-label">解锁积分</span>
                <span class="points-value">{{ level.required_points }}</span>
              </div>
            </div>

            <p class="level-desc">{{ level.description }}</p>

            <div class="level-progress-section">
              <div class="level-progress-header">
                <span>课时进度</span>
                <span class="progress-count">
                  {{ level.completed_lessons }}/{{ level.total_lessons }}
                </span>
              </div>
              <div class="level-progress-bar-bg">
                <div
                  class="level-progress-bar-fill"
                  :style="{
                    width: (level.total_lessons > 0 ? (level.completed_lessons / level.total_lessons) * 100 : 0) + '%',
                    backgroundColor: topic.color
                  }"
                ></div>
              </div>
            </div>

            <div class="level-card-footer">
              <span class="lesson-count">
                📖 {{ level.total_lessons }} 个课时
              </span>
              <button
                class="btn btn-primary btn-sm"
                :disabled="level.status === 'locked'"
              >
                <template v-if="level.status === 'completed'">✅ 已完成</template>
                <template v-else-if="level.status === 'locked'">🔒 未解锁</template>
                <template v-else-if="level.completed_lessons > 0">继续学习 →</template>
                <template v-else>开始学习 →</template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLearningMapStore } from '@/stores/learningMap'
import type { LearningTopic, LearningLevel, LearningLevelStatus } from '@/types'

const props = defineProps<{
  topic: LearningTopic
  levels: LearningLevel[]
}>()

const store = useLearningMapStore()

const progressHeight = computed(() => {
  const total = props.levels.length
  const completed = props.levels.filter(l => l.status === 'completed').length
  if (total === 0) return 0
  const percent = (completed / total) * 100
  const currentIndex = props.levels.findIndex(l => l.status === 'current')
  if (currentIndex !== -1) {
    return ((currentIndex + 0.5) / total) * 100
  }
  return percent
})

const getLevelDotColor = (status: LearningLevelStatus): string => {
  switch (status) {
    case 'completed':
      return props.topic.color
    case 'current':
      return props.topic.color
    default:
      return 'white'
  }
}

const getLevelDotBorder = (status: LearningLevelStatus): string => {
  switch (status) {
    case 'completed':
      return props.topic.color
    case 'current':
      return props.topic.color
    default:
      return 'var(--border-color)'
  }
}

const goBack = () => {
  store.selectTopic(0)
}

const handleLevelClick = (level: LearningLevel) => {
  if (level.status !== 'locked') {
    store.selectLevel(level.id)
  }
}
</script>

<style scoped>
.learning-path {
  position: relative;
}

.breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 12px 20px;
}

.breadcrumb-back {
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background-color 0.2s;
}

.breadcrumb-back:hover {
  background-color: var(--bg-light);
}

.breadcrumb-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.breadcrumb-icon {
  font-size: 18px;
}

.breadcrumb-name {
  font-weight: 500;
  color: var(--text-primary);
}

.path-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px;
  gap: 20px;
  flex-wrap: wrap;
}

.path-header-left {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.path-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.path-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.path-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.path-stats {
  display: flex;
  gap: 24px;
}

.path-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.path-stat-label {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 4px;
}

.path-stat-value {
  font-size: 28px;
  font-weight: 700;
}

.path-container {
  position: relative;
  padding-left: 40px;
}

.path-line {
  position: absolute;
  left: 19px;
  top: 24px;
  bottom: 24px;
  width: 4px;
  background-color: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
}

.path-line-fill {
  width: 100%;
  border-radius: 2px;
  transition: height 0.5s ease;
}

.levels-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.level-node {
  position: relative;
}

.level-node.is-locked {
  opacity: 0.6;
}

.level-node:not(.is-locked) {
  cursor: pointer;
}

.level-node-header {
  position: absolute;
  left: -40px;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.level-dot {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  z-index: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.level-node:not(.is-locked):hover .level-dot {
  transform: scale(1.1);
  box-shadow: 0 0 0 6px rgba(200, 29, 37, 0.1);
}

.level-dot-icon {
  font-size: 16px;
}

.level-dot-number {
  font-size: 14px;
  font-weight: 700;
  color: white;
}

.level-node.is-current .level-dot-number {
  color: white;
}

.level-node:not(.is-completed):not(.is-current) .level-dot-number {
  color: var(--text-light);
}

.level-card {
  margin-left: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.level-node:not(.is-locked):hover .level-card {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.level-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
  flex-wrap: wrap;
}

.level-title-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.level-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.level-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.level-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.difficulty-tag,
.status-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}

.status-tag {
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.status-tag.completed {
  background-color: #d4edda;
  color: #155724;
}

.status-tag.current {
  background-color: #ffe0e3;
  color: var(--primary-color);
}

.level-points {
  text-align: right;
  flex-shrink: 0;
}

.points-label {
  display: block;
  font-size: 11px;
  color: var(--text-light);
  margin-bottom: 2px;
}

.points-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--secondary-color);
}

.level-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.level-progress-section {
  margin-bottom: 16px;
}

.level-progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.progress-count {
  font-weight: 600;
  color: var(--text-primary);
}

.level-progress-bar-bg {
  height: 8px;
  background: var(--bg-light);
  border-radius: 4px;
  overflow: hidden;
}

.level-progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.level-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.lesson-count {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
