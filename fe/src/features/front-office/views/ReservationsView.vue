<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  List,
  Plus,
  Search,
  UserRoundPlus,
  X,
} from '@lucide/vue'
import { dateKey, dayOffset, reservations, syncVipPreparation, type Reservation, type ReservationStatus } from '@/features/front-office/stores/reservations'
import { housekeepingRooms as propertyRooms } from '@/features/housekeeping/stores/housekeeping'

type GuestDraft = { firstName: string; lastName: string; room: string; roomType: string; checkIn: string; arrivalTime: string; checkOut: string; rate: number }

function dayDifference(start: string, end: string) {
  return Math.max(1, Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86400000))
}
function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const today = dateKey(new Date())

const route = useRoute()
const viewMode = ref<'table' | 'chart'>(route.path === '/calendar' ? 'chart' : 'table')
watch(() => route.path, (path) => { viewMode.value = path === '/calendar' ? 'chart' : 'table' })
const dateMode = ref<'all' | 'today' | 'specific' | 'range'>('all')
const dateFocus = ref<'Stay dates' | 'Arrivals' | 'Departures'>('Stay dates')
const specificDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const search = ref('')
const statusFilter = ref('All statuses')
const floorFilter = ref('All floors')
const purposeFilter = ref('All purposes')
const billingFilter = ref('All billing')
const showMoreFilters = ref(false)
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const monthInput = computed({
  get: () => `${month.value.getFullYear()}-${String(month.value.getMonth() + 1).padStart(2, '0')}`,
  set: (value: string) => { if (value) month.value = new Date(`${value}-01T00:00:00`) },
})
const showCreate = ref(false)
const detailDraft = ref<Reservation | null>(null)
const detailTab = ref<'Reservation' | 'Billing' | 'Guest' | 'History'>('Reservation')
const detailError = ref('')
const detailPaymentMethod = ref('Cash')
const detailPaymentAmount = ref('')
const bookingKind = ref<'Reservation' | 'Walk-in' | 'Group booking'>('Reservation')
const bookingPaymentMode = ref<'Pay later' | 'Deposit' | 'Full payment'>('Pay later')
const bookingPaymentMethod = ref('Cash')
const bookingDepositAmount = ref('')
const companyPayer = ref(false)
const payerName = ref('')
const bookingVip = ref(false)
const vipHousekeepingNotes = ref('')
const vipComplimentaryItems = ref<string[]>([])
const vipOrderNotes = ref('')
const purpose = ref<'Leisure' | 'Business' | 'Group'>('Leisure')
const formError = ref('')
const guestDrafts = ref<GuestDraft[]>([])

const roomNumbers = Array.from({ length: 60 }, (_, index) => `${Math.floor(index / 15) + 1}${String((index % 15) + 1).padStart(2, '0')}`)
const roomTypes = computed(() => [...new Set(propertyRooms.value.map((room) => room.type))].sort())
const floorOptions = ['All floors', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4']
const dateWindow = computed(() => {
  if (dateMode.value === 'today') return { from: today, to: today }
  if (dateMode.value === 'specific') return { from: specificDate.value || today, to: specificDate.value || today }
  if (dateMode.value === 'range') {
    const start = rangeStart.value || today
    const end = rangeEnd.value || start
    return start <= end ? { from: start, to: end } : { from: end, to: start }
  }
  return null
})

const filteredReservations = computed(() => {
  const query = search.value.trim().toLowerCase()
  return reservations.value.filter((reservation) => {
    const matchesQuery = !query || [reservation.id, reservation.billingPerson, reservation.guest, reservation.room, reservationRoomType(reservation)].some((value) => value.toLowerCase().includes(query))
    const matchesStatus = statusFilter.value === 'All statuses' || reservation.status === statusFilter.value
    const matchesFloor = floorFilter.value === 'All floors' || reservation.room.startsWith(floorFilter.value.replace('Floor ', ''))
    const matchesPurpose = purposeFilter.value === 'All purposes' || reservation.purpose === purposeFilter.value
    const matchesBilling = billingFilter.value === 'All billing' || reservation.billingType === billingFilter.value
    const range = dateWindow.value
    const matchesDate = !range || (dateFocus.value === 'Arrivals'
      ? reservation.checkIn >= range.from && reservation.checkIn <= range.to
      : dateFocus.value === 'Departures'
        ? reservation.checkOut >= range.from && reservation.checkOut <= range.to
        : reservation.checkIn <= range.to && reservation.checkOut > range.from)
    return matchesQuery && matchesStatus && matchesFloor && matchesPurpose && matchesBilling && matchesDate
  }).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
})
const arrivalsToday = computed(() => reservations.value.filter((reservation) => reservation.checkIn === today && !['Cancelled', 'No show'].includes(reservation.status)))
const departuresToday = computed(() => reservations.value.filter((reservation) => reservation.checkOut === today && !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)))
const inHouseToday = computed(() => reservations.value.filter((reservation) => reservation.status === 'In house' && reservation.checkIn <= today && reservation.checkOut > today))

const daysInMonth = computed(() => new Date(month.value.getFullYear(), month.value.getMonth() + 1, 0).getDate())
const monthLabel = computed(() => month.value.toLocaleDateString('en', { month: 'long', year: 'numeric' }))
const monthDays = computed(() => Array.from({ length: daysInMonth.value }, (_, index) => {
  const date = new Date(month.value.getFullYear(), month.value.getMonth(), index + 1)
  return { number: index + 1, weekday: date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 1), key: dateKey(date) }
}))
const chartRooms = computed(() => floorFilter.value === 'All floors'
  ? roomNumbers
  : roomNumbers.filter((room) => room.startsWith(floorFilter.value.replace('Floor ', ''))))
const visibleChartReservations = computed(() => filteredReservations.value.filter((reservation) => reservation.room !== 'Unassigned' && reservation.status !== 'Cancelled' && reservation.status !== 'No show'))
const nextId = computed(() => `RES-${String(Math.max(920, ...reservations.value.map((item) => Number(item.id.slice(4)) || 0)) + 1).padStart(4, '0')}`)
const detailNights = computed(() => detailDraft.value ? dayDifference(detailDraft.value.checkIn, detailDraft.value.checkOut) : 0)
const detailSubtotal = computed(() => detailDraft.value
  ? detailNights.value * Number(detailDraft.value.rate || 0) + Number(detailDraft.value.otherCharges || 0) + (detailDraft.value.charges || []).filter((charge) => !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted')).reduce((sum, charge) => sum + charge.amount, 0)
  : 0)
const detailTax = computed(() => Math.round(detailSubtotal.value * 0.21 * 100) / 100)
const detailTotal = computed(() => detailSubtotal.value + detailTax.value)
const detailPaid = computed(() => detailDraft.value?.amountPaid ?? (detailDraft.value?.payments || []).reduce((sum, payment) => sum + payment.amount, 0))
const detailDue = computed(() => Math.max(0, Math.round((detailTotal.value - detailPaid.value) * 100) / 100))
const bookingTotal = computed(() => guestDrafts.value.reduce((sum, guest) => sum + Math.round(dayDifference(guest.checkIn, guest.checkOut) * (Number(guest.rate) || 0) * 1.21 * 100) / 100, 0))

function statusClass(status: ReservationStatus) {
  return {
    Pending: 'status-pending', Confirmed: 'status-confirmed', 'In house': 'status-inhouse', 'Checked out': 'status-noshow',
    Clash: 'status-clash', Cancelled: 'status-cancelled', 'No show': 'status-noshow',
  }[status]
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatTime(value: string) {
  const [hour = '0', minute = '00'] = value.split(':')
  const numericHour = Number(hour)
  return `${numericHour % 12 || 12}:${minute} ${numericHour >= 12 ? 'PM' : 'AM'}`
}
function reservationRoomType(reservation: Pick<Reservation, 'roomType' | 'room'>) {
  return reservation.roomType || propertyRooms.value.find((room) => room.number === reservation.room)?.type || roomTypes.value[0] || 'Standard'
}
function activeRoomReservation(reservation: Reservation, excludeId?: string) {
  return reservation.id !== excludeId && !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
}
function hasRoomConflict(roomNumber: string, checkIn: string, checkOut: string, excludeId?: string, additional: GuestDraft[] = []) {
  const existingConflict = reservations.value.some((reservation) => activeRoomReservation(reservation, excludeId)
    && reservation.room === roomNumber && checkIn < reservation.checkOut && checkOut > reservation.checkIn)
  const draftConflict = additional.some((draft) => draft.room === roomNumber && draft.room !== 'Unassigned'
    && checkIn < draft.checkOut && checkOut > draft.checkIn)
  return existingConflict || draftConflict
}
function roomTypeAvailability(roomType: string, checkIn: string, checkOut: string, excludeId?: string, additional: GuestDraft[] = []) {
  const capacity = propertyRooms.value.filter((room) => room.type === roomType && !room.outOfService).length
  if (!capacity || !checkIn || !checkOut || checkOut <= checkIn) return 0
  let peakUse = 0
  const day = new Date(`${checkIn}T12:00:00`)
  const departure = new Date(`${checkOut}T12:00:00`)
  while (day < departure) {
    const date = dateKey(day)
    const existing = reservations.value.filter((reservation) => activeRoomReservation(reservation, excludeId)
      && reservationRoomType(reservation) === roomType && reservation.checkIn <= date && reservation.checkOut > date).length
    const planned = additional.filter((draft) => draft.roomType === roomType && draft.checkIn <= date && draft.checkOut > date).length
    peakUse = Math.max(peakUse, existing + planned)
    day.setDate(day.getDate() + 1)
  }
  return Math.max(0, capacity - peakUse)
}
function compatibleRooms(roomType: string, checkIn: string, checkOut: string, excludeId?: string, keepRoom = '') {
  return propertyRooms.value.filter((room) => room.type === roomType
    && (room.number === keepRoom || (!room.outOfService && !hasRoomConflict(room.number, checkIn, checkOut, excludeId))))
    .map((room) => room.number)
    .sort((a, b) => a.localeCompare(b))
}
function roomOptionsForDraft(draft: GuestDraft, index: number) {
  const priorDrafts = guestDrafts.value.slice(0, index)
  return compatibleRooms(draft.roomType, draft.checkIn, draft.checkOut)
    .filter((room) => !priorDrafts.some((prior) => prior.room === room && draft.checkIn < prior.checkOut && draft.checkOut > prior.checkIn))
}
function focusOnDates(focus: 'Stay dates' | 'Arrivals' | 'Departures') {
  dateFocus.value = focus
  dateMode.value = 'today'
  statusFilter.value = 'All statuses'
}
function setDateMode(mode: 'all' | 'today' | 'specific' | 'range') {
  dateMode.value = mode
  if (mode === 'all') dateFocus.value = 'Stay dates'
}
function monthMove(offset: number) {
  month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1)
}
function setTodayMonth() {
  const date = new Date()
  month.value = new Date(date.getFullYear(), date.getMonth(), 1)
}
function reservationStyle(reservation: Reservation) {
  const first = new Date(month.value.getFullYear(), month.value.getMonth(), 1)
  const last = new Date(month.value.getFullYear(), month.value.getMonth(), daysInMonth.value)
  const checkIn = new Date(`${reservation.checkIn}T00:00:00`)
  const checkOut = new Date(`${reservation.checkOut}T00:00:00`)
  if (checkOut <= first || checkIn > last) return { display: 'none' }
  const start = Math.max(1, Math.floor((checkIn.getTime() - first.getTime()) / 86400000) + 1)
  const end = Math.min(daysInMonth.value + 1, Math.max(start + 1, Math.floor((checkOut.getTime() - first.getTime()) / 86400000) + 1))
  return { gridColumn: `${start + 1} / ${end + 1}`, gridRow: '1' }
}
function openCreate(kind: 'Reservation' | 'Walk-in' | 'Group booking' = 'Reservation') {
  bookingKind.value = kind
  bookingPaymentMode.value = 'Pay later'
  bookingPaymentMethod.value = 'Cash'
  bookingDepositAmount.value = ''
  companyPayer.value = false
  payerName.value = ''
  bookingVip.value = false
  vipHousekeepingNotes.value = ''
  vipComplimentaryItems.value = []
  vipOrderNotes.value = ''
  purpose.value = kind === 'Group booking' ? 'Group' : 'Leisure'
  formError.value = ''
  guestDrafts.value = [newGuestDraft(7), ...(kind === 'Group booking' ? [newGuestDraft(8)] : [])]
  showCreate.value = true
}
function openReservation(reservation: Reservation) {
  const [firstName = '', ...remainingName] = reservation.guest.trim().split(/\s+/)
  detailDraft.value = { ...reservation, firstName: reservation.firstName || firstName, lastName: reservation.lastName || remainingName.join(' '), guestCount: reservation.guestCount ?? 1, cashBasis: reservation.cashBasis ?? reservation.billingType === 'Guest', signingPrivilege: Boolean(reservation.signingPrivilege), vipComplimentaryItems: [...(reservation.vipComplimentaryItems || [])], payments: [...(reservation.payments || [])], charges: reservation.charges ? [...reservation.charges] : undefined }
  detailTab.value = 'Reservation'
  detailError.value = ''
  detailPaymentAmount.value = ''
}
function saveReservationDetails(close = false) {
  const draft = detailDraft.value
  if (!draft) return
  detailError.value = ''
  if (!draft.firstName?.trim() || !draft.lastName?.trim() || !draft.checkIn || !draft.checkOut || draft.checkOut <= draft.checkIn || !draft.arrivalTime || !Number.isFinite(Number(draft.rate)) || Number(draft.rate) < 0) {
    detailError.value = 'Enter first and last names, valid stay dates, arrival time, and a non-negative room rate.'
    return
  }
  if (draft.signingPrivilege && (!draft.signingAuthorizationBy?.trim() || !draft.signingAuthorizationReference?.trim())) {
    detailError.value = 'Enter the sponsoring person and authorization reference before granting signing privilege.'
    return
  }
  if (draft.signingPrivilege) draft.cashBasis = false
  const roomType = reservationRoomType(draft)
  const reservesInventory = !['Cancelled', 'No show', 'Checked out'].includes(draft.status)
  if (draft.room !== 'Unassigned' && propertyRooms.value.find((room) => room.number === draft.room)?.type !== roomType) {
    detailError.value = `Room ${draft.room} does not match the ${roomType} room type.`
    return
  }
  if (reservesInventory && draft.room !== 'Unassigned' && propertyRooms.value.find((room) => room.number === draft.room)?.outOfService) {
    detailError.value = `Room ${draft.room} is out of service. Choose another room or leave it unassigned.`
    return
  }
  if (reservesInventory && draft.room !== 'Unassigned' && hasRoomConflict(draft.room, draft.checkIn, draft.checkOut, draft.id)) {
    detailError.value = `Room ${draft.room} is already assigned for overlapping dates. Choose another room or leave it unassigned.`
    return
  }
  if (reservesInventory && roomTypeAvailability(roomType, draft.checkIn, draft.checkOut, draft.id) < 1) {
    detailError.value = `No ${roomType} rooms are available for those dates.`
    return
  }
  const index = reservations.value.findIndex((reservation) => reservation.id === draft.id)
  const guestName = `${draft.firstName.trim()} ${draft.lastName.trim()}`
  if (index >= 0) {
    reservations.value[index] = { ...draft, guest: guestName, firstName: draft.firstName.trim(), lastName: draft.lastName.trim(), billingPerson: draft.billingType === 'Guest' ? guestName : draft.billingPerson.trim(), companyName: draft.billingType === 'Company' ? draft.billingPerson.trim() : draft.companyName, rate: Number(draft.rate), otherCharges: Number(draft.otherCharges) || 0 }
    syncVipPreparation(reservations.value[index]!)
  }
  if (close) detailDraft.value = null
}
function addDetailPayment() {
  const draft = detailDraft.value
  const amount = Number(detailPaymentAmount.value)
  if (!draft || !Number.isFinite(amount) || amount <= 0 || amount > detailDue.value) {
    detailError.value = 'Enter a payment greater than zero and no more than the amount due.'
    return
  }
  draft.payments = [...(draft.payments || []), { method: detailPaymentMethod.value, amount, receivedAt: new Date().toISOString() }]
  draft.amountPaid = detailPaid.value + amount
  detailPaymentAmount.value = ''
  detailError.value = ''
}
function newGuestDraft(_roomIndex = 7): GuestDraft {
  return { firstName: '', lastName: '', room: 'Unassigned', roomType: roomTypes.value[0] || 'Standard', checkIn: today, arrivalTime: bookingKind.value === 'Walk-in' ? currentTime() : '15:00', checkOut: dayOffset(1), rate: 242 }
}
function addGuest() {
  guestDrafts.value.push(newGuestDraft(7 + guestDrafts.value.length))
}
watch(bookingKind, (kind) => {
  if (kind === 'Group booking' && guestDrafts.value.length === 1) addGuest()
  if (kind !== 'Group booking' && guestDrafts.value.length > 1) guestDrafts.value.splice(1)
  if (kind === 'Group booking') purpose.value = 'Group'
  else if (purpose.value === 'Group') purpose.value = 'Leisure'
  if (kind === 'Walk-in') {
    bookingPaymentMode.value = 'Pay later'
    guestDrafts.value[0]!.checkIn = today
    guestDrafts.value[0]!.arrivalTime = currentTime()
    guestDrafts.value[0]!.checkOut = dayOffset(1)
  }
})

function createReservation() {
  formError.value = ''
  if (!guestDrafts.value.length || guestDrafts.value.some((guest) => !guest.firstName.trim() || !guest.lastName.trim())) {
    formError.value = 'Enter both first and last names for every guest.'
    return
  }
  if (guestDrafts.value.some((guest) => !guest.checkIn || !guest.arrivalTime || !guest.checkOut || guest.checkOut <= guest.checkIn)) {
    formError.value = 'Enter a valid check-in date, arrival time, and check-out date for every guest.'
    return
  }
  if (guestDrafts.value.some((guest) => !Number.isFinite(Number(guest.rate)) || Number(guest.rate) < 0)) {
    formError.value = 'Enter a valid non-negative nightly rate for every guest.'
    return
  }
  if (companyPayer.value && !payerName.value.trim()) {
    formError.value = 'Enter the company or payer name.'
    return
  }

  const paymentAmount = bookingPaymentMode.value === 'Full payment'
    ? bookingTotal.value
    : bookingPaymentMode.value === 'Deposit' ? Number(bookingDepositAmount.value) : 0
  if (bookingPaymentMode.value === 'Deposit' && (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > bookingTotal.value)) {
    formError.value = `Enter a deposit greater than zero and no more than the booking total of ₱${bookingTotal.value.toFixed(2)}.`
    return
  }

  if (bookingKind.value === 'Walk-in' && guestDrafts.value.some((guest) => guest.room === 'Unassigned')) {
    formError.value = 'Assign a physical room to every walk-in before checking them in.'
    return
  }
  const plannedDrafts: GuestDraft[] = []
  for (const draft of guestDrafts.value) {
    if (!draft.roomType || roomTypeAvailability(draft.roomType, draft.checkIn, draft.checkOut, undefined, plannedDrafts) < 1) {
      formError.value = `There are not enough ${draft.roomType || 'selected'} rooms for these dates. Choose another room type or dates.`
      return
    }
    if (draft.room !== 'Unassigned') {
      if (propertyRooms.value.find((room) => room.number === draft.room)?.type !== draft.roomType) {
        formError.value = `Room ${draft.room} does not match the selected ${draft.roomType} room type.`
        return
      }
      if (hasRoomConflict(draft.room, draft.checkIn, draft.checkOut, undefined, plannedDrafts)) {
        formError.value = `Room ${draft.room} is already assigned for overlapping dates. Reassign it or leave the room unassigned.`
        return
      }
    }
    plannedDrafts.push(draft)
  }

  const groupId = bookingKind.value === 'Group booking' ? `GRP-${Date.now().toString().slice(-6)}` : undefined
  const firstIdNumber = Number(nextId.value.slice(4))
  let unallocatedPayment = paymentAmount
  guestDrafts.value.forEach((draft, index) => {
    const status: ReservationStatus = bookingKind.value === 'Walk-in' ? 'In house' : 'Confirmed'
    const guestName = `${draft.firstName.trim()} ${draft.lastName.trim()}`
    const roomTotal = Math.round(dayDifference(draft.checkIn, draft.checkOut) * (Number(draft.rate) || 0) * 1.21 * 100) / 100
    const roomPayment = Math.min(unallocatedPayment, roomTotal)
    unallocatedPayment = Math.max(0, Math.round((unallocatedPayment - roomPayment) * 100) / 100)
    const receivedAt = new Date().toISOString()
    reservations.value.push({
      id: `RES-${String(firstIdNumber + index).padStart(4, '0')}`,
      groupId,
      billingPerson: companyPayer.value ? payerName.value.trim() : guestName,
      billingType: companyPayer.value ? 'Company' : 'Guest',
      companyName: companyPayer.value ? payerName.value.trim() : undefined,
      cashBasis: !companyPayer.value,
      status,
      purpose: purpose.value,
      room: draft.room,
      roomType: draft.roomType,
      checkIn: draft.checkIn,
      arrivalTime: draft.arrivalTime,
      checkOut: draft.checkOut,
      guest: guestName,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      rate: Number(draft.rate) || 0,
      otherCharges: 0,
      amountPaid: roomPayment,
      payments: roomPayment > 0 ? [{ method: bookingPaymentMethod.value, amount: roomPayment, receivedAt }] : [],
      isVip: bookingVip.value,
      vipHousekeepingNotes: bookingVip.value ? vipHousekeepingNotes.value.trim() : undefined,
      vipComplimentaryItems: bookingVip.value ? [...vipComplimentaryItems.value] : [],
      vipOrderNotes: bookingVip.value ? vipOrderNotes.value.trim() : undefined,
    })
    syncVipPreparation(reservations.value[reservations.value.length - 1]!)
  })
  showCreate.value = false
  dateMode.value = 'all'
  dateFocus.value = 'Stay dates'
  statusFilter.value = 'All statuses'
  floorFilter.value = 'All floors'
  billingFilter.value = 'All billing'
  purposeFilter.value = 'All purposes'
  search.value = ''
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <h1 class="mt-2 font-serif text-[32px] font-medium leading-tight tracking-[-0.035em] text-[#30243e] sm:text-[36px]">{{ route.path === '/calendar' ? 'Room calendar' : 'Reservations' }}</h1>
        <p class="mt-2 text-[13px] text-[#748087]">Manage bookings, arrivals, and guest stays.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center rounded-md border border-[#e3e6e1] bg-white p-0.5" role="group" aria-label="Reservation view">
          <button class="view-toggle" :class="viewMode === 'table' ? 'view-toggle-active' : ''" :aria-pressed="viewMode === 'table'" @click="viewMode = 'table'"><List :size="14" /> List</button>
          <button class="view-toggle" :class="viewMode === 'chart' ? 'view-toggle-active' : ''" :aria-pressed="viewMode === 'chart'" @click="viewMode = 'chart'"><ChartNoAxesCombined :size="14" /> Calendar</button>
        </div>
        <button class="reservation-primary" @click="openCreate()"><Plus :size="15" /> New reservation</button>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button class="desk-summary" :class="dateFocus === 'Arrivals' && dateMode === 'today' ? 'desk-summary-active' : ''" :aria-pressed="dateFocus === 'Arrivals' && dateMode === 'today'" @click="focusOnDates('Arrivals')"><span class="desk-summary-label"><i class="size-2 rounded-full bg-[#6b9b75]" /> Arriving today</span><span class="desk-summary-value">{{ arrivalsToday.length }}<span>bookings</span></span></button>
      <button class="desk-summary" :class="dateFocus === 'Departures' && dateMode === 'today' ? 'desk-summary-active' : ''" :aria-pressed="dateFocus === 'Departures' && dateMode === 'today'" @click="focusOnDates('Departures')"><span class="desk-summary-label"><i class="size-2 rounded-full bg-[#b88c4e]" /> Departing today</span><span class="desk-summary-value">{{ departuresToday.length }}<span>bookings</span></span></button>
      <button class="desk-summary" :class="statusFilter === 'In house' ? 'desk-summary-active' : ''" :aria-pressed="statusFilter === 'In house'" @click="statusFilter = statusFilter === 'In house' ? 'All statuses' : 'In house'; dateMode = 'today'; dateFocus = 'Stay dates'"><span class="desk-summary-label"><i class="size-2 rounded-full bg-[#7188a4]" /> Currently staying</span><span class="desk-summary-value">{{ inHouseToday.length }}<span>guests</span></span></button>
    </div>

    <div class="mt-6 overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
      <div class="flex flex-col gap-3 border-b border-[#eceee9] px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="reservation-filters">
          <label class="reservation-search"><Search :size="14" /><span class="sr-only">Search reservations</span><input v-model="search" placeholder="Search guest, room, or booking number" /></label>
          <label><span class="sr-only">Filter by status</span><select v-model="statusFilter" class="reservation-select"><option>All statuses</option><option v-for="status in ['Pending', 'Confirmed', 'In house', 'Checked out', 'Clash', 'Cancelled', 'No show']" :key="status">{{ status }}</option></select></label>
          <button type="button" class="date-mode-button" :aria-expanded="showMoreFilters" @click="showMoreFilters = !showMoreFilters">{{ showMoreFilters ? 'Fewer filters' : 'More filters' }} <ChevronDown :size="12" class="transition-transform" :class="showMoreFilters ? 'rotate-180' : ''" /></button>
          <template v-if="showMoreFilters">
            <label><span class="sr-only">Filter by floor</span><select v-model="floorFilter" class="reservation-select"><option v-for="floor in floorOptions" :key="floor">{{ floor }}</option></select></label>
            <label><span class="sr-only">Filter by purpose</span><select v-model="purposeFilter" class="reservation-select"><option>All purposes</option><option>Leisure</option><option>Business</option><option>Group</option></select></label>
            <label><span class="sr-only">Filter by billing</span><select v-model="billingFilter" class="reservation-select"><option>All billing</option><option>Guest</option><option>Company</option><option>Third party</option></select></label>
          </template>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="mr-1 flex items-center gap-1 text-[10px] text-[#8c9798]"><CalendarDays :size="13" /> {{ dateFocus === 'Arrivals' ? 'Arrival date:' : dateFocus === 'Departures' ? 'Departure date:' : 'Stay date:' }}</span>
          <button v-for="option in ([['all', 'All dates'], ['today', 'Today'], ['specific', 'Choose date'], ['range', 'Date range']] as const)" :key="option[0]" class="date-mode-button" :class="dateMode === option[0] ? 'date-mode-active' : ''" @click="setDateMode(option[0])">{{ option[1] }}</button>
          <label v-if="dateMode === 'specific'" class="date-input-label"><span class="sr-only">Specific reservation date</span><input v-model="specificDate" type="date" class="date-input" /></label>
          <div v-else-if="dateMode === 'range'" class="flex items-center gap-1"><label class="date-input-label"><span class="sr-only">Reservation date range start</span><input v-model="rangeStart" type="date" class="date-input" /></label><span class="text-[10px] text-[#9aa3a2]">to</span><label class="date-input-label"><span class="sr-only">Reservation date range end</span><input v-model="rangeEnd" type="date" class="date-input" /></label></div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eceee9] px-4 py-2.5 sm:px-5"><p class="text-[10px] text-[#929c9b]">{{ filteredReservations.length }} booking{{ filteredReservations.length === 1 ? '' : 's' }} <span class="mx-1">·</span> Choose “View details” to open or edit a booking</p><button v-if="search || statusFilter !== 'All statuses' || floorFilter !== 'All floors' || purposeFilter !== 'All purposes' || billingFilter !== 'All billing' || dateMode !== 'all'" class="text-[10px] font-medium text-[#7047a8] hover:underline" @click="search = ''; statusFilter = 'All statuses'; floorFilter = 'All floors'; purposeFilter = 'All purposes'; billingFilter = 'All billing'; dateMode = 'all'; dateFocus = 'Stay dates'">Clear filters</button></div>

      <div v-if="viewMode === 'table'" class="overflow-x-auto">
        <table class="hidden w-full min-w-[760px] border-collapse text-left md:table">
          <thead><tr class="bg-[#fafbf9]"><th class="reservation-head pl-5">Guest</th><th class="reservation-head">Room</th><th class="reservation-head">Stay dates</th><th class="reservation-head">Status</th><th class="reservation-head pr-5 text-right">Booking details</th></tr></thead>
          <tbody>
            <tr v-for="reservation in filteredReservations" :key="reservation.id" class="reservation-row">
              <td class="reservation-cell pl-5"><span class="font-semibold text-[#46565f]">{{ reservation.guest }}</span><span v-if="reservation.isVip" class="ml-2 rounded-full bg-[#fff3db] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-[#9b6c1e]">VIP</span><span class="mt-0.5 block text-[9px] text-[#929097]">{{ reservation.id }} · {{ reservation.billingType === 'Guest' ? 'Guest pays' : `${reservation.billingType} billing` }}</span></td>
              <td class="reservation-cell"><span class="room-code" :class="reservation.room === 'Unassigned' ? 'text-[#a4acad]' : ''">{{ reservation.room === 'Unassigned' ? `Unassigned · ${reservationRoomType(reservation)}` : `Room ${reservation.room} · ${reservationRoomType(reservation)}` }}</span></td>
              <td class="reservation-cell"><span class="font-medium text-[#5f6d74]">{{ formatDate(reservation.checkIn) }} – {{ formatDate(reservation.checkOut) }}</span><span class="mt-0.5 block text-[9px] text-[#73808a]">Arrives {{ formatTime(reservation.arrivalTime) }} · {{ dayDifference(reservation.checkIn, reservation.checkOut) }} nights</span></td>
              <td class="reservation-cell"><span class="reservation-status" :class="statusClass(reservation.status)">{{ reservation.status }}</span></td>
              <td class="reservation-cell pr-5 text-right"><button class="arrival-action" @click="openReservation(reservation)">View details</button></td>
            </tr>
            <tr v-if="filteredReservations.length === 0"><td colspan="5" class="py-16 text-center"><Search :size="18" class="mx-auto text-[#a1aaa8]" /><p class="mt-3 text-[12px] font-medium text-[#57656c]">No bookings found</p><p class="mt-1 text-[10px] text-[#929c9b]">Try changing your search or filters, or create a new reservation.</p></td></tr>
          </tbody>
        </table>
        <div class="divide-y divide-[#eef0ec] md:hidden">
          <article v-for="reservation in filteredReservations" :key="reservation.id" class="px-4 py-4">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-[13px] font-semibold text-[#46565f]">{{ reservation.guest }}<span v-if="reservation.isVip" class="ml-2 rounded-full bg-[#fff3db] px-1.5 py-0.5 text-[8px] font-semibold uppercase text-[#9b6c1e]">VIP</span></p><p class="mt-1 text-[10px] text-[#929097]">{{ reservation.id }} · {{ reservation.billingType === 'Guest' ? 'Guest pays' : `${reservation.billingType} billing` }}</p></div><span class="reservation-status shrink-0" :class="statusClass(reservation.status)">{{ reservation.status }}</span></div>
            <div class="mt-3 grid grid-cols-2 gap-3 text-[10px]"><div><p class="text-[#929097]">Room / type</p><p class="mt-0.5 font-medium text-[#52616a]">{{ reservation.room === 'Unassigned' ? `Unassigned · ${reservationRoomType(reservation)}` : `Room ${reservation.room} · ${reservationRoomType(reservation)}` }}</p></div><div><p class="text-[#929097]">Stay</p><p class="mt-0.5 font-medium text-[#52616a]">{{ dayDifference(reservation.checkIn, reservation.checkOut) }} nights</p></div><div><p class="text-[#929097]">Arrival</p><p class="mt-0.5 font-medium text-[#52616a]">{{ formatDate(reservation.checkIn) }} · {{ formatTime(reservation.arrivalTime) }}</p></div><div><p class="text-[#929097]">Departure</p><p class="mt-0.5 font-medium text-[#52616a]">{{ formatDate(reservation.checkOut) }}</p></div></div>
            <button class="arrival-action mt-3 w-full" @click="openReservation(reservation)">View booking details</button>
          </article>
          <div v-if="filteredReservations.length === 0" class="px-4 py-12 text-center"><Search :size="18" class="mx-auto text-[#a1aaa8]" /><p class="mt-3 text-[12px] font-medium text-[#57656c]">No bookings found</p><p class="mt-1 text-[10px] text-[#929c9b]">Try changing your search or filters, or create a new reservation.</p></div>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <div class="min-w-[1160px] p-2 sm:p-3">
          <div class="flex items-center justify-between border-b border-[#eceee9] pb-3">
            <div><h2 class="text-[13px] font-semibold text-[#34434a]">{{ monthLabel }}</h2><p class="mt-0.5 text-[9px] text-[#929c9b]">Room occupancy by stay dates</p></div>
            <div class="flex items-center gap-2">
              <div class="hidden items-center gap-3 text-[9px] text-[#77848a] lg:flex"><span class="flex items-center gap-1"><i class="size-2 rounded-full bg-[#e3b24f]" /> Pending</span><span class="flex items-center gap-1"><i class="size-2 rounded-full bg-[#56a477]" /> Confirmed</span><span class="flex items-center gap-1"><i class="size-2 rounded-full bg-[#1877e8]" /> In house</span><span class="flex items-center gap-1"><i class="size-2 rounded-full bg-[#d65375]" /> Clash</span></div>
              <button class="secondary-button" @click="setTodayMonth">Today</button><button class="calendar-arrow" aria-label="Previous month" @click="monthMove(-1)"><ChevronLeft :size="15" /></button><button class="calendar-arrow" aria-label="Next month" @click="monthMove(1)"><ChevronRight :size="15" /></button><input v-model="monthInput" class="month-picker" type="month" aria-label="Chart month" />
            </div>
          </div>
          <div class="reservation-timeline mt-3">
            <div class="timeline-header-row" :style="{ gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(28px, 1fr))` }">
              <div class="timeline-room-header" :style="{ gridColumn: '1', gridRow: '1' }">Room</div>
              <div v-for="day in monthDays" :key="day.key" class="timeline-day" :class="day.key === today ? 'timeline-today' : ''" :style="{ gridColumn: String(day.number + 1), gridRow: '1' }"><span>{{ day.weekday }}</span><b>{{ day.number }}</b></div>
            </div>
            <div v-for="room in chartRooms" :key="room" class="timeline-row" :style="{ gridTemplateColumns: `140px repeat(${daysInMonth}, minmax(28px, 1fr))` }">
              <div class="timeline-room" :style="{ gridColumn: '1', gridRow: '1' }">{{ room }}<span>Floor {{ room[0] }}</span></div>
              <div v-for="day in monthDays" :key="`${room}-${day.key}`" class="timeline-cell" :class="day.key === today ? 'timeline-today' : ''" :style="{ gridColumn: String(day.number + 1), gridRow: '1' }" />
              <button v-for="reservation in visibleChartReservations.filter((item) => item.room === room)" :key="reservation.id" type="button" class="timeline-booking text-left" :class="`booking-${reservation.status.toLowerCase().replaceAll(' ', '-')}`" :style="reservationStyle(reservation)" :title="`${reservation.guest} · ${reservation.checkIn} to ${reservation.checkOut}`" @click="openReservation(reservation)">{{ reservation.guest }}</button>
            </div>
          </div>
          <div v-if="visibleChartReservations.length === 0" class="py-10 text-center text-[10px] text-[#929c9b]">No room stays in this view.</div>
        </div>
      </div>
    </div>
  </section>

  <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
    <section class="reservation-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-form-title">
      <div class="flex items-start justify-between border-b border-[#eceee9] px-5 py-4 sm:px-6">
        <div><p class="eyebrow">Front office · Bookings</p><h2 id="reservation-form-title" class="mt-1 font-serif text-[24px] tracking-[-0.03em] text-[#26353d]">{{ bookingKind === 'Walk-in' ? 'Check in a walk-in' : bookingKind === 'Group booking' ? 'Create group booking' : 'New reservation' }}</h2></div>
        <button class="rounded-md p-1.5 text-[#87918f] hover:bg-[#f1f3ef]" aria-label="Close dialog" @click="showCreate = false"><X :size="17" /></button>
      </div>
      <div class="reservation-form-scroll px-5 py-4 sm:px-6">
        <div class="flex flex-wrap gap-2">
          <button v-for="kind in ['Reservation', 'Walk-in', 'Group booking'] as const" :key="kind" class="booking-kind" :class="bookingKind === kind ? 'booking-kind-active' : ''" @click="bookingKind = kind">{{ kind }}</button>
        </div>
        <div class="mt-5 flex flex-col gap-3 rounded-md border border-[#e7e9e4] bg-[#fbfcfa] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p class="text-[11px] font-semibold text-[#52616a]">Billing</p><p class="mt-0.5 text-[9px] text-[#8d9897]">{{ companyPayer ? 'One payer will cover every guest in this booking.' : 'Personal accounts are Cash Basis by default; each reservation is billed to its guest.' }}</p></div>
          <label class="flex cursor-pointer items-center gap-2 text-[10px] font-medium text-[#657279]"><input v-model="companyPayer" type="checkbox" class="accent-[#7047a8]" /> Bill all to one company</label>
        </div>
        <label v-if="companyPayer" class="form-label mt-3"><Building2 :size="13" class="mr-1 inline" /> Company / payer name<input v-model="payerName" class="form-input" placeholder="Company name or payer" /></label>
        <label class="form-label mt-4">Booking purpose<select v-model="purpose" class="form-input"><option>Leisure</option><option>Business</option><option>Group</option></select></label>

        <section class="mt-4 rounded-lg border border-[#eadfce] bg-[#fffdf8] p-3">
          <label class="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-[#775624]"><input v-model="bookingVip" type="checkbox" class="accent-[#9b6c1e]" /> Mark this reservation as VIP · pre-register guest</label>
          <div v-if="bookingVip" class="mt-3 grid gap-3 border-t border-[#eee5d7] pt-3 sm:grid-cols-2">
            <p class="sm:col-span-2 text-[9px] text-[#8c7b62]">The VIP guest’s name, company, arrival and departure dates will be sent with the setup requests.</p>
            <label class="form-label">Housekeeping setup instructions<textarea v-model="vipHousekeepingNotes" class="form-input min-h-16 py-2" placeholder="VIP amenities, room setup, or special instructions" /></label>
            <fieldset class="rounded-md border border-[#e8e5dc] bg-white p-3"><legend class="px-1 text-[9px] font-medium text-[#627178]">Complimentary order request</legend><label v-for="item in ['Fruit basket', 'Flower arrangement', 'VIP welcome amenity', 'Other amenity']" :key="item" class="flex items-center gap-2 py-1 text-[9px] text-[#627178]"><input v-model="vipComplimentaryItems" type="checkbox" :value="item" class="accent-[#7047a8]" /> {{ item }}</label></fieldset>
            <label class="form-label sm:col-span-2">Order notes / other amenity<textarea v-model="vipOrderNotes" class="form-input min-h-14 py-2" placeholder="Specify the other amenity, delivery timing, or complimentary order notes" /></label>
          </div>
        </section>

        <section v-if="bookingKind !== 'Walk-in'" class="mt-4 rounded-lg border border-[#e7e9e4] bg-[#fbfcfa] p-3">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-[11px] font-semibold text-[#52616a]">Payment at booking</h3><p class="mt-0.5 text-[9px] text-[#8d9897]">Booking total including tax: ₱{{ bookingTotal.toFixed(2) }}. Choose the option required by the rate policy.</p></div><span class="text-[10px] font-semibold text-[#52616a]">Balance due later: ₱{{ Math.max(0, bookingTotal - (bookingPaymentMode === 'Full payment' ? bookingTotal : bookingPaymentMode === 'Deposit' ? Number(bookingDepositAmount) || 0 : 0)).toFixed(2) }}</span></div>
          <div class="mt-3 grid gap-2 sm:grid-cols-3">
            <label class="flex cursor-pointer items-center gap-2 rounded-md border border-[#e5e7e2] bg-white px-3 py-2 text-[10px] text-[#52616a]"><input v-model="bookingPaymentMode" type="radio" value="Pay later" class="accent-[#7047a8]" /> Pay later</label>
            <label class="flex cursor-pointer items-center gap-2 rounded-md border border-[#e5e7e2] bg-white px-3 py-2 text-[10px] text-[#52616a]"><input v-model="bookingPaymentMode" type="radio" value="Deposit" class="accent-[#7047a8]" /> Take a deposit</label>
            <label class="flex cursor-pointer items-center gap-2 rounded-md border border-[#e5e7e2] bg-white px-3 py-2 text-[10px] text-[#52616a]"><input v-model="bookingPaymentMode" type="radio" value="Full payment" class="accent-[#7047a8]" /> Pay in full</label>
          </div>
          <div v-if="bookingPaymentMode !== 'Pay later'" class="mt-3 grid gap-3 sm:grid-cols-2">
            <label v-if="bookingPaymentMode === 'Deposit'" class="form-label">Deposit amount<input v-model="bookingDepositAmount" class="form-input" type="number" min="0.01" :max="bookingTotal" step="0.01" placeholder="Enter deposit amount" /></label>
            <label class="form-label">Payment method<select v-model="bookingPaymentMethod" class="form-input"><option>Cash</option><option>Card</option><option>Bank transfer</option><option>Mobile payment</option></select></label>
          </div>
          <p class="mt-2 text-[9px] text-[#929c9b]">Recorded payments are allocated across the guests’ room folios. Card selection records the payment; it does not charge a card terminal.</p>
        </section>

        <div class="mt-5 flex items-center justify-between"><div><h3 class="text-[12px] font-semibold text-[#35444b]">Guests &amp; room types</h3><p class="mt-0.5 text-[9px] text-[#929c9b]">Book room type inventory now. Assign a specific room here or later at check-in.</p></div><button v-if="bookingKind === 'Group booking'" class="add-guest-button" @click="addGuest"><UserRoundPlus :size="13" /> Add guest</button></div>
        <div class="mt-3 space-y-3">
          <section v-for="(draft, index) in guestDrafts" :key="index" class="guest-draft">
            <div class="mb-3 flex items-center justify-between"><span class="text-[10px] font-semibold text-[#53626a]">{{ bookingKind === 'Group booking' ? `Guest ${index + 1}` : 'Guest' }}</span><button v-if="bookingKind === 'Group booking' && guestDrafts.length > 2" class="text-[9px] text-[#a05d5d] hover:underline" @click="guestDrafts.splice(index, 1)">Remove</button></div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="form-label">First name<input v-model="draft.firstName" class="form-input" autocomplete="given-name" placeholder="First name" /></label>
              <label class="form-label">Last name<input v-model="draft.lastName" class="form-input" autocomplete="family-name" placeholder="Last name" /></label>
              <label class="form-label">Room type<select v-model="draft.roomType" class="form-input" @change="draft.room = 'Unassigned'"><option v-for="roomType in roomTypes" :key="roomType" :value="roomType">{{ roomType }} · {{ roomTypeAvailability(roomType, draft.checkIn, draft.checkOut, undefined, guestDrafts.slice(0, index)) }} available</option></select></label>
              <label class="form-label">Room assignment<select v-model="draft.room" class="form-input"><option value="Unassigned">Assign later</option><option v-for="room in roomOptionsForDraft(draft, index)" :key="room" :value="room">Room {{ room }}</option></select></label>
              <label class="form-label">Check-in date<input v-model="draft.checkIn" type="date" class="form-input" /></label>
              <label class="form-label">Expected arrival time<input v-model="draft.arrivalTime" type="time" class="form-input" /></label>
              <label class="form-label">Check-out<input v-model="draft.checkOut" type="date" class="form-input" /></label>
              <label class="form-label sm:col-span-2">Nightly rate<input v-model.number="draft.rate" type="number" min="0" step="0.01" class="form-input" /></label>
            </div>
          </section>
        </div>
        <p v-if="formError" class="mt-3 flex items-center gap-1.5 text-[10px] text-[#ad5e5b]"><CircleAlert :size="13" />{{ formError }}</p>
      </div>
      <div class="flex justify-between gap-2 border-t border-[#eceee9] px-5 py-4 sm:px-6">
        <p class="self-center text-[9px] text-[#96a09f]">{{ guestDrafts.length }} room{{ guestDrafts.length === 1 ? '' : 's' }} · {{ guestDrafts.filter((guest) => guest.room === 'Unassigned').length }} to assign later · {{ companyPayer ? payerName || 'Company payer' : 'Guest billing' }}</p>
        <div class="flex gap-2"><button class="secondary-button" @click="showCreate = false">Cancel</button><button class="reservation-primary" @click="createReservation"><Check :size="14" /> {{ bookingKind === 'Walk-in' ? 'Check in' : 'Save booking' }}</button></div>
      </div>
    </section>
  </div>

  <div v-if="detailDraft" class="modal-backdrop z-40" @click.self="detailDraft = null">
    <section class="reservation-modal !w-full !max-w-[1180px]" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title">
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-[#eceee9] px-5 py-4 sm:px-6">
        <div>
          <p class="eyebrow">Front office · Reservation #{{ detailDraft.id.replace('RES-', '') }}</p>
          <h2 id="reservation-detail-title" class="mt-1 font-serif text-[25px] tracking-[-0.03em] text-[#26353d]">{{ detailDraft.guest }}</h2>
        </div>
        <div class="flex items-center gap-5 text-[11px] text-[#66747a]">
          <span>Stay length <b class="text-[#7047a8]">{{ detailNights }} nights</b></span>
          <span class="hidden sm:inline">Status <b class="text-[#7047a8]">{{ detailDraft.status }}</b></span>
          <button class="rounded-md p-1.5 text-[#87918f] hover:bg-[#f1f3ef]" aria-label="Close reservation details" @click="detailDraft = null"><X :size="17" /></button>
        </div>
      </header>

      <nav class="flex gap-1 overflow-x-auto border-b border-[#eceee9] px-5 py-2 sm:px-6" aria-label="Reservation details">
        <button v-for="tab in (['Reservation', 'Billing', 'Guest', 'History'] as const)" :key="tab" type="button" class="booking-kind" :class="detailTab === tab ? 'booking-kind-active' : ''" @click="detailTab = tab">{{ tab }}</button>
      </nav>

      <div class="reservation-form-scroll px-5 py-5 sm:px-6">
        <div v-if="detailTab === 'Reservation'" class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section class="overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
            <div class="border-b border-[#eceee9] px-4 py-3"><h3 class="text-[14px] font-semibold text-[#7047a8]">Room selection</h3></div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[900px] text-left">
                <thead class="bg-[#fafbf9]"><tr><th class="reservation-head pl-4">Arrival</th><th class="reservation-head">Nights</th><th class="reservation-head">Departure</th><th class="reservation-head">Room type</th><th class="reservation-head">Room assignment</th><th class="reservation-head">Guests</th><th class="reservation-head">Rate / night</th><th class="reservation-head pr-4">Unit total</th></tr></thead>
                <tbody><tr class="border-t border-[#eceee9]">
                  <td class="p-3"><input v-model="detailDraft.checkIn" class="form-input min-w-[135px]" type="date" aria-label="Arrival date" /></td>
                  <td class="p-3 text-[12px] text-[#53626a]">{{ detailNights }}</td>
                  <td class="p-3"><input v-model="detailDraft.checkOut" class="form-input min-w-[135px]" type="date" aria-label="Departure date" /></td>
                  <td class="p-3"><select v-model="detailDraft.roomType" class="form-input min-w-[130px]" aria-label="Reserved room type" @change="detailDraft.room = 'Unassigned'"><option v-for="roomType in roomTypes" :key="roomType" :value="roomType">{{ roomType }}</option></select></td>
                  <td class="p-3"><select v-model="detailDraft.room" class="form-input min-w-[130px]" aria-label="Assigned room"><option value="Unassigned">Assign later</option><option v-for="room in compatibleRooms(reservationRoomType(detailDraft), detailDraft.checkIn, detailDraft.checkOut, detailDraft.id, detailDraft.room)" :key="room" :value="room">Room {{ room }}</option></select></td>
                  <td class="p-3"><input v-model.number="detailDraft.guestCount" class="form-input w-20" type="number" min="1" aria-label="Number of guests" /></td>
                  <td class="p-3"><input v-model.number="detailDraft.rate" class="form-input w-28" type="number" min="0" step="0.01" aria-label="Nightly rate" /></td>
                  <td class="p-3 pr-4 text-[12px] font-semibold text-[#43515a]">₱{{ (detailNights * Number(detailDraft.rate || 0)).toFixed(2) }}</td>
                </tr></tbody>
              </table>
            </div>
            <div class="grid gap-3 border-t border-[#eceee9] p-4 sm:grid-cols-2">
              <label class="form-label">Expected arrival time<input v-model="detailDraft.arrivalTime" class="form-input" type="time" /></label>
              <label class="form-label">Reservation status<select v-model="detailDraft.status" class="form-input"><option v-for="status in ['Pending', 'Confirmed', 'In house', 'Checked out', 'Cancelled', 'No show']" :key="status">{{ status }}</option></select></label>
            </div>
          </section>

          <aside class="h-fit overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
            <h3 class="bg-[#7047a8] px-4 py-3 text-center text-[13px] font-semibold text-white">Booking summary</h3>
            <div class="space-y-2.5 p-4 text-[11px]">
              <div class="flex justify-between"><span>Room total</span><b>₱{{ (detailNights * Number(detailDraft.rate || 0)).toFixed(2) }}</b></div>
              <label class="flex items-center justify-between gap-3">Extra charges<input v-model.number="detailDraft.otherCharges" class="form-input w-28 text-right" type="number" min="0" step="0.01" /></label>
              <div class="flex justify-between border-t border-[#eceee9] pt-2"><span>Subtotal</span><b>₱{{ detailSubtotal.toFixed(2) }}</b></div>
              <div class="flex justify-between"><span>Tax (21%)</span><b>₱{{ detailTax.toFixed(2) }}</b></div>
              <div class="flex justify-between font-semibold"><span>Total</span><b>₱{{ detailTotal.toFixed(2) }}</b></div>
              <div class="flex justify-between"><span>Total paid</span><b>₱{{ detailPaid.toFixed(2) }}</b></div>
              <div class="flex justify-between border-t border-[#eceee9] pt-2 text-[13px] font-semibold text-[#7047a8]"><span>Amount due</span><b>₱{{ detailDue.toFixed(2) }}</b></div>
              <button class="reservation-primary mt-2 w-full justify-center" @click="detailTab = 'Billing'">Go to billing</button>
            </div>
          </aside>
        </div>

        <div v-else-if="detailTab === 'Billing'" class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section class="rounded-lg border border-[#e5e7e2] bg-white p-4">
            <h3 class="text-[14px] font-semibold text-[#7047a8]">Payment info</h3>
            <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label class="form-label">Payment method<select v-model="detailPaymentMethod" class="form-input"><option>Cash</option><option>Card</option><option>Bank transfer</option><option>Mobile payment</option></select></label>
              <label class="form-label">Amount<input v-model="detailPaymentAmount" class="form-input" type="number" min="0.01" :max="detailDue" step="0.01" placeholder="0.00" /></label>
              <button class="reservation-primary justify-center" @click="addDetailPayment"><Check :size="14" /> Add payment</button>
            </div>
            <div class="mt-5 border-t border-[#eceee9] pt-3">
              <p class="text-[11px] font-semibold text-[#53626a]">Payments received</p>
              <div v-if="detailDraft.payments?.length" class="mt-2 divide-y divide-[#eceee9]">
                <div v-for="(payment, index) in detailDraft.payments" :key="`${payment.receivedAt}-${index}`" class="flex justify-between py-2 text-[11px] text-[#657279]"><span>{{ payment.method }} · {{ new Date(payment.receivedAt).toLocaleDateString('en-SG') }}</span><b>₱{{ payment.amount.toFixed(2) }}</b></div>
              </div>
              <p v-else class="mt-2 text-[11px] text-[#929c9b]">No payments recorded yet.</p>
            </div>
          </section>
          <aside class="h-fit rounded-lg border border-[#e5e7e2] bg-white p-4 text-[11px]">
            <h3 class="mb-3 text-center text-[13px] font-semibold text-[#7047a8]">Booking summary</h3>
            <div class="space-y-2.5"><div class="flex justify-between"><span>Subtotal</span><b>₱{{ detailSubtotal.toFixed(2) }}</b></div><div class="flex justify-between"><span>Tax (21%)</span><b>₱{{ detailTax.toFixed(2) }}</b></div><div class="flex justify-between"><span>Total</span><b>₱{{ detailTotal.toFixed(2) }}</b></div><div class="flex justify-between"><span>Total paid</span><b>₱{{ detailPaid.toFixed(2) }}</b></div><div class="flex justify-between border-t border-[#eceee9] pt-2 text-[13px] font-semibold text-[#7047a8]"><span>Amount due</span><b>₱{{ detailDue.toFixed(2) }}</b></div></div>
          </aside>
        </div>

        <section v-else-if="detailTab === 'Guest'" class="rounded-lg border border-[#e5e7e2] bg-white p-4 sm:p-5">
          <h3 class="text-[14px] font-semibold text-[#7047a8]">Guest info</h3>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="grid gap-3 sm:grid-cols-2"><label class="form-label">First name<input v-model="detailDraft.firstName" class="form-input" autocomplete="given-name" /></label><label class="form-label">Last name<input v-model="detailDraft.lastName" class="form-input" autocomplete="family-name" /></label></div>
            <label class="form-label">Email address<input v-model="detailDraft.guestEmail" class="form-input" type="email" autocomplete="email" /></label>
            <label class="form-label">Phone number<input v-model="detailDraft.guestPhone" class="form-input" type="tel" autocomplete="tel" /></label>
            <label class="form-label">Billing person<input v-model="detailDraft.billingPerson" class="form-input" /></label>
            <label class="form-label">Billing type<select v-model="detailDraft.billingType" class="form-input"><option>Guest</option><option>Company</option><option>Third party</option></select></label>
            <label class="form-label">Booking purpose<select v-model="detailDraft.purpose" class="form-input"><option>Leisure</option><option>Business</option><option>Group</option></select></label>
            <section class="sm:col-span-2 rounded-lg border border-[#eadfce] bg-[#fffdf8] p-3">
              <h4 class="text-[10px] font-semibold text-[#775624]">Account signing controls</h4>
              <div class="mt-2 flex flex-wrap gap-4">
                <label class="flex cursor-pointer items-center gap-2 text-[9px] text-[#66583f]"><input v-model="detailDraft.cashBasis" type="checkbox" class="accent-[#9b6c1e]" /> Cash basis · Personal Account (PA)</label>
                <label class="flex cursor-pointer items-center gap-2 text-[9px] text-[#66583f]"><input v-model="detailDraft.signingPrivilege" type="checkbox" class="accent-[#7047a8]" /> Sponsor authorized this guest to sign</label>
              </div>
              <p class="mt-1.5 text-[8px] text-[#8a7c65]">Cash-basis guests need a separate signing deposit for outlet charges. Company billing only allows signing when the account guarantee is approved.</p>
              <div v-if="detailDraft.signingPrivilege" class="mt-3 grid gap-3 border-t border-[#eee5d7] pt-3 sm:grid-cols-2">
                <label class="form-label">Sponsor / authorizing person<input v-model="detailDraft.signingAuthorizationBy" class="form-input" placeholder="Sponsor name" /></label>
                <label class="form-label">Authorization reference<input v-model="detailDraft.signingAuthorizationReference" class="form-input" placeholder="Approval code or written authorization ref." /></label>
              </div>
              <p class="mt-2 text-[8px] text-[#7b6b51]">Signing deposit held: ₱{{ (detailDraft.cashBasisDepositBalance || 0).toFixed(2) }}. Take or refund it through the Front Desk.</p>
            </section>
            <div class="sm:col-span-2 rounded-lg border border-[#eadfce] bg-[#fffdf8] p-3">
              <label class="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-[#775624]"><input v-model="detailDraft.isVip" type="checkbox" class="accent-[#9b6c1e]" /> VIP · pre-registration required</label>
              <div v-if="detailDraft.isVip" class="mt-3 grid gap-3 border-t border-[#eee5d7] pt-3 sm:grid-cols-2">
                <label class="form-label">Housekeeping setup instructions<textarea v-model="detailDraft.vipHousekeepingNotes" class="form-input min-h-16 py-2" placeholder="VIP amenities, room setup, or special instructions" /></label>
                <fieldset class="rounded-md border border-[#e8e5dc] bg-white p-3"><legend class="px-1 text-[9px] font-medium text-[#627178]">Complimentary order request</legend><label v-for="item in ['Fruit basket', 'Flower arrangement', 'VIP welcome amenity', 'Other amenity']" :key="item" class="flex items-center gap-2 py-1 text-[9px] text-[#627178]"><input v-model="detailDraft.vipComplimentaryItems" type="checkbox" :value="item" class="accent-[#7047a8]" /> {{ item }}</label></fieldset>
                <label class="form-label sm:col-span-2">Order notes / other amenity<textarea v-model="detailDraft.vipOrderNotes" class="form-input min-h-14 py-2" placeholder="Specify the other amenity, delivery timing, or complimentary order notes" /></label>
                <p class="sm:col-span-2 text-[9px] text-[#8c7b62]">Saving updates the shared Housekeeping VIP preparation list and complimentary order request.</p>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="rounded-lg border border-[#e5e7e2] bg-white p-4 sm:p-5">
          <h3 class="text-[14px] font-semibold text-[#7047a8]">Reservation history</h3>
          <div class="mt-4 space-y-3 border-l border-[#e5e7e2] pl-4 text-[11px] text-[#657279]">
            <p><b class="text-[#43515a]">{{ detailDraft.status }}</b> · Current reservation status</p>
            <p><b class="text-[#43515a]">{{ detailDraft.checkIn }}</b> · Scheduled arrival · {{ detailDraft.arrivalTime }}</p>
            <p><b class="text-[#43515a]">{{ detailDraft.checkOut }}</b> · Scheduled departure</p>
          </div>
        </section>

        <p v-if="detailError" class="mt-4 flex items-center gap-1.5 text-[11px] text-[#ad5e5b]"><CircleAlert :size="14" />{{ detailError }}</p>
      </div>

      <footer class="flex flex-wrap justify-end gap-2 border-t border-[#eceee9] px-5 py-4 sm:px-6">
        <button class="secondary-button" @click="detailDraft = null">Cancel</button>
        <button class="reservation-primary" @click="saveReservationDetails()"><Check :size="14" /> Save</button>
        <button class="reservation-primary" @click="saveReservationDetails(true)">Save &amp; close</button>
      </footer>
    </section>
  </div>
</template>
