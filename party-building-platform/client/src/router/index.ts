import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/Home.vue'),
          meta: { title: '首页' }
        },
        {
          path: 'articles',
          name: 'articles',
          component: () => import('@/views/Articles.vue'),
          meta: { title: '学习专栏' }
        },
        {
          path: 'articles/:id',
          name: 'article-detail',
          component: () => import('@/views/ArticleDetail.vue'),
          meta: { title: '文章详情' }
        },
        {
          path: 'activities',
          name: 'activities',
          component: () => import('@/views/Activities.vue'),
          meta: { title: '活动报名' }
        },
        {
          path: 'activities/:id',
          name: 'activity-detail',
          component: () => import('@/views/ActivityDetail.vue'),
          meta: { title: '活动详情' }
        },
        {
          path: 'points',
          name: 'points',
          component: () => import('@/views/Points.vue'),
          meta: { title: '积分排行' }
        },
        {
          path: 'notices',
          name: 'notices',
          component: () => import('@/views/Notices.vue'),
          meta: { title: '支部通知' }
        },
        {
          path: 'notices/:id',
          name: 'notice-detail',
          component: () => import('@/views/NoticeDetail.vue'),
          meta: { title: '通知详情' }
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/Profile.vue'),
          meta: { title: '个人中心', requiresAuth: true }
        },
        {
          path: 'party-development',
          name: 'party-development',
          component: () => import('@/views/PartyDevelopment.vue'),
          meta: { title: '党员发展', requiresAuth: true }
        },
        {
          path: 'volunteer-service',
          name: 'volunteer-service',
          component: () => import('@/views/VolunteerService.vue'),
          meta: { title: '志愿服务' }
        },
        {
          path: 'volunteer-service/:id',
          name: 'volunteer-service-detail',
          component: () => import('@/views/VolunteerServiceDetail.vue'),
          meta: { title: '志愿服务详情' }
        },
        {
          path: 'my-volunteer',
          name: 'my-volunteer',
          component: () => import('@/views/MyVolunteer.vue'),
          meta: { title: '我的志愿服务', requiresAuth: true }
        },
        {
          path: 'branch-meetings',
          name: 'branch-meetings',
          component: () => import('@/views/BranchMeetings.vue'),
          meta: { title: '支部会议' }
        },
        {
          path: 'branch-meetings/:id',
          name: 'branch-meeting-detail',
          component: () => import('@/views/BranchMeetingDetail.vue'),
          meta: { title: '会议详情' }
        },
        {
          path: 'learning-map',
          name: 'learning-map',
          component: () => import('@/views/LearningMap.vue'),
          meta: { title: '学习地图' }
        },
        {
          path: 'party-transfer',
          name: 'party-transfer',
          component: () => import('@/views/PartyTransfer.vue'),
          meta: { title: '组织关系转接', requiresAuth: true }
        },
        {
          path: 'democratic-review',
          name: 'democratic-review',
          component: () => import('@/views/DemocraticReview.vue'),
          meta: { title: '民主评议' }
        },
        {
          path: 'democratic-review/:id',
          name: 'democratic-review-detail',
          component: () => import('@/views/DemocraticReviewDetail.vue'),
          meta: { title: '评议详情' }
        },
        {
          path: 'party-dues',
          name: 'party-dues',
          component: () => import('@/views/PartyDues.vue'),
          meta: { title: '党费缴纳', requiresAuth: true }
        },
        {
          path: 'party-dues/payments',
          name: 'party-dues-payments',
          component: () => import('@/views/PartyDuesPayments.vue'),
          meta: { title: '缴纳记录', requiresAuth: true }
        },
        {
          path: 'my-certificates',
          name: 'my-certificates',
          component: () => import('@/views/MyCertificates.vue'),
          meta: { title: '证书荣誉', requiresAuth: true }
        },
        {
          path: 'surveys',
          name: 'surveys',
          component: () => import('@/views/Surveys.vue'),
          meta: { title: '调研问卷', requiresAuth: true }
        },
        {
          path: 'surveys/:id',
          name: 'survey-fill',
          component: () => import('@/views/SurveyFill.vue'),
          meta: { title: '填写问卷', requiresAuth: true }
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { title: '登录' }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/Register.vue'),
      meta: { title: '注册' }
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/Dashboard.vue'),
          meta: { title: '管理后台 - 仪表盘' }
        },
        {
          path: 'articles',
          name: 'admin-articles',
          component: () => import('@/views/admin/Articles.vue'),
          meta: { title: '管理后台 - 文章管理' }
        },
        {
          path: 'activities',
          name: 'admin-activities',
          component: () => import('@/views/admin/Activities.vue'),
          meta: { title: '管理后台 - 活动管理' }
        },
        {
          path: 'notices',
          name: 'admin-notices',
          component: () => import('@/views/admin/Notices.vue'),
          meta: { title: '管理后台 - 通知管理' }
        },
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/Users.vue'),
          meta: { title: '管理后台 - 用户管理' }
        },
        {
          path: 'party-development',
          name: 'admin-party-development',
          component: () => import('@/views/admin/PartyDevelopment.vue'),
          meta: { title: '管理后台 - 党员发展管理' }
        },
        {
          path: 'volunteer-service',
          name: 'admin-volunteer-service',
          component: () => import('@/views/admin/VolunteerService.vue'),
          meta: { title: '管理后台 - 志愿服务管理' }
        },
        {
          path: 'volunteer-stats',
          name: 'admin-volunteer-stats',
          component: () => import('@/views/admin/VolunteerStats.vue'),
          meta: { title: '管理后台 - 志愿服务统计' }
        },
        {
          path: 'branch-meetings',
          name: 'admin-branch-meetings',
          component: () => import('@/views/admin/BranchMeetings.vue'),
          meta: { title: '管理后台 - 支部会议管理' }
        },
        {
          path: 'branch-meeting-stats',
          name: 'admin-branch-meeting-stats',
          component: () => import('@/views/admin/BranchMeetingStats.vue'),
          meta: { title: '管理后台 - 支部会议统计分析' }
        },
        {
          path: 'party-transfer',
          name: 'admin-party-transfer',
          component: () => import('@/views/admin/PartyTransfer.vue'),
          meta: { title: '管理后台 - 组织关系转接审批' }
        },
        {
          path: 'democratic-review',
          name: 'admin-democratic-review',
          component: () => import('@/views/admin/DemocraticReview.vue'),
          meta: { title: '管理后台 - 民主评议管理' }
        },
        {
          path: 'democratic-review-stats',
          name: 'admin-democratic-review-stats',
          component: () => import('@/views/admin/DemocraticReviewStats.vue'),
          meta: { title: '管理后台 - 民主评议统计' }
        },
        {
          path: 'dues-rules',
          name: 'admin-dues-rules',
          component: () => import('@/views/admin/DuesRules.vue'),
          meta: { title: '管理后台 - 党费规则配置' }
        },
        {
          path: 'dues-bills',
          name: 'admin-dues-bills',
          component: () => import('@/views/admin/DuesBills.vue'),
          meta: { title: '管理后台 - 党费账单管理' }
        },
        {
          path: 'dues-payments',
          name: 'admin-dues-payments',
          component: () => import('@/views/admin/DuesPayments.vue'),
          meta: { title: '管理后台 - 党费缴纳管理' }
        },
        {
          path: 'dues-stats',
          name: 'admin-dues-stats',
          component: () => import('@/views/admin/DuesStats.vue'),
          meta: { title: '管理后台 - 党费台账统计' }
        },
        {
          path: 'certificates',
          name: 'admin-certificates',
          component: () => import('@/views/admin/Certificates.vue'),
          meta: { title: '管理后台 - 证书荣誉管理' }
        },
        {
          path: 'surveys',
          name: 'admin-surveys',
          component: () => import('@/views/admin/Surveys.vue'),
          meta: { title: '管理后台 - 调研问卷管理' }
        },
        {
          path: 'surveys/:id/stats',
          name: 'admin-survey-stats',
          component: () => import('@/views/admin/SurveyStats.vue'),
          meta: { title: '管理后台 - 问卷统计分析' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: { title: '页面不存在' }
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const token = userStore.token

  if (to.meta.requiresAuth && !token) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (token && !userStore.user) {
    try {
      await userStore.fetchProfile()
    } catch (error) {
      userStore.logout()
      next({ name: 'login' })
      return
    }
  }

  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next({ name: 'home' })
    return
  }

  if ((to.name === 'login' || to.name === 'register') && token) {
    next({ name: 'home' })
    return
  }

  next()
})

export default router
