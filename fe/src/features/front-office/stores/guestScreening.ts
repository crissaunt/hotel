import { ref } from 'vue'

export type GuestScreeningRecord = {
  id: string
  fullName: string
  reason: string
  reference?: string
  active: boolean
  addedAt: string
}

// The front-end prototype keeps screening records in memory, like its reservation data.
export const guestScreeningList = ref<GuestScreeningRecord[]>([])
