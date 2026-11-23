<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, BadgeCheck, Check, ChefHat, ChevronDown, CircleAlert, Clock3, FileText, Minus, Plus, Search, Send, ShoppingBag, Trash2, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { applyCashBasisDepositToCharge, canSignOutletCharge, dateKey, hasSponsorSigningAuthorization, isCashBasisReservation, outletChargeTotal, reservations } from '@/features/front-office/stores/reservations'
import { availableRestaurantStock, deductRestaurantStock, restaurantInventory, restaurantMenu, restaurantOrders, restaurantTables, restaurantTillOpen, type MenuCategory, type MenuItem, type RestaurantOrder, type RestaurantOrderLine, type RestaurantPayment } from '@/features/restaurant/stores/restaurant'

type CartLine = { menuItem: MenuItem; quantity: number; note: string }
type PaymentMode = 'Cash' | 'Card' | 'Mobile wallet' | 'Bank transfer' | 'Bill to Room'
const today = dateKey(new Date())
const waiter = 'Jordan Lee'
const orderCategories: Array<'All' | MenuCategory> = ['All', 'Food', 'Beverage', 'Dessert', 'Snack']
const category = ref<'All' | MenuCategory>('All')
const menuSearch = ref('')
const activeOrderView = ref<'Current order' | 'Orders'>('Current order')
const orderSearch = ref('')
const source = ref<'Walk-in' | 'In-house'>('Walk-in')
const reservationId = ref('')
const walkInGuest = ref('')
const tableId = ref('T1')
const orderType = ref<'Dine-in' | 'Room service' | 'Takeaway'>('Dine-in')
const cart = ref<CartLine[]>([])
const notice = ref('')
const orderError = ref('')
const showTillModal = ref(false)
const showGuestChooser = ref(false)
const openingFloat = ref('')
const payOrder = ref<RestaurantOrder | null>(null)
const payMethod = ref<PaymentMode>('Cash')
const cardBrand = ref<'Visa' | 'Visa Debit' | 'Mastercard'>('Visa')
const mobileWallet = ref<'GCash' | 'Maya'>('GCash')
const payError = ref('')
const gratuity = ref('0')
const paymentAmount = ref('0')
const paymentRows = ref<RestaurantPayment[]>([])

const inHouseGuests = computed(() => reservations.value.filter((stay) => stay.status === 'In house'))
const selectedStay = computed(() => reservations.value.find((stay) => stay.id === reservationId.value) || null)
const payOrderStay = computed(() => reservations.value.find((stay) => stay.id === payOrder.value?.reservationId) || null)
const hasOrderingGuest = computed(() => source.value === 'In-house'
  ? Boolean(selectedStay.value && selectedStay.value.status === 'In house')
  : Boolean(walkInGuest.value.trim()))
const selectedTable = computed(() => restaurantTables.value.find((table) => table.id === tableId.value) || restaurantTables.value[0]!)
const visibleMenu = computed(() => restaurantMenu.value.filter((item) => item.available && (category.value === 'All' || item.category === category.value) && (!menuSearch.value.trim() || item.name.toLowerCase().includes(menuSearch.value.trim().toLowerCase()))))
const orderSubtotal = computed(() => cart.value.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0))
const openOrders = computed(() => restaurantOrders.value.filter((order) => order.status === 'Open').sort((a, b) => b.placedAt.localeCompare(a.placedAt)))
const todaysOrders = computed(() => restaurantOrders.value.filter((order) => order.placedAt.slice(0, 10) === today).sort((a, b) => b.placedAt.localeCompare(a.placedAt)))
const filteredOrders = computed(() => todaysOrders.value.filter((order) => !orderSearch.value.trim() || [order.id, order.guestName, order.tableId, order.room || ''].some((value) => value.toLowerCase().includes(orderSearch.value.trim().toLowerCase()))))
const orderCounts = computed(() => ({ open: openOrders.value.length, kitchen: openOrders.value.filter((order) => order.lines.some((line) => line.station === 'Kitchen')).length, bar: openOrders.value.filter((order) => order.lines.some((line) => line.station === 'Bar')).length }))

function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function formatTime(value: string) { return new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) }
function currentStatus(order: RestaurantOrder) {
  if (order.status === 'Paid') return 'Paid'
  if (order.lines.every((line) => line.status === 'Served')) return 'Served'
  if (order.lines.some((line) => line.status === 'Cooking')) return 'Cooking'
  if (order.lines.some((line) => line.status === 'Ready')) return 'Ready'
  return 'New'
}
function addMenuItem(menuItem: MenuItem) {
  const existing = cart.value.find((line) => line.menuItem.id === menuItem.id)
  if (existing) existing.quantity += 1
  else cart.value.push({ menuItem, quantity: 1, note: '' })
  orderError.value = ''
}
function changeQuantity(line: CartLine, change: number) {
  line.quantity += change
  if (line.quantity <= 0) cart.value = cart.value.filter((item) => item !== line)
}
function requestSendToKitchen() {
  orderError.value = ''
  if (!cart.value.length) { orderError.value = 'Add at least one menu item to the order.'; return }
  if (!hasOrderingGuest.value) {
    showGuestChooser.value = true
    return
  }
  sendToKitchen()
}
function sendToKitchen() {
  orderError.value = ''
  if (!cart.value.length) { orderError.value = 'Add at least one menu item to the order.'; return }
  if (source.value === 'In-house' && (!selectedStay.value || selectedStay.value.status !== 'In house')) { orderError.value = 'Choose an in-house guest before sending this order.'; showGuestChooser.value = true; return }
  if (source.value === 'Walk-in' && !walkInGuest.value.trim()) { orderError.value = 'Enter the guest’s name before sending this order.'; showGuestChooser.value = true; return }
  const shortStock = cart.value.find((line) => line.menuItem.inventoryItemId && line.quantity > availableRestaurantStock(line.menuItem.inventoryItemId))
  if (shortStock?.menuItem.inventoryItemId) {
    const item = restaurantInventory.value.find((entry) => entry.id === shortStock.menuItem.inventoryItemId)
    orderError.value = `Not enough stock for ${shortStock.menuItem.name}. Available: ${availableRestaurantStock(shortStock.menuItem.inventoryItemId)} ${item?.unit || 'units'}.`
    return
  }
  const guestName = source.value === 'In-house' ? selectedStay.value!.guest : walkInGuest.value.trim() || 'Walk-in guest'
  const orderId = `FB-${Date.now().toString(36).toUpperCase()}`
  const lines: RestaurantOrderLine[] = cart.value.map(({ menuItem, quantity, note }) => ({ id: `${orderId}-${menuItem.id}`, menuItemId: menuItem.id, inventoryItemId: menuItem.inventoryItemId, name: menuItem.name, category: menuItem.category, station: menuItem.station, quantity, unitPrice: menuItem.price, note: note.trim() || undefined, status: 'New' }))
  const order: RestaurantOrder = { id: orderId, tableId: selectedTable.value.id, venue: selectedTable.value.venue, orderType: orderType.value, source: source.value, guestName, room: selectedStay.value?.room, reservationId: selectedStay.value?.id, waiter, lines, subtotal: orderSubtotal.value, placedAt: new Date().toISOString(), status: 'Open' }
  restaurantOrders.value.unshift(order)
  notice.value = `Order sent to the kitchen/bar for preparation${order.room ? ` · Room ${order.room}` : ''}.`
  cart.value = []
  showGuestChooser.value = false
  activeOrderView.value = 'Orders'
  window.setTimeout(() => { notice.value = '' }, 4500)
}
function openTill() {
  if (Number(openingFloat.value) < 0 || !Number.isFinite(Number(openingFloat.value))) return
  restaurantTillOpen.value = true
  showTillModal.value = false
  notice.value = 'Restaurant & Bar till opened.'
  window.setTimeout(() => { notice.value = '' }, 3500)
}
const paymentTotal = computed(() => (payOrder.value?.subtotal || 0) + (Number(gratuity.value) || 0))
const paymentAllocated = computed(() => paymentRows.value.reduce((total, row) => total + row.amount, 0))
const paymentRemaining = computed(() => Math.max(0, paymentTotal.value - paymentAllocated.value))
const paymentOverage = computed(() => Math.max(0, paymentAllocated.value - paymentTotal.value))
const singlePaymentMatchesTotal = computed(() => payMethod.value === 'Cash'
  ? Number(paymentAmount.value) >= paymentTotal.value - 0.009
  : Math.abs(Number(paymentAmount.value) - paymentTotal.value) < 0.009)
const cashChangeDue = computed(() => paymentRows.value.length === 0 && payMethod.value === 'Cash' ? Math.max(0, (Number(paymentAmount.value) || 0) - paymentTotal.value) : 0)
const canCompletePayment = computed(() => paymentRows.value.length === 0
  ? singlePaymentMatchesTotal.value
  : paymentRemaining.value <= 0.009 && paymentOverage.value <= 0.009)
watch(gratuity, (nextTip, previousTip) => {
  if (!paymentRows.value.length && payOrder.value
    && Math.abs(Number(paymentAmount.value) - (payOrder.value.subtotal + (Number(previousTip) || 0))) < 0.009) {
    paymentAmount.value = (payOrder.value.subtotal + (Number(nextTip) || 0)).toFixed(2)
  }
})
function openPayment(order: RestaurantOrder) {

  payOrder.value = order
  payMethod.value = 'Cash'
  cardBrand.value = 'Visa'
  mobileWallet.value = 'GCash'
  gratuity.value = '0'
  paymentRows.value = []
  paymentAmount.value = order.subtotal.toFixed(2)
  payError.value = ''
}
function addPaymentSplit() {
  const amount = Number(paymentAmount.value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > paymentRemaining.value + 0.001) {
    payError.value = 'Enter an amount greater than zero and no more than the remaining balance.'
    return
  }
  if (payMethod.value === 'Bill to Room' && payOrder.value?.source !== 'In-house') {
    payError.value = 'Bill to Room is only available for in-house guests.'
    return
  }
  if (payMethod.value === 'Bill to Room' && payOrder.value?.reservationId) {
    const stay = payOrderStay.value
    const roomAlreadyApplied = paymentRows.value.filter((payment) => payment.method === 'Bill to Room').reduce((sum, payment) => sum + payment.amount, 0)
    const signedTotal = stay ? outletChargeTotal(stay, roomAlreadyApplied + amount) : 0
    if (!stay || !canSignOutletCharge(stay, signedTotal)) {
      if (stay) stay.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, signedTotal - (stay.cashBasisDepositBalance || 0)).toFixed(2)} required for this order including tax.`
      payError.value = 'This guest cannot sign this outlet charge. Take cash/card payment or ask the Desk to record a signing deposit or sponsor authorization.'
      return
    }
  }
  const method: RestaurantPayment['method'] = payMethod.value === 'Card'
    ? cardBrand.value
    : payMethod.value === 'Mobile wallet'
      ? mobileWallet.value
      : payMethod.value === 'Bank transfer'
        ? 'Bank Transfer'
        : payMethod.value
  paymentRows.value.push({ method, amount: Math.round(amount * 100) / 100 })
  paymentAmount.value = paymentRemaining.value.toFixed(2)
  payError.value = ''
}
function removePaymentSplit(index: number) {
  paymentRows.value.splice(index, 1)
  paymentAmount.value = paymentRemaining.value.toFixed(2)
  payError.value = ''
}
function markPaid() {
  if (!payOrder.value) return
  const cashPayment = paymentRows.value.length
    ? paymentRows.value.some((payment) => payment.method === 'Cash')
    : payMethod.value === 'Cash'
  if (!restaurantTillOpen.value && cashPayment) {
    payError.value = 'Open the restaurant till before completing a cash payment.'
    return
  }
  const completedPayments = paymentRows.value.length
    ? [...paymentRows.value]
    : [{ method: (payMethod.value === 'Card' ? cardBrand.value : payMethod.value === 'Mobile wallet' ? mobileWallet.value : payMethod.value === 'Bank transfer' ? 'Bank Transfer' : payMethod.value) as RestaurantPayment['method'], amount: payMethod.value === 'Cash' ? paymentTotal.value : Number(paymentAmount.value) }]
  if (paymentRows.value.length
    ? paymentRemaining.value > 0.009 || paymentOverage.value > 0.009
    : !singlePaymentMatchesTotal.value) {
    payError.value = paymentRows.value.length
      ? 'Payment splits must add up to the full total before completing payment.'
      : 'Payment amount must match the full total before completing payment.'
    return
  }
  const roomAmount = completedPayments.filter((payment) => payment.method === 'Bill to Room').reduce((total, payment) => total + payment.amount, 0)
  const stockNeeds = new Map<string, number>()
  for (const line of payOrder.value.lines) {
    if (line.inventoryItemId && !line.stockDeducted) stockNeeds.set(line.inventoryItemId, (stockNeeds.get(line.inventoryItemId) || 0) + line.quantity)
  }
  const unavailableStock = [...stockNeeds.entries()].find(([inventoryItemId, quantity]) => {
    const item = restaurantInventory.value.find((entry) => entry.id === inventoryItemId)
    return !item || item.onHand < quantity
  })
  if (unavailableStock) {
    const item = restaurantInventory.value.find((entry) => entry.id === unavailableStock[0])
    payError.value = `Not enough stock for ${item?.name || unavailableStock[0]} to complete this sale.`
    return
  }
  if (roomAmount > 0) {
    const stay = reservations.value.find((reservation) => reservation.id === payOrder.value?.reservationId && reservation.status === 'In house')
    if (!stay) {
      payError.value = 'The guest stay is no longer in house, so the room charge cannot be posted.'
      return
    }
    const signedTotal = outletChargeTotal(stay, roomAmount)
    if (!canSignOutletCharge(stay, signedTotal)) {
      stay.cashBasisDepositAlert = `Additional signing deposit of ₱${Math.max(0, signedTotal - (stay.cashBasisDepositBalance || 0)).toFixed(2)} required for restaurant order ${payOrder.value.id}, including tax.`
      payError.value = 'The guest does not have enough signing deposit or sponsor authorization. Collect cash/card payment or ask the Desk to take a deposit.'
      return
    }
    if (isCashBasisReservation(stay) && !hasSponsorSigningAuthorization(stay)
      && !applyCashBasisDepositToCharge(stay, signedTotal)) {
      payError.value = 'The signing deposit could not be applied. Collect an additional deposit at the Desk.'
      return
    }
    if (!payOrder.value.folioChargeId) {
      const chargeId = `POS-${payOrder.value.id}`
      stay.charges ||= []
      stay.charges.push({ id: chargeId, description: `Restaurant order ${payOrder.value.id} · ${payOrder.value.lines.map((line) => `${line.quantity} × ${line.name}`).join(', ')}`, date: today, amount: roomAmount, category: 'Restaurant', outlet: 'Restaurant & Bar', postedBy: waiter, reference: payOrder.value.id, status: 'Posted' })
      payOrder.value.folioChargeId = chargeId
    }
  }
  for (const [inventoryItemId, quantity] of stockNeeds) {
    deductRestaurantStock(inventoryItemId, quantity, payOrder.value.id)
    payOrder.value.lines.filter((line) => line.inventoryItemId === inventoryItemId).forEach((line) => { line.stockDeducted = true })
  }
  payOrder.value.status = 'Paid'
  payOrder.value.paymentMethod = completedPayments.length === 1 ? completedPayments[0]!.method : 'Split payment'
  payOrder.value.payments = completedPayments
  payOrder.value.gratuity = Number(gratuity.value) || 0
  payOrder.value.cashReceived = cashPayment && paymentRows.value.length === 0 ? Number(paymentAmount.value) : undefined
  payOrder.value.changeDue = cashPayment && paymentRows.value.length === 0 ? cashChangeDue.value : undefined
  notice.value = `${payOrder.value.id} completed · ${completedPayments.map((payment) => payment.method).join(' + ')} · ${money(paymentTotal.value)}.`
  payOrder.value = null
  window.setTimeout(() => { notice.value = '' }, 3500)
}
function clearOrder() { cart.value = []; orderError.value = '' }
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-3"><div><p class="eyebrow">Restaurant &amp; Bar <span class="px-1 text-[#c3bcc9]">/</span> Point of sale</p><h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">POS Terminal</h1></div><div class="flex flex-wrap items-center gap-2"><span class="text-[9px] text-[#8b8490]">Signed in as <strong class="text-[#51465b]">{{ waiter }}</strong></span><button v-if="!restaurantTillOpen" class="rounded-md border border-[#efdfb0] bg-[#fff7dc] px-3 py-2 text-[9px] font-medium text-[#856733]" @click="showTillModal = true">Till closed · Open till</button><span v-else class="rounded-md border border-[#cfe5d8] bg-[#f0f8f3] px-3 py-2 text-[9px] font-medium text-[#44805b]">Till open</span><RouterLink to="/restaurant/kitchen" class="report-action"><ChefHat :size="13" /> Kitchen</RouterLink><RouterLink to="/restaurant/transactions" class="report-action"><FileText :size="13" /> Transactions</RouterLink></div></header>
    <div v-if="notice" class="rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[10px] text-[#4a7356]" role="status">{{ notice }}</div>

    <div class="grid min-h-[650px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.88fr)]">
      <section class="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-[#e7e2e9] bg-white">
        <div class="border-b border-[#eeeaf0] p-3"><div class="grid gap-2 md:grid-cols-[auto_minmax(170px,1fr)_150px]"><div class="flex rounded-md bg-[#f5f2f7] p-1"><button class="rounded px-3 py-2 text-[9px]" :class="source === 'Walk-in' ? 'bg-white font-semibold text-[#64448a] shadow-sm' : 'text-[#847b89]'" @click="source = 'Walk-in'; reservationId = ''">Walk-in</button><button class="rounded px-3 py-2 text-[9px]" :class="source === 'In-house' ? 'bg-white font-semibold text-[#64448a] shadow-sm' : 'text-[#847b89]'" @click="source = 'In-house'; walkInGuest = ''">In-house</button></div><label v-if="source === 'In-house'" class="form-label relative">Guest / room<select v-model="reservationId" class="form-input mt-1"><option value="">Choose in-house guest</option><option v-for="stay in inHouseGuests" :key="stay.id" :value="stay.id">Room {{ stay.room }} · {{ stay.guest }}</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-3 top-[29px] text-[#847b89]" /></label><label v-else class="form-label">Guest name (required to send)<input v-model="walkInGuest" class="form-input mt-1" placeholder="Name for this order" /></label><label class="form-label">Table / order type<select v-model="tableId" class="form-input mt-1"><option v-for="table in restaurantTables" :key="table.id" :value="table.id">{{ table.name }} · {{ table.venue }}</option></select></label></div><div v-if="selectedStay && source === 'In-house'" class="mt-2 flex items-center gap-1.5 text-[9px] text-[#517b5b]"><BadgeCheck :size="12" /> Room {{ selectedStay.room }} · {{ selectedStay.guest }} · order will post to guest folio</div></div>
        <div class="flex flex-wrap items-center gap-2 border-b border-[#eeeaf0] p-3"><label class="client-search min-w-[180px] flex-1"><Search :size="13" /><span class="sr-only">Search menu</span><input v-model="menuSearch" placeholder="Search menu or short name" /></label><div class="flex flex-wrap gap-1"><button v-for="item in orderCategories" :key="item" class="report-period" :class="category === item ? 'report-period-active' : ''" @click="category = item">{{ item }}</button></div></div>
        <div class="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"><button v-for="item in visibleMenu" :key="item.id" class="restaurant-menu-item" @click="addMenuItem(item)"><span class="flex items-start justify-between gap-1"><strong>{{ item.name }}</strong><span class="rounded-full bg-[#f4f0f6] px-1.5 py-0.5 text-[7px] text-[#756582]">{{ item.station }}</span></span><small>{{ item.category }}</small><b>{{ money(item.price) }}</b></button><div v-if="visibleMenu.length === 0" class="col-span-full py-16 text-center text-[10px] text-[#8b8490]">No menu items match your search.</div></div>
      </section>

      <aside class="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-[#e7e2e9] bg-white">
        <header class="flex items-start justify-between gap-3 border-b border-[#eeeaf0] px-4 py-3"><div><h2 class="text-[13px] font-semibold text-[#43394c]">{{ selectedTable.name }} <span class="ml-1 rounded-full bg-[#eaf6ee] px-2 py-1 text-[8px] font-medium text-[#4f805c]">{{ selectedTable.venue }}</span></h2><p class="mt-1 text-[9px] text-[#8a818e]">{{ selectedStay ? `Room ${selectedStay.room} · ${selectedStay.guest}` : source === 'Walk-in' ? 'Walk-in order' : 'Choose an in-house guest' }}</p></div><label class="sr-only" for="order-type">Order type</label><select id="order-type" v-model="orderType" class="report-select max-w-[130px]"><option>Dine-in</option><option>Room service</option><option>Takeaway</option></select></header>
        <nav class="flex gap-4 border-b border-[#eeeaf0] px-4" aria-label="POS panels"><button class="report-tab" :class="activeOrderView === 'Current order' ? 'report-tab-active' : ''" @click="activeOrderView = 'Current order'">Current order<span class="ml-1 text-[9px] text-[#9d94a1]">{{ cart.length }}</span></button><button class="report-tab" :class="activeOrderView === 'Orders' ? 'report-tab-active' : ''" @click="activeOrderView = 'Orders'">Orders<span class="ml-1 text-[9px] text-[#9d94a1]">{{ openOrders.length }}</span></button></nav>
        <div v-if="activeOrderView === 'Current order'" class="flex flex-1 flex-col">
          <div v-if="cart.length" class="flex-1 overflow-y-auto px-4"><div v-for="line in cart" :key="line.menuItem.id" class="flex items-center justify-between gap-3 border-b border-[#f0edf1] py-3"><div class="min-w-0"><p class="truncate text-[10px] font-semibold text-[#43394c]">{{ line.menuItem.name }}</p><p class="mt-1 text-[8px] text-[#88808c]">{{ line.menuItem.station }} · {{ money(line.menuItem.price) }} each</p><input v-model="line.note" class="mt-1 w-full border-0 bg-transparent p-0 text-[8px] text-[#786d82] outline-none placeholder:text-[#aaa2ae]" placeholder="Item note (optional)" /></div><div class="flex items-center gap-2"><button class="quantity-control" aria-label="Decrease quantity" @click="changeQuantity(line, -1)"><Minus :size="11" /></button><span class="w-4 text-center text-[10px] font-semibold">{{ line.quantity }}</span><button class="quantity-control" aria-label="Increase quantity" @click="changeQuantity(line, 1)"><Plus :size="11" /></button><strong class="w-[72px] text-right text-[10px] text-[#43394c]">{{ money(line.menuItem.price * line.quantity) }}</strong></div></div></div><div v-else class="flex flex-1 flex-col items-center justify-center px-6 text-center"><ShoppingBag :size="22" class="text-[#b0a5b8]" /><p class="mt-3 text-[11px] font-medium text-[#665a70]">Start an order</p><p class="mt-1 text-[9px] text-[#918894]">Tap a menu item to add it here.</p></div>
          <div class="border-t border-[#eeeaf0] p-4"><div class="mb-3 flex justify-between text-[10px] text-[#7e7584]"><span>Subtotal</span><strong class="text-[15px] text-[#30243e]">{{ money(orderSubtotal) }}</strong></div><p v-if="orderError && !showGuestChooser" class="mb-2 flex items-center gap-1.5 text-[9px] text-[#a25454]"><CircleAlert :size="12" />{{ orderError }}</p><div class="grid grid-cols-[1fr_auto] gap-2"><button class="send-kitchen-button" :disabled="!cart.length" @click="requestSendToKitchen"><Send :size="14" /> {{ hasOrderingGuest ? 'Send to kitchen & bar' : 'Choose who’s ordering' }}</button><button class="secondary-button px-3" :disabled="!cart.length" aria-label="Clear current order" @click="clearOrder"><Trash2 :size="13" /></button></div><p class="mt-2 text-center text-[8px] text-[#8b8490]">Choose the guest before sending. In-house orders can be billed to their room at payment.</p></div>
        </div>
        <div v-else class="flex-1 overflow-y-auto p-3"><div class="mb-2"><label class="client-search"><Search :size="12" /><span class="sr-only">Search orders</span><input v-model="orderSearch" placeholder="Search orders, guest, or table" /></label></div><div v-for="order in filteredOrders" :key="order.id" class="mb-2 rounded-md border border-[#eee8f0] p-3"><div class="flex items-start justify-between gap-2"><div><p class="text-[10px] font-semibold text-[#44394c]">{{ order.id }} · {{ order.tableId }}</p><p class="mt-0.5 text-[8px] text-[#837a89]">{{ formatTime(order.placedAt) }} · {{ order.guestName }}<span v-if="order.room"> · Room {{ order.room }}</span></p></div><div class="text-right"><strong class="text-[10px] text-[#44394c]">{{ money(order.subtotal) }}</strong><span class="mt-1 block rounded-full bg-[#edf2fa] px-2 py-0.5 text-[8px] text-[#516d91]">{{ currentStatus(order) }}</span></div></div><p v-for="line in order.lines" :key="line.id" class="mt-2 flex items-center justify-between border-t border-[#f0edf1] pt-2 text-[8px] text-[#6f6675]"><span>{{ line.quantity }} × {{ line.name }} <small class="ml-1 text-[#948a99]">{{ line.station }}</small></span><span>{{ line.status }}</span></p><p v-if="order.folioChargeId" class="mt-2 text-[8px] font-medium text-[#527d5d]">Posted to Room {{ order.room }} folio</p><button v-if="order.status !== 'Paid'" class="mt-2 w-full rounded-md border border-[#cfe5d8] bg-cthm-green py-2 text-[9px] font-medium text-white" @click="openPayment(order)">Take payment</button></div><div v-if="filteredOrders.length === 0" class="py-16 text-center text-[10px] text-[#8b8490]">No restaurant orders yet.</div></div>
        <footer class="border-t border-[#eeeaf0] px-4 py-3"><div class="flex flex-wrap items-center justify-between gap-2 text-[8px] text-[#8c8490]"><span class="flex items-center gap-1"><Clock3 :size="11" /> Open orders {{ openOrders.length }}</span><span>Kitchen {{ orderCounts.kitchen }} · Bar {{ orderCounts.bar }}</span><RouterLink to="/restaurant/kitchen" class="font-medium text-[#704b99]">Open kitchen display <ArrowRight :size="11" class="inline" /></RouterLink></div></footer>
      </aside>
    </div>

    <div v-if="showGuestChooser" class="modal-backdrop" @click.self="showGuestChooser = false"><section class="modal-card max-h-[90vh] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="guest-chooser-title"><header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Restaurant &amp; Bar · order details</p><h2 id="guest-chooser-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Who’s ordering?</h2><p class="mt-1 text-[10px] text-[#807884]">Select the guest before this order is sent to the kitchen and bar.</p></div><button aria-label="Close guest selection" @click="showGuestChooser = false"><X :size="16" /></button></header><div class="mt-4 flex rounded-md bg-[#f5f2f7] p-1"><button class="flex-1 rounded px-3 py-2 text-[9px]" :class="source === 'Walk-in' ? 'bg-white font-semibold text-[#64448a] shadow-sm' : 'text-[#847b89]'" @click="source = 'Walk-in'; reservationId = ''">Walk-in guest</button><button class="flex-1 rounded px-3 py-2 text-[9px]" :class="source === 'In-house' ? 'bg-white font-semibold text-[#64448a] shadow-sm' : 'text-[#847b89]'" @click="source = 'In-house'; walkInGuest = ''">In-house guest</button></div><label v-if="source === 'Walk-in'" class="form-label mt-4">Guest name <span class="text-[#a25454]">*</span><input v-model="walkInGuest" class="form-input mt-1" autocomplete="name" placeholder="Enter the name for this order" @input="orderError = ''" /></label><label v-else class="form-label relative mt-4">Select in-house guest <span class="text-[#a25454]">*</span><select v-model="reservationId" class="form-input mt-1" @change="orderError = ''"><option value="">Choose guest and room</option><option v-for="stay in inHouseGuests" :key="stay.id" :value="stay.id">Room {{ stay.room }} · {{ stay.guest }}</option></select><ChevronDown :size="13" class="pointer-events-none absolute right-3 top-[43px] text-[#847b89]" /><p v-if="inHouseGuests.length === 0" class="mt-1 text-[9px] text-[#958b9a]">There are no in-house guests to select.</p></label><p v-if="orderError" class="mt-3 flex items-center gap-1.5 text-[9px] text-[#a25454]"><CircleAlert :size="12" />{{ orderError }}</p><div class="mt-4 flex items-center justify-between rounded-md bg-[#faf8fb] px-3 py-2 text-[9px] text-[#756b7d]"><span>{{ cart.reduce((sum, line) => sum + line.quantity, 0) }} items · {{ selectedTable.name }}</span><strong>{{ money(orderSubtotal) }}</strong></div><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showGuestChooser = false">Cancel</button><button class="arrival-action-primary" :disabled="!hasOrderingGuest" @click="sendToKitchen"><Send :size="13" /> Confirm guest &amp; send</button></footer></section></div>

    <div v-if="showTillModal" class="modal-backdrop" @click.self="showTillModal = false"><section class="modal-card text-left" role="dialog" aria-modal="true" aria-labelledby="restaurant-till-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Restaurant &amp; Bar · cashiering</p><h2 id="restaurant-till-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Open restaurant till</h2></div><button aria-label="Close till dialog" @click="showTillModal = false"><X :size="16" /></button></header><label class="form-label mt-4">Opening float (₱)<input v-model="openingFloat" type="number" min="0" step="0.01" class="form-input mt-1" placeholder="0.00" /></label><p class="mt-2 text-[9px] text-[#827987]">A till is required to take direct payment for walk-in orders. Room charges can still be posted to in-house guest folios.</p><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showTillModal = false">Cancel</button><button class="arrival-action-primary" @click="openTill"><Check :size="13" /> Open till</button></footer></section></div>

    <div v-if="payOrder" class="modal-backdrop" @click.self="payOrder = null"><section class="modal-card max-h-[90vh] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="pay-order-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Restaurant &amp; Bar · payment</p><h2 id="pay-order-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Complete payment</h2><p class="mt-1 text-[9px] text-[#807884]">Choose to pay now or post the charge to an in-house room.</p></div><button aria-label="Close payment dialog" @click="payOrder = null"><X :size="16" /></button></header><div class="mt-4 flex items-center justify-between rounded-md bg-[#f8f5fa] px-3 py-3 text-[10px]"><span>{{ payOrder.id }} · {{ payOrder.guestName }}</span><strong class="text-[14px] text-[#382d44]">{{ money(payOrder.subtotal) }}</strong></div><h3 class="mt-4 text-[10px] font-semibold text-[#463b4f]">Pay now</h3><div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><button v-for="method in (['Cash', 'Card', 'Mobile wallet', 'Bank transfer'] as const)" :key="method" class="rounded-md border px-2 py-2.5 text-[9px] font-medium" :class="payMethod === method ? 'border-[#704b99] bg-[#f3edf8] text-[#5d3f7c]' : 'border-[#e8e3eb] text-[#716879]'" @click="payMethod = method">{{ method }}</button></div><button class="mt-2 w-full rounded-md border px-3 py-2.5 text-left text-[9px] font-medium" :class="payMethod === 'Bill to Room' ? 'border-[#704b99] bg-[#f3edf8] text-[#5d3f7c]' : 'border-[#e8e3eb] text-[#716879]'" :disabled="payOrder.source !== 'In-house'" @click="payMethod = 'Bill to Room'">Charge to room<span class="ml-2 font-normal text-[#8b8490]">{{ payOrder.source === 'In-house' ? `Post to Room ${payOrder.room} folio for settlement at checkout` : 'Available for in-house guests only' }}</span></button><div v-if="payMethod === 'Card'" class="mt-3 flex flex-wrap gap-2 rounded-md bg-[#faf8fb] p-2"><span class="self-center text-[8px] text-[#847b89]">Card network</span><button v-for="brand in (['Visa', 'Visa Debit', 'Mastercard'] as const)" :key="brand" class="rounded-full border px-2.5 py-1 text-[8px]" :class="cardBrand === brand ? 'border-[#b9a2d1] bg-[#f1eafa] text-[#604283]' : 'border-[#e8e3eb] text-[#736a79]'" @click="cardBrand = brand">{{ brand }}</button></div><div v-if="payMethod === 'Mobile wallet'" class="mt-3 flex flex-wrap gap-2 rounded-md bg-[#faf8fb] p-2"><span class="self-center text-[8px] text-[#847b89]">Wallet</span><button v-for="wallet in (['GCash', 'Maya'] as const)" :key="wallet" class="rounded-full border px-2.5 py-1 text-[8px]" :class="mobileWallet === wallet ? 'border-[#b9a2d1] bg-[#f1eafa] text-[#604283]' : 'border-[#e8e3eb] text-[#736a79]'" @click="mobileWallet = wallet">{{ wallet }}</button></div><div class="mt-4 flex items-center justify-between"><h3 class="text-[11px] font-semibold text-[#463b4f]">Split payments</h3><button class="secondary-button px-2 py-1.5 text-[9px]" :disabled="paymentRemaining <= 0" @click="addPaymentSplit">Add split</button></div><p v-if="paymentRows.length === 0" class="mt-2 text-[9px] text-[#918894]">For one payment, use the selected method. To split, enter a partial amount and add it, then add the remaining method.</p><div v-for="(payment, index) in paymentRows" :key="index" class="mt-2 flex items-center justify-between rounded-md border border-[#eee8f0] px-3 py-2 text-[9px]"><span>{{ payment.method }}</span><span class="flex items-center gap-2"><strong>{{ money(payment.amount) }}</strong><button class="text-[#8b8490] hover:text-[#a25454]" :aria-label="`Remove ${payment.method} payment`" @click="removePaymentSplit(index)"><X :size="12" /></button></span></div><label class="form-label mt-3">Tip / Gratuity (₱)<input v-model="gratuity" class="form-input mt-1" type="number" min="0" step="0.01" /></label><div class="mt-2 grid grid-cols-2 gap-2"><label class="form-label">{{ payMethod === 'Cash' && paymentRows.length === 0 ? 'Cash received' : 'Payment amount' }}<input v-model="paymentAmount" class="form-input mt-1" type="number" min="0.01" step="0.01" /></label><div class="rounded-md border border-[#e8e3eb] bg-[#faf9fb] px-3 py-2 text-[9px]"><span>{{ paymentRows.length ? 'Remaining' : 'Amount due' }}</span><strong class="mt-1 block text-[12px] text-[#44394c]">{{ money(paymentRows.length ? paymentRemaining : Math.max(0, paymentTotal - (Number(paymentAmount) || 0))) }}</strong></div></div><p v-if="cashChangeDue > 0" class="mt-2 text-right text-[9px] font-medium text-[#52785b]">Change due {{ money(cashChangeDue) }}</p><div v-if="payOrder.room" class="mt-3 flex items-center justify-between rounded-md border border-[#eee8f0] px-3 py-2 text-[9px] text-[#736a7a]"><span>Room<br />Guest</span><strong class="text-right text-[#44394c]">{{ payOrder.room }}<br />{{ payOrder.guestName }}</strong></div><div class="mt-3 space-y-1 border-t border-[#eeeaf0] pt-3 text-[10px]"><div class="flex justify-between"><span>Subtotal</span><strong>{{ money(payOrder.subtotal) }}</strong></div><div class="flex justify-between"><span>Tip</span><strong>{{ money(Number(gratuity) || 0) }}</strong></div><div class="flex justify-between font-semibold"><span>Total</span><strong>{{ money(paymentTotal) }}</strong></div></div><p v-if="payError" class="mt-2 text-[9px] text-[#a25454]">{{ payError }}</p><p v-if="payMethod === 'Cash' && !restaurantTillOpen" class="mt-2 rounded bg-[#fff6e7] px-2 py-1.5 text-[8px] text-[#916a35]">Cash payment requires an open restaurant till.</p><p v-if="payMethod === 'Bill to Room'" class="mt-2 rounded bg-[#eef7f0] px-2 py-1.5 text-[8px] text-[#50785b]">This order will be posted to Room {{ payOrder.room }}’s folio for settlement at checkout.</p><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="payOrder = null">Close</button><button class="arrival-action-primary" :disabled="!canCompletePayment" @click="markPaid"><Check :size="13" /> Complete payment</button></footer></section></div>
  </section>
</template>
