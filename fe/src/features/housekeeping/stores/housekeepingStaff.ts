import { ref, watch } from 'vue'

export type HousekeepingShift = 'Morning' | 'Afternoon' | 'Night'
export type HousekeepingStaffMember = { id: string; name: string; role: string; status: 'Active' | 'Off duty' }
export type RoomShiftAssignment = { id: string; staffName: string; shift: HousekeepingShift; rooms: string[]; label: string }

export const housekeepingStaffMembers = ref<HousekeepingStaffMember[]>([
  { id: 'HKST-001', name: 'Ama Serwaa', role: 'Room attendant', status: 'Active' },
  { id: 'HKST-002', name: 'Yaw Boateng', role: 'Room attendant', status: 'Active' },
  { id: 'HKST-003', name: 'Salamatu Iddrisu', role: 'Room attendant', status: 'Active' },
  { id: 'HKST-004', name: 'Adwoa Manu', role: 'Housekeeping supervisor', status: 'Active' },
  { id: 'HKST-005', name: 'Kofi Mensah', role: 'Public area attendant', status: 'Active' },
])

const initialRoomShiftAssignments: RoomShiftAssignment[] = [
  { id: 'RSA-001', staffName: 'Ama Serwaa', shift: 'Morning', rooms: ['101', '102', '103', '104', '105', '201', '202', '203'], label: 'Lower floors' },
  { id: 'RSA-002', staffName: 'Yaw Boateng', shift: 'Morning', rooms: ['204', '205', '301', '302', '303', '304', '305'], label: 'Upper floors' },
]

function loadRoomShiftAssignments(): RoomShiftAssignment[] {
  try {
    const saved = localStorage.getItem('housekeeping-room-shift-assignments')
    if (saved) return JSON.parse(saved) as RoomShiftAssignment[]
  } catch {
    // Keep the sample coverage if browser storage is unavailable or invalid.
  }
  return initialRoomShiftAssignments
}

export const roomShiftAssignments = ref<RoomShiftAssignment[]>(loadRoomShiftAssignments())

watch(roomShiftAssignments, (assignments) => {
  try {
    localStorage.setItem('housekeeping-room-shift-assignments', JSON.stringify(assignments))
  } catch {
    // Assignments remain available for the current session if storage is unavailable.
  }
}, { deep: true })
