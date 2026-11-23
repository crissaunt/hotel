import { ref } from 'vue'

export type HousekeepingTaskState = 'Clean' | 'Dirty' | 'Cleaning' | 'Inspection'
export type HousekeepingOccupancy = 'Occupied' | 'Vacant'
export type HousekeepingRoom = {
  number: string
  floor: number
  type: string
  occupancy: HousekeepingOccupancy
  taskState: HousekeepingTaskState
  outOfService?: boolean
  updatedAt: string
  alert?: boolean
}
export type HousekeepingWorkTask = {
  id: string
  room: string
  job: string
  category: 'Cleaning' | 'Maintenance' | 'Cleaning areas'
  status: 'Pending' | 'In Progress' | 'Completed'
  assigned: string
  priority: 'Low' | 'Medium' | 'High'
  duration: number
}
export type MaintenanceRequestStatus = 'Reported' | 'In Progress' | 'Completed'
export type MaintenanceRequest = {
  id: string
  room: string
  category: 'Electrical' | 'HVAC' | 'Plumbing' | 'Carpentry' | 'Appliance' | 'General'
  priority: 'Low' | 'Normal' | 'High'
  status: MaintenanceRequestStatus
  description: string
  assigned: string
  reportedAt: string
}
export type MaintenanceCostEntry = {
  id: string
  requestId: string
  room: string
  category: MaintenanceRequest['category']
  description: string
  amount: number
  costCentre: 'Maintenance'
  date: string
  recordedAt: string
  technician: string
}
export type HousekeepingInspection = { id: string; room: string; score: number; inspector: string; inspectedAt: string; note: string }

function currentTime() {
  return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

const occupiedDemoRooms = new Set(['101', '102', '201', '202', '301'])
const initialRooms: HousekeepingRoom[] = Array.from({ length: 4 }, (_, floorIndex) => {
  const floor = floorIndex + 1
  const type = floor === 1 ? 'Standard' : floor === 2 ? 'Deluxe' : floor === 3 ? 'Executive' : 'Standard'
  return Array.from({ length: 15 }, (_, roomIndex) => {
    const number = `${floor}${String(roomIndex + 1).padStart(2, '0')}`
    const taskState: HousekeepingTaskState = number === '102' ? 'Cleaning' : number === '103' ? 'Dirty' : 'Clean'
    const occupancy: HousekeepingOccupancy = occupiedDemoRooms.has(number) ? 'Occupied' : 'Vacant'
    return { number, floor, type, occupancy, taskState, updatedAt: currentTime(), alert: number === '103' }
  })
}).flat()

export const housekeepingRooms = ref<HousekeepingRoom[]>(initialRooms)
export const housekeepingInspections = ref<HousekeepingInspection[]>([])
export const housekeepingPublicSpaces = ref([
  { name: 'Lobby', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Restaurant', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Bar', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Pool deck', taskState: 'Dirty' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Public restrooms', taskState: 'Cleaning' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Main corridors', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Meeting rooms', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Fitness center', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
  { name: 'Elevators', taskState: 'Clean' as HousekeepingTaskState, updatedAt: currentTime() },
])
export const housekeepingWorkTasks = ref<HousekeepingWorkTask[]>([
  { id: 'HK100008', room: 'Lobby', job: 'Public area cleaning', category: 'Cleaning areas', status: 'Pending', assigned: 'Kofi Mensah', priority: 'Medium', duration: 40 },
  { id: 'HK100007', room: '204', job: 'Air conditioning check', category: 'Maintenance', status: 'Pending', assigned: 'Adwoa Manu', priority: 'High', duration: 30 },
  { id: 'HK100006', room: '102', job: 'Cleaning', category: 'Cleaning', status: 'In Progress', assigned: 'Salamatu Iddrisu', priority: 'Medium', duration: 25 },
  { id: 'HK100005', room: '105', job: 'Deep clean', category: 'Cleaning', status: 'Pending', assigned: 'Salamatu Iddrisu', priority: 'High', duration: 60 },
  { id: 'HK100004', room: '201', job: 'Turndown', category: 'Cleaning', status: 'Pending', assigned: 'Ama Serwaa', priority: 'Medium', duration: 20 },
  { id: 'HK100003', room: '104', job: 'Inspection', category: 'Cleaning', status: 'Pending', assigned: 'Adwoa Manu', priority: 'High', duration: 15 },
  { id: 'HK100002', room: '103', job: 'Cleaning', category: 'Cleaning', status: 'Pending', assigned: 'Ama Serwaa', priority: 'Medium', duration: 25 },
  { id: 'HK100001', room: '101', job: 'Cleaning', category: 'Cleaning', status: 'Completed', assigned: 'Ama Serwaa', priority: 'Medium', duration: 25 },
])

export const maintenanceRequests = ref<MaintenanceRequest[]>([
  { id: 'MNT-003', room: 'Public area', category: 'Electrical', priority: 'Low', status: 'Completed', description: 'Replaced two corridor bulbs', assigned: 'Unassigned', reportedAt: '2026-10-31' },
  { id: 'MNT-002', room: '104', category: 'HVAC', priority: 'Normal', status: 'In Progress', description: 'Air conditioner is not cooling', assigned: 'Unassigned', reportedAt: '2026-10-31' },
  { id: 'MNT-001', room: '102', category: 'Plumbing', priority: 'High', status: 'Reported', description: 'Bathroom tap is leaking', assigned: 'Unassigned', reportedAt: '2026-10-31' },
])
export const maintenanceCostCentre = ref<MaintenanceCostEntry[]>([
  { id: 'MC-0001', requestId: 'MNT-003', room: 'Public area', category: 'Electrical', description: 'Replaced two corridor bulbs', amount: 120, costCentre: 'Maintenance', date: '2026-10-31', recordedAt: '2026-10-31T16:00:00.000Z', technician: 'Unassigned' },
])
