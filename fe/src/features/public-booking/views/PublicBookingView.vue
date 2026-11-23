<script setup lang="ts">
import { computed, ref, watch, type Component } from 'vue'
import { ArrowRight, BedDouble, CalendarDays, Check, ChevronDown, CircleCheck, Compass, LockKeyhole, Mail, MapPin, Minus, Phone, Plus, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { dateKey, reservations, type Reservation } from '@/features/front-office/stores/reservations'
import { housekeepingRooms, maintenanceRequests } from '@/features/housekeeping/stores/housekeeping'

const today = dateKey(new Date())
function offsetDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return dateKey(date)
}
function nightsBetween(start: string, end: string) {
  return Math.max(0, Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000))
}
function dateLabel(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date'
}

const checkIn = ref(offsetDate(1))
const checkOut = ref(offsetDate(2))
const adults = ref(2)
const children = ref(0)
const searched = ref(false)
const selectedRoomType = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const guestNote = ref('')
const paymentMethod = ref('Card')
const formError = ref('')
const confirmation = ref<Reservation | null>(null)
const route = useRoute()
const router = useRouter()
const isSearchPage = computed(() => route.name === 'public-booking')
const isResultsPage = computed(() => route.name === 'public-booking-rooms')
const isGuestPage = computed(() => route.name === 'public-booking-guest')
const isSuccessPage = computed(() => route.name === 'public-booking-success')

watch(() => route.name, (name) => {
  if (name === 'public-booking-rooms' && !searched.value) router.replace({ name: 'public-booking' })
  else if (name === 'public-booking-guest' && (!searched.value || !selectedRoomType.value)) router.replace({ name: searched.value ? 'public-booking-rooms' : 'public-booking' })
  else if (name === 'public-booking-success' && !confirmation.value) router.replace({ name: 'public-booking' })
  const titles: Record<string, string> = {
    'public-booking': 'Find a room | CTHM Hotel',
    'public-booking-rooms': 'Available rooms | CTHM Hotel',
    'public-booking-guest': 'Guest details | CTHM Hotel',
    'public-booking-success': 'Reservation confirmed | CTHM Hotel',
  }
  document.title = titles[String(name)] || 'Book your stay | CTHM Hotel'
  window.scrollTo({ top: 0 })
}, { immediate: true })

const catalog: Record<string, { rate: number; capacity: number; subtitle: string; description: string; features: string[]; tone: string; icon: Component }> = {
  Standard: { rate: 242, capacity: 2, subtitle: 'A calm, comfortable retreat', description: 'Thoughtfully appointed with everything you need for a restful stay.', features: ['Queen bed', 'Garden outlook', 'Breakfast available'], tone: 'from-[#f4a7bb] via-[#c9a3c7] to-[#684b69]', icon: BedDouble },
  Deluxe: { rate: 423.5, capacity: 3, subtitle: 'More room to settle in', description: 'Extra space to unwind, with warm details and a view over the grounds.', features: ['King bed', 'Seating area', 'Garden view'], tone: 'from-[#e88cab] via-[#9385a1] to-[#4b0050]', icon: Sparkles },
  Executive: { rate: 726, capacity: 4, subtitle: 'A little more room for you', description: 'Our most spacious stay, finished for longer visits and special occasions.', features: ['King bed', 'Lounge corner', 'Priority service'], tone: 'from-[#f389a6] via-[#6e607b] to-[#43104a]', icon: Compass },
}
const roomTypes = computed(() => [...new Set(housekeepingRooms.value.map((room) => room.type))].sort())
const nights = computed(() => nightsBetween(checkIn.value, checkOut.value))
const guestTotal = computed(() => adults.value + children.value)
function roomTypeAvailability(type: string, from: string, to: string) {
  const activeReservations = reservations.value.filter((reservation) => !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
    && (reservation.roomType || housekeepingRooms.value.find((room) => room.number === reservation.room)?.type || 'Standard') === type)
  const capacity = housekeepingRooms.value.filter((room) => room.type === type && !room.outOfService
    && !maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')).length
  let peakBookings = 0
  const cursor = new Date(`${from}T12:00:00`)
  const departure = new Date(`${to}T12:00:00`)
  while (cursor < departure) {
    const date = dateKey(cursor)
    peakBookings = Math.max(peakBookings, activeReservations.filter((reservation) => reservation.checkIn <= date && reservation.checkOut > date).length)
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(0, capacity - peakBookings)
}
const roomChoices = computed(() => roomTypes.value.map((type) => {
  const rate = catalog[type]?.rate ?? 242
  return { ...(catalog[type] || catalog.Standard!), type, available: roomTypeAvailability(type, checkIn.value, checkOut.value), rate, total: Math.round(rate * nights.value * 1.21 * 100) / 100 }
}).filter((room) => room.available > 0 && nights.value > 0))
const selectedChoice = computed(() => roomChoices.value.find((room) => room.type === selectedRoomType.value))
const canSearch = computed(() => Boolean(checkIn.value && checkOut.value && checkOut.value > checkIn.value))

function changeGuests(which: 'adults' | 'children', amount: number) {
  if (which === 'adults') adults.value = Math.max(1, Math.min(6, adults.value + amount))
  else children.value = Math.max(0, Math.min(5, children.value + amount))
}
function searchRooms() {
  formError.value = ''
  selectedRoomType.value = ''
  confirmation.value = null
  if (!canSearch.value) {
    formError.value = 'Choose a check-out date after your check-in date.'
    return
  }
  searched.value = true
  router.push({ name: 'public-booking-rooms' })
}
function selectRoom(roomType: string) {
  selectedRoomType.value = roomType
  formError.value = ''
  router.push({ name: 'public-booking-guest' })
}
function createPublicReservation() {
  formError.value = ''
  if (!selectedChoice.value || selectedChoice.value.available < 1) {
    formError.value = 'That room type is no longer available for these dates. Search again to see current options.'
    searched.value = false
    return
  }
  if (!firstName.value.trim() || !lastName.value.trim() || !email.value.trim() || !phone.value.trim()) {
    formError.value = 'Enter your first name, last name, email address, and phone number.'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    formError.value = 'Enter a valid email address for your confirmation.'
    return
  }
  if (guestTotal.value > selectedChoice.value.capacity) {
    formError.value = `This room type accommodates up to ${selectedChoice.value.capacity} guests. Adjust the guest count or choose another room.`
    return
  }
  if (roomTypeAvailability(selectedRoomType.value, checkIn.value, checkOut.value) < 1) {
    formError.value = 'This room type just sold out for those dates. Please search again.'
    searched.value = false
    return
  }
  const nextId = Math.max(920, ...reservations.value.map((reservation) => Number(reservation.id.replace(/\D/g, '')) || 0)) + 1
  const guestName = `${firstName.value.trim()} ${lastName.value.trim()}`
  const booking: Reservation = {
    id: `RES-${String(nextId).padStart(4, '0')}`,
    billingPerson: guestName,
    billingType: 'Guest',
    status: 'Confirmed',
    purpose: 'Leisure',
    room: 'Unassigned',
    roomType: selectedRoomType.value,
    checkIn: checkIn.value,
    arrivalTime: '15:00',
    checkOut: checkOut.value,
    guest: guestName,
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    guestEmail: email.value.trim(),
    guestPhone: phone.value.trim(),
    rate: selectedChoice.value.rate,
    otherCharges: 0,
    amountPaid: selectedChoice.value.total,
    payments: [{ method: paymentMethod.value, amount: selectedChoice.value.total, receivedAt: new Date().toISOString() }],
    guestCount: guestTotal.value,
    adults: adults.value,
    children: children.value,
    infants: 0,
    numberOfRooms: 1,
    assignmentMethod: 'Automatic',
    roomCapacity: selectedChoice.value.capacity,
    expectedArrivalTime: '15:00',
    ratePlan: 'Standard Rate',
    taxAmount: Math.round(selectedChoice.value.rate * nightsBetween(checkIn.value, checkOut.value) * 0.21 * 100) / 100,
    totalAmount: selectedChoice.value.total,
    paymentOption: 'Pay now',
    paymentStatus: 'Paid',
    depositPaid: selectedChoice.value.total,
    depositPaymentMethod: paymentMethod.value,
    bookingDate: today,
    confirmationNumber: `CTHM-${String(nextId).padStart(4, '0')}`,
    bookingSource: 'Website',
    source: 'Website',
    purposeDetails: guestNote.value.trim() || undefined,
  }
  reservations.value.unshift(booking)
  confirmation.value = booking
  router.push({ name: 'public-booking-success' })
}

function money(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}
</script>

<template>
  <main class="min-h-screen bg-[#fffdfb] text-[#3a103f]">
    <header class="border-b border-[#e9deeb] bg-[#fffdfb]">
      <div class="mx-auto flex max-w-310 items-center justify-between px-5 py-4 sm:px-8">
        <RouterLink to="/book" class="flex items-center gap-3" aria-label="CTHM Hotel home">
          <img src="/cthm_seal.svg" alt="College of Tourism and Hospitality Management seal" class="h-12 w-10 shrink-0 object-contain" style="filter: saturate(.68) brightness(1.02)" />
          <span><span class="block font-serif text-[18px] leading-5 tracking-wide">CTHM Hotel</span><span class="mt-1 block text-[8px] font-semibold uppercase tracking-[0.22em] text-[#797184]">Hotel &amp; Retreat</span></span>
        </RouterLink>
        <nav class="hidden items-center gap-7 text-[11px] text-[#706475] sm:flex">
          <RouterLink to="/book" class="hover:text-[#4b0050]">Rooms</RouterLink>
          <a href="#about" class="hover:text-[#4b0050]">The hotel</a>
          <a href="#contact" class="hover:text-[#4b0050]">Contact</a>
          <RouterLink to="/book" class="rounded-full bg-[#4b0050] px-4 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#36003b]">Book your stay</RouterLink>
        </nav>
      </div>
    </header>

    <section v-if="isSearchPage" class="relative overflow-hidden bg-[#2d0734] text-white">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_78%_24%,rgba(240,68,116,.3),transparent_26%),radial-gradient(ellipse_at_84%_72%,rgba(75,0,80,.42),transparent_34%),linear-gradient(115deg,#2d0734_4%,#54145a_56%,#76517a)]" />
      <div class="absolute -right-16 bottom-0 h-65 w-[75%] rounded-t-[50%] bg-[#210728]/45 blur-[1px] sm:h-90" />
      <div class="relative mx-auto grid max-w-310 items-center gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_300px] lg:py-28">
        <div class="max-w-162.5">
          <p class="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#dda4d3]">A quieter kind of getaway</p>
          <h1 class="mt-5 max-w-155 font-serif text-[42px] leading-[1.06] tracking-[-0.035em] sm:text-[62px]">Make room for a little more <em class="font-normal text-[#f2b3c4]">rest.</em></h1>
          <p class="mt-5 max-w-112.5 text-[13px] leading-6 text-white/75">Find your dates, choose a room that feels right, and leave the details to us.</p>
          <div class="mt-7 flex flex-wrap items-center gap-4 text-[9px] text-white/70"><span class="flex items-center gap-1.5"><MapPin :size="13" class="text-[#f2b3c4]" /> A welcoming stay, every time</span><span class="hidden h-3 w-px bg-white/25 sm:block" /><span class="flex items-center gap-1.5"><ShieldCheck :size="13" class="text-[#dda4d3]" /> Direct booking</span></div>
        </div>
        <div class="hidden min-h-56.25 items-end justify-center lg:flex" aria-hidden="true"><div class="relative flex h-51.25 w-58.75 items-end justify-center"><div class="absolute bottom-0 h-17.5 w-55 rounded-[50%] bg-[#210728]/50 blur-sm" /><div class="absolute bottom-9.5 h-30.5 w-35.5 rounded-t-[70px] bg-linear-to-b from-[#f2b3c4]/80 to-[#9a8aaa]/65" /><div class="absolute bottom-9.5 h-23.5 w-28 rounded-t-[54px] bg-[#63246a]" /><div class="absolute bottom-9.5 h-18 w-14 rounded-t-[28px] bg-[#f04474]/75" /><div class="absolute bottom-9 left-6 h-28 w-4.5 rounded-t-full bg-[#43104a]" /><div class="absolute bottom-9.25 right-5.5 h-35 w-5.75 rounded-t-full bg-[#4b0050]" /><div class="absolute bottom-8.5 right-0.75 h-22.5 w-4.25 rounded-t-full bg-[#54145a]" /></div></div>
      </div>
    </section>

    <section v-if="isSearchPage" id="availability" class="relative z-10 mx-auto -mt-7 max-w-282.5 px-4 sm:px-8">
      <div class="rounded-xl border border-[#ece2ee] bg-white p-4 shadow-[0_15px_50px_rgba(58,16,63,.12)] sm:p-5">
        <div class="mb-3 flex items-center justify-between"><div><p class="text-[11px] font-semibold text-[#3a103f]">Plan your stay</p><p class="mt-1 text-[9px] text-[#89928b]">Choose your dates and guests to see available rooms.</p></div><span class="hidden items-center gap-1 text-[9px] text-[#837b89] sm:flex"><LockKeyhole :size="12" /> Demo booking only</span></div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.15fr_1.15fr_1fr_1fr_auto] lg:items-end">
          <label class="guest-booking-label">Check-in<input v-model="checkIn" type="date" :min="today" /></label>
          <label class="guest-booking-label">Check-out<input v-model="checkOut" type="date" :min="checkIn || today" /></label>
          <div class="guest-booking-label"><span>Adults</span><div class="guest-stepper"><button aria-label="Remove an adult" :disabled="adults <= 1" @click="changeGuests('adults', -1)"><Minus :size="13" /></button><span>{{ adults }}</span><button aria-label="Add an adult" @click="changeGuests('adults', 1)"><Plus :size="13" /></button></div></div>
          <div class="guest-booking-label"><span>Children</span><div class="guest-stepper"><button aria-label="Remove a child" :disabled="children <= 0" @click="changeGuests('children', -1)"><Minus :size="13" /></button><span>{{ children }}</span><button aria-label="Add a child" @click="changeGuests('children', 1)"><Plus :size="13" /></button></div></div>
          <button class="guest-search-button" :disabled="!canSearch" @click="searchRooms"><CalendarDays :size="14" /> Search rooms</button>
        </div>
        <p v-if="!canSearch" class="mt-2 text-[9px] text-[#a44862]">Check-out must be after check-in.</p>
      </div>
    </section>

    <section v-if="isResultsPage && !confirmation" id="rooms" class="mx-auto max-w-282.5 px-4 pb-16 pt-14 sm:px-8">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#995582]">Your room options</p><h2 class="mt-2 font-serif text-[29px] tracking-tight text-[#3a103f]">A good fit for your stay</h2></div><div class="flex items-center gap-3"><p class="text-[10px] text-[#78717f]">{{ dateLabel(checkIn) }} — {{ dateLabel(checkOut) }} <span class="mx-1 text-[#d8cdd8]">·</span> {{ nights }} night{{ nights === 1 ? '' : 's' }} <span class="mx-1 text-[#d8cdd8]">·</span> {{ guestTotal }} guest{{ guestTotal === 1 ? '' : 's' }}</p><button class="guest-outline-button" @click="router.push({ name: 'public-booking' })">Edit search</button></div></div>
      <div v-if="roomChoices.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article v-for="room in roomChoices" :key="room.type" class="overflow-hidden rounded-xl border border-[#e9deeb] bg-white shadow-[0_5px_18px_rgba(58,16,63,.05)]">
          <div class="relative h-44.5 overflow-hidden bg-linear-to-br" :class="room.tone"><div class="absolute inset-0 bg-[linear-gradient(0deg,rgba(42,32,50,.45),transparent_55%)]" /><div class="absolute -right-6 -top-10 size-42.5 rounded-full border border-white/20" /><div class="absolute -right-1 -top-5 size-31.25 rounded-full border border-white/20" /><div class="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4 text-white"><div><p class="text-[8px] font-semibold uppercase tracking-[.2em] text-white/75">CTHM Hotel</p><p class="mt-1 font-serif text-[23px]">{{ room.type }}</p></div><component :is="room.icon" :size="24" :stroke-width="1.3" class="mb-1 text-white/75" /></div></div>
          <div class="p-4"><p class="text-[12px] font-semibold text-[#3a103f]">{{ room.subtitle }}</p><p class="mt-1.5 min-h-9.5 text-[10px] leading-5 text-[#7b7481]">{{ room.description }}</p><div class="mt-3 flex flex-wrap gap-1.5"><span v-for="feature in room.features" :key="feature" class="rounded-full bg-[#f8edf6] px-2.5 py-1 text-[8px] text-[#67556b]">{{ feature }}</span><span class="rounded-full bg-[#f8edf6] px-2.5 py-1 text-[8px] text-[#67556b]">Up to {{ room.capacity }} guests</span></div><div class="mt-4 flex items-end justify-between border-t border-[#e9deeb] pt-3"><div><p class="text-[8px] text-[#8d968e]">From <b class="text-[14px] text-[#a44862]">{{ money(room.rate) }}</b> / night</p><p class="mt-1 text-[8px] text-[#9ba39c]">{{ room.available }} room{{ room.available === 1 ? '' : 's' }} available <span class="mx-1">·</span> total {{ money(room.total) }} incl. tax</p></div><button class="guest-select-room" :disabled="guestTotal > room.capacity" @click="selectRoom(room.type)">{{ guestTotal > room.capacity ? 'Exceeds occupancy' : 'Choose room' }} <ArrowRight v-if="guestTotal <= room.capacity" :size="13" /></button></div></div>
        </article>
      </div>
      <div v-else class="rounded-xl border border-[#e9deeb] bg-white px-6 py-12 text-center"><BedDouble :size="25" class="mx-auto text-[#8a7c96]" /><h3 class="mt-3 font-serif text-[22px] text-[#3a103f]">No rooms available for those dates</h3><p class="mt-2 text-[10px] text-[#847d89]">Try different dates, or contact us and we’ll help find a stay.</p><button class="guest-outline-button mt-4" @click="searched = false">Change dates</button></div>
    </section>

    <section v-if="isGuestPage && selectedChoice && !confirmation" id="guest-details" class="mx-auto grid max-w-282.5 scroll-mt-8 gap-5 px-4 pb-16 pt-10 sm:px-8 lg:grid-cols-[1fr_350px]">
      <div class="rounded-xl border border-[#e9deeb] bg-white p-5 sm:p-7"><button class="mb-4 text-[10px] font-medium text-[#4b0050] underline underline-offset-2" @click="router.push({ name: 'public-booking-rooms' })">← Back to room options</button><p class="text-[9px] font-semibold uppercase tracking-[.2em] text-[#995582]">Almost there</p><h2 class="mt-2 font-serif text-[29px] tracking-tight text-[#3a103f]">Your details</h2><p class="mt-2 text-[10px] text-[#7c7582]">Add your contact details for the reservation.</p><div class="mt-6 grid gap-4 sm:grid-cols-2"><label class="guest-booking-label">First name<input v-model="firstName" autocomplete="given-name" placeholder="First name" /></label><label class="guest-booking-label">Last name<input v-model="lastName" autocomplete="family-name" placeholder="Last name" /></label><label class="guest-booking-label"><span class="flex items-center gap-1"><Mail :size="12" /> Email address</span><input v-model="email" type="email" autocomplete="email" placeholder="you@example.com" /></label><label class="guest-booking-label"><span class="flex items-center gap-1"><Phone :size="12" /> Phone number</span><input v-model="phone" type="tel" autocomplete="tel" placeholder="Your phone number" /></label><label class="guest-booking-label sm:col-span-2">Anything we should know? <span class="font-normal text-[#9ba39c]">Optional</span><textarea v-model="guestNote" rows="3" placeholder="Arrival notes or special requests" /></label></div><p class="mt-4 text-[9px] leading-4 text-[#919990]">Full payment is required to confirm this reservation. This demo records the payment locally only; no real charge is made.</p><p v-if="formError" class="mt-3 rounded-md bg-[#fff1ec] px-3 py-2 text-[10px] text-[#a44862]">{{ formError }}</p><button class="guest-search-button mt-5 w-full sm:w-auto" @click="createPublicReservation"><Check :size="14" /> Pay {{ money(selectedChoice.total) }} &amp; confirm</button></div>
      <aside class="h-fit rounded-xl border border-[#e9deeb] bg-[#f8eff8] p-5"><p class="text-[9px] font-semibold uppercase tracking-[.18em] text-[#995582]">Your stay</p><div class="mt-4 flex items-start justify-between"><div><p class="font-serif text-[22px] text-[#3a103f]">{{ selectedChoice.type }} room</p><p class="mt-1 text-[9px] text-[#78717f]">{{ guestTotal }} guest{{ guestTotal === 1 ? '' : 's' }}</p></div><button class="text-[9px] font-medium text-[#4b0050] underline underline-offset-2" @click="router.push({ name: 'public-booking-rooms' })">Change</button></div><div class="mt-5 grid grid-cols-2 gap-3"><div class="rounded-md bg-white/70 p-3"><p class="flex items-center gap-1 text-[8px] uppercase tracking-wide text-[#909991]"><CalendarDays :size="11" /> Check-in</p><p class="mt-1 text-[10px] font-medium text-[#57315b]">{{ dateLabel(checkIn) }}</p></div><div class="rounded-md bg-white/70 p-3"><p class="flex items-center gap-1 text-[8px] uppercase tracking-wide text-[#909991]"><CalendarDays :size="11" /> Check-out</p><p class="mt-1 text-[10px] font-medium text-[#57315b]">{{ dateLabel(checkOut) }}</p></div></div><div class="mt-5 space-y-2 border-b border-[#ead8e8] pb-4 text-[10px] text-[#736b79]"><div class="flex justify-between"><span>{{ money(selectedChoice.rate) }} × {{ nights }} night{{ nights === 1 ? '' : 's' }}</span><span>{{ money(selectedChoice.rate * nights) }}</span></div><div class="flex justify-between"><span>Tax (21%)</span><span>{{ money(selectedChoice.total - selectedChoice.rate * nights) }}</span></div></div><div class="mt-4 flex items-end justify-between"><span class="text-[10px] text-[#614362]">Full amount due now</span><strong class="font-serif text-[24px] text-[#3a103f]">{{ money(selectedChoice.total) }}</strong></div><div class="mt-5 border-t border-[#ead8e8] pt-4"><p class="text-[9px] font-semibold text-[#5d315e]">Payment method</p><label class="guest-booking-label mt-3">Choose how to pay<select v-model="paymentMethod" class="guest-payment-select"><option>Card</option><option>Mobile money</option><option>Bank transfer</option></select></label><p class="mt-3 text-[8px] leading-4 text-[#8b948c]">Demo only: payment will be recorded locally. No real transaction is processed.</p></div><p class="mt-3 text-[8px] leading-4 text-[#8b948c]">Your room number will be assigned by the front desk.</p></aside>
    </section>

    <section v-if="isSuccessPage && confirmation" class="mx-auto max-w-180 px-4 py-16 sm:px-8 sm:py-24"><div class="rounded-2xl border border-[#e9deeb] bg-white p-7 text-center shadow-[0_10px_40px_rgba(58,16,63,.07)] sm:p-12"><span class="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fae7ec] text-[#4b0050]"><CircleCheck :size="29" /></span><p class="mt-5 text-[9px] font-semibold uppercase tracking-[.21em] text-[#995582]">Reservation received</p><h1 class="mt-3 font-serif text-[34px] tracking-[-.03em] text-[#3a103f]">We’ll be ready for you.</h1><p class="mx-auto mt-3 max-w-107.5 text-[11px] leading-5 text-[#78717f]">Thanks, {{ confirmation.firstName }}. Your stay request is saved in this demo. A real booking site would send confirmation to your email.</p><div class="mx-auto mt-7 max-w-105 rounded-lg bg-[#fff3f6] p-4 text-left"><div class="flex items-center justify-between"><span class="text-[9px] text-[#837b89]">Confirmation number</span><strong class="text-[11px] tracking-wide text-[#3a103f]">{{ confirmation.id }}</strong></div><div class="mt-3 flex items-center justify-between border-t border-[#ead8e8] pt-3"><span class="text-[9px] text-[#837b89]">{{ confirmation.roomType }} room · {{ dateLabel(confirmation.checkIn) }} – {{ dateLabel(confirmation.checkOut) }}</span><strong class="text-[11px] text-[#3a103f]">{{ money((confirmation.rate * nightsBetween(confirmation.checkIn, confirmation.checkOut)) * 1.21) }}</strong></div><div v-if="confirmation.amountPaid" class="mt-2 flex items-center justify-between text-[9px] text-[#4b0050]"><span>Paid locally · {{ confirmation.payments?.[0]?.method }}</span><strong>{{ money(confirmation.amountPaid) }}</strong></div></div><p class="mt-5 flex items-center justify-center gap-1.5 text-[9px] text-[#879188]"><LockKeyhole :size="12" /> {{ confirmation.amountPaid ? 'Demo payment recorded locally. No transaction was processed.' : 'No payment was taken. Pay at the hotel.' }}</p><button class="guest-outline-button mt-6" @click="confirmation = null; searched = false; selectedRoomType = ''; router.push({ name: 'public-booking' })">Make another reservation</button></div></section>

    <section v-if="!isSuccessPage" id="about" class="border-t border-[#ece2ee] bg-[#f8eff8] px-5 py-10 sm:px-8"><div class="mx-auto flex max-w-282.5 flex-col justify-between gap-7 sm:flex-row sm:items-center"><div class="max-w-110"><p class="text-[9px] font-semibold uppercase tracking-[.2em] text-[#995582]">Thoughtful hospitality</p><p class="mt-2 font-serif text-[23px] leading-tight text-[#3a103f]">A warm welcome, from the moment you arrive.</p></div><div class="grid grid-cols-2 gap-5 text-[9px] text-[#78717f]"><span class="flex items-center gap-2"><ShieldCheck :size="15" class="text-[#4b0050]" /> Clear room availability</span><span class="flex items-center gap-2"><UsersRound :size="15" class="text-[#4b0050]" /> Here for every guest</span><span class="flex items-center gap-2"><BedDouble :size="15" class="text-[#4b0050]" /> Comfort for every stay</span><span class="flex items-center gap-2"><ChevronDown :size="15" class="text-[#4b0050]" /> Flexible arrival</span></div></div></section>
    <footer id="contact" class="bg-[#2d0734] px-5 py-7 text-white sm:px-8"><div class="mx-auto flex max-w-282.5 flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p class="font-serif text-[17px]">CTHM Hotel</p><p class="mt-1 text-[8px] uppercase tracking-[.17em] text-white/50">Hotel &amp; Retreat</p></div><p class="text-[9px] text-white/65">Questions about your stay? Contact our reservations team.</p></div></footer>
  </main>
</template>

<style scoped>
.guest-booking-label { display:flex; min-width:0; flex-direction:column; gap:7px; color:#625064; font-size:9px; font-weight:600; }
.guest-booking-label input, .guest-booking-label textarea { width:100%; min-height:42px; border:1px solid #e9deeb; border-radius:7px; background:#fff; padding:0 11px; color:#3a103f; font-size:10px; font-weight:400; outline:none; }
.guest-booking-label select { width:100%; min-height:42px; border:1px solid #e9deeb; border-radius:7px; background:#fff; padding:0 11px; color:#3a103f; font-size:10px; font-weight:400; outline:none; }
.guest-booking-label textarea { padding:10px 11px; resize:vertical; }
.guest-booking-label input:focus, .guest-booking-label textarea:focus, .guest-booking-label select:focus { border-color:#f04474; box-shadow:0 0 0 3px rgb(240 68 116 / 12%); }
.guest-stepper { display:flex; min-height:42px; align-items:center; justify-content:space-between; border:1px solid #e9deeb; border-radius:7px; background:#fff; padding:0 8px; color:#3a103f; font-size:11px; }
.guest-stepper button { display:flex; width:26px; height:26px; align-items:center; justify-content:center; border-radius:5px; padding:5px; color:#4b0050; }
.guest-stepper button:hover:not(:disabled) { background:#fae7ec; }
.guest-stepper button:disabled { cursor:not-allowed; opacity:.35; }
.guest-search-button { display:inline-flex; min-height:42px; align-items:center; justify-content:center; gap:8px; border:0; border-radius:7px; background:#f04474; padding:0 18px; color:#fff; font-size:10px; font-weight:600; transition:background .16s ease; }
.guest-search-button:hover:not(:disabled) { background:#d52f60; }
.guest-search-button:disabled { cursor:not-allowed; opacity:.45; }
.guest-select-room { display:inline-flex; align-items:center; gap:7px; border-radius:6px; background:#4b0050; padding:9px 11px; color:white; font-size:9px; font-weight:600; transition:background .15s ease; }
.guest-select-room:hover { background:#36003b; }
.guest-outline-button { min-height:38px; border:1px solid #e5c5ce; border-radius:7px; background:#fff; padding:0 15px; color:#a44862; font-size:10px; font-weight:600; }
.guest-outline-button:hover { background:#fae7ec; }
</style>
