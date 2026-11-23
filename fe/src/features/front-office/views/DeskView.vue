<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarDays, Check, CircleAlert, Clock3, Plus, Printer, Search, UsersRound, X } from '@lucide/vue'
import { applyCashBasisDepositToCharge, canSignOutletCharge, dateKey, dayOffset, hasSponsorSigningAuthorization, housekeepingCleaningRooms, housekeepingReadyRooms, housekeepingRooms, isCashBasisReservation, outletChargeTotal, reservations, syncVipPreparation, type Reservation } from '@/features/front-office/stores/reservations'
import { housekeepingRooms as floorRooms, maintenanceRequests } from '@/features/housekeeping/stores/housekeeping'

type DateMode = 'all' | 'today' | 'specific' | 'range'
type DeskFilter = 'All' | 'Check-in' | 'In-house' | 'Check-out'
type PaymentGuarantee = '' | 'Deposit received' | 'Card pre-authorized' | 'Company account' | 'Not required'

const today = dateKey(new Date())
const dateMode = ref<DateMode>('today')
const specificDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const statusFilter = ref<DeskFilter>('All')
const search = ref('')
const selectedArrival = ref<Reservation | null>(null)
const roomNumbers = Array.from({ length: 60 }, (_, index) => `${Math.floor(index / 15) + 1}${String((index % 15) + 1).padStart(2, '0')}`)
function reservationRoomType(reservation: Reservation) {
  return reservation.roomType || floorRooms.value.find((room) => room.number === reservation.room)?.type || 'Standard'
}
const showWalkInForm = ref(false)
const walkInTab = ref<'Summary / Print' | 'Guest & stay' | 'Additional'>('Guest & stay')
const walkInGuestSearch = ref('')
const walkInFirstName = ref('')
const walkInLastName = ref('')
const walkInAdditionalFirstName = ref('')
const walkInAdditionalLastName = ref('')
const walkInGuests = ref<string[]>([])
const walkInPrimaryName = computed(() => `${walkInFirstName.value.trim()} ${walkInLastName.value.trim()}`.trim())
const walkInRoom = ref('')
const walkInCheckOut = ref('')
const walkInRate = ref('242')
const walkInThirdParty = ref(false)
const walkInPayer = ref('')
const walkInPurpose = ref<'Leisure' | 'Business' | 'Group'>('Leisure')
const walkInPurposeDetails = ref('')
const walkInSource = ref('Walk-in')
const walkInTaxExempt = ref(false)
const walkInTaxExemptionRef = ref('')
const walkInError = ref('')
const roomDraft = ref('')
const roomConfirmed = ref(false)
const roomReadyConfirmed = ref(false)
const roomError = ref('')
const identityType = ref<'Passport' | 'National ID' | 'Driver’s license' | 'Other' | ''>('')
const identityVerified = ref(false)
const paymentGuarantee = ref<PaymentGuarantee>('')
const guaranteeReference = ref('')
const keyIssued = ref(false)
const paymentMethod = ref('Card')
const paymentAmount = ref('')
const paymentError = ref('')
const signingDepositAmount = ref('')
const signingDepositMethod = ref('Cash')
const signingDepositError = ref('')
const registrationPrinted = ref(false)
const registrationSigned = ref(false)
const deskNotice = ref('')
const leaveBalanceOnAccount = ref(false)
const showChargeForm = ref(false)
const chargeDescription = ref('Restaurant - Dinner')
const chargeAmount = ref('')
const chargeError = ref('')
const discountAmount = ref('')
const discountReason = ref('')
const discountError = ref('')
const showDiscountForm = ref(false)
const extensionError = ref('')
const showWakeUpForm = ref(false)
const wakeUpDate = ref(today)
const wakeUpTime = ref('07:00')
const wakeUpNote = ref('')
const wakeUpError = ref('')
const showCheckoutConfirm = ref(false)
const checkoutError = ref('')
const vatRate = 0.21

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

function isActive(reservation: Reservation) {
  return !['Cancelled', 'No show'].includes(reservation.status)
}
function arrivalStatus(reservation: Reservation) {
  if (reservation.status === 'Checked out') return 'Checked out'
  if (reservation.status === 'Cancelled' || reservation.status === 'No show' || reservation.status === 'Clash') return reservation.status
  if (reservation.status === 'In house' || (reservation.checkIn < today && reservation.checkOut > today)) return 'In house'
  if (reservation.checkIn === today) return 'Arriving'
  if (reservation.checkOut === today) return 'Check-out'
  return reservation.status === 'Pending' ? 'Pending' : 'Expected'
}
function actionLabel(reservation: Reservation) {
  const status = arrivalStatus(reservation)
  if (status === 'In house') return 'Manage stay'
  if (status === 'Checked out' || status === 'Cancelled' || status === 'No show') return 'View booking'
  if (status === 'Clash') return 'Review booking'
  return reservation.checkIn <= today ? 'Start check-in' : 'View booking'
}
function statusClass(status: string) {
  return {
    Arriving: 'status-confirmed', Expected: 'status-pending', 'In house': 'status-inhouse',
    'Check-out': 'status-noshow', 'Checked out': 'status-noshow', Clash: 'status-clash', Cancelled: 'status-cancelled',
    'No show': 'status-noshow', Pending: 'status-pending',
  }[status] || 'status-noshow'
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(value: string) {
  const [hour = '0', minute = '00'] = value.split(':')
  const h = Number(hour)
  return `${String(h % 12 || 12).padStart(2, '0')}:${minute} ${h >= 12 ? 'PM' : 'AM'}`
}
function nightCount(reservation: Reservation) {
  const nights = Math.round((new Date(`${reservation.checkOut}T00:00:00`).getTime() - new Date(`${reservation.checkIn}T00:00:00`).getTime()) / 86400000)
  return Math.max(1, nights)
}
const postedChargeTotal = computed(() => (selectedArrival.value?.charges || []).filter((charge) => !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted')).reduce((total, charge) => total + charge.amount, 0))
const currentDiscount = computed(() => selectedArrival.value?.discount?.amount || 0)
const roomRentTotal = computed(() => selectedArrival.value?.roomCharges ? selectedArrival.value.roomCharges.filter((charge) => !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted')).reduce((sum, charge) => sum + charge.amount, 0) : selectedArrival.value ? nightCount(selectedArrival.value) * selectedArrival.value.rate : 0)
const staySubtotal = computed(() => selectedArrival.value ? Math.max(0, roomRentTotal.value + selectedArrival.value.otherCharges + postedChargeTotal.value - currentDiscount.value) : 0)
const effectiveVatRate = computed(() => selectedArrival.value?.taxExempt ? 0 : vatRate)
const vatAmount = computed(() => Math.round(staySubtotal.value * effectiveVatRate.value * 100) / 100)
const stayTotal = computed(() => staySubtotal.value + vatAmount.value)
const totalPaid = computed(() => Math.round((selectedArrival.value?.amountPaid || 0) * 100) / 100)
const outstanding = computed(() => Math.max(0, Math.round((stayTotal.value - totalPaid.value) * 100) / 100))
const selectedInHouse = computed(() => Boolean(selectedArrival.value && arrivalStatus(selectedArrival.value) === 'In house'))
const existingGuestSuggestions = computed(() => {
  const query = walkInGuestSearch.value.trim().toLowerCase()
  if (!query) return []
  return [...new Set(reservations.value.flatMap((reservation) => [reservation.guest, ...(reservation.additionalGuests || [])]))]
    .filter((guest) => guest.toLowerCase().includes(query) && guest.toLowerCase() !== walkInPrimaryName.value.toLowerCase() && !walkInGuests.value.some((added) => added.toLowerCase() === guest.toLowerCase()))
    .slice(0, 5)
})
const availableWalkInRooms = computed(() => roomNumbers.filter((room) => {
  return roomOperationalStatus(room) === 'Available' && !hasRoomConflict(room, today, walkInCheckOut.value)
}))
const walkInRoomConflict = computed(() => !walkInRoom.value || !availableWalkInRooms.value.includes(walkInRoom.value))
const walkInNights = computed(() => Math.max(1, Math.round((new Date(`${walkInCheckOut.value || dayOffset(1)}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)))
const walkInSubtotal = computed(() => Math.max(0, Number(walkInRate.value) || 0) * walkInNights.value)
const walkInVat = computed(() => walkInTaxExempt.value ? 0 : Math.round(walkInSubtotal.value * vatRate * 100) / 100)
const roomConflict = computed(() => Boolean(selectedArrival.value && roomDraft.value && hasRoomConflict(roomDraft.value, selectedArrival.value.checkIn, selectedArrival.value.checkOut, selectedArrival.value.id)))
const guaranteeConfirmed = computed(() => {
  if (!paymentGuarantee.value) return false
  if (paymentGuarantee.value === 'Deposit received') return totalPaid.value > 0
  if (paymentGuarantee.value === 'Card pre-authorized') return guaranteeReference.value.trim().length > 0
  if (paymentGuarantee.value === 'Company account') return selectedArrival.value?.billingType === 'Company'
  return true
})
const canApproveCompanyBalance = computed(() => Boolean(selectedArrival.value
  && selectedArrival.value.billingType === 'Company'
  && paymentGuarantee.value === 'Company account'))
watch(canApproveCompanyBalance, (canApprove) => {
  if (!canApprove) leaveBalanceOnAccount.value = false
})
const canCheckoutWithBalance = computed(() => Boolean(selectedArrival.value
  && selectedArrival.value.billingType === 'Company'
  && selectedArrival.value.paymentGuarantee === 'Company account'
  && selectedArrival.value.balanceOnAccount))
const checkoutAllowed = computed(() => outstanding.value <= 0.005 || canCheckoutWithBalance.value)
const selectedRoomStatus = computed(() => roomOperationalStatus(roomDraft.value))
const selectedRoomReady = computed(() => Boolean(selectedArrival.value && roomDraft.value && selectedRoomStatus.value === 'Available' && !roomConflict.value))
const canCheckIn = computed(() => Boolean(selectedArrival.value && !selectedInHouse.value && selectedArrival.value.checkIn <= today && roomConfirmed.value && roomReadyConfirmed.value && selectedRoomReady.value && identityVerified.value && identityType.value && guaranteeConfirmed.value && registrationSigned.value && keyIssued.value && !['Cancelled', 'No show', 'Clash', 'In house'].includes(selectedArrival.value.status)))

function roomOperationalStatus(roomNumber: string) {
  if (!roomNumber || roomNumber === 'Unassigned') return 'Room not assigned'
  const room = floorRooms.value.find((item) => item.number === roomNumber)
  if (selectedArrival.value && room && room.type !== reservationRoomType(selectedArrival.value)) return 'Different room type'
  if (maintenanceRequests.value.some((request) => request.room === roomNumber && request.status !== 'Completed')) return 'Out of service'
  if (!room) return 'Status unavailable'
  if (room.outOfService) return 'Out of service'
  if (room.occupancy === 'Occupied') return 'Occupied'
  if (room.taskState === 'Inspection') return 'Awaiting inspection'
  if (room.taskState === 'Cleaning') return 'Being cleaned'
  if (room.taskState === 'Dirty') return 'Needs cleaning'
  return 'Available'
}
function hasRoomConflict(roomNumber: string, checkIn: string, checkOut: string, excludeReservationId?: string) {
  return reservations.value.some((reservation) => reservation.id !== excludeReservationId
    && reservation.room === roomNumber && !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
    && checkIn < reservation.checkOut && checkOut > reservation.checkIn)
}
function roomCanBeAssigned(roomNumber: string) {
  if (!selectedArrival.value) return false
  const room = floorRooms.value.find((item) => item.number === roomNumber)
  if (!room || room.type !== reservationRoomType(selectedArrival.value)) return false
  if (roomOperationalStatus(roomNumber) !== 'Available') return false
  return Boolean(selectedArrival.value && !hasRoomConflict(roomNumber, selectedArrival.value.checkIn, selectedArrival.value.checkOut, selectedArrival.value.id))
}
const checkInReadinessMessage = computed(() => {
  if (!roomConfirmed.value || !roomReadyConfirmed.value || !selectedRoomReady.value) return 'Confirm an available, clean room for this guest.'
  if (!identityVerified.value || !identityType.value) return 'Verify the guest’s ID.'
  if (!guaranteeConfirmed.value) return 'Confirm the deposit or payment guarantee.'
  if (!registrationSigned.value) return 'Print and confirm the signed registration card.'
  if (!keyIssued.value) return 'Issue the room key.'
  return 'Ready to check in.'
})

function openArrival(reservation: Reservation) {
  selectedArrival.value = reservation
  roomDraft.value = reservation.room === 'Unassigned'
    ? roomNumbers.find((room) => floorRooms.value.find((item) => item.number === room)?.type === reservationRoomType(reservation)
      && roomOperationalStatus(room) === 'Available'
      && !hasRoomConflict(room, reservation.checkIn, reservation.checkOut, reservation.id)) || ''
    : reservation.room
  roomConfirmed.value = false
  roomReadyConfirmed.value = false
  roomError.value = ''
  identityType.value = reservation.identityType || ''
  identityVerified.value = Boolean(reservation.identityVerified)
  paymentGuarantee.value = reservation.paymentGuarantee || ''
  guaranteeReference.value = reservation.paymentGuaranteeReference || ''
  keyIssued.value = Boolean(reservation.keyIssued)
  paymentError.value = ''
  signingDepositAmount.value = ''
  signingDepositMethod.value = 'Cash'
  signingDepositError.value = ''
  paymentAmount.value = outstanding.value.toFixed(2)
  paymentMethod.value = 'Card'
  registrationPrinted.value = false
  registrationSigned.value = false
  leaveBalanceOnAccount.value = false
  showChargeForm.value = false
  chargeAmount.value = ''
  chargeError.value = ''
  discountAmount.value = selectedArrival.value.discount?.amount.toFixed(2) || ''
  discountReason.value = selectedArrival.value.discount?.reason || ''
  discountError.value = ''
  showDiscountForm.value = false
  extensionError.value = ''
  showWakeUpForm.value = false
  showCheckoutConfirm.value = false
  checkoutError.value = ''
  wakeUpDate.value = today
  wakeUpTime.value = '07:00'
  wakeUpNote.value = ''
  wakeUpError.value = ''
}
function openWalkIn() {
  walkInTab.value = 'Guest & stay'
  walkInGuestSearch.value = ''
  walkInFirstName.value = ''
  walkInLastName.value = ''
  walkInAdditionalFirstName.value = ''
  walkInAdditionalLastName.value = ''
  walkInGuests.value = []
  walkInCheckOut.value = dayOffset(1)
  walkInRate.value = '242'
  walkInThirdParty.value = false
  walkInPayer.value = ''
  walkInPurpose.value = 'Leisure'
  walkInPurposeDetails.value = ''
  walkInSource.value = 'Walk-in'
  walkInTaxExempt.value = false
  walkInTaxExemptionRef.value = ''
  walkInError.value = ''
  walkInRoom.value = availableWalkInRooms.value[0] || ''
  showWalkInForm.value = true
}
function addWalkInGuest(name: string) {
  const guest = name.trim()
  if (!guest || guest.toLowerCase() === walkInPrimaryName.value.toLowerCase() || walkInGuests.value.some((added) => added.toLowerCase() === guest.toLowerCase())) return
  walkInGuests.value.push(guest)
  walkInGuestSearch.value = ''
  walkInError.value = ''
}
function addNewWalkInGuest() {
  const firstName = walkInAdditionalFirstName.value.trim()
  const lastName = walkInAdditionalLastName.value.trim()
  if (!firstName || !lastName) {
    walkInError.value = 'Enter both first and last names for the additional guest.'
    return
  }
  addWalkInGuest(`${firstName} ${lastName}`)
  walkInAdditionalFirstName.value = ''
  walkInAdditionalLastName.value = ''
}
function removeWalkInGuest(index: number) {
  walkInGuests.value.splice(index, 1)
}
function createWalkIn() {
  walkInError.value = ''
  const guest = walkInPrimaryName.value
  const rate = Number(walkInRate.value)
  if (!walkInFirstName.value.trim() || !walkInLastName.value.trim() || !walkInCheckOut.value || walkInCheckOut.value <= today || !Number.isFinite(rate) || rate <= 0) {
    walkInError.value = 'Enter the guest’s first and last names, choose a future check-out date, and enter a valid nightly rate.'
    return
  }
  if (walkInThirdParty.value && !walkInPayer.value.trim()) {
    walkInError.value = 'Enter the third-party payer name.'
    return
  }
  if (walkInTaxExempt.value && !walkInTaxExemptionRef.value.trim()) {
    walkInError.value = 'Enter the tax exemption reference before applying an exemption.'
    return
  }
  if (walkInRoomConflict.value) {
    walkInError.value = 'Choose a room that is available for these dates.'
    return
  }
  const nextId = Math.max(920, ...reservations.value.map((reservation) => Number(reservation.id.replace(/\D/g, '')) || 0)) + 1
  const arrivalTime = new Date().toTimeString().slice(0, 5)
  const walkIn: Reservation = {
    id: `RES-${String(nextId).padStart(4, '0')}`,
    billingPerson: walkInThirdParty.value ? walkInPayer.value.trim() : guest,
    billingType: walkInThirdParty.value ? 'Third party' : 'Guest',
    status: 'Confirmed',
    purpose: walkInPurpose.value,
    room: walkInRoom.value,
    roomType: floorRooms.value.find((room) => room.number === walkInRoom.value)?.type || 'Standard',
    checkIn: today,
    arrivalTime,
    checkOut: walkInCheckOut.value,
    guest,
    firstName: walkInFirstName.value.trim(),
    lastName: walkInLastName.value.trim(),
    rate,
    otherCharges: 0,
    amountPaid: 0,
    additionalGuests: [...walkInGuests.value],
    guestCount: 1 + walkInGuests.value.length,
    purposeDetails: walkInPurposeDetails.value.trim() || undefined,
    source: walkInSource.value,
    taxExempt: walkInTaxExempt.value,
    taxExemptionRef: walkInTaxExempt.value ? walkInTaxExemptionRef.value.trim() : undefined,
  }
  reservations.value.unshift(walkIn)
  showWalkInForm.value = false
  openArrival(walkIn)
  roomConfirmed.value = true
  roomReadyConfirmed.value = true
}
function confirmRoom() {
  roomError.value = ''
  if (!selectedArrival.value || !roomDraft.value) {
    roomError.value = 'Choose a room before confirming the assignment.'
    return
  }
  if (roomConflict.value) {
    roomError.value = 'This room is already assigned for overlapping dates. Choose another room.'
    return
  }
  if (floorRooms.value.find((room) => room.number === roomDraft.value)?.type !== reservationRoomType(selectedArrival.value)) {
    roomError.value = `Choose a ${reservationRoomType(selectedArrival.value)} room for this reservation.`
    return
  }
  if (!selectedRoomReady.value) {
    roomError.value = `Room ${roomDraft.value} is ${selectedRoomStatus.value.toLowerCase()}. Choose a room marked available after housekeeping.`
    return
  }
  selectedArrival.value.room = roomDraft.value
  syncVipPreparation(selectedArrival.value)
  if (selectedArrival.value.status === 'Clash') selectedArrival.value.status = 'Confirmed'
  roomConfirmed.value = true
}
function takePayment() {
  paymentError.value = ''
  const amount = Number(paymentAmount.value)
  if (!selectedArrival.value || !Number.isFinite(amount) || amount <= 0) {
    paymentError.value = 'Enter a payment amount greater than zero.'
    return
  }
  if (Math.round(amount * 100) > Math.round(outstanding.value * 100)) {
    paymentError.value = 'Payment cannot exceed the outstanding balance.'
    return
  }
  selectedArrival.value.amountPaid = totalPaid.value + amount
  selectedArrival.value.payments ||= []
  selectedArrival.value.payments.push({ method: paymentMethod.value, amount, receivedAt: new Date().toISOString() })
  paymentAmount.value = outstanding.value.toFixed(2)
  if (showCheckoutConfirm.value && outstanding.value <= 0.005) checkoutError.value = ''
}
function takeSigningDeposit() {
  signingDepositError.value = ''
  const reservation = selectedArrival.value
  const amount = Math.round(Number(signingDepositAmount.value) * 100) / 100
  if (!reservation || !isCashBasisReservation(reservation)) {
    signingDepositError.value = 'Signing deposits are only recorded for cash-basis reservations.'
    return
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    signingDepositError.value = 'Enter a signing deposit greater than zero.'
    return
  }
  reservation.cashBasisDepositBalance = Math.round(((reservation.cashBasisDepositBalance || 0) + amount) * 100) / 100
  reservation.cashBasisDepositReceipts ||= []
  reservation.cashBasisDepositReceipts.push({ amount, method: signingDepositMethod.value, receivedAt: new Date().toISOString() })
  reservation.cashBasisDepositAlert = undefined
  signingDepositAmount.value = ''
}
function addNight() {
  if (!selectedArrival.value || !selectedInHouse.value) return
  const currentCheckout = selectedArrival.value.checkOut
  const newCheckout = new Date(`${currentCheckout}T12:00:00`)
  newCheckout.setDate(newCheckout.getDate() + 1)
  const proposedCheckout = dateKey(newCheckout)
  const nextStay = reservations.value.find((reservation) => reservation.id !== selectedArrival.value?.id
    && reservation.room === selectedArrival.value?.room
    && !['Cancelled', 'No show'].includes(reservation.status)
    && selectedArrival.value!.checkOut < reservation.checkOut
    && proposedCheckout > reservation.checkIn)
  if (nextStay) {
    extensionError.value = `Room ${selectedArrival.value.room} is assigned to ${nextStay.guest} from ${formatDate(nextStay.checkIn)}.`
    return
  }
  extensionError.value = ''
  if (selectedArrival.value.roomCharges) selectedArrival.value.roomCharges.push({ id: `ROOM-EXT-${Date.now().toString(36).toUpperCase()}`, description: 'Room charge · extended night', date: currentCheckout, amount: selectedArrival.value.rate, status: 'Posted' })
  selectedArrival.value.checkOut = proposedCheckout
}
function postCharge() {
  chargeError.value = ''
  const amount = Number(chargeAmount.value)
  if (!selectedArrival.value || !chargeDescription.value.trim() || !Number.isFinite(amount) || amount <= 0) {
    chargeError.value = 'Enter a charge description and amount greater than zero.'
    return
  }
  const chargeTotal = outletChargeTotal(selectedArrival.value, amount)
  if (!canSignOutletCharge(selectedArrival.value, chargeTotal)) {
    selectedArrival.value.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, chargeTotal - (selectedArrival.value.cashBasisDepositBalance || 0)).toFixed(2)} required for this outlet charge including tax.`
    chargeError.value = 'This guest cannot sign the charge. Collect a signing deposit or record sponsor authorization first.'
    return
  }
  if (isCashBasisReservation(selectedArrival.value) && !hasSponsorSigningAuthorization(selectedArrival.value)
    && !applyCashBasisDepositToCharge(selectedArrival.value, chargeTotal)) {
    chargeError.value = 'The signing deposit could not be applied. Collect another deposit before posting.'
    return
  }
  selectedArrival.value.charges ||= []
  selectedArrival.value.charges.push({ description: chargeDescription.value.trim(), date: today, amount })
  chargeAmount.value = ''
  showChargeForm.value = false
}
function applyDiscount() {
  discountError.value = ''
  const amount = Number(discountAmount.value)
  const gross = selectedArrival.value ? nightCount(selectedArrival.value) * selectedArrival.value.rate + selectedArrival.value.otherCharges + postedChargeTotal.value : 0
  if (!selectedArrival.value || !Number.isFinite(amount) || amount <= 0 || amount > gross - totalPaid.value / (1 + effectiveVatRate.value) || !discountReason.value.trim()) {
    discountError.value = 'Enter a valid discount amount and reason.'
    return
  }
  selectedArrival.value.discount = { amount, reason: discountReason.value.trim() }
}
function clearDiscount() {
  if (!selectedArrival.value) return
  selectedArrival.value.discount = undefined
  discountAmount.value = ''
  discountReason.value = ''
  discountError.value = ''
  showDiscountForm.value = false
  extensionError.value = ''
}
function scheduleWakeUpCall() {
  wakeUpError.value = ''
  if (!selectedArrival.value || !wakeUpDate.value || !wakeUpTime.value) {
    wakeUpError.value = 'Choose a date and time for the wake-up call.'
    return
  }
  if (wakeUpDate.value < today || wakeUpDate.value >= selectedArrival.value.checkOut) {
    wakeUpError.value = 'Choose a date during the guest’s stay.'
    return
  }
  selectedArrival.value.wakeUpCalls ||= []
  selectedArrival.value.wakeUpCalls.push({ date: wakeUpDate.value, time: wakeUpTime.value, note: wakeUpNote.value.trim(), status: 'Scheduled' })
  showWakeUpForm.value = false
  wakeUpNote.value = ''
}
function printRegistration() {
  if (!selectedArrival.value) return
  registrationPrinted.value = true
  window.print()
}
function completeCheckIn() {
  if (!canCheckIn.value || !selectedArrival.value) return
  selectedArrival.value.identityType = identityType.value as NonNullable<Reservation['identityType']>
  selectedArrival.value.identityVerified = identityVerified.value
  selectedArrival.value.paymentGuarantee = paymentGuarantee.value as NonNullable<Reservation['paymentGuarantee']>
  selectedArrival.value.paymentGuaranteeReference = guaranteeReference.value.trim() || undefined
  if (paymentGuarantee.value === 'Card pre-authorized' && guaranteeReference.value.trim()) selectedArrival.value.cashBasis = false
  selectedArrival.value.keyIssued = keyIssued.value
  selectedArrival.value.status = 'In house'
  selectedArrival.value.roomType = floorRooms.value.find((room) => room.number === selectedArrival.value?.room)?.type || reservationRoomType(selectedArrival.value)
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((room) => room !== selectedArrival.value?.room)
  housekeepingRooms.value = housekeepingRooms.value.filter((room) => room !== selectedArrival.value?.room)
  housekeepingCleaningRooms.value = housekeepingCleaningRooms.value.filter((room) => room !== selectedArrival.value?.room)
  selectedArrival.value.checkedInAt = new Date().toISOString()
  selectedArrival.value.balanceOnAccount = leaveBalanceOnAccount.value
  const floorRoom = floorRooms.value.find((room) => room.number === selectedArrival.value?.room)
  if (floorRoom) {
    floorRoom.occupancy = 'Occupied'
    floorRoom.updatedAt = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }
  deskNotice.value = `${selectedArrival.value.guest} checked in to room ${selectedArrival.value.room}.`
  selectedArrival.value = null
  window.setTimeout(() => { deskNotice.value = '' }, 5000)
}
function prepareCheckout() {
  showCheckoutConfirm.value = true
  checkoutError.value = outstanding.value > 0.005 && !canCheckoutWithBalance.value
    ? 'Collect the full balance or confirm that the approved company account will cover it.'
    : ''
}
function completeCheckout() {
  if (!selectedArrival.value || !selectedInHouse.value) return
  if (!checkoutAllowed.value) {
    checkoutError.value = 'Collect the full balance or confirm that the approved company account will cover it.'
    return
  }
  selectedArrival.value.finalBill = {
    subtotal: staySubtotal.value,
    vatRate: effectiveVatRate.value,
    vat: vatAmount.value,
    total: stayTotal.value,
  }
  selectedArrival.value.checkedOutAt = new Date().toISOString()
  const signingDepositRefund = selectedArrival.value.cashBasisDepositBalance || 0
  if (signingDepositRefund > 0) {
    selectedArrival.value.cashBasisDepositRefunds ||= []
    selectedArrival.value.cashBasisDepositRefunds.push({ amount: signingDepositRefund, method: 'Cash', receivedAt: new Date().toISOString() })
    selectedArrival.value.cashBasisDepositBalance = 0
  }
  selectedArrival.value.status = 'Checked out'
  housekeepingReadyRooms.value = housekeepingReadyRooms.value.filter((room) => room !== selectedArrival.value?.room)
  housekeepingCleaningRooms.value = housekeepingCleaningRooms.value.filter((room) => room !== selectedArrival.value?.room)
  if (!housekeepingRooms.value.includes(selectedArrival.value.room)) housekeepingRooms.value.push(selectedArrival.value.room)
  const floorRoom = floorRooms.value.find((room) => room.number === selectedArrival.value?.room)
  if (floorRoom) {
    floorRoom.occupancy = 'Vacant'
    floorRoom.taskState = 'Dirty'
    floorRoom.updatedAt = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
  }
  deskNotice.value = `Room ${selectedArrival.value.room} is checked out and waiting for housekeeping.${signingDepositRefund > 0 ? ` Cash-basis deposit refund: ₱${signingDepositRefund.toFixed(2)}.` : ''}`
  selectedArrival.value = null
  showCheckoutConfirm.value = false
  window.setTimeout(() => { deskNotice.value = '' }, 5000)
}

const arrivalsToday = computed(() => reservations.value.filter((reservation) => reservation.checkIn === today && isActive(reservation)))
const confirmedDailyArrivals = computed(() => reservations.value
  .filter((reservation) => reservation.checkIn === today && reservation.status === 'Confirmed')
  .sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime) || a.guest.localeCompare(b.guest)))
const inHouseNow = computed(() => reservations.value.filter((reservation) => arrivalStatus(reservation) === 'In house'))
const departuresToday = computed(() => reservations.value.filter((reservation) => reservation.checkOut === today && isActive(reservation)))
const cashBasisAlerts = computed(() => reservations.value.filter((reservation) => reservation.status === 'In house'
  && isCashBasisReservation(reservation)
  && !hasSponsorSigningAuthorization(reservation)
  && ((reservation.cashBasisDepositBalance || 0) <= 0 || Boolean(reservation.cashBasisDepositAlert))))
const filteredArrivals = computed(() => {
  const query = search.value.trim().toLowerCase()
  const range = dateWindow.value
  return reservations.value.filter((reservation) => {
    const matchesQuery = !query || [reservation.id, reservation.guest, reservation.billingPerson, reservation.room].some((value) => value.toLowerCase().includes(query))
    const matchesDate = !range || (statusFilter.value === 'Check-out'
      ? reservation.checkOut >= range.from && reservation.checkOut <= range.to
      : statusFilter.value === 'In-house'
        ? reservation.checkIn <= range.to && reservation.checkOut > range.from
        : statusFilter.value === 'All'
          ? reservation.checkIn <= range.to && reservation.checkOut >= range.from
          : reservation.checkIn >= range.from && reservation.checkIn <= range.to)
    const state = arrivalStatus(reservation)
    const matchesStatus = statusFilter.value === 'All'
      || (statusFilter.value === 'Check-in' && (!range || (reservation.checkIn >= range.from && reservation.checkIn <= range.to)) && isActive(reservation))
      || (statusFilter.value === 'In-house' && state === 'In house')
      || (statusFilter.value === 'Check-out' && (!range || (reservation.checkOut >= range.from && reservation.checkOut <= range.to)) && isActive(reservation))
    return matchesQuery && matchesDate && matchesStatus
  }).sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.arrivalTime.localeCompare(b.arrivalTime))
})
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <h1 class="font-serif text-[32px] font-medium leading-tight tracking-[-0.035em] text-[#30243e] sm:text-[36px]">Front desk</h1>
        <p class="mt-2 text-[13px] text-[#748087]">Today’s arrivals, departures, and room readiness.</p>
      </div>
      <div v-if="dateMode === 'today'" class="flex items-center gap-2 rounded-md border border-[#dfd0eb] bg-[#f2f7f1] px-3 py-2 text-[10px] font-medium text-[#4d7054]"><Clock3 :size="14" /> Today · {{ formatDate(today) }}</div>
    </div>

    <div v-if="deskNotice" role="status" aria-live="polite" class="mt-4 flex items-center gap-2 rounded-md border border-[#d8e7db] bg-[#f1f7f1] px-3 py-2 text-[10px] text-[#47704f]"><Check :size="14" />{{ deskNotice }}</div>

    <section v-if="cashBasisAlerts.length" class="mt-4 overflow-hidden rounded-lg border border-[#efd7a3] bg-[#fffdf7]">
      <header class="flex items-center justify-between gap-3 border-b border-[#f0e3c7] px-4 py-3"><div><h2 class="text-[12px] font-semibold text-[#785920]">Cash-basis signing deposit alerts</h2><p class="mt-0.5 text-[9px] text-[#8d7b59]">These guests cannot sign outlet, laundry, or room-service charges without a sufficient deposit or sponsor authorization.</p></div><span class="rounded-full bg-[#fff0ce] px-2 py-1 text-[8px] font-medium text-[#8b6726]">{{ cashBasisAlerts.length }} guests</span></header>
      <div class="divide-y divide-[#f3ead7]"><article v-for="reservation in cashBasisAlerts" :key="`cash-basis-${reservation.id}`" class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"><div><p class="text-[10px] font-semibold text-[#46565f]">{{ reservation.guest }} · Room {{ reservation.room }}</p><p class="mt-0.5 text-[8px] text-[#8d7b59]">{{ reservation.cashBasisDepositAlert || 'No signing deposit on file' }} · Available ₱{{ (reservation.cashBasisDepositBalance || 0).toFixed(2) }}</p></div><button class="arrival-action" @click="openArrival(reservation)">Record deposit</button></article></div>
    </section>

    <section class="mt-6 overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
      <header class="flex items-center justify-between border-b border-[#eceee9] px-4 py-3 sm:px-5"><div><h2 class="text-[13px] font-semibold text-[#34434a]">Daily Arrival List</h2><p class="mt-0.5 text-[9px] text-[#929c9b]">Confirmed reservations arriving today · {{ formatDate(today) }}</p></div><span class="rounded-full bg-[#f2ebf8] px-2 py-1 text-[9px] font-medium text-[#7047a8]">{{ confirmedDailyArrivals.length }} arrivals</span></header>
      <div class="overflow-x-auto"><table class="w-full min-w-[850px] border-collapse text-left"><thead><tr class="bg-[#fafbf9]"><th class="reservation-head pl-5">Arrival (date &amp; time)</th><th class="reservation-head">Guest name(s)</th><th class="reservation-head">Room</th><th class="reservation-head">Room type</th><th class="reservation-head text-right">Rate / night</th><th class="reservation-head">Status</th><th class="reservation-head pr-5">Departure</th></tr></thead><tbody>
        <tr v-for="reservation in confirmedDailyArrivals" :key="`daily-arrival-${reservation.id}`" class="reservation-row"><td class="reservation-cell pl-5"><span class="font-medium text-[#42525a]">{{ formatDate(reservation.checkIn) }}</span><span class="mt-0.5 block text-[9px] text-[#859097]">{{ formatTime(reservation.arrivalTime) }}</span></td><td class="reservation-cell font-medium text-[#46565f]">{{ [reservation.guest, ...(reservation.additionalGuests || [])].join(', ') }}</td><td class="reservation-cell"><span class="room-code">{{ reservation.room === 'Unassigned' ? 'Not assigned' : reservation.room }}</span></td><td class="reservation-cell text-[#5f6d74]">{{ reservationRoomType(reservation) }}</td><td class="reservation-cell text-right text-[#52616a]">₱{{ reservation.rate.toFixed(2) }}</td><td class="reservation-cell"><span class="reservation-status status-confirmed">{{ reservation.status }}</span></td><td class="reservation-cell pr-5 text-[#5f6d74]">{{ formatDate(reservation.checkOut) }}</td></tr>
        <tr v-if="confirmedDailyArrivals.length === 0"><td colspan="7" class="py-7 text-center text-[10px] text-[#929c9b]">No confirmed reservations arriving today.</td></tr>
      </tbody></table></div>
    </section>

    <div class="mt-7 flex flex-wrap items-end justify-between gap-3">
      <div><h2 class="text-[15px] font-semibold text-[#34434a]">Guest activity</h2><p class="mt-1 text-[10px] text-[#929c9b]">Select a guest to check them in, check them out, or manage their stay.</p></div>
      <div class="flex items-center gap-3"><span class="text-[10px] text-[#929c9b]">{{ filteredArrivals.length }} stays</span><button class="arrival-action-primary" @click="openWalkIn"><Plus :size="13" /> Add walk-in guest</button></div>
    </div>

    <div class="mt-3 overflow-hidden rounded-lg border border-[#e5e7e2] bg-white">
      <div class="flex flex-col gap-3 border-b border-[#eceee9] px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap gap-2">
          <label class="desk-search"><Search :size="14" /><span class="sr-only">Search guests, rooms, or bookings</span><input v-model="search" placeholder="Search guests, rooms, or bookings" /></label>
          <div class="desk-status-filters" role="group" aria-label="Filter front desk stays">
            <button v-for="filter in (['All', 'Check-in', 'In-house', 'Check-out'] as const)" :key="filter" class="desk-filter-button" :class="statusFilter === filter ? 'desk-filter-active' : ''" :aria-pressed="statusFilter === filter" @click="statusFilter = filter">
              {{ filter }}<span>{{ filter === 'All' ? reservations.length : filter === 'Check-in' ? arrivalsToday.length : filter === 'In-house' ? inHouseNow.length : departuresToday.length }}</span>
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="mr-1 flex items-center gap-1 text-[10px] text-[#8c9798]"><CalendarDays :size="13" /> Date:</span>
          <button v-for="option in ([['all', 'All dates'], ['today', 'Today'], ['specific', 'Specific date'], ['range', 'Date range']] as const)" :key="option[0]" class="date-mode-button" :class="dateMode === option[0] ? 'date-mode-active' : ''" @click="dateMode = option[0]">{{ option[1] }}</button>
          <label v-if="dateMode === 'specific'" class="date-input-label"><span class="sr-only">Specific arrival date</span><input v-model="specificDate" type="date" class="date-input" /></label>
          <div v-else-if="dateMode === 'range'" class="flex items-center gap-1"><label class="date-input-label"><span class="sr-only">Arrival range start</span><input v-model="rangeStart" type="date" class="date-input" /></label><span class="text-[10px] text-[#9aa3a2]">to</span><label class="date-input-label"><span class="sr-only">Arrival range end</span><input v-model="rangeEnd" type="date" class="date-input" /></label></div>
        </div>
      </div>

      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[700px] border-collapse text-left">
          <thead><tr class="bg-[#fafbf9]"><th class="reservation-head pl-5">Guest</th><th class="reservation-head">Room</th><th class="reservation-head">Arrival</th><th class="reservation-head">Departure</th><th class="reservation-head">Status</th><th class="reservation-head pr-5 text-right">Next step</th></tr></thead>
          <tbody>
            <tr v-for="reservation in filteredArrivals" :key="reservation.id" class="reservation-row" :class="reservation.checkIn === today && isActive(reservation) ? 'arrival-today-row' : ''">
              <td class="reservation-cell pl-5"><span class="font-semibold text-[#46565f]">{{ reservation.guest }}</span><span class="mt-0.5 block text-[9px] text-[#929097]">Booking {{ reservation.id }}<template v-if="reservation.billingType !== 'Guest'"> · billed to {{ reservation.billingPerson }}</template></span></td>
              <td class="reservation-cell"><span class="room-code" :class="reservation.room === 'Unassigned' ? 'text-[#a4acad]' : ''">{{ reservation.room === 'Unassigned' ? 'Not assigned' : `Room ${reservation.room}` }}</span></td>
              <td class="reservation-cell"><span class="font-medium text-[#42525a]">{{ formatDate(reservation.checkIn) }}</span><span class="mt-0.5 block text-[9px] text-[#859097]">{{ formatTime(reservation.arrivalTime) }}</span></td>
              <td class="reservation-cell text-[#5f6d74]">{{ formatDate(reservation.checkOut) }}</td>
              <td class="reservation-cell"><span class="reservation-status" :class="statusClass(arrivalStatus(reservation))">{{ arrivalStatus(reservation) }}</span></td>
              <td class="reservation-cell pr-5 text-right"><button class="arrival-action" @click="openArrival(reservation)">{{ actionLabel(reservation) }}</button></td>
            </tr>
            <tr v-if="filteredArrivals.length === 0"><td colspan="6" class="py-16 text-center"><UsersRound :size="18" class="mx-auto text-[#a1aaa8]" /><p class="mt-3 text-[12px] font-medium text-[#57656c]">No guests match these filters</p><p class="mt-1 text-[10px] text-[#929c9b]">Try another date or search, or add a walk-in guest.</p></td></tr>
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-[#eef0ec] md:hidden">
        <article v-for="reservation in filteredArrivals" :key="reservation.id" class="px-4 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0"><p class="truncate text-[13px] font-semibold text-[#46565f]">{{ reservation.guest }}</p><p class="mt-1 text-[10px] text-[#929097]">Booking {{ reservation.id }} · {{ reservation.room === 'Unassigned' ? 'Room not assigned' : `Room ${reservation.room}` }}</p></div>
            <span class="reservation-status shrink-0" :class="statusClass(arrivalStatus(reservation))">{{ arrivalStatus(reservation) }}</span>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-3 text-[10px]"><div><p class="text-[#929097]">Arrival</p><p class="mt-0.5 font-medium text-[#52616a]">{{ formatDate(reservation.checkIn) }} · {{ formatTime(reservation.arrivalTime) }}</p></div><div><p class="text-[#929097]">Departure</p><p class="mt-0.5 font-medium text-[#52616a]">{{ formatDate(reservation.checkOut) }}</p></div></div>
          <button class="arrival-action mt-3 w-full" @click="openArrival(reservation)">{{ actionLabel(reservation) }}</button>
        </article>
        <div v-if="filteredArrivals.length === 0" class="px-4 py-12 text-center"><UsersRound :size="18" class="mx-auto text-[#a1aaa8]" /><p class="mt-3 text-[12px] font-medium text-[#57656c]">No guests match these filters</p><p class="mt-1 text-[10px] text-[#929c9b]">Try another date or search, or add a walk-in guest.</p></div>
      </div>
    </div>
  </section>

  <div v-if="showWalkInForm" class="modal-backdrop" @click.self="showWalkInForm = false">
    <section class="walkin-modal" role="dialog" aria-modal="true" aria-labelledby="walkin-title">
      <header class="flex items-start justify-between border-b border-[#e9ece7] px-5 py-4"><div><p class="eyebrow">Front desk · same-day stay</p><h2 id="walkin-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Walk-in guest</h2><p class="mt-1 text-[10px] text-[#7e8a8e]">Create a booking and start the check-in process now.</p></div><button class="rounded-md p-1.5 text-[#84908f] hover:bg-[#f1f3ef]" aria-label="Close walk-in form" @click="showWalkInForm = false"><X :size="16" /></button></header>
      <div class="border-b border-[#ece5f1] px-5 pt-3"><div class="flex gap-1" role="tablist" aria-label="Walk-in booking sections"><button v-for="tab in (['Summary / Print', 'Guest & stay', 'Additional'] as const)" :key="tab" class="walkin-tab" :class="walkInTab === tab ? 'walkin-tab-active' : ''" role="tab" :aria-selected="walkInTab === tab" @click="walkInTab = tab">{{ tab }}</button></div></div>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <section v-if="walkInTab === 'Guest & stay'" class="space-y-4">
          <div class="rounded-lg border border-[#ded1eb] bg-[#fbf7ff] p-3.5">
            <div class="flex items-center justify-between gap-2"><h3 class="flex items-center gap-2 text-[11px] font-semibold text-[#513774]"><UsersRound :size="14" /> Guest list ({{ (walkInPrimaryName ? 1 : 0) + walkInGuests.length }} guests)</h3><span class="text-[9px] text-[#896ca7]">Add the main guest and any additional guests</span></div>
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="form-label">First name<input v-model="walkInFirstName" class="form-input" autocomplete="given-name" placeholder="First name" /></label><label class="form-label">Last name<input v-model="walkInLastName" class="form-input" autocomplete="family-name" placeholder="Last name" /></label></div>
            <label class="form-label mt-3">Find a previous guest<input v-model="walkInGuestSearch" class="form-input" autocomplete="off" placeholder="Search previous guests by name" /></label>
            <div v-if="existingGuestSuggestions.length" class="mt-2 rounded-md border border-[#e8e0ef] bg-[#fffdfb] p-1"><button v-for="guest in existingGuestSuggestions" :key="guest" class="walkin-suggestion" @click="addWalkInGuest(guest)">{{ guest }}<span>Add</span></button></div>
            <div v-if="walkInGuests.length" class="mt-3 flex flex-wrap gap-2"><span v-for="(guest, index) in walkInGuests" :key="guest" class="walkin-guest-chip">{{ guest }}<button :aria-label="`Remove ${guest}`" @click="removeWalkInGuest(index)"><X :size="11" /></button></span></div>
            <div class="mt-3 rounded-md border border-[#eee8f3] bg-white p-3"><p class="text-[10px] font-semibold text-[#67547a]">Add another guest</p><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"><label class="form-label">First name<input v-model="walkInAdditionalFirstName" class="form-input" autocomplete="off" placeholder="First name" /></label><label class="form-label">Last name<input v-model="walkInAdditionalLastName" class="form-input" autocomplete="off" placeholder="Last name" /></label><button class="walkin-add-guest self-end" @click="addNewWalkInGuest"><Plus :size="12" /> Add guest</button></div></div>
            <div v-if="!walkInPrimaryName && !walkInGuests.length" class="py-5 text-center"><UsersRound :size="20" class="mx-auto text-[#9b82b5]" /><p class="mt-2 text-[10px] font-medium text-[#62566c]">Enter the main guest’s first and last name.</p></div>
            <div class="mt-2 flex items-center gap-2 border-t border-[#eadff3] pt-3"><span class="text-[9px] font-medium text-[#75687e]">Payer</span><button class="walkin-payer-choice" :class="!walkInThirdParty ? 'walkin-payer-choice-active' : ''" @click="walkInThirdParty = false">Guest pays</button><button class="walkin-payer-choice" :class="walkInThirdParty ? 'walkin-payer-choice-active' : ''" @click="walkInThirdParty = true">Third party pays</button></div>
            <label v-if="walkInThirdParty" class="form-label mt-3">Third-party payer<input v-model="walkInPayer" class="form-input" placeholder="Company or payer name" /></label>
          </div>
          <div class="rounded-lg border border-[#dfe3ec] bg-[#f7f8fc] p-3.5"><h3 class="text-[11px] font-semibold text-[#394765]">Stay details</h3><div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="form-label">Room<select v-model="walkInRoom" class="form-input"><option value="" disabled>Select an available room</option><option v-for="room in availableWalkInRooms" :key="room" :value="room">Room {{ room }}</option></select></label><label class="form-label">Nightly rate<input v-model="walkInRate" type="number" min="0.01" step="0.01" class="form-input" /></label><label class="form-label">Check-in date<input :value="today" type="date" class="form-input" disabled /></label><label class="form-label">Check-out date<input v-model="walkInCheckOut" type="date" :min="dayOffset(1)" class="form-input" /></label></div>
            <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="form-label">Purpose of stay<select v-model="walkInPurpose" class="form-input"><option>Leisure</option><option>Business</option><option>Group</option></select></label><label class="form-label">Additional details<input v-model="walkInPurposeDetails" class="form-input" placeholder="Reason for stay or guest notes" /></label></div>
          </div>
        </section>
        <section v-else-if="walkInTab === 'Additional'" class="space-y-4">
          <div class="rounded-lg border border-[#e8e0ef] bg-[#fcf9ff] p-4"><h3 class="text-[11px] font-semibold text-[#513774]">Booking source</h3><label class="form-label mt-3">Source<select v-model="walkInSource" class="form-input"><option>Walk-in</option><option>Phone</option><option>Hotel website</option><option>Travel agent</option><option>Other</option></select></label></div>
          <div class="rounded-lg border border-[#eee3c8] bg-[#fffaf0] p-4"><label class="flex items-center justify-between gap-3 text-[10px] font-semibold text-[#6d5832]"><span><span class="block">Tax exemption</span><span class="mt-1 block text-[9px] font-normal text-[#8e7952]">Record an approved exemption reference.</span></span><input v-model="walkInTaxExempt" type="checkbox" class="size-4 accent-[#7047a8]" /></label><label v-if="walkInTaxExempt" class="form-label mt-3">Exemption reference<input v-model="walkInTaxExemptionRef" class="form-input" placeholder="Certificate or approval number" /></label></div>
        </section>
        <section v-else class="rounded-lg border border-[#e8e0ef] bg-[#fffdfb] p-4"><h3 class="text-[12px] font-semibold text-[#49345f]">Walk-in summary</h3><div class="mt-3 space-y-2 text-[10px] text-[#69747a]"><p><strong class="text-[#45515b]">Guests:</strong> {{ [walkInPrimaryName, ...walkInGuests].filter(Boolean).join(', ') || 'Add a guest' }}</p><p><strong class="text-[#45515b]">Payer:</strong> {{ walkInThirdParty ? (walkInPayer || 'Add payer name') : (walkInPrimaryName || 'Guest pays') }}</p><p><strong class="text-[#45515b]">Stay:</strong> Room {{ walkInRoom || '—' }} · {{ walkInNights }} night{{ walkInNights === 1 ? '' : 's' }} · {{ formatDate(today) }} – {{ formatDate(walkInCheckOut) }}</p><p><strong class="text-[#45515b]">Purpose:</strong> {{ walkInPurpose }}<span v-if="walkInPurposeDetails"> · {{ walkInPurposeDetails }}</span></p><p><strong class="text-[#45515b]">Source:</strong> {{ walkInSource }}</p><div class="flex items-center justify-between border-t border-[#eee9f2] pt-2"><span>Room subtotal</span><span>₱{{ walkInSubtotal.toFixed(2) }}</span></div><div class="flex items-center justify-between"><span>VAT {{ walkInTaxExempt ? '(exempt)' : '(21%)' }}</span><span>₱{{ walkInVat.toFixed(2) }}</span></div><div class="flex items-center justify-between font-semibold text-[#49345f]"><span>Estimated total</span><span>₱{{ (walkInSubtotal + walkInVat).toFixed(2) }}</span></div></div><p class="mt-4 rounded-md bg-[#f5effa] px-3 py-2 text-[9px] text-[#654b7d]">Continue to payment and registration signature to complete check-in.</p></section>
        <p v-if="availableWalkInRooms.length === 0 && walkInTab === 'Guest & stay'" class="mt-3 text-[10px] text-[#a25454]">No rooms are available for the selected stay dates.</p>
        <p v-if="walkInError" class="mt-3 text-[10px] text-[#a25454]">{{ walkInError }}</p>
      </div>
      <footer class="flex justify-end gap-2 border-t border-[#e9ece7] px-5 py-3"><button class="secondary-button" @click="showWalkInForm = false">Cancel</button><button class="arrival-action-primary" :disabled="availableWalkInRooms.length === 0" @click="createWalkIn"><Check :size="13" /> Create &amp; continue check-in</button></footer>
    </section>
  </div>

  <div v-if="selectedArrival" class="modal-backdrop" @click.self="selectedArrival = null">
    <section class="arrival-modal" role="dialog" aria-modal="true" aria-labelledby="arrival-title">
      <header class="arrival-modal-header">
        <div><p class="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">{{ selectedArrival.id }} · {{ selectedArrival.room === 'Unassigned' ? 'Room not assigned' : `Room ${selectedArrival.room}` }}</p><h2 id="arrival-title" class="mt-1 font-serif text-[23px] leading-7 text-white">{{ selectedArrival.guest }}</h2></div>
        <button v-if="selectedInHouse" class="wake-header-button" @click="showWakeUpForm = !showWakeUpForm"><Clock3 :size="13" /> Wake-up call</button>
        <button class="rounded-md p-1.5 text-white/75 hover:bg-white/10" aria-label="Close arrival details" @click="selectedArrival = null"><X :size="17" /></button>
      </header>
      <div class="arrival-modal-content">
        <section class="arrival-panel">
          <div class="flex items-center justify-between"><div><h3 class="text-[12px] font-semibold text-[#35444b]">Stay details</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">{{ nightCount(selectedArrival) }} night{{ nightCount(selectedArrival) === 1 ? '' : 's' }} · {{ selectedArrival.purpose }} · billed to {{ selectedArrival.billingPerson }}</p></div><span class="reservation-status" :class="statusClass(arrivalStatus(selectedArrival))">{{ arrivalStatus(selectedArrival) }}</span></div>
          <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p class="arrival-label">Expected check-in</p><p class="arrival-value">{{ formatDate(selectedArrival.checkIn) }}</p><p class="arrival-subvalue">{{ formatTime(selectedArrival.arrivalTime) }}</p></div><div><p class="arrival-label">Check-out</p><p class="arrival-value">{{ formatDate(selectedArrival.checkOut) }}</p></div><div><p class="arrival-label">Room rate</p><p class="arrival-value">₱{{ selectedArrival.rate.toFixed(2) }} / night</p></div><div><p class="arrival-label">Room</p><p class="arrival-value">{{ roomDraft === 'Unassigned' ? 'Choose room' : roomDraft }}</p></div></div>
        </section>

        <section v-if="!selectedInHouse" class="arrival-panel">
          <div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="text-[12px] font-semibold text-[#35444b]">1. Assign a ready room</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Choose a vacant room marked available by housekeeping.</p></div><span v-if="roomConfirmed" class="inline-flex items-center gap-1 rounded-full bg-[#e7f3ea] px-2 py-1 text-[9px] font-medium text-[#497455]"><Check :size="11" /> Room assigned</span></div>
          <div class="mt-3 flex flex-col gap-2 sm:flex-row"><label class="sr-only" for="arrival-room">Assign room</label><select id="arrival-room" v-model="roomDraft" class="form-input mt-0 sm:max-w-[260px]" @change="roomConfirmed = false; roomReadyConfirmed = false; roomError = ''"><option v-for="room in roomNumbers" :key="room" :value="room" :disabled="!roomCanBeAssigned(room)">Room {{ room }} · {{ roomOperationalStatus(room) }}</option></select><button class="arrival-action-primary" :disabled="roomConflict || selectedRoomStatus !== 'Available'" @click="confirmRoom">Confirm room</button></div>
          <p class="mt-2 flex items-center gap-1.5 text-[9px]" :class="selectedRoomReady ? 'text-[#52745a]' : 'text-[#887847]'"><Check v-if="selectedRoomReady" :size="12" /><CircleAlert v-else :size="12" /> Room status: {{ selectedRoomStatus }}<span v-if="roomConflict"> · assigned to another stay</span></p>
          <label class="mt-3 flex items-start gap-2 text-[10px] text-[#67757a]" :class="selectedRoomReady && roomConfirmed ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"><input v-model="roomReadyConfirmed" type="checkbox" class="mt-0.5 accent-[#7047a8]" :disabled="!selectedRoomReady || !roomConfirmed" /> I confirmed this room is clean, inspected, and ready for the guest</label>
          <p v-if="roomError" class="mt-2 text-[9px] text-[#a25454]">{{ roomError }}</p>
        </section>

        <section v-if="!selectedInHouse" class="arrival-panel">
          <div><h3 class="text-[12px] font-semibold text-[#35444b]">2. Verify guest ID</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Check the guest’s identity document in person. Do not enter its number here.</p></div>
          <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr]"><label class="form-label">Document type<select v-model="identityType" class="form-input mt-1"><option value="">Choose document type</option><option>Passport</option><option>National ID</option><option>Driver’s license</option><option>Other</option></select></label><label class="mt-1 flex items-center gap-2 text-[10px] text-[#67757a] sm:mt-7"><input v-model="identityVerified" type="checkbox" class="accent-[#7047a8]" :disabled="!identityType" /> I checked the guest’s ID and name</label></div>
        </section>

        <section v-if="!selectedInHouse" class="arrival-panel">
          <div><h3 class="text-[12px] font-semibold text-[#35444b]">3. Confirm payment cover</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Choose the approved deposit or payment guarantee for this stay.</p></div>
          <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"><label class="form-label">Payment guarantee<select v-model="paymentGuarantee" class="form-input mt-1"><option value="">Choose an option</option><option>Deposit received</option><option>Card pre-authorized</option><option :disabled="selectedArrival.billingType === 'Guest'">Company account</option><option>Not required</option></select></label><label v-if="paymentGuarantee === 'Card pre-authorized'" class="form-label">Authorization reference<input v-model="guaranteeReference" class="form-input mt-1" placeholder="Reference from payment terminal" autocomplete="off" /></label></div>
          <p v-if="paymentGuarantee === 'Deposit received' && totalPaid === 0" class="mt-2 text-[9px] text-[#a25454]">Record the deposit in the payment section below.</p>
          <p v-else-if="paymentGuarantee === 'Card pre-authorized'" class="mt-2 text-[9px] text-[#8c858f]">Enter the approval reference only. Never store a full card number.</p>
        </section>

        <section v-else class="arrival-panel">
          <div class="flex flex-wrap items-center justify-between gap-3"><div><h3 class="text-[12px] font-semibold text-[#35444b]">In-house stay</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Manage the folio, extend the stay, and schedule guest services.</p></div><span class="inline-flex items-center gap-1 rounded-full bg-[#e7f3ea] px-2 py-1 text-[9px] font-medium text-[#497455]"><Check :size="11" /> Checked in</span></div>
          <div class="mt-3 grid grid-cols-1 gap-2 rounded-md border border-[#e8ebe6] bg-[#fbfcfa] p-3 sm:grid-cols-3"><p class="text-[9px] text-[#778389]">Guest ID <strong class="block mt-1 text-[10px] font-medium text-[#52616a]">{{ selectedArrival.identityVerified ? `${selectedArrival.identityType} verified` : 'Not recorded' }}</strong></p><p class="text-[9px] text-[#778389]">Payment cover <strong class="block mt-1 text-[10px] font-medium text-[#52616a]">{{ selectedArrival.paymentGuarantee || 'Not recorded' }}</strong></p><p class="text-[9px] text-[#778389]">Room key <strong class="block mt-1 text-[10px] font-medium text-[#52616a]">{{ selectedArrival.keyIssued ? 'Issued' : 'Not recorded' }}</strong></p></div>
          <div class="mt-3 flex flex-wrap gap-2"><button class="arrival-action" @click="addNight"><Plus :size="13" /> Add one night</button><button class="arrival-action" @click="showChargeForm = !showChargeForm">Post charge</button><button class="arrival-action" @click="showDiscountForm = !showDiscountForm; discountAmount = selectedArrival.discount?.amount.toFixed(2) || ''; discountReason = selectedArrival.discount?.reason || ''; discountError = ''">Discount</button><button class="arrival-action" @click="showWakeUpForm = !showWakeUpForm"><Clock3 :size="13" /> Wake-up call</button><button class="checkout-action" @click="prepareCheckout">Check out</button></div>
          <p v-if="extensionError" class="mt-2 text-[9px] text-[#a25454]">{{ extensionError }}</p>
          <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-md border border-[#e8ebe6] bg-[#fbfcfa] p-3"><p class="arrival-label">Current stay</p><p class="mt-1 text-[10px] font-medium text-[#52616a]">{{ nightCount(selectedArrival) }} night{{ nightCount(selectedArrival) === 1 ? '' : 's' }} · Check-out {{ formatDate(selectedArrival.checkOut) }}</p><p class="mt-1 text-[9px] text-[#8e9999]">Adding a night moves check-out to the next day.</p></div>
            <div class="rounded-md border border-[#e8ebe6] bg-[#fbfcfa] p-3"><p class="arrival-label">Registration</p><p class="mt-1 text-[10px] font-medium text-[#52616a]">Checked in {{ selectedArrival.checkedInAt ? formatTime(new Date(selectedArrival.checkedInAt).toTimeString().slice(0, 5)) : formatDate(selectedArrival.checkIn) }}</p><p class="mt-1 text-[9px] text-[#8e9999]">Room {{ selectedArrival.room }} · {{ selectedArrival.billingPerson }}</p></div>
          </div>
          <div v-if="showChargeForm" class="mt-3 rounded-md border border-[#e6e9e4] bg-[#fbfcfa] p-3"><h4 class="text-[10px] font-semibold text-[#52616a]">Post a charge to the folio</h4><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_auto]"><label class="sr-only" for="folio-charge-description">Charge description</label><select id="folio-charge-description" v-model="chargeDescription" class="form-input mt-0"><option>Restaurant - Dinner</option><option>Room service</option><option>Laundry</option><option>Minibar</option><option>Parking</option><option>Other</option></select><label class="sr-only" for="folio-charge-amount">Charge amount</label><input id="folio-charge-amount" v-model="chargeAmount" type="number" min="0.01" step="0.01" class="form-input mt-0" placeholder="Amount" /><button class="arrival-action-primary" @click="postCharge">Post charge</button></div><p v-if="chargeError" class="mt-2 text-[9px] text-[#a25454]">{{ chargeError }}</p></div>
          <div v-if="showDiscountForm" class="mt-3 rounded-md border border-[#e6e9e4] bg-[#fbfcfa] p-3"><h4 class="text-[10px] font-semibold text-[#52616a]">Apply a folio discount</h4><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[150px_1fr_auto_auto]"><label class="sr-only" for="folio-discount-amount">Discount amount</label><input id="folio-discount-amount" v-model="discountAmount" type="number" min="0.01" step="0.01" class="form-input mt-0" placeholder="Amount" /><label class="sr-only" for="folio-discount-reason">Discount reason</label><input id="folio-discount-reason" v-model="discountReason" class="form-input mt-0" placeholder="Reason for discount" /><button class="arrival-action-primary" @click="applyDiscount">Apply</button><button v-if="selectedArrival.discount" class="arrival-action" @click="clearDiscount">Remove</button></div><p v-if="discountError" class="mt-2 text-[9px] text-[#a25454]">{{ discountError }}</p></div>
          <div v-if="showChargeForm || selectedArrival.charges?.length || selectedArrival.discount" class="mt-3 overflow-hidden rounded-md border border-[#e8ebe6]"><div class="grid grid-cols-[1fr_auto] bg-[#f8f9f7] px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.08em] text-[#8d9897]"><span>Other charges</span><span>Amount</span></div><div v-for="(charge, index) in selectedArrival.charges || []" :key="`${charge.date}-${index}`" class="flex items-center justify-between border-t border-[#eceee9] px-3 py-2 text-[9px]"><span><span class="mr-2 text-[#9ba4a2]">{{ formatDate(charge.date) }}</span>{{ charge.description }}<span v-if="charge.status && charge.status !== 'Posted'" class="ml-2 rounded bg-[#f0edf1] px-1.5 py-0.5 text-[8px] text-[#817989]">{{ charge.status }}</span></span><span class="font-medium text-[#58666c]" :class="charge.status === 'Voided' || charge.status === 'Moved' || charge.status === 'Split' ? 'line-through opacity-60' : ''">₱{{ charge.amount.toFixed(2) }}</span></div><div v-if="selectedArrival.discount" class="flex items-center justify-between border-t border-[#eceee9] bg-[#f8fbf8] px-3 py-2 text-[9px] text-[#4d7958]"><span>Discount · {{ selectedArrival.discount.reason }}</span><span>−₱{{ selectedArrival.discount.amount.toFixed(2) }}</span></div><div class="flex items-center justify-between border-t border-[#eceee9] bg-[#fbfcfa] px-3 py-2 text-[9px] font-semibold text-[#52616a]"><span>Folio total</span><span>₱{{ stayTotal.toFixed(2) }}</span></div></div>
          <div v-if="showWakeUpForm" class="mt-3 rounded-md border border-[#e6e9e4] bg-[#fbfcfa] p-3"><h4 class="text-[10px] font-semibold text-[#52616a]">Schedule a wake-up call</h4><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_130px_1fr_auto]"><label class="sr-only" for="wake-up-date">Wake-up date</label><input id="wake-up-date" v-model="wakeUpDate" type="date" class="form-input mt-0" /><label class="sr-only" for="wake-up-time">Wake-up time</label><input id="wake-up-time" v-model="wakeUpTime" type="time" class="form-input mt-0" /><label class="sr-only" for="wake-up-note">Wake-up call note</label><input id="wake-up-note" v-model="wakeUpNote" class="form-input mt-0" placeholder="Optional note" /><button class="arrival-action-primary" @click="scheduleWakeUpCall">Schedule</button></div><p v-if="wakeUpError" class="mt-2 text-[9px] text-[#a25454]">{{ wakeUpError }}</p></div>
          <div v-if="selectedArrival.wakeUpCalls?.length" class="mt-3 rounded-md border border-[#e8ebe6] bg-[#fbfcfa] px-3 py-2"><p class="text-[9px] font-semibold text-[#52616a]">Wake-up calls</p><p v-for="(call, index) in selectedArrival.wakeUpCalls" :key="index" class="mt-1 text-[9px] text-[#6d7b7e]">{{ formatDate(call.date) }} · {{ formatTime(call.time) }} · {{ call.status }}<span v-if="call.note"> · {{ call.note }}</span></p></div>
        </section>

        <section class="arrival-panel">
          <div class="flex items-center justify-between"><div><h3 class="text-[12px] font-semibold text-[#35444b]">{{ selectedInHouse ? 'Folio & payments' : 'Record a payment' }}</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">{{ selectedInHouse ? 'Review the balance before checkout.' : 'Record any deposit received here.' }}</p></div></div>
          <div class="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="financial-cell"><span>Total charges</span><strong>₱{{ stayTotal.toFixed(2) }}</strong></div><div class="financial-cell"><span>Paid</span><strong class="text-[#44815a]">₱{{ totalPaid.toFixed(2) }}</strong></div><div class="financial-cell"><span>VAT {{ selectedArrival.taxExempt ? '(exempt)' : '· 21%' }}</span><strong>₱{{ vatAmount.toFixed(2) }}</strong></div><div class="financial-cell"><span>Outstanding</span><strong class="text-[#426b9a]">₱{{ outstanding.toFixed(2) }}</strong></div></div>
          <div class="mb-3 overflow-hidden rounded-md border border-[#e8ebe6] text-[9px]"><div class="flex items-center justify-between bg-[#fbfcfa] px-3 py-2 text-[#65737a]"><span>Room &amp; service subtotal</span><span>₱{{ staySubtotal.toFixed(2) }}</span></div><div class="flex items-center justify-between border-t border-[#eceee9] px-3 py-2 text-[#65737a]"><span>VAT {{ selectedArrival.taxExempt ? '(exempt)' : '· 21%' }}</span><span>₱{{ vatAmount.toFixed(2) }}</span></div><div class="flex items-center justify-between border-t border-[#eceee9] bg-[#f8f9f7] px-3 py-2 font-semibold text-[#43535a]"><span>Bill total</span><span>₱{{ stayTotal.toFixed(2) }}</span></div></div>
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_auto]"><label class="sr-only" for="arrival-payment-method">Payment method</label><select id="arrival-payment-method" v-model="paymentMethod" class="form-input mt-0"><option>Card</option><option>Cash</option><option>Mobile money</option><option>Bank transfer</option><option>Company account</option></select><label class="sr-only" for="arrival-payment-amount">Payment amount</label><input id="arrival-payment-amount" v-model="paymentAmount" type="number" min="0.01" step="0.01" class="form-input mt-0" placeholder="Amount" /><button class="arrival-action-primary" :disabled="outstanding <= 0" @click="takePayment">Take payment</button></div>
          <label v-if="!selectedInHouse && canApproveCompanyBalance" class="mt-3 flex items-center gap-2 text-[9px] text-[#748187]"><input v-model="leaveBalanceOnAccount" type="checkbox" class="accent-[#7047a8]" /> Approve remaining balance on this company account</label>
          <p v-if="paymentError" class="mt-2 text-[9px] text-[#a25454]">{{ paymentError }}</p>
          <p v-else-if="selectedArrival.payments?.length" class="mt-2 text-[9px] text-[#6e7d81]">Last payment: {{ selectedArrival.payments[selectedArrival.payments.length - 1]?.method }} · ₱{{ selectedArrival.payments[selectedArrival.payments.length - 1]?.amount.toFixed(2) }}</p>
        </section>

        <section v-if="isCashBasisReservation(selectedArrival)" class="arrival-panel border-[#efd7a3] bg-[#fffdf7]">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-[12px] font-semibold text-[#785920]">Cash basis · Personal Account</h3><p class="mt-0.5 text-[9px] text-[#8c7b62]">No outlet, laundry, or room-service signing without a sufficient signing deposit. Unused deposit is refunded at checkout.</p></div><span class="rounded-full bg-[#fff0ce] px-2 py-1 text-[9px] font-semibold text-[#8b6726]">₱{{ (selectedArrival.cashBasisDepositBalance || 0).toFixed(2) }} available</span></div>
          <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_auto]"><label class="sr-only" for="signing-deposit-method">Signing deposit payment method</label><select id="signing-deposit-method" v-model="signingDepositMethod" class="form-input mt-0"><option>Cash</option><option>Card</option><option>Bank transfer</option><option>Mobile money</option></select><label class="sr-only" for="signing-deposit-amount">Signing deposit amount</label><input id="signing-deposit-amount" v-model="signingDepositAmount" type="number" min="0.01" step="0.01" class="form-input mt-0" placeholder="Additional deposit" /><button class="arrival-action-primary" @click="takeSigningDeposit">Record signing deposit</button></div>
          <p v-if="selectedArrival.cashBasisDepositAlert" role="status" class="mt-2 text-[9px] text-[#9a5555]">{{ selectedArrival.cashBasisDepositAlert }}</p><p v-if="signingDepositError" role="alert" class="mt-2 text-[9px] text-[#a25454]">{{ signingDepositError }}</p>
          <p v-if="selectedArrival.cashBasisDepositReceipts?.length" class="mt-2 text-[8px] text-[#7b6b51]">Last deposit received: ₱{{ selectedArrival.cashBasisDepositReceipts[selectedArrival.cashBasisDepositReceipts.length - 1]?.amount.toFixed(2) }} · {{ selectedArrival.cashBasisDepositReceipts[selectedArrival.cashBasisDepositReceipts.length - 1]?.method }}</p>
        </section>

        <section v-if="selectedInHouse && showCheckoutConfirm" class="checkout-confirm-panel">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-[13px] font-semibold text-[#34434a]">Check out {{ selectedArrival.guest }}?</h3><p class="mt-1 text-[10px] text-[#7b888c]">Room {{ selectedArrival.room }} · {{ formatDate(selectedArrival.checkIn) }} – {{ formatDate(selectedArrival.checkOut) }}</p></div><span class="rounded-full bg-[#f3edf8] px-2 py-1 text-[9px] font-medium text-[#65428e]">{{ selectedArrival.taxExempt ? 'Tax exempt' : 'VAT included' }}</span></div>
          <div class="my-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="financial-cell"><span>Subtotal</span><strong>₱{{ staySubtotal.toFixed(2) }}</strong></div><div class="financial-cell"><span>VAT · 21%</span><strong>₱{{ vatAmount.toFixed(2) }}</strong></div><div class="financial-cell"><span>Total paid</span><strong class="text-[#44815a]">₱{{ totalPaid.toFixed(2) }}</strong></div><div class="financial-cell"><span>Balance due</span><strong :class="outstanding > 0.005 ? 'text-[#a25454]' : 'text-[#44815a]'">₱{{ outstanding.toFixed(2) }}</strong></div></div>
          <p v-if="outstanding > 0.005 && canCheckoutWithBalance" class="flex items-center gap-2 text-[10px] text-[#52745a]"><Check :size="13" /> The approved company account will be billed for the remaining balance.</p>
          <p v-else-if="outstanding > 0.005" class="flex items-center gap-2 text-[10px] text-[#a25454]"><CircleAlert :size="13" /> Collect the full balance or approve it on an eligible company account before checkout.</p>
          <p v-else class="text-[10px] text-[#52745a]">This stay is settled. The room will be marked Dirty and sent to housekeeping.</p>
          <p v-if="(selectedArrival.cashBasisDepositBalance || 0) > 0" class="mt-2 rounded-md bg-[#fff8e8] px-3 py-2 text-[9px] text-[#785920]">Refund ₱{{ (selectedArrival.cashBasisDepositBalance || 0).toFixed(2) }} unused cash-basis signing deposit to the guest at checkout.</p>
          <p v-if="checkoutError" class="mt-2 text-[10px] text-[#a25454]">{{ checkoutError }}</p>
          <div class="mt-3 flex justify-end gap-2"><button class="secondary-button" @click="showCheckoutConfirm = false; checkoutError = ''">Back</button><button class="checkin-complete-button" :disabled="!checkoutAllowed" @click="completeCheckout"><Check :size="13" /> Check out</button></div>
        </section>

        <section v-if="!selectedInHouse" class="arrival-panel">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 class="text-[12px] font-semibold text-[#35444b]">4. Registration card</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Print a copy for the guest to review and sign.</p></div><button class="arrival-action" @click="printRegistration"><Printer :size="13" /> Print registration</button></div>
          <label class="mt-3 flex items-center gap-2 text-[10px] text-[#67757a]" :class="registrationPrinted ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"><input v-model="registrationSigned" type="checkbox" class="accent-[#7047a8]" :disabled="!registrationPrinted" /> Guest has signed the registration card</label>
          <p v-if="!registrationPrinted" class="mt-1 pl-5 text-[9px] text-[#9ba4a2]">Print the registration card before confirming the signature.</p>
        </section>

        <section v-if="!selectedInHouse" class="arrival-panel">
          <div><h3 class="text-[12px] font-semibold text-[#35444b]">5. Issue room key</h3><p class="mt-0.5 text-[9px] text-[#8c9798]">Hand the guest a key for room {{ roomDraft === 'Unassigned' ? '—' : roomDraft }}.</p></div>
          <label class="mt-3 flex items-center gap-2 text-[10px] text-[#67757a]" :class="roomConfirmed && selectedRoomReady ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'"><input v-model="keyIssued" type="checkbox" class="accent-[#7047a8]" :disabled="!roomConfirmed || !selectedRoomReady" /> I handed the guest their room key</label>
        </section>
      </div>
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceee9] px-5 py-3.5 sm:px-6"><span v-if="selectedInHouse" class="text-[9px] text-[#8d9897]">In-house stay · balance due ₱{{ outstanding.toFixed(2) }}</span><span v-else-if="selectedArrival.checkIn > today" class="text-[9px] text-[#8d9897]">Check-in will be available on {{ formatDate(selectedArrival.checkIn) }}.</span><span v-else class="text-[9px] text-[#8d9897]">{{ checkInReadinessMessage }}</span><div class="ml-auto flex gap-2"><button class="secondary-button" @click="selectedArrival = null">Close</button><button v-if="!selectedInHouse" class="checkin-complete-button" :disabled="!canCheckIn" @click="completeCheckIn"><Check :size="14" /> Check in guest</button></div></footer>
    </section>
  </div>

  <article v-if="selectedArrival && !selectedInHouse" class="registration-print">
    <header class="registration-print-header"><h1>CTHM Hotel</h1><p>Guest Registration Card<span v-if="selectedArrival.isVip"> · VIP</span></p></header>
    <h2>Guest details</h2><div class="registration-print-grid"><p><b>Guest name(s)</b><span>{{ [selectedArrival.guest, ...(selectedArrival.additionalGuests || [])].join(', ') }}</span></p><p><b>Reservation</b><span>{{ selectedArrival.id }}</span></p><p><b>Company affiliation</b><span>{{ selectedArrival.companyName || (selectedArrival.billingType === 'Company' ? selectedArrival.billingPerson : '—') }}</span></p><p><b>Billing person</b><span>{{ selectedArrival.billingPerson }}</span></p><p><b>Room</b><span>{{ roomConfirmed ? roomDraft : selectedArrival.room }}</span></p><p><b>Arrival date &amp; time</b><span>{{ formatDate(selectedArrival.checkIn) }} · {{ formatTime(selectedArrival.arrivalTime) }}</span></p><p><b>Departure</b><span>{{ formatDate(selectedArrival.checkOut) }}</span></p><p><b>Guests</b><span>{{ selectedArrival.guestCount || 1 }}</span></p><p><b>Rate per night</b><span>₱{{ selectedArrival.rate.toFixed(2) }}</span></p><p v-if="selectedArrival.isVip"><b>VIP amenities</b><span>{{ selectedArrival.vipHousekeepingNotes || 'Housekeeping to prepare VIP room amenities' }}</span></p><p v-if="selectedArrival.isVip"><b>Complimentary order</b><span>{{ (selectedArrival.vipComplimentaryItems || []).join(', ') || 'No item selected' }}<template v-if="selectedArrival.vipOrderNotes"> · {{ selectedArrival.vipOrderNotes }}</template></span></p></div>
    <div class="registration-print-terms"><h2>Guest acknowledgement</h2><p>I confirm that the details above are correct and agree to the hotel’s terms of stay.</p><div class="registration-signatures"><p>Guest signature <span></span></p><p>Date <span></span></p></div></div>
  </article>
</template>
