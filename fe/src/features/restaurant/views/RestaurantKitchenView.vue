<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, Bell, ChefHat, Check, GlassWater, RefreshCw } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { restaurantOrders, type RestaurantOrder, type RestaurantOrderLine } from '@/features/restaurant/stores/restaurant'

const station = ref<'Kitchen' | 'Bar'>('Kitchen')
const venue = ref<'All' | 'Restaurant' | 'Bar'>('All')
const showAll = ref(false)
const now = ref(new Date())
let ticker = 0
onMounted(() => { ticker = window.setInterval(() => { now.value = new Date() }, 15000) })
onUnmounted(() => { if (ticker) window.clearInterval(ticker) })

function visibleLines(order: RestaurantOrder) { return order.lines.filter((line) => station.value === 'Kitchen' ? line.station === 'Kitchen' : line.station === 'Bar') }
function lane(order: RestaurantOrder) {
  const items = visibleLines(order)
  if (!items.length) return 'Done'
  if (items.every((line) => line.status === 'Served')) return 'Done'
  if (items.some((line) => line.status === 'Cooking')) return 'Cooking'
  if (items.some((line) => line.status === 'New')) return 'New'
  return 'Ready'
}
const scopedOrders = computed(() => restaurantOrders.value.filter((order) => (venue.value === 'All' || order.venue === venue.value) && visibleLines(order).length && (showAll.value || lane(order) !== 'Done')).sort((a, b) => a.placedAt.localeCompare(b.placedAt)))
const newOrders = computed(() => scopedOrders.value.filter((order) => lane(order) === 'New'))
const cookingOrders = computed(() => scopedOrders.value.filter((order) => lane(order) === 'Cooking'))
const readyOrders = computed(() => scopedOrders.value.filter((order) => lane(order) === 'Ready'))
const activeCount = computed(() => newOrders.value.length + cookingOrders.value.length + readyOrders.value.length)
function age(order: RestaurantOrder) {
  const minutes = Math.max(0, Math.floor((now.value.getTime() - new Date(order.placedAt).getTime()) / 60000))
  return minutes < 1 ? 'now' : `${minutes}m`
}
function lineAction(line: RestaurantOrderLine) { return line.status === 'New' ? 'Start' : line.status === 'Cooking' ? 'Ready' : line.status === 'Ready' ? 'Served' : 'Done' }
function advanceLine(line: RestaurantOrderLine) {
  if (line.status === 'New') line.status = 'Cooking'
  else if (line.status === 'Cooking') line.status = 'Ready'
  else if (line.status === 'Ready') line.status = 'Served'
}
function statusColor(order: RestaurantOrder) { return lane(order) === 'New' ? 'border-[#f0a11d] bg-[#351905]' : lane(order) === 'Cooking' ? 'border-[#3169ef] bg-[#101e48]' : lane(order) === 'Ready' ? 'border-[#06b981] bg-[#06352c]' : 'border-[#586278] bg-[#1e2636]' }
</script>

<template>
  <main class="min-h-[calc(100vh-32px)] rounded-xl bg-[#070914] p-3 text-[#f5f5f4] sm:p-5">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3"><div class="flex flex-wrap items-center gap-3"><RouterLink to="/restaurant/pos" class="rounded-md border border-white/15 px-3 py-2 text-[10px] text-white/75 hover:bg-white/10"><ArrowLeft :size="12" class="mr-1 inline" /> POS</RouterLink><ChefHat :size="17" class="text-[#c9a8f3]" /><div><h1 class="font-mono text-[14px] font-bold uppercase tracking-[0.22em]">{{ station }} display</h1><p class="mt-0.5 text-[8px] text-white/45">Kitchen &amp; bar order queue · live updates</p></div><time class="font-mono text-[22px] font-bold tracking-[0.09em] text-[#f7c544]">{{ now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</time></div><div class="flex flex-wrap items-center gap-2"><span class="kds-counter kds-counter-new">New {{ newOrders.length }}</span><span class="kds-counter kds-counter-cooking">Cooking {{ cookingOrders.length }}</span><span class="kds-counter kds-counter-ready">Ready {{ readyOrders.length }}</span><span class="kds-counter kds-counter-active">Active {{ activeCount }}</span></div><div class="flex flex-wrap items-center gap-2"><button class="kds-top-button" @click="showAll = !showAll">{{ showAll ? 'Active only' : 'Show all' }}</button><button class="kds-top-button" @click="now = new Date()"><RefreshCw :size="12" /> Sync</button></div></header>
    <div class="flex flex-wrap items-center gap-4 border-b border-white/10 py-3"><div class="flex items-center gap-1"><span class="kds-label">Station</span><button class="kds-toggle" :class="station === 'Kitchen' ? 'kds-toggle-kitchen' : ''" @click="station = 'Kitchen'"><Utensils :size="12" /> Kitchen</button><button class="kds-toggle" :class="station === 'Bar' ? 'kds-toggle-bar' : ''" @click="station = 'Bar'"><GlassWater :size="12" /> Bar</button></div><div class="flex items-center gap-1"><span class="kds-label">Venue</span><button v-for="item in (['All', 'Restaurant', 'Bar'] as const)" :key="item" class="kds-toggle" :class="venue === item ? 'kds-toggle-active' : ''" @click="venue = item">{{ item }}</button></div><div class="ml-auto flex items-center gap-1 text-[8px] text-white/40"><Bell :size="11" class="text-[#f4b040]" /> New orders appear here as soon as they’re sent from POS.</div></div>

    <div class="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <section class="kds-column"><header class="kds-column-header bg-[#f4a11a] text-[#1e1609]"><span>New orders</span><strong>{{ newOrders.length }}</strong></header><article v-for="order in newOrders" :key="order.id" class="kds-order-card" :class="statusColor(order)"><div class="flex items-start justify-between gap-3"><div><p class="font-mono text-[11px] font-bold">{{ order.tableId }} <span class="ml-1 text-[8px] text-white/55">{{ order.id }}</span></p><p class="mt-1 text-[8px] text-white/60">{{ order.venue }} · {{ order.guestName }}<span v-if="order.room"> · Room {{ order.room }}</span></p></div><span class="kds-age">{{ age(order) }}</span></div><div class="my-3 flex items-center justify-between text-[8px] text-white/60"><span>{{ order.orderType }}</span><span>{{ order.waiter }} · {{ new Date(order.placedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) }}</span></div><div v-for="line in visibleLines(order)" :key="line.id" class="kds-line"><div><p class="font-mono text-[11px] font-semibold">{{ line.quantity }}× {{ line.name }}</p><p v-if="line.note" class="mt-1 text-[8px] text-[#f8cd78]">Note: {{ line.note }}</p></div><span class="kds-line-status">{{ line.status }}</span><button class="kds-line-button" :disabled="line.status === 'Served'" @click="advanceLine(line)">{{ lineAction(line) }}</button></div></article><p v-if="newOrders.length === 0" class="kds-empty">No new orders</p></section>

      <section class="kds-column"><header class="kds-column-header bg-[#2864f0] text-white"><span>Cooking</span><strong>{{ cookingOrders.length }}</strong></header><article v-for="order in cookingOrders" :key="order.id" class="kds-order-card" :class="statusColor(order)"><div class="flex items-start justify-between gap-3"><div><p class="font-mono text-[11px] font-bold">{{ order.tableId }} <span class="ml-1 text-[8px] text-white/55">{{ order.id }}</span></p><p class="mt-1 text-[8px] text-white/60">{{ order.venue }} · {{ order.guestName }}<span v-if="order.room"> · Room {{ order.room }}</span></p></div><span class="kds-age">{{ age(order) }}</span></div><div class="my-3 flex items-center justify-between text-[8px] text-white/60"><span>{{ order.orderType }}</span><span>{{ order.waiter }}</span></div><div v-for="line in visibleLines(order)" :key="line.id" class="kds-line"><div><p class="font-mono text-[11px] font-semibold">{{ line.quantity }}× {{ line.name }}</p><p v-if="line.note" class="mt-1 text-[8px] text-[#f8cd78]">Note: {{ line.note }}</p></div><span class="kds-line-status">{{ line.status }}</span><button class="kds-line-button" :disabled="line.status === 'Served'" @click="advanceLine(line)">{{ lineAction(line) }}</button></div></article><p v-if="cookingOrders.length === 0" class="kds-empty">Nothing cooking right now</p></section>

      <section class="kds-column"><header class="kds-column-header bg-[#08b77e] text-[#042419]"><span>Ready to serve</span><strong>{{ readyOrders.length }}</strong></header><article v-for="order in readyOrders" :key="order.id" class="kds-order-card" :class="statusColor(order)"><div class="flex items-start justify-between gap-3"><div><p class="font-mono text-[11px] font-bold">{{ order.tableId }} <span class="ml-1 text-[8px] text-white/55">{{ order.id }}</span></p><p class="mt-1 text-[8px] text-white/60">{{ order.venue }} · {{ order.guestName }}<span v-if="order.room"> · Room {{ order.room }}</span></p></div><span class="kds-age">{{ age(order) }}</span></div><div class="my-3 flex items-center justify-between text-[8px] text-white/60"><span>{{ order.orderType }}</span><span>{{ order.waiter }}</span></div><div v-for="line in visibleLines(order)" :key="line.id" class="kds-line"><div><p class="font-mono text-[11px] font-semibold">{{ line.quantity }}× {{ line.name }}</p><p v-if="line.note" class="mt-1 text-[8px] text-[#f8cd78]">Note: {{ line.note }}</p></div><span class="kds-line-status">{{ line.status }}</span><button class="kds-line-button kds-line-served" :disabled="line.status === 'Served'" @click="advanceLine(line)"><Check :size="11" /> {{ lineAction(line) }}</button></div></article><p v-if="readyOrders.length === 0" class="kds-empty">No orders ready yet</p></section>
    </div>
    <footer class="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-[8px] text-white/40"><span>Restaurant &amp; Bar · Kitchen display</span><span>Orders include guest, table, waiter, and item notes.</span><RouterLink to="/restaurant/pos" class="text-[#c9a8f3] hover:underline">Return to POS terminal</RouterLink></footer>
  </main>
</template>
