<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowUpRight, BedDouble, CalendarDays, CircleDollarSign, Grid2X2, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'
import { adminRecords } from '@/features/admin/adminData'
import { reservations } from '@/features/front-office/stores/reservations'

const readyRooms = computed(() => adminRecords.rooms.filter((room) => room.status === 'Ready').length)
const occupiedRooms = computed(() => adminRecords.rooms.filter((room) => room.status === 'Occupied').length)
const activeReservations = computed(() => reservations.value.filter((reservation) => !['Cancelled', 'No show', 'Checked out'].includes(reservation.status)).length)
const modules = [
  { title: 'Rooms', description: 'Inventory, floors, and readiness', count: () => adminRecords.rooms.length, unit: 'rooms', to: '/admin/rooms', icon: BedDouble },
  { title: 'Room types', description: 'Capacity, bed setup, and category', count: () => adminRecords.roomTypes.length, unit: 'types', to: '/admin/room-types', icon: Grid2X2 },
  { title: 'Amenities', description: 'Room and property features', count: () => adminRecords.amenities.length, unit: 'amenities', to: '/admin/amenities', icon: Sparkles },
  { title: 'Rates & plans', description: 'Rate types and nightly room prices', count: () => adminRecords.roomRates.length, unit: 'rate plans', to: '/admin/room-rates', icon: CircleDollarSign },
  { title: 'Reservations', description: 'Bookings and stay status', count: () => reservations.value.length, unit: 'bookings', to: '/admin/reservations', icon: CalendarDays },
  { title: 'Guest preferences', description: 'Requests to personalize each stay', count: () => adminRecords.preferences.length, unit: 'profiles', to: '/admin/preferences', icon: UsersRound },
]
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p class="eyebrow">CTHM Hotel · Front office administration</p><h1 class="mt-2 font-serif text-[32px] tracking-[-.035em] text-[#293740] sm:text-[38px]">Admin portal</h1><p class="mt-2 max-w-[620px] text-[11px] leading-5 text-[#7b888c]">Configure the rooms, rates, guest records, and team workflows used by the front desk.</p></div>
      <span class="inline-flex items-center gap-2 self-start rounded-full border border-[#e9e4dc] bg-white px-3 py-1.5 text-[9px] font-medium text-[#7f898a] sm:self-auto"><span class="size-1.5 rounded-full bg-[#c6a265]" /> Sample data · frontend preview</span>
    </div>

    <div class="mt-7 grid grid-cols-2 overflow-hidden rounded-md border border-[#e6e9e4] bg-white sm:grid-cols-4">
      <div class="admin-stat"><span class="text-[9px] text-[#8b9695]">Total rooms</span><strong>{{ adminRecords.rooms.length }}</strong><span class="text-[9px] text-[#687c70]">{{ readyRooms }} ready · {{ occupiedRooms }} occupied</span></div>
      <div class="admin-stat"><span class="text-[9px] text-[#8b9695]">Room types</span><strong>{{ adminRecords.roomTypes.length }}</strong><span class="text-[9px] text-[#8b9695]">{{ adminRecords.amenities.length }} amenities</span></div>
      <div class="admin-stat"><span class="text-[9px] text-[#8b9695]">Active bookings</span><strong>{{ activeReservations }}</strong><span class="text-[9px] text-[#8b9695]">Across {{ reservations.length }} records</span></div>
      <div class="admin-stat border-r-0"><span class="text-[9px] text-[#8b9695]">User roles</span><strong>{{ adminRecords.userRoles.length }}</strong><span class="text-[9px] text-[#8b9695]">Access profiles</span></div>
    </div>

    <div class="mt-8 flex items-end justify-between gap-3"><div><p class="eyebrow">Workspace</p><h2 class="mt-1 text-[14px] font-semibold text-[#39484e]">Front office records</h2></div><span class="text-[9px] text-[#9aa3a2]">{{ modules.length }} key areas</span></div>
    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <RouterLink v-for="module in modules" :key="module.title" :to="module.to" class="admin-module-card group">
        <div class="flex items-start justify-between"><span class="flex size-9 items-center justify-center rounded-md bg-[#f3eef7] text-[#73568e]"><component :is="module.icon" :size="16" /></span><ArrowUpRight :size="15" class="text-[#a6afad] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#73568e]" /></div>
        <div class="mt-4 flex items-end justify-between gap-3"><div><h3 class="text-[12px] font-semibold text-[#3c4a50]">{{ module.title }}</h3><p class="mt-1 text-[9px] text-[#929c9d]">{{ module.description }}</p></div><span class="shrink-0 text-[9px] text-[#73817e]">{{ module.count() }} {{ module.unit }}</span></div>
      </RouterLink>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-3">
      <RouterLink to="/admin/reservations" class="admin-callout"><span class="flex size-8 items-center justify-center rounded bg-white text-[#7b6790]"><CalendarDays :size="15" /></span><span class="min-w-0 flex-1"><strong class="block text-[10px] font-semibold text-[#47565b]">Reservation management</strong><span class="mt-1 block text-[9px] text-[#879293]">Review booking details and stay status.</span></span><ArrowUpRight :size="14" class="text-[#9ca6a4]" /></RouterLink>
      <RouterLink to="/admin/service-charges" class="admin-callout"><span class="flex size-8 items-center justify-center rounded bg-white text-[#7b6790]"><CircleDollarSign :size="15" /></span><span class="min-w-0 flex-1"><strong class="block text-[10px] font-semibold text-[#47565b]">Charges & policies</strong><span class="mt-1 block text-[9px] text-[#879293]">Keep front desk service options and guidance current.</span></span><ArrowUpRight :size="14" class="text-[#9ca6a4]" /></RouterLink>
      <RouterLink to="/admin/user-roles" class="admin-callout"><span class="flex size-8 items-center justify-center rounded bg-white text-[#7b6790]"><ShieldCheck :size="15" /></span><span class="min-w-0 flex-1"><strong class="block text-[10px] font-semibold text-[#47565b]">User roles</strong><span class="mt-1 block text-[9px] text-[#879293]">Manage access levels for front office staff.</span></span><ArrowUpRight :size="14" class="text-[#9ca6a4]" /></RouterLink>
    </div>
    <p class="mt-5 text-[9px] leading-4 text-[#a0a8a6]">Changes in this preview are held in memory and reset when the page is refreshed. A database connection will be added later.</p>
  </section>
</template>
