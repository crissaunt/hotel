import { ref } from 'vue'
import { dateKey } from '@/features/front-office/stores/reservations'

export type NightAuditRun = {
  id: string
  businessDate: string
  nextBusinessDate: string
  roomCharges: number
  otherCharges: number
  tax: number
  payments: number
  noShows: string[]
  completedAt: string
  completedBy: string
}

export const businessDate = ref(dateKey(new Date()))
export const nightAuditRuns = ref<NightAuditRun[]>([])

export function nextDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + 1)
  return dateKey(date)
}
