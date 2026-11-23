import { ref } from 'vue'

export type EventRateType = 'Accommodation' | 'Conference' | 'Lunch' | 'Dinner' | 'Other'
export type EventRate = { id: string; packageName: string; type: EventRateType; client: string; amount: number; from: string; to: string; active: boolean; alwaysEffective: boolean }

export const eventRates = ref<EventRate[]>([
  { id: 'RATE-001', packageName: 'Standard Accommodation Rate', type: 'Accommodation', client: 'All clients', amount: 200, from: '2026-01-01', to: '2026-12-31', active: true, alwaysEffective: false },
  { id: 'RATE-002', packageName: 'Conference Hall Rate', type: 'Conference', client: 'All clients', amount: 300, from: '2026-01-01', to: '2026-12-31', active: true, alwaysEffective: false },
  { id: 'RATE-003', packageName: 'Lunch Rate', type: 'Lunch', client: 'All clients', amount: 50, from: '2026-01-01', to: '2026-12-31', active: true, alwaysEffective: false },
  { id: 'RATE-004', packageName: 'Dinner Rate', type: 'Dinner', client: 'All clients', amount: 80, from: '2026-01-01', to: '2026-12-31', active: true, alwaysEffective: false },
])
