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
