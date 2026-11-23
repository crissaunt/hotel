import { ref } from 'vue'
import { dateKey } from '@/features/front-office/stores/reservations'

export type PettyExpenseStatus = 'Recorded' | 'Voided'
export type PettyExpense = {
  id: string
  date: string
  category: string
  description: string
  payee: string
  method: 'Cash' | 'Mobile money' | 'Card' | 'Bank transfer'
  amount: number
  reference?: string
  notes?: string
  status: PettyExpenseStatus
  cashier: string
  recordedAt: string
  voidReason?: string
  voidedAt?: string
}

export type TillSession = {
  id: string
  businessDate: string
  name: string
  openingAmount: number
  openingNotes?: string
  openedBy: string
  openedAt: string
  status: 'Open' | 'Closed'
  closingAmount?: number
  closedAt?: string
  closedBy?: string
}

export const pettyExpenses = ref<PettyExpense[]>([])
export const tillSessions = ref<TillSession[]>([])

export function todayKey() {
  return dateKey(new Date())
}
