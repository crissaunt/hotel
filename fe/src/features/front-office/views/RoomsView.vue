<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Grid2X2,
  List,
  Search,
  Sparkles,
  X,
} from '@lucide/vue'
import { housekeepingCleaningRooms, housekeepingReadyRooms, housekeepingRooms, reservations } from '@/features/front-office/stores/reservations'
import { housekeepingRooms as floorRooms, maintenanceRequests } from '@/features/housekeeping/stores/housekeeping'
import { adminRecords } from '@/features/admin/adminData'

type RoomStatus = 'Available' | 'Reserved' | 'Cleaning' | 'Dirty' | 'Inspection' | 'Occupied' | 'Out of service'
type Room = {
  number: string
  type: string
  floor: number
  status: RoomStatus
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const today = toDateKey(new Date())

function createSampleRooms(): Room[] {
  return Array.from({ length: 4 }, (_, floorIndex) => {
    const floor = floorIndex + 1
    return Array.from({ length: 15 }, (_, roomIndex) => {
      const number = `${floor}${String(roomIndex + 1).padStart(2, '0')}`
      const floorRoom = floorRooms.value.find((room) => room.number === number)
      const sampleRoom: Room = {
        number,
        type: floorRoom?.type || 'Standard',
        floor,
        status: 'Available',
      }
      return sampleRoom
    })
  }).flat()
}

const rooms = ref<Room[]>(createSampleRooms())
const roomStatusBulletin = computed(() => rooms.value.map((room) => {
  const roomStays = reservations.value.filter((stay) => stay.room === room.number && !['Cancelled', 'No show', 'Checked out'].includes(stay.status))
  const arriving = roomStays.find((stay) => stay.checkIn === today && stay.status !== 'In house')
  const staying = roomStays.find((stay) => stay.status === 'In house' && stay.checkIn <= today && stay.checkOut > today)
  const departing = roomStays.find((stay) => stay.checkOut === today)
  const currentStay = staying || arriving || departing
  const rateRecord = adminRecords.roomRates.find((rate) => rate.from <= today && rate.to >= today
    && (rate.roomType.toLowerCase().startsWith(room.type.toLowerCase()) || room.type.toLowerCase().startsWith(rate.roomType.toLowerCase())))
  const maintenance = maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')
  const floorRoom = floorRooms.value.find((item) => item.number === room.number)
  let status: RoomStatus = 'Available'
  if (maintenance || floorRoom?.outOfService) status = 'Out of service'
  else if (staying || floorRoom?.occupancy === 'Occupied') status = 'Occupied'
  else if (housekeepingCleaningRooms.value.includes(room.number) || floorRoom?.taskState === 'Cleaning') status = 'Cleaning'
  else if (housekeepingRooms.value.includes(room.number) || floorRoom?.taskState === 'Dirty') status = 'Dirty'
  else if (floorRoom?.taskState === 'Inspection') status = 'Inspection'
  else if (arriving || departing) status = 'Reserved'
  return {
    ...room,
    status,
    rate: currentStay ? currentStay.rate : rateRecord ? Number(rateRecord.amount) : undefined,
    arriving: arriving ? `${arriving.guest} · ${arriving.arrivalTime}` : '—',
    staying: staying?.guest || '—',
    departing: departing?.guest || '—',
  }
}))

const roomStatuses: RoomStatus[] = ['Available', 'Reserved', 'Occupied', 'Cleaning', 'Dirty', 'Inspection', 'Out of service']
const roomUpdatableStatuses: RoomStatus[] = ['Available', 'Occupied', 'Cleaning', 'Dirty', 'Inspection', 'Out of service']
type RoomFilter = 'All rooms' | RoomStatus
const activeFilter = ref<RoomFilter>('All rooms')
const activeFloor = ref('All floors')
const activeRoomType = ref('All room types')
const viewMode = ref<'grid' | 'table'>('grid')
const dateMode = ref<'today' | 'specific' | 'range'>('today')
const specificDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const search = ref('')
const sortBy = ref('Room number')
const selectedRoom = ref<Room | null>(null)
const roomMenu = ref('')
const roomStatusError = ref('')
const roomNotice = ref('')
const page = ref(1)
const pageSize = computed(() => viewMode.value === 'grid' ? 30 : 8)

const dateWindow = computed(() => {
  if (dateMode.value === 'specific') return { from: specificDate.value || today, to: specificDate.value || today }
  if (dateMode.value === 'range') {
    const start = rangeStart.value || today
    const end = rangeEnd.value || start
    return start <= end ? { from: start, to: end } : { from: end, to: start }
  }
  return { from: today, to: today }
})

function roomStatusFor(room: Room): RoomStatus {
  const maintenance = maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')
  const floorRoom = floorRooms.value.find((item) => item.number === room.number)
  if (maintenance || floorRoom?.outOfService || room.status === 'Out of service') return 'Out of service'
  const checkedInStay = reservations.value.find((reservation) => reservation.room === room.number
    && reservation.status === 'In house'
    && reservation.checkIn <= dateWindow.value.to
    && reservation.checkOut > dateWindow.value.from)
  if (checkedInStay || floorRoom?.occupancy === 'Occupied') return 'Occupied'
  if (housekeepingCleaningRooms.value.includes(room.number) || floorRoom?.taskState === 'Cleaning') return 'Cleaning'
  if (housekeepingRooms.value.includes(room.number) || floorRoom?.taskState === 'Dirty') return 'Dirty'
  if (floorRoom?.taskState === 'Inspection') return 'Inspection'
  const reservation = reservations.value.find((item) => item.room === room.number
    && !['Cancelled', 'No show', 'Checked out'].includes(item.status)
    && item.checkIn <= dateWindow.value.to && item.checkOut > dateWindow.value.from)
  if (reservation) return 'Reserved'
  if (housekeepingReadyRooms.value.includes(room.number)) return 'Available'
  return 'Available'
}

function roomGuestFor(room: Room) {
  return roomReservationFor(room)?.guest || '—'
}

function roomReservationFor(room: Room) {
  return reservations.value.find((reservation) => reservation.room === room.number
    && !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
    && reservation.checkIn <= dateWindow.value.to && reservation.checkOut > dateWindow.value.from)
}
function roomStayDatesFor(room: Room) {
  const reservation = roomReservationFor(room)
  return reservation ? `${formatDate(reservation.checkIn)} – ${formatDate(reservation.checkOut)}` : ''
}

const counts = computed(() => {
  const statuses = rooms.value.map(roomStatusFor)
  return {
    total: rooms.value.length,
    Available: statuses.filter((status) => status === 'Available').length,
    Reserved: statuses.filter((status) => status === 'Reserved').length,
    Cleaning: statuses.filter((status) => status === 'Cleaning').length,
    Dirty: statuses.filter((status) => status === 'Dirty').length,
    Inspection: statuses.filter((status) => status === 'Inspection').length,
    Occupied: statuses.filter((status) => status === 'Occupied').length,
    'Out of service': statuses.filter((status) => status === 'Out of service').length,
  }
})

const roomTypes = computed(() => ['All room types', ...new Set(rooms.value.map((room) => room.type))])
function floorLabel(floor: number) {
  const ordinal = floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'
  return `${floor}${ordinal} Floor`
}

const floors = computed(() => ['All floors', ...new Set(rooms.value.map((room) => floorLabel(room.floor))).values()])

const filteredRooms = computed(() => {
  const query = search.value.trim().toLowerCase()
  return rooms.value
    .filter((room) => activeFilter.value === 'All rooms' || roomStatusFor(room) === activeFilter.value)
    .filter((room) => activeFloor.value === 'All floors' || floorLabel(room.floor) === activeFloor.value)
    .filter((room) => activeRoomType.value === 'All room types' || room.type === activeRoomType.value)
    .filter((room) => !query || [room.number, room.type, roomGuestFor(room), roomStatusFor(room)].some((value) => value.toLowerCase().includes(query)))
    .sort((a, b) => (sortBy.value === 'Room number' ? a.number.localeCompare(b.number) : a.type.localeCompare(b.type)))
})
const visibleRooms = computed(() => filteredRooms.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRooms.value.length / pageSize.value)))
const displayRange = computed(() => filteredRooms.value.length === 0 ? '0' : `${(page.value - 1) * pageSize.value + 1}–${Math.min(page.value * pageSize.value, filteredRooms.value.length)}`)
watch(pageCount, (totalPages) => {
  if (page.value > totalPages) page.value = totalPages
})

function setFilter(filter: RoomFilter) {
  activeFilter.value = filter
  page.value = 1
}

function statusClass(status: RoomStatus) {
  return {
    Available: 'bg-[#e8f2eb] text-[#3d7553]',
    Reserved: 'bg-[#e9f1f6] text-[#4d6e83]',
    Cleaning: 'bg-[#eaf1f8] text-[#4d6e90]',
    Dirty: 'bg-[#f7f0e3] text-[#96733b]',
    Inspection: 'bg-[#f1ebf7] text-[#765b91]',
    Occupied: 'bg-[#edf0f3] text-[#586875]',
    'Out of service': 'bg-[#f6eaea] text-[#a25454]',
  }[status]
}

function statusDotClass(status: RoomStatus) {
  return {
    Available: 'bg-[#54a477]',
    Reserved: 'bg-[#6f94aa]',
    Cleaning: 'bg-[#7699bd]',
    Dirty: 'bg-[#c69d52]',
    Inspection: 'bg-[#957db0]',
    Occupied: 'bg-[#8797a1]',
    'Out of service': 'bg-[#bc7373]',
  }[status]
}

function statusTextClass(status: RoomStatus) {
  return {
    Available: 'text-[#467555]',
    Reserved: 'text-[#4d6e83]',
    Cleaning: 'text-[#4d6e90]',
    Dirty: 'text-[#8e6b33]',
    Inspection: 'text-[#765b91]',
    Occupied: 'text-[#586875]',
    'Out of service': 'text-[#9a5555]',
  }[status]
}

function roomCardClass(status: RoomStatus) {
  return {
    Available: 'room-card-available',
    Reserved: 'room-card-reserved',
    Cleaning: 'room-card-cleaning',
    Dirty: 'room-card-dirty',
    Inspection: 'room-card-inspection',
    Occupied: 'room-card-occupied',
    'Out of service': 'room-card-maintenance',
  }[status]
}

function openRoom(room: Room) {
  selectedRoom.value = { ...room, status: roomStatusFor(room) }
  roomMenu.value = ''
  roomStatusError.value = ''
}

function setRoomStatus(status: RoomStatus) {
  if (!selectedRoom.value) return
  const room = rooms.value.find((item) => item.number === selectedRoom.value?.number)
  const floorRoom = floorRooms.value.find((item) => item.number === room?.number)
  if (!room || !floorRoom) return
  roomStatusError.value = ''
  if (status === 'Reserved') return
  const hasOpenMaintenance = maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')
  if (hasOpenMaintenance && status !== 'Out of service') {
    roomStatusError.value = 'This room has an open maintenance request. Resolve it before changing the room status.'
    return
  }
  room.status = status
  floorRoom.outOfService = status === 'Out of service'
  if (status === 'Occupied') {
    floorRoom.occupancy = 'Occupied'
    floorRoom.taskState = 'Clean'
  } else if (status === 'Cleaning' || status === 'Dirty' || status === 'Inspection') {
    floorRoom.occupancy = 'Vacant'
    floorRoom.taskState = status
  } else if (status === 'Available') {
    floorRoom.occupancy = 'Vacant'
    floorRoom.taskState = 'Clean'
  } else if (status === 'Out of service') {
    floorRoom.occupancy = 'Vacant'
  }
  floorRoom.updatedAt = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  housekeepingRooms.value = housekeepingRooms.value.filter((number) => number !== room.number)
  housekeepingCleaningRooms.value = housekeepingCleaningRooms.value.filter((number) => number !== room.number)
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((number) => number !== room.number)
  if (status === 'Dirty') housekeepingRooms.value.push(room.number)
  if (status === 'Cleaning') housekeepingCleaningRooms.value.push(room.number)
  if (status === 'Available') housekeepingReadyRooms.value.push(room.number)
  roomNotice.value = `Room ${room.number} updated to ${status.toLowerCase()}.`
  page.value = 1
  selectedRoom.value = null
  window.setTimeout(() => { roomNotice.value = '' }, 4500)
}

</script>

<template>
  <section>


    <div v-if="roomNotice" role="status" aria-live="polite" class=" flex items-center gap-2 rounded-md border border-[#d8e7db] bg-[#f1f7f1] px-3 py-2 text-[10px] text-[#47704f]"><Check :size="14" />{{ roomNotice }}</div>

    <div class=" flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-[16px] font-semibold tracking-[-0.015em] text-[#26353d]">Rooms</h2>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center rounded-md border border-[#e3e6e1] bg-white p-0.5" role="group" aria-label="Room view">
          <button class="view-toggle" :class="viewMode === 'table' ? 'view-toggle-active' : ''" :aria-pressed="viewMode === 'table'" @click="viewMode = 'table'; page = 1"><List :size="14" /> <span>Table</span></button>
          <button class="view-toggle" :class="viewMode === 'grid' ? 'view-toggle-active' : ''" :aria-pressed="viewMode === 'grid'" @click="viewMode = 'grid'; page = 1"><Grid2X2 :size="13" /> <span>Grid</span></button>
        </div>
      </div>
    </div>

    <section class="mt-4 overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eceee9] bg-[#fbfcfa] px-4 py-3 sm:px-5"><div><h2 class="text-[12px] font-semibold text-[#34434a]">Room status bulletin</h2><p class="mt-0.5 text-[9px] text-[#879294]">Today · {{ formatDate(today) }}</p></div><span class="text-[9px] text-[#879294]">{{ roomStatusBulletin.length }} rooms</span></header>
      <div class="max-h-[360px] overflow-auto">
        <table class="w-full min-w-[980px] border-collapse text-left"><thead class="sticky top-0 z-[1] bg-[#fafbf9]"><tr><th class="reservation-head pl-4">Room no.</th><th class="reservation-head">Room type</th><th class="reservation-head text-right">Room rate</th><th class="reservation-head">Room status</th><th class="reservation-head">Arriving</th><th class="reservation-head">Staying</th><th class="reservation-head pr-4">Departing</th></tr></thead><tbody><tr v-for="room in roomStatusBulletin" :key="`bulletin-${room.number}`" class="reservation-row"><td class="reservation-cell pl-4 font-semibold text-[#46565f]">{{ room.number }}</td><td class="reservation-cell text-[#5f6d74]">{{ room.type }}</td><td class="reservation-cell text-right text-[#52616a]">{{ room.rate != null ? `₱${room.rate.toFixed(2)}` : '—' }}</td><td class="reservation-cell"><span class="status-pill" :class="statusClass(room.status)">{{ room.status }}</span></td><td class="reservation-cell text-[#5f6d74]">{{ room.arriving }}</td><td class="reservation-cell text-[#5f6d74]">{{ room.staying }}</td><td class="reservation-cell pr-4 text-[#5f6d74]">{{ room.departing }}</td></tr></tbody></table>
      </div>
    </section>

    <div class="mt-4 overflow-hidden rounded-lg bg-white">

      <div class="flex items-center justify-between gap-2 overflow-x-auto whitespace-nowrap  px-4 py-2 scrollbar-none sm:px-5">
        <div v-if="viewMode === 'table'" class="flex shrink-0 items-center gap-2">
          <span class="mr-1 text-[9px] font-medium uppercase tracking-widest text-[#99a19f]">Floor</span>
          <button v-for="floor in floors" :key="floor" class="floor-chip" :class="activeFloor === floor ? 'floor-chip-active' : ''" @click="activeFloor = floor; page = 1">{{ floor }}</button>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <label class="search-field"><Search :size="15" class="shrink-0 text-[#9ba4a4]" /><input v-model="search" aria-label="Search rooms, status, or guests" placeholder="Search room, status, or guest" @input="page = 1" /><button v-if="search" aria-label="Clear search" class="text-[#9aa3a2] hover:text-[#47565d]" @click="search = ''; page = 1"><X :size="13" /></button></label>
          <div class="relative"><label class="sr-only" for="room-type-filter">Filter by room type</label>
            <select id="room-type-filter" v-model="activeRoomType" class="sort-select" @change="page = 1"><option v-for="type in roomTypes" :key="type">{{ type }}</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#889398]" />
          </div>
          <label class="sr-only" for="room-sort">Sort rooms</label>
          <div class="relative"><select id="room-sort" v-model="sortBy" class="sort-select"><option>Room number</option><option>Room type</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#889398]" /></div>
        </div>
        <div class="ml-auto flex shrink-0 items-center gap-2">
          <span class="mx-1 h-5 w-px shrink-0 bg-[#e6e9e3]" aria-hidden="true" />
          <div class="flex shrink-0 items-center gap-1 rounded-md border border-[#e6e9e3] bg-white p-0.5" role="group" aria-label="Availability date">
            <button class="date-mode-button" :class="dateMode === 'today' ? 'date-mode-active' : ''" @click="dateMode = 'today'; page = 1">Today</button>
            <button class="date-mode-button" :class="dateMode === 'specific' ? 'date-mode-active' : ''" @click="dateMode = 'specific'; page = 1">Specific date</button>
            <button class="date-mode-button" :class="dateMode === 'range' ? 'date-mode-active' : ''" @click="dateMode = 'range'; page = 1">Date range</button>
          </div>
          <label v-if="dateMode === 'specific'" class="date-input-label shrink-0"><span class="sr-only">Specific availability date</span><input v-model="specificDate" type="date" class="date-input" @change="page = 1" /></label>
          <div v-else-if="dateMode === 'range'" class="flex shrink-0 items-center gap-2"><label class="date-input-label"><span class="sr-only">Range start date</span><input v-model="rangeStart" type="date" class="date-input" @change="page = 1" /></label><span class="text-[10px] text-[#9aa3a2]">to</span><label class="date-input-label"><span class="sr-only">Range end date</span><input v-model="rangeEnd" type="date" class="date-input" @change="page = 1" /></label></div>
        </div>
      </div>

      <div class="room-status-filter flex flex-wrap items-center  gap-x-4 gap-y-2  px-4 py-2 sm:px-5" role="group" aria-label="Filter rooms by status">
        <button class="floor-chip" :class="activeFilter === 'All rooms' ? 'floor-chip-active' : ''" :aria-pressed="activeFilter === 'All rooms'" @click="setFilter('All rooms')">All rooms <span class="ml-1 text-[#9aa3a2]">{{ counts.total }}</span></button>
        <div class="flex gap-2">
            <button v-for="status in roomStatuses" :key="status" class="flex items-center gap-1.5 underline rounded px-1.5 text-[11px] text-[#768287] hover:bg-[#f8f8f6]" :class="activeFilter === status ? 'font-semibold text-[#65428e]' : ''" :aria-pressed="activeFilter === status" @click="setFilter(activeFilter === status ? 'All rooms' : status)"><i class="size-2 rounded-full" :class="statusDotClass(status)" />{{ status }} <span class="text-[11px] text-[#a0a9a6]">{{ counts[status] }}</span></button>
        </div>
      </div>

      <div v-if="viewMode === 'grid'" class="p-4 sm:p-5">
        <div class=" flex flex-col justify-between gap-4  pb-4 sm:flex-row sm:items-center">
          <div class="flex flex-wrap items-center gap-1 text-[9px]" role="group" aria-label="Filter rooms by floor">
            <button v-for="floor in floors" :key="floor" class="floor-tab text-[9px]" :class="activeFloor === floor ? 'floor-tab-active' : ''" :aria-pressed="activeFloor === floor" @click="activeFloor = floor; page = 1">{{ floor }}</button>
          </div>
        </div>
        <div v-if="visibleRooms.length" class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          <button v-for="room in visibleRooms" :key="room.number" class="room-card" :class="roomCardClass(roomStatusFor(room))" :aria-label="`Room ${room.number}, ${room.type}, ${roomStatusFor(room)}`" @click="openRoom(room)">
            <span class="text-[12px] font-semibold leading-none text-[#2e3d43]">{{ room.number }}</span>
            <span class="mt-1.5 text-center text-[8px] leading-3 text-[#627178]">{{ room.type }}</span>
            <span class="mt-1 flex items-center gap-1 text-[7px] leading-3" :class="statusTextClass(roomStatusFor(room))"><i class="size-1.5 rounded-full" :class="statusDotClass(roomStatusFor(room))" />{{ roomStatusFor(room) }}</span>
          </button>
        </div>
        <div v-else class="py-12 text-center text-[11px] text-[#96a09f]">No rooms match these filters. Try a different floor, date, or search.</div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-150 border-collapse text-left">
          <thead><tr class="bg-[#fafbf9]">
            <th class="table-head pl-5">Room number</th>
            <th class="table-head">Room type</th><th class="table-head">Guest / booking</th><th class="table-head">Status</th><th class="table-head pr-4"><span class="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            <tr v-for="room in visibleRooms" :key="room.number" class="room-row group" @click="openRoom(room)">
              <td class="table-cell pl-5"><button class="font-semibold text-[#35434b] hover:text-[#56755f]" @click.stop="openRoom(room)">{{ room.number }}</button><span class="ml-2 text-[10px] text-[#a3aaa8]">F{{ room.floor }}</span></td>
              <td class="table-cell text-[#5f6d74]">{{ room.type }}</td>
              <td class="table-cell text-[#5f6d74]">{{ roomStatusFor(room) === 'Occupied' || roomStatusFor(room) === 'Reserved' ? roomGuestFor(room) : '—' }}</td>
              <td class="table-cell"><span class="status-pill" :class="statusClass(roomStatusFor(room))">{{ roomStatusFor(room) }}</span></td>
              <td class="table-cell pr-3 text-right" @click.stop><div class="relative"><button class="rounded p-1.5 text-[#87918f] hover:bg-[#f1f3ef] hover:text-[#53616a]" :aria-label="`Actions for room ${room.number}`" @click="roomMenu = roomMenu === room.number ? '' : room.number"><Ellipsis :size="17" /></button><div v-if="roomMenu === room.number" class="absolute right-2 top-8 z-10 w-40 rounded-md border border-[#e5e7e2] bg-white p-1 text-left shadow-lg"><button class="menu-item" @click="openRoom(room)"><BedDouble :size="14" /> View room</button><button class="menu-item" @click="openRoom(room)"><Sparkles :size="14" /> Change room status</button></div></div></td>
            </tr>
            <tr v-if="visibleRooms.length === 0"><td colspan="5" class="py-14 text-center"><div class="mx-auto flex size-10 items-center justify-center rounded-full bg-[#f1f3ef] text-[#89968e]"><Search :size="17" /></div><p class="mt-3 text-[13px] font-medium text-[#56646b]">No rooms found</p><p class="mt-1 text-[11px] text-[#96a09f]">Try adjusting your search or filters.</p></td></tr>
          </tbody>
        </table>
      </div>

      <div class="flex flex-col gap-3 border-t border-[#eceee9] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p class="text-[10px] text-[#929c9b]">Showing <span class="font-medium text-[#657279]">{{ displayRange }}</span> of <span class="font-medium text-[#657279]">{{ filteredRooms.length }}</span> rooms</p>
        <div class="flex items-center gap-1 self-end sm:self-auto"><button class="page-button" aria-label="Previous page" :disabled="page <= 1" @click="page--"><ChevronLeft :size="15" /></button><button v-for="n in pageCount" :key="n" class="page-button" :class="page === n ? 'page-button-active' : ''" @click="page = n">{{ n }}</button><button class="page-button" aria-label="Next page" :disabled="page >= pageCount" @click="page++"><ChevronRight :size="15" /></button></div>
      </div>
    </div>

  </section>

  <div v-if="selectedRoom" class="modal-backdrop" @click.self="selectedRoom = null">
    <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="`room-title-${selectedRoom.number}`">
      <div class="flex items-start justify-between"><div><p class="eyebrow">Floor {{ selectedRoom.floor }} <span class="px-1 text-[#c3c8c3]">/</span> {{ selectedRoom.type }}</p><h2 :id="`room-title-${selectedRoom.number}`" class="mt-1 font-serif text-[27px] tracking-[-0.03em] text-[#26353d]">Room {{ selectedRoom.number }}</h2></div><button class="rounded-md p-1.5 text-[#87918f] hover:bg-[#f1f3ef]" aria-label="Close dialog" @click="selectedRoom = null"><X :size="17" /></button></div>
      <div class="mt-5 rounded-md border border-[#e8ebe5] bg-[#fbfcfa] p-4"><div class="flex items-center justify-between"><span class="text-[11px] text-[#7a8787]">Status for selected date</span><span class="status-pill" :class="statusClass(selectedRoom.status)">{{ selectedRoom.status }}</span></div><div class="my-3 border-t border-[#e9ece7]"/><div class="flex justify-between text-[11px]"><span class="text-[#8b9695]">Room type</span><span class="font-medium text-[#54636a]">{{ selectedRoom.type }}</span></div><div class="mt-3 flex justify-between text-[11px]"><span class="text-[#8b9695]">Current guest / booking</span><span class="font-medium text-[#54636a]">{{ roomGuestFor(selectedRoom) }}</span></div><div v-if="roomStayDatesFor(selectedRoom)" class="mt-3 flex justify-between text-[11px]"><span class="text-[#8b9695]">Booking dates</span><span class="font-medium text-[#54636a]">{{ roomStayDatesFor(selectedRoom) }}</span></div></div>
      <p class="mt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#919b99]">Change room status</p><div class="mt-2 grid grid-cols-2 gap-2"><button v-for="status in roomUpdatableStatuses" :key="status" class="status-option" :class="selectedRoom.status === status ? 'status-option-active' : ''" @click="setRoomStatus(status)"><span class="size-2 shrink-0 rounded-full" :class="statusDotClass(status)" />{{ status }}<Check v-if="selectedRoom.status === status" :size="13" class="ml-auto shrink-0 text-[#4b8060]" /></button></div>
      <p v-if="roomStatusError" role="alert" class="mt-3 rounded-md bg-[#fbf1f0] px-3 py-2 text-[10px] text-[#9a5555]">{{ roomStatusError }}</p>
      <div class="mt-5 flex justify-end"><button class="secondary-button" @click="selectedRoom = null">Done</button></div>
    </section>
  </div>
</template>
