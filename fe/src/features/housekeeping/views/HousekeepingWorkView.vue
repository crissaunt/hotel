<script setup lang="ts">
import { computed, ref } from 'vue'
import { dateKey, housekeepingCleaningRooms as cleaningRoomNumbers, housekeepingReadyRooms, housekeepingRooms as dirtyRoomNumbers, reservations, vipPreparations } from '@/features/front-office/stores/reservations'
import { housekeepingPublicSpaces, housekeepingRooms, housekeepingWorkTasks, maintenanceCostCentre, maintenanceRequests, type HousekeepingRoom, type HousekeepingWorkTask, type MaintenanceRequest } from '@/features/housekeeping/stores/housekeeping'

type WorkTab = 'Cleaning' | 'Maintenance' | 'Cleaning areas'
type Preset = { label: string; job: string; category: WorkTab; duration: number }
const tabs: WorkTab[] = ['Cleaning', 'Maintenance', 'Cleaning areas']
const presets: Preset[] = [
  { label: 'Daily Room Cleaning', job: 'Cleaning', category: 'Cleaning', duration: 25 },
  { label: 'Room Turnover', job: 'Room turnover', category: 'Cleaning', duration: 45 },
  { label: 'Deep Cleaning', job: 'Deep clean', category: 'Cleaning', duration: 60 },
  { label: 'Maintenance Support', job: 'Maintenance support', category: 'Maintenance', duration: 30 },
  { label: 'Public area', job: 'Public area cleaning', category: 'Cleaning areas', duration: 40 },
]
const staff = ['Unassigned — assign later', 'Salamatu Iddrisu', 'Ama Serwaa', 'Adwoa Manu', 'Kofi Mensah']
const maintenanceStaff = ['Unassigned', 'Kwame Mensah', 'Yaw Boateng', 'Adwoa Manu']
const maintenanceCategories: MaintenanceRequest['category'][] = ['Electrical', 'HVAC', 'Plumbing', 'Carpentry', 'Appliance', 'General']
const activeTab = ref<WorkTab>('Cleaning')
const viewMode = ref<'Cards' | 'Table'>('Table')
const search = ref('')
const statusFilter = ref('All statuses')
const priorityFilter = ref('All priorities')
const showTaskForm = ref(false)
const bulkMode = ref(false)
const formError = ref('')
const roomStatusFilter = ref('Occupied')
const selectedRooms = ref<string[]>([])
const selectedPreset = ref<Preset>(presets[0]!)
const form = ref({ assigned: staff[0]!, priority: 'Medium' as HousekeepingWorkTask['priority'], duration: '25', category: 'Cleaning' as WorkTab })
const maintenanceSearch = ref('')
const maintenanceStatusFilter = ref('All Statuses')
const maintenancePriorityFilter = ref('All Priorities')
const maintenanceCategoryFilter = ref('All Categories')
const showMaintenanceForm = ref(false)
const maintenanceFormError = ref('')
const maintenanceForm = ref({ room: '', category: 'Plumbing' as MaintenanceRequest['category'], priority: 'Normal' as MaintenanceRequest['priority'], description: '', assigned: 'Unassigned' })
const completingMaintenance = ref<MaintenanceRequest | null>(null)
const maintenanceCostInput = ref('')
const completionError = ref('')
const tasks = computed(() => housekeepingWorkTasks.value.filter((task) => {
  const query = search.value.trim().toLowerCase()
  return task.category === activeTab.value
    && (statusFilter.value === 'All statuses' || task.status === statusFilter.value)
    && (priorityFilter.value === 'All priorities' || task.priority === priorityFilter.value)
    && (!query || [task.id, task.room, task.job, task.assigned].some((value) => value.toLowerCase().includes(query)))
}).sort((a, b) => b.id.localeCompare(a.id)))
const eligibleRooms = computed(() => housekeepingRooms.value.filter((room) => {
  const status = roomStatus(room)
  if (roomStatusFilter.value === 'All') return true
  if (roomStatusFilter.value === 'Clean') return room.taskState === 'Clean' && !dirtyRoomNumbers.value.includes(room.number) && !cleaningRoomNumbers.value.includes(room.number)
  return status === roomStatusFilter.value
}).sort((a, b) => a.number.localeCompare(b.number)))
const eligibleAreas = computed(() => housekeepingPublicSpaces.value.map((space) => space.name))
const filteredMaintenance = computed(() => maintenanceRequests.value.filter((request) => {
  const query = maintenanceSearch.value.trim().toLowerCase()
  return (maintenanceStatusFilter.value === 'All Statuses' || request.status === maintenanceStatusFilter.value)
    && (maintenancePriorityFilter.value === 'All Priorities' || request.priority === maintenancePriorityFilter.value)
    && (maintenanceCategoryFilter.value === 'All Categories' || request.category === maintenanceCategoryFilter.value)
    && (!query || [request.id, request.room, request.category, request.description, request.assigned].some((value) => value.toLowerCase().includes(query)))
}).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt) || b.id.localeCompare(a.id)))
const maintenanceCostTotal = computed(() => maintenanceCostCentre.value.reduce((total, entry) => total + entry.amount, 0))
const visibleVipPreparations = computed(() => [...vipPreparations.value].sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate) || a.arrivalTime.localeCompare(b.arrivalTime)))

function roomStatus(room: HousekeepingRoom) {
  if (cleaningRoomNumbers.value.includes(room.number)) return 'Cleaning'
  if (dirtyRoomNumbers.value.includes(room.number) || room.taskState === 'Inspection' || room.taskState === 'Dirty') return 'Dirty'
  return reservations.value.some((stay) => stay.room === room.number && stay.status === 'In house') || room.occupancy === 'Occupied' ? 'Occupied' : 'Vacant'
}

function openNewTask(preset?: Preset, bulk = false) {
  formError.value = ''
  bulkMode.value = bulk
  selectedRooms.value = []
  roomStatusFilter.value = 'Occupied'
  selectedPreset.value = preset || presets.find((item) => item.category === activeTab.value) || presets[0]!
  form.value = {
    assigned: staff[0]!,
    priority: 'Medium',
    duration: String(selectedPreset.value.duration),
    category: selectedPreset.value.category,
  }
  activeTab.value = form.value.category
  showTaskForm.value = true
}
function choosePreset(preset: Preset) {
  selectedPreset.value = preset
  form.value.category = preset.category
  form.value.duration = String(preset.duration)
  activeTab.value = preset.category
  selectedRooms.value = []
}
function toggleRoom(roomNumber: string) {
  if (selectedRooms.value.includes(roomNumber)) {
    selectedRooms.value = selectedRooms.value.filter((room) => room !== roomNumber)
    return
  }
  if (!bulkMode.value) selectedRooms.value = [roomNumber]
  else selectedRooms.value = [...selectedRooms.value, roomNumber]
}
function selectRoomsByStatus(status: string) {
  roomStatusFilter.value = status
  selectedRooms.value = status === 'All'
    ? eligibleRooms.value.map((room) => room.number)
    : []
}
function selectListedRooms() {
  const listed = form.value.category === 'Cleaning areas' ? eligibleAreas.value : eligibleRooms.value.map((room) => room.number)
  selectedRooms.value = bulkMode.value ? [...listed] : listed.slice(0, 1)
}
function saveTask() {
  const targets = selectedRooms.value
  if (!targets.length || !Number(form.value.duration) || Number(form.value.duration) < 1) {
    formError.value = 'Select at least one room or area and enter an estimated duration.'
    return
  }
  targets.forEach((target) => {
    const idNumber = Math.max(0, ...housekeepingWorkTasks.value.map((task) => Number(task.id.replace('HK', '')))) + 1
    housekeepingWorkTasks.value.unshift({
      id: `HK${String(idNumber).padStart(6, '0')}`,
      room: target,
      job: selectedPreset.value.job,
      category: form.value.category,
      status: 'Pending',
      assigned: form.value.assigned,
      priority: form.value.priority,
      duration: Number(form.value.duration),
    })
  })
  showTaskForm.value = false
}
function timestamp() { return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }
function openMaintenanceRequest(description = '') {
  maintenanceFormError.value = ''
  maintenanceForm.value = { room: '', category: 'Plumbing', priority: 'Normal', description, assigned: 'Unassigned' }
  showMaintenanceForm.value = true
}
function saveMaintenanceRequest() {
  if (!maintenanceForm.value.room || !maintenanceForm.value.description.trim()) {
    maintenanceFormError.value = 'Choose a room and describe the fault.'
    return
  }
  const nextNumber = Math.max(0, ...maintenanceRequests.value.map((request) => Number(request.id.replace('MNT-', '')))) + 1
  maintenanceRequests.value.unshift({
    id: `MNT-${String(nextNumber).padStart(3, '0')}`,
    room: maintenanceForm.value.room,
    category: maintenanceForm.value.category,
    priority: maintenanceForm.value.priority,
    status: 'Reported',
    description: maintenanceForm.value.description.trim(),
    assigned: maintenanceForm.value.assigned,
    reportedAt: dateKey(new Date()),
  })
  activeTab.value = 'Maintenance'
  showMaintenanceForm.value = false
}
function startMaintenance(request: MaintenanceRequest) { request.status = 'In Progress' }
function maintenanceCost(requestId: string) {
  return maintenanceCostCentre.value.find((entry) => entry.requestId === requestId)?.amount
}
function maintenanceCostLabel(requestId: string) {
  const amount = maintenanceCost(requestId)
  return amount === undefined ? '—' : `₱${amount.toFixed(2)}`
}
function openMaintenanceCompletion(request: MaintenanceRequest) {
  completingMaintenance.value = request
  maintenanceCostInput.value = ''
  completionError.value = ''
}
function completeMaintenance() {
  const request = completingMaintenance.value
  if (!request || request.status === 'Completed') return
  const amount = Number(maintenanceCostInput.value)
  if (maintenanceCostInput.value.trim() === '' || !Number.isFinite(amount) || amount < 0) {
    completionError.value = 'Enter the actual job cost. Enter 0 if no cost was incurred.'
    return
  }
  const entryNumber = Math.max(0, ...maintenanceCostCentre.value.map((entry) => Number(entry.id.replace('MC-', '')))) + 1
  maintenanceCostCentre.value.unshift({
    id: `MC-${String(entryNumber).padStart(4, '0')}`,
    requestId: request.id,
    room: request.room,
    category: request.category,
    description: request.description,
    amount: Math.round(amount * 100) / 100,
    costCentre: 'Maintenance',
    date: dateKey(new Date()),
    recordedAt: new Date().toISOString(),
    technician: request.assigned,
  })
  request.status = 'Completed'
  completingMaintenance.value = null
}
function startTask(task: HousekeepingWorkTask) {
  task.status = 'In Progress'
  if (task.category === 'Cleaning areas') {
    const area = housekeepingPublicSpaces.value.find((item) => item.name === task.room)
    if (area) {
      area.taskState = 'Cleaning'
      area.updatedAt = timestamp()
    }
    return
  }
  if (task.category !== 'Cleaning') return
  const room = housekeepingRooms.value.find((item) => item.number === task.room)
  if (!room) return
  room.taskState = 'Cleaning'
  room.updatedAt = timestamp()
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((number) => number !== room.number)
  dirtyRoomNumbers.value = dirtyRoomNumbers.value.filter((number) => number !== room.number)
  if (!cleaningRoomNumbers.value.includes(room.number)) cleaningRoomNumbers.value.push(room.number)
}
function finishTask(task: HousekeepingWorkTask) {
  task.status = 'Completed'
  if (task.category === 'Cleaning') {
    const room = housekeepingRooms.value.find((item) => item.number === task.room)
    if (!room) return
    room.taskState = 'Clean'
    room.updatedAt = timestamp()
    if (!reservations.value.some((stay) => stay.room === room.number && stay.status === 'In house')) room.occupancy = 'Vacant'
    dirtyRoomNumbers.value = dirtyRoomNumbers.value.filter((number) => number !== room.number)
    cleaningRoomNumbers.value = cleaningRoomNumbers.value.filter((number) => number !== room.number)
    if (!reservations.value.some((stay) => stay.room === room.number && stay.status === 'In house') && !housekeepingReadyRooms.value.includes(room.number)) {
      housekeepingReadyRooms.value.push(room.number)
    }
  } else if (task.category === 'Cleaning areas') {
    const area = housekeepingPublicSpaces.value.find((item) => item.name === task.room)
    if (area) {
      area.taskState = 'Clean'
      area.updatedAt = timestamp()
    }
  }
}
function statusClass(status: HousekeepingWorkTask['status']) {
  return status === 'Completed' ? 'bg-[#dcf7eb] text-[#24734d]' : status === 'In Progress' ? 'bg-[#fff0d1] text-[#916b22]' : 'bg-[#f0f1f3] text-[#66717b]'
}
function priorityClass(priority: string) {
  return priority === 'High' ? 'bg-[#ffeded] text-[#a54a4a]' : priority === 'Low' ? 'bg-[#eef5ff] text-[#4e7198]' : 'bg-[#f3f0f6] text-[#70627e]'
}
function formatVipDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <p class="eyebrow">Housekeeping &amp; Maintenance <span class="px-1 text-[#c3bcc9]">/</span> Work</p>
      <h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Work management</h1>
    </header>

    <section class="overflow-hidden rounded-lg border border-[#eadfce] bg-white">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e8da] bg-[#fffdf8] px-4 py-3"><div><h2 class="text-[12px] font-semibold text-[#705422]">VIP arrival preparations</h2><p class="mt-0.5 text-[9px] text-[#8a7c65]">Pre-arrival housekeeping setup and complimentary amenity orders from Front Office.</p></div><span class="rounded-full bg-[#f8efd9] px-2 py-1 text-[8px] font-medium text-[#8b6726]">{{ visibleVipPreparations.length }} requests</span></header>
      <div v-if="visibleVipPreparations.length" class="divide-y divide-[#f0e8da]">
        <article v-for="request in visibleVipPreparations" :key="request.id" class="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.1fr)_minmax(240px,1.2fr)_auto] lg:items-center">
          <div><p class="text-[10px] font-semibold text-[#35414a]">{{ request.guest }} <span class="ml-1 text-[8px] font-medium uppercase text-[#9b6c1e]">VIP</span></p><p class="mt-1 text-[8px] text-[#78838b]">{{ request.company || 'Guest account' }} · {{ request.reservationId }}</p><p class="mt-1 text-[8px] text-[#78838b]">Room {{ request.room }} · Arrives {{ formatVipDate(request.arrivalDate) }} at {{ request.arrivalTime }}</p></div>
          <div><p class="text-[8px] font-semibold uppercase tracking-wide text-[#87919a]">Housekeeping setup</p><p class="mt-1 text-[9px] text-[#4f5b63]">{{ request.housekeepingNotes }}</p><button class="mt-1.5 rounded-md px-2 py-1 text-[8px] font-medium" :class="request.housekeepingStatus === 'Ready' ? 'bg-[#e4f4e8] text-[#34704b]' : 'bg-[#fff1d6] text-[#8a6724]'" @click="request.housekeepingStatus = request.housekeepingStatus === 'Ready' ? 'Pending' : 'Ready'">{{ request.housekeepingStatus === 'Ready' ? 'Setup ready · mark pending' : 'Mark setup ready' }}</button></div>
          <div><p class="text-[8px] font-semibold uppercase tracking-wide text-[#87919a]">Complimentary order</p><p class="mt-1 text-[9px] text-[#4f5b63]">{{ request.complimentaryItems.length ? request.complimentaryItems.join(', ') : 'No item selected' }}</p><p v-if="request.orderNotes" class="mt-1 text-[8px] text-[#78838b]">{{ request.orderNotes }}</p><button class="mt-1.5 rounded-md px-2 py-1 text-[8px] font-medium" :class="request.orderStatus === 'Prepared' ? 'bg-[#e4f4e8] text-[#34704b]' : 'bg-[#fff1d6] text-[#8a6724]'" @click="request.orderStatus = request.orderStatus === 'Prepared' ? 'Requested' : 'Prepared'">{{ request.orderStatus === 'Prepared' ? 'Order prepared · reopen' : 'Mark order prepared' }}</button></div>
          <span class="rounded-full px-2 py-1 text-center text-[8px] font-medium" :class="request.housekeepingStatus === 'Ready' && request.orderStatus === 'Prepared' ? 'bg-[#e4f4e8] text-[#34704b]' : 'bg-[#f3f0f6] text-[#70627e]'">{{ request.housekeepingStatus === 'Ready' && request.orderStatus === 'Prepared' ? 'Ready for arrival' : 'In preparation' }}</span>
        </article>
      </div>
      <p v-else class="px-4 py-5 text-center text-[9px] text-[#8a7c65]">No VIP pre-registration requests yet. Mark a guest as VIP in Reservations to send a request here.</p>
    </section>

    <div class="overflow-hidden rounded-lg border border-[#e5e8eb] bg-white">
      <nav class="flex flex-wrap gap-1 border-b border-[#e8ebef] bg-[#f8fafc] p-2" aria-label="Work categories">
        <button v-for="tab in tabs" :key="tab" class="rounded-md px-3 py-2 text-[9px] font-medium" :class="activeTab === tab ? 'border border-[#e2e6eb] bg-white text-[#26323c] shadow-sm' : 'text-[#697681] hover:bg-white'" @click="activeTab = tab">{{ tab }}</button>
      </nav>

      <div v-if="activeTab === 'Maintenance'" class="p-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-[14px] font-semibold text-[#34414a]">Maintenance</h2><p class="mt-1 text-[9px] text-[#7d8991]">Report room faults, assign a technician, and post completed job costs to the Maintenance cost centre.</p></div><button class="rounded-md bg-[#087c58] px-3 py-2.5 text-[9px] font-medium text-white hover:bg-[#066a4b]" @click="openMaintenanceRequest()">+ New Maintenance Request</button></div>
        <div class="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-[#e7e9ed] bg-[#fafbfc] px-3 py-2"><span class="text-[9px] text-[#74818a]">Maintenance cost centre</span><strong class="text-[13px] text-[#35424b]">₱{{ maintenanceCostTotal.toFixed(2) }}</strong><span class="ml-auto text-[8px] text-[#87929a]">{{ maintenanceCostCentre.length }} completed cost record{{ maintenanceCostCentre.length === 1 ? '' : 's' }}</span></div>
        <div class="mb-3 grid gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(140px,1fr)_auto]"><label class="client-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search room numbers</span><input v-model="maintenanceSearch" placeholder="Search room numbers..." /></label><select v-model="maintenanceStatusFilter" class="report-select"><option>All Statuses</option><option>Reported</option><option>In Progress</option><option>Completed</option></select><select v-model="maintenancePriorityFilter" class="report-select"><option>All Priorities</option><option>Low</option><option>Normal</option><option>High</option></select><select v-model="maintenanceCategoryFilter" class="report-select"><option>All Categories</option><option v-for="category in maintenanceCategories" :key="category">{{ category }}</option></select><span class="self-center text-[9px] text-[#687681]">Filtered: {{ filteredMaintenance.length }}</span></div>
        <div class="overflow-x-auto rounded-md border border-[#edf0f3]"><table class="w-full min-w-[1000px] border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase tracking-[0.05em] text-[#67737d]"><tr><th class="px-3 py-2.5">ID</th><th class="px-3 py-2.5">Room</th><th class="px-3 py-2.5">Category</th><th class="px-3 py-2.5">Priority</th><th class="px-3 py-2.5">Status</th><th class="px-3 py-2.5">Description</th><th class="px-3 py-2.5">Assigned</th><th class="px-3 py-2.5">Reported</th><th class="px-3 py-2.5">Cost</th><th class="px-3 py-2.5">Action</th></tr></thead><tbody><tr v-for="request in filteredMaintenance" :key="request.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5 font-medium text-[#28343c]">{{ request.id }}</td><td class="px-3 py-2.5">{{ request.room }}</td><td class="px-3 py-2.5"><span class="rounded-full bg-[#eef3ff] px-2 py-1 text-[8px] text-[#4e7198]">{{ request.category }}</span></td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="priorityClass(request.priority)">{{ request.priority }}</span></td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="request.status === 'Completed' ? 'bg-[#dcf7eb] text-[#24734d]' : request.status === 'In Progress' ? 'bg-[#fff0d1] text-[#916b22]' : 'bg-[#f0f1f3] text-[#66717b]'">{{ request.status }}</span></td><td class="max-w-[240px] px-3 py-2.5">{{ request.description }}</td><td class="px-3 py-2.5">{{ request.assigned }}</td><td class="whitespace-nowrap px-3 py-2.5">{{ request.reportedAt }}</td><td class="whitespace-nowrap px-3 py-2.5">{{ maintenanceCostLabel(request.id) }}</td><td class="px-3 py-2.5"><button v-if="request.status === 'Reported'" class="rounded-md bg-[#dfebff] px-2.5 py-1.5 text-[8px] font-medium text-[#345995]" @click="startMaintenance(request)">Start</button><button v-else-if="request.status === 'In Progress'" class="rounded-md bg-[#d9f8e9] px-2.5 py-1.5 text-[8px] font-medium text-[#246b4c]" @click="openMaintenanceCompletion(request)">Complete job</button><span v-else class="text-[8px] text-[#24734d]">Posted to Maintenance</span></td></tr><tr v-if="filteredMaintenance.length === 0"><td colspan="10" class="px-3 py-10 text-center text-[10px] text-[#818b93]">No maintenance requests match your filters.</td></tr></tbody></table></div>
      </div>

      <div v-else class="p-3">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 class="text-[12px] font-semibold text-[#34414a]">{{ activeTab === 'Cleaning areas' ? 'Cleaning area tasks' : `${activeTab} tasks` }}</h2><div class="flex gap-2"><button class="rounded-md bg-[#eadcf8] px-3 py-2 text-[9px] font-medium text-[#64458a] hover:bg-[#dfcef2]" @click="openNewTask(undefined, true)">Bulk Rooms</button><button class="rounded-md bg-[#087c58] px-3 py-2 text-[9px] font-medium text-white hover:bg-[#066a4b]" @click="openNewTask()">+ New Task</button></div></div>
        <div class="mb-3 flex flex-wrap items-center gap-1.5"><span class="mr-1 text-[8px] text-[#7d8991]">Quick create</span><button v-for="preset in presets" :key="preset.label" class="rounded-md border border-[#e5e8ec] bg-white px-2 py-1.5 text-[8px] text-[#52606b] hover:border-[#cdd8e3] hover:bg-[#f9fbfd]" @click="preset.category === 'Maintenance' ? openMaintenanceRequest('Maintenance support request') : openNewTask(preset)">{{ preset.label }} <span class="text-[#89949c]">{{ preset.duration }}m</span></button><button class="px-1 text-[12px] text-[#9aa3a9]" aria-label="Clear quick create" @click="formError = ''">×</button></div>
        <div class="mb-3 grid gap-2 sm:grid-cols-[minmax(160px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto_auto]">
          <label class="client-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search room or area</span><input v-model="search" placeholder="Search room or area..." /></label>
          <select v-model="statusFilter" class="report-select"><option>All statuses</option><option>Pending</option><option>In Progress</option><option>Completed</option></select>
          <select v-model="priorityFilter" class="report-select"><option>All priorities</option><option>Low</option><option>Medium</option><option>High</option></select>
          <span class="self-center text-[9px] text-[#687681]">Total: {{ tasks.length }}</span>
          <div class="flex rounded-md border border-[#e1e5e9] p-0.5"><button v-for="mode in (['Cards', 'Table'] as const)" :key="mode" class="rounded px-2 py-1 text-[8px]" :class="viewMode === mode ? 'bg-[#eef1f4] font-medium text-[#394650]' : 'text-[#7d8991]'" @click="viewMode = mode">{{ mode }}</button></div>
        </div>

        <div v-if="viewMode === 'Table'" class="overflow-x-auto rounded-md border border-[#edf0f3]"><table class="w-full min-w-[680px] border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase tracking-[0.05em] text-[#67737d]"><tr><th class="px-3 py-2.5">Number ↓</th><th class="px-3 py-2.5">Room</th><th class="px-3 py-2.5">Job</th><th class="px-3 py-2.5">Status</th><th class="px-3 py-2.5">Assigned</th><th class="px-3 py-2.5">Priority</th><th class="px-3 py-2.5">Action</th></tr></thead><tbody><tr v-for="task in tasks" :key="task.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5 font-medium text-[#28343c]">{{ task.id }}</td><td class="px-3 py-2.5 font-semibold">{{ task.room }}</td><td class="px-3 py-2.5">{{ task.job }}</td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="statusClass(task.status)">{{ task.status }}</span></td><td class="px-3 py-2.5">{{ task.assigned }}</td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="priorityClass(task.priority)">{{ task.priority }}</span></td><td class="px-3 py-2.5"><button v-if="task.status === 'Pending'" class="rounded-md bg-[#dfebff] px-2.5 py-1.5 text-[8px] font-medium text-[#345995] hover:bg-[#cbdcff]" @click="startTask(task)">Start</button><button v-else-if="task.status === 'In Progress'" class="rounded-md bg-[#d9f8e9] px-2.5 py-1.5 text-[8px] font-medium text-[#246b4c] hover:bg-[#c6f2dc]" @click="finishTask(task)">Finish</button><span v-else class="text-[8px] text-[#7c898f]">Done · ready to sell</span></td></tr><tr v-if="tasks.length === 0"><td colspan="7" class="px-3 py-10 text-center text-[10px] text-[#818b93]">No tasks match your filters.</td></tr></tbody></table></div>

        <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"><article v-for="task in tasks" :key="task.id" class="rounded-lg border border-[#e7e9ed] p-3"><div class="flex items-start justify-between"><div><p class="text-[9px] font-semibold text-[#34414a]">{{ task.id }} <span class="ml-1 text-[#818b93]">· {{ task.room }}</span></p><h3 class="mt-1 text-[11px] font-medium text-[#37434c]">{{ task.job }}</h3></div><span class="rounded-full px-2 py-1 text-[8px]" :class="statusClass(task.status)">{{ task.status }}</span></div><p class="mt-2 text-[9px] text-[#77838b]">Assigned to {{ task.assigned }} · {{ task.duration }} min</p><div class="mt-3 flex items-center justify-between"><span class="rounded-full px-2 py-1 text-[8px]" :class="priorityClass(task.priority)">{{ task.priority }} priority</span><button v-if="task.status === 'Pending'" class="rounded-md bg-[#dfebff] px-3 py-1.5 text-[8px] font-medium text-[#345995]" @click="startTask(task)">Start cleaning</button><button v-else-if="task.status === 'In Progress'" class="rounded-md bg-[#d9f8e9] px-3 py-1.5 text-[8px] font-medium text-[#246b4c]" @click="finishTask(task)">Mark clean</button><span v-else class="text-[8px] text-[#24734d]">Ready to sell</span></div></article><p v-if="tasks.length === 0" class="py-10 text-center text-[10px] text-[#818b93]">No tasks match your filters.</p></div>
      </div>
    </div>

    <div v-if="showMaintenanceForm" class="modal-backdrop" @click.self="showMaintenanceForm = false"><section class="modal-card max-w-[520px] text-left" role="dialog" aria-modal="true" aria-labelledby="maintenance-request-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Housekeeping &amp; Maintenance · fault report</p><h2 id="maintenance-request-title" class="mt-1 font-serif text-[21px] text-[#30243e]">New Maintenance Request</h2></div><button aria-label="Close maintenance request" class="rounded-md p-1.5 text-[#8c858f]" @click="showMaintenanceForm = false">×</button></header><div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="form-label">Room<select v-model="maintenanceForm.room" class="form-input mt-1"><option value="">Choose a room</option><option v-for="room in housekeepingRooms" :key="room.number" :value="room.number">Room {{ room.number }}</option><option>Public area</option></select></label><label class="form-label">Fault category<select v-model="maintenanceForm.category" class="form-input mt-1"><option v-for="category in maintenanceCategories" :key="category">{{ category }}</option></select></label><label class="form-label">Priority<select v-model="maintenanceForm.priority" class="form-input mt-1"><option>Low</option><option>Normal</option><option>High</option></select></label><label class="form-label">Assign technician<select v-model="maintenanceForm.assigned" class="form-input mt-1"><option v-for="person in maintenanceStaff" :key="person">{{ person }}</option></select></label><label class="form-label sm:col-span-2">Fault description<textarea v-model="maintenanceForm.description" class="form-input mt-1 min-h-20 py-2" placeholder="Describe the fault and where it occurred" /></label></div><p v-if="maintenanceFormError" class="mt-3 text-[9px] text-[#a25454]">{{ maintenanceFormError }}</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="showMaintenanceForm = false">Cancel</button><button class="arrival-action-primary" @click="saveMaintenanceRequest">Report fault</button></footer></section></div>

    <div v-if="completingMaintenance" class="modal-backdrop" @click.self="completingMaintenance = null"><section class="modal-card max-w-[440px] text-left" role="dialog" aria-modal="true" aria-labelledby="maintenance-cost-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Maintenance · close request</p><h2 id="maintenance-cost-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Complete {{ completingMaintenance.id }}?</h2></div><button aria-label="Close completion form" class="rounded-md p-1.5 text-[#8c858f]" @click="completingMaintenance = null">×</button></header><p class="mt-2 text-[9px] text-[#77838b]">{{ completingMaintenance.room }} · {{ completingMaintenance.description }}</p><label class="form-label mt-4">Actual job cost (₱)<input v-model="maintenanceCostInput" class="form-input mt-1" type="number" min="0" step="0.01" placeholder="0.00" /></label><p class="mt-2 text-[8px] text-[#77838b]">This amount will be recorded to the Maintenance cost centre.</p><p v-if="completionError" class="mt-2 text-[9px] text-[#a25454]">{{ completionError }}</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="completingMaintenance = null">Cancel</button><button class="arrival-action-primary" @click="completeMaintenance">Complete job</button></footer></section></div>

    <div v-if="showTaskForm" class="modal-backdrop" @click.self="showTaskForm = false"><section class="modal-card max-h-[90vh] max-w-[620px] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="work-task-title"><header class="flex items-start justify-between"><div><h2 id="work-task-title" class="text-[16px] font-semibold text-[#30243e]">{{ bulkMode ? 'Create tasks for several rooms' : 'Create a room task' }}</h2><p class="mt-1 text-[9px] text-[#7d8991]">Choose a job, select {{ bulkMode ? 'one or more rooms' : 'one room' }}, and assign an attendant.</p></div><button aria-label="Close task form" class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" @click="showTaskForm = false">×</button></header>
      <p class="mt-4 text-[9px] font-medium text-[#66737d]">Job</p><div class="mt-2 grid gap-2 sm:grid-cols-2"><button v-for="preset in presets" :key="preset.label" class="flex items-start gap-2 rounded-md border p-2.5 text-left" :class="selectedPreset.label === preset.label ? 'border-[#e6bf47] bg-[#fffbed]' : 'border-[#e4e8ec] hover:bg-[#fafbfd]'" @click="choosePreset(preset)"><span class="mt-0.5 text-[13px]">{{ preset.category === 'Maintenance' ? '🔧' : preset.category === 'Cleaning areas' ? '🏛' : preset.job === 'Deep clean' ? '✨' : preset.job === 'Room turnover' ? '🔄' : '🧹' }}</span><span><strong class="block text-[9px] text-[#36434c]">{{ preset.label }}</strong><small class="mt-0.5 block text-[8px] text-[#7b8790]">{{ preset.job }} · {{ preset.duration }} min</small></span></button></div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-2"><p class="text-[9px] font-medium text-[#66737d]">{{ form.category === 'Cleaning areas' ? 'Areas' : 'Rooms' }} ({{ selectedRooms.length }} selected)</p><div v-if="form.category !== 'Cleaning areas'" class="flex flex-wrap gap-1"><button v-for="status in (['Dirty', 'Occupied', 'Vacant', 'Clean', 'All'] as const)" :key="status" class="rounded-full border px-2.5 py-1 text-[8px]" :class="roomStatusFilter === status ? 'border-[#1672d9] bg-[#1672d9] text-white' : 'border-[#e1e5e9] text-[#5c6872]'" @click="selectRoomsByStatus(status)">{{ status }}</button></div></div>
      <div v-if="form.category === 'Cleaning areas'" class="mt-2 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[#e0e4e8] p-2 sm:grid-cols-3"><button v-for="area in eligibleAreas" :key="area" class="rounded-md border px-2.5 py-3 text-left text-[9px]" :class="selectedRooms.includes(area) ? 'border-[#1672d9] bg-[#eff6ff] text-[#315a8e]' : 'border-[#e5e9ed] text-[#53616b]'" @click="toggleRoom(area)">{{ area }}</button></div>
      <div v-else class="mt-2 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[#e0e4e8] p-2 sm:grid-cols-4"><button v-for="room in eligibleRooms" :key="room.number" class="rounded-md border px-2.5 py-2 text-left" :class="selectedRooms.includes(room.number) ? 'border-[#1672d9] bg-[#eff6ff]' : 'border-[#e5e9ed] hover:bg-[#fafbfd]'" @click="toggleRoom(room.number)"><strong class="block text-[10px] text-[#303c45]">{{ room.number }}</strong><small class="mt-0.5 block text-[8px] text-[#7d8991]">{{ roomStatus(room).toLowerCase() }}</small></button><p v-if="eligibleRooms.length === 0" class="col-span-full px-2 py-4 text-center text-[9px] text-[#87929a]">No rooms in this status.</p></div>
      <div class="mt-2 flex gap-2"><button class="rounded-md border border-[#e5e8ec] px-2.5 py-1.5 text-[8px] text-[#5d6972]" @click="selectListedRooms">Select listed</button><button class="rounded-md border border-[#e5e8ec] px-2.5 py-1.5 text-[8px] text-[#5d6972]" @click="selectedRooms = []">Clear</button></div>
      <div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="form-label">Assign attendant<select v-model="form.assigned" class="form-input mt-1"><option v-for="person in staff" :key="person">{{ person }}</option></select></label><label class="form-label">Priority<select v-model="form.priority" class="form-input mt-1"><option>Low</option><option>Medium</option><option>High</option></select></label><label class="form-label">Estimated time (minutes)<input v-model="form.duration" class="form-input mt-1" type="number" min="1" /></label></div><p v-if="formError" class="mt-3 text-[9px] text-[#a25454]">{{ formError }}</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="showTaskForm = false">Cancel</button><button class="arrival-action-primary" @click="saveTask">Assign {{ selectedRooms.length || '' }} {{ selectedRooms.length === 1 ? 'task' : 'tasks' }}</button></footer></section></div>
  </section>
</template>
