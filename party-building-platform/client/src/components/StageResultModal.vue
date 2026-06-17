<template>
  <div class="stage-result-modal">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content card">
      <div class="celebration-header">
        <div class="confetti">
          <span v-for="i in 20" :key="i" class="confetti-piece" :style="getConfettiStyle(i)"></span>
        </div>
        <div class="trophy-icon">
          <span>{{ result.type === 'topic' ? '🏆' : '🎉' }}</span>
        </div>
      </div>

      <div class="result-body">
        <div class="result-type-tag" :class="result.type">
          {{ result.type === 'topic' ? '专题完成' : '阶段完成' }}
        </div>

        <h2 class="result-title">恭喜完成！</h2>
        <h3 class="result-name">{{ result.name }}</h3>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon-box">📖</div>
            <div class="stat-info">
              <div class="stat-big-value">{{ result.completed_lessons }}/{{ result.total_lessons }}</div>
              <div class="stat-small-label">课时完成</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box" style="background-color: #fff3cd;">⭐</div>
            <div class="stat-info">
              <div class="stat-big-value">+{{ result.earned_points }}</div>
              <div class="stat-small-label">获得积分</div>
            </div>
          </div>

          <div class="stat-card" v-if="result.avg_score">
            <div class="stat-icon-box" style="background-color: #d1ecf1;">📊</div>
            <div class="stat-info">
              <div class="stat-big-value">{{ result.avg_score }}分</div>
              <div class="stat-small-label">平均得分</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon-box" style="background-color: #d4edda;">📅</div>
            <div class="stat-info">
              <div class="stat-big-value">{{ formatDate(result.completed_at) }}</div>
              <div class="stat-small-label">完成时间</div>
            </div>
          </div>
        </div>

        <div class="progress-summary">
          <div class="summary-header">
            <span>整体完成度</span>
            <span class="summary-percent">{{ completionPercent }}%</span>
          </div>
          <div class="summary-bar-bg">
            <div class="summary-bar-fill" :style="{ width: completionPercent + '%' }"></div>
          </div>
        </div>

        <div v-if="result.next_stage_name" class="next-stage-hint">
          <div class="next-icon">➡️</div>
          <div class="next-info">
            <div class="next-label">下一阶段</div>
            <div class="next-name">{{ result.next_stage_name }}</div>
          </div>
        </div>

        <div v-else class="all-complete-hint">
          <span>🎊</span>
          <span>太棒了！您已完成全部内容！</span>
        </div>
      </div>

      <div class="result-footer">
        <button class="btn btn-secondary" @click="$emit('close')">
          稍后查看
        </button>
        <button class="btn btn-primary" @click="handleContinue">
          {{ result.next_stage_name ? '继续下一阶段 →' : '返回学习地图' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LearningStageResult } from '@/types'

const props = defineProps<{
  result: LearningStageResult
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const completionPercent = computed(() => {
  if (props.result.total_lessons === 0) return 100
  return Math.round((props.result.completed_lessons / props.result.total_lessons) * 100)
})

const getConfettiStyle = (index: number) => {
  const colors = ['#c81d25', '#e63946', '#ffba08', '#28a745', '#17a2b8', '#6f42c1']
  const left = (index * 5) + '%'
  const delay = (index * 0.1) + 's'
  const color = colors[index % colors.length]
  const animationDuration = (2 + Math.random() * 2) + 's'
  return {
    left,
    backgroundColor: color,
    animationDelay: delay,
    animationDuration
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const handleContinue = () => {
  emit('close')
}
</script>

<style scoped>
.stage-result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
}

.modal-content {
  position: relative;
  max-width: 520px;
  width: 100%;
  padding: 0;
  overflow: hidden;
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.celebration-header {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-light));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.trophy-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1;
  animation: bounce 0.6s ease 0.3s;
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.confetti {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  top: -10px;
  border-radius: 2px;
  animation: confettiFall linear infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(140px) rotate(720deg);
    opacity: 0;
  }
}

.result-body {
  padding: 24px;
  text-align: center;
}

.result-type-tag {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
}

.result-type-tag.topic {
  background-color: #fff3cd;
  color: #856404;
}

.result-type-tag.level {
  background-color: #ffe0e3;
  color: var(--primary-color);
}

.result-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.result-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  text-align: left;
}

.stat-icon-box {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background-color: #ffe0e3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.stat-big-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.stat-small-label {
  font-size: 11px;
  color: var(--text-light);
  margin-top: 2px;
}

.progress-summary {
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.summary-percent {
  font-weight: 700;
  color: var(--text-primary);
}

.summary-bar-bg {
  height: 8px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.summary-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
  border-radius: 4px;
  transition: width 0.5s ease;
}

.next-stage-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #e7f3ff;
  border-radius: var(--radius-md);
  text-align: left;
}

.next-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.next-label {
  font-size: 11px;
  color: var(--text-light);
  margin-bottom: 2px;
}

.next-name {
  font-size: 14px;
  font-weight: 600;
  color: #0c5460;
}

.all-complete-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 16px;
  background: #d4edda;
  border-radius: var(--radius-md);
  color: #155724;
  font-size: 14px;
  font-weight: 500;
}

.result-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 16px 24px 24px;
}
</style>
