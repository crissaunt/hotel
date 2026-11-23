<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChartNoAxesCombined, Check, ChevronDown, Download, Filter, Info, Printer, RefreshCw, Search, SlidersHorizontal, StickyNote, X } from '@lucide/vue'
import { reservations, type Reservation } from '@/features/front-office/stores/reservations'
import { pettyExpenses, tillSessions, todayKey } from '@/features/front-office/stores/cashier'

type Section = 'Front Desk' | 'Cashiering' | 'Night Audit' | 'Revenue'
type ReportKey = 'Arrivals' | 'Departures' | 'In-house' | 'Reservations' | 'Cashier payments' | 'Petty expenses' | 'Till summary' | 'Night audit checklist' | 'Revenue summary' | 'Room occupancy'
type ReportRow = Record<string, string | number>
const sections: Section[] = ['Front Desk', 'Cashiering', 'Night Audit', 'Revenue']
const reportsBySection: Record<Section, ReportKey[]> = {
  'Front Desk': ['Arrivals', 'Departures', 'In-house', 'Reservations'],
  Cashiering: ['Cashier payments', 'Petty expenses', 'Till summary'],
  'Night Audit': ['Night audit checklist'],
  Revenue: ['Revenue summary', 'Room occupancy'],
}
const today = todayKey()
const section = ref<Section>('Front Desk')
const report = ref<ReportKey>('Arrivals')
const period = ref<'Today' | 'Specific date' | 'Date range'>('Today')
const selectedDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const search = ref('')
const showFilters = ref(false)
const statusFilter = ref('All statuses')
const floorFilter = ref('All floors')
const showColumns = ref(false)
const showNotes = ref(false)
const reportNote = ref('')
const savedNote = ref('')
const refreshedAt = ref(new Date())
const notice = ref('')
const visibleColumns = ref<string[]>([])

const dateBounds = computed(() => period.value === 'Today'
  ? { from: today, to: today }
  : period.value === 'Specific date'
    ? { from: selectedDate.value, to: selectedDate.value }
    : { from: rangeStart.value, to: rangeEnd.value })
const reportChoices = computed(() => reportsBySection[section.value])
const activeReservations = computed(() => reservations.value.filter((item) => item.status !== 'Cancelled' && item.status !== 'No show'))
const matchesDates = (date: string) => date >= dateBounds.value.from && date <= dateBounds.value.to
const floorOf = (room: string) => room === 'Unassigned' ? 'Unassigned' : `${room[0]}${room[0] === '1' ? 'st' : room[0] === '2' ? 'nd' : room[0] === '3' ? 'rd' : 'th'} Floor`
const floorOptions = computed(() => ['All floors', ...new Set(activeReservations.value.filter((item) => item.room !== 'Unassigned').map((item) => floorOf(item.room)))])
const selectedReservations = computed(() => activeReservations.value.filter((item) => {
  const date = report.value === 'Departures' ? item.checkOut : item.checkIn
  const matchesDate = report.value === 'In-house' ? item.status === 'In house' : report.value === 'Reservations' ? matchesDates(item.checkIn) || matchesDates(item.checkOut) : matchesDates(date)
  const query = search.value.trim().toLowerCase()
  const matchesSearch = !query || [item.id, item.guest, item.billingPerson, item.room, item.room].some((value) => value.toLowerCase().includes(query))
  const matchesStatus = statusFilter.value === 'All statuses' || item.status === statusFilter.value
  const matchesFloor = floorFilter.value === 'All floors' || floorOf(item.room) === floorFilter.value
  return matchesDate && matchesSearch && matchesStatus && matchesFloor
}))
const rows = computed<ReportRow[]>(() => {
  if (['Arrivals', 'Departures', 'In-house', 'Reservations'].includes(report.value)) {
    return selectedReservations.value.map((item) => reservationRow(item))
  }
  if (report.value === 'Petty expenses') {
    return pettyExpenses.value.filter((item) => matchesDates(item.date) && item.status === 'Recorded' && (!search.value || [item.description, item.payee, item.category, item.id].some((value) => value.toLowerCase().includes(search.value.trim().toLowerCase())))).map((item) => ({ Date: item.date, Category: item.category, Description: item.description, Payee: item.payee, Method: item.method, Cashier: item.cashier, Amount: money(item.amount), Reference: item.reference || item.id }))
  }
  if (report.value === 'Cashier payments') {
    return reservations.value.flatMap((reservation) => (reservation.payments || []).filter((payment) => matchesDates(payment.receivedAt.slice(0, 10)) && (!search.value || [reservation.guest, reservation.id, payment.method].some((value) => value.toLowerCase().includes(search.value.trim().toLowerCase())))).map((payment) => ({ Date: payment.receivedAt.slice(0, 10), Guest: reservation.guest, Reservation: reservation.id, Method: payment.method, Amount: money(payment.amount), Room: reservation.room })))
  }
  if (report.value === 'Till summary') {
    return tillSessions.value.filter((till) => matchesDates(till.businessDate)).map((till) => ({ Date: till.businessDate, Till: till.name, Cashier: till.openedBy, Status: till.status, 'Opening float': money(till.openingAmount), 'Counted cash': till.closingAmount === undefined ? 'Open' : money(till.closingAmount) }))
  }
  if (report.value === 'Night audit checklist') {
    const checks: Array<[string, string, string]> = [
      ['Reservations reviewed', `${reservations.value.length} bookings in system`, 'Ready'],
      ['Arrivals reconciled', `${activeReservations.value.filter((item) => matchesDates(item.checkIn)).length} arrivals for period`, 'Ready'],
      ['Departures reconciled', `${activeReservations.value.filter((item) => matchesDates(item.checkOut)).length} departures for period`, 'Ready'],
      ['Open tills reviewed', `${tillSessions.value.filter((item) => item.status === 'Open').length} till(s) currently open`, tillSessions.value.some((item) => item.status === 'Open') ? 'Review' : 'Ready'],
      ['Petty expenses reviewed', `${pettyExpenses.value.filter((item) => matchesDates(item.date) && item.status === 'Recorded').length} recorded expenses`, 'Ready'],
    ]
    return checks.map(([Task, Details, Status]) => ({ Task, Details, Status }))
  }
  if (report.value === 'Revenue summary') {
    const revenueReservations = activeReservations.value.filter((item) => matchesDates(item.checkIn))
    const gross = revenueReservations.reduce((sum, item) => sum + stayTotal(item), 0)
    const paid = revenueReservations.reduce((sum, item) => sum + (item.payments || []).reduce((subtotal, payment) => subtotal + payment.amount, 0), 0)
    return [{ Metric: 'Room revenue', Amount: money(revenueReservations.reduce((sum, item) => sum + nights(item) * item.rate, 0)) }, { Metric: 'Other charges', Amount: money(revenueReservations.reduce((sum, item) => sum + item.otherCharges, 0)) }, { Metric: 'Total charges', Amount: money(gross) }, { Metric: 'Payments received', Amount: money(paid) }, { Metric: 'Outstanding balance', Amount: money(Math.max(0, gross - paid)) }]
  }
  const inventory = 60
  const occupied = activeReservations.value.filter((item) => item.status === 'In house' && matchesDates(item.checkIn) && matchesDates(item.checkOut)).length
  return [{ Metric: 'Rooms in property', Amount: inventory }, { Metric: 'Rooms occupied', Amount: occupied }, { Metric: 'Occupancy', Amount: `${Math.round(occupied / inventory * 100)}%` }, { Metric: 'Rooms available', Amount: inventory - occupied }]
})
function reservationRow(item: Reservation): ReportRow {
  return {
    [report.value === 'Departures' ? 'Departure' : report.value === 'In-house' ? 'Stay status' : 'Arrival']: report.value === 'Departures' ? item.checkOut : report.value === 'In-house' ? item.status : item.checkIn,
    Reservation: item.id,
    Guest: item.guest,
    Status: item.status,
    Room: item.room,
    'Room type': roomType(item.room),
    Departure: item.checkOut,
    Guests: item.guestCount || 1,
    Rate: money(item.rate),
    'Payment status': paymentStatus(item),
  }
}
function nights(item: Reservation) { return Math.max(1, Math.round((new Date(`${item.checkOut}T12:00:00`).getTime() - new Date(`${item.checkIn}T12:00:00`).getTime()) / 86400000)) }
function roomType(room: string) {
  if (room === 'Unassigned') return 'Unassigned'
  const types = ['Deluxe King', 'Deluxe Twin', 'Garden Suite', 'Courtyard Studio']
  const floorIndex = Math.max(0, Number(room[0]) - 1)
  const roomIndex = Math.max(0, Number(room.slice(1)) - 1)
  return types[(roomIndex + floorIndex) % types.length] || 'Standard'
}
function stayTotal(item: Reservation) { return nights(item) * item.rate + item.otherCharges }
function paymentStatus(item: Reservation) {
  const paid = (item.payments || []).reduce((sum, payment) => sum + payment.amount, 0) + (item.amountPaid || 0)
  return paid <= 0 ? 'Unpaid' : paid >= stayTotal(item) ? 'Paid' : 'Part paid'
}
function money(value: number) { return `₱ ${value.toFixed(2)}` }
function printReport() { window.print() }
const columns = computed(() => rows.value.length ? Object.keys(rows.value[0]!) : defaultColumns.value)
const defaultColumns = computed(() => report.value === 'Arrivals' ? ['Arrival', 'Reservation', 'Guest', 'Status', 'Room', 'Room type', 'Departure', 'Guests', 'Rate', 'Payment status'] : [])
const displayedColumns = computed(() => visibleColumns.value.length ? columns.value.filter((column) => visibleColumns.value.includes(column)) : columns.value)
const metrics = computed(() => {
  if (section.value === 'Front Desk') {
    const arrivals = activeReservations.value.filter((item) => item.checkIn === today && item.status !== 'In house')
    const deposits = arrivals.reduce((sum, item) => sum + (item.payments || []).reduce((subtotal, payment) => subtotal + payment.amount, 0), 0)
    return [{ label: 'Expected arrivals', value: arrivals.length }, { label: 'Guests arriving', value: arrivals.reduce((sum, item) => sum + (item.guestCount || 1), 0) }, { label: 'VIP arrivals', value: 'Not tracked' }, { label: 'Deposits received', value: money(deposits) }]
  }
  if (section.value === 'Cashiering') {
    const expenses = pettyExpenses.value.filter((item) => item.date === today && item.status === 'Recorded')
    return [{ label: 'Payments today', value: reservations.value.flatMap((item) => item.payments || []).filter((item) => item.receivedAt.slice(0, 10) === today).length }, { label: 'Petty expenses', value: expenses.length }, { label: 'Petty outflow', value: money(expenses.reduce((sum, item) => sum + item.amount, 0)) }, { label: 'Open tills', value: tillSessions.value.filter((item) => item.status === 'Open').length }]
  }
  if (section.value === 'Night Audit') return [{ label: 'Checks ready', value: tillSessions.value.some((item) => item.status === 'Open') ? 4 : 5 }, { label: 'Items to review', value: tillSessions.value.filter((item) => item.status === 'Open').length }, { label: 'Business date', value: today }, { label: 'Last refresh', value: refreshedAt.value.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' }) }]
  const rev = activeReservations.value.filter((item) => matchesDates(item.checkIn))
  return [{ label: 'Room revenue', value: money(rev.reduce((sum, item) => sum + nights(item) * item.rate, 0)) }, { label: 'Other charges', value: money(rev.reduce((sum, item) => sum + item.otherCharges, 0)) }, { label: 'Nights sold', value: rev.reduce((sum, item) => sum + nights(item), 0) }, { label: 'Occupancy', value: `${Math.round(rev.filter((item) => item.status === 'In house').length / 60 * 100)}%` }]
})
function setSection(next: Section) { section.value = next; report.value = reportsBySection[next][0] || 'Arrivals'; search.value = ''; visibleColumns.value = [] }
function updateReport(value: ReportKey) { report.value = value; visibleColumns.value = [] }
function refresh() { refreshedAt.value = new Date(); notice.value = 'Report refreshed with current front-office records.'; window.setTimeout(() => { notice.value = '' }, 3500) }
function exportCsv() {
  const csv = [displayedColumns.value.join(','), ...rows.value.map((row) => displayedColumns.value.map((column) => `"${String(row[column] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `${report.value.toLowerCase().replaceAll(' ', '-')}-${today}.csv`; link.click(); URL.revokeObjectURL(url)
}
function toggleColumn(column: string) { visibleColumns.value = visibleColumns.value.includes(column) ? visibleColumns.value.filter((item) => item !== column) : [...visibleColumns.value, column] }
function saveNote() { savedNote.value = reportNote.value.trim(); showNotes.value = false; notice.value = savedNote.value ? 'Report note saved for this session.' : 'Report note cleared.'; window.setTimeout(() => { notice.value = '' }, 3500) }
</script>

<template>
  <section class="space-y-3">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div><h1 class="font-serif text-[25px] font-medium tracking-[-0.035em] text-[#30243e]">Reports &amp; Analysis <Info :size="12" class="inline text-[#a9a0ae]" /></h1></div>
      <div class="flex gap-1.5"><button class="report-action" @click="refresh"><RefreshCw :size="12" /> Refresh</button><button class="report-action" @click="showNotes = true"><StickyNote :size="12" /> Notes</button><button class="report-action" @click="printReport"><Printer :size="12" /> Print</button><button class="report-export" @click="exportCsv"><Download :size="12" /> Export</button></div>
    </header>

    <div v-if="notice" class="rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[10px] text-[#4a7356]">{{ notice }}</div>

    <section class="overflow-visible rounded-lg border border-[#e7e2e9] bg-[#fffdfb] shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeaf0] px-3 pt-2.5">
        <nav class="flex items-center gap-4" aria-label="Report categories"><button v-for="item in sections" :key="item" class="report-tab" :class="section === item ? 'report-tab-active' : ''" @click="setSection(item)">{{ item }}</button></nav>
      </div>
      <div class="flex flex-wrap items-end justify-between gap-3 p-3">
        <div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
          <label class="report-select-wrap"><span>Report</span><span class="relative"><select :value="report" class="report-select" @change="updateReport(($event.target as HTMLSelectElement).value as ReportKey)"><option v-for="choice in reportChoices" :key="choice">{{ choice }}</option></select><ChevronDown :size="12" /></span></label>
          <label class="report-search"><span class="sr-only">Search report records</span><Search :size="13" /><input v-model="search" placeholder="Guest, room, folio…" /></label>
          <div class="relative"><button class="report-action" :class="showFilters ? 'report-action-selected' : ''" @click="showFilters = !showFilters"><Filter :size="12" /> Filters</button><div v-if="showFilters" class="report-popover"><label>Reservation status<select v-model="statusFilter" class="form-input mt-1"><option>All statuses</option><option>Confirmed</option><option>In house</option><option>Checked out</option><option>Pending</option></select></label><label>Floor<select v-model="floorFilter" class="form-input mt-1"><option v-for="floor in floorOptions" :key="floor">{{ floor }}</option></select></label><button class="mt-3 text-[10px] font-medium text-[#704b99]" @click="statusFilter = 'All statuses'; floorFilter = 'All floors'">Clear filters</button></div></div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5"><span class="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-[#8c8490]"><CalendarDays :size="12" /> Reporting period</span><button v-for="mode in (['Today', 'Specific date', 'Date range'] as const)" :key="mode" class="report-period" :class="period === mode ? 'report-period-active' : ''" @click="period = mode">{{ mode }}</button><input v-if="period === 'Specific date'" v-model="selectedDate" type="date" class="report-date" /><template v-if="period === 'Date range'"><input v-model="rangeStart" type="date" class="report-date" /><span class="text-[10px] text-[#8a818e]">to</span><input v-model="rangeEnd" type="date" class="report-date" /></template></div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0edf1] px-3 py-2"><div class="flex flex-wrap items-center gap-4"><p v-for="metric in metrics" :key="metric.label" class="report-metric"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></p></div><p class="text-[9px] text-[#8c8490]">Showing {{ rows.length }} {{ rows.length === 1 ? 'record' : 'records' }}</p></div>
    </section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf0] px-3 py-3"><div><h2 class="flex items-center gap-1.5 text-[13px] font-semibold text-[#41364b]">{{ report }} <Info :size="12" class="text-[#aaa1ad]" /></h2><p class="mt-1 text-[9px] text-[#8d8591]">{{ dateBounds.from === dateBounds.to ? dateBounds.from : `${dateBounds.from} – ${dateBounds.to}` }} · Generated {{ refreshedAt.toLocaleString('en-SG') }}<span v-if="savedNote"> · Note saved</span></p></div><div class="relative"><button class="report-action" @click="showColumns = !showColumns"><SlidersHorizontal :size="12" /> Columns</button><div v-if="showColumns" class="report-popover report-columns"><p class="mb-2 text-[10px] font-semibold text-[#554a5d]">Show columns</p><label v-for="column in columns" :key="column" class="flex items-center gap-2 py-1 text-[10px] text-[#655b69]"><input type="checkbox" :checked="!visibleColumns.length || visibleColumns.includes(column)" @change="toggleColumn(column)" />{{ column }}</label><button class="mt-2 text-[10px] font-medium text-[#704b99]" @click="visibleColumns = []">Reset</button></div></div></header>
      <div class="overflow-x-auto"><table class="w-full min-w-[760px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th v-for="column in displayedColumns" :key="column" class="report-head">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in rows" :key="`${index}-${String(row.Reservation || row.Date || row.Metric || row.Task || '')}`" class="report-row"><td v-for="column in displayedColumns" :key="column" class="report-cell" :class="column === 'Guest' ? 'font-semibold text-[#3f3648]' : ''">{{ row[column] ?? '—' }}</td></tr><tr v-if="rows.length === 0"><td :colspan="Math.max(displayedColumns.length, 1)" class="py-12 text-center"><ChartNoAxesCombined :size="18" class="mx-auto text-[#b0a5b8]" /><p class="mt-2 text-[11px] font-medium text-[#5b5162]">No records for this period</p><p class="mt-1 text-[9px] text-[#918894]">Adjust the dates, search, or filters to see results.</p></td></tr></tbody></table></div>
    </section>
    <p v-if="savedNote" class="rounded-md border border-[#ece5f1] bg-[#faf7fc] px-3 py-2 text-[10px] text-[#695976]">Report note: {{ savedNote }}</p>

    <div v-if="showNotes" class="modal-backdrop" @click.self="showNotes = false"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="report-note-title"><header class="flex items-center justify-between"><div><p class="eyebrow">Reports &amp; analysis</p><h2 id="report-note-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Report notes</h2></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close notes" @click="showNotes = false"><X :size="16" /></button></header><label class="form-label mt-4">Add a note for this report<textarea v-model="reportNote" class="form-input mt-1 min-h-28 py-2" placeholder="Context, follow-up, or explanation…"></textarea></label><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showNotes = false">Cancel</button><button class="arrival-action-primary" @click="saveNote"><Check :size="13" /> Save note</button></footer></section></div>
  </section>
</template>
