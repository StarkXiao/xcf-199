<template>
  <div class="level-detail">
    <div class="breadcrumb card">
      <button class="breadcrumb-back" @click="goBackToPath">
        ← 返回阶段列表
      </button>
      <div class="breadcrumb-info">
        <span class="breadcrumb-crumb" @click="goBackToTopics">专题列表</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-crumb" @click="goBackToPath">{{ topicName }}</span>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">第{{ level.level_number }}阶段 · {{ level.name }}</span>
      </div>
    </div>

    <div class="level-header card">
      <div class="level-header-content">
        <div
          class="level-badge"
          :style="{
            backgroundColor: difficultyBgColor,
            borderColor: store.difficultyColor(level.difficulty)
          }"
        >
          <span class="level-badge-icon">{{ level.icon }}</span>
          <div>
            <div class="level-badge-difficulty" :style="{ color: store.difficultyColor(level.difficulty) }">
              {{ store.difficultyText(level.difficulty) }}
            </div>
            <div class="level-badge-name">第{{ level.level_number }}阶段</div>
          </div>
        </div>
        <div class="level-main-info">
          <h2 class="level-title">{{ level.name }}</h2>
          <p class="level-desc">{{ level.description }}</p>
          <div class="level-stats-row">
            <div class="info-chip">
              <span>📖</span>
              <span>{{ level.completed_lessons }}/{{ level.total_lessons }} 课时</span>
            </div>
            <div class="info-chip">
              <span>⭐</span>
              <span>可获得 {{ totalPoints }} 积分</span>
            </div>
            <div class="info-chip">
              <span>⏱️</span>
              <span>约 {{ totalDuration }} 分钟</span>
            </div>
          </div>
        </div>
      </div>
      <div class="level-progress-card">
        <div class="progress-ring">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--bg-light)"
              stroke-width="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              :stroke="store.difficultyColor(level.difficulty)"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="264"
              :stroke-dashoffset="264 - (264 * progressPercent) / 100"
              transform="rotate(-90 50 50)"
              style="transition: stroke-dashoffset 0.5s ease;"
            />
          </svg>
          <div class="progress-ring-text">
            <div class="progress-ring-value">{{ progressPercent }}%</div>
            <div class="progress-ring-label">完成度</div>
          </div>
        </div>
      </div>
    </div>

    <div class="lessons-section">
      <h3 class="section-title">📚 学习关卡</h3>
      <div class="lessons-list">
        <div
          v-for="(lesson, index) in lessons"
          :key="lesson.id"
          class="lesson-card card"
          :class="{
            'is-locked': lesson.status === 'locked',
            'is-current': lesson.status === 'in_progress',
            'is-completed': lesson.status === 'completed'
          }"
          @click="handleLessonClick(lesson)"
        >
          <div class="lesson-number" :class="lesson.status">
            <span v-if="lesson.status === 'completed'">✓</span>
            <span v-else-if="lesson.status === 'locked'">🔒</span>
            <span v-else>{{ index + 1 }}</span>
          </div>

          <div class="lesson-info">
            <div class="lesson-header">
              <h4 class="lesson-title">
                <template v-if="lesson.status === 'completed'">✅ </template>
                <template v-else-if="lesson.status === 'in_progress'">📖 </template>
                <template v-else-if="lesson.status === 'locked'">🔒 </template>
                {{ lesson.title }}
              </h4>
              <span
                class="lesson-status"
                :class="lesson.status"
              >
                {{ store.stageStatusText(lesson.status) }}
              </span>
            </div>
            <p class="lesson-desc">{{ lesson.description }}</p>
            <div class="lesson-meta">
              <span class="meta-item">⏱️ {{ lesson.duration }} 分钟</span>
              <span class="meta-item">⭐ +{{ lesson.points_reward }} 积分</span>
              <span v-if="lesson.article_id" class="meta-item">📄 关联文章</span>
            </div>
          </div>

          <div class="lesson-action">
            <button
              class="btn"
              :class="getButtonClass(lesson.status)"
              :disabled="lesson.status === 'locked'"
            >
              <template v-if="lesson.status === 'completed'">再次学习</template>
              <template v-else-if="lesson.status === 'in_progress'">继续学习</template>
              <template v-else-if="lesson.status === 'available'">开始学习</template>
              <template v-else>未解锁</template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.currentLesson" class="lesson-modal">
      <div class="lesson-modal-overlay" @click="closeLesson"></div>
      <div class="lesson-modal-content card">
        <div class="lesson-modal-header">
          <div>
            <span
              class="lesson-modal-tag"
              :style="{ color: store.difficultyColor(level.difficulty) }"
            >
              第{{ level.level_number }}阶段 · {{ store.difficultyText(level.difficulty) }}
            </span>
            <h3 class="lesson-modal-title">{{ store.currentLesson.title }}</h3>
          </div>
          <button class="close-btn" @click="closeLesson">✕</button>
        </div>

        <div class="lesson-modal-meta">
          <span>⏱️ 约 {{ store.currentLesson.duration }} 分钟</span>
          <span>⭐ 完成可获得 +{{ store.currentLesson.points_reward }} 积分</span>
        </div>

        <div class="lesson-modal-body">
          <h4 class="section-subtitle">📝 学习内容</h4>
          <div class="lesson-content">
            <p>{{ store.currentLesson.content }}</p>
            <p>{{ store.currentLesson.content }}</p>
            <p v-if="store.currentLesson.article_id">
              <br>
              <a href="javascript:;" class="article-link" @click="goToArticle">
                📖 查看完整学习文章 →
              </a>
            </p>
          </div>
        </div>

        <div class="lesson-modal-footer">
          <button class="btn btn-secondary" @click="closeLesson">稍后再学</button>
          <button class="btn btn-primary" @click="completeLesson">
            ✅ 标记为已完成 (+{{ store.currentLesson.points_reward }}积分)
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLearningMapStore } from '@/stores/learningMap'
import type { LearningLevel, LearningLesson, LearningStageStatus } from '@/types'

const props = defineProps<{
  level: LearningLevel
  lessons: LearningLesson[]
}>()

const router = useRouter()
const store = useLearningMapStore()

const topicName = computed(() => {
  const topic = store.topics.find(t => t.id === props.level.topic_id)
  return topic?.name || ''
})

const totalPoints = computed(() => {
  return props.lessons.reduce((sum, l) => sum + l.points_reward, 0)
})

const totalDuration = computed(() => {
  return props.lessons.reduce((sum, l) => sum + l.duration, 0)
})

const progressPercent = computed(() => {
  if (props.level.total_lessons === 0) return 0
  return Math.round((props.level.completed_lessons / props.level.total_lessons) * 100)
})

const difficultyBgColor = computed(() => {
  return store.difficultyColor(props.level.difficulty) + '15'
})

const getButtonClass = (status: LearningStageStatus) => {
  switch (status) {
    case 'completed':
      return 'btn-secondary'
    case 'in_progress':
    case 'available':
      return 'btn-primary'
    default:
      return 'btn-secondary'
  }
}

const goBackToTopics = () => {
  store.selectTopic(0)
}

const goBackToPath = () => {
  store.selectLevel(0)
}

const handleLessonClick = (lesson: LearningLesson) => {
  if (lesson.status !== 'locked') {
    store.startLesson(lesson.id)
  }
}

const closeLesson = () => {
  store.currentLessonId = null
}

const completeLesson = () => {
  if (store.currentLesson) {
    store.completeLesson(store.currentLesson.id, 90 + Math.floor(Math.random() * 10))
  }
}

const goToArticle = () => {
  if (store.currentLesson?.article_id) {
    router.push(`/articles/${store.currentLesson.article_id}`)
  }
}
</script>

<style scoped>
.level-detail {
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
  flex-wrap: wrap;
}

.breadcrumb-crumb {
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-crumb:hover {
  color: var(--primary-color);
}

.breadcrumb-sep {
  color: var(--text-light);
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  gap: 24px;
  flex-wrap: wrap;
}

.level-header-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex: 1;
  min-width: 300px;
}

.level-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--radius-md);
  border: 2px solid;
  flex-shrink: 0;
}

.level-badge-icon {
  font-size: 36px;
}

.level-badge-difficulty {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 2px;
}

.level-badge-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.level-main-info {
  flex: 1;
}

.level-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.level-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.level-stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-light);
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.level-progress-card {
  flex-shrink: 0;
}

.progress-ring {
  position: relative;
  width: 100px;
  height: 100px;
}

.progress-ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-ring-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.progress-ring-label {
  font-size: 11px;
  color: var(--text-light);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.section-subtitle {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.lessons-section {
  margin-bottom: 24px;
}

.lessons-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lesson-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  transition: all 0.2s;
}

.lesson-card:not(.is-locked) {
  cursor: pointer;
}

.lesson-card:not(.is-locked):hover {
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.lesson-card.is-locked {
  opacity: 0.6;
}

.lesson-card.is-current {
  border: 2px solid var(--primary-color);
}

.lesson-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.lesson-number.completed {
  background-color: var(--success-color);
  color: white;
}

.lesson-number.in_progress,
.lesson-number.available {
  background-color: var(--primary-color);
  color: white;
}

.lesson-info {
  flex: 1;
  min-width: 0;
}

.lesson-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  gap: 12px;
}

.lesson-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.lesson-status {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  flex-shrink: 0;
  background-color: var(--bg-light);
  color: var(--text-secondary);
}

.lesson-status.completed {
  background-color: #d4edda;
  color: #155724;
}

.lesson-status.in_progress {
  background-color: #ffe0e3;
  color: var(--primary-color);
}

.lesson-status.available {
  background-color: #d1ecf1;
  color: #0c5460;
}

.lesson-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
}

.lesson-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-light);
  flex-wrap: wrap;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lesson-action {
  flex-shrink: 0;
}

.lesson-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lesson-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
}

.lesson-modal-content {
  position: relative;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.lesson-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  gap: 16px;
}

.lesson-modal-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}

.lesson-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-light);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.lesson-modal-meta {
  display: flex;
  gap: 20px;
  padding: 12px 20px;
  background: var(--bg-light);
  font-size: 13px;
  color: var(--text-secondary);
}

.lesson-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.lesson-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-secondary);
}

.article-link {
  color: var(--primary-color);
  font-weight: 500;
}

.lesson-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}
</style>
