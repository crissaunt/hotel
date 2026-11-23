<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Download, FileText, Filter, Info, Printer, RefreshCw, Search, SlidersHorizontal, StickyNote, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { dateKey } from '@/features/front-office/stores/reservations'
import { restaurantInventory, restaurantOrders, restaurantStockMovements, type RestaurantOrder } from '@/features/restaurant/stores/restaurant'

type ReportSection = 'Sales & Financial' | 'Product & Inventory' | 'Operational & Service'
type ReportRow = Record<string, string | number>
const today = dateKey(new Date())
const sections: ReportSection[] = ['Sales & Financial', 'Product & Inventory', 'Operational & Service']
const reports: Record<ReportSection, string[]> = {
  'Sales & Financial': ['Sales Summary', 'Sales by item', 'Payment methods', 'Room charges'],
  'Product & Inventory': ['Stock usage', 'Current stock', 'Low stock'],
  'Operational & Service': ['Order status', 'Kitchen performance', 'Sales by outlet'],
}
const section = ref<ReportSection>('Sales & Financial')
const report = ref('Sales Summary')
const period = ref<'Today' | 'Specific date' | 'Date range'>('Today')
const selectedDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const query = ref('')
const venueFilter = ref('All venues')
const showFilters = ref(false)
const showNotes = ref(false)
const noteText = ref('')
const savedNote = ref('')
const lastRefreshed = ref(new Date())
const notice = ref('')
const dateBounds = computed(() => period.value === 'Today'
  ? { from: today, to: today }
  : period.value === 'Specific date'
    ? { from: selectedDate.value, to: selectedDate.value }
    : { from: rangeStart.value, to: rangeEnd.value })
const matchesDate = (date: string) => date >= dateBounds.value.from && date <= dateBounds.value.to
const venueOptions = ['All venues', 'Restaurant', 'Bar']
const filteredOrders = computed(() => restaurantOrders.value.filter((order) => matchesDate(order.placedAt.slice(0, 10)) && (venueFilter.value === 'All venues' || order.venue === venueFilter.value) && (!query.value.trim() || [order.id, order.guestName, order.room || '', order.tableId, order.venue, ...order.lines.map((line) => line.name)].some((part) => part.toLowerCase().includes(query.value.trim().toLowerCase())))))
const paidOrders = computed(() => filteredOrders.value.filter((order) => order.status === 'Paid'))
const totalSales = computed(() => paidOrders.value.reduce((sum, order) => sum + order.subtotal, 0))
const averageCheck = computed(() => paidOrders.value.length ? totalSales.value / paidOrders.value.length : 0)
const usedItemQuantity = computed(() => restaurantStockMovements.value.filter((movement) => matchesDate(movement.usedAt.slice(0, 10))).reduce((sum, movement) => sum + movement.quantity, 0))
const summaryItems = computed(() => [
  { label: 'Orders', value: String(filteredOrders.value.length) },
  { label: 'Net sales', value: money(totalSales.value) },
  { label: 'Grand total', value: money(totalSales.value) },
  { label: report.value === 'Stock usage' ? 'Stock units used' : 'Average check', value: report.value === 'Stock usage' ? String(usedItemQuantity.value) : money(averageCheck.value) },
])
const rows = computed<ReportRow[]>(() => {
  if (report.value === 'Sales Summary') {
    const grouped = new Map<string, RestaurantOrder[]>()
    paidOrders.value.forEach((order) => grouped.set(order.placedAt.slice(0, 10), [...(grouped.get(order.placedAt.slice(0, 10)) || []), order]))
    return [...grouped.entries()].sort(([left], [right]) => right.localeCompare(left)).map(([date, orders]) => {
      const sales = orders.reduce((sum, order) => sum + order.subtotal, 0)
      return { Date: date, Orders: orders.length, Covers: '—', 'Gross sales': money(sales), Discounts: money(0), 'Net sales': money(sales), 'Service charge': money(0), Tax: money(0), 'Grand total': money(sales), 'Avg check': money(sales / orders.length), Voids: 0 }
    })
  }
  if (report.value === 'Sales by item') {
    const itemRows = new Map<string, { item: string; qty: number; sales: number }>()
    paidOrders.value.forEach((order) => order.lines.forEach((line) => {
      const existing = itemRows.get(line.menuItemId) || { item: line.name, qty: 0, sales: 0 }
      existing.qty += line.quantity
      existing.sales += line.quantity * line.unitPrice
      itemRows.set(line.menuItemId, existing)
    }))
    return [...itemRows.values()].sort((a, b) => b.sales - a.sales).map((item) => ({ Item: item.item, Quantity: item.qty, 'Unit price': money(item.sales / item.qty), Sales: money(item.sales) }))
  }
  if (report.value === 'Payment methods') {
    const paymentTotals = new Map<string, { count: number; amount: number }>()
    paidOrders.value.forEach((order) => (order.payments?.length ? order.payments : [{ method: order.paymentMethod || 'Unspecified', amount: order.subtotal }]).forEach((payment) => {
      const current = paymentTotals.get(payment.method) || { count: 0, amount: 0 }
      current.count += 1
      current.amount += payment.amount
      paymentTotals.set(payment.method, current)
    }))
    return [...paymentTotals.entries()].map(([method, totals]) => ({ 'Payment method': method, Transactions: totals.count, Amount: money(totals.amount) }))
  }
  if (report.value === 'Room charges') return paidOrders.value.filter((order) => Boolean(order.folioChargeId)).map((order) => ({ Date: order.placedAt.slice(0, 10), Ticket: order.id, Guest: order.guestName, Room: order.room || '—', Amount: money(order.payments?.filter((payment) => payment.method === 'Bill to Room').reduce((sum, payment) => sum + payment.amount, 0) || order.subtotal) }))
  if (report.value === 'Stock usage') return restaurantStockMovements.value.filter((movement) => matchesDate(movement.usedAt.slice(0, 10)) && (!query.value.trim() || `${movement.itemName} ${movement.reference}`.toLowerCase().includes(query.value.trim().toLowerCase()))).map((movement) => ({ Date: movement.usedAt.slice(0, 10), 'Stock item': movement.itemName, Used: `${movement.quantity} ${movement.unit.toLowerCase()}`, Ticket: movement.reference }))
  if (report.value === 'Current stock' || report.value === 'Low stock') return restaurantInventory.value.filter((item) => (report.value !== 'Low stock' || item.onHand <= item.reorderPoint) && (!query.value.trim() || `${item.id} ${item.name} ${item.category}`.toLowerCase().includes(query.value.trim().toLowerCase()))).map((item) => ({ Code: item.id, Item: item.name, Category: item.category, 'On hand': `${item.onHand} ${item.unit.toLowerCase()}`, 'Reorder point': `${item.reorderPoint} ${item.unit.toLowerCase()}`, Status: item.onHand <= item.min ? 'Critical' : item.onHand <= item.reorderPoint ? 'Low' : 'OK' }))
  if (report.value === 'Order status') {
    const statusCounts = new Map<string, number>()
    filteredOrders.value.forEach((order) => statusCounts.set(order.status === 'Paid' ? 'Completed' : statusLabel(order), (statusCounts.get(order.status === 'Paid' ? 'Completed' : statusLabel(order)) || 0) + 1))
    return [...statusCounts.entries()].map(([status, count]) => ({ Status: status, Orders: count }))
  }
  if (report.value === 'Kitchen performance') {
    return filteredOrders.value.map((order) => ({ Ticket: order.id, Time: time(order.placedAt), Table: order.tableId, Guest: order.guestName, 'Kitchen items': order.lines.filter((line) => line.station === 'Kitchen').reduce((sum, line) => sum + line.quantity, 0), 'Bar items': order.lines.filter((line) => line.station === 'Bar').reduce((sum, line) => sum + line.quantity, 0), Status: statusLabel(order) }))
  }
  const venueTotals = new Map<string, number>()
  paidOrders.value.forEach((order) => venueTotals.set(order.venue, (venueTotals.get(order.venue) || 0) + order.subtotal))
  return [...venueTotals.entries()].map(([venue, amount]) => ({ Outlet: venue, Orders: paidOrders.value.filter((order) => order.venue === venue).length, Sales: money(amount) }))
})
const columns = computed(() => rows.value.length ? Object.keys(rows.value[0]!) : report.value === 'Sales Summary' ? ['Date', 'Orders', 'Covers', 'Gross sales', 'Discounts', 'Net sales', 'Service charge', 'Tax', 'Grand total', 'Avg check', 'Voids'] : [])
function statusLabel(order: RestaurantOrder) {
  if (order.status === 'Paid') return 'Completed'
  if (order.lines.every((line) => line.status === 'Served')) return 'Awaiting payment'
  if (order.lines.some((line) => line.status === 'Cooking')) return 'In preparation'
  if (order.lines.some((line) => line.status === 'Ready')) return 'Ready to serve'
  return 'New'
}
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function time(value: string) { return new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }) }
function setSection(next: ReportSection) { section.value = next; report.value = reports[next][0]! }
function refresh() { lastRefreshed.value = new Date(); notice.value = 'Report refreshed from current POS and inventory records.'; window.setTimeout(() => { notice.value = '' }, 3000) }
function printReport() { window.print() }
function saveNote() { savedNote.value = noteText.value.trim(); showNotes.value = false; notice.value = savedNote.value ? 'Report note saved for this session.' : 'Report note cleared.'; window.setTimeout(() => { notice.value = '' }, 3000) }
function exportCsv() {
  const csvRows = [columns.value, ...rows.value.map((row) => columns.value.map((column) => String(row[column] ?? '')))]
  const csv = csvRows.map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const file = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(file)
  link.download = `restaurant-${report.value.toLowerCase().replaceAll(' ', '-')}-${dateBounds.value.from}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
</script>

<template>
  <section class="space-y-3">
    <nav class="restaurant-subnav" aria-label="Restaurant and bar modules"><RouterLink v-for="tab in [{ label: 'Transactions', to: '/restaurant/transactions' }, { label: 'Tables', to: '/restaurant/tables' }, { label: 'Reservations', to: '/restaurant/reservations' }, { label: 'Ready now', to: '/restaurant/kitchen' }, { label: 'Menu', to: '/restaurant/menu' }, { label: 'Cashiering', to: '/restaurant/cashiering' }, { label: 'Clients', to: '/restaurant/clients' }, { label: 'Supplies', to: '/restaurant/supplies' }, { label: 'Reports & analysis', to: '/restaurant/reports' }]" :key="tab.label" :to="tab.to" class="restaurant-subnav-link" :class="$route.path === tab.to ? 'restaurant-subnav-active' : ''">{{ tab.label }}</RouterLink></nav>
    <header class="flex flex-wrap items-center justify-between gap-3"><div><p class="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#3968bd]"><SlidersHorizontal :size="12" /> F&amp;B intelligence</p><h1 class="mt-1 text-[16px] font-semibold text-[#30243e]">Reports &amp; Analysis <Info :size="11" class="inline text-[#8b8490]" /></h1></div><div class="flex flex-wrap gap-1.5"><button class="secondary-button px-2.5 py-1.5" @click="refresh"><RefreshCw :size="11" /> Refresh</button><button class="secondary-button px-2.5 py-1.5" @click="showNotes = true"><StickyNote :size="11" /> Notes</button><button class="secondary-button px-2.5 py-1.5" @click="printReport"><Printer :size="11" /> Print</button><button class="arrival-action-primary px-2.5 py-1.5" @click="exportCsv"><Download :size="11" /> Export</button></div></header>
    <p v-if="notice" class="rounded-md border border-[#cfe5d8] bg-[#f0f8f3] px-3 py-2 text-[9px] text-[#44805b]">{{ notice }}</p>
    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap items-center gap-2 border-b border-[#eeeaf0] px-3 pt-2"><button v-for="item in sections" :key="item" class="border-b-2 px-1 pb-2 pt-1 text-[9px]" :class="section === item ? 'border-[#3970c7] font-semibold text-[#3968bd]' : 'border-transparent text-[#817987]'" @click="setSection(item)">{{ item }}</button></div>
      <div class="flex flex-wrap items-end justify-between gap-3 p-3"><div class="flex flex-wrap items-end gap-2"><label class="form-label text-[8px]">Report<select v-model="report" class="form-input mt-1 min-w-[175px] py-1.5 text-[9px]"><option v-for="choice in reports[section]" :key="choice">{{ choice }}</option></select></label><label class="client-search min-w-[180px]"><Search :size="12" /><span class="sr-only">Search report</span><input v-model="query" placeholder="Order, item, table, guest..." /></label><button class="secondary-button px-2.5 py-1.5" :class="showFilters ? 'border-[#b9a2d1] bg-[#f7f2fa]' : ''" @click="showFilters = !showFilters"><Filter :size="11" /> Filters</button></div><div class="flex flex-wrap items-center gap-1"><span class="mr-1 flex items-center gap-1 text-[8px] uppercase tracking-[0.08em] text-[#817987]"><CalendarDays :size="11" /> Reporting period</span><button v-for="mode in (['Today', 'Specific date', 'Date range'] as const)" :key="mode" class="report-period" :class="period === mode ? 'report-period-active' : ''" @click="period = mode">{{ mode }}</button><input v-if="period === 'Specific date'" v-model="selectedDate" type="date" class="report-date" /><template v-if="period === 'Date range'"><input v-model="rangeStart" type="date" class="report-date" /><span class="text-[8px] text-[#817987]">to</span><input v-model="rangeEnd" type="date" class="report-date" /></template></div></div>
      <div v-if="showFilters" class="flex flex-wrap items-center gap-2 border-t border-[#f0edf1] bg-[#fdfcfd] px-3 py-2"><label class="form-label text-[8px]">Outlet<select v-model="venueFilter" class="form-input mt-1 min-w-[150px] py-1.5 text-[9px]"><option v-for="venue in venueOptions" :key="venue">{{ venue }}</option></select></label><button class="text-[9px] font-medium text-[#704b99] hover:underline" @click="venueFilter = 'All venues'; query = ''">Clear filters</button></div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-y border-[#eeeaf0] px-3 py-2"><div class="flex flex-wrap gap-x-3 gap-y-1"> <span v-for="metric in summaryItems" :key="metric.label" class="text-[8px] uppercase text-[#7e7584]">{{ metric.label }} <strong class="ml-1 text-[10px] text-[#30243e]">{{ metric.value }}</strong></span></div><span class="text-[8px] text-[#8b8490]">Showing {{ rows.length }} of {{ rows.length }}</span></div>
      <div class="p-3"><div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-[11px] font-semibold text-[#44394c]">{{ report }}</h2><p class="mt-0.5 text-[8px] text-[#837a89]">{{ formatDate(dateBounds.from) }}<span v-if="dateBounds.to !== dateBounds.from"> – {{ formatDate(dateBounds.to) }}</span> · Refreshed {{ lastRefreshed.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }}</p></div><span v-if="savedNote" class="max-w-[280px] truncate rounded-full bg-[#f5f1f8] px-2 py-1 text-[8px] text-[#67547b]">Note: {{ savedNote }}</span></div>
        <div class="mt-3 overflow-x-auto rounded-md border border-[#eeeaf0]"><table class="w-full min-w-[850px] border-collapse text-left"><thead><tr class="bg-[#faf9fb]"> <th v-for="column in columns" :key="column" class="px-3 py-2.5 text-[8px] font-semibold text-[#514958]">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in rows" :key="index" class="border-t border-[#f0edf1] text-[9px] text-[#4d4553]"><td v-for="column in columns" :key="column" class="px-3 py-2.5">{{ row[column] ?? '—' }}</td></tr><tr v-if="rows.length === 0"><td :colspan="Math.max(columns.length, 1)" class="py-12 text-center"><FileText :size="18" class="mx-auto text-[#aa9bb6]" /><p class="mt-2 text-[10px] font-medium text-[#5b5162]">No report data for this period</p><p class="mt-1 text-[8px] text-[#918894]">Try another date range or send/complete a POS order.</p></td></tr></tbody></table></div>
        <p v-if="['Sales Summary', 'Payment methods', 'Room charges'].includes(report)" class="mt-2 text-[8px] text-[#918894]">Sales totals are based on completed POS tickets. Discounts, service charges, and separate tax values are not yet recorded in this MVP.</p><p v-if="report === 'Current stock' || report === 'Low stock' || report === 'Stock usage'" class="mt-2 text-[8px] text-[#918894]">Inventory figures are based on menu item stock links and POS consumption movements.</p>
      </div>
    </section>
    <div v-if="showNotes" class="modal-backdrop" @click.self="showNotes = false"><section class="modal-card max-w-[460px] text-left" role="dialog" aria-modal="true" aria-labelledby="report-notes-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Report annotation</p><h2 id="report-notes-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Notes</h2></div><button aria-label="Close notes" @click="showNotes = false"><X :size="15" /></button></header><label class="form-label mt-4">Note for this report<textarea v-model="noteText" class="form-input mt-1 min-h-24 resize-y" placeholder="Add a note for this reporting period"></textarea></label><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showNotes = false">Cancel</button><button class="arrival-action-primary" @click="saveNote">Save note</button></footer></section></div>
  </section>
</template>
