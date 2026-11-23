<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Plus, Search, X } from '@lucide/vue'
import { restaurantInventory, restaurantMenu, restaurantOrders, type MenuCategory, type MenuItem } from '@/features/restaurant/stores/restaurant'

const search = ref('')
const filterCategory = ref<'All categories' | MenuCategory>('All categories')
const layout = ref<'Cards' | 'Table'>('Cards')
const selectedItem = ref<MenuItem | null>(null)
const editorOpen = ref(false)
const notice = ref('')
const editor = ref({ name: '', category: 'Food' as MenuCategory, price: '', cost: '', prepMinutes: '15', station: 'Kitchen' as 'Kitchen' | 'Bar', inventoryItemId: '' })
const categories: Array<'All categories' | MenuCategory> = ['All categories', 'Food', 'Beverage', 'Dessert', 'Snack']
const filteredMenu = computed(() => restaurantMenu.value.filter((item) => (filterCategory.value === 'All categories' || item.category === filterCategory.value) && (!search.value.trim() || `${item.id} ${item.name}`.toLowerCase().includes(search.value.trim().toLowerCase()))))
const selectedOrders = computed(() => selectedItem.value ? restaurantOrders.value.reduce((total, order) => total + order.lines.filter((line) => line.menuItemId === selectedItem.value?.id).reduce((count, line) => count + line.quantity, 0), 0) : 0)
const marginPercent = computed(() => {
  if (!selectedItem.value || !selectedItem.value.price || selectedItem.value.cost === undefined) return null
  return Math.round((selectedItem.value.price - (selectedItem.value.cost || 0)) / selectedItem.value.price * 1000) / 10
})
const editorStock = computed(() => restaurantInventory.value.find((item) => item.id === editor.value.inventoryItemId) || null)
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function openEditor(item?: MenuItem) {
  if (item) {
    selectedItem.value = item
    editor.value = { name: item.name, category: item.category, price: String(item.price), cost: item.cost === undefined ? '' : String(item.cost), prepMinutes: String(item.prepMinutes ?? 15), station: item.station, inventoryItemId: item.inventoryItemId || '' }
  } else {
    selectedItem.value = null
    editor.value = { name: '', category: 'Food', price: '', cost: '', prepMinutes: '15', station: 'Kitchen', inventoryItemId: '' }
  }
  editorOpen.value = true
}
function saveMenuItem() {
  const price = Number(editor.value.price)
  const cost = editor.value.cost.trim() ? Number(editor.value.cost) : undefined
  if (!editor.value.name.trim() || !Number.isFinite(price) || price <= 0 || (cost !== undefined && (!Number.isFinite(cost) || cost < 0))) return
  if (selectedItem.value) {
    Object.assign(selectedItem.value, { name: editor.value.name.trim(), category: editor.value.category, price, cost, prepMinutes: Number(editor.value.prepMinutes) || 0, station: editor.value.station, inventoryItemId: editor.value.inventoryItemId || undefined, unit: editorStock.value?.unit || selectedItem.value.unit || 'Portion' })
  } else {
    const nextId = `MENU-${Date.now().toString(36).toUpperCase()}`
    restaurantMenu.value.push({ id: nextId, name: editor.value.name.trim(), category: editor.value.category, price, cost, prepMinutes: Number(editor.value.prepMinutes) || 0, station: editor.value.station, available: true, inventoryItemId: editor.value.inventoryItemId || undefined, unit: editorStock.value?.unit || 'Portion' })
  }
  editorOpen.value = false
  notice.value = selectedItem.value ? 'Menu item updated.' : 'Menu item added.'
  selectedItem.value = null
  window.setTimeout(() => { notice.value = '' }, 3000)
}
function toggleAvailability() {
  if (selectedItem.value) selectedItem.value.available = !selectedItem.value.available
}
function locationName(item: typeof restaurantInventory.value[number] | null) {
  if (!item) return '—'
  return item.location || (item.category.toLowerCase().includes('beverage') ? 'Bar store' : 'Kitchen store')
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="eyebrow">Restaurant &amp; Bar <span class="px-1 text-[#c3bcc9]">/</span> Menu setup</p><h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Menu</h1><p class="mt-1 text-[11px] text-[#817987]">Manage prices, kitchen routing, and stock deduction for each item.</p></div>
      <button class="arrival-action-primary" @click="openEditor()"><Plus :size="13" /> Add menu item</button>
    </header>
    <p v-if="notice" class="rounded-md border border-[#cfe5d8] bg-[#f0f8f3] px-3 py-2 text-[10px] text-[#44805b]">{{ notice }}</p>
    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap items-center gap-2 border-b border-[#eeeaf0] p-3">
        <label class="client-search min-w-[190px] flex-1"><Search :size="13" /><span class="sr-only">Search menu</span><input v-model="search" placeholder="Search menu" /></label>
        <select v-model="filterCategory" class="report-select"><option v-for="item in categories" :key="item">{{ item }}</option></select>
        <div class="ml-auto flex gap-1 rounded-md bg-[#f5f2f7] p-1"><button v-for="option in (['Cards', 'Table'] as const)" :key="option" class="rounded px-3 py-1.5 text-[9px]" :class="layout === option ? 'bg-white font-semibold text-[#5d3f7c] shadow-sm' : 'text-[#817987]'" @click="layout = option">{{ option }}</button></div>
      </div>
      <div v-if="layout === 'Cards'" class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button v-for="item in filteredMenu" :key="item.id" class="rounded-md border border-[#ece7ef] p-3 text-left transition hover:border-[#cbb9db] hover:bg-[#fcf9fe]" @click="openEditor(item)"><span class="flex items-start justify-between gap-2"><strong class="text-[10px] font-semibold text-[#453b4e]">{{ item.name }}</strong><span class="size-1.5 shrink-0 rounded-full" :class="item.available ? 'bg-[#57ae79]' : 'bg-[#b8afb9]'"></span></span><span class="mt-2 flex justify-between gap-2 text-[8px] text-[#817987]"><strong class="text-[11px] text-[#30243e]">{{ money(item.price) }}</strong><span>{{ item.unit || 'Portion' }} · {{ item.prepMinutes ?? 15 }}m</span></span></button>
        <div v-if="filteredMenu.length === 0" class="col-span-full py-12 text-center text-[10px] text-[#8b8490]">No menu items match this search.</div>
      </div>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[750px] border-collapse text-left"><thead class="bg-[#faf9fb] text-[8px] uppercase tracking-[0.08em] text-[#817987]"><tr><th class="px-4 py-3 font-medium">Menu item</th><th class="px-4 py-3 font-medium">Category</th><th class="px-4 py-3 font-medium">Station</th><th class="px-4 py-3 font-medium">Stock item</th><th class="px-4 py-3 text-right font-medium">Price</th><th class="px-4 py-3 font-medium">Status</th></tr></thead><tbody><tr v-for="item in filteredMenu" :key="item.id" class="cursor-pointer border-t border-[#f0edf1] text-[10px] text-[#514958] hover:bg-[#fcf9fe]" @click="openEditor(item)"><td class="px-4 py-3 font-medium text-[#38313f]">{{ item.name }}</td><td class="px-4 py-3">{{ item.category }}</td><td class="px-4 py-3">{{ item.station }}</td><td class="px-4 py-3">{{ restaurantInventory.find((stock) => stock.id === item.inventoryItemId)?.name || 'No auto deduct' }}</td><td class="px-4 py-3 text-right">{{ money(item.price) }}</td><td class="px-4 py-3">{{ item.available ? 'Available' : 'Unavailable' }}</td></tr><tr v-if="filteredMenu.length === 0"><td colspan="6" class="px-4 py-10 text-center text-[10px] text-[#8b8490]">No menu items match this search.</td></tr></tbody></table></div>
      <footer class="border-t border-[#eeeaf0] px-4 py-3 text-[9px] text-[#8b8490]">Items linked to a stock item reserve inventory when sent to the kitchen and deduct it when the ticket is completed.</footer>
    </section>

    <div v-if="editorOpen" class="modal-backdrop" @click.self="editorOpen = false"><section class="modal-card max-h-[90vh] max-w-[540px] overflow-y-auto text-left" role="dialog" aria-modal="true" :aria-labelledby="selectedItem ? 'menu-item-title' : 'new-menu-title'">
      <header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Menu item <span v-if="selectedItem">· {{ selectedItem.available ? 'Available' : 'Unavailable' }}</span></p><h2 :id="selectedItem ? 'menu-item-title' : 'new-menu-title'" class="mt-1 font-serif text-[22px] text-[#30243e]">{{ selectedItem?.name || 'Add menu item' }}</h2></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close menu item" @click="editorOpen = false"><X :size="16" /></button></header>
      <div v-if="selectedItem" class="mt-4 rounded-md bg-[#f7f9fb] p-3"><p class="text-[8px] uppercase tracking-[0.08em] text-[#817987]">Selling price</p><strong class="mt-1 block text-[20px] text-[#30243e]">{{ money(selectedItem.price) }}</strong><p class="mt-0.5 text-[8px] text-[#8b8490]">Tax included <span class="float-right">{{ selectedItem.category }} · {{ selectedItem.station }} · {{ selectedItem.unit || 'Portion' }}</span></p></div>
      <div v-if="selectedItem" class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><div class="rounded-md border border-[#ece7ef] p-2"><small class="block text-[8px] text-[#817987]">Cost</small><strong class="text-[10px]">{{ selectedItem.cost === undefined ? 'Not set' : money(selectedItem.cost) }}</strong></div><div class="rounded-md border border-[#ece7ef] p-2"><small class="block text-[8px] text-[#817987]">Margin</small><strong class="text-[10px]">{{ marginPercent === null ? '—' : `${marginPercent}%` }}</strong></div><div class="rounded-md border border-[#ece7ef] p-2"><small class="block text-[8px] text-[#817987]">Prep</small><strong class="text-[10px]">{{ selectedItem.prepMinutes ?? 15 }} min</strong></div><div class="rounded-md border border-[#ece7ef] p-2"><small class="block text-[8px] text-[#817987]">Orders</small><strong class="text-[10px]">{{ selectedOrders }}</strong></div></div>
      <p v-if="selectedItem" class="mt-3 text-[8px] text-[#8b8490]">{{ selectedItem.id }} · {{ selectedItem.station }}</p>
      <div class="mt-4 grid grid-cols-2 gap-3"><label class="form-label col-span-2">Menu item name<input v-model="editor.name" class="form-input mt-1" placeholder="e.g. Jollof Rice & Chicken" /></label><label class="form-label">Selling price (₱)<input v-model="editor.price" class="form-input mt-1" type="number" min="0.01" step="0.01" /></label><label class="form-label">Cost (₱)<input v-model="editor.cost" class="form-input mt-1" type="number" min="0" step="0.01" /></label><label class="form-label">Category<select v-model="editor.category" class="form-input mt-1"><option>Food</option><option>Beverage</option><option>Dessert</option><option>Snack</option></select></label><label class="form-label">Kitchen station<select v-model="editor.station" class="form-input mt-1"><option>Kitchen</option><option>Bar</option></select></label><label class="form-label">Prep time (minutes)<input v-model="editor.prepMinutes" class="form-input mt-1" type="number" min="0" step="1" /></label><label class="form-label">Stock item<select v-model="editor.inventoryItemId" class="form-input mt-1"><option value="">None — no auto deduct</option><option v-for="stock in restaurantInventory" :key="stock.id" :value="stock.id">{{ stock.name }} · {{ stock.onHand }} {{ stock.unit.toLowerCase() }}</option></select></label><div class="col-span-2 rounded-md border border-[#ece7ef] bg-[#faf8fb] px-3 py-2 text-[9px] text-[#72687a]"><span class="text-[#817987]">Issue from location</span><strong class="float-right text-[#453b4e]">{{ locationName(editorStock) }}</strong></div></div>
      <p v-if="editorStock" class="mt-2 flex items-center gap-1.5 text-[8px] text-[#527d5d]"><Check :size="12" /> On a completed POS ticket, each sold {{ editorStock.unit.toLowerCase() }} will be deducted from {{ editorStock.name }}.</p>
      <footer class="mt-5 flex flex-wrap justify-between gap-2 border-t border-[#eeeaf0] pt-3"><div v-if="selectedItem" class="flex gap-2"><button class="secondary-button" @click="toggleAvailability">{{ selectedItem.available ? 'Mark unavailable' : 'Mark available' }}</button><button class="secondary-button text-[#a25454]" @click="selectedItem.available = false; editorOpen = false">Deactivate</button></div><span v-else></span><div class="flex gap-2"><button class="secondary-button" @click="editorOpen = false">Close</button><button class="arrival-action-primary" @click="saveMenuItem"><Check :size="13" /> {{ selectedItem ? 'Save changes' : 'Add menu item' }}</button></div></footer>
    </section></div>
  </section>
</template>
