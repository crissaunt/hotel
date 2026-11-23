<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { housekeepingExtraSupplyRequests, housekeepingRequisitions, housekeepingRoomKits, housekeepingStock, housekeepingStockReturns } from '@/features/housekeeping/stores/housekeepingSupplies'

type SupplyTab = 'Inventory' | 'Room kits' | 'Extra supplies' | 'Stock Count' | 'Requisitions'
const tabs: SupplyTab[] = ['Inventory', 'Room kits', 'Extra supplies', 'Stock Count', 'Requisitions']
const activeTab = ref<SupplyTab>('Inventory')
const search = ref('')
const categoryFilter = ref('All items')
const dateFilter = ref('All dates')
const page = ref(1)
const pageSize = 9
const countedStock = ref<Record<string, number>>({})
const stockCountNotice = ref('')
const showRequisitionForm = ref(false)
const showExtraRequestForm = ref(false)
const showStockReturnForm = ref(false)
const requestItem = ref('')
const requestQuantity = ref('1')
const requestError = ref('')
const extraRequestForm = ref({ itemCode: '', quantity: '1', destination: '', requestedBy: '' })
const extraRequestError = ref('')
const stockReturnForm = ref({ itemCode: '', quantity: '1', returnedBy: '', condition: 'Unused' as 'Unused' | 'Damaged' })
const stockReturnError = ref('')
const roomTypes = ['Standard', 'Deluxe', 'Executive']
const selectedRoomType = ref(roomTypes[0])
const selectedRoomKit = computed(() => housekeepingRoomKits.value.find((kit) => kit.roomType === selectedRoomType.value))
const roomKitDraft = ref<{ turnover: { itemCode: string; quantity: number }[]; stayover: { itemCode: string; quantity: number }[] }>({ turnover: [], stayover: [] })
const kitItemSelection = ref({ turnoverItemCode: '', turnoverQuantity: '1', stayoverItemCode: '', stayoverQuantity: '1' })
const kitNotice = ref('')
function loadRoomKitDraft() {
  roomKitDraft.value = {
    turnover: selectedRoomKit.value?.turnover.map((item) => ({ ...item })) || [],
    stayover: selectedRoomKit.value?.stayover.map((item) => ({ ...item })) || [],
  }
  kitNotice.value = ''
}
watch(selectedRoomType, loadRoomKitDraft, { immediate: true })
const categories = computed(() => ['All items', ...new Set(housekeepingStock.value.map((item) => item.category))])
const filteredStock = computed(() => housekeepingStock.value.filter((item) => {
  const query = search.value.trim().toLowerCase()
  return (categoryFilter.value === 'All items' || categoryFilter.value === item.category)
    && (!query || [item.code, item.item, item.category].some((value) => value.toLowerCase().includes(query)))
}))
const visibleStock = computed(() => filteredStock.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredStock.value.length / pageSize)))
function stockLevel(onHand: number, reorder: number) {
  if (onHand <= 0) return 'Out'
  if (onHand <= reorder) return 'Low'
  return 'OK'
}
function levelClass(level: string) {
  return level === 'Out' ? 'bg-[#ffe3eb] text-[#aa4162]' : level === 'Low' ? 'bg-[#fff0d1] text-[#916b22]' : 'bg-[#dcf7eb] text-[#24734d]'
}
function categoryClass() { return 'bg-[#f0eff2] text-[#68717a]' }
function goToPage(nextPage: number) { page.value = Math.max(1, Math.min(pageCount.value, nextPage)) }
function saveStockCount() {
  for (const item of housekeepingStock.value) {
    const count = countedStock.value[item.code]
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) item.onHand = count
  }
  stockCountNotice.value = 'Stock counts saved.'
  window.setTimeout(() => { stockCountNotice.value = '' }, 3000)
}
function createRequisition() {
  const item = housekeepingStock.value.find((entry) => entry.code === requestItem.value)
  const quantity = Number(requestQuantity.value)
  if (!item || !Number.isFinite(quantity) || quantity < 1) {
    requestError.value = 'Choose an item and enter a quantity of at least one.'
    return
  }
  const nextId = Math.max(0, ...housekeepingRequisitions.value.map((request) => Number(request.id.replace('REQ-', '')))) + 1
  housekeepingRequisitions.value.unshift({ id: `REQ-${String(nextId).padStart(4, '0')}`, itemCode: item.code, item: item.item, quantity, requestedBy: 'Housekeeping', status: 'Pending' })
  showRequisitionForm.value = false
  requestError.value = ''
}
function createExtraSupplyRequest() {
  const item = housekeepingStock.value.find((entry) => entry.code === extraRequestForm.value.itemCode)
  const quantity = Number(extraRequestForm.value.quantity)
  if (!item || !Number.isInteger(quantity) || quantity < 1 || !extraRequestForm.value.destination.trim() || !extraRequestForm.value.requestedBy.trim()) {
    extraRequestError.value = 'Choose an item, enter a whole quantity, destination, and requester.'
    return
  }
  housekeepingExtraSupplyRequests.value.unshift({
    id: `EX-${Date.now().toString(36).toUpperCase()}`,
    itemCode: item.code,
    item: item.item,
    quantity,
    destination: extraRequestForm.value.destination.trim(),
    requestedBy: extraRequestForm.value.requestedBy.trim(),
    status: 'Pending approval',
  })
  extraRequestForm.value = { itemCode: '', quantity: '1', destination: '', requestedBy: '' }
  extraRequestError.value = ''
  showExtraRequestForm.value = false
}
function approveExtraSupplyRequest(requestId: string) {
  const request = housekeepingExtraSupplyRequests.value.find((entry) => entry.id === requestId)
  if (!request || request.status !== 'Pending approval') return
  housekeepingRequisitions.value.unshift({
    id: `REQ-${String(Date.now()).slice(-6)}`,
    itemCode: request.itemCode,
    item: request.item,
    quantity: request.quantity,
    requestedBy: `${request.requestedBy} · ${request.destination}`,
    status: 'Pending',
  })
  request.status = 'Approved'
}
function rejectExtraSupplyRequest(requestId: string) {
  const request = housekeepingExtraSupplyRequests.value.find((entry) => entry.id === requestId)
  if (request?.status === 'Pending approval') request.status = 'Rejected'
}
function approveRequisition(requisitionId: string) {
  const requisition = housekeepingRequisitions.value.find((request) => request.id === requisitionId)
  if (requisition?.status === 'Pending') requisition.status = 'Approved'
}
function receiveRequisition(requisitionId: string) {
  const requisition = housekeepingRequisitions.value.find((request) => request.id === requisitionId)
  const item = requisition && housekeepingStock.value.find((stockItem) => stockItem.code === requisition.itemCode)
  if (!requisition || !item || requisition.status !== 'Approved') return
  item.onHand += requisition.quantity
  requisition.status = 'Received'
}
function addKitItem(kitType: 'turnover' | 'stayover') {
  const kit = selectedRoomKit.value
  const itemCode = kitItemSelection.value[`${kitType}ItemCode`]
  const quantity = Number(kitItemSelection.value[`${kitType}Quantity`])
  if (!kit || !itemCode || !Number.isInteger(quantity) || quantity < 1) return
  roomKitDraft.value[kitType].push({ itemCode, quantity })
  kitItemSelection.value[`${kitType}ItemCode`] = ''
  kitItemSelection.value[`${kitType}Quantity`] = '1'
  kitNotice.value = ''
}
function removeKitItem(kitType: 'turnover' | 'stayover', index: number) {
  roomKitDraft.value[kitType].splice(index, 1)
  kitNotice.value = ''
}
function saveRoomKits() {
  const kit = selectedRoomKit.value
  if (kit) {
    kit.turnover = roomKitDraft.value.turnover.map((item) => ({ ...item }))
    kit.stayover = roomKitDraft.value.stayover.map((item) => ({ ...item }))
  }
  kitNotice.value = `${selectedRoomType.value} room turnover and stayover kits saved.`
}
function createStockReturn() {
  const item = housekeepingStock.value.find((entry) => entry.code === stockReturnForm.value.itemCode)
  const quantity = Number(stockReturnForm.value.quantity)
  if (!item || !Number.isInteger(quantity) || quantity < 1 || !stockReturnForm.value.returnedBy.trim()) {
    stockReturnError.value = 'Choose an item, enter a whole quantity, and enter who is returning it.'
    return
  }
  if (stockReturnForm.value.condition === 'Unused') item.onHand += quantity
  housekeepingStockReturns.value.unshift({
    id: `RET-${Date.now().toString(36).toUpperCase()}`,
    itemCode: item.code,
    item: item.item,
    quantity,
    returnedBy: stockReturnForm.value.returnedBy.trim(),
    condition: stockReturnForm.value.condition,
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date()),
  })
  stockReturnForm.value = { itemCode: '', quantity: '1', returnedBy: '', condition: 'Unused' }
  stockReturnError.value = ''
  showStockReturnForm.value = false
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <p class="eyebrow">Housekeeping &amp; Maintenance <span class="px-1 text-[#c3bcc9]">/</span> Supplies</p>
      <h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Supplies</h1>
    </header>

    <div class="overflow-hidden rounded-lg border border-[#e5e8eb] bg-white">

      <nav class="flex flex-wrap gap-1 border-b border-[#e8ebef] p-2" aria-label="Supply sections">
        <button v-for="tab in tabs" :key="tab" class="rounded-md px-3 py-2 text-[9px] font-medium" :class="activeTab === tab ? 'border border-[#e2e6eb] bg-white text-[#26323c] shadow-sm' : 'text-[#697681] hover:bg-[#f8fafc]'" @click="activeTab = tab; page = 1">{{ tab }}</button>
      </nav>

      <template v-if="activeTab === 'Inventory'">
        <div class="flex flex-wrap items-center gap-2 border-b border-[#edf0f3] p-3">
          <label class="client-search min-w-45 flex-1"><span aria-hidden="true">⌕</span><span class="sr-only">Search inventory</span><input v-model="search" placeholder="Search inventory" /></label>
          <select v-model="categoryFilter" class="report-select min-w-37.5"><option v-for="category in categories" :key="category">{{ category }}</option></select>
          <span class="text-[9px] text-[#77838b]">Catalog {{ housekeepingStock.length }} · Showing {{ filteredStock.length }}</span>
          <span class="ml-auto text-[9px] text-[#77838b]">Date:</span><div class="flex gap-1"><button v-for="date in (['All dates', 'Today', 'Specific date', 'Date range'] as const)" :key="date" class="rounded-full border px-2.5 py-1 text-[8px]" :class="dateFilter === date ? 'border-[#1768d5] bg-[#1768d5] text-white' : 'border-[#e1e5e9] text-[#596671]'" @click="dateFilter = date">{{ date }}</button></div>
        </div>
        <div class="overflow-x-auto"><table class="w-full min-w-212.5 border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase tracking-[0.06em] text-[#69747d]"><tr><th class="px-3 py-2.5">Code</th><th class="px-3 py-2.5">Item ↑</th><th class="px-3 py-2.5">Category</th><th class="px-3 py-2.5 text-right">On hand</th><th class="px-3 py-2.5 text-right">Reorder</th><th class="px-3 py-2.5 text-right">Min</th><th class="px-3 py-2.5 text-right">Max</th><th class="px-3 py-2.5">Unit</th><th class="px-3 py-2.5">Level</th><th class="px-3 py-2.5">Status</th></tr></thead><tbody><tr v-for="item in visibleStock" :key="item.code" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5 text-[#71808a]">{{ item.code }}</td><td class="max-w-57.5 truncate px-3 py-2.5 font-medium text-[#303b43]">{{ item.item }}</td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="categoryClass()">{{ item.category }}</span></td><td class="px-3 py-2.5 text-right font-semibold" :class="stockLevel(item.onHand, item.reorder) === 'Out' ? 'text-[#d74467]' : ''">{{ item.onHand }}</td><td class="px-3 py-2.5 text-right">{{ item.reorder }}</td><td class="px-3 py-2.5 text-right">{{ item.min }}</td><td class="px-3 py-2.5 text-right">{{ item.max }}</td><td class="px-3 py-2.5">{{ item.unit }}</td><td class="px-3 py-2.5"><span class="rounded-full px-2 py-1 text-[8px]" :class="levelClass(stockLevel(item.onHand, item.reorder))">{{ stockLevel(item.onHand, item.reorder) }}</span></td><td class="px-3 py-2.5"><span class="rounded-full bg-[#dcf7eb] px-2 py-1 text-[8px] text-[#24734d]">{{ item.status }}</span></td></tr><tr v-if="visibleStock.length === 0"><td colspan="10" class="px-4 py-10 text-center text-[10px] text-[#849098]">No supplies match your search.</td></tr></tbody></table></div>
        <footer v-if="activeTab === 'Inventory' && pageCount > 1" class="flex items-center justify-end gap-2 border-t border-[#edf0f3] px-3 py-2 text-[8px]"><button class="rounded border border-[#e3e7eb] px-2 py-1 text-[#68747d] disabled:opacity-40" :disabled="page <= 1" @click="goToPage(page - 1)">‹ Previous</button><span class="rounded bg-[#1768d5] px-2.5 py-1 text-white">{{ page }}</span><button class="rounded border border-[#e3e7eb] px-2 py-1 text-[#68747d] disabled:opacity-40" :disabled="page >= pageCount" @click="goToPage(page + 1)">Next ›</button></footer>
      </template>

      <div v-else-if="activeTab === 'Extra supplies'" class="space-y-5 p-3">
        <section>
          <div class="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 class="text-[11px] font-semibold text-[#35424b]">Extra supplies</h2><p class="mt-1 text-[8px] text-[#82909a]">Request additional stock for a room or work area.</p></div><button class="rounded-md bg-[#087c58] px-3 py-2 text-[9px] font-medium text-white" @click="showExtraRequestForm = !showExtraRequestForm; extraRequestError = ''">+ New extra request</button></div>
          <form v-if="showExtraRequestForm" class="mb-3 grid gap-2 rounded-md border border-[#e7e9ed] bg-[#fafbfc] p-3 sm:grid-cols-2" @submit.prevent="createExtraSupplyRequest"><label class="form-label">Supply<select v-model="extraRequestForm.itemCode" class="form-input mt-1"><option value="">Choose item</option><option v-for="item in housekeepingStock" :key="item.code" :value="item.code">{{ item.item }} · {{ item.unit }}</option></select></label><label class="form-label">Quantity<input v-model="extraRequestForm.quantity" class="form-input mt-1" type="number" min="1" step="1" /></label><label class="form-label">Room / area<input v-model="extraRequestForm.destination" class="form-input mt-1" placeholder="e.g. Room 104" /></label><label class="form-label">Requested by<input v-model="extraRequestForm.requestedBy" class="form-input mt-1" placeholder="Staff name" /></label><p v-if="extraRequestError" class="text-[9px] text-[#a25454] sm:col-span-2">{{ extraRequestError }}</p><div class="flex justify-end gap-2 sm:col-span-2"><button type="button" class="secondary-button" @click="showExtraRequestForm = false">Cancel</button><button type="submit" class="arrival-action-primary">Submit request</button></div></form>
          <div class="overflow-x-auto rounded-md border border-[#edf0f3]"><table class="w-full min-w-155 border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase text-[#69747d]"><tr><th class="px-3 py-2.5">Item</th><th class="px-3 py-2.5">Room / area</th><th class="px-3 py-2.5">Requested by</th><th class="px-3 py-2.5 text-right">Quantity</th><th class="px-3 py-2.5">Status</th><th class="px-3 py-2.5">Approval</th></tr></thead><tbody><tr v-for="request in housekeepingExtraSupplyRequests" :key="request.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5 font-medium">{{ request.item }}</td><td class="px-3 py-2.5">{{ request.destination }}</td><td class="px-3 py-2.5">{{ request.requestedBy }}</td><td class="px-3 py-2.5 text-right">{{ request.quantity }}</td><td class="px-3 py-2.5">{{ request.status }}</td><td class="px-3 py-2.5"><template v-if="request.status === 'Pending approval'"><button class="rounded border border-[#dce7e1] px-2 py-1 text-[8px] text-[#24734d]" @click="approveExtraSupplyRequest(request.id)">Approve · send to Stores</button><button class="ml-1 rounded border border-[#eee0e0] px-2 py-1 text-[8px] text-[#a25454]" @click="rejectExtraSupplyRequest(request.id)">Reject</button></template><span v-else-if="request.status === 'Approved'" class="text-[#24734d]">Sent to Stores</span><span v-else class="text-[#82909a]">—</span></td></tr><tr v-if="housekeepingExtraSupplyRequests.length === 0"><td colspan="6" class="px-3 py-8 text-center text-[10px] text-[#849098]">No extra requests waiting.</td></tr></tbody></table></div>
        </section>
        <section class="border-t border-[#edf0f3] pt-4">
          <div class="mb-3 flex flex-wrap items-start justify-between gap-2"><div><h2 class="text-[11px] font-semibold text-[#35424b]">Return stock</h2><p class="mt-1 text-[8px] text-[#82909a]">Record unused supplies returned to inventory, or log damaged stock.</p></div><button class="rounded-md border border-[#dce7e1] px-3 py-2 text-[9px] font-medium text-[#24734d]" @click="showStockReturnForm = !showStockReturnForm; stockReturnError = ''">+ Record return</button></div>
          <form v-if="showStockReturnForm" class="mb-3 grid gap-2 rounded-md border border-[#e7e9ed] bg-[#fafbfc] p-3 sm:grid-cols-2" @submit.prevent="createStockReturn"><label class="form-label">Supply<select v-model="stockReturnForm.itemCode" class="form-input mt-1"><option value="">Choose item</option><option v-for="item in housekeepingStock" :key="item.code" :value="item.code">{{ item.item }} · {{ item.unit }}</option></select></label><label class="form-label">Quantity<input v-model="stockReturnForm.quantity" class="form-input mt-1" type="number" min="1" step="1" /></label><label class="form-label">Returned by<input v-model="stockReturnForm.returnedBy" class="form-input mt-1" placeholder="Staff name" /></label><label class="form-label">Condition<select v-model="stockReturnForm.condition" class="form-input mt-1"><option>Unused</option><option>Damaged</option></select></label><p v-if="stockReturnError" class="text-[9px] text-[#a25454] sm:col-span-2">{{ stockReturnError }}</p><div class="flex justify-end gap-2 sm:col-span-2"><button type="button" class="secondary-button" @click="showStockReturnForm = false">Cancel</button><button type="submit" class="arrival-action-primary">Save return</button></div></form>
          <div class="overflow-x-auto rounded-md border border-[#edf0f3]"><table class="w-full min-w-140 border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase text-[#69747d]"><tr><th class="px-3 py-2.5">Item</th><th class="px-3 py-2.5">Returned by</th><th class="px-3 py-2.5 text-right">Quantity</th><th class="px-3 py-2.5">Condition</th><th class="px-3 py-2.5">Date</th></tr></thead><tbody><tr v-for="entry in housekeepingStockReturns" :key="entry.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2.5 font-medium">{{ entry.item }}</td><td class="px-3 py-2.5">{{ entry.returnedBy }}</td><td class="px-3 py-2.5 text-right">{{ entry.quantity }}</td><td class="px-3 py-2.5">{{ entry.condition }}</td><td class="px-3 py-2.5">{{ entry.date }}</td></tr><tr v-if="housekeepingStockReturns.length === 0"><td colspan="5" class="px-3 py-8 text-center text-[10px] text-[#849098]">Nothing to return.</td></tr></tbody></table></div>
        </section>
      </div>

      <div v-else-if="activeTab === 'Room kits'" class="p-3"><section class="rounded-lg border border-[#e7e9ed] p-3"><h2 class="text-[11px] font-semibold text-[#35424b]">Room kits</h2><p class="mt-1 text-[8px] text-[#82909a]">Set the standard supplies used for a full turnover and a stayover by room type.</p><label class="form-label mt-3 block">Room type<select v-model="selectedRoomType" class="form-input mt-1"><option v-for="roomType in roomTypes" :key="roomType">{{ roomType }}</option></select></label><div v-if="selectedRoomKit" class="mt-4 grid gap-5 md:grid-cols-2"><section v-for="kitType in (['turnover', 'stayover'] as const)" :key="kitType"><h3 class="text-[10px] font-semibold capitalize text-[#35424b]">{{ kitType }} <span class="ml-1 text-[#99a2a9]" :title="kitType === 'turnover' ? 'Full clean after checkout' : 'Refresh while the guest stays'">ⓘ</span></h3><div v-if="roomKitDraft[kitType].length === 0" class="mt-2 text-[8px] text-[#82909a]">No items in this kit.</div><div v-for="(kitItem, index) in roomKitDraft[kitType]" :key="`${kitItem.itemCode}-${index}`" class="mt-2 grid grid-cols-[1fr_100px_auto] gap-2"><select v-model="kitItem.itemCode" class="form-input"><option v-for="item in housekeepingStock" :key="item.code" :value="item.code">{{ item.item }}</option></select><input v-model.number="kitItem.quantity" class="form-input" type="number" min="1" step="1" :aria-label="`${kitType} quantity`" /><button class="rounded-md border border-[#e3e6e9] px-3 py-1 text-[8px] text-[#6b747c]" @click="removeKitItem(kitType, index)">Remove</button></div><div class="mt-2 grid grid-cols-[1fr_100px_auto] gap-2"><select v-model="kitItemSelection[`${kitType}ItemCode`]" class="form-input"><option value="">Select supply</option><option v-for="item in housekeepingStock" :key="item.code" :value="item.code">{{ item.item }}</option></select><input v-model="kitItemSelection[`${kitType}Quantity`]" class="form-input" type="number" min="1" step="1" :aria-label="`New ${kitType} item quantity`" /><button class="rounded-md border border-[#e3e6e9] px-3 py-1 text-[8px] text-[#4d5963]" @click="addKitItem(kitType)">Add item</button></div></section></div><div class="mt-4 flex flex-wrap items-center justify-end gap-2"><span v-if="kitNotice" class="mr-auto text-[8px] text-[#24734d]">{{ kitNotice }}</span><button class="rounded-md bg-[#1768d5] px-3 py-2 text-[9px] font-medium text-white" @click="saveRoomKits">Save kits</button></div></section></div>

      <div v-else-if="activeTab === 'Stock Count'" class="p-3"><div class="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 class="text-[11px] font-semibold text-[#35424b]">Stock count</h2><p class="mt-1 text-[8px] text-[#82909a]">Enter the physical quantity counted, then save adjustments.</p></div><button class="rounded-md bg-[#087c58] px-3 py-2 text-[9px] font-medium text-white" @click="saveStockCount">Save count</button></div><p v-if="stockCountNotice" class="mb-2 rounded border border-[#d9e8de] bg-[#f3f8f4] p-2 text-[9px] text-[#4a7356]">{{ stockCountNotice }}</p><div class="overflow-x-auto"><table class="w-full min-w-140 border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase text-[#69747d]"><tr><th class="px-3 py-2">Item</th><th class="px-3 py-2 text-right">System quantity</th><th class="px-3 py-2">Counted quantity</th></tr></thead><tbody><tr v-for="item in housekeepingStock" :key="item.code" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2">{{ item.item }}</td><td class="px-3 py-2 text-right">{{ item.onHand }} {{ item.unit }}</td><td class="px-3 py-2"><input v-model.number="countedStock[item.code]" class="form-input max-w-35 py-1.5" type="number" min="0" placeholder="Counted" /></td></tr></tbody></table></div></div>

      <div v-else class="p-3"><div class="mb-3 flex items-center justify-between"><div><h2 class="text-[11px] font-semibold text-[#35424b]">Requisitions</h2><p class="mt-1 text-[8px] text-[#82909a]">Request stock from Stores. Stock is added to inventory when the store marks a request received.</p></div><button class="rounded-md bg-[#087c58] px-3 py-2 text-[9px] font-medium text-white" @click="showRequisitionForm = true">+ New requisition</button></div><div class="overflow-x-auto"><table class="w-full min-w-162.5 border-collapse text-left"><thead class="bg-[#fafbfc] text-[8px] uppercase text-[#69747d]"><tr><th class="px-3 py-2">Request</th><th class="px-3 py-2">Item</th><th class="px-3 py-2 text-right">Quantity</th><th class="px-3 py-2">Requested by</th><th class="px-3 py-2">Status</th><th class="px-3 py-2">Action</th></tr></thead><tbody><tr v-for="request in housekeepingRequisitions" :key="request.id" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td class="px-3 py-2">{{ request.id }}</td><td class="px-3 py-2">{{ request.item }}</td><td class="px-3 py-2 text-right">{{ request.quantity }}</td><td class="px-3 py-2">{{ request.requestedBy }}</td><td class="px-3 py-2">{{ request.status }}</td><td class="px-3 py-2"><button v-if="request.status === 'Pending'" class="rounded border border-[#e3e7eb] px-2 py-1 text-[8px]" @click="approveRequisition(request.id)">Approve</button><button v-else-if="request.status === 'Approved'" class="rounded border border-[#dce7e1] px-2 py-1 text-[8px] text-[#24734d]" @click="receiveRequisition(request.id)">Mark received</button><span v-else class="text-[#82909a]">—</span></td></tr><tr v-if="housekeepingRequisitions.length === 0"><td colspan="6" class="px-3 py-10 text-center text-[10px] text-[#849098]">No requisitions yet — request stock from Stores using the button above.</td></tr></tbody></table></div></div>
    </div>

    <div v-if="showRequisitionForm" class="modal-backdrop" @click.self="showRequisitionForm = false"><section class="modal-card max-w-110 text-left" role="dialog" aria-modal="true" aria-labelledby="requisition-title"><header class="flex items-start justify-between"><div><p class="eyebrow">Housekeeping · supplies</p><h2 id="requisition-title" class="mt-1 font-serif text-[21px] text-[#30243e]">New requisition</h2></div><button aria-label="Close requisition form" @click="showRequisitionForm = false">×</button></header><div class="mt-4 space-y-3"><label class="form-label">Item<select v-model="requestItem" class="form-input mt-1"><option value="">Choose inventory item</option><option v-for="item in housekeepingStock" :key="item.code" :value="item.code">{{ item.item }} · {{ item.unit }}</option></select></label><label class="form-label">Quantity<input v-model="requestQuantity" class="form-input mt-1" type="number" min="1" /></label></div><p v-if="requestError" class="mt-2 text-[9px] text-[#a25454]">{{ requestError }}</p><footer class="mt-5 flex justify-end gap-2"><button class="secondary-button" @click="showRequisitionForm = false">Cancel</button><button class="arrival-action-primary" @click="createRequisition">Submit request</button></footer></section></div>
  </section>
</template>
