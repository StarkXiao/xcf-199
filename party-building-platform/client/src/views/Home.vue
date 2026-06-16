<template>
  <div class="home-page">
    <div class="hero">
      <div class="container hero-content">
        <h1 class="hero-title">学习贯彻党的二十大精神</h1>
        <p class="hero-subtitle">不忘初心，牢记使命，为全面建设社会主义现代化国家而团结奋斗</p>
        <div class="hero-actions">
          <router-link to="/articles" class="btn btn-primary btn-lg">开始学习</router-link>
          <router-link to="/activities" class="btn btn-outline btn-lg" style="color: white; border-color: white;">参与活动</router-link>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.articles }}</div>
            <div class="stat-label">学习文章</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎉</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.activities }}</div>
            <div class="stat-label">活动总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.users }}</div>
            <div class="stat-label">党员人数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-number">{{ stats.points }}</div>
            <div class="stat-label">累计积分</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">📖 最新学习专栏</h2>
          <router-link to="/articles" class="section-more">查看更多 →</router-link>
        </div>
        <div class="article-grid">
          <div v-for="article in latestArticles" :key="article.id" class="article-card" @click="goArticle(article.id)">
            <div class="article-cover" :style="{ backgroundImage: `url(${article.cover_image})` }">
              <div class="article-category">{{ article.category }}</div>
            </div>
            <div class="article-body">
              <h3 class="article-title">{{ article.title }}</h3>
              <p class="article-excerpt">{{ article.excerpt }}</p>
              <div class="article-meta">
                <span>👁️ {{ article.views }} 阅读</span>
                <span>{{ formatDate(article.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section two-col">
        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">🎯 热门活动</h2>
            <router-link to="/activities" class="section-more">查看更多 →</router-link>
          </div>
          <div class="activity-list">
            <div v-for="activity in hotActivities" :key="activity.id" class="activity-item" @click="goActivity(activity.id)">
              <div class="activity-thumb" :style="{ backgroundImage: `url(${activity.cover_image})` }"></div>
              <div class="activity-info">
                <h4 class="activity-title">{{ activity.title }}</h4>
                <div class="activity-meta">
                  <span>📍 {{ activity.location }}</span>
                  <span class="badge badge-primary">{{ activity.points_reward }}积分</span>
                </div>
                <div class="activity-signup">
                  <span>已报名: {{ activity.signup_count }}/{{ activity.max_participants || '不限' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="section-block">
          <div class="section-header">
            <h2 class="section-title">📢 支部通知</h2>
            <router-link to="/notices" class="section-more">查看更多 →</router-link>
          </div>
          <div class="notice-list">
            <div v-for="notice in latestNotices" :key="notice.id" class="notice-item" @click="goNotice(notice.id)">
              <div class="notice-tag">{{ notice.type }}</div>
              <div class="notice-content">
                <h4 class="notice-title">{{ notice.title }}</h4>
                <span class="notice-date">{{ formatDate(notice.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">🏆 积分排行榜</h2>
          <router-link to="/points" class="section-more">查看完整榜单 →</router-link>
        </div>
        <div class="ranking-top">
          <div v-for="(user, index) in topRanking" :key="user.id" class="ranking-card" :class="`rank-${index + 1}`">
            <div class="ranking-badge">{{ getRankBadge(index + 1) }}</div>
            <img :src="user.avatar" class="ranking-avatar" alt="avatar">
            <div class="ranking-name">{{ user.real_name }}</div>
            <div class="ranking-branch">{{ user.branch }}</div>
            <div class="ranking-points">{{ user.points }} 积分</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getArticles } from '@/api/articles'
import { getActivities } from '@/api/activities'
import { getNotices } from '@/api/notices'
import { getPointsRanking } from '@/api/points'
import type { Article, Activity, Notice, RankingUser } from '@/types'

const router = useRouter()

const stats = ref({
  articles: 0,
  activities: 0,
  users: 0,
  points: 0
})

const latestArticles = ref<Article[]>([])
const hotActivities = ref<Activity[]>([])
const latestNotices = ref<Notice[]>([])
const topRanking = ref<RankingUser[]>([])

const loadData = async () => {
  try {
    const [articlesRes, activitiesRes, noticesRes, rankingRes] = await Promise.all([
      getArticles({ page: 1, page_size: 6 }),
      getActivities({ page: 1, page_size: 5, status: 'upcoming' }),
      getNotices({ page: 1, page_size: 6 }),
      getPointsRanking({ page: 1, page_size: 3 })
    ])

    latestArticles.value = articlesRes.data.list
    hotActivities.value = activitiesRes.data.list
    latestNotices.value = noticesRes.data.list
    topRanking.value = rankingRes.data.list

    stats.value.articles = articlesRes.data.total
    stats.value.activities = activitiesRes.data.total
    stats.value.users = rankingRes.data.total
    stats.value.points = rankingRes.data.list.reduce((sum, u) => sum + u.points, 0)
  } catch (error) {
    console.error('加载首页数据失败', error)
  }
}

const goArticle = (id: number) => {
  router.push(`/articles/${id}`)
}

const goActivity = (id: number) => {
  router.push(`/activities/${id}`)
}

const goNotice = (id: number) => {
  router.push(`/notices/${id}`)
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const getRankBadge = (rank: number) => {
  const badges = ['🥇', '🥈', '🥉']
  return badges[rank - 1] || rank
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home-page {
  padding-bottom: 40px;
}

.hero {
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
  color: white;
  padding: 60px 0;
  margin: -24px -20px 24px;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 16px;
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.hero-actions .btn {
  min-width: 140px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.stat-icon {
  font-size: 36px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 22px;
  font-weight: 600;
}

.section-more {
  color: var(--text-secondary);
  font-size: 14px;
}

.section-more:hover {
  color: var(--primary-color);
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.article-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.article-cover {
  height: 160px;
  background-size: cover;
  background-position: center;
  position: relative;
}

.article-category {
  position: absolute;
  top: 12px;
  left: 12px;
  background: var(--primary-color);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.article-body {
  padding: 16px;
}

.article-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-excerpt {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-light);
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.section-block {
  background: white;
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.section-block .section-header {
  margin-bottom: 16px;
}

.section-block .section-title {
  font-size: 18px;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s;
}

.activity-item:hover {
  background-color: var(--bg-light);
}

.activity-thumb {
  width: 80px;
  height: 60px;
  border-radius: var(--radius-sm);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.activity-signup {
  font-size: 12px;
  color: var(--text-light);
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.2s;
}

.notice-item:hover {
  background-color: var(--bg-light);
}

.notice-tag {
  padding: 2px 8px;
  background: #ffe0e3;
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 12px;
  flex-shrink: 0;
}

.notice-content {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notice-date {
  font-size: 12px;
  color: var(--text-light);
}

.ranking-top {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.ranking-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 30px 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: transform 0.2s;
}

.ranking-card:hover {
  transform: translateY(-4px);
}

.ranking-card.rank-1 {
  background: linear-gradient(135deg, #fff9c4, #fff59d);
  transform: scale(1.05);
}

.ranking-card.rank-2 {
  background: linear-gradient(135deg, #f5f5f5, #e0e0e0);
}

.ranking-card.rank-3 {
  background: linear-gradient(135deg, #ffe0b2, #ffcc80);
}

.ranking-badge {
  font-size: 36px;
  margin-bottom: 12px;
}

.ranking-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 12px;
  border: 3px solid white;
  box-shadow: var(--shadow-sm);
}

.ranking-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.ranking-branch {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.ranking-points {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .article-grid {
    grid-template-columns: 1fr;
  }

  .two-col {
    grid-template-columns: 1fr;
  }

  .ranking-top {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .ranking-card.rank-1 {
    transform: scale(1);
  }
}
</style>
