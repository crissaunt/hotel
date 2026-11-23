<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, CircleAlert, FileText, Plus, Search, ShoppingBag, Undo2, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { applyCashBasisDepositToCharge, canSignOutletCharge, dateKey, hasSponsorSigningAuthorization, isCashBasisReservation, outletChargeTotal, reservations, type FolioCharge, type Reservation } from '@/features/front-office/stores/reservations'

type ChargeRow = { reservation: Reservation; charge: FolioCharge; category: string }
const today = dateKey(new Date())
const cashierName = 'Jordan Lee'
const search = ref('')
const dateFilter = ref<'All dates' | 'Today' | 'Specific date'>('All dates')
const specificDate = ref(today)
const categoryFilter = ref('All services')
const showPostForm = ref(false)
const selectedStayId = ref('')
const chargeCategory = ref('Restaurant')
const chargeDescription = ref('Dinner')
const chargeAmount = ref('')
const chargeDate = ref(today)
const chargeReference = ref('')
const chargeOutlet = ref('Restaurant')
const chargeError = ref('')
const voidTarget = ref<ChargeRow | null>(null)
const voidReason = ref('')
const voidError = ref('')
const notice = ref('')

const activeStays = computed(() => reservations.value.filter((stay) => !['Cancelled', 'No show', 'Checked out'].includes(stay.status) && stay.room !== 'Unassigned'))
const rows = computed<ChargeRow[]>(() => reservations.value.flatMap((reservation) => (reservation.charges || []).map((charge) => ({ reservation, charge, category: charge.category || inferCategory(charge.description) }))))
const filteredRows = computed(() => rows.value.filter(({ reservation, charge, category }) => {
  if (dateFilter.value === 'Today' && charge.date !== today) return false
  if (dateFilter.value === 'Specific date' && charge.date !== specificDate.value) return false
  if (categoryFilter.value !== 'All services' && category !== categoryFilter.value) return false
  const query = search.value.trim().toLowerCase()
  return !query || [reservation.id, reservation.guest, reservation.billingPerson, reservation.room, charge.description, charge.reference || '', category].some((value) => value.toLowerCase().includes(query))
}).sort((a, b) => b.charge.date.localeCompare(a.charge.date)))
const activeRows = computed(() => rows.value.filter(({ charge }) => isActive(charge)))
const todayRows = computed(() => activeRows.value.filter(({ charge }) => charge.date === today))
const todayRevenue = computed(() => todayRows.value.reduce((sum, { charge }) => sum + charge.amount, 0))
const voidedCount = computed(() => rows.value.filter(({ charge }) => charge.status === 'Voided').length)
const serviceTypes = computed(() => ['All services', ...new Set(rows.value.map((row) => row.category))].sort((a, b) => a === 'All services' ? -1 : a.localeCompare(b)))
const selectedStay = computed(() => reservations.value.find((stay) => stay.id === selectedStayId.value) || null)

function isActive(charge: FolioCharge) { return !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted') }
function inferCategory(description: string) {
  const text = description.toLowerCase()
  if (text.includes('restaurant') || text.includes('dinner') || text.includes('breakfast') || text.includes('lunch')) return 'Restaurant'
  if (text.includes('laundry')) return 'Laundry'
  if (text.includes('minibar')) return 'Minibar'
  if (text.includes('parking')) return 'Parking'
  if (text.includes('spa')) return 'Spa'
  return 'Other'
}
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }) }
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function isPostable(stay: Reservation) { return !['Cancelled', 'No show', 'Checked out'].includes(stay.status) }
function showNewCharge() {
  selectedStayId.value = activeStays.value[0]?.id || ''
  chargeCategory.value = 'Restaurant'
  chargeDescription.value = 'Dinner'
  chargeAmount.value = ''
  chargeDate.value = today
  chargeOutlet.value = 'Restaurant'
  chargeReference.value = ''
  chargeError.value = ''
  showPostForm.value = true
}
function postCharge() {
  chargeError.value = ''
  const stay = selectedStay.value
  const amount = Math.round(Number(chargeAmount.value) * 100) / 100
  if (!stay || !isPostable(stay)) { chargeError.value = 'Choose an active reservation to receive this charge.'; return }
  if (!chargeDescription.value.trim()) { chargeError.value = 'Enter a description for the service.'; return }
  if (!Number.isFinite(amount) || amount <= 0) { chargeError.value = 'Enter an amount greater than zero.'; return }
  if (!chargeDate.value || chargeDate.value > today) { chargeError.value = 'Choose a valid charge date.'; return }
  const chargeTotal = outletChargeTotal(stay, amount)
  if (!canSignOutletCharge(stay, chargeTotal)) {
    stay.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, chargeTotal - (stay.cashBasisDepositBalance || 0)).toFixed(2)} required for pending ${chargeOutlet.value.toLowerCase()} charge including tax.`
    chargeError.value = 'Signing is not authorized for this guest. Record a signing deposit or sponsor authorization first.'
    return
  }
  if (isCashBasisReservation(stay) && !hasSponsorSigningAuthorization(stay)
    && !applyCashBasisDepositToCharge(stay, chargeTotal)) {
    chargeError.value = 'The signing deposit could not be applied. Collect another deposit before posting.'
    return
  }
  stay.charges ||= []
  const charge: FolioCharge = {
    id: `CHG-${Date.now().toString(36).toUpperCase()}`,
    description: chargeDescription.value.trim(),
    date: chargeDate.value,
    amount,
    category: chargeCategory.value,
    outlet: chargeOutlet.value,
    postedBy: cashierName,
    reference: chargeReference.value.trim() || undefined,
    status: 'Posted',
  }
  stay.charges.push(charge)
  notice.value = `${money(amount)} ${chargeCategory.value.toLowerCase()} charge posted to ${stay.guest}’s folio.`
  showPostForm.value = false
  window.setTimeout(() => { notice.value = '' }, 4000)
}
function startVoid(row: ChargeRow) { voidTarget.value = row; voidReason.value = ''; voidError.value = '' }
function confirmVoid() {
  if (!voidTarget.value) return
  if (!voidReason.value.trim()) { voidError.value = 'Enter a reason. The void record will be kept in the folio.'; return }
  voidTarget.value.charge.status = 'Voided'
  voidTarget.value.charge.voidReason = voidReason.value.trim()
  voidTarget.value.charge.voidedAt = new Date().toISOString()
  notice.value = `${voidTarget.value.charge.description} marked void. The folio record was retained.`
  voidTarget.value = null
  window.setTimeout(() => { notice.value = '' }, 4000)
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><h1 class="font-serif text-[30px] font-medium tracking-[-0.035em] text-[#30243e] sm:text-[34px]">Service charges</h1><p class="mt-1 text-[11px] text-[#7d7583]">Post restaurant, laundry, minibar, and other services directly to a guest’s folio.</p></div><button class="arrival-action-primary" :disabled="activeStays.length === 0" @click="showNewCharge"><Plus :size="13" /> Post a charge</button></header>
    <div v-if="notice" class="rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[10px] text-[#4a7356]" role="status">{{ notice }}</div>

    <section class="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] sm:grid-cols-4"><div class="client-metric"><span><ShoppingBag :size="13" /> Charges today</span><strong>{{ todayRows.length }}</strong><small>Posted to active folios</small></div><div class="client-metric"><span><FileText :size="13" /> Service revenue today</span><strong>{{ money(todayRevenue) }}</strong><small>Before folio VAT</small></div><div class="client-metric"><span><CircleAlert :size="13" /> Voided records</span><strong>{{ voidedCount }}</strong><small>Retained for audit trail</small></div><div class="client-metric"><span><UsersRound :size="13" /> Active stays</span><strong>{{ activeStays.length }}</strong><small>Available folio destinations</small></div></section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf0] px-4 py-3"><div><h2 class="text-[12px] font-semibold text-[#493d50]">Posted charges</h2><p class="mt-0.5 text-[9px] text-[#8b8490]">Service charges stay on the guest folio. Void records remain visible.</p></div><RouterLink to="/invoices" class="text-[9px] font-medium text-[#704b99] hover:underline">Open folios &amp; invoices →</RouterLink></div>
      <div class="flex flex-col gap-3 border-b border-[#eeeaf0] px-4 py-3 xl:flex-row xl:items-center xl:justify-between"><div class="flex flex-wrap items-center gap-2"><label class="client-search"><Search :size="13" /><span class="sr-only">Search service charges</span><input v-model="search" placeholder="Search guest, room, description, reference" /></label><label class="sr-only" for="service-category">Filter by service</label><select id="service-category" v-model="categoryFilter" class="reservation-select"><option v-for="category in serviceTypes" :key="category">{{ category }}</option></select></div><div class="flex flex-wrap items-center gap-1.5"><span class="text-[9px] text-[#8c8490]">Date:</span><button v-for="mode in (['All dates', 'Today', 'Specific date'] as const)" :key="mode" class="report-period" :class="dateFilter === mode ? 'report-period-active' : ''" @click="dateFilter = mode">{{ mode }}</button><input v-if="dateFilter === 'Specific date'" v-model="specificDate" type="date" class="report-date" /></div></div>
      <div class="flex items-center justify-between px-4 py-2.5 text-[9px] text-[#8c8490]"><span>{{ filteredRows.length }} charge{{ filteredRows.length === 1 ? '' : 's' }}</span><span>Charges include service details and folio destination</span></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1000px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-4">Date</th><th class="reservation-head">Guest / stay</th><th class="reservation-head">Room</th><th class="reservation-head">Service</th><th class="reservation-head">Outlet</th><th class="reservation-head">Reference</th><th class="reservation-head">Posted by</th><th class="reservation-head text-right">Amount</th><th class="reservation-head">Status</th><th class="reservation-head pr-4"></th></tr></thead><tbody><tr v-for="row in filteredRows" :key="row.charge.id" class="reservation-row" :class="!isActive(row.charge) ? 'folio-entry-inactive' : ''"><td class="reservation-cell pl-4 text-[#69767c]">{{ formatDate(row.charge.date) }}</td><td class="reservation-cell"><strong class="block font-medium text-[#46515a]">{{ row.reservation.guest }}</strong><small class="text-[8px] text-[#8d8591]">{{ row.reservation.id }} · {{ row.reservation.billingPerson }}</small></td><td class="reservation-cell"><span class="room-code">{{ row.reservation.room }}</span></td><td class="reservation-cell"><span class="client-kind client-kind-company">{{ row.category }}</span><span class="mt-1 block text-[8px] text-[#837a89]">{{ row.charge.description }}<span v-if="row.charge.voidReason"> · Void: {{ row.charge.voidReason }}</span></span></td><td class="reservation-cell text-[#6f6675]">{{ row.charge.outlet || '—' }}</td><td class="reservation-cell text-[#6f6675]">{{ row.charge.reference || '—' }}</td><td class="reservation-cell text-[#6f6675]">{{ row.charge.postedBy || '—' }}</td><td class="reservation-cell text-right font-medium" :class="isActive(row.charge) ? 'text-[#4d4355]' : 'line-through text-[#948b98]'">{{ money(row.charge.amount) }}</td><td class="reservation-cell"><span class="folio-entry-status" :class="!isActive(row.charge) ? 'folio-entry-status-muted' : ''">{{ row.charge.status || 'Posted' }}</span></td><td class="reservation-cell pr-4 text-right"><button v-if="isActive(row.charge)" class="folio-row-action folio-void-button" @click="startVoid(row)"><Undo2 :size="11" /> Void</button></td></tr><tr v-if="filteredRows.length === 0"><td colspan="10" class="py-14 text-center"><ShoppingBag :size="19" class="mx-auto text-[#aa9bb6]" /><p class="mt-2 text-[11px] font-medium text-[#5b5162]">No service charges found</p><p class="mt-1 text-[9px] text-[#918894]">Post a charge to an active guest stay to see it in this ledger.</p></td></tr></tbody></table></div>
    </section>

    <div v-if="showPostForm" class="modal-backdrop" @click.self="showPostForm = false"><section class="modal-card max-h-[90vh] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="post-charge-title"><header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Service charges · post to folio</p><h2 id="post-charge-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Post a service charge</h2><p class="mt-1 text-[10px] text-[#807884]">This charge will appear in the selected stay’s folio and invoice.</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close charge form" @click="showPostForm = false"><X :size="16" /></button></header><div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="form-label sm:col-span-2">Guest stay<select v-model="selectedStayId" class="form-input mt-1"><option value="">Choose an active stay</option><option v-for="stay in activeStays" :key="stay.id" :value="stay.id">{{ stay.guest }} · Room {{ stay.room }} · {{ stay.id }} · {{ stay.status }}</option></select></label><div v-if="selectedStay" class="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#ece7ef] bg-[#faf7fc] px-3 py-2 text-[9px] text-[#665a70]"><span>Billing person <strong class="ml-1 text-[#453a4e]">{{ selectedStay.billingPerson }}</strong></span><span>Stay balance <strong class="ml-1 text-[#453a4e]">{{ money(Math.max(0, selectedStay.rate + selectedStay.otherCharges - (selectedStay.amountPaid || 0))) }}</strong></span></div><label class="form-label">Service category<select v-model="chargeCategory" class="form-input mt-1"><option>Restaurant</option><option>Room service</option><option>Laundry</option><option>Minibar</option><option>Parking</option><option>Spa</option><option>Other</option></select></label><label class="form-label">Outlet / department<select v-model="chargeOutlet" class="form-input mt-1"><option>Restaurant</option><option>Room service</option><option>Housekeeping</option><option>Front desk</option><option>Spa</option><option>Other</option></select></label><label class="form-label">Description<input v-model="chargeDescription" class="form-input mt-1" placeholder="e.g. Dinner, shirt pressing" /></label><label class="form-label">Amount (₱)<input v-model="chargeAmount" class="form-input mt-1" type="number" min="0.01" step="0.01" placeholder="0.00" /></label><label class="form-label">Charge date<input v-model="chargeDate" class="form-input mt-1" type="date" :max="today" /></label><label class="form-label">Receipt / reference<input v-model="chargeReference" class="form-input mt-1" placeholder="Optional receipt number" /></label></div><p v-if="chargeError" class="mt-3 flex items-center gap-2 text-[10px] text-[#a25454]"><CircleAlert :size="13" />{{ chargeError }}</p><footer class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eee8f0] pt-3"><p class="text-[9px] text-[#877e8c]">VAT is calculated in the folio total.</p><div class="flex gap-2"><button class="secondary-button" @click="showPostForm = false">Cancel</button><button class="arrival-action-primary" @click="postCharge"><Check :size="13" /> Post to folio</button></div></footer></section></div>

    <div v-if="voidTarget" class="modal-backdrop" @click.self="voidTarget = null"><section class="modal-card text-left" role="dialog" aria-modal="true" aria-labelledby="void-service-title"><p class="eyebrow">Service charges · audit trail</p><h2 id="void-service-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Void this charge?</h2><p class="mt-2 text-[10px] text-[#807884]">{{ voidTarget.reservation.guest }} · {{ voidTarget.charge.description }} · {{ money(voidTarget.charge.amount) }}</p><p class="mt-2 text-[9px] text-[#827987]">The entry will remain visible in the folio as voided.</p><label class="form-label mt-4">Void reason<input v-model="voidReason" class="form-input mt-1" placeholder="Reason required" /></label><p v-if="voidError" class="mt-2 text-[9px] text-[#a25454]">{{ voidError }}</p><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="voidTarget = null">Cancel</button><button class="folio-void-confirm" @click="confirmVoid"><Undo2 :size="12" /> Void charge</button></footer></section></div>
  </section>
</template>
