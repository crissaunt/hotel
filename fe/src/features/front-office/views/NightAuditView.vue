<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, ArrowRight, CalendarDays, Check, CircleCheck, Clock3, Info, LockKeyhole, MoonStar, Play, ReceiptText, X } from '@lucide/vue'
import { dateKey, reservations, type FolioCharge } from '@/features/front-office/stores/reservations'
import { businessDate, nextDate, nightAuditRuns, type NightAuditRun } from '@/features/front-office/stores/nightAudit'

const showConfirm = ref(false)
const auditError = ref('')
const note = ref('')
const cashierName = 'Jordan Lee'
const latestRun = computed(() => nightAuditRuns.value[0] || null)
const postedDate = computed(() => latestRun.value?.businessDate || '')
const inHouse = computed(() => reservations.value.filter((reservation) => reservation.status === 'In house'))
const stillNotCheckedIn = computed(() => reservations.value.filter((reservation) => ['Confirmed', 'Pending'].includes(reservation.status) && reservation.checkIn <= businessDate.value))
const roomChargesForToday = computed(() => inHouse.value.map((reservation) => {
  const charge = (reservation.roomCharges || []).find((item) => item.id === `NA-${businessDate.value}-${reservation.id}`)
  if (charge) return { reservation, state: 'Charged', amount: charge.amount }
  if (reservation.checkOut <= businessDate.value) return { reservation, state: 'No charge · leaves today', amount: 0 }
  return { reservation, state: 'Will charge', amount: reservation.rate }
}))
const pendingRoomCharges = computed(() => roomChargesForToday.value.filter((item) => item.state === 'Will charge'))
const eligibleNoShows = computed(() => stillNotCheckedIn.value.filter((item) => item.checkIn <= businessDate.value))
const postedCharges = computed(() => latestRun.value?.roomCharges || 0)
const postedOther = computed(() => latestRun.value?.otherCharges || 0)
const postedTax = computed(() => latestRun.value?.tax || 0)
const postedPayments = computed(() => latestRun.value?.payments || 0)
const onAccount = computed(() => Math.max(0, postedCharges.value + postedOther.value + postedTax.value - postedPayments.value))
const auditIsCurrent = computed(() => businessDate.value > dateKey(new Date()))
const currentDateString = computed(() => formatDate(businessDate.value))

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}
function money(value: number) { return `₱ ${value.toFixed(2)}` }
function stayPaymentsForDate(reservationId: string, date: string) {
  const stay = reservations.value.find((item) => item.id === reservationId)
  return (stay?.payments || []).filter((payment) => payment.receivedAt.slice(0, 10) === date).reduce((sum, payment) => sum + payment.amount, 0)
}
function otherChargesForDate(date: string) {
  return reservations.value.reduce((sum, reservation) => sum + (reservation.charges || []).filter((charge) => charge.date === date && !['Voided', 'Moved', 'Split'].includes(charge.status || '')).reduce((subtotal, charge) => subtotal + charge.amount, 0), 0)
}
function runAudit() {
  auditError.value = ''
  const auditDate = businessDate.value
  if (latestRun.value?.businessDate === auditDate) {
    auditError.value = 'This business date has already been closed. The audit cannot be posted twice.'
    return
  }
  const eligible = inHouse.value.filter((reservation) => reservation.checkOut > auditDate)
  let roomSubtotal = 0
  let taxSubtotal = 0
  for (const reservation of eligible) {
    reservation.roomCharges ||= []
    const chargeId = `NA-${auditDate}-${reservation.id}`
    if (reservation.roomCharges.some((charge) => charge.id === chargeId)) continue
    const amount = reservation.rate
    const charge: FolioCharge = { id: chargeId, description: `Room charge · night of ${formatDate(auditDate)}`, date: auditDate, amount, status: 'Posted', reference: `NIGHT-AUDIT-${auditDate}` }
    reservation.roomCharges.push(charge)
    roomSubtotal += amount
    if (!reservation.taxExempt) taxSubtotal += Math.round(amount * 0.21 * 100) / 100
  }
  const flaggedNoShows = eligibleNoShows.value.map((reservation) => reservation.id)
  for (const reservation of reservations.value) {
    if (flaggedNoShows.includes(reservation.id)) reservation.status = 'No show'
  }
  const other = otherChargesForDate(auditDate)
  const payments = reservations.value.reduce((sum, reservation) => sum + stayPaymentsForDate(reservation.id, auditDate), 0)
  const run: NightAuditRun = {
    id: `AUD-${auditDate}-${Date.now().toString(36).toUpperCase()}`,
    businessDate: auditDate,
    nextBusinessDate: nextDate(auditDate),
    roomCharges: roomSubtotal,
    otherCharges: other,
    tax: taxSubtotal,
    payments,
    noShows: flaggedNoShows,
    completedAt: new Date().toISOString(),
    completedBy: cashierName,
  }
  nightAuditRuns.value.unshift(run)
  businessDate.value = run.nextBusinessDate
  showConfirm.value = false
  note.value = `Night audit completed for ${formatDate(auditDate)}. ${eligible.length} room charge${eligible.length === 1 ? '' : 's'} posted, ${flaggedNoShows.length} no-show${flaggedNoShows.length === 1 ? '' : 's'} flagged. Business date advanced to ${formatDate(run.nextBusinessDate)}.`
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div><h1 class="font-serif text-[27px] font-medium tracking-[-0.035em] text-[#30243e]">Night Audit</h1><p class="mt-1 text-[11px] text-[#7d7583]">Post room charges, reconcile arrivals, and advance the hotel business date.</p></div>
      <div class="flex flex-wrap items-center gap-2"><span class="flex items-center gap-1.5 rounded-md border border-[#e8e2eb] bg-[#fffdfb] px-3 py-2 text-[10px] text-[#655b6c]"><CalendarDays :size="13" class="text-[#79569c]" /> Business date · {{ currentDateString }}</span><button v-if="!auditIsCurrent" class="arrival-action-primary" @click="showConfirm = true"><Play :size="13" /> Run night audit</button><span v-else class="flex items-center gap-1.5 rounded-md border border-[#cfe5d8] bg-[#f0f8f3] px-3 py-2 text-[10px] font-medium text-[#44805b]"><CircleCheck :size="13" /> Up to date</span></div>
    </header>

    <div v-if="note" class="flex items-start justify-between gap-3 rounded-md border border-[#d5e8da] bg-[#f1f8f3] px-3 py-2.5 text-[10px] leading-5 text-[#426d50]" role="status"><span class="flex items-start gap-2"><Check :size="13" class="mt-1 shrink-0" />{{ note }}</span><button aria-label="Dismiss notice" @click="note = ''"><X :size="13" /></button></div>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeaf0] bg-[#fffdfb] px-4 py-3"><h2 class="flex items-center gap-2 text-[12px] font-semibold text-[#493d50]"><LockKeyhole :size="14" class="text-[#765395]" /> Posted totals <span v-if="postedDate" class="font-normal text-[#8a818e]">· {{ formatDate(postedDate) }}</span><span v-else class="font-normal text-[#8a818e]">· No completed audit yet</span></h2><span v-if="latestRun" class="flex items-center gap-1 text-[9px] text-[#8b8490]"><Clock3 :size="11" /> Closed {{ new Date(latestRun.completedAt).toLocaleString('en-SG') }}</span><span v-else class="text-[9px] text-[#8b8490]">Totals will appear after first close</span></div>
      <div class="grid grid-cols-1 gap-px bg-[#eeeaf0] sm:grid-cols-3">
        <div class="bg-[#fffdfb] p-3.5"><div class="flex items-center justify-between"><span class="text-[10px] font-semibold text-[#5d5365]">Charges</span><strong class="text-[14px] font-semibold text-[#30243e]">{{ money(postedCharges + postedOther + postedTax) }}</strong></div><div class="mt-2 space-y-1 border-t border-[#f0edf1] pt-2 text-[9px] text-[#817985]"><p class="flex justify-between"><span>Room</span><span>{{ money(postedCharges) }}</span></p><p class="flex justify-between"><span>Other</span><span>{{ money(postedOther) }}</span></p><p class="flex justify-between"><span>Tax · 21%</span><span>{{ money(postedTax) }}</span></p></div></div>
        <div class="bg-[#fffdfb] p-3.5"><div class="flex items-center justify-between"><span class="text-[10px] font-semibold text-[#5d5365]">Payments received</span><strong class="text-[14px] font-semibold text-[#30243e]">{{ money(postedPayments) }}</strong></div><div class="mt-2 space-y-1 border-t border-[#f0edf1] pt-2 text-[9px] text-[#817985]"><p class="flex justify-between"><span>Payments posted on audit date</span><span>{{ money(postedPayments) }}</span></p><p class="flex justify-between"><span>Room nights to post now</span><span>{{ pendingRoomCharges.length }}</span></p></div></div>
        <div class="bg-[#fff9e9] p-3.5"><div class="flex items-center justify-between"><span class="text-[10px] font-semibold text-[#7b6337]">On account</span><strong class="text-[14px] font-semibold text-[#9b542b]">{{ money(onAccount) }}</strong></div><div class="mt-2 border-t border-[#efe6d0] pt-2 text-[9px] text-[#8b806a]">Charges and tax less payments received on the posted business date.</div></div>
      </div>
    </section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeaf0] px-4 py-3"><div><h2 class="text-[12px] font-semibold text-[#493d50]">In house</h2><p class="mt-0.5 text-[9px] text-[#8b8490]">Tonight’s room rent is posted for occupied stays that continue past this business date.</p></div><span class="rounded-full bg-[#f4eff8] px-2 py-1 text-[9px] text-[#65458a]">{{ inHouse.length }} stays</span></header>
      <div class="overflow-x-auto"><table class="w-full min-w-[760px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="report-head pl-4">ID</th><th class="report-head">Guest</th><th class="report-head">Room</th><th class="report-head">Check-out</th><th class="report-head">Tonight</th><th class="report-head pr-4 text-right">Charge</th></tr></thead><tbody><tr v-for="item in roomChargesForToday" :key="item.reservation.id" class="report-row"><td class="report-cell pl-4 text-[#7c7382]">{{ item.reservation.id }}</td><td class="report-cell font-semibold text-[#403747]">{{ item.reservation.guest }}</td><td class="report-cell"><span class="rounded-full bg-[#e8f5ed] px-2 py-1 text-[9px] text-[#3e7752]">{{ item.reservation.room }}</span></td><td class="report-cell">{{ formatDate(item.reservation.checkOut) }}</td><td class="report-cell"><span class="rounded-full px-2 py-1 text-[8px] font-medium" :class="item.state === 'Charged' ? 'bg-[#e8f5ed] text-[#3e7752]' : item.state === 'Will charge' ? 'bg-[#e8f1fd] text-[#426c9a]' : 'bg-[#f2f0f2] text-[#756f79]'">{{ item.state }}</span></td><td class="report-cell pr-4 text-right font-medium">{{ item.amount ? money(item.amount) : '—' }}</td></tr><tr v-if="inHouse.length === 0"><td colspan="6" class="py-9 text-center text-[10px] text-[#8b8490]">No guests are currently in house.</td></tr></tbody></table></div>
    </section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <header class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeaf0] px-4 py-3"><div><h2 class="flex items-center gap-1.5 text-[12px] font-semibold text-[#493d50]">Still not checked in <Info :size="12" class="text-[#aaa1ad]" /></h2><p class="mt-0.5 text-[9px] text-[#8b8490]">Due to arrive on or before {{ currentDateString }}. Unchecked arrivals will be marked no-show when the audit closes.</p></div><span class="rounded-full bg-[#fff4e8] px-2 py-1 text-[9px] text-[#9a6836]">{{ stillNotCheckedIn.length }} pending</span></header>
      <div class="overflow-x-auto"><table class="w-full min-w-[690px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="report-head pl-4">ID</th><th class="report-head">Guest</th><th class="report-head">Room</th><th class="report-head">Expected arrival</th><th class="report-head">On close</th><th class="report-head pr-4 text-right">Fee</th></tr></thead><tbody><tr v-for="item in stillNotCheckedIn" :key="item.id" class="report-row"><td class="report-cell pl-4 text-[#7c7382]">{{ item.id }}</td><td class="report-cell font-semibold text-[#403747]">{{ item.guest }}</td><td class="report-cell"><span class="rounded-full bg-[#e8f5ed] px-2 py-1 text-[9px] text-[#3e7752]">{{ item.room }}</span></td><td class="report-cell">{{ formatDate(item.checkIn) }} · {{ item.arrivalTime }}</td><td class="report-cell"><span class="rounded-full bg-[#fff4df] px-2 py-1 text-[8px] font-medium text-[#8b6b36]">Will mark no-show · no fee</span></td><td class="report-cell pr-4 text-right">—</td></tr><tr v-if="stillNotCheckedIn.length === 0"><td colspan="6" class="py-9 text-center text-[10px] text-[#8b8490]">All due arrivals are checked in or otherwise accounted for.</td></tr></tbody></table></div>
    </section>

    <section v-if="latestRun" class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#e9e3ed] bg-[#faf7fc] px-4 py-3 text-[9px] text-[#6f6379]"><span class="flex items-center gap-2"><ReceiptText :size="13" class="text-[#79569c]" /> Last close: {{ latestRun.noShows.length }} no-show{{ latestRun.noShows.length === 1 ? '' : 's' }} flagged · completed by {{ latestRun.completedBy }}</span><span>Business date advanced <strong class="font-semibold text-[#503d61]">{{ formatDate(latestRun.businessDate) }} <ArrowRight :size="11" class="inline" /> {{ formatDate(latestRun.nextBusinessDate) }}</strong></span></section>

    <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="audit-confirm-title"><header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Night audit · close business date</p><h2 id="audit-confirm-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Close {{ currentDateString }}?</h2><p class="mt-2 text-[10px] leading-5 text-[#807884]">This will post eligible room rent to guest folios, flag due arrivals who have not checked in as no-shows (no fee), and advance the business date to {{ formatDate(nextDate(businessDate)) }}.</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close confirmation" @click="showConfirm = false"><X :size="16" /></button></header><div class="my-4 grid grid-cols-2 gap-2"><div class="rounded-md bg-[#f5f1f8] p-3"><span class="block text-[9px] text-[#7e7389]">Room charges to post</span><strong class="mt-1 block text-[15px] text-[#493d50]">{{ pendingRoomCharges.length }}</strong></div><div class="rounded-md bg-[#fff6e9] p-3"><span class="block text-[9px] text-[#8a7a61]">No-shows to flag</span><strong class="mt-1 block text-[15px] text-[#795c32]">{{ eligibleNoShows.length }}</strong></div></div><p v-if="auditError" class="mb-3 flex items-center gap-2 text-[10px] text-[#a25454]"><AlertTriangle :size="13" />{{ auditError }}</p><footer class="flex justify-end gap-2"><button class="secondary-button" @click="showConfirm = false">Review again</button><button class="arrival-action-primary" @click="runAudit"><Check :size="13" /> Post charges &amp; close day</button></footer></section></div>
  </section>
</template>
