<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from '@lucide/vue'
import { restaurantInventory, restaurantStockMovements } from '@/features/restaurant/stores/restaurant'

const search = ref('')
const selectedCategory = ref('All items')
const categories = computed(() => ['All items', ...new Set(restaurantInventory.value.map((item) => item.category))])
const filteredItems = computed(() => restaurantInventory.value.filter((item) => {
  const query = search.value.trim().toLowerCase()
  return (selectedCategory.value === 'All items' || item.category === selectedCategory.value)
    && (!query || [item.id, item.name, item.category].some((value) => value.toLowerCase().includes(query)))
}))
function stockLevel(item: typeof restaurantInventory.value[number]) {
  if (item.onHand <= item.min) return 'Critical'
  if (item.onHand <= item.reorderPoint) return 'Low'
  return 'OK'
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <p class="eyebrow">Restaurant &amp; Bar <span class="px-1 text-[#c3bcc9]">/</span> Supplies</p>
      <h1 class="mt-1 font-serif text-[29px] font-medium tracking-[-0.035em] text-[#30243e]">Inventory</h1>
      <p class="mt-1 text-[11px] text-[#817987]">On-hand quantities update when POS orders are paid.</p>
    </header>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf0] p-3">
        <label class="client-search min-w-[220px] flex-1"><Search :size="13" /><span class="sr-only">Search inventory</span><input v-model="search" placeholder="Search code or item name" /></label>
        <select v-model="selectedCategory" class="report-select"><option v-for="category in categories" :key="category">{{ category }}</option></select>
        <span class="text-[9px] text-[#8b8490]">Catalog {{ restaurantInventory.length }} · Showing {{ filteredItems.length }}</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead class="bg-[#faf9fb] text-[8px] uppercase tracking-[0.08em] text-[#817987]"><tr><th class="px-4 py-3 font-medium">Code</th><th class="px-4 py-3 font-medium">Item</th><th class="px-4 py-3 font-medium">Category</th><th class="px-4 py-3 text-right font-medium">On hand</th><th class="px-4 py-3 text-right font-medium">Reorder</th><th class="px-4 py-3 text-right font-medium">Min</th><th class="px-4 py-3 text-right font-medium">Max</th><th class="px-4 py-3 font-medium">Unit</th><th class="px-4 py-3 font-medium">Level</th><th class="px-4 py-3 font-medium">Status</th></tr></thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id" class="border-t border-[#f0edf1] text-[10px] text-[#514958]">
              <td class="px-4 py-3 text-[#827987]">{{ item.id }}</td><td class="px-4 py-3 font-medium text-[#38313f]">{{ item.name }}</td><td class="px-4 py-3"><span class="rounded-full bg-[#f3f1f5] px-2 py-1 text-[8px] text-[#746b7b]">{{ item.category }}</span></td><td class="px-4 py-3 text-right font-semibold" :class="stockLevel(item) === 'Critical' ? 'text-[#b34453]' : stockLevel(item) === 'Low' ? 'text-[#a25454]' : 'text-[#38313f]'">{{ item.onHand }}</td><td class="px-4 py-3 text-right">{{ item.reorderPoint }}</td><td class="px-4 py-3 text-right">{{ item.min }}</td><td class="px-4 py-3 text-right">{{ item.max }}</td><td class="px-4 py-3">{{ item.unit }}</td><td class="px-4 py-3"><span class="rounded-full px-2 py-1 text-[8px]" :class="stockLevel(item) === 'OK' ? 'bg-[#e8f5ed] text-[#44805b]' : stockLevel(item) === 'Low' ? 'bg-[#fff2d4] text-[#926b22]' : 'bg-[#fbe8e9] text-[#a2444e]'">{{ stockLevel(item) }}</span></td><td class="px-4 py-3"><span class="rounded-full bg-[#e8f5ed] px-2 py-1 text-[8px] text-[#44805b]">{{ item.active ? 'Active' : 'Inactive' }}</span></td>
            </tr>
            <tr v-if="filteredItems.length === 0"><td colspan="10" class="px-4 py-10 text-center text-[10px] text-[#8b8490]">No inventory items found.</td></tr>
          </tbody>
        </table>
      </div>
      <footer class="border-t border-[#eeeaf0] px-4 py-3 text-[9px] text-[#8b8490]">Stock is deducted when a POS ticket is completed, including tickets billed to a guest room. Open orders reserve available quantity.</footer>
    </section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="border-b border-[#eeeaf0] px-4 py-3"><h2 class="text-[12px] font-semibold text-[#493d50]">Stock used on POS tickets</h2><p class="mt-0.5 text-[9px] text-[#8b8490]">Each completed order records the items and quantities consumed.</p></div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[650px] border-collapse text-left">
          <thead class="bg-[#faf9fb] text-[8px] uppercase tracking-[0.08em] text-[#817987]"><tr><th class="px-4 py-3 font-medium">Time</th><th class="px-4 py-3 font-medium">Stock item</th><th class="px-4 py-3 text-right font-medium">Used</th><th class="px-4 py-3 font-medium">Ticket</th></tr></thead>
          <tbody>
            <tr v-for="movement in restaurantStockMovements" :key="movement.id" class="border-t border-[#f0edf1] text-[10px] text-[#514958]"><td class="px-4 py-3 text-[#827987]">{{ new Date(movement.usedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) }}</td><td class="px-4 py-3 font-medium text-[#38313f]">{{ movement.itemName }}</td><td class="px-4 py-3 text-right">{{ movement.quantity }} {{ movement.unit.toLowerCase() }}{{ movement.quantity === 1 ? '' : 's' }}</td><td class="px-4 py-3 text-[#65428e]">{{ movement.reference }}</td></tr>
            <tr v-if="restaurantStockMovements.length === 0"><td colspan="4" class="px-4 py-8 text-center text-[10px] text-[#8b8490]">No POS stock usage recorded yet.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
