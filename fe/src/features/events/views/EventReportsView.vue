<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Download, FileText, Filter, Info, Printer, RefreshCw, Search, SlidersHorizontal, StickyNote, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { events, eventVenues, type HotelEvent } from '@/features/events/stores/eventData'

type ReportTab = 'Events' | 'Venues' | 'Accounts'
type ReportRow = Record<string, string | number | undefined>
const tabs: ReportTab[] = ['Events', 'Venues', 'Accounts']
const reports: Record<ReportTab, string[]> = {
  Events: ['On site', 'Event bookings', 'Confirmed', 'Quotes'],
  Venues: ['Hall diary', 'Venue usage', 'Capacity'],
  Accounts: ['Proformas', 'Outstanding', 'Invoices', 'Receipts'],
}
const today = localDateKey(new Date())
const activeTab = ref<ReportTab>('Events')
const report = ref('On site')
const period = ref<'Today' | 'Specific date' | 'Date range' | 'All dates'>('Today')
const specificDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const search = ref('')
const showFilters = ref(false)
const showNotes = ref(false)
const note = ref('')
const savedNote = ref('')
const refreshedAt = ref(new Date())
const venueFilter = ref('All venues')
const statusFilter = ref('All statuses')
const notice = ref('')
const dateBounds = computed(() => period.value === 'Today'
  ? { from: today, to: today }
  : period.value === 'Specific date'
    ? { from: specificDate.value, to: specificDate.value }
    : period.value === 'Date range'
      ? { from: rangeStart.value, to: rangeEnd.value }
      : { from: '0000-01-01', to: '9999-12-31' })
const venueOptions = computed(() => ['All venues', ...eventVenues.value.map((venue) => venue.name)])
const matchesDate = (date: string) => date >= dateBounds.value.from && date <= dateBounds.value.to
const filteredEvents = computed(() => events.value.filter((event) => {
  const query = search.value.trim().toLowerCase()
  const matchesSearch = !query || [event.id, event.name, event.client, event.venue, event.invoiceNumber || ''].some((value) => value.toLowerCase().includes(query))
  const overlapsPeriod = event.start <= dateBounds.value.to && event.end >= dateBounds.value.from
  const venueMatches = venueFilter.value === 'All venues' || event.venue === venueFilter.value
  const statusMatches = statusFilter.value === 'All statuses' || event.status === statusFilter.value
  return matchesSearch && overlapsPeriod && venueMatches && statusMatches
}))
const eventTotal = computed(() => filteredEvents.value.reduce((sum, event) => sum + event.amount, 0))
const paxTotal = computed(() => filteredEvents.value.reduce((sum, event) => sum + event.pax, 0))
function charges(event: HotelEvent) { return event.folioEntries.filter((entry) => entry.status === 'Posted' && entry.type !== 'Receipt').reduce((sum, entry) => sum + entry.amount, 0) }
function receipts(event: HotelEvent) { return event.folioEntries.filter((entry) => entry.status === 'Posted' && entry.type === 'Receipt').reduce((sum, entry) => sum + entry.amount, 0) }
function outstanding(event: HotelEvent) { return Math.max(0, charges(event) - receipts(event)) }
const entries = computed<ReportRow[]>(() => {
  if (activeTab.value === 'Events') {
    if (report.value === 'On site') return filteredEvents.value.filter((event) => event.start <= dateBounds.value.to && event.end >= dateBounds.value.from).map((event) => ({ Start: event.start, Booking: event.id, Event: event.name, End: event.end, Organizer: event.client, Hall: event.venue, Pax: event.pax, Status: event.status.toLowerCase() }))
    return filteredEvents.value.filter((event) => report.value === 'Confirmed' ? event.status === 'Confirmed' : report.value === 'Quotes' ? event.status === 'Quote' : true).map((event) => ({ Booking: event.id, Event: event.name, Type: event.kind, Organizer: event.client, Hall: event.venue, Start: event.start, End: event.end, Pax: event.pax, Status: event.status, Value: money(event.amount) }))
  }
  if (activeTab.value === 'Venues') {
    return eventVenues.value.filter((venue) => venueFilter.value === 'All venues' || venue.name === venueFilter.value).map((venue) => {
      const bookings = filteredEvents.value.filter((event) => event.venue === venue.name)
      const pax = bookings.reduce((sum, event) => sum + event.pax, 0)
      return report.value === 'Hall diary'
        ? { Hall: venue.name, Type: venue.type.toLowerCase(), Capacity: venue.capacity, Events: bookings.length, Pax: pax, 'Event / organizer': bookings.map((event) => `${event.name} · ${event.client}`).join('; ') || 'No events in this period' }
        : { Hall: venue.name, Type: venue.type, Capacity: venue.capacity, Events: bookings.length, Pax: pax, 'Capacity use': `${venue.capacity ? Math.min(100, Math.round(pax / venue.capacity * 100)) : 0}%` }
    })
  }
  if (report.value === 'Receipts') return filteredEvents.value.flatMap((event) => event.folioEntries.filter((entry) => entry.type === 'Receipt' && matchesDate(entry.date) && (!search.value.trim() || `${event.name} ${event.client} ${entry.id} ${entry.reference || ''}`.toLowerCase().includes(search.value.trim().toLowerCase()))).map((entry) => ({ Date: entry.date, Receipt: entry.id, Event: event.name, Payer: event.client, Method: entry.method || '—', Amount: money(entry.amount), Reference: entry.reference || '—', Status: entry.status })))
  if (report.value === 'Invoices') return filteredEvents.value.filter((event) => event.invoiceNumber).map((event) => ({ Invoice: event.invoiceNumber!, Event: event.name, Client: event.client, Date: event.start, Total: money(charges(event)), Paid: money(receipts(event)), Outstanding: money(outstanding(event)) }))
  if (report.value === 'Outstanding') return filteredEvents.value.filter((event) => outstanding(event) > 0).map((event) => ({ Folio: `FOL-${event.id.slice(4)}`, Event: event.name, Client: event.client, Date: event.start, Charges: money(charges(event)), Receipts: money(receipts(event)), Outstanding: money(outstanding(event)) }))
  return filteredEvents.value.map((event) => ({ Proforma: `PRO-${event.id.slice(4)}`, Event: event.name, Client: event.client, Hall: event.venue, Date: event.start, 'Estimated value': money(event.amount), Charges: money(charges(event)), Status: event.invoiceStatus || event.status }))
})
const summary = computed(() => {
  if (activeTab.value === 'Events') return [{ label: 'Events', value: String(filteredEvents.value.length) }, { label: 'Pax', value: paxTotal.value.toLocaleString('en-PH') }, { label: 'Value', value: money(eventTotal.value) }, { label: 'Period', value: periodLabel.value }]
  if (activeTab.value === 'Venues') return [{ label: 'Halls', value: String(eventVenues.value.length) }, { label: 'In use', value: String(new Set(filteredEvents.value.map((event) => event.venue)).size) }, { label: 'Events', value: String(filteredEvents.value.length) }, { label: 'Pax', value: paxTotal.value.toLocaleString('en-PH') }]
  const outstandingTotal = filteredEvents.value.reduce((sum, event) => sum + outstanding(event), 0)
  const receiptCount = filteredEvents.value.reduce((sum, event) => sum + event.folioEntries.filter((entry) => entry.type === 'Receipt' && entry.status === 'Posted' && matchesDate(entry.date)).length, 0)
  const invoiceCount = filteredEvents.value.filter((event) => event.invoiceNumber).length
  return [{ label: 'Accounts', value: report.value === 'Receipts' ? String(receiptCount) : report.value === 'Invoices' ? String(invoiceCount) : String(filteredEvents.value.length) }, { label: 'Outstanding', value: money(outstandingTotal) }, { label: 'Receipts', value: String(receiptCount) }, { label: 'Period', value: periodLabel.value }]
})
const columns = computed(() => entries.value.length ? Object.keys(entries.value[0]!) : report.value === 'On site' ? ['Start', 'Booking', 'Event', 'End', 'Organizer', 'Hall', 'Pax', 'Status'] : [])
const periodLabel = computed(() => period.value === 'Today' ? today : period.value === 'Specific date' ? specificDate.value : period.value === 'Date range' ? `${rangeStart.value} – ${rangeEnd.value}` : 'All dates')
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function setTab(tab: ReportTab) { activeTab.value = tab; report.value = reports[tab][0]! }
function refresh() { refreshedAt.value = new Date(); notice.value = 'Reports refreshed from event, venue, and folio records.'; window.setTimeout(() => { notice.value = '' }, 3000) }
function saveNote() { savedNote.value = note.value.trim(); showNotes.value = false; notice.value = savedNote.value ? 'Report note saved for this session.' : 'Report note cleared.'; window.setTimeout(() => { notice.value = '' }, 3000) }
function printReport() { window.print() }
function exportReport() {
  const csv = [columns.value, ...entries.value.map((row) => columns.value.map((column) => String(row[column] ?? '—')))].map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = `events-${report.value.toLowerCase().replaceAll(' ', '-')}-${localDateKey(new Date())}.csv`; anchor.click(); URL.revokeObjectURL(blobUrl)
}
</script>

<template>
  <section class="space-y-3">
    <nav class="flex flex-wrap gap-1 border-b border-[#e8ebef] bg-[#f8fafc] px-2 pt-2" aria-label="Events and conferences modules"><RouterLink v-for="link in [{ label: 'Event Management', to: '/events/management' }, { label: 'Guest Rates', to: '/events/guest-rates' }, { label: 'Reports & Analysis', to: '/events/reports' }]" :key="link.label" :to="link.to" class="rounded-t-md px-3 py-2 text-[9px]" :class="$route.path === link.to ? 'border border-b-white border-[#e2e6eb] bg-white font-semibold text-[#69489a]' : 'text-[#697681] hover:bg-white'">{{ link.label }}</RouterLink></nav>
    <header class="flex flex-wrap items-center justify-between gap-3"><div><p class="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#3968bd]"><SlidersHorizontal :size="12" /> Events intelligence</p><h1 class="mt-1 text-[16px] font-semibold text-[#30243e]">Reports &amp; Analysis <Info :size="11" class="inline text-[#8b8490]" /></h1></div><div class="flex flex-wrap gap-1.5"><button class="secondary-button px-2.5 py-1.5" @click="refresh"><RefreshCw :size="11" /> Refresh</button><button class="secondary-button px-2.5 py-1.5" @click="showNotes = true"><StickyNote :size="11" /> Notes</button><button class="secondary-button px-2.5 py-1.5" @click="printReport"><Printer :size="11" /> Print</button><button class="arrival-action-primary px-2.5 py-1.5" @click="exportReport"><Download :size="11" /> Export</button></div></header>
    <p v-if="notice" class="rounded-md border border-[#cfe5d8] bg-[#f0f8f3] px-3 py-2 text-[9px] text-[#44805b]">{{ notice }}</p>
    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap gap-3 border-b border-[#eeeaf0] px-3 pt-2"><button v-for="tab in tabs" :key="tab" class="border-b-2 px-1 pb-2 pt-1 text-[9px]" :class="activeTab === tab ? 'border-[#3970c7] font-semibold text-[#3968bd]' : 'border-transparent text-[#817987]'" @click="setTab(tab)">{{ tab }}</button></div>
      <div class="flex flex-wrap items-end justify-between gap-3 p-3"><div class="flex flex-wrap items-end gap-2"><label class="form-label text-[8px]">Report<select v-model="report" class="form-input mt-1 min-w-[175px] py-1.5 text-[9px]"><option v-for="choice in reports[activeTab]" :key="choice">{{ choice }}</option></select></label><label class="client-search min-w-[190px]"><Search :size="12" /><span class="sr-only">Search events report</span><input v-model="search" placeholder="Event, organizer, hall, invoice..." /></label><button class="secondary-button px-2.5 py-1.5" :class="showFilters ? 'border-[#b9a2d1] bg-[#f7f2fa]' : ''" @click="showFilters = !showFilters"><Filter :size="11" /> Filters</button></div><div class="flex flex-wrap items-center gap-1"><span class="mr-1 flex items-center gap-1 text-[8px] uppercase tracking-[0.08em] text-[#817987]"><CalendarDays :size="11" /> Reporting period</span><button v-for="mode in (['Today', 'Specific date', 'Date range', 'All dates'] as const)" :key="mode" class="report-period" :class="period === mode ? 'report-period-active' : ''" @click="period = mode">{{ mode }}</button><input v-if="period === 'Specific date'" v-model="specificDate" type="date" class="report-date" /><template v-if="period === 'Date range'"><input v-model="rangeStart" type="date" class="report-date" /><span class="text-[8px] text-[#817987]">to</span><input v-model="rangeEnd" type="date" class="report-date" /></template></div></div>
      <div v-if="showFilters" class="flex flex-wrap items-end gap-2 border-t border-[#f0edf1] bg-[#fdfcfd] px-3 py-2"><label class="form-label text-[8px]">Hall<select v-model="venueFilter" class="form-input mt-1 min-w-[150px] py-1.5 text-[9px]"><option v-for="venue in venueOptions" :key="venue">{{ venue }}</option></select></label><label class="form-label text-[8px]">Status<select v-model="statusFilter" class="form-input mt-1 min-w-[130px] py-1.5 text-[9px]"><option>All statuses</option><option>Quote</option><option>Confirmed</option><option>Completed</option></select></label><button class="text-[9px] font-medium text-[#704b99] hover:underline" @click="venueFilter = 'All venues'; statusFilter = 'All statuses'; search = ''">Clear filters</button></div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-y border-[#eeeaf0] px-3 py-2"><div class="flex flex-wrap gap-x-3 gap-y-1"><span v-for="metric in summary" :key="metric.label" class="text-[8px] uppercase text-[#7e7584]">{{ metric.label }} <strong class="ml-1 text-[10px] text-[#30243e]">{{ metric.value }}</strong></span></div><span class="text-[8px] text-[#8b8490]">Showing {{ entries.length }} of {{ entries.length }}</span></div>
      <section class="p-3"><div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-[11px] font-semibold text-[#44394c]">{{ report }}</h2><p class="mt-0.5 text-[8px] text-[#837a89]">{{ periodLabel }} · Generated {{ refreshedAt.toLocaleDateString('en-PH') }} at {{ refreshedAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }}</p></div><span v-if="savedNote" class="max-w-[260px] truncate rounded-full bg-[#f5f1f8] px-2 py-1 text-[8px] text-[#67547b]">Note: {{ savedNote }}</span></div><div class="mt-3 overflow-x-auto rounded-md border border-[#eeeaf0]"><table class="w-full min-w-[820px] border-collapse text-left"><thead class="bg-[#faf9fb] text-[8px] font-semibold text-[#514958]"><tr><th v-for="column in columns" :key="column" class="px-3 py-2.5">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in entries" :key="index" class="border-t border-[#f0edf1] text-[9px] text-[#4d4553]"><td v-for="column in columns" :key="column" class="px-3 py-2.5">{{ row[column] ?? '—' }}</td></tr><tr v-if="entries.length === 0"><td :colspan="Math.max(columns.length, 1)" class="py-12 text-center"><FileText :size="18" class="mx-auto text-[#aa9bb6]" /><p class="mt-2 text-[10px] font-medium text-[#5b5162]">No data available for the selected report and date.</p><p class="mt-1 text-[8px] text-[#918894]">Try a different period, or clear the hall and status filters.</p></td></tr></tbody></table></div><p v-if="activeTab === 'Accounts'" class="mt-2 text-[8px] text-[#918894]">Event balances include posted folio charges and receipts. Voided entries remain in the folio history and are excluded from totals.</p></section>
    </section>
    <div v-if="showNotes" class="modal-backdrop" @click.self="showNotes = false"><section class="modal-card max-w-[440px] text-left" role="dialog" aria-modal="true" aria-labelledby="event-report-note-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Report annotation</p><h2 id="event-report-note-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Notes</h2></div><button aria-label="Close notes" @click="showNotes = false"><X :size="15" /></button></header><label class="form-label mt-4">Note for this report<textarea v-model="note" class="form-input mt-1 min-h-24 resize-y" placeholder="Add a note for this reporting period" /></label><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showNotes = false">Cancel</button><button class="arrival-action-primary" @click="saveNote">Save note</button></footer></section></div>
  </section>
</template>
