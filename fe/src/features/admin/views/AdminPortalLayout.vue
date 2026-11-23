<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ArrowLeft, BedDouble, CalendarDays, ChevronDown, CircleDollarSign, ClipboardList, ConciergeBell, Grid2X2, Menu, Shield, ShieldCheck, Sparkles, UsersRound, X } from '@lucide/vue'

const route = useRoute()
const mobileOpen = ref(false)
const dateLabel = new Intl.DateTimeFormat('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date())
const pageTitle = computed(() => String(route.meta.title || 'Admin portal'))

const navGroups = [
  { label: 'Front office setup', items: [
    { label: 'Rooms', to: '/admin/rooms', icon: BedDouble },
    { label: 'Room types', to: '/admin/room-types', icon: Grid2X2 },
    { label: 'Amenities', to: '/admin/amenities', icon: Sparkles },
    { label: 'Rate types', to: '/admin/rate-types', icon: ClipboardList },
    { label: 'Room rates', to: '/admin/room-rates', icon: CircleDollarSign },
  ] },
  { label: 'Guest operations', items: [
    { label: 'Reservations', to: '/admin/reservations', icon: CalendarDays },
    { label: 'Guest preferences', to: '/admin/preferences', icon: UsersRound },
    { label: 'Service charges', to: '/admin/service-charges', icon: ConciergeBell },
    { label: 'Policies', to: '/admin/policies', icon: Shield },
  ] },
  { label: 'Team', items: [
    { label: 'User roles', to: '/admin/user-roles', icon: ShieldCheck },
  ] },
]
</script>

<template>
  <div class="admin-shell min-h-screen bg-[#f8f8f5] text-[#303b40]">
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-[#182126]/35 lg:hidden" @click="mobileOpen = false" />
    <aside class="admin-sidebar fixed inset-y-0 left-0 z-50 flex w-65 -translate-x-full flex-col text-white transition-transform lg:translate-x-0" :class="mobileOpen ? 'translate-x-0' : ''">
      <RouterLink to="/admin/overview" class="flex h-19 items-center gap-3 border-b border-white/10 px-5">
        <span class="flex size-9 items-center justify-center rounded-md bg-[#d8c5e8] text-[#352644]"><span class="font-serif text-xl">a</span></span>
        <span><span class="block font-serif text-[16px] leading-5">CTHM Hotel</span><span class="mt-1 block text-[9px] uppercase tracking-[.18em] text-white/45">Admin portal</span></span>
        <button class="ml-auto rounded p-1 text-white/60 lg:hidden" aria-label="Close admin menu" @click.prevent="mobileOpen = false"><X :size="17" /></button>
      </RouterLink>

      <nav class="flex-1 overflow-y-auto px-3 py-5" aria-label="Admin navigation">
        <RouterLink to="/admin/overview" class="admin-nav-item mb-5" :class="route.path === '/admin/overview' ? 'admin-nav-active' : ''" @click="mobileOpen = false">
          <Grid2X2 :size="16" /><span>Overview</span>
        </RouterLink>
        <section v-for="group in navGroups" :key="group.label" class="mb-5">
          <h2 class="px-3 pb-2 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">{{ group.label }}</h2>
          <RouterLink v-for="item in group.items" :key="item.to" :to="item.to" class="admin-nav-item" :class="route.path === item.to ? 'admin-nav-active' : ''" @click="mobileOpen = false">
            <component :is="item.icon" :size="15" :stroke-width="1.8" /><span>{{ item.label }}</span>
          </RouterLink>
        </section>
      </nav>

      <div class="border-t border-white/10 p-3">
        <RouterLink to="/rooms" class="flex items-center gap-2 rounded-md px-3 py-2.5 text-[10px] text-white/55 transition hover:bg-white/6 hover:text-white"><ArrowLeft :size="14" /> Return to front desk</RouterLink>
      </div>
    </aside>

    <div class="min-h-screen lg:pl-65">
      <header class="sticky top-0 z-30 flex h-15.5 items-center justify-between border-b border-[#e7e9e4] bg-[#fffdfb]/95 px-4 backdrop-blur sm:px-7">
        <div class="flex min-w-0 items-center gap-3">
          <button class="-ml-2 rounded-md p-2 text-[#58666b] hover:bg-[#f0f1ed] lg:hidden" aria-label="Open admin menu" @click="mobileOpen = true"><Menu :size="18" /></button>
          <div class="flex min-w-0 items-center gap-2 text-[10px] text-[#8c9798]"><span class="hidden sm:inline">Administration</span><ChevronDown :size="12" class="hidden -rotate-90 sm:block" /><span class="truncate font-medium text-[#47565c]">{{ pageTitle }}</span></div>
        </div>
        <div class="flex items-center gap-3 text-[10px] text-[#788488]"><span class="hidden sm:block">{{ dateLabel }}</span><span class="flex size-7 items-center justify-center rounded-full bg-[#eee7f3] text-[9px] font-semibold text-[#654987]">AD</span></div>
      </header>
      <main class="mx-auto w-full max-w-355 px-4 py-6 sm:px-7 sm:py-8 xl:px-10"><RouterView /></main>
    </div>
  </div>
</template>
