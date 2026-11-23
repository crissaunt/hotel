<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, ChevronRight, Clock3, FileText, Search, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { dateKey } from '@/features/front-office/stores/reservations'
import { restaurantOrders, type RestaurantOrder } from '@/features/restaurant/stores/restaurant'

type TransactionRow = { order: RestaurantOrder; itemId: string; item: string; quantity: number; unitPrice: number; lineTotal: number }
const today = dateKey(new Date())
const query = ref('')
const activityFilter = ref('All activity')
const staffFilter = ref('All staff')
const dateMode = ref<'All dates' | 'Today' | 'Specific date' | 'Date range'>('All dates')
const specificDate = ref(today)
const rangeStart = ref(today)
const rangeEnd = ref(today)
const selectedOrder = ref<RestaurantOrder | null>(null)
const restaurantTabs = [
  { label: 'Transactions', to: '/restaurant/transactions' },
  { label: 'Tables', to: '/restaurant/tables' },
  { label: 'Reservations', to: '/restaurant/reservations' },
  { label: 'Ready now', to: '/restaurant/kitchen' },
  { label: 'Menu', to: '/restaurant/menu' },
  { label: 'Cashiering', to: '/restaurant/cashiering' },
  { label: 'Clients', to: '/restaurant/clients' },
  { label: 'Supplies', to: '/restaurant/supplies' },
  { label: 'Reports & analysis', to: '/restaurant/reports' },
]
const staffOptions = computed(() => ['All staff', ...new Set(restaurantOrders.value.map((order) => order.waiter))])
const transactionRows = computed<TransactionRow[]>(() => restaurantOrders.value.flatMap((order) => order.lines.map((line) => ({ order, itemId: line.id, item: line.name, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.quantity * line.unitPrice }))).filter(({ order, item }) => {
  if (activityFilter.value === 'Paid' && order.status !== 'Paid') return false
  if (activityFilter.value === 'Open' && order.status !== 'Open') return false
  if (activityFilter.value === 'Billed to room' && !order.folioChargeId) return false
  if (staffFilter.value !== 'All staff' && order.waiter !== staffFilter.value) return false
  const date = order.placedAt.slice(0, 10)
  if (dateMode.value === 'Today' && date !== today) return false
  if (dateMode.value === 'Specific date' && date !== specificDate.value) return false
  if (dateMode.value === 'Date range' && (date < rangeStart.value || date > rangeEnd.value)) return false
  const searchText = query.value.trim().toLowerCase()
  return !searchText || [order.id, item, order.guestName, order.room || '', order.tableId, order.venue, order.waiter, order.paymentMethod || ''].some((part) => part.toLowerCase().includes(searchText))
}).sort((a, b) => b.order.placedAt.localeCompare(a.order.placedAt)))
const todaySales = computed(() => restaurantOrders.value.filter((order) => order.placedAt.slice(0, 10) === today && order.status === 'Paid').reduce((sum, order) => sum + order.subtotal, 0))
const todayTickets = computed(() => restaurantOrders.value.filter((order) => order.placedAt.slice(0, 10) === today).length)
const roomBillsToday = computed(() => restaurantOrders.value.filter((order) => order.placedAt.slice(0, 10) === today && order.folioChargeId).length)
const openOrders = computed(() => restaurantOrders.value.filter((order) => order.status === 'Open').length)
const demoRowsVisible = computed(() => transactionRows.value.some((row) => row.order.isDemo))
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function formatDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }) }
function time(value: string) { return new Date(value).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }
function paymentMethod(order: RestaurantOrder) {
  const methods = [...new Set((order.payments || []).map((payment) => payment.method))]
  if (methods.length > 1) return methods.join(' + ')
  if (order.folioChargeId && methods[0] === 'Bill to Room') return 'Room folio'
  return methods[0] || order.paymentMethod || 'Unpaid'
}
function clearFilters() { query.value = ''; staffFilter.value = 'All staff'; activityFilter.value = 'All activity'; dateMode.value = 'All dates' }
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><p class="eyebrow">Restaurant &amp; Bar <span class="px-1 text-[#c3bcc9]">/</span> Sales ledger</p><h1 class="mt-1 font-serif text-[28px] font-medium tracking-[-0.035em] text-[#30243e]">Transactions</h1><p class="mt-1 text-[10px] text-[#7d7583]">Every food and beverage item sold, paid, or posted to a guest folio.</p></div><RouterLink to="/restaurant/pos" class="arrival-action-primary"><FileText :size="13" /> Open POS</RouterLink></header>
    <nav class="restaurant-subnav" aria-label="Restaurant and bar modules"><RouterLink v-for="tab in restaurantTabs" :key="tab.label" :to="tab.to" class="restaurant-subnav-link" :class="$route.path === tab.to ? 'restaurant-subnav-active' : ''">{{ tab.label }}</RouterLink></nav>

    <section class="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] sm:grid-cols-4"><div class="client-metric"><span><FileText :size="13" /> Tickets today</span><strong>{{ todayTickets }}</strong><small>Restaurant and bar orders</small></div><div class="client-metric"><span><Clock3 :size="13" /> Sales today</span><strong>{{ money(todaySales) }}</strong><small>Paid transactions</small></div><div class="client-metric"><span><ChevronRight :size="13" /> Billed to room</span><strong>{{ roomBillsToday }}</strong><small>Posted to guest folios</small></div><div class="client-metric"><span><Clock3 :size="13" /> Open tickets</span><strong>{{ openOrders }}</strong><small>Awaiting service or payment</small></div></section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-col gap-3 border-b border-[#eeeaf0] p-3 xl:flex-row xl:items-center xl:justify-between"><div class="flex flex-wrap items-center gap-2"><label class="client-search"><Search :size="13" /><span class="sr-only">Search transactions</span><input v-model="query" placeholder="Search ticket, item, or table" /></label><label class="sr-only" for="transaction-activity">Filter by activity</label><select id="transaction-activity" v-model="activityFilter" class="reservation-select"><option>All activity</option><option>Paid</option><option>Open</option><option>Billed to room</option></select><label class="sr-only" for="transaction-staff">Filter by staff</label><select id="transaction-staff" v-model="staffFilter" class="reservation-select"><option v-for="staff in staffOptions" :key="staff">{{ staff }}</option></select></div><div class="flex flex-wrap items-center gap-1.5"><span class="flex items-center gap-1 text-[9px] text-[#827987]"><CalendarDays :size="12" /> Date:</span><button v-for="mode in (['All dates', 'Today', 'Specific date', 'Date range'] as const)" :key="mode" class="report-period" :class="dateMode === mode ? 'report-period-active' : ''" @click="dateMode = mode">{{ mode }}</button><input v-if="dateMode === 'Specific date'" v-model="specificDate" type="date" class="report-date" /><template v-if="dateMode === 'Date range'"><input v-model="rangeStart" type="date" class="report-date" /><span class="text-[9px] text-[#817987]">to</span><input v-model="rangeEnd" type="date" class="report-date" /></template></div></div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0edf1] px-4 py-2"><p class="text-[9px] text-[#827987]">{{ transactionRows.length }} line items · {{ new Set(transactionRows.map((row) => row.order.id)).size }} tickets</p><p v-if="demoRowsVisible" class="rounded-full bg-[#fff5df] px-2 py-1 text-[8px] text-[#8d6d35]">Includes sample MVP transactions</p><button v-if="query || staffFilter !== 'All staff' || activityFilter !== 'All activity' || dateMode !== 'All dates'" class="text-[9px] font-medium text-[#704b99] hover:underline" @click="clearFilters">Clear filters</button></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[1180px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-4">Ticket</th><th class="reservation-head">Date / time</th><th class="reservation-head">Item</th><th class="reservation-head">Customer</th><th class="reservation-head">Room</th><th class="reservation-head">Table</th><th class="reservation-head">Venue</th><th class="reservation-head text-right">Qty</th><th class="reservation-head text-right">Unit price</th><th class="reservation-head">MOP</th><th class="reservation-head pr-4 text-right">Line total</th></tr></thead><tbody><tr v-for="row in transactionRows" :key="row.itemId" class="reservation-row cursor-pointer" @click="selectedOrder = row.order"><td class="reservation-cell pl-4"><strong class="font-medium text-[#65428e]">{{ row.order.id }}</strong><span v-if="row.order.isDemo" class="ml-1 rounded bg-[#fff5df] px-1 py-0.5 text-[7px] text-[#8d6d35]">Sample</span></td><td class="reservation-cell whitespace-nowrap text-[#6f6675]">{{ formatDate(row.order.placedAt.slice(0, 10)) }}<span class="ml-1 text-[8px] text-[#9c94a0]">{{ time(row.order.placedAt) }}</span></td><td class="reservation-cell font-medium text-[#463c4e]">{{ row.item }}</td><td class="reservation-cell text-[#6f6675]">{{ row.order.guestName === 'Walk-in guest' ? '—' : row.order.guestName }}</td><td class="reservation-cell text-[#6f6675]">{{ row.order.room || '—' }}</td><td class="reservation-cell text-[#6f6675]">{{ row.order.tableId }}</td><td class="reservation-cell text-[#6f6675]">{{ row.order.venue }}</td><td class="reservation-cell text-right text-[#6f6675]">{{ row.quantity }}</td><td class="reservation-cell text-right text-[#6f6675]">{{ money(row.unitPrice) }}</td><td class="reservation-cell text-[#6f6675]">{{ paymentMethod(row.order) }}</td><td class="reservation-cell pr-4 text-right font-medium text-[#44394c]">{{ money(row.lineTotal) }}</td></tr><tr v-if="transactionRows.length === 0"><td colspan="11" class="py-14 text-center"><FileText :size="19" class="mx-auto text-[#aa9bb6]" /><p class="mt-2 text-[11px] font-medium text-[#5b5162]">No transactions match these filters</p><p class="mt-1 text-[9px] text-[#918894]">Try another date or search, or send an order from the POS terminal.</p><button v-if="query || staffFilter !== 'All staff' || activityFilter !== 'All activity' || dateMode !== 'All dates'" class="mt-2 text-[9px] font-medium text-[#704b99] hover:underline" @click="clearFilters">Clear filters</button></td></tr></tbody></table></div>
    </section>

    <div v-if="selectedOrder" class="modal-backdrop" @click.self="selectedOrder = null"><section class="modal-card text-left" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title"><header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Restaurant &amp; Bar · ticket</p><h2 id="transaction-detail-title" class="mt-1 font-serif text-[22px] text-[#30243e]">{{ selectedOrder.id }}</h2><p class="mt-1 text-[9px] text-[#807884]">{{ formatDate(selectedOrder.placedAt.slice(0, 10)) }} · {{ time(selectedOrder.placedAt) }} · {{ selectedOrder.tableId }} · {{ selectedOrder.venue }}</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close ticket details" @click="selectedOrder = null"><X :size="16" /></button></header><div class="mt-4 space-y-2"><div v-for="line in selectedOrder.lines" :key="line.id" class="flex items-start justify-between gap-3 border-b border-[#eeeaf0] pb-2 text-[10px]"><div><strong class="text-[#463c4e]">{{ line.quantity }} × {{ line.name }}</strong><p class="mt-0.5 text-[8px] text-[#8b8290]">{{ line.station }} · {{ line.status }}</p></div><span>{{ money(line.quantity * line.unitPrice) }}</span></div></div><div class="mt-3 flex justify-between border-t border-[#eeeaf0] pt-3 text-[10px]"><span class="text-[#807884]">{{ paymentMethod(selectedOrder) }}</span><strong class="text-[13px] text-[#44394c]">{{ money(selectedOrder.subtotal) }}</strong></div><p v-if="selectedOrder.folioChargeId" class="mt-2 rounded-md bg-[#eef7f0] px-3 py-2 text-[9px] text-[#50785b]">This ticket has been posted to Room {{ selectedOrder.room }}’s guest folio.</p><footer class="mt-4 flex justify-end"><button class="secondary-button" @click="selectedOrder = null">Close</button></footer></section></div>
  </section>
</template>
