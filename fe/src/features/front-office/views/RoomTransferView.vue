<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRightLeft, BedDouble, Check, CircleAlert, DoorOpen, Info } from '@lucide/vue'
import { dateKey, housekeepingRooms, reservations } from '@/features/front-office/stores/reservations'

const today = dateKey(new Date())
const roomNumbers = Array.from({ length: 60 }, (_, index) => `${Math.floor(index / 15) + 1}${String((index % 15) + 1).padStart(2, '0')}`)
const roomTypeNames = ['Deluxe King', 'Deluxe Twin', 'Garden Suite', 'Courtyard Studio']
const selectedReservationId = ref('')
const destinationRoom = ref('')
const transferReason = ref('')
const otherReason = ref('')
const transferError = ref('')
const transferNotice = ref('')

const inHouseGuests = computed(() => reservations.value.filter((reservation) => reservation.status === 'In house' && reservation.room !== 'Unassigned'))
const selectedGuest = computed(() => inHouseGuests.value.find((reservation) => reservation.id === selectedReservationId.value) || null)

function roomType(roomNumber: string) {
  const floorIndex = Number(roomNumber.slice(0, 1)) - 1
  const roomIndex = Number(roomNumber.slice(-2)) - 1
  return roomTypeNames[(roomIndex + floorIndex) % roomTypeNames.length] || 'Standard'
}

function demoRoomReservation(roomNumber: string) {
  const floorIndex = Number(roomNumber.slice(0, 1)) - 1
  const roomIndex = Number(roomNumber.slice(-2)) - 1
  if ([4, 9, 14].includes(roomIndex) || roomIndex % 3 !== floorIndex % 3) return null
  const arrival = new Date()
  arrival.setDate(arrival.getDate() + (roomIndex % 5) - 1)
  const departure = new Date(arrival)
  departure.setDate(departure.getDate() + (roomIndex % 3) + 1)
  return { arrival: dateKey(arrival), departure: dateKey(departure) }
}

const vacantRooms = computed(() => roomNumbers.filter((room) => {
  if (!selectedGuest.value || room === selectedGuest.value.room || housekeepingRooms.value.includes(room)) return false
  const roomNumber = Number(room.slice(-2))
  if ([5, 10, 15].includes(roomNumber)) return false
  const roomReservation = demoRoomReservation(room)
  if (roomReservation && selectedGuest.value.checkIn < roomReservation.departure && selectedGuest.value.checkOut > roomReservation.arrival) return false
  return !reservations.value.some((reservation) => reservation.id !== selectedGuest.value?.id
    && reservation.room === room
    && !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
    && selectedGuest.value!.checkIn < reservation.checkOut
    && selectedGuest.value!.checkOut > reservation.checkIn)
}))

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function selectGuest() {
  destinationRoom.value = ''
  transferReason.value = ''
  otherReason.value = ''
  transferError.value = ''
  transferNotice.value = ''
}

function transferGuest() {
  transferError.value = ''
  transferNotice.value = ''
  if (!selectedGuest.value) {
    transferError.value = 'Choose an in-house guest first.'
    return
  }
  if (!destinationRoom.value || !vacantRooms.value.includes(destinationRoom.value)) {
    transferError.value = 'Choose a vacant room for the guest’s full remaining stay.'
    return
  }
  const reason = transferReason.value === 'Other' ? otherReason.value.trim() : transferReason.value
  if (!reason) {
    transferError.value = 'Choose a reason for the room transfer.'
    return
  }

  const oldRoom = selectedGuest.value.room
  const guestName = selectedGuest.value.guest
  selectedGuest.value.roomTransferHistory ||= []
  selectedGuest.value.roomTransferHistory.push({ fromRoom: oldRoom, toRoom: destinationRoom.value, date: today, reason })
  selectedGuest.value.room = destinationRoom.value
  if (!housekeepingRooms.value.includes(oldRoom)) housekeepingRooms.value.push(oldRoom)
  transferNotice.value = `${guestName} has been transferred from room ${oldRoom} to room ${destinationRoom.value}. Room ${oldRoom} is now waiting for housekeeping.`
  selectedReservationId.value = ''
  destinationRoom.value = ''
  transferReason.value = ''
  otherReason.value = ''
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 class="font-serif text-[32px] font-medium leading-tight tracking-[-0.035em] text-[#30243e] sm:text-[36px]">Room transfer</h1>
        <p class="mt-2 text-[12px] text-[#748087]">Move an in-house guest to a vacant room and keep their stay details intact.</p>
      </div>
      <div class="inline-flex items-center gap-2 self-start rounded-md border border-[#e7dfed] bg-[#fffdfb] px-3 py-2 text-[10px] text-[#74647f] sm:self-auto"><BedDouble :size="14" class="text-[#805ca0]" /> {{ inHouseGuests.length }} in-house {{ inHouseGuests.length === 1 ? 'guest' : 'guests' }}</div>
    </div>

    <div v-if="transferNotice" class="mt-5 flex items-start gap-2 rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-4 py-3 text-[11px] text-[#4a7356]"><Check :size="15" class="mt-0.5 shrink-0" /><span>{{ transferNotice }}</span></div>

    <section class="mt-7 max-w-[960px] rounded-lg border border-[#e8e4e9] bg-[#fffdfb] p-4 shadow-[0_2px_8px_rgba(42,32,50,0.035)] sm:p-6">
      <div class="flex items-center gap-2"><div class="flex size-8 items-center justify-center rounded-md bg-[#f2ebf8] text-[#7047a8]"><ArrowRightLeft :size="15" /></div><div><h2 class="text-[13px] font-semibold text-[#3b3045]">Transfer an in-house guest</h2><p class="mt-0.5 text-[9px] text-[#8c858f]">The guest’s dates, charges, and payments stay on the same reservation.</p></div><Info :size="13" class="ml-1 text-[#a398aa]" /></div>

      <label class="form-label mt-5">Guest<select v-model="selectedReservationId" class="form-input h-[46px] bg-[#f6f4f6]" @change="selectGuest"><option value="">Choose an in-house guest</option><option v-for="reservation in inHouseGuests" :key="reservation.id" :value="reservation.id">{{ reservation.guest }} · Room {{ reservation.room }}</option></select></label>

      <div v-if="selectedGuest" class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-[#faf8fb] p-3 sm:grid-cols-4 sm:px-4">
        <div><p class="room-transfer-label">Current room</p><p class="room-transfer-value">{{ selectedGuest.room }}</p></div>
        <div><p class="room-transfer-label">Room type</p><p class="room-transfer-value">{{ roomType(selectedGuest.room) }}</p></div>
        <div><p class="room-transfer-label">Check-in</p><p class="room-transfer-value">{{ formatDate(selectedGuest.checkIn) }}</p></div>
        <div><p class="room-transfer-label">Check-out</p><p class="room-transfer-value">{{ formatDate(selectedGuest.checkOut) }}</p></div>
      </div>

      <label v-if="selectedGuest" class="form-label mt-4">New room<select v-model="destinationRoom" class="form-input h-[46px] bg-[#f6f4f6]"><option value="">Choose a vacant room</option><option v-for="room in vacantRooms" :key="room" :value="room">Room {{ room }} · {{ roomType(room) }}</option></select></label>
      <p v-if="selectedGuest && vacantRooms.length === 0" class="mt-2 text-[10px] text-[#9a6d51]">No vacant, service-ready rooms are available for this guest’s full remaining stay.</p>

      <label v-if="selectedGuest" class="form-label mt-4">Reason<select v-model="transferReason" class="form-input h-[46px] bg-[#f6f4f6]"><option value="">Why is this guest moving?</option><option>Guest request</option><option>Room issue</option><option>Room upgrade</option><option>Operational reason</option><option>Other</option></select></label>
      <label v-if="selectedGuest && transferReason === 'Other'" class="form-label mt-3">Transfer details<input v-model="otherReason" class="form-input" placeholder="Why is the guest moving?" /></label>

      <p v-if="transferError" class="mt-3 flex items-center gap-2 text-[10px] text-[#a25454]"><CircleAlert :size="13" /> {{ transferError }}</p>
      <div v-if="selectedGuest" class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#eee9ef] pt-4"><p class="text-[9px] text-[#8f8993]">The old room will be marked Dirty and added to housekeeping.</p><button class="arrival-action-primary" :disabled="!destinationRoom || !transferReason || (transferReason === 'Other' && !otherReason.trim())" @click="transferGuest"><DoorOpen :size="14" /> Transfer guest</button></div>

      <div v-if="inHouseGuests.length === 0" class="py-10 text-center"><BedDouble :size="20" class="mx-auto text-[#a79aaf]" /><h3 class="mt-3 text-[12px] font-medium text-[#4f4657]">No in-house guests to transfer</h3><p class="mt-1 text-[10px] text-[#8d8791]">Guests appear here after they have checked in at the Desk.</p></div>
    </section>

    <section v-if="reservations.some((reservation) => reservation.roomTransferHistory?.length)" class="mt-6 max-w-[960px] overflow-hidden rounded-lg border border-[#e8e4e9] bg-[#fffdfb]">
      <div class="border-b border-[#eee9ef] px-4 py-3 sm:px-5"><h2 class="text-[12px] font-semibold text-[#44394c]">Recent room transfers</h2></div>
      <div class="divide-y divide-[#f0edf1]">
        <div v-for="reservation in reservations.filter((item) => item.roomTransferHistory?.length)" :key="reservation.id">
          <div v-for="(transfer, index) in [...(reservation.roomTransferHistory || [])].reverse()" :key="`${reservation.id}-${index}`" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[10px] sm:px-5"><span class="font-medium text-[#4e4358]">{{ reservation.guest }}</span><span class="text-[#7e7684]">Room {{ transfer.fromRoom }} <ArrowRightLeft :size="12" class="mx-1 inline text-[#8767a5]" /> Room {{ transfer.toRoom }}</span><span class="text-[#96909a]">{{ formatDate(transfer.date) }} · {{ transfer.reason }}</span></div>
        </div>
      </div>
    </section>
  </section>
</template>
