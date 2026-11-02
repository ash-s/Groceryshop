import api from './client'
import type { AttendanceRow, SalarySummary } from '../types'

export interface AttendanceEntry {
  userId: number
  status: 'PRESENT' | 'HALF_DAY' | 'LEAVE' | 'ABSENT'
  notes?: string
}

export interface SalaryPayInput {
  userId: number
  month: string
  bonus?: number
  deductions?: number
  paidAmount?: number
  notes?: string
}

export const staffApi = {
  getAttendance: async (date?: string) => {
    const res = await api.get<AttendanceRow[]>('/admin/staff/attendance', {
      params: date ? { date } : {},
    })
    return res.data
  },
  markAttendance: async (date: string, entries: AttendanceEntry[]) => {
    const res = await api.post<AttendanceRow[]>('/admin/staff/attendance', { date, entries })
    return res.data
  },
  getSalary: async (month?: string) => {
    const res = await api.get<SalarySummary[]>('/admin/staff/salary', {
      params: month ? { month } : {},
    })
    return res.data
  },
  paySalary: async (input: SalaryPayInput) => {
    const res = await api.post<SalarySummary[]>('/admin/staff/salary/pay', input)
    return res.data
  },
}
