<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { housekeepingCleaningRooms as cleaningRoomNumbers, housekeepingReadyRooms, housekeepingRooms as dirtyRoomNumbers, reservations } from '@/features/front-office/stores/reservations'
import { housekeepingInspections, housekeepingPublicSpaces, housekeepingRooms, type HousekeepingRoom, type HousekeepingTaskState } from '@/features/housekeeping/stores/housekeeping'

type FloorTab = 'Rooms' | 'Public spaces' | 'Inspections'
const activeTab = ref<FloorTab>('Rooms')
const roomToFinish = ref<HousekeepingRoom | null>(null)
const roomToInspect = ref<HousekeepingRoom | null>(null)
const inspectionForm = ref({ score: '' as number | '', inspector: 'Adwoa Manu', note: '' })
const search = ref('')
const statusFilter = ref('All statuses')
const floorFilter = ref('All floors')
const tabs: FloorTab[] = ['Rooms', 'Public spaces', 'Inspections']
const statusOptions = ['All statuses', 'Occupied', 'Cleaning', 'Dirty', 'Vacant', 'Inspection']
const floorOptions = ['All floors', 'Floor 1', 'Floor 2', 'Floor 3']
const inHouseRooms = computed(() => new Set(reservations.value.filter((stay) => stay.status === 'In house').map((stay) => stay.room)))
watch([dirtyRoomNumbers, cleaningRoomNumbers], () => {
  for (const room of housekeepingRooms.value) {
    if (cleaningRoomNumbers.value.includes(room.number)) {
      if (room.taskState === 'Clean' || room.taskState === 'Dirty') room.taskState = 'Cleaning'
    } else if (dirtyRoomNumbers.value.includes(room.number)) {
      if (room.taskState !== 'Inspection') room.taskState = 'Dirty'
    }
  }
}, { deep: true, immediate: true })

housekeepingRooms.value.forEach((room) => {
  if (room.taskState === 'Cleaning' && !cleaningRoomNumbers.value.includes(room.number)) cleaningRoomNumbers.value.push(room.number)
  else if (room.taskState === 'Dirty' && !dirtyRoomNumbers.value.includes(room.number)) dirtyRoomNumbers.value.push(room.number)
})

function displayStatus(room: HousekeepingRoom) {
  if (room.taskState !== 'Clean') return room.taskState
  return inHouseRooms.value.has(room.number) || room.occupancy === 'Occupied' ? 'Occupied' : 'Vacant'
}
const filteredRooms = computed(() => housekeepingRooms.value.filter((room) => {
  const query = search.value.trim().toLowerCase()
  const status = displayStatus(room)
  const floor = floorFilter.value === 'All floors' || floorFilter.value === `Floor ${room.floor}`
  return floor
    && (statusFilter.value === 'All statuses' || status === statusFilter.value)
    && (!query || room.number.toLowerCase().includes(query))
}))
const inspectionQueue = computed(() => housekeepingRooms.value.filter((room) => room.taskState === 'Inspection'))

function timestamp() {
  return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}
function flagRoomForHousekeeping(room: HousekeepingRoom) {
  if (!dirtyRoomNumbers.value.includes(room.number)) dirtyRoomNumbers.value.push(room.number)
}
function markDirty(room: HousekeepingRoom) {
  room.taskState = 'Dirty'
  room.updatedAt = timestamp()
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((number) => number !== room.number)
  cleaningRoomNumbers.value = cleaningRoomNumbers.value.filter((number) => number !== room.number)
  flagRoomForHousekeeping(room)
}
function updatePublicSpace(space: typeof housekeepingPublicSpaces.value[number], state: HousekeepingTaskState) {
  space.taskState = state
  space.updatedAt = timestamp()
}
function startRoom(room: HousekeepingRoom) {
  room.taskState = 'Cleaning'
  room.updatedAt = timestamp()
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((number) => number !== room.number)
  dirtyRoomNumbers.value = dirtyRoomNumbers.value.filter((number) => number !== room.number)
  if (!cleaningRoomNumbers.value.includes(room.number)) cleaningRoomNumbers.value.push(room.number)
}
function finishRoom(room: HousekeepingRoom) {
  room.taskState = 'Inspection'
  room.updatedAt = timestamp()
  cleaningRoomNumbers.value = cleaningRoomNumbers.value.filter((number) => number !== room.number)
  flagRoomForHousekeeping(room)
}
function confirmFinishRoom() {
  if (!roomToFinish.value) return
  finishRoom(roomToFinish.value)
  roomToFinish.value = null
}
function inspectRoom(room: HousekeepingRoom) {
  roomToInspect.value = room
  inspectionForm.value = { score: '', inspector: 'Adwoa Manu', note: '' }
}
function confirmInspection() {
  const score = Number(inspectionForm.value.score)
  if (!roomToInspect.value || inspectionForm.value.score === '' || !Number.isFinite(score) || score < 0 || score > 100) return
  const room = roomToInspect.value
  housekeepingInspections.value.unshift({
    id: `INS-${Date.now().toString(36).toUpperCase()}`,
    room: room.number,
    score,
    inspector: inspectionForm.value.inspector.trim() || 'Unassigned',
    inspectedAt: new Date().toISOString(),
    note: inspectionForm.value.note.trim(),
  })
  room.taskState = score >= 80 ? 'Clean' : 'Dirty'
  room.updatedAt = timestamp()
  dirtyRoomNumbers.value = dirtyRoomNumbers.value.filter((number) => number !== room.number)
  cleaningRoomNumbers.value = cleaningRoomNumbers.value.filter((number) => number !== room.number)
  if (score >= 80) {
    if (!inHouseRooms.value.has(room.number) && !housekeepingReadyRooms.value.includes(room.number)) housekeepingReadyRooms.value.push(room.number)
  } else {
    dirtyRoomNumbers.value.push(room.number)
    housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((number) => number !== room.number)
  }
  roomToInspect.value = null
}
function statusClass(status: string) {
  return {
    Occupied: 'bg-[#dcf7eb] text-[#207a50]',
    Cleaning: 'bg-[#e1eeff] text-[#3971b9]',
    Dirty: 'bg-[#fff0c2] text-[#916b18]',
    Vacant: 'bg-[#f1edf5] text-[#777080]',
    Inspection: 'bg-[#f0e5ff] text-[#7351a4]',
    Clean: 'bg-[#dcf7eb] text-[#207a50]',
  }[status] || 'bg-[#f1edf5] text-[#777080]'
}
function dotClass(status: string) {
  return {
    Occupied: 'bg-[#42c98a]', Cleaning: 'bg-[#5890e2]', Dirty: 'bg-[#eeae3e]',
    Vacant: 'bg-[#b7a7c9]', Inspection: 'bg-[#9b6bd1]', Clean: 'bg-[#42c98a]',
  }[status] || 'bg-[#b7a7c9]'
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <p class="eyebrow">Housekeeping &amp; Maintenance <span class="px-1 text-[#c3bcc9]">/</span> Floor</p>
      <h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Floor operations</h1>
    </header>

    <div class="overflow-hidden rounded-lg border border-[#e6e9ed] bg-white">
      <nav class="flex flex-wrap gap-1 border-b border-[#e8ebef] bg-[#f8fafc] p-2" aria-label="Housekeeping areas">
        <button v-for="tab in tabs" :key="tab" class="rounded-md px-3 py-2 text-[10px] font-medium" :class="activeTab === tab ? 'border border-[#e2e6eb] bg-white text-[#26323c] shadow-sm' : 'text-[#697681] hover:bg-white'" @click="activeTab = tab">{{ tab }}</button>
      </nav>

      <div v-if="activeTab === 'Rooms'" class="p-2.5">
        <div class="mb-2 grid gap-2 sm:grid-cols-[minmax(150px,1fr)_minmax(140px,1fr)_minmax(130px,1fr)_auto]">
          <label class="client-search"><span aria-hidden="true">⌕</span><span class="sr-only">Search room numbers</span><input v-model="search" placeholder="Search room numbers..." /></label>
          <select v-model="statusFilter" class="report-select"><option v-for="status in statusOptions" :key="status" :value="status">{{ status === 'All statuses' ? 'Filter by status' : status }}</option></select>
          <select v-model="floorFilter" class="report-select"><option v-for="floor in floorOptions" :key="floor" :value="floor">{{ floor === 'All floors' ? 'Filter by floor' : floor }}</option></select>
          <span class="self-center text-[9px] text-[#687681]">Filtered: {{ filteredRooms.length }}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7">
          <article v-for="room in filteredRooms" :key="room.number" class="rounded-xl border border-[#e7e9ed] bg-white p-2 shadow-[0_1px_3px_rgba(35,45,55,0.04)]">
            <div class="flex items-start justify-between"><div><h2 class="text-[12px] font-semibold leading-4 text-[#222c33]">{{ room.number }}</h2><p class="text-[8px] text-[#818b93]">F{{ room.floor }} · {{ room.type }}</p></div><span v-if="room.alert" class="text-[13px] leading-4 text-[#4c5660]">!</span></div>
            <div class="mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px]" :class="statusClass(displayStatus(room))"><i class="size-2 rounded-full" :class="dotClass(displayStatus(room))" />{{ displayStatus(room) }}</div>
            <p class="mt-1.5 text-[8px] text-[#929aa1]">{{ room.updatedAt }}</p>
            <div class="mt-2 grid grid-cols-2 gap-1"><button class="rounded-md bg-[#fff1bf] px-1 py-2 text-[8px] font-medium text-[#79601c] hover:bg-[#ffe99c]" @click="markDirty(room)">Dirty</button><button class="rounded-md bg-[#dfebff] px-1 py-2 text-[8px] font-medium text-[#345995] hover:bg-[#cbdcff]" :disabled="room.taskState === 'Cleaning'" @click="startRoom(room)">{{ room.taskState === 'Cleaning' ? 'Started' : 'Start' }}</button><button class="rounded-md bg-[#d9f8e9] px-1 py-2 text-[8px] font-medium text-[#246b4c] hover:bg-[#c6f2dc]" :disabled="room.taskState === 'Clean' || room.taskState === 'Inspection'" @click="roomToFinish = room">Done</button><button class="rounded-md bg-[#f2e3ff] px-1 py-2 text-[8px] font-medium text-[#67418a] hover:bg-[#e8d2ff]" :disabled="room.taskState !== 'Inspection'" @click="inspectRoom(room)">Inspect</button></div>
          </article>
        </div>
      </div>

      <div v-else-if="activeTab === 'Public spaces'" class="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
        <article v-for="space in housekeepingPublicSpaces" :key="space.name" class="rounded-xl border border-[#e7e9ed] p-3">
          <h2 class="text-[11px] font-semibold text-[#26323c]">{{ space.name }}</h2><span class="mt-2 inline-flex rounded-full px-2 py-1 text-[8px]" :class="statusClass(space.taskState)">{{ space.taskState }}</span><p class="mt-2 text-[8px] text-[#929aa1]">{{ space.updatedAt }}</p>
          <div class="mt-3 grid grid-cols-2 gap-1"><button class="rounded-md bg-[#fff1bf] px-2 py-2 text-[8px] text-[#79601c]" @click="updatePublicSpace(space, 'Dirty')">Dirty</button><button class="rounded-md bg-[#dfebff] px-2 py-2 text-[8px] text-[#345995]" @click="updatePublicSpace(space, 'Cleaning')">Start</button><button class="rounded-md bg-[#d9f8e9] px-2 py-2 text-[8px] text-[#246b4c]" @click="updatePublicSpace(space, 'Inspection')">Done</button><button class="rounded-md bg-[#f2e3ff] px-2 py-2 text-[8px] text-[#67418a]" @click="updatePublicSpace(space, 'Clean')">Inspect</button></div>
        </article>
      </div>

      <div v-else class="overflow-x-auto p-3">
        <table class="w-full min-w-[420px] border-collapse text-left"><thead class="bg-[#f8fafc] text-[8px] uppercase tracking-[0.08em] text-[#818b93]"><tr><th class="px-3 py-2">Room</th><th class="px-3 py-2">Floor</th><th class="px-3 py-2">Task</th><th class="px-3 py-2">Updated</th><th class="px-3 py-2">Action</th></tr></thead><tbody><tr v-for="room in inspectionQueue" :key="room.number" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2 font-medium">{{ room.number }}</td><td class="px-3 py-2">Floor {{ room.floor }}</td><td class="px-3 py-2">Ready for inspection</td><td class="px-3 py-2">{{ room.updatedAt }}</td><td class="px-3 py-2"><button class="rounded-md bg-[#f2e3ff] px-3 py-1.5 text-[8px] font-medium text-[#67418a]" @click="inspectRoom(room)">Inspect</button></td></tr><tr v-if="inspectionQueue.length === 0"><td colspan="5" class="px-3 py-10 text-center text-[10px] text-[#818b93]">No rooms waiting for inspection.</td></tr></tbody></table>
      </div>
    </div>

    <div v-if="roomToFinish" class="modal-backdrop" @click.self="roomToFinish = null">
      <section class="modal-card max-w-[430px] text-left" role="dialog" aria-modal="true" aria-labelledby="finish-room-title">
        <header class="flex items-start justify-between gap-3">
          <h2 id="finish-room-title" class="text-[16px] font-semibold text-[#30243e]">Finish room {{ roomToFinish.number }}?</h2>
          <button class="rounded-md p-1 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close confirmation" @click="roomToFinish = null">×</button>
        </header>
        <p class="mt-3 text-[11px] text-[#727d84]">Nothing comes off stock.</p>
        <footer class="mt-5 flex justify-end gap-2">
          <button class="secondary-button" @click="roomToFinish = null">Cancel</button>
          <button class="arrival-action-primary" @click="confirmFinishRoom">Finish</button>
        </footer>
      </section>
    </div>

    <div v-if="roomToInspect" class="modal-backdrop" @click.self="roomToInspect = null">
      <section class="modal-card max-w-[430px] text-left" role="dialog" aria-modal="true" aria-labelledby="inspect-room-title">
        <header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Room inspection</p><h2 id="inspect-room-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Inspect room {{ roomToInspect.number }}</h2></div><button class="rounded-md p-1 text-[#8c858f]" aria-label="Close inspection" @click="roomToInspect = null">×</button></header>
        <div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="form-label">Score (0–100)<input v-model.number="inspectionForm.score" class="form-input mt-1" type="number" min="0" max="100" placeholder="Enter score" /></label><label class="form-label">Inspector<input v-model="inspectionForm.inspector" class="form-input mt-1" /></label><label class="form-label sm:col-span-2">Notes<textarea v-model="inspectionForm.note" class="form-input mt-1 min-h-20 py-2" placeholder="Optional inspection notes" /></label></div>
        <p class="mt-2 text-[8px] text-[#82909a]">Passing the inspection marks the room clean and ready to sell.</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="roomToInspect = null">Cancel</button><button class="arrival-action-primary" :disabled="inspectionForm.score === '' || inspectionForm.score < 0 || inspectionForm.score > 100" @click="confirmInspection">Save inspection</button></footer>
      </section>
    </div>
  </section>
</template>
