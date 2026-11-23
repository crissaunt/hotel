import { ref } from 'vue'

export type ClientKind = 'Guest' | 'Company'
export type ClientProfile = {
  id: string
  kind: ClientKind
  name: string
  email: string
  phone: string
  nationality: string
  companyRegistration?: string
  notes: string
  createdAt: string
}

export const clientProfiles = ref<ClientProfile[]>([])
