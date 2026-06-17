import { defineStore } from 'pinia'
import { ref, computed, watch, watchEffect, toRaw } from 'vue'
import type {
  LearningTopic,
  LearningLevel,
  LearningLesson,
  LearningTopicProgress,
  LearningLevelProgress,
  LearningLessonProgress,
  LearningStageResult,
  LearningUserStats,
  LearningDifficulty,
  LearningStageStatus,
  LearningLevelStatus
} from '@/types'
import { useUserStore } from './user'

const STORAGE_PREFIX = 'learning_map_'
const STORAGE_VERSION = '1.0'

interface PersistedState {
  version: string
  userId: number
  topicsProgress: Record<number, number>
  levels: Record<number, {
    status: LearningLevelStatus
    completed_lessons: number
  }>
  lessons: Record<number, {
    status: LearningStageStatus
  }>
  currentTopicId: number | null
  currentLevelId: number | null
  currentLessonId: number | null
  completedStageResults: LearningStageResult[]
  totalStudyMinutes: number
  updatedAt: string
}

const defaultTopics: LearningTopic[] = [
  {
    id: 1,
    name: '党的基础知识',
    description: '系统学习中国共产党的基本理论、基本路线、基本方略',
    icon: '📖',
    color: '#c81d25',
    total_levels: 3,
    total_lessons: 9,
    progress: 0,
    sort_order: 1
  },
  {
    id: 2,
    name: '党史学习',
    description: '重温党的百年光辉历程，铭记初心使命',
    icon: '🏛️',
    color: '#e63946',
    total_levels: 4,
    total_lessons: 12,
    progress: 0,
    sort_order: 2
  },
  {
    id: 3,
    name: '新时代中国特色社会主义思想',
    description: '深入学习贯彻习近平新时代中国特色社会主义思想',
    icon: '🌟',
    color: '#ffba08',
    total_levels: 4,
    total_lessons: 12,
    progress: 0,
    sort_order: 3
  },
  {
    id: 4,
    name: '党规党纪',
    description: '学习党章党规，严守党的纪律规矩',
    icon: '⚖️',
    color: '#28a745',
    total_levels: 3,
    total_lessons: 9,
    progress: 0,
    sort_order: 4
  }
]

const defaultLevels: LearningLevel[] = [
  {
    id: 101,
    topic_id: 1,
    name: '入门篇',
    description: '了解党的基本概念和基本知识',
    level_number: 1,
    difficulty: 'beginner',
    status: 'locked',
    required_points: 0,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🌱'
  },
  {
    id: 102,
    topic_id: 1,
    name: '进阶篇',
    description: '深入理解党的性质、宗旨和纲领',
    level_number: 2,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 100,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🌿'
  },
  {
    id: 103,
    topic_id: 1,
    name: '精通篇',
    description: '全面掌握党的理论体系',
    level_number: 3,
    difficulty: 'advanced',
    status: 'locked',
    required_points: 300,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🌳'
  },
  {
    id: 201,
    topic_id: 2,
    name: '新民主主义革命时期',
    description: '学习1921-1949年党的历史',
    level_number: 1,
    difficulty: 'beginner',
    status: 'locked',
    required_points: 0,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🔴'
  },
  {
    id: 202,
    topic_id: 2,
    name: '社会主义革命和建设时期',
    description: '学习1949-1978年党的历史',
    level_number: 2,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 80,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🟠'
  },
  {
    id: 203,
    topic_id: 2,
    name: '改革开放和社会主义现代化建设新时期',
    description: '学习1978-2012年党的历史',
    level_number: 3,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 200,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🟡'
  },
  {
    id: 204,
    topic_id: 2,
    name: '中国特色社会主义新时代',
    description: '学习2012年以来党的历史',
    level_number: 4,
    difficulty: 'advanced',
    status: 'locked',
    required_points: 350,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🟢'
  },
  {
    id: 301,
    topic_id: 3,
    name: '思想概论',
    description: '了解新时代中国特色社会主义思想的核心要义',
    level_number: 1,
    difficulty: 'beginner',
    status: 'locked',
    required_points: 150,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '💡'
  },
  {
    id: 302,
    topic_id: 3,
    name: '八个明确',
    description: '深入学习八个明确的丰富内涵',
    level_number: 2,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 250,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '📚'
  },
  {
    id: 303,
    topic_id: 3,
    name: '十四个坚持',
    description: '掌握十四个坚持的基本方略',
    level_number: 3,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 400,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🎯'
  },
  {
    id: 304,
    topic_id: 3,
    name: '实践应用',
    description: '将理论学习转化为实践能力',
    level_number: 4,
    difficulty: 'advanced',
    status: 'locked',
    required_points: 600,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🚀'
  },
  {
    id: 401,
    topic_id: 4,
    name: '党章学习',
    description: '逐条学习党章内容',
    level_number: 1,
    difficulty: 'beginner',
    status: 'locked',
    required_points: 200,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '📋'
  },
  {
    id: 402,
    topic_id: 4,
    name: '廉洁自律准则',
    description: '学习党员廉洁自律规范',
    level_number: 2,
    difficulty: 'intermediate',
    status: 'locked',
    required_points: 320,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '🛡️'
  },
  {
    id: 403,
    topic_id: 4,
    name: '纪律处分条例',
    description: '了解党的纪律要求',
    level_number: 3,
    difficulty: 'advanced',
    status: 'locked',
    required_points: 480,
    total_lessons: 3,
    completed_lessons: 0,
    icon: '⚠️'
  }
]

const defaultLessons: LearningLesson[] = [
  {
    id: 1001,
    level_id: 101,
    topic_id: 1,
    title: '中国共产党的成立',
    description: '了解中国共产党成立的历史背景和意义',
    content: '1921年7月，中国共产党第一次全国代表大会在上海召开，标志着中国共产党的正式成立...',
    duration: 15,
    points_reward: 20,
    sort_order: 1,
    status: 'locked',
    article_id: 1
  },
  {
    id: 1002,
    level_id: 101,
    topic_id: 1,
    title: '党的性质和宗旨',
    description: '学习中国共产党的性质和根本宗旨',
    content: '中国共产党是中国工人阶级的先锋队，同时是中国人民和中华民族的先锋队...',
    duration: 20,
    points_reward: 25,
    sort_order: 2,
    status: 'locked',
    article_id: 2
  },
  {
    id: 1003,
    level_id: 101,
    topic_id: 1,
    title: '党的纲领和任务',
    description: '理解党的最高纲领和现阶段任务',
    content: '党的最高理想和最终目标是实现共产主义...',
    duration: 18,
    points_reward: 25,
    sort_order: 3,
    status: 'locked',
    article_id: 3
  },
  {
    id: 1004,
    level_id: 102,
    topic_id: 1,
    title: '党的指导思想',
    description: '系统学习党的指导思想的发展历程',
    content: '中国共产党以马克思列宁主义、毛泽东思想、邓小平理论...',
    duration: 25,
    points_reward: 30,
    sort_order: 1,
    status: 'locked',
    article_id: 4
  },
  {
    id: 1005,
    level_id: 102,
    topic_id: 1,
    title: '党的组织制度',
    description: '了解民主集中制的基本原则',
    content: '民主集中制是党的根本组织原则和领导制度...',
    duration: 22,
    points_reward: 30,
    sort_order: 2,
    status: 'locked',
    article_id: 5
  },
  {
    id: 1006,
    level_id: 102,
    topic_id: 1,
    title: '党员的权利和义务',
    description: '学习党员应当履行的义务和享有的权利',
    content: '党员必须履行下列义务...党员享有下列权利...',
    duration: 28,
    points_reward: 35,
    sort_order: 3,
    status: 'locked',
    article_id: 6
  },
  {
    id: 1007,
    level_id: 103,
    topic_id: 1,
    title: '党的建设总要求',
    description: '全面理解新时代党的建设总要求',
    content: '坚持和加强党的全面领导，坚持党要管党、全面从严治党...',
    duration: 30,
    points_reward: 40,
    sort_order: 1,
    status: 'locked'
  },
  {
    id: 1008,
    level_id: 103,
    topic_id: 1,
    title: '全面从严治党',
    description: '深入学习全面从严治党的战略部署',
    content: '全面从严治党永远在路上...',
    duration: 32,
    points_reward: 45,
    sort_order: 2,
    status: 'locked'
  },
  {
    id: 1009,
    level_id: 103,
    topic_id: 1,
    title: '党的执政能力建设',
    description: '提高党的执政能力和领导水平',
    content: '党的执政能力建设是党执政后的一项根本建设...',
    duration: 35,
    points_reward: 50,
    sort_order: 3,
    status: 'locked'
  },
  {
    id: 2001,
    level_id: 201,
    topic_id: 2,
    title: '五四运动和马克思主义传播',
    description: '了解建党前的思想准备',
    content: '1919年五四运动爆发，促进了马克思主义在中国的传播...',
    duration: 18,
    points_reward: 20,
    sort_order: 1,
    status: 'locked'
  },
  {
    id: 2002,
    level_id: 201,
    topic_id: 2,
    title: '中共一大的召开',
    description: '中国共产党的诞生',
    content: '1921年7月23日，中共一大在上海法租界望志路106号召开...',
    duration: 20,
    points_reward: 25,
    sort_order: 2,
    status: 'locked'
  },
  {
    id: 2003,
    level_id: 201,
    topic_id: 2,
    title: '第一次国共合作',
    description: '国民革命运动的兴起',
    content: '1924年，国民党一大的召开标志着第一次国共合作正式形成...',
    duration: 22,
    points_reward: 25,
    sort_order: 3,
    status: 'locked'
  },
  {
    id: 2004,
    level_id: 202,
    topic_id: 2,
    title: '新中国的成立',
    description: '中华人民共和国的诞生',
    content: '1949年10月1日，毛泽东在北京天安门城楼宣布中华人民共和国成立...',
    duration: 25,
    points_reward: 30,
    sort_order: 1,
    status: 'locked'
  },
  {
    id: 2005,
    level_id: 202,
    topic_id: 2,
    title: '社会主义改造',
    description: '从新民主主义到社会主义的转变',
    content: '1953年，党中央提出了过渡时期总路线...',
    duration: 28,
    points_reward: 35,
    sort_order: 2,
    status: 'locked'
  },
  {
    id: 2006,
    level_id: 202,
    topic_id: 2,
    title: '探索中的曲折发展',
    description: '全面建设社会主义时期',
    content: '1956年，社会主义改造基本完成后，党领导全国人民开始全面建设社会主义...',
    duration: 30,
    points_reward: 35,
    sort_order: 3,
    status: 'locked'
  }
]

function getStorageKey(userId: number): string {
  return `${STORAGE_PREFIX}${userId}`
}

function createDefaultPersistedState(userId: number): PersistedState {
  return {
    version: STORAGE_VERSION,
    userId,
    topicsProgress: {},
    levels: {},
    lessons: {},
    currentTopicId: null,
    currentLevelId: null,
    currentLessonId: null,
    completedStageResults: [],
    totalStudyMinutes: 0,
    updatedAt: new Date().toISOString()
  }
}

function loadPersistedState(userId: number): PersistedState | null {
  try {
    const key = getStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedState

    if (parsed.version !== STORAGE_VERSION) {
      console.warn('[LearningMap] Storage version mismatch, resetting')
      localStorage.removeItem(key)
      return null
    }
    if (parsed.userId !== userId) {
      console.warn('[LearningMap] User ID mismatch, resetting')
      localStorage.removeItem(key)
      return null
    }

    return parsed
  } catch (error) {
    console.error('[LearningMap] Failed to load persisted state:', error)
    return null
  }
}

function savePersistedState(userId: number, state: PersistedState): void {
  try {
    const key = getStorageKey(userId)
    const raw = JSON.stringify(state)
    localStorage.setItem(key, raw)
  } catch (error) {
    console.error('[LearningMap] Failed to save persisted state:', error)
  }
}

function clearPersistedState(userId: number): void {
  try {
    const key = getStorageKey(userId)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('[LearningMap] Failed to clear persisted state:', error)
  }
}

export const useLearningMapStore = defineStore('learningMap', () => {
  const userStore = useUserStore()

  const topics = ref<LearningTopic[]>(JSON.parse(JSON.stringify(defaultTopics)))
  const levels = ref<LearningLevel[]>(JSON.parse(JSON.stringify(defaultLevels)))
  const lessons = ref<LearningLesson[]>(JSON.parse(JSON.stringify(defaultLessons)))
  const currentTopicId = ref<number | null>(null)
  const currentLevelId = ref<number | null>(null)
  const currentLessonId = ref<number | null>(null)
  const showStageResult = ref(false)
  const stageResult = ref<LearningStageResult | null>(null)
  const isRestoring = ref(false)
  const isInitialized = ref(false)

  const currentTopic = computed(() => {
    if (!currentTopicId.value) return null
    return topics.value.find(t => t.id === currentTopicId.value) || null
  })

  const currentLevel = computed(() => {
    if (!currentLevelId.value) return null
    return levels.value.find(l => l.id === currentLevelId.value) || null
  })

  const currentLesson = computed(() => {
    if (!currentLessonId.value) return null
    return lessons.value.find(l => l.id === currentLessonId.value) || null
  })

  const levelsByTopic = computed(() => {
    if (!currentTopicId.value) return []
    return levels.value
      .filter(l => l.topic_id === currentTopicId.value)
      .sort((a, b) => a.level_number - b.level_number)
  })

  const lessonsByLevel = computed(() => {
    if (!currentLevelId.value) return []
    return lessons.value
      .filter(l => l.level_id === currentLevelId.value)
      .sort((a, b) => a.sort_order - b.sort_order)
  })

  const userStats = computed<LearningUserStats>(() => {
    const allLessons = lessons.value
    const completedLessons = allLessons.filter(l => l.status === 'completed')
    const completedLevels = levels.value.filter(l => l.status === 'completed')
    const completedTopics = topics.value.filter(t => t.progress === 100)
    const totalPoints = allLessons.reduce((sum, l) => sum + l.points_reward, 0)
    const earnedPoints = completedLessons.reduce((sum, l) => sum + l.points_reward, 0)
    const totalStudyMinutes = completedLessons.reduce((sum, l) => sum + l.duration, 0)

    return {
      user_id: userStore.user?.id || 0,
      total_topics: topics.value.length,
      completed_topics: completedTopics.length,
      total_levels: levels.value.length,
      completed_levels: completedLevels.length,
      total_lessons: allLessons.length,
      completed_lessons: completedLessons.length,
      total_points: totalPoints,
      earned_points: earnedPoints,
      current_streak: 5,
      longest_streak: 12,
      total_study_minutes: totalStudyMinutes,
      last_study_date: new Date().toISOString()
    }
  })

  const currentUserId = computed(() => userStore.user?.id || null)

  function initializeStore() {
    if (!currentUserId.value) {
      resetToDefaults()
      isInitialized.value = true
      return
    }

    isRestoring.value = true
    try {
      const persisted = loadPersistedState(currentUserId.value)
      if (persisted) {
        applyPersistedState(persisted)
      } else {
        resetToDefaults()
        updateLockedStatus()
      }
    } finally {
      isRestoring.value = false
      isInitialized.value = true
    }
  }

  function resetToDefaults() {
    topics.value = JSON.parse(JSON.stringify(defaultTopics))
    levels.value = JSON.parse(JSON.stringify(defaultLevels))
    lessons.value = JSON.parse(JSON.stringify(defaultLessons))
    currentTopicId.value = null
    currentLevelId.value = null
    currentLessonId.value = null
    showStageResult.value = false
    stageResult.value = null
  }

  function applyPersistedState(persisted: PersistedState) {
    topics.value = JSON.parse(JSON.stringify(defaultTopics))
    levels.value = JSON.parse(JSON.stringify(defaultLevels))
    lessons.value = JSON.parse(JSON.stringify(defaultLessons))

    topics.value.forEach(topic => {
      topic.progress = persisted.topicsProgress[topic.id] || 0
    })

    levels.value.forEach(level => {
      const saved = persisted.levels[level.id]
      if (saved) {
        level.status = saved.status
        level.completed_lessons = saved.completed_lessons
      }
    })

    lessons.value.forEach(lesson => {
      const saved = persisted.lessons[lesson.id]
      if (saved) {
        lesson.status = saved.status
      }
    })

    currentTopicId.value = persisted.currentTopicId
    currentLevelId.value = persisted.currentLevelId
    currentLessonId.value = persisted.currentLessonId

    updateLockedStatus()
  }

  function buildPersistedState(): PersistedState {
    const userId = currentUserId.value
    if (!userId) {
      throw new Error('No user logged in')
    }

    const topicsProgress: Record<number, number> = {}
    topics.value.forEach(t => { topicsProgress[t.id] = t.progress })

    const levelStates: Record<number, { status: LearningLevelStatus; completed_lessons: number }> = {}
    levels.value.forEach(l => {
      levelStates[l.id] = { status: l.status, completed_lessons: l.completed_lessons }
    })

    const lessonStates: Record<number, { status: LearningStageStatus }> = {}
    lessons.value.forEach(l => { lessonStates[l.id] = { status: l.status } })

    return {
      version: STORAGE_VERSION,
      userId,
      topicsProgress,
      levels: levelStates,
      lessons: lessonStates,
      currentTopicId: currentTopicId.value,
      currentLevelId: currentLevelId.value,
      currentLessonId: currentLessonId.value,
      completedStageResults: [],
      totalStudyMinutes: lessons.value.filter(l => l.status === 'completed').reduce((sum, l) => sum + l.duration, 0),
      updatedAt: new Date().toISOString()
    }
  }

  function persistIfNeeded() {
    if (isRestoring.value || !isInitialized.value) return
    if (!currentUserId.value) return

    try {
      const state = buildPersistedState()
      savePersistedState(currentUserId.value, state)
    } catch (error) {
      console.error('[LearningMap] Failed to persist state:', error)
    }
  }

  function clearUserLearningData(userId: number) {
    clearPersistedState(userId)
    if (currentUserId.value === userId) {
      resetToDefaults()
      updateLockedStatus()
    }
  }

  const difficultyText = (difficulty: LearningDifficulty): string => {
    const map: Record<LearningDifficulty, string> = {
      beginner: '入门',
      intermediate: '进阶',
      advanced: '高级'
    }
    return map[difficulty]
  }

  const difficultyColor = (difficulty: LearningDifficulty): string => {
    const map: Record<LearningDifficulty, string> = {
      beginner: 'var(--success-color)',
      intermediate: 'var(--warning-color)',
      advanced: 'var(--danger-color)'
    }
    return map[difficulty]
  }

  const stageStatusText = (status: LearningStageStatus): string => {
    const map: Record<LearningStageStatus, string> = {
      locked: '未解锁',
      available: '可学习',
      in_progress: '学习中',
      completed: '已完成'
    }
    return map[status]
  }

  const levelStatusText = (status: LearningLevelStatus): string => {
    const map: Record<LearningLevelStatus, string> = {
      locked: '未解锁',
      current: '进行中',
      completed: '已完成'
    }
    return map[status]
  }

  const selectTopic = (topicId: number) => {
    currentTopicId.value = topicId === 0 ? null : topicId
    currentLevelId.value = null
    currentLessonId.value = null
  }

  const selectLevel = (levelId: number) => {
    const level = levels.value.find(l => l.id === levelId)
    if (level && level.status !== 'locked') {
      currentLevelId.value = levelId === 0 ? null : levelId
      currentLessonId.value = null
    }
  }

  const startLesson = (lessonId: number) => {
    const lesson = lessons.value.find(l => l.id === lessonId)
    if (lesson && lesson.status !== 'locked') {
      currentLessonId.value = lessonId
      if (lesson.status === 'available') {
        lesson.status = 'in_progress'
      }
    }
  }

  const completeLesson = (lessonId: number, score?: number) => {
    const lesson = lessons.value.find(l => l.id === lessonId)
    if (!lesson) return

    lesson.status = 'completed'

    const level = levels.value.find(l => l.id === lesson.level_id)
    if (level) {
      level.completed_lessons = Math.min(level.completed_lessons + 1, level.total_lessons)

      if (level.completed_lessons === level.total_lessons) {
        level.status = 'completed'
        handleLevelComplete(level.id)
      }
    }

    const topic = topics.value.find(t => t.id === lesson.topic_id)
    if (topic) {
      const topicLevels = levels.value.filter(l => l.topic_id === topic.id)
      const completedCount = topicLevels.filter(l => l.status === 'completed').length
      topic.progress = Math.round((completedCount / topicLevels.length) * 100)

      if (topic.progress === 100) {
        handleTopicComplete(topic.id)
      }
    }

    currentLessonId.value = null
    updateLockedStatus()
  }

  const handleLevelComplete = (levelId: number) => {
    const level = levels.value.find(l => l.id === levelId)
    if (!level) return

    const topicLevels = levels.value
      .filter(l => l.topic_id === level.topic_id)
      .sort((a, b) => a.level_number - b.level_number)
    const currentIndex = topicLevels.findIndex(l => l.id === levelId)
    const nextLevel = currentIndex < topicLevels.length - 1 ? topicLevels[currentIndex + 1] : null

    const levelLessons = lessons.value.filter(l => l.level_id === levelId)
    const completedLessons = levelLessons.filter(l => l.status === 'completed')
    const earnedPoints = completedLessons.reduce((sum, l) => sum + l.points_reward, 0)
    const totalPoints = levelLessons.reduce((sum, l) => sum + l.points_reward, 0)

    stageResult.value = {
      type: 'level',
      id: level.id,
      name: level.name,
      completed: true,
      total_lessons: level.total_lessons,
      completed_lessons: level.completed_lessons,
      total_points: totalPoints,
      earned_points: earnedPoints,
      completed_at: new Date().toISOString(),
      next_stage_name: nextLevel?.name
    }
    showStageResult.value = true
  }

  const handleTopicComplete = (topicId: number) => {
    const topic = topics.value.find(t => t.id === topicId)
    if (!topic) return

    const topicLevels = levels.value.filter(l => l.topic_id === topicId)
    const topicLessons = lessons.value.filter(l => l.topic_id === topicId)
    const completedLessons = topicLessons.filter(l => l.status === 'completed')
    const earnedPoints = completedLessons.reduce((sum, l) => sum + l.points_reward, 0)
    const totalPoints = topicLessons.reduce((sum, l) => sum + l.points_reward, 0)

    const topicsList = topics.value.sort((a, b) => a.sort_order - b.sort_order)
    const currentIndex = topicsList.findIndex(t => t.id === topicId)
    const nextTopic = currentIndex < topicsList.length - 1 ? topicsList[currentIndex + 1] : null

    stageResult.value = {
      type: 'topic',
      id: topic.id,
      name: topic.name,
      completed: true,
      total_lessons: topic.total_lessons,
      completed_lessons: completedLessons.length,
      total_points: totalPoints,
      earned_points: earnedPoints,
      completed_at: new Date().toISOString(),
      next_stage_name: nextTopic?.name
    }
    showStageResult.value = true
  }

  const updateLockedStatus = () => {
    const sortedTopics = [...topics.value].sort((a, b) => a.sort_order - b.sort_order)

    for (let i = 0; i < sortedTopics.length; i++) {
      const topic = sortedTopics[i]
      const topicLevels = levels.value
        .filter(l => l.topic_id === topic.id)
        .sort((a, b) => a.level_number - b.level_number)

      if (i === 0 || sortedTopics[i - 1].progress === 100) {
        for (let j = 0; j < topicLevels.length; j++) {
          const level = topicLevels[j]
          if (level.status === 'locked') {
            if (j === 0 || topicLevels[j - 1].status === 'completed') {
              level.status = 'current'
              const levelLessons = lessons.value.filter(l => l.level_id === level.id)
              levelLessons.forEach(lesson => {
                if (lesson.status === 'locked') {
                  lesson.status = 'available'
                }
              })
            }
          }
        }
        } else {
          for (let j = 0; j < topicLevels.length; j++) {
            const level = topicLevels[j]
            if (level.status !== 'completed') {
              level.status = 'locked'
              level.completed_lessons = 0
              const levelLessons = lessons.value.filter(l => l.level_id === level.id)
              levelLessons.forEach(lesson => {
                if (lesson.status !== 'completed') {
                  lesson.status = 'locked'
                }
              })
            }
          }
        }
    }
  }

  const closeStageResult = () => {
    showStageResult.value = false
    stageResult.value = null
  }

  const getTopicProgress = (topicId: number): LearningTopicProgress | null => {
    const topic = topics.value.find(t => t.id === topicId)
    if (!topic) return null

    const topicLevels = levels.value
      .filter(l => l.topic_id === topicId)
      .sort((a, b) => a.level_number - b.level_number)

    const levelsProgress: LearningLevelProgress[] = topicLevels.map(level => {
      const levelLessons = lessons.value
        .filter(l => l.level_id === level.id)
        .sort((a, b) => a.sort_order - b.sort_order)

      const lessonsProgress: LearningLessonProgress[] = levelLessons.map(lesson => ({
        lesson_id: lesson.id,
        title: lesson.title,
        status: lesson.status,
        completed_at: lesson.status === 'completed' ? new Date().toISOString() : undefined,
        score: lesson.status === 'completed' ? Math.floor(Math.random() * 20 + 80) : undefined,
        points_earned: lesson.status === 'completed' ? lesson.points_reward : 0
      }))

      const completedLessons = lessonsProgress.filter(l => l.status === 'completed').length
      const earnedPoints = lessonsProgress.reduce((sum, l) => sum + l.points_earned, 0)
      const totalPoints = levelLessons.reduce((sum, l) => sum + l.points_reward, 0)

      return {
        level_id: level.id,
        level_name: level.name,
        level_number: level.level_number,
        difficulty: level.difficulty,
        status: level.status,
        total_lessons: level.total_lessons,
        completed_lessons: completedLessons,
        progress_percent: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0,
        lessons: lessonsProgress
      }
    })

    const completedLevelCount = levelsProgress.filter(l => l.status === 'completed').length
    const totalCompletedLessons = levelsProgress.reduce((sum, l) => sum + l.completed_lessons, 0)
    const totalEarnedPoints = levelsProgress.reduce((sum, l) => {
      const levelLessons = lessons.value.filter(lesson => lesson.level_id === l.level_id)
      const completedL = levelLessons.filter(lesson => lesson.status === 'completed')
      return sum + completedL.reduce((s, lesson) => s + lesson.points_reward, 0)
    }, 0)
    const totalTopicPoints = lessons.value
      .filter(l => l.topic_id === topicId)
      .reduce((sum, l) => sum + l.points_reward, 0)

    return {
      topic_id: topic.id,
      topic_name: topic.name,
      total_levels: topic.total_levels,
      completed_levels: completedLevelCount,
      total_lessons: topic.total_lessons,
      completed_lessons: totalCompletedLessons,
      progress_percent: topic.progress,
      total_points: totalTopicPoints,
      earned_points: totalEarnedPoints,
      levels: levelsProgress
    }
  }

  watch(
    () => userStore.user,
    (newUser, oldUser) => {
      if (newUser && newUser.id !== oldUser?.id) {
        initializeStore()
      } else if (!newUser && oldUser) {
        clearUserLearningData(oldUser.id)
      }
    },
    { immediate: true }
  )

  watch(
    [levels, lessons, topics, currentTopicId, currentLevelId, currentLessonId],
    () => {
      persistIfNeeded()
    },
    { deep: true }
  )

  watchEffect(() => {
    if (userStore.token && !isInitialized.value) {
      initializeStore()
    }
  })

  return {
    topics,
    levels,
    lessons,
    currentTopicId,
    currentLevelId,
    currentLessonId,
    showStageResult,
    stageResult,
    isRestoring,
    isInitialized,
    currentTopic,
    currentLevel,
    currentLesson,
    levelsByTopic,
    lessonsByLevel,
    userStats,
    difficultyText,
    difficultyColor,
    stageStatusText,
    levelStatusText,
    selectTopic,
    selectLevel,
    startLesson,
    completeLesson,
    closeStageResult,
    getTopicProgress,
    initializeStore,
    clearUserLearningData,
    persistIfNeeded
  }
})
