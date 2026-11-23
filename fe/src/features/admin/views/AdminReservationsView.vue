<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, BedDouble, CalendarDays, Check, CircleDollarSign, ClipboardList, Search, UsersRound, X } from '@lucide/vue'
import { dateKey, reservations, type Reservation, type ReservationStatus } from '@/features/front-office/stores/reservations'
import { guestScreeningList, type GuestScreeningRecord } from '@/features/front-office/stores/guestScreening'
import { housekeepingRooms, maintenanceRequests } from '@/features/housekeeping/stores/housekeeping'

const today = dateKey(new Date())
const steps = [
  { label: 'Guest', icon: UsersRound },
  { label: 'Stay', icon: CalendarDays },
  { label: 'Room', icon: BedDouble },
  { label: 'Rates & payment', icon: CircleDollarSign },
  { label: 'Extras & details', icon: ClipboardList },
  { label: 'Review', icon: Check },
]
const roomCatalog: Record<string, { rate: number; capacity: number }> = {
  Standard: { rate: 242, capacity: 2 },
  Deluxe: { rate: 423.5, capacity: 3 },
  Executive: { rate: 726, capacity: 4 },
}
const ratePlans = [
  { name: 'Standard Rate', multiplier: 1 },
  { name: 'Refundable Rate', multiplier: 1.05 },
  { name: 'Non-refundable Rate', multiplier: 0.9 },
  { name: 'Promotional Rate', multiplier: 0.85 },
  { name: 'Corporate Rate', multiplier: 0.95 },
]
const billSettlementMethods = ['Cash', 'Credit card', 'Traveler’s cheque', 'Company account', 'Voucher', 'Others']
const additionalChargeOptions = [
  { name: 'Late checkout', amount: 45 },
  { name: 'Early check-in', amount: 30 },
]
const extrasOptions = [
  { name: 'Extra bed', pricing: 'per room / night', amount: 25 },
  { name: 'Breakfast', pricing: 'per person / night', amount: 18 },
  { name: 'Airport transfer', pricing: 'one time', amount: 60 },
  { name: 'Swimming pool access', pricing: 'included', amount: 0 },
  { name: 'Additional cleaning', pricing: 'one time', amount: 15 },
]

function blankForm() {
  return {
    firstName: '', lastName: '', email: '', phone: '', landline: '', nationality: '', companyName: '', companyAddress: '', homeAddress: '',
    isForeignGuest: false, countryOfOrigin: '', passportNumber: '', passportIssuedAt: '', nextDestination: '', notedBy: '', screeningSupervisor: '',
    adults: 2, children: 0, infants: 0, specialRequests: '', screeningReviewed: false,
    additionalGuests: [] as string[],
    checkIn: today, checkOut: '', expectedArrivalTime: '15:00', roomType: 'Standard', numberOfRooms: 1,
    assignmentMethod: 'Automatic' as 'Automatic' | 'Manual', roomNumbers: [] as string[], preferredFloor: '', preferredBuilding: '', nearbyRooms: false,
    ratePlan: 'Standard Rate', discountType: 'Fixed' as 'Fixed' | 'Percentage', discountValue: 0, discountReason: '',
    additionalCharges: [] as string[], paymentMethod: '', billSettlementMethod: 'Cash', paymentOption: 'Pay at hotel' as 'Pay now' | 'Pay at hotel',
    depositRequired: 0, depositPaid: 0, transactionReference: '', bookingSource: 'Walk-in', groupBookingReference: '',
    internalNotes: '', commissionAmount: 0,
    selectedExtras: {} as Record<string, boolean>, extraQuantities: { 'Extra bed': 0, Breakfast: 0, 'Airport transfer': 0, 'Swimming pool access': 0, 'Additional cleaning': 0 } as Record<string, number>,
  }
}

const step = ref(0)
const form = ref(blankForm())
const showWizard = ref(false)
const wizardError = ref('')
const search = ref('')
const statusFilter = ref('All statuses')
const notice = ref('')
const showScreeningManager = ref(false)
const screeningDraft = ref({ fullName: '', reason: 'Unpaid bill / skipped payment', reference: '' })
const screeningFormError = ref('')
const guestScreeningCheckKey = ref('')

const roomTypes = computed(() => [...new Set(housekeepingRooms.value.map((room) => room.type))].filter((type) => roomCatalog[type]).sort())
const roomCount = computed(() => Math.max(1, Math.floor(Number(form.value.numberOfRooms) || 1)))
const guestsTotal = computed(() => Math.max(0, Number(form.value.adults) || 0) + Math.max(0, Number(form.value.children) || 0) + Math.max(0, Number(form.value.infants) || 0))
const additionalGuestNames = computed(() => form.value.additionalGuests.map((name) => name.trim()).filter(Boolean))
const namedGuestsForScreening = computed(() => [`${form.value.firstName} ${form.value.lastName}`.trim(), ...additionalGuestNames.value].filter(Boolean))
function normalizeGuestName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}
const guestScreeningVersion = computed(() => guestScreeningList.value.map((record) => `${record.id}:${record.fullName}:${record.reason}:${record.reference || ''}:${record.active}`).sort().join('|'))
const currentGuestScreeningCheckKey = computed(() => `${namedGuestsForScreening.value.map(normalizeGuestName).sort().join('|')}::${guestScreeningVersion.value}`)
const guestScreeningMatches = computed(() => {
  const guestNames = new Set(namedGuestsForScreening.value.map(normalizeGuestName))
  return guestScreeningList.value.filter((record) => record.active && guestNames.has(normalizeGuestName(record.fullName)))
})
const guestScreeningChecked = computed(() => Boolean(guestScreeningCheckKey.value) && guestScreeningCheckKey.value === currentGuestScreeningCheckKey.value)
const roomCapacity = computed(() => (roomCatalog[form.value.roomType]?.capacity || 0) * roomCount.value)
const nights = computed(() => {
  if (!form.value.checkIn || !form.value.checkOut || form.value.checkOut <= form.value.checkIn) return 0
  return Math.round((new Date(`${form.value.checkOut}T12:00:00`).getTime() - new Date(`${form.value.checkIn}T12:00:00`).getTime()) / 86400000)
})
const unavailableRoomNumbers = computed(() => {
  const typeRooms = housekeepingRooms.value.filter((room) => room.type === form.value.roomType
    && !room.outOfService
    && !maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed'))
  return typeRooms.filter((room) => reservations.value.some((reservation) => !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
    && (reservation.roomNumbers?.includes(room.number) || reservation.room === room.number)
    && form.value.checkIn < reservation.checkOut && form.value.checkOut > reservation.checkIn)).map((room) => room.number)
})
const availableRooms = computed(() => housekeepingRooms.value.filter((room) => room.type === form.value.roomType
  && !room.outOfService
  && !maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')
  && !unavailableRoomNumbers.value.includes(room.number)).sort((a, b) => {
    const preferredFloor = Number(form.value.preferredFloor)
    const floorPreference = preferredFloor ? Math.abs(a.floor - preferredFloor) - Math.abs(b.floor - preferredFloor) : a.floor - b.floor
    return floorPreference || a.number.localeCompare(b.number)
  }))
const typeCapacity = computed(() => housekeepingRooms.value.filter((room) => room.type === form.value.roomType
  && !room.outOfService
  && !maintenanceRequests.value.some((request) => request.room === room.number && request.status !== 'Completed')).length)
function reservationRoomType(reservation: Reservation) {
  return reservation.roomType || housekeepingRooms.value.find((room) => room.number === reservation.room)?.type || 'Standard'
}
const availableRoomCount = computed(() => {
  if (!nights.value) return 0
  let peakBookings = 0
  const cursor = new Date(`${form.value.checkIn}T12:00:00`)
  const departure = new Date(`${form.value.checkOut}T12:00:00`)
  while (cursor < departure) {
    const date = dateKey(cursor)
    const booked = reservations.value.filter((reservation) => !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)
      && reservationRoomType(reservation) === form.value.roomType
      && reservation.checkIn <= date && reservation.checkOut > date).length
    peakBookings = Math.max(peakBookings, booked)
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(0, Math.min(availableRooms.value.length, typeCapacity.value - peakBookings))
})
const planMultiplier = computed(() => ratePlans.find((plan) => plan.name === form.value.ratePlan)?.multiplier || 1)
const baseRate = computed(() => roomCatalog[form.value.roomType]?.rate || 0)
const occupancyRate = computed(() => Math.round(baseRate.value * (1 + Math.max(0, Number(form.value.adults) - 2) * 0.1) * 100) / 100)
const ratePerNight = computed(() => Math.round(occupancyRate.value * planMultiplier.value * 100) / 100)
const selectedAdditionalCharges = computed(() => additionalChargeOptions.filter((charge) => form.value.additionalCharges.includes(charge.name)))
const additionalChargesTotal = computed(() => selectedAdditionalCharges.value.reduce((sum, charge) => sum + charge.amount, 0))
const selectedExtras = computed(() => extrasOptions.filter((extra) => form.value.selectedExtras[extra.name] && Number(form.value.extraQuantities[extra.name]) > 0))
function extraAmount(extra: typeof extrasOptions[number]) {
  const quantity = Number(form.value.extraQuantities[extra.name]) || 0
  if (extra.name === 'Breakfast') return extra.amount * quantity * nights.value
  if (extra.name === 'Extra bed') return extra.amount * quantity * nights.value
  return extra.amount * quantity
}
const extrasTotal = computed(() => selectedExtras.value.reduce((sum, extra) => sum + extraAmount(extra), 0))
const roomSubtotal = computed(() => ratePerNight.value * nights.value * roomCount.value)
const preDiscountSubtotal = computed(() => roomSubtotal.value + additionalChargesTotal.value + extrasTotal.value)
const discountAmount = computed(() => {
  const requested = form.value.discountType === 'Percentage'
    ? preDiscountSubtotal.value * Math.max(0, Number(form.value.discountValue) || 0) / 100
    : Math.max(0, Number(form.value.discountValue) || 0)
  return Math.min(preDiscountSubtotal.value, Math.round(requested * 100) / 100)
})
const taxAmount = computed(() => Math.round((preDiscountSubtotal.value - discountAmount.value) * 0.21 * 100) / 100)
const totalAmount = computed(() => Math.round((preDiscountSubtotal.value - discountAmount.value + taxAmount.value) * 100) / 100)
const paidAmount = computed(() => form.value.paymentOption === 'Pay now' ? Math.max(0, Number(form.value.depositPaid) || 0) : 0)
const remainingAmount = computed(() => Math.max(0, Math.round((totalAmount.value - paidAmount.value) * 100) / 100))
const paymentStatus = computed(() => paidAmount.value <= 0 ? 'Unpaid' : paidAmount.value + 0.005 >= totalAmount.value ? 'Paid' : 'Partially paid')

const filteredReservations = computed(() => reservations.value.filter((reservation) => {
  const query = search.value.trim().toLowerCase()
  const searchable = `${reservation.id} ${reservation.confirmationNumber || ''} ${reservation.guest} ${reservation.roomType || ''} ${reservation.room}`.toLowerCase()
  const matchesQuery = !query || searchable.includes(query)
  const matchesStatus = statusFilter.value === 'All statuses' || reservation.status === statusFilter.value
  return matchesQuery && matchesStatus
}))
const statusOptions = computed(() => ['All statuses', ...new Set(reservations.value.map((reservation) => reservation.status))])

function money(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value)
}
function formatDate(value: string) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}
function reservationTotal(reservation: Reservation) {
  if (reservation.totalAmount !== undefined) return reservation.totalAmount
  const stayNights = Math.max(1, Math.round((new Date(`${reservation.checkOut}T12:00:00`).getTime() - new Date(`${reservation.checkIn}T12:00:00`).getTime()) / 86400000))
  return reservation.rate * stayNights + reservation.otherCharges
}
function housekeepingLabel(roomNumber: string) {
  const room = housekeepingRooms.value.find((item) => item.number === roomNumber)
  if (!room) return 'Not assigned'
  if (room.outOfService) return 'Out of service'
  if (room.taskState === 'Dirty') return 'Dirty'
  if (room.taskState === 'Cleaning') return 'Cleaning'
  if (room.taskState === 'Inspection') return 'Inspection'
  return 'Ready'
}
function openWizard() {
  form.value = blankForm()
  guestScreeningCheckKey.value = ''
  screeningFormError.value = ''
  form.value.checkOut = (() => { const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + 1); return dateKey(date) })()
  step.value = 0
  wizardError.value = ''
  notice.value = ''
  showWizard.value = true
}
function addAdditionalGuest() {
  form.value.additionalGuests.push('')
}
function removeAdditionalGuest(index: number) {
  form.value.additionalGuests.splice(index, 1)
}
function checkGuestScreening() {
  if (!namedGuestsForScreening.value.length || !normalizeGuestName(namedGuestsForScreening.value[0] || '')) {
    screeningFormError.value = 'Enter the primary guest name before checking the list.'
    return
  }
  guestScreeningCheckKey.value = currentGuestScreeningCheckKey.value
  form.value.screeningReviewed = false
  screeningFormError.value = ''
}
function addScreeningRecord() {
  const fullName = screeningDraft.value.fullName.trim().replace(/\s+/g, ' ')
  if (!fullName) {
    screeningFormError.value = 'Enter the guest’s full name to add a screening record.'
    return
  }
  guestScreeningList.value.unshift({
    id: `GSR-${Date.now()}`,
    fullName,
    reason: screeningDraft.value.reason,
    reference: screeningDraft.value.reference.trim() || undefined,
    active: true,
    addedAt: today,
  })
  screeningDraft.value = { fullName: '', reason: 'Unpaid bill / skipped payment', reference: '' }
  screeningFormError.value = ''
  guestScreeningCheckKey.value = ''
}
function removeScreeningRecord(id: GuestScreeningRecord['id']) {
  guestScreeningList.value = guestScreeningList.value.filter((record) => record.id !== id)
  guestScreeningCheckKey.value = ''
}
function validateStep(index: number) {
  const current = form.value
  if (index === 0) {
    if (!current.firstName.trim() || !current.lastName.trim() || !current.phone.trim() || !current.nationality.trim()) return 'Enter the guest’s first name, last name, nationality, and cellphone number.'
    if (current.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim())) return 'Enter a valid email address.'
    if (!Number.isInteger(Number(current.adults)) || Number(current.adults) < 1 || guestsTotal.value < 1) return 'At least one whole adult is required.'
    if (!Number.isInteger(Number(current.children)) || Number(current.children) < 0 || !Number.isInteger(Number(current.infants)) || Number(current.infants) < 0) return 'Children and infants must be whole numbers of zero or more.'
    if (additionalGuestNames.value.length + 1 > guestsTotal.value) return 'The named guest list is larger than the adults, children, and infants count.'
    if (current.isForeignGuest && (!current.nationality.trim() || !current.countryOfOrigin.trim() || !current.passportNumber.trim() || !current.passportIssuedAt.trim() || !current.nextDestination.trim())) return 'Complete the foreign guest nationality, origin, passport, issue location, and next destination.'
    if (!guestScreeningChecked.value) return 'Check every named guest against the guest screening list before continuing.'
    if (guestScreeningMatches.value.length && (!current.screeningReviewed || !current.screeningSupervisor.trim())) return 'Review the possible name match and record the supervisor who confirmed the guest’s identity.'
    if (current.bookingSource === 'Website' && (!current.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim()))) return 'Website reservations require a valid email address.'
  }
  if (index === 1 && (!current.checkIn || !current.checkOut || current.checkOut <= current.checkIn)) return 'Choose a check-out date after the check-in date.'
  if (index === 2) {
    if (!Number.isInteger(Number(current.numberOfRooms)) || Number(current.numberOfRooms) < 1) return 'Enter a whole number of rooms greater than zero.'
    if (guestsTotal.value < roomCount.value) return 'Assign at least one guest to each room.'
    if (availableRoomCount.value < roomCount.value) return `Only ${availableRoomCount.value} ${current.roomType} room(s) are available for these dates.`
    if (guestsTotal.value > roomCapacity.value) return `This selection accommodates up to ${roomCapacity.value} guests. Adjust guest or room count.`
    if (current.assignmentMethod === 'Manual' && current.roomNumbers.length !== roomCount.value) return `Select exactly ${roomCount.value} available room(s).`
    if (current.assignmentMethod === 'Manual' && current.roomNumbers.some((number) => !availableRooms.value.some((room) => room.number === number))) return 'One of the selected rooms is no longer available. Choose another room.'
  }
  if (index === 3) {
    if (!current.ratePlan) return 'Choose a rate plan.'
    if (!current.billSettlementMethod) return 'Choose a bill settlement method.'
    if (current.billSettlementMethod === 'Company account' && !current.companyName.trim()) return 'Enter the company name for company account settlement.'
    if (current.discountValue > 0 && !current.discountReason.trim()) return 'Enter a reason for the discount.'
    if (current.depositRequired < 0 || current.depositRequired > totalAmount.value) return 'Deposit required must be between zero and the reservation total.'
    if (current.paymentOption === 'Pay now') {
      if (!current.paymentMethod) return 'Choose a payment method for pay-now reservations.'
      if (paidAmount.value <= 0 || paidAmount.value > totalAmount.value) return 'Enter an amount to collect that is greater than zero and no more than the total.'
      if (current.depositRequired > 0 && paidAmount.value < current.depositRequired) return `Collect at least the required deposit of ${money(current.depositRequired)}.`
    }
  }
  if (index === 4) {
    if (!current.bookingSource) return 'Choose a booking source.'
    if (!current.notedBy.trim()) return 'Enter the desk clerk who noted this reservation.'
    if (['Website', 'Online Travel Agency'].includes(current.bookingSource) && (!current.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email.trim()))) return 'Online reservations require a valid email address.'
  }
  return ''
}
function nextStep() {
  wizardError.value = validateStep(step.value)
  if (!wizardError.value) step.value = Math.min(steps.length - 1, step.value + 1)
}
function previousStep() {
  wizardError.value = ''
  step.value = Math.max(0, step.value - 1)
}
function toggleCharge(name: string) {
  form.value.additionalCharges = form.value.additionalCharges.includes(name)
    ? form.value.additionalCharges.filter((charge) => charge !== name)
    : [...form.value.additionalCharges, name]
}
function roomAvailabilityLabel() {
  if (!nights.value) return 'Choose valid stay dates'
  return `${availableRoomCount.value} of ${typeCapacity.value} room(s) available`
}
function reservationStatusTone(status: ReservationStatus) {
  if (status === 'Confirmed' || status === 'In house') return 'admin-status-good'
  if (status === 'Pending' || status === 'Clash') return 'admin-status-wait'
  return 'admin-status-muted'
}
function createReservation() {
  wizardError.value = validateStep(5) || validateStep(4) || validateStep(3) || validateStep(2) || validateStep(1) || validateStep(0)
  if (wizardError.value) {
    step.value = wizardError.value.includes('guest') || wizardError.value.includes('contact') || wizardError.value.includes('email') ? 0
      : wizardError.value.includes('check-out') ? 1
        : wizardError.value.includes('room') || wizardError.value.includes('accommodates') || wizardError.value.includes('available') ? 2
          : wizardError.value.includes('rate') || wizardError.value.includes('deposit') || wizardError.value.includes('payment') || wizardError.value.includes('discount') || wizardError.value.includes('collect') || wizardError.value.includes('company account') || wizardError.value.includes('settlement') ? 3 : 4
    return
  }
  const assignedRooms = form.value.assignmentMethod === 'Manual'
    ? [...form.value.roomNumbers]
    : availableRooms.value.slice(0, availableRoomCount.value).slice(0, roomCount.value).map((room) => room.number)
  if (assignedRooms.length < roomCount.value) {
    wizardError.value = 'Room availability changed while this reservation was being created. Review the room assignment.'
    step.value = 2
    return
  }
  const highestId = Math.max(920, ...reservations.value.map((reservation) => Number(reservation.id.replace(/\D/g, '')) || 0))
  const groupId = roomCount.value > 1 ? `GRP-${String(highestId + 1).padStart(4, '0')}` : undefined
  const guest = `${form.value.firstName.trim()} ${form.value.lastName.trim()}`
  const namedGuests = [guest, ...additionalGuestNames.value]
  const splitCount = (total: number, index: number) => Math.floor(total / roomCount.value) + (index < total % roomCount.value ? 1 : 0)
  const receivedAt = new Date().toISOString()
  const split = (amount: number) => Math.round((amount / roomCount.value) * 100) / 100
  for (let index = 0; index < roomCount.value; index += 1) {
    const id = `RES-${String(highestId + index + 1).padStart(4, '0')}`
    const roomNumber = assignedRooms[index] || 'Unassigned'
    const roomGuestNames = namedGuests.filter((_, guestIndex) => guestIndex % roomCount.value === index)
    const roomLeadGuest = roomGuestNames[0] || guest
    const [roomFirstName = '', ...roomLastName] = roomLeadGuest.split(/\s+/)
    const paymentPart = split(paidAmount.value)
    const totalPart = split(totalAmount.value)
    const extras = selectedExtras.value.map((extra) => ({ name: extra.name, quantity: Number(form.value.extraQuantities[extra.name]) || 0, amount: split(extraAmount(extra)), pricing: extra.pricing }))
    const booking: Reservation = {
      id,
      groupId,
      billingPerson: form.value.billSettlementMethod === 'Company account' && form.value.companyName.trim() ? form.value.companyName.trim() : guest,
      billingType: form.value.billSettlementMethod === 'Company account' ? 'Company' : 'Guest',
      status: 'Confirmed',
      purpose: roomCount.value > 1 || form.value.groupBookingReference.trim() ? 'Group' : 'Leisure',
      room: roomNumber,
      roomNumbers: [roomNumber],
      roomType: form.value.roomType,
      checkIn: form.value.checkIn,
      arrivalTime: form.value.expectedArrivalTime,
      expectedArrivalTime: form.value.expectedArrivalTime,
      checkOut: form.value.checkOut,
      guest: roomLeadGuest,
      firstName: roomFirstName,
      lastName: roomLastName.join(' '),
      guestEmail: form.value.email.trim(),
      guestPhone: form.value.phone.trim(),
      guestLandline: form.value.landline.trim() || undefined,
      nationality: form.value.nationality.trim(),
      companyName: form.value.companyName.trim() || undefined,
      companyAddress: form.value.companyAddress.trim() || undefined,
      homeAddress: form.value.homeAddress.trim() || undefined,
      isForeignGuest: form.value.isForeignGuest,
      countryOfOrigin: form.value.isForeignGuest ? form.value.countryOfOrigin.trim() : undefined,
      passportNumber: form.value.isForeignGuest ? form.value.passportNumber.trim() : undefined,
      passportIssuedAt: form.value.isForeignGuest ? form.value.passportIssuedAt.trim() : undefined,
      nextDestination: form.value.isForeignGuest ? form.value.nextDestination.trim() : undefined,
      billSettlementMethod: form.value.billSettlementMethod,
      notedBy: form.value.notedBy.trim(),
      screeningSupervisor: guestScreeningMatches.value.length ? form.value.screeningSupervisor.trim() : undefined,
      remarks: [form.value.specialRequests.trim(), form.value.internalNotes.trim()].filter(Boolean).join(' · ') || undefined,
      rate: ratePerNight.value,
      otherCharges: split(extrasTotal.value),
      amountPaid: paymentPart,
      payments: paymentPart > 0 ? [{ method: form.value.paymentMethod, amount: paymentPart, receivedAt }] : [],
      guestCount: splitCount(guestsTotal.value, index),
      adults: splitCount(Number(form.value.adults), index),
      children: splitCount(Number(form.value.children), index),
      infants: splitCount(Number(form.value.infants), index),
      additionalGuests: roomGuestNames.slice(1),
      numberOfRooms: roomCount.value,
      assignmentMethod: form.value.assignmentMethod,
      preferredFloor: form.value.preferredFloor || undefined,
      preferredBuilding: form.value.preferredBuilding || undefined,
      nearbyRooms: form.value.nearbyRooms,
      roomCapacity: roomCatalog[form.value.roomType]?.capacity,
      housekeepingStatus: roomNumber === 'Unassigned' ? 'Not assigned' : housekeepingLabel(roomNumber),
      purposeDetails: form.value.specialRequests.trim() || undefined,
      ratePlan: form.value.ratePlan,
      occupancyRate: occupancyRate.value,
      discountType: Number(form.value.discountValue) > 0 ? form.value.discountType : undefined,
      discountValue: Number(form.value.discountValue) || undefined,
      discount: discountAmount.value > 0 ? { amount: split(discountAmount.value), reason: form.value.discountReason.trim() } : undefined,
      taxAmount: split(taxAmount.value),
      totalAmount: totalPart,
      paymentOption: form.value.paymentOption,
      paymentStatus: paymentStatus.value,
      depositRequired: split(Number(form.value.depositRequired) || 0),
      depositPaid: paymentPart,
      depositPaymentMethod: paymentPart > 0 ? form.value.paymentMethod : undefined,
      transactionReference: form.value.transactionReference.trim() || undefined,
      bookingDate: today,
      confirmationNumber: id,
      bookingSource: form.value.bookingSource,
      source: form.value.bookingSource,
      internalNotes: form.value.internalNotes.trim() || undefined,
      groupBookingReference: form.value.groupBookingReference.trim() || groupId,
      commissionAmount: split(Number(form.value.commissionAmount) || 0),
      extras,
      extrasTotal: split(extrasTotal.value),
      charges: selectedAdditionalCharges.value.map((charge) => ({ description: charge.name, date: today, amount: split(charge.amount), category: 'Service', status: 'Posted' as const })),
    }
    reservations.value.unshift(booking)
  }
  notice.value = `${roomCount.value} reservation${roomCount.value === 1 ? '' : 's'} confirmed for ${guest}.`
  showWizard.value = false
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h1 class="mt-2 font-serif text-[31px] tracking-[-.035em] text-[#293740] sm:text-[36px]">Reservations</h1><p class="mt-2 max-w-[620px] text-[11px] leading-5 text-[#7b888c]">Create and manage stays using the same reservation records used by front desk and public booking.</p></div>
      <div class="flex flex-wrap gap-2 self-start sm:self-auto"><button class="admin-secondary-button" @click="showScreeningManager = true; screeningFormError = ''"><Search :size="12" /> Guest screening list</button><button class="admin-primary-button" @click="openWizard"><span class="text-[14px] leading-none">+</span> New reservation</button></div>
    </div>

    <p v-if="notice" class="mt-5 flex items-center gap-2 rounded border border-[#dce9df] bg-[#f4faf5] px-3 py-2 text-[10px] text-[#587a61]"><Check :size="13" /> {{ notice }}<button class="ml-auto p-1 text-[#82968a]" aria-label="Dismiss message" @click="notice = ''"><X :size="13" /></button></p>

    <div class="mt-6 overflow-hidden rounded-md border border-[#e6e9e4] bg-white">
      <div class="flex flex-col gap-3 border-b border-[#eceee9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 class="text-[11px] font-semibold text-[#435159]">Reservation list</h2><p class="mt-0.5 text-[9px] text-[#929c9d]">{{ filteredReservations.length }} of {{ reservations.length }} stays</p></div><div class="flex flex-col gap-2 sm:flex-row"><label class="admin-search"><Search :size="13" /><input v-model="search" aria-label="Search reservations" placeholder="Search guest or booking" /></label><select v-model="statusFilter" class="admin-select" aria-label="Filter reservations by status"><option v-for="status in statusOptions" :key="status">{{ status }}</option></select></div></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1350px] border-collapse text-left"><thead><tr class="bg-[#fafbf9] text-[9px] uppercase tracking-[.08em] text-[#8f9999]"><th class="px-5 py-2.5 font-semibold">Confirmation</th><th class="px-3 py-2.5 font-semibold">Guest</th><th class="px-3 py-2.5 font-semibold">Stay</th><th class="px-3 py-2.5 font-semibold">Room number</th><th class="px-3 py-2.5 font-semibold">Room rate / night</th><th class="px-3 py-2.5 font-semibold">Deposit</th><th class="px-3 py-2.5 font-semibold">Remarks</th><th class="px-3 py-2.5 font-semibold">Total</th><th class="px-3 py-2.5 font-semibold">Reservation</th><th class="px-3 py-2.5 font-semibold">Payment</th></tr></thead><tbody>
        <tr v-for="reservation in filteredReservations" :key="reservation.id" class="border-t border-[#eef0ec]">
          <td class="px-5 py-3 font-mono text-[9px] font-medium text-[#73578e]">{{ reservation.confirmationNumber || reservation.id }}</td><td class="px-3 py-3 text-[10px] font-medium text-[#46545a]">{{ reservation.guest }}</td><td class="px-3 py-3 text-[9px] text-[#77858a]">{{ formatDate(reservation.checkIn) }} – {{ formatDate(reservation.checkOut) }}<span class="mt-1 block text-[8px] text-[#a0a9a7]">Arrives {{ reservation.expectedArrivalTime || reservation.arrivalTime }}</span></td><td class="px-3 py-3 text-[9px] text-[#77858a]">{{ reservation.roomNumbers?.filter((room) => room !== 'Unassigned').join(', ') || (reservation.room === 'Unassigned' ? 'Unassigned' : reservation.room) }}</td><td class="px-3 py-3 text-[9px] text-[#77858a]">{{ money(reservation.rate) }}</td><td class="px-3 py-3 text-[9px] text-[#77858a]">{{ reservation.depositPaid || reservation.depositRequired ? `${money(reservation.depositPaid || 0)} paid${reservation.depositRequired ? ` / ${money(reservation.depositRequired)} required` : ''}` : '—' }}</td><td class="max-w-[220px] px-3 py-3 text-[9px] text-[#77858a]">{{ reservation.remarks || reservation.purposeDetails || reservation.internalNotes || '—' }}</td><td class="px-3 py-3 text-[10px] text-[#46545a]">{{ money(reservationTotal(reservation)) }}</td><td class="px-3 py-3"><span class="admin-status" :class="reservationStatusTone(reservation.status)">{{ reservation.status }}</span></td><td class="px-3 py-3"><span class="admin-status" :class="reservation.paymentStatus === 'Paid' ? 'admin-status-good' : reservation.paymentStatus === 'Partially paid' ? 'admin-status-wait' : 'admin-status-neutral'">{{ reservation.paymentStatus || (reservation.amountPaid ? 'Paid' : 'Unpaid') }}</span></td>
        </tr>
        <tr v-if="!filteredReservations.length"><td colspan="10" class="px-4 py-12 text-center text-[10px] text-[#929c9d]">No matching reservations.</td></tr>
      </tbody></table></div>
      <footer class="border-t border-[#eceee9] bg-[#fcfcfb] px-5 py-3 text-[9px] text-[#9aa3a2]">Front office and public booking share this in-memory reservation list.</footer>
    </div>

    <div v-if="showScreeningManager" class="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#1b2024]/45 p-2 sm:p-5" @click.self="showScreeningManager = false">
      <section class="my-auto max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-lg border border-[#e4e7e1] bg-[#fffdfb] shadow-2xl" role="dialog" aria-modal="true" aria-label="Guest screening list">
        <header class="flex items-start justify-between border-b border-[#eceee9] px-4 py-3 sm:px-6"><div><p class="eyebrow">Front office · Staff review</p><h2 class="mt-1 font-serif text-[20px] text-[#35444b]">Guest screening list</h2></div><button class="rounded p-1.5 text-[#849092] hover:bg-[#f1f2ef]" aria-label="Close screening list" @click="showScreeningManager = false"><X :size="16" /></button></header>
        <div class="space-y-4 p-4 sm:p-6">
          <p class="rounded border border-[#e8ebe6] bg-[#fcfcfa] p-3 text-[9px] leading-4 text-[#748187]">Add only verified, documented incidents and keep references concise. Name matches require identity verification and supervisor review; a shared name alone is not a basis to deny a stay. This prototype keeps list entries in memory while the app is open.</p>
          <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="addScreeningRecord">
            <label class="admin-labeled-field"><span>Guest full name *</span><input v-model="screeningDraft.fullName" class="admin-form-control" autocomplete="off" required /></label>
            <label class="admin-labeled-field"><span>Verified reason *</span><select v-model="screeningDraft.reason" class="admin-form-control"><option>Unpaid bill / skipped payment</option><option>Verified criminal / legal record</option><option>Documented safety incident</option><option>Other verified concern</option></select></label>
            <label class="admin-labeled-field sm:col-span-2"><span>Incident / case reference</span><input v-model="screeningDraft.reference" class="admin-form-control" placeholder="Reference only; avoid unnecessary personal details" /></label>
            <p v-if="screeningFormError" class="sm:col-span-2 text-[9px] text-[#a25454]">{{ screeningFormError }}</p>
            <div class="sm:col-span-2 flex justify-end"><button type="submit" class="admin-primary-button">Add to screening list</button></div>
          </form>
          <section><div class="flex items-center justify-between border-b border-[#eceee9] pb-2"><h3 class="text-[10px] font-semibold text-[#52616a]">Current entries</h3><span class="text-[9px] text-[#929c9d]">{{ guestScreeningList.length }} record(s)</span></div>
            <div v-if="guestScreeningList.length" class="mt-2 divide-y divide-[#eef0ec]">
              <div v-for="record in guestScreeningList" :key="record.id" class="flex items-start justify-between gap-3 py-2.5"><div class="min-w-0"><p class="text-[10px] font-medium text-[#46545a]">{{ record.fullName }}</p><p class="mt-0.5 text-[9px] text-[#7c898c]">{{ record.reason }}<span v-if="record.reference"> · {{ record.reference }}</span></p><p class="mt-0.5 text-[8px] text-[#9aa3a2]">Added {{ formatDate(record.addedAt) }}</p></div><button type="button" class="shrink-0 text-[9px] text-[#a25454] hover:underline" @click="removeScreeningRecord(record.id)">Remove</button></div>
            </div>
            <p v-else class="py-6 text-center text-[9px] text-[#929c9d]">No entries yet. The guest name check will compare against records added here.</p>
          </section>
        </div>
      </section>
    </div>

    <div v-if="showWizard" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#1b2024]/45 p-2 sm:p-5" @click.self="showWizard = false">
      <section class="my-auto flex max-h-[96vh] w-full max-w-[980px] flex-col overflow-hidden rounded-lg border border-[#e4e7e1] bg-[#fffdfb] shadow-2xl" role="dialog" aria-modal="true" aria-label="New front office reservation">
        <header class="flex items-start justify-between border-b border-[#eceee9] px-4 py-3 sm:px-6 sm:py-4"><div><p class="eyebrow">Front office · New booking</p><h2 class="mt-1 font-serif text-[22px] text-[#35444b]">Create reservation</h2></div><button class="rounded p-1.5 text-[#849092] hover:bg-[#f1f2ef]" aria-label="Close reservation form" @click="showWizard = false"><X :size="17" /></button></header>
        <nav class="grid grid-cols-3 border-b border-[#eceee9] bg-white px-2 py-2 sm:grid-cols-6 sm:px-4" aria-label="Reservation steps">
          <button v-for="(item, index) in steps" :key="item.label" class="wizard-step" :class="step === index ? 'wizard-step-active' : step > index ? 'wizard-step-done' : ''" :aria-current="step === index ? 'step' : undefined" @click="index < step ? (step = index, wizardError = '') : undefined"><span class="wizard-step-number"><Check v-if="step > index" :size="12" /><component v-else :is="item.icon" :size="13" /></span><span class="truncate">{{ item.label }}</span></button>
        </nav>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <template v-if="step === 0">
            <div class="wizard-section-title"><h3>Guest information</h3><p>Contact and party details for the primary guest.</p></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="admin-labeled-field"><span>First name *</span><input v-model="form.firstName" class="admin-form-control" autocomplete="given-name" required /></label><label class="admin-labeled-field"><span>Last name *</span><input v-model="form.lastName" class="admin-form-control" autocomplete="family-name" required /></label>
              <label class="admin-labeled-field"><span>Nationality *</span><input v-model="form.nationality" class="admin-form-control" autocomplete="country-name" required /></label><label class="admin-labeled-field"><span>Landline</span><input v-model="form.landline" type="tel" class="admin-form-control" autocomplete="tel" /></label>
              <label class="admin-labeled-field"><span>Cellphone number *</span><input v-model="form.phone" type="tel" class="admin-form-control" autocomplete="tel" required /></label><label class="admin-labeled-field"><span>Email address</span><input v-model="form.email" type="email" class="admin-form-control" autocomplete="email" /></label>
              <label class="admin-labeled-field sm:col-span-2"><span>Home address</span><input v-model="form.homeAddress" class="admin-form-control" autocomplete="street-address" /></label>
              <section class="sm:col-span-2 rounded border border-[#e8ebe6] bg-[#fcfcfa] p-3"><h4 class="text-[10px] font-semibold text-[#52616a]">Company information</h4><div class="mt-2 grid gap-3 sm:grid-cols-2"><label class="admin-labeled-field"><span>Company name</span><input v-model="form.companyName" class="admin-form-control" autocomplete="organization" /></label><label class="admin-labeled-field"><span>Company address</span><input v-model="form.companyAddress" class="admin-form-control" autocomplete="organization-street-address" /></label></div></section>
              <section class="sm:col-span-2 rounded border border-[#e8ebe6] bg-[#fcfcfa] p-3"><label class="flex items-center gap-2 text-[10px] font-medium text-[#52616a]"><input v-model="form.isForeignGuest" type="checkbox" class="accent-[#7047a8]" /> Foreign guest</label><div v-if="form.isForeignGuest" class="mt-3 grid gap-3 sm:grid-cols-2"><label class="admin-labeled-field"><span>Country of origin *</span><input v-model="form.countryOfOrigin" class="admin-form-control" autocomplete="country-name" /></label><label class="admin-labeled-field"><span>Passport number *</span><input v-model="form.passportNumber" class="admin-form-control" autocomplete="off" /></label><label class="admin-labeled-field"><span>Passport issued at *</span><input v-model="form.passportIssuedAt" class="admin-form-control" /></label><label class="admin-labeled-field"><span>Next destination *</span><input v-model="form.nextDestination" class="admin-form-control" /></label></div></section>
              <label class="admin-labeled-field"><span>Adults *</span><input v-model.number="form.adults" type="number" min="1" max="20" class="admin-form-control" /></label><label class="admin-labeled-field"><span>Children</span><input v-model.number="form.children" type="number" min="0" max="20" class="admin-form-control" /></label><label class="admin-labeled-field"><span>Infants</span><input v-model.number="form.infants" type="number" min="0" max="20" class="admin-form-control" /></label>
              <section class="sm:col-span-2 rounded border border-[#e8ebe6] bg-[#fcfcfa] p-3">
                <div class="flex flex-wrap items-center justify-between gap-2"><div><h4 class="text-[10px] font-semibold text-[#52616a]">Additional guests</h4><p class="mt-0.5 text-[9px] text-[#929c9d]">Add the names of other people staying with the primary guest.</p></div><button type="button" class="admin-secondary-button" @click="addAdditionalGuest"><UsersRound :size="12" /> Add guest</button></div>
                <div v-if="form.additionalGuests.length" class="mt-3 grid gap-2 sm:grid-cols-2">
                  <div v-for="(_, index) in form.additionalGuests" :key="index" class="flex items-end gap-2"><label class="admin-labeled-field flex-1"><span>Guest {{ index + 2 }} name</span><input v-model="form.additionalGuests[index]" class="admin-form-control" :aria-label="`Guest ${index + 2} name`" placeholder="Full name" /></label><button type="button" class="mb-px rounded border border-[#ece3e2] px-2 py-2 text-[9px] text-[#a25454] hover:bg-[#fff6f3]" :aria-label="`Remove guest ${index + 2}`" @click="removeAdditionalGuest(index)">Remove</button></div>
                </div>
              </section>
              <section class="sm:col-span-2 rounded border border-[#e8ebe6] bg-[#fcfcfa] p-3" aria-label="Guest name screening">
                <div class="flex flex-wrap items-center justify-between gap-2"><div><h4 class="text-[10px] font-semibold text-[#52616a]">Guest screening check *</h4><p class="mt-0.5 text-[9px] text-[#929c9d]">Check all named guests against the current in-app list before continuing.</p></div><button type="button" class="admin-secondary-button" @click="checkGuestScreening"><Search :size="12" /> Check guest names</button></div>
                <p v-if="screeningFormError" class="mt-2 text-[9px] text-[#a25454]">{{ screeningFormError }}</p>
                <p v-else-if="guestScreeningChecked && !guestScreeningMatches.length" class="mt-2 text-[9px] font-medium text-[#39764f]">Check complete: no exact-name matches in the screening list.</p>
                <div v-else-if="guestScreeningChecked && guestScreeningMatches.length" class="mt-3 rounded border border-[#f1d2a8] bg-[#fff9ed] p-3">
                  <p class="text-[10px] font-semibold text-[#805d26]">Possible exact-name match — verify identity before deciding.</p>
                  <ul class="mt-2 space-y-1 text-[9px] text-[#765f3d]"><li v-for="record in guestScreeningMatches" :key="record.id"><strong>{{ record.fullName }}</strong> · {{ record.reason }}<span v-if="record.reference"> · {{ record.reference }}</span></li></ul>
                  <p class="mt-2 text-[9px] leading-4 text-[#765f3d]">A shared name alone does not confirm identity or determine eligibility. Check the guest’s identity and follow hotel policy.</p>
                  <label class="mt-3 flex items-start gap-2 text-[9px] text-[#684e2b]"><input v-model="form.screeningReviewed" type="checkbox" class="mt-0.5 accent-[#7047a8]" /> I verified the guest’s identity and received supervisor approval to proceed.</label>
                  <label class="admin-labeled-field mt-3 block"><span>Supervisor name *</span><input v-model="form.screeningSupervisor" class="admin-form-control" autocomplete="name" /></label>
                </div>
                <p v-else class="mt-2 text-[9px] text-[#929c9d]">No check recorded yet. A name check is required before you can continue.</p>
              </section>
              <label class="admin-labeled-field sm:col-span-2"><span>Special requests</span><textarea v-model="form.specialRequests" rows="3" class="admin-form-control h-auto py-2" placeholder="Requests to share with the hotel team" /></label>
            </div>
          </template>

          <template v-else-if="step === 1">
            <div class="wizard-section-title"><h3>Stay details</h3><p>Choose stay dates and the expected arrival time.</p></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="admin-labeled-field"><span>Check-in date *</span><input v-model="form.checkIn" type="date" :min="today" class="admin-form-control" /></label><label class="admin-labeled-field"><span>Check-out date *</span><input v-model="form.checkOut" type="date" :min="form.checkIn" class="admin-form-control" /></label>
              <label class="admin-labeled-field"><span>Expected arrival time</span><input v-model="form.expectedArrivalTime" type="time" class="admin-form-control" /></label><div class="rounded border border-[#eceee9] bg-[#fafbf9] px-3 py-2"><span class="block text-[9px] text-[#879294]">Number of nights</span><strong class="mt-1 block text-[16px] font-medium text-[#45545a]">{{ nights }}</strong></div>
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2"><div class="wizard-note"><Check :size="13" /><span>Actual check-in time is recorded by the system when the guest checks in.</span></div><div class="wizard-note"><Check :size="13" /><span>Actual check-out time is recorded when the guest checks out.</span></div></div>
          </template>

          <template v-else-if="step === 2">
            <div class="wizard-section-title"><h3>Room selection and assignment</h3><p>Choose the room type first; assign physical rooms manually or let the system select available rooms.</p></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="admin-labeled-field"><span>Room type *</span><select v-model="form.roomType" class="admin-form-control"><option v-for="type in roomTypes" :key="type">{{ type }}</option></select></label><label class="admin-labeled-field"><span>Number of rooms *</span><input v-model.number="form.numberOfRooms" type="number" min="1" :max="Math.max(1, typeCapacity)" class="admin-form-control" /></label>
              <label class="admin-labeled-field"><span>Assignment method</span><select v-model="form.assignmentMethod" class="admin-form-control"><option>Automatic</option><option>Manual</option></select></label><label class="admin-labeled-field"><span>Preferred floor</span><select v-model="form.preferredFloor" class="admin-form-control"><option value="">No preference</option><option v-for="floor in [...new Set(housekeepingRooms.map((room) => room.floor))].sort()" :key="floor" :value="String(floor)">Floor {{ floor }}</option></select></label>
              <label class="admin-labeled-field"><span>Preferred building</span><select v-model="form.preferredBuilding" class="admin-form-control"><option value="">No preference</option><option>Main building</option></select></label>
              <label v-if="form.assignmentMethod === 'Manual'" class="admin-labeled-field sm:col-span-2"><span>Room number(s) · select {{ roomCount }} available</span><select v-model="form.roomNumbers" multiple size="5" class="admin-form-control h-auto py-2"><option v-for="room in availableRooms" :key="room.number" :value="room.number">Room {{ room.number }} · floor {{ room.floor }} · {{ housekeepingLabel(room.number) }}</option></select></label>
              <label class="flex items-center gap-2 rounded border border-[#e8ebe6] px-3 py-2 text-[9px] text-[#67757a]"><input v-model="form.nearbyRooms" type="checkbox" class="accent-[#7047a8]" /> Keep assigned rooms near one another</label>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="wizard-info"><span>Room capacity</span><strong>{{ roomCapacity }} guests</strong></div><div class="wizard-info"><span>Availability</span><strong>{{ roomAvailabilityLabel() }}</strong></div><div class="wizard-info"><span>Housekeeping</span><strong>{{ form.assignmentMethod === 'Manual' && form.roomNumbers.length ? form.roomNumbers.map(housekeepingLabel).join(', ') : 'Shown per room' }}</strong></div><div class="wizard-info"><span>Assignment</span><strong>{{ form.assignmentMethod }}</strong></div></div>
            <p v-if="form.assignmentMethod === 'Automatic'" class="mt-3 text-[9px] text-[#919c9a]">Rooms {{ availableRooms.slice(0, availableRoomCount).slice(0, roomCount).map((room) => room.number).join(', ') || 'will be assigned after dates are valid' }} will be assigned automatically if available.</p>
          </template>

          <template v-else-if="step === 3">
            <div class="wizard-section-title"><h3>Rates, discounts and payment</h3><p>Reservation and payment statuses are tracked separately.</p></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="admin-labeled-field"><span>Rate plan *</span><select v-model="form.ratePlan" class="admin-form-control"><option v-for="plan in ratePlans" :key="plan.name">{{ plan.name }}</option></select></label><label class="admin-labeled-field"><span>Base room rate / night</span><div class="admin-form-control flex items-center bg-[#f8f9f6]">{{ money(baseRate) }} · computed</div></label>
              <div class="wizard-info"><span>Occupancy-adjusted rate / night</span><strong>{{ money(occupancyRate) }}</strong></div><div class="wizard-info"><span>Rate plan rate / night</span><strong>{{ money(ratePerNight) }}</strong></div>
              <label class="admin-labeled-field"><span>Discount type</span><select v-model="form.discountType" class="admin-form-control"><option>Fixed</option><option>Percentage</option></select></label><label class="admin-labeled-field"><span>Discount {{ form.discountType === 'Percentage' ? '(%)' : 'amount' }}</span><input v-model.number="form.discountValue" type="number" min="0" :max="form.discountType === 'Percentage' ? 100 : preDiscountSubtotal" step="0.01" class="admin-form-control" /></label>
              <label class="admin-labeled-field sm:col-span-2"><span>Discount reason {{ form.discountValue > 0 ? '*' : '' }}</span><input v-model="form.discountReason" class="admin-form-control" placeholder="Required when applying a discount" /></label>
              <fieldset class="sm:col-span-2"><legend class="mb-2 text-[9px] font-medium text-[#6f7d81]">Additional charges</legend><div class="grid gap-2 sm:grid-cols-2"><label v-for="charge in additionalChargeOptions" :key="charge.name" class="flex items-center justify-between rounded border border-[#e8ebe6] px-3 py-2 text-[9px] text-[#67757a]"><span class="flex items-center gap-2"><input type="checkbox" :checked="form.additionalCharges.includes(charge.name)" class="accent-[#7047a8]" @change="toggleCharge(charge.name)" />{{ charge.name }}</span><span>{{ money(charge.amount) }}</span></label></div></fieldset>
              <label class="admin-labeled-field"><span>Bill settlement *</span><select v-model="form.billSettlementMethod" class="admin-form-control"><option v-for="method in billSettlementMethods" :key="method">{{ method }}</option></select></label>
              <label class="admin-labeled-field"><span>Payment option *</span><select v-model="form.paymentOption" class="admin-form-control"><option>Pay at hotel</option><option>Pay now</option></select></label><label v-if="form.paymentOption === 'Pay now'" class="admin-labeled-field"><span>Payment method *</span><select v-model="form.paymentMethod" class="admin-form-control"><option value="">Choose method</option><option>Card</option><option>Cash</option><option>Mobile money</option><option>Bank transfer</option></select></label>
              <label class="admin-labeled-field"><span>Deposit required</span><input v-model.number="form.depositRequired" type="number" min="0" :max="totalAmount" step="0.01" class="admin-form-control" /></label><label v-if="form.paymentOption === 'Pay now'" class="admin-labeled-field"><span>Deposit / amount paid now *</span><input v-model.number="form.depositPaid" type="number" min="0" :max="totalAmount" step="0.01" class="admin-form-control" /></label>
              <label class="admin-labeled-field"><span>Transaction reference</span><input v-model="form.transactionReference" class="admin-form-control" /></label><label class="admin-labeled-field"><span>Commission amount</span><input v-model.number="form.commissionAmount" type="number" min="0" step="0.01" class="admin-form-control" /></label>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="wizard-info"><span>Reservation status</span><strong class="text-[#557960]">Confirmed on save</strong></div><div class="wizard-info"><span>Payment status</span><strong>{{ paymentStatus }}</strong></div><div class="wizard-info"><span>Taxes & fees · 21%</span><strong>{{ money(taxAmount) }}</strong></div><div class="wizard-info"><span>Remaining balance</span><strong>{{ money(remainingAmount) }}</strong></div></div>
            <div class="mt-3 flex flex-wrap justify-between gap-2 rounded bg-[#f8f8f5] px-3 py-2 text-[9px] text-[#65737a]"><span>Subtotal {{ money(preDiscountSubtotal) }}<template v-if="discountAmount"> · Discount −{{ money(discountAmount) }}</template></span><strong class="text-[#3e4e54]">Total {{ money(totalAmount) }}</strong></div>
          </template>

          <template v-else-if="step === 4">
            <div class="wizard-section-title"><h3>Extras and additional details</h3><p>Choose offered services and record the booking source and internal notes.</p></div>
            <div class="mt-4 grid gap-2 sm:grid-cols-2">
              <div v-for="extra in extrasOptions" :key="extra.name" class="flex items-center gap-2 rounded border border-[#e8ebe6] px-3 py-2"><input v-model="form.selectedExtras[extra.name]" type="checkbox" class="accent-[#7047a8]" :aria-label="`Add ${extra.name}`" /><span class="min-w-0 flex-1"><strong class="block text-[9px] font-medium text-[#59686d]">{{ extra.name }}</strong><span class="mt-0.5 block text-[8px] text-[#9aa3a2]">{{ extra.amount ? `${money(extra.amount)} · ${extra.pricing}` : extra.pricing }}</span></span><input v-if="extra.amount > 0 && form.selectedExtras[extra.name]" v-model.number="form.extraQuantities[extra.name]" type="number" min="1" class="w-14 rounded border border-[#e2e6e0] px-2 py-1 text-[9px]" aria-label="Quantity" /></div>
            </div>
            <div class="mt-3 flex justify-between rounded bg-[#f8f8f5] px-3 py-2 text-[9px] text-[#65737a]"><span>Extras total</span><strong>{{ money(extrasTotal) }}</strong></div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2"><label class="admin-labeled-field"><span>Booking source *</span><select v-model="form.bookingSource" class="admin-form-control"><option>Website</option><option>Walk-in</option><option>Phone</option><option>Travel Agency</option><option>Online Travel Agency</option><option>Corporate</option></select></label><label class="admin-labeled-field"><span>Noted by (desk clerk) *</span><input v-model="form.notedBy" class="admin-form-control" autocomplete="name" required /></label><label class="admin-labeled-field"><span>Group booking reference</span><input v-model="form.groupBookingReference" class="admin-form-control" placeholder="Optional group code" /></label><label class="admin-labeled-field sm:col-span-2"><span>Internal notes</span><textarea v-model="form.internalNotes" rows="3" class="admin-form-control h-auto py-2" placeholder="Front office only" /></label></div>
            <p class="mt-3 text-[9px] text-[#929c9d]">Booking date is set to today. A confirmation number is generated when you confirm. Actual check-in and check-out times are recorded by the front desk workflow.</p>
          </template>

          <template v-else>
            <div class="wizard-section-title"><h3>Review and confirm</h3><p>Review the stay and totals before creating the reservation.</p></div>
            <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_300px]">
              <div class="space-y-3">
                <section class="wizard-review-card"><h4>Guest</h4><p class="mt-2 text-[11px] font-semibold text-[#46545a]">{{ form.firstName }} {{ form.lastName }}</p><p class="mt-1 text-[9px] text-[#7c898c]">{{ form.nationality }} · {{ form.email || 'No email provided' }} · {{ form.phone }}<span v-if="form.landline"> · Landline {{ form.landline }}</span></p><p v-if="form.homeAddress" class="mt-1 text-[9px] text-[#7c898c]">Home address: {{ form.homeAddress }}</p><p v-if="form.companyName" class="mt-1 text-[9px] text-[#7c898c]">Company: {{ form.companyName }}<span v-if="form.companyAddress"> · {{ form.companyAddress }}</span></p><p v-if="form.isForeignGuest" class="mt-1 text-[9px] text-[#7c898c]">Foreign guest · {{ form.countryOfOrigin }} · Passport {{ form.passportNumber }} · Issued at {{ form.passportIssuedAt }} · Next destination {{ form.nextDestination }}</p><p class="mt-1 text-[9px] text-[#7c898c]">{{ form.adults }} adults · {{ form.children }} children · {{ form.infants }} infants</p><p v-if="additionalGuestNames.length" class="mt-2 text-[9px] text-[#7c898c]">Additional guests: {{ additionalGuestNames.join(', ') }}</p><p v-if="form.specialRequests || form.internalNotes" class="mt-2 text-[9px] text-[#7c898c]">Remarks: {{ [form.specialRequests, form.internalNotes].filter(Boolean).join(' · ') }}</p><p class="mt-2 text-[9px] text-[#7c898c]">Noted by {{ form.notedBy }}<span v-if="form.screeningSupervisor"> · Screening reviewed by {{ form.screeningSupervisor }}</span></p></section>
                <section class="wizard-review-card"><h4>Stay & room</h4><p class="mt-2 text-[10px] text-[#46545a]">{{ formatDate(form.checkIn) }} – {{ formatDate(form.checkOut) }} · {{ nights }} night(s)</p><p class="mt-1 text-[9px] text-[#7c898c]">{{ form.roomType }} · {{ roomCount }} room(s) · {{ form.assignmentMethod === 'Manual' ? form.roomNumbers.map((room) => `Room ${room}`).join(', ') : availableRooms.slice(0, roomCount).map((room) => `Room ${room.number}`).join(', ') }}</p><p class="mt-1 text-[9px] text-[#7c898c]">Expected arrival {{ form.expectedArrivalTime }} · {{ form.nearbyRooms ? 'Keep rooms near one another' : 'No nearby-room request' }}</p></section>
                <section class="wizard-review-card"><h4>Rate & extras</h4><p class="mt-2 text-[9px] text-[#7c898c]">{{ form.ratePlan }} · {{ money(ratePerNight) }} / night · {{ money(discountAmount) }} discount</p><p class="mt-1 text-[9px] text-[#7c898c]">Settlement: {{ form.billSettlementMethod }}<span v-if="form.companyName && form.billSettlementMethod === 'Company account'"> · {{ form.companyName }}</span></p><p class="mt-1 text-[9px] text-[#7c898c]">{{ selectedExtras.map((extra) => extra.name).join(', ') || 'No extras selected' }}</p><p class="mt-1 text-[9px] text-[#7c898c]">Source: {{ form.bookingSource }}<span v-if="form.groupBookingReference"> · Group: {{ form.groupBookingReference }}</span></p></section>
              </div>
              <section class="wizard-review-total"><p class="text-[9px] uppercase tracking-[.11em] text-white/55">Reservation summary</p><div class="mt-4 flex justify-between text-[9px] text-white/70"><span>{{ roomCount }} room(s) · {{ nights }} night(s)</span><span>{{ money(roomSubtotal) }}</span></div><div class="mt-2 flex justify-between text-[9px] text-white/70"><span>Additional charges & extras</span><span>{{ money(additionalChargesTotal + extrasTotal) }}</span></div><div class="mt-2 flex justify-between text-[9px] text-white/70"><span>Discount</span><span>−{{ money(discountAmount) }}</span></div><div class="mt-2 flex justify-between text-[9px] text-white/70"><span>Taxes & fees</span><span>{{ money(taxAmount) }}</span></div><div class="mt-3 flex justify-between border-t border-white/15 pt-3 text-[11px] font-semibold"><span>Total</span><span>{{ money(totalAmount) }}</span></div><div class="mt-3 flex justify-between text-[9px] text-white/70"><span>Settlement · {{ form.billSettlementMethod }}</span><span>{{ paymentStatus }}</span></div><div class="mt-1 flex justify-between text-[9px] text-white/70"><span>Deposit paid / required</span><span>{{ money(paidAmount) }} / {{ money(form.depositRequired) }}</span></div><div class="mt-1 flex justify-between text-[9px] text-white/70"><span>Remaining balance</span><span>{{ money(remainingAmount) }}</span></div><p class="mt-4 text-[8px] leading-4 text-white/45">Reservation status will be Confirmed. Payment status remains {{ paymentStatus }}.</p></section>
            </div>
          </template>
          <p v-if="wizardError" class="mt-4 rounded border border-[#f0d9d3] bg-[#fff6f3] px-3 py-2 text-[9px] text-[#a25454]">{{ wizardError }}</p>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-[#eceee9] bg-white px-4 py-3 sm:px-6"><span class="text-[9px] text-[#9aa3a2]">Step {{ step + 1 }} of {{ steps.length }}</span><div class="flex gap-2"><button v-if="step > 0" class="admin-secondary-button" @click="previousStep"><ArrowLeft :size="12" /> Previous</button><button v-if="step < steps.length - 1" class="admin-primary-button" @click="nextStep">Next <ArrowRight :size="12" /></button><button v-else class="admin-primary-button" @click="createReservation"><Check :size="13" /> Confirm reservation</button></div></footer>
      </section>
    </div>
  </section>
</template>
