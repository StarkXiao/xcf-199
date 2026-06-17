export interface User {
  id: number
  username: string
  real_name: string
  phone: string
  branch: string
  role: string
  points: number
  avatar: string
  created_at: string
}

export interface Article {
  id: number
  title: string
  content: string
  category: string
  cover_image: string
  author: string
  status: string
  views: number
  created_at: string
  updated_at: string
  excerpt?: string
}

export interface Activity {
  id: number
  title: string
  description: string
  cover_image: string
  location: string
  start_time: string
  end_time: string
  signup_deadline: string
  max_participants: number
  points_reward: number
  status: string
  signup_count?: number
  is_signed_up?: boolean
  signup_status?: string
  created_at: string
  updated_at: string
}

export interface Notice {
  id: number
  title: string
  content: string
  type: string
  priority: number
  status: string
  created_at: string
  updated_at: string
  excerpt?: string
}

export interface PointsRecord {
  id: number
  user_id: number
  points: number
  reason: string
  type: string
  created_at: string
}

export interface RankingUser {
  id: number
  username: string
  real_name: string
  branch: string
  points: number
  avatar: string
  rank: number
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export type PartyStageCode = 'application' | 'activist' | 'candidate' | 'probationary' | 'probation' | 'formal'

export type PartyStageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export interface PartyStageConfig {
  code: PartyStageCode
  name: string
  sortOrder: number
  description: string
}

export interface PartyDevelopmentStage {
  id: number
  development_id: number
  stage_code: PartyStageCode
  stage_name: string
  status: PartyStageStatus
  start_date?: string
  end_date?: string
  deadline_date?: string
  description?: string
  reviewer?: string
  review_opinion?: string
  review_date?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PartyDevelopmentMaterial {
  id: number
  development_id: number
  stage_code?: PartyStageCode
  material_name: string
  material_type?: string
  file_url?: string
  file_size?: number
  uploaded_by?: number
  description?: string
  created_at: string
}

export interface PartyDevelopmentHistory {
  id: number
  development_id: number
  stage_code?: PartyStageCode
  action_type: string
  action_detail?: string
  operator_id?: number
  operator_name?: string
  created_at: string
}

export interface PartyDevelopment {
  id: number
  user_id: number
  current_stage: PartyStageCode
  overall_status: 'in_progress' | 'completed' | 'suspended'
  application_date?: string
  activist_date?: string
  candidate_date?: string
  probationary_date?: string
  probation_start_date?: string
  probation_end_date?: string
  formal_date?: string
  branch_secretary?: string
  introducer1?: string
  introducer2?: string
  remarks?: string
  created_at: string
  updated_at: string
  stages?: PartyDevelopmentStage[]
  materials?: PartyDevelopmentMaterial[]
  history?: PartyDevelopmentHistory[]
  user?: User
}

export interface PartyDevelopmentListItem extends PartyDevelopment {
  real_name: string
  branch: string
  phone: string
}

export interface PartyReminder {
  id: number
  development_id: number
  stage_code: PartyStageCode
  stage_name: string
  status: PartyStageStatus
  deadline_date: string
  user_id: number
  real_name: string
  branch: string
}

export interface VolunteerProject {
  id: number
  title: string
  description: string
  cover_image: string
  category: string
  location: string
  start_time: string
  end_time: string
  signup_deadline: string
  max_participants: number
  points_per_hour: number
  service_hours: number
  organizer: string
  contact_person: string
  contact_phone: string
  status: string
  views: number
  signup_count?: number
  avg_rating?: number
  review_count?: number
  is_signed_up?: boolean
  signup_status?: string
  signup_id?: number
  total_service_hours?: number
  total_points_awarded?: number
  has_reviewed?: boolean
  my_review?: VolunteerReview
  created_at: string
  updated_at: string
}

export interface VolunteerSignup {
  id: number
  user_id: number
  project_id: number
  status: string
  signup_reason: string
  skills: string
  service_hours?: number
  points_awarded?: number
  reviewed_by?: number
  review_opinion?: string
  reviewed_at?: string
  signed_up_at: string
  real_name?: string
  username?: string
  phone?: string
  branch?: string
  avatar?: string
  title?: string
  cover_image?: string
  category?: string
  location?: string
  start_time?: string
  end_time?: string
  project_status?: string
  points_per_hour?: number
}

export interface VolunteerServiceRecord {
  id: number
  signup_id: number
  user_id: number
  project_id: number
  service_date: string
  start_time: string
  end_time: string
  actual_hours: number
  task_description: string
  recorded_by?: number
  points_awarded: number
  status: string
  created_at: string
  real_name?: string
  username?: string
  project_title?: string
  project_category?: string
}

export interface VolunteerReview {
  id: number
  user_id: number
  project_id: number
  rating: number
  content: string
  is_anonymous: number
  reply_content?: string
  reply_by?: number
  reply_at?: string
  created_at: string
  real_name?: string
  avatar?: string
}

export interface VolunteerStats {
  total_projects: number
  recruiting_projects: number
  completed_projects: number
  total_volunteers: number
  total_service_hours: number
  total_points_awarded: number
}

export interface VolunteerMyStats {
  total_projects: number
  total_hours: number
  total_points: number
}

export interface VolunteerCategoryStats {
  category: string
  project_count: number
}

export interface VolunteerRanking {
  id: number
  real_name: string
  branch: string
  avatar: string
  total_hours: number
  total_points: number
}

export type BranchMeetingType = 'branch_committee' | 'member_congress' | 'group_meeting' | 'party_lesson'

export type BranchMeetingStatus = 'notified' | 'ongoing' | 'completed' | 'cancelled'

export interface BranchMeeting {
  id: number
  title: string
  branch: string
  meeting_type: BranchMeetingType
  location: string
  meeting_time: string
  end_time: string
  status: BranchMeetingStatus
  notification_content: string
  minutes_content: string
  created_by: number
  created_at: string
  updated_at: string
  agendas?: BranchMeetingAgenda[]
  attendees?: BranchMeetingAttendee[]
  checkins?: BranchMeetingCheckin[]
  resolutions?: BranchMeetingResolution[]
  attendee_count?: number
  checkin_count?: number
  creator_name?: string
}

export interface BranchMeetingAgenda {
  id: number
  meeting_id: number
  title: string
  content: string
  sort_order: number
  status: 'pending' | 'discussed' | 'passed' | 'rejected'
  discussion_result: string
  created_at: string
}

export interface BranchMeetingAttendee {
  id: number
  meeting_id: number
  user_id: number
  is_required: number
  status: 'pending' | 'confirmed' | 'leave' | 'unresponsive'
  created_at: string
  real_name?: string
  phone?: string
  branch?: string
  avatar?: string
  checked_in?: boolean
}

export interface BranchMeetingCheckin {
  id: number
  meeting_id: number
  user_id: number
  checkin_time: string
  checkin_type: 'onsite' | 'online'
  created_at: string
  real_name?: string
  avatar?: string
}

export interface BranchMeetingResolution {
  id: number
  meeting_id: number
  agenda_id: number
  title: string
  content: string
  result: 'passed' | 'rejected' | 'pending'
  vote_for: number
  vote_against: number
  vote_abstain: number
  resolved_at: string
  created_at: string
  agenda_title?: string
}

export interface BranchMeetingStats {
  total_meetings: number
  by_type: { type: string; count: number }[]
  by_branch: { branch: string; count: number }[]
  by_month: { month: string; count: number }[]
  avg_attendance_rate: number
  total_resolutions: number
  passed_resolutions: number
}

export type LearningDifficulty = 'beginner' | 'intermediate' | 'advanced'

export type LearningStageStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export type LearningLevelStatus = 'locked' | 'current' | 'completed'

export interface LearningTopic {
  id: number
  name: string
  description: string
  icon: string
  color: string
  total_levels: number
  total_lessons: number
  progress: number
  sort_order: number
}

export interface LearningLevel {
  id: number
  topic_id: number
  name: string
  description: string
  level_number: number
  difficulty: LearningDifficulty
  status: LearningLevelStatus
  required_points: number
  total_lessons: number
  completed_lessons: number
  icon: string
}

export interface LearningLesson {
  id: number
  level_id: number
  topic_id: number
  title: string
  description: string
  content: string
  duration: number
  points_reward: number
  sort_order: number
  status: LearningStageStatus
  article_id?: number
  quiz_id?: number
}

export interface LearningProgress {
  user_id: number
  topic_id: number
  level_id: number
  lesson_id: number
  status: LearningStageStatus
  started_at?: string
  completed_at?: string
  duration_spent: number
  score?: number
}

export interface LearningTopicProgress {
  topic_id: number
  topic_name: string
  total_levels: number
  completed_levels: number
  total_lessons: number
  completed_lessons: number
  progress_percent: number
  total_points: number
  earned_points: number
  levels: LearningLevelProgress[]
}

export interface LearningLevelProgress {
  level_id: number
  level_name: string
  level_number: number
  difficulty: LearningDifficulty
  status: LearningLevelStatus
  total_lessons: number
  completed_lessons: number
  progress_percent: number
  lessons: LearningLessonProgress[]
}

export interface LearningLessonProgress {
  lesson_id: number
  title: string
  status: LearningStageStatus
  completed_at?: string
  score?: number
  points_earned: number
}

export interface LearningStageResult {
  type: 'level' | 'topic'
  id: number
  name: string
  completed: boolean
  total_lessons: number
  completed_lessons: number
  total_points: number
  earned_points: number
  avg_score?: number
  completed_at: string
  next_stage_name?: string
}

export interface LearningUserStats {
  user_id: number
  total_topics: number
  completed_topics: number
  total_levels: number
  completed_levels: number
  total_lessons: number
  completed_lessons: number
  total_points: number
  earned_points: number
  current_streak: number
  longest_streak: number
  total_study_minutes: number
  last_study_date?: string
}

export type TransferStageCode = 'submit' | 'branch_out' | 'material_check' | 'committee_out' | 'branch_in' | 'committee_in' | 'complete'

export type TransferOverallStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled'

export type TransferStageStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

export type TransferMaterialVerifyStatus = 'pending' | 'passed' | 'rejected'

export type TransferType = 'internal' | 'external'

export type TransferDirection = 'out' | 'in'

export interface PartyTransferStageConfig {
  code: TransferStageCode
  name: string
  sortOrder: number
  description: string
  role: string
  handler: string
}

export interface PartyTransferRequiredMaterial {
  name: string
  type: string
  required: boolean
}

export interface PartyTransferStage {
  id: number
  transfer_id: number
  stage_code: TransferStageCode
  stage_name: string
  status: TransferStageStatus
  description?: string
  handler?: string
  handler_role?: string
  opinion?: string
  handle_date?: string
  deadline_date?: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface PartyTransferMaterial {
  id: number
  transfer_id: number
  stage_code?: TransferStageCode
  material_name: string
  material_type?: string
  file_url?: string
  file_size?: number
  uploaded_by?: number
  is_required: number
  verify_status: TransferMaterialVerifyStatus
  verify_opinion?: string
  verified_by?: number
  verified_at?: string
  description?: string
  created_at: string
}

export interface PartyTransferHistory {
  id: number
  transfer_id: number
  stage_code?: TransferStageCode
  action_type: string
  action_detail?: string
  operator_id?: number
  operator_name?: string
  operator_role?: string
  created_at: string
}

export interface PartyTransfer {
  id: number
  user_id: number
  transfer_type: TransferType
  transfer_direction: TransferDirection
  from_branch: string
  to_branch: string
  from_organization?: string
  to_organization?: string
  reason: string
  remarks?: string
  current_stage: TransferStageCode
  overall_status: TransferOverallStatus
  submit_date?: string
  expected_date?: string
  completed_date?: string
  created_at: string
  updated_at: string
  stages?: PartyTransferStage[]
  materials?: PartyTransferMaterial[]
  history?: PartyTransferHistory[]
  user?: User
  real_name?: string
  user_branch?: string
  phone?: string
}

export interface PartyTransferStats {
  total: number
  pending: number
  processing: number
  completed: number
  rejected: number
  cancelled: number
  by_stage: { stage: TransferStageCode; name: string; count: number }[]
  by_month: { month: string; count: number }[]
}

