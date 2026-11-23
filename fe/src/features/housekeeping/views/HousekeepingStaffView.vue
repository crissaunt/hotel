<script setup lang="ts">
import { computed, ref } from 'vue'
import { housekeepingRooms } from '@/features/housekeeping/stores/housekeeping'
import { housekeepingStaffMembers, roomShiftAssignments, type HousekeepingShift } from '@/features/housekeeping/stores/housekeepingStaff'

type StaffTab = 'Staff List' | 'Shift Scheduling' | 'Overtime' | 'Responsible for'
const tabs: StaffTab[] = ['Staff List', 'Shift Scheduling', 'Overtime', 'Responsible for']
const shifts: HousekeepingShift[] = ['Morning', 'Afternoon', 'Night']
const activeTab = ref<StaffTab>('Responsible for')
const shiftFilter = ref<'All shifts' | HousekeepingShift>('All shifts')
const showAssignModal = ref(false)
const assignmentError = ref('')
const roomSearch = ref('')
const assignmentForm = ref({ staffName: '', shift: 'Morning' as HousekeepingShift, label: '' })
const selectedRooms = ref<string[]>([])
const allRoomNumbers = computed(() => housekeepingRooms.value.map((room) => room.number).sort((a, b) => a.localeCompare(b)))
const filteredAssignments = computed(() => roomShiftAssignments.value
  .filter((assignment) => shiftFilter.value === 'All shifts' || assignment.shift === shiftFilter.value)
  .sort((a, b) => a.shift.localeCompare(b.shift) || a.staffName.localeCompare(b.staffName)))
const roomCandidates = computed(() => allRoomNumbers.value.filter((room) => !roomSearch.value.trim() || room.toLowerCase().includes(roomSearch.value.trim().toLowerCase())))
function coverage(shift: HousekeepingShift) {
  const assigned = new Set(roomShiftAssignments.value.filter((item) => item.shift === shift).flatMap((item) => item.rooms))
  return { assigned: assigned.size, uncovered: allRoomNumbers.value.filter((room) => !assigned.has(room)) }
}
function assignedTo(room: string, shift: HousekeepingShift) {
  return roomShiftAssignments.value.find((assignment) => assignment.shift === shift && assignment.rooms.includes(room))?.staffName || ''
}
function openAssignModal(shift = shiftFilter.value === 'All shifts' ? 'Morning' : shiftFilter.value) {
  assignmentError.value = ''
  roomSearch.value = ''
  selectedRooms.value = []
  assignmentForm.value = { staffName: '', shift, label: '' }
  showAssignModal.value = true
}
function toggleRoom(room: string) {
  selectedRooms.value = selectedRooms.value.includes(room)
    ? selectedRooms.value.filter((item) => item !== room)
    : [...selectedRooms.value, room]
}
function selectUncoveredRooms() {
  selectedRooms.value = coverage(assignmentForm.value.shift).uncovered
}
function clearRooms() { selectedRooms.value = [] }
function saveAssignment() {
  if (!assignmentForm.value.staffName || !selectedRooms.value.length || !assignmentForm.value.label.trim()) {
    assignmentError.value = 'Choose an attendant, select at least one room, and add a coverage label.'
    return
  }
  const shift = assignmentForm.value.shift
  const rooms = [...new Set(selectedRooms.value)]
  roomShiftAssignments.value.forEach((assignment) => {
    if (assignment.shift === shift) assignment.rooms = assignment.rooms.filter((room) => !rooms.includes(room))
  })
  roomShiftAssignments.value = roomShiftAssignments.value.filter((assignment) => assignment.rooms.length > 0)
  const existing = roomShiftAssignments.value.find((assignment) => assignment.shift === shift
    && assignment.staffName === assignmentForm.value.staffName
    && assignment.label.trim().toLowerCase() === assignmentForm.value.label.trim().toLowerCase())
  if (existing) existing.rooms = [...new Set([...existing.rooms, ...rooms])].sort((a, b) => a.localeCompare(b))
  else roomShiftAssignments.value.push({
    id: `RSA-${Date.now().toString(36).toUpperCase()}`,
    staffName: assignmentForm.value.staffName,
    shift,
    rooms: rooms.sort((a, b) => a.localeCompare(b)),
    label: assignmentForm.value.label.trim(),
  })
  shiftFilter.value = shift
  showAssignModal.value = false
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <p class="eyebrow">Housekeeping &amp; Maintenance <span class="px-1 text-[#c3bcc9]">/</span> Staff</p>
      <h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Staff management</h1>
    </header>

    <div class="overflow-hidden rounded-lg border border-[#e5e8eb] bg-white">
      <nav class="flex flex-wrap gap-1 border-b border-[#e8ebef] p-2" aria-label="Staff views"><button v-for="tab in tabs" :key="tab" class="rounded-md px-3 py-2 text-[9px] font-medium" :class="activeTab === tab ? 'border border-[#e2e6eb] bg-white text-[#26323c] shadow-sm' : 'text-[#697681] hover:bg-[#f8fafc]'" @click="activeTab = tab">{{ tab }}</button></nav>

      <div v-if="activeTab === 'Responsible for'" class="p-3">
        <div class="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p class="text-[10px] text-[#687681]">Set who is responsible for which rooms on each shift.</p><div v-if="shiftFilter !== 'All shifts'" class="mt-2 rounded-md border px-3 py-2 text-[9px]" :class="coverage(shiftFilter).uncovered.length ? 'border-[#f2dfb9] bg-[#fffaf0] text-[#7e642b]' : 'border-[#cfe5d8] bg-[#f3f8f4] text-[#4a7356]'"><strong>{{ coverage(shiftFilter).assigned }}/{{ allRoomNumbers.length }} rooms covered · {{ coverage(shiftFilter).uncovered.length }} unassigned</strong><details v-if="coverage(shiftFilter).uncovered.length" class="mt-1"><summary class="cursor-pointer">Show uncovered rooms</summary><span class="mt-1 block">{{ coverage(shiftFilter).uncovered.join(', ') }}</span></details></div></div><div class="flex flex-col items-end gap-2"><select v-model="shiftFilter" class="report-select min-w-[145px]"><option>All shifts</option><option v-for="shift in shifts" :key="shift">{{ shift }}</option></select><button class="rounded-md bg-[#1768d5] px-3 py-2.5 text-[9px] font-medium text-white hover:bg-[#0f5dc4]" @click="openAssignModal()">Assign rooms</button></div></div>

        <div v-if="shiftFilter === 'All shifts'" class="mb-3 grid gap-2 sm:grid-cols-3"><button v-for="shift in shifts" :key="shift" class="rounded-md border px-3 py-2 text-left" :class="coverage(shift).uncovered.length ? 'border-[#f2dfb9] bg-[#fffaf0]' : 'border-[#cfe5d8] bg-[#f3f8f4]'" @click="shiftFilter = shift"><span class="block text-[8px] text-[#77838b]">{{ shift }} shift</span><strong class="mt-1 block text-[10px] text-[#43515a]">{{ coverage(shift).assigned }}/{{ allRoomNumbers.length }} rooms covered</strong><span class="mt-0.5 block text-[8px]" :class="coverage(shift).uncovered.length ? 'text-[#8b6c2c]' : 'text-[#4a7356]'">{{ coverage(shift).uncovered.length }} rooms unassigned</span></button></div>

        <div class="overflow-x-auto rounded-md border border-[#edf0f3]"><table class="w-full min-w-[650px] border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase tracking-[0.05em] text-[#67737d]"><tr><th class="px-3 py-2.5">Responsible ↑</th><th class="px-3 py-2.5">Shift</th><th class="px-3 py-2.5">Rooms</th><th class="px-3 py-2.5">Label</th></tr></thead><tbody><tr v-for="assignment in filteredAssignments" :key="assignment.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-3 font-medium text-[#303c45]">{{ assignment.staffName }}</td><td class="px-3 py-3"><span class="rounded-full bg-[#e3efff] px-2 py-1 text-[8px] text-[#426e9f]">{{ assignment.shift }}</span></td><td class="max-w-[420px] px-3 py-3"><span class="block truncate">{{ assignment.rooms.join(', ') }}</span><small class="mt-0.5 block text-[8px] text-[#87929a]">({{ assignment.rooms.length }})</small></td><td class="px-3 py-3">{{ assignment.label }}</td></tr><tr v-if="filteredAssignments.length === 0"><td colspan="4" class="px-3 py-10 text-center text-[10px] text-[#818b93]">No room assignments for this shift yet.</td></tr></tbody></table></div>
      </div>

      <div v-else-if="activeTab === 'Staff List'" class="overflow-x-auto p-3"><table class="w-full min-w-[560px] border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase text-[#67737d]"><tr><th class="px-3 py-2.5">Staff ID</th><th class="px-3 py-2.5">Name</th><th class="px-3 py-2.5">Role</th><th class="px-3 py-2.5">Status</th></tr></thead><tbody><tr v-for="person in housekeepingStaffMembers" :key="person.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5">{{ person.id }}</td><td class="px-3 py-2.5 font-medium">{{ person.name }}</td><td class="px-3 py-2.5">{{ person.role }}</td><td class="px-3 py-2.5">{{ person.status }}</td></tr></tbody></table></div>

      <div v-else-if="activeTab === 'Shift Scheduling'" class="grid gap-3 p-3 sm:grid-cols-3"><article v-for="shift in shifts" :key="shift" class="rounded-lg border border-[#e7e9ed] p-3"><h2 class="text-[11px] font-semibold text-[#35424b]">{{ shift }} shift</h2><p class="mt-2 text-[9px] text-[#77838b]">{{ roomShiftAssignments.filter((assignment) => assignment.shift === shift).map((assignment) => assignment.staffName).join(', ') || 'No staff scheduled' }}</p><button class="mt-3 rounded-md border border-[#e2e6eb] px-2.5 py-1.5 text-[8px] text-[#5d6972]" @click="shiftFilter = shift; activeTab = 'Responsible for'">View room coverage</button></article></div>

      <div v-else class="p-5 text-center"><h2 class="text-[11px] font-semibold text-[#35424b]">Overtime</h2><p class="mt-1 text-[9px] text-[#82909a]">No overtime records yet.</p></div>
    </div>

    <div v-if="showAssignModal" class="modal-backdrop" @click.self="showAssignModal = false"><section class="modal-card max-h-[90vh] max-w-[620px] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="assign-rooms-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Housekeeping · room coverage</p><h2 id="assign-rooms-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Assign rooms to an attendant</h2><p class="mt-1 text-[9px] text-[#7d8991]">Select rooms and assign one person to cover them for this shift.</p></div><button aria-label="Close room assignment" class="rounded-md p-1.5 text-[#8c858f]" @click="showAssignModal = false">×</button></header><div class="mt-4 grid gap-3 sm:grid-cols-3"><label class="form-label">Attendant<select v-model="assignmentForm.staffName" class="form-input mt-1"><option value="">Choose staff</option><option v-for="person in housekeepingStaffMembers" :key="person.id" :value="person.name">{{ person.name }}</option></select></label><label class="form-label">Shift<select v-model="assignmentForm.shift" class="form-input mt-1"><option v-for="shift in shifts" :key="shift">{{ shift }}</option></select></label><label class="form-label">Label<input v-model="assignmentForm.label" class="form-input mt-1" placeholder="e.g. Lower floors" /></label></div><div class="mt-4 flex flex-wrap items-center justify-between gap-2"><p class="text-[9px] font-medium text-[#66737d]">Rooms ({{ selectedRooms.length }} selected)</p><div class="flex gap-2"><button class="rounded-md border border-[#e5e8ec] px-2.5 py-1.5 text-[8px] text-[#5d6972]" @click="selectUncoveredRooms">Select unassigned</button><button class="rounded-md border border-[#e5e8ec] px-2.5 py-1.5 text-[8px] text-[#5d6972]" @click="clearRooms">Clear</button></div></div><label class="client-search mt-2"><span aria-hidden="true">⌕</span><span class="sr-only">Search rooms</span><input v-model="roomSearch" placeholder="Search room numbers..." /></label><div class="mt-2 grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded-md border border-[#e0e4e8] p-2 sm:grid-cols-6"><button v-for="room in roomCandidates" :key="room" class="rounded-md border px-2 py-2 text-left" :class="selectedRooms.includes(room) ? 'border-[#1672d9] bg-[#eff6ff]' : 'border-[#e5e9ed] hover:bg-[#fafbfd]'" @click="toggleRoom(room)"><strong class="block text-[9px] text-[#303c45]">{{ room }}</strong><small class="mt-0.5 block truncate text-[7px]" :class="assignedTo(room, assignmentForm.shift) ? 'text-[#9a6d25]' : 'text-[#43805c]'">{{ assignedTo(room, assignmentForm.shift) || 'Unassigned' }}</small></button></div><p v-if="assignmentError" class="mt-3 text-[9px] text-[#a25454]">{{ assignmentError }}</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="showAssignModal = false">Cancel</button><button class="arrival-action-primary" @click="saveAssignment">Save coverage</button></footer></section></div>
  </section>
</template>
