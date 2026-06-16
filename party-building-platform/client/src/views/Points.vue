<template>
  <div class="points-page container">
    <div class="page-header">
      <h1 class="page-title">🏆 积分排行榜</h1>
    </div>

    <div class="ranking-tabs">
      <span
        class="tab"
        :class="{ active: !selectedBranch }"
        @click="selectBranch('')"
      >全部支部</span>
      <span
        v-for="branch in branches"
        :key="branch"
        class="tab"
        :class="{ active: selectedBranch === branch }"
        @click="selectBranch(branch)"
      >{{ branch }}</span>
    </div>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
    </div>

    <div v-else class="ranking-content">
      <div class="ranking-podium">
        <div v-for="(user, index) in topThree" :key="user.id" class="podium-item" :class="`rank-${index + 1}`">
          <div class="podium-badge">{{ getRankBadge(index + 1) }}</div>
          <img :src="user.avatar" class="podium-avatar" alt="avatar">
          <div class="podium-name">{{ user.real_name }}</div>
          <div class="podium-branch">{{ user.branch }}</div>
          <div class="podium-points">{{ user.points }}</div>
          <div class="podium-label">积分</div>
        </div>
      </div>

      <div class="ranking-list card">
        <table class="ranking-table">
          <thead>
            <tr>
              <th style="width: 80px;">排名</th>
              <th>用户</th>
              <th>支部</th>
              <th style="width: 120px; text-align: right;">积分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in rankingList" :key="user.id" class="ranking-row">
              <td>
                <span class="rank-num" :class="`rank-${user.rank}`">{{ user.rank }}</span>
              </td>
              <td>
                <div class="user-info">
                  <img :src="user.avatar" class="user-avatar" alt="avatar">
                  <span class="user-name">{{ user.real_name }}</span>
                </div>
              </td>
              <td>{{ user.branch }}</td>
              <td style="text-align: right;">
                <span class="points-value">{{ user.points }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="rankingList.length === 0" class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>暂无数据</p>
        </div>
      </div>

      <div v-if="total > pageSize" class="pagination">
        <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
        <button
          v-for="p in totalPages"
          :key="p"
          :class="{ active: p === page }"
          @click="changePage(p)"
        >{{ p }}</button>
        <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPointsRanking, getBranches } from '@/api/points'
import type { RankingUser } from '@/types'

const rankingList = ref<RankingUser[]>([])
const branches = ref<string[]>([])
const selectedBranch = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const loading = ref(false)

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

const topThree = computed(() => rankingList.value.slice(0, 3))

const loadRanking = async () => {
  loading.value = true
  try {
    const res = await getPointsRanking({
      page: page.value,
      page_size: pageSize.value,
      branch: selectedBranch.value || undefined
    })
    rankingList.value = res.data.list
    total.value = res.data.total
  } catch (error) {
    console.error('加载排行榜失败', error)
  } finally {
    loading.value = false
  }
}

const loadBranches = async () => {
  try {
    const res = await getBranches()
    branches.value = res.data
  } catch (error) {
    console.error('加载支部列表失败', error)
  }
}

const selectBranch = (branch: string) => {
  selectedBranch.value = branch
  page.value = 1
  loadRanking()
}

const changePage = (p: number) => {
  if (p >= 1 && p <= totalPages.value) {
    page.value = p
    loadRanking()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const getRankBadge = (rank: number) => {
  const badges = ['🥇', '🥈', '🥉']
  return badges[rank - 1] || rank
}

onMounted(() => {
  loadBranches()
  loadRanking()
})
</script>

<style scoped>
.points-page {
  padding-bottom: 40px;
}

.ranking-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.tab {
  padding: 6px 16px;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tab:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.ranking-podium {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 30px;
}

.podium-item {
  background: white;
  border-radius: var(--radius-lg);
  padding: 30px 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  position: relative;
}

.podium-item.rank-1 {
  background: linear-gradient(135deg, #fff9c4, #fff59d);
  transform: scale(1.05);
}

.podium-item.rank-2 {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
}

.podium-item.rank-3 {
  background: linear-gradient(135deg, #ffe0b2, #ffcc80);
}

.podium-badge {
  font-size: 40px;
  margin-bottom: 12px;
}

.podium-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 12px;
  border: 3px solid white;
  box-shadow: var(--shadow-sm);
}

.podium-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.podium-branch {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.podium-points {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.podium-label {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.ranking-list {
  padding: 0;
  overflow: hidden;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
}

.ranking-table th {
  background: var(--bg-light);
  padding: 12px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
}

.ranking-table td {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
}

.ranking-row:hover {
  background-color: var(--bg-light);
}

.rank-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-light);
  font-size: 13px;
  font-weight: 600;
}

.rank-num.rank-1,
.rank-num.rank-2,
.rank-num.rank-3 {
  color: white;
}

.rank-num.rank-1 {
  background: #ffd700;
}

.rank-num.rank-2 {
  background: #c0c0c0;
}

.rank-num.rank-3 {
  background: #cd7f32;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.user-name {
  font-weight: 500;
}

.points-value {
  font-weight: 700;
  color: var(--primary-color);
  font-size: 16px;
}

@media (max-width: 768px) {
  .ranking-podium {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .podium-item.rank-1 {
    transform: scale(1);
  }

  .ranking-table th:nth-child(3),
  .ranking-table td:nth-child(3) {
    display: none;
  }
}
</style>
