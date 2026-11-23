import { ref } from 'vue'

export type EventStatus = 'Quote' | 'Confirmed' | 'Completed'
export type EventKind = 'Wedding' | 'Conference' | 'Workshop' | 'Social event'
export type Department = 'Reservations' | 'Kitchen' | 'Housekeeping'
export type FunctionTask = { id: string; department: Department; duty: string; owner: string; due: string; complete: boolean }
export type EventFolioEntry = { id: string; date: string; type: 'Charge' | 'Debit note' | 'Receipt'; description: string; amount: number; method?: string; reference?: string; status: 'Posted' | 'Voided'; voidReason?: string }
export type HotelEvent = {
  id: string; name: string; client: string; kind: EventKind; accommodation: 'Residential' | 'Non-residential'; venue: string; start: string; end: string; startTime: string; pax: number; status: EventStatus; coordinator: string; amount: number
  contactName: string; phone: string; email: string; coordinatorNotes: string
  layout: string; tables: number; chairs: number; registration: number; display: number; access: string; parking: string; setupNotes: string
  service: string; meal: string; teaBreaks: number; specialDiets: number; dietaryNotes: string; allergies: string; beverages: string; snacks: string
  timeline: Array<{ time: string; item: string; department: Department }>; tasks: FunctionTask[]; folioEntries: EventFolioEntry[]; invoiceNumber?: string; invoiceStatus?: 'Draft' | 'Invoiced'
}

export const blankTasks = (date: string): FunctionTask[] => [
  { id: 'reservation', department: 'Reservations', duty: 'Confirm room block, guest list, and arrival details', owner: 'Reservations', due: date, complete: false },
  { id: 'kitchen', department: 'Kitchen', duty: 'Confirm menu, headcount, dietary needs, and service timing', owner: 'Kitchen lead', due: date, complete: false },
  { id: 'housekeeping', department: 'Housekeeping', duty: 'Prepare venue, clean guest areas, and set tables and linens', owner: 'Housekeeping', due: date, complete: false },
]

export function sampleEvent(data: Partial<HotelEvent> & Pick<HotelEvent, 'id' | 'name' | 'client' | 'kind' | 'venue' | 'start' | 'end' | 'pax' | 'status' | 'amount'>): HotelEvent {
  return {
    accommodation: 'Non-residential', startTime: '09:00', coordinator: 'Unassigned', contactName: data.client, phone: '', email: '', coordinatorNotes: '',
    layout: 'Banquet style', tables: 12, chairs: data.pax, registration: 1, display: 1, access: 'Main entrance', parking: 'Available for guests', setupNotes: 'Standard setup',
    service: 'Formal', meal: 'Plated service', teaBreaks: 2, specialDiets: 0, dietaryNotes: 'Confirm dietary requirements with organizer', allergies: 'Please inform us in advance', beverages: 'Coffee, tea, water, soft drinks', snacks: 'Biscuits, pastries, fruit',
    timeline: [
      { time: '08:00', item: 'Venue setup and room check', department: 'Housekeeping' },
      { time: '09:00', item: 'Registration opens', department: 'Reservations' },
      { time: '12:30', item: 'Meal service', department: 'Kitchen' },
    ],
    tasks: blankTasks(data.start), folioEntries: [],
    ...data,
  }
}

export const events = ref<HotelEvent[]>([
  sampleEvent({ id: 'EVT-003', name: 'Adjei Family Naming Ceremony', client: 'Mr. Adjei', kind: 'Social event', venue: 'Garden Pavilion', start: '2026-11-09', end: '2026-11-09', pax: 60, status: 'Quote', amount: 9000 }),
  sampleEvent({ id: 'EVT-004', name: 'Front Office Staff Seminar', client: 'Hotel HR', kind: 'Workshop', venue: 'Garden Pavilion', start: '2026-11-10', end: '2026-11-10', pax: 40, status: 'Quote', amount: 3600 }),
  sampleEvent({ id: 'EVT-006', name: 'Iddrisu–Seidu Walima', client: 'Alhaji Iddrisu', kind: 'Wedding', venue: 'Grand Ballroom', start: '2026-11-19', end: '2026-11-19', pax: 180, status: 'Confirmed', amount: 28700, startTime: '17:00', layout: 'Banquet style', tables: 18, chairs: 180 }),
  sampleEvent({ id: 'EVT-001', name: 'Northern Teachers Union Annual Dinner', client: 'Northern Teachers Union', kind: 'Conference', accommodation: 'Residential', venue: 'Garden Pavilion', start: '2026-11-20', end: '2026-11-21', pax: 45, status: 'Completed', amount: 16200 }),
  sampleEvent({ id: 'EVT-007', name: 'Owusu–Mensah Wedding Reception', client: 'Mrs. Owusu', kind: 'Wedding', venue: 'Grand Ballroom', start: '2026-11-28', end: '2026-11-28', pax: 150, status: 'Confirmed', amount: 36500 }),
  sampleEvent({ id: 'EVT-008', name: 'Leadership Workshop', client: 'Asteria Group', kind: 'Workshop', accommodation: 'Residential', venue: 'Boardroom', start: '2026-11-12', end: '2026-11-12', pax: 18, status: 'Confirmed', amount: 3320, startTime: '09:00', layout: 'Classroom', tables: 6, chairs: 18 }),
  sampleEvent({ id: 'EVT-009', name: 'Regional Sales Meeting', client: 'North Star Ltd.', kind: 'Conference', venue: 'Boardroom', start: '2026-11-29', end: '2026-11-29', pax: 16, status: 'Confirmed', amount: 3040 }),
])

export const eventVenues = ref([
  { name: 'Boardroom', type: 'Meeting', capacity: 20 },
  { name: 'Garden Pavilion', type: 'Conference', capacity: 80 },
  { name: 'Grand Ballroom', type: 'Banquet', capacity: 200 },
])
