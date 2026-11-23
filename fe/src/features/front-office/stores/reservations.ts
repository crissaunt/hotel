import { ref } from 'vue'

export type ReservationStatus = 'Pending' | 'Confirmed' | 'In house' | 'Checked out' | 'Clash' | 'Cancelled' | 'No show'
export type FolioCharge = {
  id?: string
  description: string
  date: string
  amount: number
  category?: string
  outlet?: string
  postedBy?: string
  reference?: string
  status?: 'Posted' | 'Voided' | 'Moved' | 'Split'
  voidReason?: string
  voidedAt?: string
  movedToReservationId?: string
  movedFromReservationId?: string
  originalAmount?: number
}
export type FolioPayment = { method: string; amount: number; receivedAt: string; corporateBatchId?: string }
export type CashBasisDepositEntry = { amount: number; method: string; receivedAt: string; reference?: string }
export type ReservationPaymentStatus = 'Unpaid' | 'Partially paid' | 'Paid'
export type Reservation = {
  id: string
  groupId?: string
  billingPerson: string
  billingType: 'Guest' | 'Company' | 'Third party'
  status: ReservationStatus
  purpose: 'Leisure' | 'Business' | 'Group'
  room: string
  roomType?: string
  checkIn: string
  arrivalTime: string
  checkOut: string
  guest: string
  firstName?: string
  lastName?: string
  guestEmail?: string
  guestPhone?: string
  guestLandline?: string
  nationality?: string
  companyName?: string
  companyAddress?: string
  homeAddress?: string
  isForeignGuest?: boolean
  countryOfOrigin?: string
  passportNumber?: string
  passportIssuedAt?: string
  nextDestination?: string
  billSettlementMethod?: string
  notedBy?: string
  screeningSupervisor?: string
  remarks?: string
  rate: number
  otherCharges: number
  amountPaid?: number
  payments?: FolioPayment[]
  checkedInAt?: string
  identityType?: 'Passport' | 'National ID' | 'Driver’s license' | 'Other'
  identityVerified?: boolean
  guestIdNumber?: string
  guestIdIssuedAt?: string
  isVip?: boolean
  vipHousekeepingNotes?: string
  vipComplimentaryItems?: string[]
  vipOrderNotes?: string
  cashBasis?: boolean
  cashBasisDepositBalance?: number
  cashBasisDepositReceipts?: CashBasisDepositEntry[]
  cashBasisDepositRefunds?: CashBasisDepositEntry[]
  cashBasisDepositAlert?: string
  signingPrivilege?: boolean
  signingAuthorizationBy?: string
  signingAuthorizationReference?: string
  paymentGuarantee?: 'Deposit received' | 'Card pre-authorized' | 'Company account' | 'Not required'
  paymentGuaranteeReference?: string
  keyIssued?: boolean
  charges?: FolioCharge[]
  roomCharges?: FolioCharge[]
  discount?: { amount: number; reason: string }
  wakeUpCalls?: { date: string; time: string; note: string; status: 'Scheduled' | 'Completed' | 'Cancelled' }[]
  balanceOnAccount?: boolean
  checkedOutAt?: string
  finalBill?: { subtotal: number; vatRate: number; vat: number; total: number }
  additionalGuests?: string[]
  guestCount?: number
  adults?: number
  children?: number
  infants?: number
  numberOfRooms?: number
  roomNumbers?: string[]
  assignmentMethod?: 'Automatic' | 'Manual'
  preferredFloor?: string
  preferredBuilding?: string
  nearbyRooms?: boolean
  roomCapacity?: number
  housekeepingStatus?: string
  expectedArrivalTime?: string
  actualCheckOutAt?: string
  ratePlan?: string
  occupancyRate?: number
  discountType?: 'Fixed' | 'Percentage'
  discountValue?: number
  taxAmount?: number
  totalAmount?: number
  paymentOption?: 'Pay now' | 'Pay at hotel'
  paymentStatus?: ReservationPaymentStatus
  depositRequired?: number
  depositPaid?: number
  depositPaymentMethod?: string
  transactionReference?: string
  bookingDate?: string
  confirmationNumber?: string
  bookingSource?: string
  internalNotes?: string
  groupBookingReference?: string
  commissionAmount?: number
  extras?: { name: string; quantity: number; amount: number; pricing: string }[]
  extrasTotal?: number
  purposeDetails?: string
  source?: string
  taxExempt?: boolean
  taxExemptionRef?: string
  roomTransferHistory?: { fromRoom: string; toRoom: string; date: string; reason: string }[]
}

// Rooms checked out by the front desk are held in Dirty until housekeeping updates them.
export const housekeepingRooms = ref<string[]>([])
export const housekeepingCleaningRooms = ref<string[]>([])
export const housekeepingReadyRooms = ref<string[]>([])

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dayOffset(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return dateKey(date)
}

export const reservations = ref<Reservation[]>([
  { id: 'RES-0920', billingPerson: 'Difa Amenyo', billingType: 'Guest', status: 'No show', purpose: 'Leisure', room: '105', checkIn: dayOffset(-8), arrivalTime: '15:00', checkOut: dayOffset(-7), guest: 'Difa Amenyo', rate: 242, otherCharges: 0, amountPaid: 0 },
  { id: 'RES-0915', billingPerson: 'Mariama Seidu', billingType: 'Guest', status: 'Confirmed', purpose: 'Leisure', room: '104', checkIn: dayOffset(0), arrivalTime: '14:00', checkOut: dayOffset(1), guest: 'Mariama Seidu', rate: 242, otherCharges: 0, amountPaid: 0 },
  { id: 'RES-0916', billingPerson: 'Selorm Dzokoto', billingType: 'Guest', status: 'Confirmed', purpose: 'Business', room: '203', checkIn: dayOffset(0), arrivalTime: '16:30', checkOut: dayOffset(3), guest: 'Selorm Dzokoto', rate: 423.5, otherCharges: 0, amountPaid: 0 },
  { id: 'RES-0917', billingPerson: 'Zakaria Yakubu', billingType: 'Guest', status: 'In house', purpose: 'Leisure', room: '101', checkIn: dayOffset(-1), arrivalTime: '13:15', checkOut: dayOffset(2), guest: 'Zakaria Yakubu', rate: 242, otherCharges: 0, amountPaid: 242 },
  { id: 'RES-0919', billingPerson: 'Nii Armah Tagoe', billingType: 'Guest', status: 'Cancelled', purpose: 'Business', room: 'Unassigned', checkIn: dayOffset(1), arrivalTime: '15:00', checkOut: dayOffset(3), guest: 'Nii Armah Tagoe', rate: 423.5, otherCharges: 0, amountPaid: 0 },
  { id: 'RES-0918', billingPerson: 'Tano Ridge Mining Co.', billingType: 'Company', status: 'Confirmed', purpose: 'Business', room: '301', checkIn: dayOffset(2), arrivalTime: '15:00', checkOut: dayOffset(5), guest: 'Ayishetu Mohammed', rate: 726, otherCharges: 0, amountPaid: 0 },
])

export type VipPreparation = {
  id: string
  reservationId: string
  guest: string
  company?: string
  room: string
  arrivalDate: string
  arrivalTime: string
  housekeepingNotes: string
  complimentaryItems: string[]
  orderNotes?: string
  housekeepingStatus: 'Pending' | 'Ready'
  orderStatus: 'Requested' | 'Prepared'
}

export const vipPreparations = ref<VipPreparation[]>([])

export function isCashBasisReservation(reservation: Reservation) {
  return reservation.cashBasis ?? reservation.billingType === 'Guest'
}

export function hasSponsorSigningAuthorization(reservation: Reservation) {
  const cardGuaranteed = reservation.paymentGuarantee === 'Card pre-authorized'
    && Boolean(reservation.paymentGuaranteeReference?.trim())
    && !isCashBasisReservation(reservation)
  const sponsorAuthorized = reservation.signingPrivilege
    && Boolean(reservation.signingAuthorizationBy?.trim())
    && Boolean(reservation.signingAuthorizationReference?.trim())
    && !isCashBasisReservation(reservation)
  const companyAuthorized = reservation.billingType === 'Company'
    && reservation.paymentGuarantee === 'Company account'
    && reservation.balanceOnAccount === true
  return Boolean(cardGuaranteed || sponsorAuthorized || companyAuthorized)
}

export function canSignOutletCharge(reservation: Reservation, amount: number) {
  return hasSponsorSigningAuthorization(reservation)
    || (isCashBasisReservation(reservation) && (reservation.cashBasisDepositBalance || 0) + 0.001 >= amount)
}

export function outletChargeTotal(reservation: Reservation, amount: number) {
  const taxRate = reservation.taxExempt ? 0 : 0.21
  return Math.round(amount * (1 + taxRate) * 100) / 100
}

export function applyCashBasisDepositToCharge(reservation: Reservation, amount: number) {
  if (hasSponsorSigningAuthorization(reservation)) return true
  const available = reservation.cashBasisDepositBalance || 0
  if (!isCashBasisReservation(reservation) || available + 0.001 < amount) {
    reservation.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, amount - available).toFixed(2)} required for pending outlet charge.`
    return false
  }
  reservation.cashBasisDepositBalance = Math.round((available - amount) * 100) / 100
  reservation.cashBasisDepositAlert = reservation.cashBasisDepositBalance <= 0.009
    ? 'Signing deposit is exhausted. Collect an additional deposit before the next outlet charge.'
    : undefined
  reservation.amountPaid = Math.round(((reservation.amountPaid ?? (reservation.payments || []).reduce((sum, payment) => sum + payment.amount, 0)) + amount) * 100) / 100
  reservation.payments ||= []
  reservation.payments.push({ method: 'Cash basis deposit applied', amount, receivedAt: new Date().toISOString() })
  return true
}

export function syncVipPreparation(reservation: Reservation) {
  const existingIndex = vipPreparations.value.findIndex((item) => item.reservationId === reservation.id)
  if (!reservation.isVip) {
    if (existingIndex >= 0) vipPreparations.value.splice(existingIndex, 1)
    return
  }
  if (!reservation.vipComplimentaryItems?.length) reservation.vipComplimentaryItems = ['VIP welcome amenity']
  const existing = existingIndex >= 0 ? vipPreparations.value[existingIndex] : undefined
  const request: VipPreparation = {
    id: existing?.id || `VIP-${reservation.id.replace('RES-', '')}`,
    reservationId: reservation.id,
    guest: reservation.guest,
    company: reservation.companyName || (reservation.billingType === 'Company' ? reservation.billingPerson : undefined),
    room: reservation.room,
    arrivalDate: reservation.checkIn,
    arrivalTime: reservation.arrivalTime,
    housekeepingNotes: reservation.vipHousekeepingNotes?.trim() || 'Prepare room with the hotel VIP amenity setup.',
    complimentaryItems: [...reservation.vipComplimentaryItems],
    orderNotes: reservation.vipOrderNotes?.trim() || undefined,
    housekeepingStatus: existing?.housekeepingStatus || 'Pending',
    orderStatus: existing?.orderStatus || 'Requested',
  }
  if (existingIndex >= 0) vipPreparations.value[existingIndex] = request
  else vipPreparations.value.unshift(request)
}
