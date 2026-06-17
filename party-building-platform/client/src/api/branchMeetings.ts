import request from '@/utils/request'
import type { BranchMeeting, BranchMeetingAgenda, BranchMeetingAttendee, BranchMeetingCheckin, BranchMeetingResolution, BranchMeetingStats, PaginatedResponse, ApiResponse } from '@/types'

export const getBranchMeetings = (params?: {
  page?: number
  page_size?: number
  branch?: string
  meeting_type?: string
  status?: string
  start_time?: string
  end_time?: string
}) => {
  return request.get<any, ApiResponse<PaginatedResponse<BranchMeeting>>>('/branch-meetings', { params })
}

export const getMyBranchMeetings = (params?: { page?: number; page_size?: number }) => {
  return request.get<any, ApiResponse<PaginatedResponse<BranchMeeting>>>('/branch-meetings/my', { params })
}

export const getBranchMeetingDetail = (id: number) => {
  return request.get<any, ApiResponse<BranchMeeting>>(`/branch-meetings/${id}`)
}

export const getBranchMeetingStats = () => {
  return request.get<any, ApiResponse<BranchMeetingStats>>('/branch-meetings/stats')
}

export const getBranches = () => {
  return request.get<any, ApiResponse<string[]>>('/branch-meetings/branches')
}

export const createBranchMeeting = (data: Partial<BranchMeeting> & { attendee_ids?: number[]; agendas?: Partial<BranchMeetingAgenda>[] }) => {
  return request.post<any, ApiResponse<BranchMeeting>>('/branch-meetings', data)
}

export const updateBranchMeeting = (id: number, data: Partial<BranchMeeting>) => {
  return request.put<any, ApiResponse<BranchMeeting>>(`/branch-meetings/${id}`, data)
}

export const deleteBranchMeeting = (id: number) => {
  return request.delete<any, ApiResponse<null>>(`/branch-meetings/${id}`)
}

export const addAgenda = (meetingId: number, data: Partial<BranchMeetingAgenda>) => {
  return request.post<any, ApiResponse<BranchMeetingAgenda>>(`/branch-meetings/${meetingId}/agendas`, data)
}

export const updateAgenda = (meetingId: number, agendaId: number, data: Partial<BranchMeetingAgenda>) => {
  return request.put<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/agendas/${agendaId}`, data)
}

export const deleteAgenda = (meetingId: number, agendaId: number) => {
  return request.delete<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/agendas/${agendaId}`)
}

export const addAttendees = (meetingId: number, user_ids: number[], is_required?: number) => {
  return request.post<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/attendees`, { user_ids, is_required })
}

export const updateAttendee = (meetingId: number, attendeeId: number, data: Partial<BranchMeetingAttendee>) => {
  return request.put<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/attendees/${attendeeId}`, data)
}

export const removeAttendee = (meetingId: number, attendeeId: number) => {
  return request.delete<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/attendees/${attendeeId}`)
}

export const checkinMeeting = (meetingId: number, checkin_type?: string) => {
  return request.post<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/checkin`, { checkin_type })
}

export const addResolution = (meetingId: number, data: Partial<BranchMeetingResolution>) => {
  return request.post<any, ApiResponse<BranchMeetingResolution>>(`/branch-meetings/${meetingId}/resolutions`, data)
}

export const updateResolution = (meetingId: number, resolutionId: number, data: Partial<BranchMeetingResolution>) => {
  return request.put<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/resolutions/${resolutionId}`, data)
}

export const deleteResolution = (meetingId: number, resolutionId: number) => {
  return request.delete<any, ApiResponse<null>>(`/branch-meetings/${meetingId}/resolutions/${resolutionId}`)
}
