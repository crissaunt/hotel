<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { ArrowDownLeft, ArrowUpRight, Building2, Check, FileText, Plus, Search, Split, Undo2, X } from '@lucide/vue'
import { applyCashBasisDepositToCharge, canSignOutletCharge, dateKey, hasSponsorSigningAuthorization, isCashBasisReservation, outletChargeTotal, reservations, type FolioCharge, type Reservation } from '@/features/front-office/stores/reservations'

type InvoicesTab = 'Folios' | 'Invoices' | 'Payments' | 'Company ledgers'
const tabs: InvoicesTab[] = ['Folios', 'Invoices', 'Payments', 'Company ledgers']
const vatRate = 0.21
const today = dateKey(new Date())
const activeTab = ref<InvoicesTab>('Folios')
const search = ref('')
const statusFilter = ref('All statuses')
const payerFilter = ref('All payers')
const balanceFilter = ref('All balances')
const selectedReservation = ref<Reservation | null>(null)
const printMode = ref<'folio' | 'guest-id'>('folio')
const showChargeForm = ref(false)
const selectedCompany = ref('')
const notice = ref('')
const chargeDescription = ref('Restaurant - Dinner')
const customChargeDescription = ref('')
const chargeReference = ref('')
const chargeAmount = ref('')
const chargeError = ref('')
const paymentMethod = ref('Cash')
const paymentAmount = ref('')
const paymentError = ref('')
const voidTarget = ref<{ charge: FolioCharge; category: 'room' | 'service' } | null>(null)
const voidReason = ref('')
const voidError = ref('')
const chargeOperation = ref<{ mode: 'move' | 'split'; charge: FolioCharge; category: 'room' | 'service' } | null>(null)
const targetReservationId = ref('')
const splitAmount = ref('')
const operationReason = ref('')
const operationError = ref('')
const companyPaymentAmount = ref('')
const companyPaymentMethod = ref('Bank transfer')
const companyPaymentError = ref('')
let chargeSequence = 0

function isActiveCharge(charge: FolioCharge) {
  return !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted')
}
function nightCount(reservation: Reservation) {
  return Math.max(1, Math.round((new Date(`${reservation.checkOut}T00:00:00`).getTime() - new Date(`${reservation.checkIn}T00:00:00`).getTime()) / 86400000))
}
function roomChargeTotal(reservation: Reservation) {
  if (reservation.roomCharges) return reservation.roomCharges.filter(isActiveCharge).reduce((sum, charge) => sum + charge.amount, 0)
  return nightCount(reservation) * reservation.rate
}
function subtotal(reservation: Reservation) {
  const serviceCharges = (reservation.charges || []).filter(isActiveCharge).reduce((sum, charge) => sum + charge.amount, 0)
  return Math.max(0, roomChargeTotal(reservation) + reservation.otherCharges + serviceCharges - (reservation.discount?.amount || 0))
}
function vat(reservation: Reservation) {
  return reservation.taxExempt ? 0 : Math.round(subtotal(reservation) * vatRate * 100) / 100
}
function total(reservation: Reservation) {
  return subtotal(reservation) + vat(reservation)
}
function paid(reservation: Reservation) {
  return Math.round((reservation.amountPaid ?? (reservation.payments || []).reduce((sum, payment) => sum + payment.amount, 0)) * 100) / 100
}
function balance(reservation: Reservation) {
  return Math.max(0, Math.round((total(reservation) - paid(reservation)) * 100) / 100)
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(value: string) {
  const [hours = '00', minutes = '00'] = value.split(':')
  return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
}
function folioId(reservation: Reservation) {
  return `FOL-${reservation.id.replace('RES-', '')}`
}
function invoiceId(reservation: Reservation) {
  return `INV-${reservation.id.replace('RES-', '')}`
}
function statusLabel(reservation: Reservation) {
  if (reservation.status === 'In house') return 'In-house'
  if (reservation.status === 'Checked out') return 'Checked out'
  if (reservation.status === 'Cancelled') return 'Cancelled'
  if (reservation.status === 'No show') return 'No show'
  if (reservation.checkIn === today) return 'Arriving'
  return reservation.status
}
function statusStyle(reservation: Reservation) {
  const label = statusLabel(reservation)
  return label === 'In-house' ? 'status-inhouse' : label === 'Arriving' || label === 'Confirmed' ? 'status-confirmed' : label === 'Cancelled' ? 'status-cancelled' : 'status-noshow'
}

const filteredFolios = computed(() => {
  const query = search.value.trim().toLowerCase()
  return reservations.value.filter((reservation) => {
    const payerKind = reservation.billingType === 'Company' ? 'Company' : reservation.billingType === 'Third party' ? 'Third party' : 'Guest'
    const matchesQuery = !query || [reservation.id, reservation.guest, reservation.billingPerson, reservation.room].some((value) => value.toLowerCase().includes(query))
    const matchesStatus = statusFilter.value === 'All statuses' || statusLabel(reservation) === statusFilter.value
    const matchesPayer = payerFilter.value === 'All payers' || payerKind === payerFilter.value
    const matchesBalance = balanceFilter.value === 'All balances' || (balanceFilter.value === 'Outstanding' ? balance(reservation) > 0 : balance(reservation) <= 0)
    return matchesQuery && matchesStatus && matchesPayer && matchesBalance
  }).sort((a, b) => b.checkIn.localeCompare(a.checkIn))
})
const folioCount = computed(() => reservations.value.length)
const invoiceCount = computed(() => reservations.value.length)
const paymentRows = computed(() => reservations.value.flatMap((reservation) => {
  const recordedPayments = reservation.payments || []
  const recordedTotal = recordedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const openingReceipt = Math.round(((reservation.amountPaid || 0) - recordedTotal) * 100) / 100
  const entries = recordedPayments.map((payment) => ({ reservation, payment }))
  if (openingReceipt > 0) entries.push({ reservation, payment: { method: 'Recorded before folio ledger', amount: openingReceipt, receivedAt: reservation.checkedInAt || `${reservation.checkIn}T12:00:00.000Z` } })
  return entries
}).sort((a, b) => b.payment.receivedAt.localeCompare(a.payment.receivedAt)))
const paymentCount = computed(() => paymentRows.value.length)
const companyAccounts = computed(() => {
  const companies = new Map<string, Reservation[]>()
  reservations.value.filter((reservation) => reservation.billingType === 'Company').forEach((reservation) => {
    const stays = companies.get(reservation.billingPerson) || []
    stays.push(reservation)
    companies.set(reservation.billingPerson, stays)
  })
  return [...companies.entries()].map(([name, stays]) => ({
    name,
    stays: stays.length,
    total: stays.reduce((sum, stay) => sum + total(stay), 0),
    paid: stays.reduce((sum, stay) => sum + paid(stay), 0),
    due: stays.reduce((sum, stay) => sum + balance(stay), 0),
  })).sort((a, b) => b.due - a.due)
})
const selectedCompanyStays = computed(() => reservations.value.filter((reservation) => reservation.billingType === 'Company' && reservation.billingPerson === selectedCompany.value).sort((a, b) => a.checkIn.localeCompare(b.checkIn)))
const companyDue = computed(() => selectedCompanyStays.value.reduce((sum, stay) => sum + balance(stay), 0))
const roomChargeRows = computed<FolioCharge[]>(() => {
  if (!selectedReservation.value) return []
  if (selectedReservation.value.roomCharges) return selectedReservation.value.roomCharges
  return [{ id: `ROOM-${selectedReservation.value.id}`, description: `Room charge · ${nightCount(selectedReservation.value)} nights`, date: selectedReservation.value.checkIn, amount: nightCount(selectedReservation.value) * selectedReservation.value.rate, status: 'Posted' }]
})
const folioPrintRows = computed(() => {
  const reservation = selectedReservation.value
  if (!reservation) return []
  const rows: { date: string; reference: string; description: string; amount: number; remarks: string }[] = []
  roomChargeRows.value.forEach((charge, index) => rows.push({ date: charge.date, reference: charge.reference || charge.id || `${invoiceId(reservation)}-ROOM-${index + 1}`, description: charge.description, amount: isActiveCharge(charge) ? charge.amount : 0, remarks: charge.status && charge.status !== 'Posted' ? `${charge.status}${charge.voidReason ? `: ${charge.voidReason}` : ''}` : '' }))
  if (reservation.otherCharges > 0) rows.push({ date: reservation.checkIn, reference: `${invoiceId(reservation)}-OTHER`, description: 'Other stay charges', amount: reservation.otherCharges, remarks: '' })
  ;(reservation.charges || []).forEach((charge, index) => rows.push({ date: charge.date, reference: charge.reference || charge.id || `${invoiceId(reservation)}-CHG-${index + 1}`, description: charge.description, amount: isActiveCharge(charge) ? charge.amount : 0, remarks: charge.status && charge.status !== 'Posted' ? `${charge.status}${charge.voidReason ? `: ${charge.voidReason}` : ''}` : '' }))
  if (reservation.discount?.amount) rows.push({ date: reservation.checkIn, reference: `${invoiceId(reservation)}-DISC`, description: `Discount · ${reservation.discount.reason}`, amount: -reservation.discount.amount, remarks: 'Discount applied' })
  rows.push({ date: reservation.checkOut, reference: reservation.taxExemptionRef || `${invoiceId(reservation)}-TAX`, description: reservation.taxExempt ? 'VAT exempt' : 'VAT · 21%', amount: vat(reservation), remarks: reservation.taxExempt ? 'Exempt' : '' })
  const recordedPayments = reservation.payments || []
  const recordedTotal = recordedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const openingPayment = Math.round((paid(reservation) - recordedTotal) * 100) / 100
  if (openingPayment > 0) rows.push({ date: reservation.checkedInAt?.slice(0, 10) || reservation.checkIn, reference: `${invoiceId(reservation)}-PREV`, description: 'Payments previously received', amount: -openingPayment, remarks: 'Opening receipt' })
  recordedPayments.forEach((payment, index) => rows.push({ date: payment.receivedAt.slice(0, 10), reference: payment.corporateBatchId || `RCT-${reservation.id.slice(-4)}-${index + 1}`, description: `Payment · ${payment.method}`, amount: -payment.amount, remarks: payment.corporateBatchId ? 'Company account allocation' : '' }))
  rows.sort((a, b) => a.date.localeCompare(b.date))
  let runningBalance = 0
  return rows.map((row) => {
    runningBalance = Math.round((runningBalance + row.amount) * 100) / 100
    return { ...row, balance: Math.max(0, runningBalance) }
  })
})
const depositApplied = computed(() => selectedReservation.value ? Math.min(selectedReservation.value.depositPaid || 0, paid(selectedReservation.value)) : 0)

function openFolio(reservation: Reservation) {
  selectedReservation.value = reservation
  showChargeForm.value = false
  chargeError.value = ''
  paymentError.value = ''
  paymentAmount.value = balance(reservation).toFixed(2)
  voidTarget.value = null
  chargeOperation.value = null
}
function closeFolio() {
  selectedReservation.value = null
  voidTarget.value = null
  chargeOperation.value = null
}
function nextChargeId() {
  chargeSequence += 1
  return `CHG-${Date.now().toString(36).toUpperCase()}-${chargeSequence.toString().padStart(2, '0')}`
}
function addCharge() {
  chargeError.value = ''
  const amount = Math.round(Number(chargeAmount.value) * 100) / 100
  const description = chargeDescription.value === 'Other' ? customChargeDescription.value.trim() : chargeDescription.value.trim()
  if (!selectedReservation.value || !description || !Number.isFinite(amount) || amount <= 0) {
    chargeError.value = 'Enter a description and an amount greater than zero.'
    return
  }
  const chargeTotal = outletChargeTotal(selectedReservation.value, amount)
  if (!canSignOutletCharge(selectedReservation.value, chargeTotal)) {
    selectedReservation.value.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, chargeTotal - (selectedReservation.value.cashBasisDepositBalance || 0)).toFixed(2)} required for this outlet charge including tax.`
    chargeError.value = 'This guest cannot sign the charge. Record a signing deposit or sponsor authorization first.'
    return
  }
  if (isCashBasisReservation(selectedReservation.value) && !hasSponsorSigningAuthorization(selectedReservation.value)
    && !applyCashBasisDepositToCharge(selectedReservation.value, chargeTotal)) {
    chargeError.value = 'The signing deposit could not be applied. Collect another deposit before posting.'
    return
  }
  selectedReservation.value.charges ||= []
  selectedReservation.value.charges.push({ id: nextChargeId(), description, date: today, amount, reference: chargeReference.value.trim() || undefined, status: 'Posted' })
  chargeAmount.value = ''
  chargeReference.value = ''
  customChargeDescription.value = ''
  showChargeForm.value = false
  paymentAmount.value = balance(selectedReservation.value).toFixed(2)
  notice.value = `Charge posted to ${selectedReservation.value.guest}’s folio.`
  window.setTimeout(() => { notice.value = '' }, 4000)
}
function recordReceipt() {
  paymentError.value = ''
  const amount = Math.round(Number(paymentAmount.value) * 100) / 100
  if (!selectedReservation.value || !Number.isFinite(amount) || amount <= 0 || amount > balance(selectedReservation.value)) {
    paymentError.value = 'Enter a payment no greater than the folio balance.'
    return
  }
  selectedReservation.value.amountPaid = paid(selectedReservation.value) + amount
  selectedReservation.value.payments ||= []
  selectedReservation.value.payments.push({ method: paymentMethod.value, amount, receivedAt: new Date().toISOString() })
  paymentAmount.value = balance(selectedReservation.value).toFixed(2)
  paymentError.value = ''
}
function persistRoomCharge(charge: FolioCharge) {
  if (!selectedReservation.value) return charge
  selectedReservation.value.roomCharges ||= [{ ...charge, id: charge.id || `ROOM-${selectedReservation.value.id}`, status: 'Posted' }]
  return selectedReservation.value.roomCharges.find((entry) => entry.id === charge.id) || charge
}
function startVoid(charge: FolioCharge, category: 'room' | 'service' = 'service') {
  voidTarget.value = { charge: category === 'room' ? persistRoomCharge(charge) : charge, category }
  voidReason.value = ''
  voidError.value = ''
  chargeOperation.value = null
}
function voidCharge() {
  if (!selectedReservation.value || !voidTarget.value) return
  if (!voidReason.value.trim()) {
    voidError.value = 'Enter a reason. The void will remain in the folio history.'
    return
  }
  voidTarget.value.charge.status = 'Voided'
  voidTarget.value.charge.voidReason = voidReason.value.trim()
  voidTarget.value.charge.voidedAt = new Date().toISOString()
  voidTarget.value = null
  paymentAmount.value = balance(selectedReservation.value).toFixed(2)
  voidReason.value = ''
}
function startChargeOperation(mode: 'move' | 'split', charge: FolioCharge, category: 'room' | 'service' = 'service') {
  chargeOperation.value = { mode, charge: category === 'room' ? persistRoomCharge(charge) : charge, category }
  targetReservationId.value = ''
  splitAmount.value = ''
  operationReason.value = ''
  operationError.value = ''
  voidTarget.value = null
}
function confirmChargeOperation() {
  const source = selectedReservation.value
  const operation = chargeOperation.value
  const target = reservations.value.find((reservation) => reservation.id === targetReservationId.value)
  if (!source || !operation || !target || target.id === source.id || !isActiveCharge(operation.charge)) {
    operationError.value = 'Choose another active stay as the destination.'
    return
  }
  if (!operationReason.value.trim()) {
    operationError.value = 'Enter a reason for this adjustment.'
    return
  }
  const movedAmount = operation.mode === 'move' ? operation.charge.amount : Math.round(Number(splitAmount.value) * 100) / 100
  if (!Number.isFinite(movedAmount) || movedAmount <= 0 || movedAmount > operation.charge.amount || (operation.mode === 'split' && movedAmount >= operation.charge.amount)) {
    operationError.value = operation.mode === 'split' ? 'Enter an amount greater than zero and less than the original charge.' : 'This charge cannot be moved.'
    return
  }
  operation.charge.status = operation.mode === 'move' ? 'Moved' : 'Split'
  operation.charge.movedToReservationId = target.id
  operation.charge.voidReason = operationReason.value.trim()
  const portionStaysOnSource = operation.mode === 'split' ? Math.round((operation.charge.amount - movedAmount) * 100) / 100 : 0
  if (operation.category === 'service') source.charges ||= []
  else source.roomCharges ||= []
  target.charges ||= []
  if (portionStaysOnSource > 0) {
    const remainder: FolioCharge = { id: nextChargeId(), description: `${operation.charge.description} · split balance`, date: today, amount: portionStaysOnSource, reference: operation.charge.reference, movedFromReservationId: source.id, status: 'Posted' }
    if (operation.category === 'room') source.roomCharges!.push(remainder)
    else source.charges!.push(remainder)
  }
  target.charges.push({ id: nextChargeId(), description: `${operation.charge.description} · ${operation.mode === 'move' ? 'moved' : 'split'}`, date: today, amount: movedAmount, reference: operation.charge.reference, movedFromReservationId: source.id, status: 'Posted' })
  chargeOperation.value = null
}
function openCompany(name: string) {
  selectedCompany.value = name
  companyPaymentAmount.value = ''
  companyPaymentError.value = ''
}
function applyCompanyPayment() {
  companyPaymentError.value = ''
  const amount = Math.round(Number(companyPaymentAmount.value) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > companyDue.value) {
    companyPaymentError.value = 'Enter a lump-sum payment no greater than the company’s outstanding balance.'
    return
  }
  let remaining = amount
  let appliedBills = 0
  const batchId = `CORP-${Date.now().toString(36).toUpperCase()}`
  for (const stay of [...selectedCompanyStays.value].sort((a, b) => a.checkIn.localeCompare(b.checkIn))) {
    if (remaining <= 0) break
    const allocation = Math.min(remaining, balance(stay))
    if (allocation <= 0) continue
    stay.amountPaid = paid(stay) + allocation
    stay.payments ||= []
    stay.payments.push({ method: companyPaymentMethod.value, amount: allocation, receivedAt: new Date().toISOString(), corporateBatchId: batchId })
    remaining = Math.round((remaining - allocation) * 100) / 100
    appliedBills += 1
  }
  notice.value = `Payment of $${amount.toFixed(2)} allocated across ${appliedBills} ${appliedBills === 1 ? 'stay' : 'stays'} for ${selectedCompany.value}.`
  selectedCompany.value = ''
  window.setTimeout(() => { notice.value = '' }, 5000)
}
async function printInvoice() {
  printMode.value = 'folio'
  await nextTick()
  window.print()
}
async function printGuestId() {
  const reservation = selectedReservation.value
  if (!reservation || balance(reservation) > 0 || ['Cancelled', 'No show'].includes(reservation.status)) return
  reservation.guestIdNumber ||= `GID-${reservation.id.replace('RES-', '')}`
  reservation.guestIdIssuedAt ||= new Date().toISOString()
  printMode.value = 'guest-id'
  await nextTick()
  window.print()
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 class="font-serif text-[32px] font-medium tracking-[-0.035em] text-[#30243e] sm:text-[36px]">Invoices &amp; payments</h1><p class="mt-2 text-[12px] text-[#748087]">Guest folios, receipts, and company account balances in one place.</p></div><div class="flex items-center gap-2 rounded-md border border-[#e7dfed] bg-[#fffdfb] px-3 py-2 text-[10px] text-[#74647f]"><FileText :size="14" class="text-[#805ca0]" /> {{ folioCount }} folios · {{ paymentCount }} receipts</div></div>

    <div v-if="notice" class="mt-4 flex items-center gap-2 rounded-md border border-[#d9e8de] bg-white px-3 py-2 text-[10px] text-[#4a7356]"><Check :size="14" />{{ notice }}</div>

    <div class="mt-7 overflow-hidden rounded-lg border border-[#e6e1e8] ">
      <div class="flex flex-wrap gap-1 border-b border-[#ece7ee] px-4 pt-3 sm:px-5" role="tablist" aria-label="Guest accounting views"><button v-for="tab in tabs" :key="tab" class="ledger-tab" :class="activeTab === tab ? 'ledger-tab-active' : ''" role="tab" :aria-selected="activeTab === tab" @click="activeTab = tab">{{ tab }}<span>{{ tab === 'Folios' ? folioCount : tab === 'Invoices' ? invoiceCount : tab === 'Payments' ? paymentCount : companyAccounts.length }}</span></button></div>

      <div v-if="activeTab === 'Folios' || activeTab === 'Invoices'" class="flex flex-col gap-3 border-b border-[#ece7ee] px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div class="flex flex-wrap gap-2"><label class="ledger-search"><Search :size="14" /><span class="sr-only">Search folios</span><input v-model="search" placeholder="Search guest, room, company, or ID" /></label><label><span class="sr-only">Filter by status</span><select v-model="statusFilter" class="reservation-select"><option>All statuses</option><option>Arriving</option><option>In-house</option><option>Checked out</option><option>Cancelled</option><option>No show</option></select></label><label><span class="sr-only">Filter by payer</span><select v-model="payerFilter" class="reservation-select"><option>All payers</option><option>Guest</option><option>Company</option><option>Third party</option></select></label><label><span class="sr-only">Filter by balance</span><select v-model="balanceFilter" class="reservation-select"><option>All balances</option><option>Outstanding</option><option>Settled</option></select></label></div>
        <span class="text-[9px] text-[#8c858f]">{{ filteredFolios.length }} {{ activeTab === 'Invoices' ? 'invoices' : 'folios' }}</span>
      </div>

      <div v-if="activeTab === 'Folios' || activeTab === 'Invoices'" class="overflow-x-auto"><table class="w-full min-w-[1050px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-5">{{ activeTab === 'Invoices' ? 'Invoice' : 'Folio' }}</th><th class="reservation-head">Billing person</th><th class="reservation-head">Status</th><th class="reservation-head">Room</th><th class="reservation-head">Check-in</th><th class="reservation-head">Check-out</th><th class="reservation-head">Guest</th><th class="reservation-head text-right">Charges</th><th class="reservation-head text-right">Paid</th><th class="reservation-head text-right pr-5">Balance due</th></tr></thead><tbody>
        <tr v-for="reservation in filteredFolios" :key="reservation.id" class="reservation-row"><td class="reservation-cell pl-5"><button class="font-medium text-[#65428e] hover:underline" @click="openFolio(reservation)">{{ activeTab === 'Invoices' ? invoiceId(reservation) : folioId(reservation) }}</button></td><td class="reservation-cell max-w-[155px] truncate font-medium text-[#52616a]">{{ reservation.billingPerson }}<span v-if="reservation.billingType !== 'Guest'" class="ml-1 inline-flex rounded bg-[#f1edf4] px-1.5 py-0.5 text-[8px] text-[#76687f]">{{ reservation.billingType === 'Company' ? 'Company' : 'Third party' }}</span></td><td class="reservation-cell"><span class="reservation-status" :class="statusStyle(reservation)">{{ statusLabel(reservation) }}</span></td><td class="reservation-cell"><span class="room-code">{{ reservation.room }}</span></td><td class="reservation-cell text-[#5f6d74]">{{ formatDate(reservation.checkIn) }}</td><td class="reservation-cell text-[#5f6d74]">{{ formatDate(reservation.checkOut) }}</td><td class="reservation-cell font-medium text-[#46565f]">{{ reservation.guest }}<span v-if="reservation.additionalGuests?.length" class="text-[8px] text-[#8c858f]"> +{{ reservation.additionalGuests.length }}</span></td><td class="reservation-cell text-right text-[#52616a]">₱{{ total(reservation).toFixed(2) }}</td><td class="reservation-cell text-right text-[#44815a]">₱{{ paid(reservation).toFixed(2) }}</td><td class="reservation-cell pr-5 text-right font-semibold" :class="balance(reservation) ? 'text-[#a25454]' : 'text-[#44815a]'">₱{{ balance(reservation).toFixed(2) }}</td></tr>
        <tr v-if="filteredFolios.length === 0"><td colspan="10" class="py-14 text-center text-[11px] text-[#8c858f]">No folios match these filters.</td></tr>
      </tbody></table></div>

      <div v-else-if="activeTab === 'Payments'" class="overflow-x-auto"><table class="w-full min-w-[720px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-5">Date</th><th class="reservation-head">Receipt</th><th class="reservation-head">Guest / company</th><th class="reservation-head">Folio</th><th class="reservation-head">Method</th><th class="reservation-head text-right pr-5">Amount</th></tr></thead><tbody><tr v-for="({ reservation, payment }, index) in paymentRows" :key="`${reservation.id}-${payment.receivedAt}-${index}`" class="reservation-row"><td class="reservation-cell pl-5 text-[#69767c]">{{ formatDate(payment.receivedAt.slice(0, 10)) }}</td><td class="reservation-cell text-[#65428e]">RCT-{{ reservation.id.slice(-4) }}-{{ index + 1 }}</td><td class="reservation-cell font-medium text-[#46565f]">{{ reservation.billingPerson }}</td><td class="reservation-cell text-[#69767c]">{{ folioId(reservation) }}</td><td class="reservation-cell text-[#69767c]">{{ payment.method }}<span v-if="payment.corporateBatchId" class="ml-1 text-[8px] text-[#8062a0]">Company allocation</span></td><td class="reservation-cell pr-5 text-right font-medium text-[#44815a]">₱{{ payment.amount.toFixed(2) }}</td></tr><tr v-if="paymentRows.length === 0"><td colspan="6" class="py-14 text-center text-[11px] text-[#8c858f]">No payments have been recorded.</td></tr></tbody></table></div>

      <div v-else class="overflow-x-auto"><table class="w-full min-w-[760px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-5">Company</th><th class="reservation-head text-right">Open stays</th><th class="reservation-head text-right">Total billed</th><th class="reservation-head text-right">Payments</th><th class="reservation-head text-right">Outstanding</th><th class="reservation-head pr-5"></th></tr></thead><tbody><tr v-for="account in companyAccounts" :key="account.name" class="reservation-row"><td class="reservation-cell pl-5 font-medium text-[#46565f]"><span class="mr-2 inline-flex size-7 items-center justify-center rounded-md bg-[#f2ebf8] text-[#7047a8]"><Building2 :size="14" /></span>{{ account.name }}</td><td class="reservation-cell text-right text-[#69767c]">{{ account.stays }}</td><td class="reservation-cell text-right text-[#52616a]">₱{{ account.total.toFixed(2) }}</td><td class="reservation-cell text-right text-[#44815a]">₱{{ account.paid.toFixed(2) }}</td><td class="reservation-cell text-right font-semibold" :class="account.due ? 'text-[#a25454]' : 'text-[#44815a]'">₱{{ account.due.toFixed(2) }}</td><td class="reservation-cell pr-5 text-right"><button class="arrival-action-primary" @click="openCompany(account.name)">Open ledger</button></td></tr><tr v-if="companyAccounts.length === 0"><td colspan="6" class="py-14 text-center text-[11px] text-[#8c858f]">No corporate stays are on account yet.</td></tr></tbody></table></div>
    </div>
  </section>

  <div v-if="selectedReservation" class="modal-backdrop" @click.self="closeFolio">
    <section class="folio-modal" role="dialog" aria-modal="true" aria-labelledby="folio-title">
      <header class="folio-modal-header"><div><p class="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/70">Guest folio · {{ folioId(selectedReservation) }}<span v-if="isCashBasisReservation(selectedReservation)" class="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-white">CASH BASIS · PA</span></p><h2 id="folio-title" class="mt-1 font-serif text-[21px] text-white">{{ selectedReservation.guest }}</h2><p class="mt-1 text-[9px] text-white/75">{{ selectedReservation.id }} · Room {{ selectedReservation.room }} · {{ formatDate(selectedReservation.checkIn) }} – {{ formatDate(selectedReservation.checkOut) }} · {{ nightCount(selectedReservation) }} nights</p></div><button class="rounded-md p-1.5 text-white/70 hover:bg-white/10" aria-label="Close folio" @click="closeFolio"><X :size="16" /></button></header>
      <div class="folio-modal-content">
        <div class="grid grid-cols-3 gap-2"><div class="financial-cell"><span>Total charges incl. VAT</span><strong>₱{{ total(selectedReservation).toFixed(2) }}</strong></div><div class="financial-cell"><span>Payments</span><strong class="text-[#44815a]">₱{{ paid(selectedReservation).toFixed(2) }}</strong></div><div class="financial-cell"><span>Amount due</span><strong :class="balance(selectedReservation) ? 'text-[#a25454]' : 'text-[#44815a]'">₱{{ balance(selectedReservation).toFixed(2) }}</strong></div></div>
        <div v-if="isCashBasisReservation(selectedReservation)" class="rounded-md border border-[#efd7a3] bg-[#fffdf7] px-3 py-2 text-[9px] text-[#785920]"><strong>CASH BASIS · PA</strong><span class="ml-2">Signing deposit available: ₱{{ (selectedReservation.cashBasisDepositBalance || 0).toFixed(2) }}</span><span v-if="selectedReservation.cashBasisDepositAlert" class="mt-1 block text-[#9a5555]">{{ selectedReservation.cashBasisDepositAlert }}</span></div>
        <div class="flex flex-wrap gap-2"><button class="arrival-action-primary" @click="printInvoice"><FileText :size="13" /> Print guest folio</button><button v-if="balance(selectedReservation) <= 0 && !['Cancelled', 'No show'].includes(selectedReservation.status)" class="arrival-action-primary" @click="printGuestId"><FileText :size="13" /> Prepare guest ID</button><span v-else-if="balance(selectedReservation) > 0" class="self-center text-[9px] text-[#8c858f]">Guest ID available after bill settlement</span><button class="arrival-action" @click="showChargeForm = !showChargeForm; chargeError = ''"><Plus :size="13" /> {{ showChargeForm ? 'Cancel charge' : 'Add charge' }}</button><button class="arrival-action" @click="paymentAmount = balance(selectedReservation).toFixed(2); paymentError = ''"><ArrowDownLeft :size="13" /> Record receipt</button></div>
        <div v-if="showChargeForm" class="folio-add-charge-row"><label class="sr-only" for="folio-charge-choice">Charge description</label><select id="folio-charge-choice" v-model="chargeDescription" class="form-input mt-0"><option>Restaurant - Dinner</option><option>Room service</option><option>Laundry</option><option>Minibar</option><option>Parking</option><option>Other service</option><option>Other</option></select><input v-if="chargeDescription === 'Other'" v-model="customChargeDescription" class="form-input mt-0" placeholder="Describe the service" aria-label="Other charge description" /><label class="sr-only" for="folio-charge-reference-2">Charge reference</label><input id="folio-charge-reference-2" v-model="chargeReference" class="form-input mt-0" placeholder="Reference (optional)" /><label class="sr-only" for="folio-charge-amount-2">Charge amount</label><input id="folio-charge-amount-2" v-model="chargeAmount" class="form-input mt-0" type="number" min="0.01" step="0.01" placeholder="Amount" /><button class="arrival-action-primary" @click="addCharge"><Plus :size="12" /> Post</button><p v-if="chargeError" class="text-[9px] text-[#a25454]">{{ chargeError }}</p></div>

        <section class="folio-section"><div class="flex items-center justify-between"><h3 class="text-[11px] font-semibold text-[#4d4355]">Account activity</h3><button class="text-[9px] font-medium text-[#7047a8]" @click="printInvoice">Preview / print guest folio</button></div><div class="mt-2 overflow-x-auto"><table class="w-full min-w-[850px] border-collapse text-left"><thead><tr class="folio-table-head"><th>Date</th><th>Description</th><th>Reference</th><th class="text-right">Charge</th><th>Status</th><th class="folio-actions-head">Actions</th></tr></thead><tbody>
          <tr v-for="(charge, index) in roomChargeRows" :key="charge.id || `room-${index}`" class="folio-table-row" :class="!isActiveCharge(charge) ? 'folio-entry-inactive' : ''"><td>{{ formatDate(charge.date) }}</td><td>{{ charge.description }}<span v-if="charge.movedToReservationId" class="block text-[8px]">{{ charge.status === 'Moved' ? 'Moved' : 'Split' }} to {{ charge.movedToReservationId }}</span><span v-if="charge.voidReason" class="block text-[8px]">{{ charge.status === 'Voided' ? 'Void' : 'Adjustment' }} reason: {{ charge.voidReason }}</span></td><td>{{ charge.reference || '—' }}</td><td class="text-right">₱{{ charge.amount.toFixed(2) }}</td><td><span class="folio-entry-status" :class="!isActiveCharge(charge) ? 'folio-entry-status-muted' : ''">{{ charge.status || 'Posted' }}</span></td><td><div v-if="isActiveCharge(charge)" class="folio-row-actions"><button class="folio-row-action" title="Split this room charge between stays" @click="startChargeOperation('split', charge, 'room')"><Split :size="11" /> Split</button><button class="folio-row-action" title="Move this room charge to another stay" @click="startChargeOperation('move', charge, 'room')"><ArrowUpRight :size="11" /> Move</button><button class="folio-row-action folio-void-button" title="Void this room charge" @click="startVoid(charge, 'room')"><Undo2 :size="11" /> Void</button></div></td></tr>
          <tr v-if="selectedReservation.otherCharges > 0" class="folio-table-row"><td>{{ formatDate(selectedReservation.checkIn) }}</td><td>Other stay charges</td><td>—</td><td class="text-right">₱{{ selectedReservation.otherCharges.toFixed(2) }}</td><td><span class="folio-entry-status">Posted</span></td><td></td></tr>
          <tr v-for="(charge, index) in selectedReservation.charges || []" :key="charge.id || `${charge.date}-${index}`" class="folio-table-row" :class="!isActiveCharge(charge) ? 'folio-entry-inactive' : ''"><td>{{ formatDate(charge.date) }}</td><td>{{ charge.description }}<span v-if="charge.movedToReservationId" class="block text-[8px]">{{ charge.status === 'Moved' ? 'Moved' : 'Split' }} to {{ charge.movedToReservationId }}</span><span v-if="charge.voidReason" class="block text-[8px]">{{ charge.status === 'Voided' ? 'Void' : 'Adjustment' }} reason: {{ charge.voidReason }}</span></td><td>{{ charge.reference || '—' }}</td><td class="text-right">₱{{ charge.amount.toFixed(2) }}</td><td><span class="folio-entry-status" :class="!isActiveCharge(charge) ? 'folio-entry-status-muted' : ''">{{ charge.status || 'Posted' }}</span></td><td><div v-if="isActiveCharge(charge)" class="folio-row-actions"><button class="folio-row-action" title="Split this charge between stays" @click="startChargeOperation('split', charge)"><Split :size="11" /> Split</button><button class="folio-row-action" title="Move this charge to another stay" @click="startChargeOperation('move', charge)"><ArrowUpRight :size="11" /> Move</button><button class="folio-row-action folio-void-button" title="Void this charge" @click="startVoid(charge)"><Undo2 :size="11" /> Void</button></div></td></tr>
          <tr v-if="selectedReservation.discount" class="folio-table-row folio-discount-row"><td>{{ formatDate(selectedReservation.checkIn) }}</td><td>Discount · {{ selectedReservation.discount.reason }}</td><td>—</td><td class="text-right">−₱{{ selectedReservation.discount.amount.toFixed(2) }}</td><td><span class="folio-entry-status">Applied</span></td><td></td></tr>
          <tr class="folio-table-row"><td>{{ formatDate(selectedReservation.checkIn) }}</td><td>{{ selectedReservation.taxExempt ? 'VAT exempt' : 'VAT · 21%' }}</td><td>{{ selectedReservation.taxExemptionRef || '—' }}</td><td class="text-right">₱{{ vat(selectedReservation).toFixed(2) }}</td><td><span class="folio-entry-status">{{ selectedReservation.taxExempt ? 'Exempt' : 'Posted' }}</span></td><td></td></tr>
          <tr v-if="(selectedReservation.charges || []).length === 0 && selectedReservation.otherCharges === 0"><td colspan="6" class="py-5 text-center text-[9px] text-[#938b98]">No service charges posted yet.</td></tr>
        </tbody></table></div>
        <div class="mt-2 flex flex-wrap justify-end gap-x-5 gap-y-1 text-[9px] text-[#7d7583]"><span>Subtotal ₱{{ subtotal(selectedReservation).toFixed(2) }}</span><span>VAT ₱{{ vat(selectedReservation).toFixed(2) }}</span><strong class="text-[#4c3a5e]">Folio total ₱{{ total(selectedReservation).toFixed(2) }}</strong></div></section>

        <div class="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr]">
          <section class="folio-section"><div class="flex items-center justify-between"><h3 class="text-[11px] font-semibold text-[#4d4355]">Record payment</h3><span class="text-[9px] text-[#8c858f]">No overpayment</span></div><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]"><label class="sr-only" for="folio-payment-method">Payment method</label><select id="folio-payment-method" v-model="paymentMethod" class="form-input mt-0"><option>Cash</option><option>Card</option><option>Mobile money</option><option>Bank transfer</option></select><label class="sr-only" for="folio-payment-amount">Payment amount</label><input id="folio-payment-amount" v-model="paymentAmount" type="number" min="0.01" step="0.01" class="form-input mt-0" placeholder="Amount" /><button class="arrival-action-primary" :disabled="balance(selectedReservation) <= 0" @click="recordReceipt">Receive</button></div><p v-if="paymentError" class="mt-2 text-[9px] text-[#a25454]">{{ paymentError }}</p><div v-if="selectedReservation.payments?.length" class="mt-2 space-y-1 border-t border-[#eee9ef] pt-2"><p v-for="(payment, index) in selectedReservation.payments" :key="index" class="flex justify-between text-[9px] text-[#7b747f]"><span>{{ payment.method }} · {{ formatDate(payment.receivedAt.slice(0, 10)) }}</span><span class="font-medium text-[#44815a]">₱{{ payment.amount.toFixed(2) }}</span></p></div></section>
          <section v-if="voidTarget" class="folio-action-panel"><h3 class="text-[10px] font-semibold text-[#6b4f4c]">Void charge · audit record retained</h3><p class="mt-1 text-[9px] text-[#81797d]">{{ voidTarget.charge.description }} · ₱{{ voidTarget.charge.amount.toFixed(2) }}</p><label class="form-label mt-2">Void reason<input v-model="voidReason" class="form-input" placeholder="Reason required" /></label><p v-if="voidError" class="mt-1 text-[9px] text-[#a25454]">{{ voidError }}</p><div class="mt-2 flex justify-end gap-2"><button class="secondary-button" @click="voidTarget = null">Cancel</button><button class="folio-void-confirm" @click="voidCharge">Void charge</button></div></section>
          <section v-else-if="chargeOperation" class="folio-action-panel"><h3 class="text-[10px] font-semibold text-[#4c3a5e]">{{ chargeOperation.mode === 'split' ? 'Split charge between stays' : 'Move charge to another stay' }}</h3><p class="mt-1 text-[9px] text-[#81798a]">The original charge will remain in this folio’s activity as {{ chargeOperation.mode === 'split' ? 'Split' : 'Moved' }}.</p><div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><label class="form-label">Destination stay<select v-model="targetReservationId" class="form-input"><option value="">Choose a stay</option><option v-for="stay in reservations.filter((item) => item.id !== selectedReservation?.id && !['Cancelled', 'No show', 'Checked out'].includes(item.status))" :key="stay.id" :value="stay.id">{{ stay.guest }} · {{ stay.id }} · {{ stay.room }}</option></select></label><label v-if="chargeOperation.mode === 'split'" class="form-label">Amount to move<input v-model="splitAmount" type="number" min="0.01" :max="chargeOperation.charge.amount - 0.01" step="0.01" class="form-input" /></label></div><label class="form-label mt-2">Reason<input v-model="operationReason" class="form-input" placeholder="Reason required for the audit trail" /></label><p v-if="operationError" class="mt-1 text-[9px] text-[#a25454]">{{ operationError }}</p><div class="mt-2 flex justify-end gap-2"><button class="secondary-button" @click="chargeOperation = null">Cancel</button><button class="arrival-action-primary" @click="confirmChargeOperation">{{ chargeOperation.mode === 'split' ? 'Split charge' : 'Move charge' }}</button></div></section>
        </div>
      </div>
      <footer class="flex justify-end border-t border-[#ece7ee] px-5 py-3"><button class="secondary-button" @click="closeFolio">Close folio</button></footer>
    </section>
  </div>

  <div v-if="selectedCompany" class="modal-backdrop" @click.self="selectedCompany = ''">
    <section class="company-ledger-modal" role="dialog" aria-modal="true" aria-labelledby="company-ledger-title">
      <header class="flex items-start justify-between border-b border-[#ece7ee] px-5 py-4"><div><p class="eyebrow">Corporate account · ledger</p><h2 id="company-ledger-title" class="mt-1 font-serif text-[22px] text-[#30243e]">{{ selectedCompany }}</h2><p class="mt-1 text-[10px] text-[#7d7583]">All company-billed stays and open balances.</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close company ledger" @click="selectedCompany = ''"><X :size="16" /></button></header>
      <div class="company-ledger-content"><div class="grid grid-cols-3 gap-2"><div class="financial-cell"><span>Total billed</span><strong>₱{{ selectedCompanyStays.reduce((sum, stay) => sum + total(stay), 0).toFixed(2) }}</strong></div><div class="financial-cell"><span>Paid</span><strong class="text-[#44815a]">₱{{ selectedCompanyStays.reduce((sum, stay) => sum + paid(stay), 0).toFixed(2) }}</strong></div><div class="financial-cell"><span>Outstanding</span><strong class="text-[#a25454]">₱{{ companyDue.toFixed(2) }}</strong></div></div>
        <div class="mt-3 overflow-x-auto"><table class="w-full min-w-[560px] border-collapse text-left"><thead><tr class="folio-table-head"><th>Stay / guest</th><th>Room</th><th>Dates</th><th class="text-right">Invoice total</th><th class="text-right">Due</th></tr></thead><tbody><tr v-for="stay in selectedCompanyStays" :key="stay.id" class="folio-table-row"><td>{{ stay.guest }}<span class="block text-[8px] text-[#958c99]">{{ invoiceId(stay) }}</span></td><td>{{ stay.room }}</td><td>{{ formatDate(stay.checkIn) }} – {{ formatDate(stay.checkOut) }}</td><td class="text-right">₱{{ total(stay).toFixed(2) }}</td><td class="text-right font-medium" :class="balance(stay) ? 'text-[#a25454]' : 'text-[#44815a]'">₱{{ balance(stay).toFixed(2) }}</td></tr></tbody></table></div>
        <section class="mt-4 rounded-md border border-[#e8e0ef] bg-[#fcf9ff] p-3"><h3 class="text-[11px] font-semibold text-[#4c3a5e]">Apply one payment across open bills</h3><p class="mt-1 text-[9px] text-[#827989]">We allocate it to the oldest outstanding stay first and continue until it is fully applied.</p><div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_auto]"><label class="sr-only" for="company-payment-amount">Company payment amount</label><input id="company-payment-amount" v-model="companyPaymentAmount" type="number" min="0.01" :max="companyDue" step="0.01" class="form-input mt-0" placeholder="Amount" /><label class="sr-only" for="company-payment-method">Payment method</label><select id="company-payment-method" v-model="companyPaymentMethod" class="form-input mt-0"><option>Bank transfer</option><option>Card</option><option>Cash</option><option>Mobile money</option></select><button class="arrival-action-primary" :disabled="companyDue <= 0" @click="applyCompanyPayment"><ArrowDownLeft :size="13" /> Apply payment</button></div><p v-if="companyPaymentError" class="mt-2 text-[9px] text-[#a25454]">{{ companyPaymentError }}</p></section>
      </div>
      <footer class="flex justify-end border-t border-[#ece7ee] px-5 py-3"><button class="secondary-button" @click="selectedCompany = ''">Close ledger</button></footer>
    </section>
  </div>

  <article v-if="selectedReservation" class="invoice-print" :class="printMode === 'guest-id' ? 'invoice-print-id-mode' : ''">
    <template v-if="printMode === 'folio'">
      <header><div><p>CTHM HOTEL · FRONT OFFICE<span v-if="isCashBasisReservation(selectedReservation)" class="ml-2 rounded bg-[#fff0ce] px-2 py-1 text-[#785920]">CASH BASIS · PA</span></p><h1>Guest folio</h1></div><span>{{ folioId(selectedReservation) }}</span></header>
      <div class="invoice-print-details">
        <p><b>Guest name(s)</b><span>{{ [selectedReservation.guest, ...(selectedReservation.additionalGuests || [])].join(', ') }}</span></p>
        <p><b>Company</b><span>{{ selectedReservation.companyName || (selectedReservation.billingType === 'Company' ? selectedReservation.billingPerson : '—') }}</span></p>
        <p><b>Number of guests</b><span>{{ selectedReservation.guestCount || 1 }}</span></p>
        <p><b>Room no. / type</b><span>{{ selectedReservation.room }} · {{ selectedReservation.roomType || '—' }}</span></p>
        <p><b>Room rate</b><span>₱{{ selectedReservation.rate.toFixed(2) }} / night</span></p>
        <p><b>Address</b><span>{{ selectedReservation.homeAddress || selectedReservation.companyAddress || '—' }}</span></p>
        <p><b>Nationality</b><span>{{ selectedReservation.nationality || '—' }}</span></p>
        <p><b>Phone no.</b><span>{{ selectedReservation.guestPhone || selectedReservation.guestLandline || '—' }}</span></p>
        <p><b>Arrival date</b><span>{{ formatDate(selectedReservation.checkIn) }} · {{ formatTime(selectedReservation.arrivalTime) }}</span></p>
        <p><b>Departure date</b><span>{{ formatDate(selectedReservation.checkOut) }}</span></p>
        <p><b>Billing arrangement</b><span>{{ selectedReservation.billSettlementMethod || selectedReservation.paymentOption || 'Guest account' }}</span></p>
        <p><b>Charge to</b><span>{{ selectedReservation.billingPerson }}</span></p>
        <p><b>Prepared on</b><span>{{ formatDate(today) }}</span></p>
      </div>
      <table class="invoice-print-ledger"><thead><tr><th>Date</th><th>Reference</th><th>Charges / payments</th><th>Balance</th><th>Remarks</th></tr></thead><tbody><tr v-for="(row, index) in folioPrintRows" :key="`${row.reference}-${index}`"><td>{{ formatDate(row.date) }}</td><td>{{ row.reference }}</td><td>{{ row.amount < 0 ? '−' : '' }}₱{{ Math.abs(row.amount).toFixed(2) }} · {{ row.description }}</td><td>₱{{ row.balance.toFixed(2) }}</td><td>{{ row.remarks || '—' }}</td></tr></tbody></table>
      <div class="invoice-print-totals"><p><span>Total balance</span><b>₱{{ total(selectedReservation).toFixed(2) }}</b></p><p><span>Less deposit received</span><b>−₱{{ depositApplied.toFixed(2) }}</b></p><p><span>Other payments received</span><b>−₱{{ Math.max(0, paid(selectedReservation) - depositApplied).toFixed(2) }}</b></p><p v-if="isCashBasisReservation(selectedReservation)"><span>Cash-basis signing deposit held</span><b>₱{{ (selectedReservation.cashBasisDepositBalance || 0).toFixed(2) }}</b></p><p v-if="selectedReservation.cashBasisDepositRefunds?.length"><span>Cash-basis deposit refunded</span><b>₱{{ selectedReservation.cashBasisDepositRefunds.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2) }}</b></p><p class="invoice-print-payable"><span>Balance / amount payable</span><b>₱{{ balance(selectedReservation).toFixed(2) }}</b></p><p><span>Remarks</span><b>{{ selectedReservation.remarks || '—' }}</b></p></div>
      <p class="invoice-print-signoff">Guest / authorized representative: ____________________________ <span>Desk clerk: {{ selectedReservation.notedBy || '________________' }}</span></p>
    </template>
    <section v-else class="guest-id-card"><div class="guest-id-brand"><span>CTHM</span><small>HOTEL OPERATIONS</small></div><p class="guest-id-kicker">GUEST ID · PRESENT AT FRONT DESK</p><h1>{{ selectedReservation.guest }}</h1><p class="guest-id-number">{{ selectedReservation.guestIdNumber }}</p><div class="guest-id-details"><p><b>Room</b><span>{{ selectedReservation.room }}</span></p><p><b>Guests</b><span>{{ selectedReservation.guestCount || 1 }}</span></p><p><b>Arrival</b><span>{{ formatDate(selectedReservation.checkIn) }}</span></p><p><b>Departure</b><span>{{ formatDate(selectedReservation.checkOut) }}</span></p></div><p class="guest-id-property">Please keep this card during your stay.</p></section>
  </article>
</template>
