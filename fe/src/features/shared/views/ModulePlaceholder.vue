<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Construction } from '@lucide/vue'

const route = useRoute()
const moduleNames: Record<string, string> = {
  reservations: 'Reservation',
  desk: 'Desk',
  'room-transfers': 'Room transfer',
  charges: 'Service charges',
  invoices: 'Invoices & payments',
  cashiering: 'Cashiering',
  clients: 'Clients',
  reports: 'Reports & analysis',
  'night-audit': 'Night audit',
}
const restaurantModuleNames: Record<string, string> = {
  transactions: 'Restaurant transactions', service: 'Restaurant service', menu: 'Restaurant menu',
  cashiering: 'Restaurant cashiering', clients: 'Restaurant clients', supplies: 'Restaurant supplies',
  reports: 'Restaurant reports & analysis', tables: 'Restaurant tables', reservations: 'Restaurant reservations', stock: 'Restaurant stock intake',
}
const housekeepingModuleNames: Record<string, string> = {
  floor: 'Housekeeping · Floor',
  work: 'Housekeeping · Work',
  supplies: 'Housekeeping · Supplies',
  staff: 'Housekeeping · Staff',
  reports: 'Housekeeping · Reports',
}
const eventModuleNames: Record<string, string> = {
  venues: 'Venue Management',
  'guest-rates': 'Guest Rates',
  reports: 'Events Reports & Analysis',
  clients: 'Events Clients',
  staff: 'Staff Management',
}
const moduleName = computed(() => {
  const lastSegment = route.path.split('/').filter(Boolean).at(-1) || ''
  if (route.path.startsWith('/restaurant/')) return restaurantModuleNames[lastSegment] || pageTitle(lastSegment)
  if (route.path.startsWith('/housekeeping/')) return housekeepingModuleNames[lastSegment] || pageTitle(lastSegment)
  if (route.path.startsWith('/events/')) return eventModuleNames[lastSegment] || pageTitle(lastSegment)
  return moduleNames[lastSegment] || pageTitle(lastSegment)
})
const moduleSection = computed(() => route.path.startsWith('/housekeeping/')
  ? 'Housekeeping & Maintenance'
  : route.path.startsWith('/restaurant/')
    ? 'Restaurant & Bar'
    : route.path.startsWith('/events/')
      ? 'Events & Conferences'
      : 'Front office operation')
function pageTitle(value: string) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Workspace'
}
</script>

<template>
  <section class="mx-auto flex min-h-[58vh] max-w-[520px] flex-col items-center justify-center px-5 text-center">
    <div class="flex size-12 items-center justify-center rounded-full border border-[#e5e9e2] bg-white text-[#75877a]"><Construction :size="20" :stroke-width="1.6" /></div>
    <p class="eyebrow mt-5">CTHM Hotel · {{ moduleSection }}</p>
    <h1 class="mt-2 font-serif text-[30px] tracking-[-0.03em] text-[#26353d]">{{ moduleName }}</h1>
    <p class="mt-2 max-w-[340px] text-[12px] leading-5 text-[#78858a]">This workspace is being prepared. Room operations are ready to explore in the Rooms module.</p>
    <RouterLink to="/rooms" class="mt-6 inline-flex items-center gap-2 rounded-md border border-[#e2e5df] bg-white px-3 py-2 text-[11px] font-medium text-[#69489a] hover:bg-[#f7f8f5]"><ArrowLeft :size="14" /> Return to rooms</RouterLink>
  </section>
</template>
