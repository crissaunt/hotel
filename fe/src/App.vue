<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  BedDouble,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  ConciergeBell,
  DoorOpen,
  FileText,
  Grid2X2,
  MoonStar,
  Shield,
  UsersRound,
  Utensils,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const navigation = [
  {
    label: 'Front Office Operations',
    items: [
      { label: 'Rooms', icon: BedDouble, to: '/rooms' },
      { label: 'Reservations', icon: CalendarDays, to: '/reservations' },
      { label: 'Calendar', icon: CalendarDays, to: '/calendar' },
      { label: 'Desk', icon: ClipboardList, to: '/desk' },
      { label: 'Room transfer', icon: DoorOpen, to: '/room-transfers' },
      { label: 'Service charges', icon: ConciergeBell, to: '/charges' },
      { label: 'Invoices & payments', icon: FileText, to: '/invoices' },
      { label: 'Cashiering', icon: CircleDollarSign, to: '/cashiering' },
      { label: 'Clients', icon: UsersRound, to: '/clients' },
      { label: 'Reports & analysis', icon: ChartNoAxesCombined, to: '/reports' },
      { label: 'Night audit', icon: MoonStar, to: '/night-audit' },
    ],
  },
  {
    label: 'Restaurant & Bar',
    items: [
      { label: 'POS Terminal', icon: CircleDollarSign, to: '/restaurant/pos' },
      { label: 'Transactions', icon: FileText, to: '/restaurant/transactions' },
      { label: 'Service', icon: ConciergeBell, to: '/restaurant/service' },
      { label: 'Menu', icon: FileText, to: '/restaurant/menu' },
      { label: 'Cashiering', icon: CircleDollarSign, to: '/restaurant/cashiering' },
      { label: 'Clients', icon: UsersRound, to: '/restaurant/clients' },
      { label: 'Supplies', icon: BriefcaseBusiness, to: '/restaurant/supplies' },
      { label: 'Reports & analysis', icon: ChartNoAxesCombined, to: '/restaurant/reports' },
      { label: 'Tables', icon: Grid2X2, to: '/restaurant/tables' },
      { label: 'Reservations', icon: CalendarDays, to: '/restaurant/reservations' },
      { label: 'Ready now', icon: Utensils, to: '/restaurant/kitchen' },
      { label: 'Stock intake', icon: BriefcaseBusiness, to: '/restaurant/stock' },
    ],
  },
  {
    label: 'Housekeeping & Maintenance',
    items: [
      { label: 'Floor', icon: BedDouble, to: '/housekeeping/floor' },
      { label: 'Work', icon: ClipboardList, to: '/housekeeping/work' },
      { label: 'Supplies', icon: BriefcaseBusiness, to: '/housekeeping/supplies' },
      { label: 'Staff', icon: UsersRound, to: '/housekeeping/staff' },
      { label: 'Reports', icon: ChartNoAxesCombined, to: '/housekeeping/reports' },
    ],
  },
  {
    label: 'Events & Conferences',
    items: [
      { label: 'Event Management', icon: CalendarDays, to: '/events/management' },
      { label: 'Venue Management', icon: Grid2X2, to: '/events/venues' },
      { label: 'Guest Rates', icon: CircleDollarSign, to: '/events/guest-rates' },
      { label: 'Reports & Analysis', icon: ChartNoAxesCombined, to: '/events/reports' },
      { label: 'Clients', icon: UsersRound, to: '/events/clients' },
      { label: 'Staff Management', icon: BriefcaseBusiness, to: '/events/staff' },
    ],
  },
]

function groupForPath(path: string) {
  return navigation.find((group) => group.items.some((item) => item.to === path))?.label || 'Front Office Operations'
}
const currentGroup = computed(() => groupForPath(route.path))
const activeNavigation = computed(() => navigation.find((group) => group.label === currentGroup.value) || navigation[0]!)
const openDropdown = ref<string | null>(null)
const dropdownLeft = ref(8)
const dropdownGroup = computed(() => navigation.find((group) => group.label === openDropdown.value) || null)
function showDepartmentMenu(label: string, event: Event) {
  const target = event.currentTarget as HTMLElement | null
  const nav = target?.closest('nav')
  if (target && nav) {
    const relativeLeft = target.getBoundingClientRect().left - nav.getBoundingClientRect().left
    const panelWidth = Math.min(340, Math.max(240, window.innerWidth - 16))
    dropdownLeft.value = Math.max(8, Math.min(relativeLeft, nav.clientWidth - panelWidth - 8))
  }
  openDropdown.value = label
}
function goToFirstModule(group: typeof navigation[number]) {
  openDropdown.value = null
  const firstItem = group.items[0]
  if (firstItem) router.push(firstItem.to)
}

const routeBreadcrumb = computed(() => {
  const currentPath = route.path.replace(/\/$/, '') || '/'
  const navEntry = navigation.flatMap((group) => group.items.map((item) => ({ group: group.label, ...item })))
    .find((item) => item.to === currentPath)
  if (navEntry) return { section: navEntry.group, page: navEntry.label }

  const pathRoot = `/${currentPath.split('/')[1] || ''}`
  const section = pathRoot === '/housekeeping' ? 'Housekeeping & Maintenance'
    : pathRoot === '/restaurant' ? 'Restaurant & Bar'
      : pathRoot === '/events' ? 'Events & Conferences'
        : 'Front Office Operations'
  const lastSegment = currentPath.split('/').filter(Boolean).at(-1) || 'Home'
  const page = String(route.meta.title || lastSegment.replaceAll('-', ' '))
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
  return { section, page }
})
const headerDate = computed(() => new Intl.DateTimeFormat('en-SG', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore',
}).format(new Date()))
</script>

<template>
  <RouterView v-if="route.meta.public === true" />
  <RouterView v-else-if="route.meta.adminPortal === true" />
  <div v-else class="operations-shell min-h-screen  text-[#30283a]">
    <header class="relative flex shrink-0 items-center justify-center bg-white border-b py-2 border-[#4a214f]   px-4 text-[#582A5F]">
      <div class="absolute left-5 hidden items-center gap-2 text-white sm:flex"><img src="/cthm_seal.svg" alt="" class="size-6 rounded-md object-contain" /><span class="text-[10px] text-[#582A5F] font-semibold uppercase tracking-[.16em]">CSUCC Hotel</span></div>
      <div class="text-center"><p class="font-serif text-base tracking-[-.02em] text-[#582A5F]">CTHM Hotel Front Office</p></div>
      <div class="absolute right-5 hidden items-center gap-2 text-[10px] text-[#582A5F] md:flex"><CalendarDays :size="13" class="text-[#ffb3cf]" /> {{ headerDate }}</div>
    </header>

    <nav class="relative z-30 shrink-0 border-b bg-white border-[#c7c1c8] ]" aria-label="Department navigation" @mouseleave="openDropdown = null" @keydown.esc="openDropdown = null">
      <div class="flex min-h-[20px] items-stretch justify-start overflow-x-auto px-1.5 sm:px-3">
        <button v-for="group in navigation" :key="group.label" type="button" class="group flex shrink-0 items-center gap-1.5 border-b-2 px-2 py-1.5 text-[9px] font-semibold text-cthm-plum transition-colors  hover:text-[#8b3e69] sm:px-3 sm:text-[10px]" :class="currentGroup === group.label ? 'border-cthm-pink  text-cthm-plum' : 'border-transparent'" :aria-expanded="openDropdown === group.label" :aria-controls="`department-menu-${group.label.toLowerCase().replaceAll(' ', '-')}`" @mouseenter="showDepartmentMenu(group.label, $event)" @focus="showDepartmentMenu(group.label, $event)" @click="goToFirstModule(group)">
          <span class="text-xs">{{ group.label }}</span><ChevronDown :size="6" class="text-[#a49aa9] transition-transform group-hover:rotate-180" />
        </button>
      </div>
      <div v-if="dropdownGroup" :id="`department-menu-${dropdownGroup.label.toLowerCase().replaceAll(' ', '-')}`" class="absolute top-full z-40 w-[min(340px,calc(100vw-16px))] overflow-hidden rounded-sm border border-[#ebe5ee] shadow-[0_14px_34px_rgba(43,34,51,.2)] ring-1 ring-black/5" :style="{ left: `${dropdownLeft}px` }" role="region" :aria-label="`${dropdownGroup.label} items`">
        <div class="border-b bg-white border-[#eee8f0] px-4 py-3"><h2 class="mt-0.5 text-[13px] font-semibold text-[#30283a]">{{ dropdownGroup.label }}</h2></div>
        <div class="flex max-h-[min(70vh,560px)] bg-white flex-col overflow-y-auto p-2">
          <RouterLink v-for="item in dropdownGroup.items" :key="item.label" :to="item.to" class="group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[10px] font-medium text-cthm-plum transition-colors sm:text-[11px]" :class="route.path === item.to ? 'bg-cthm-pink text-white' : 'hover:bg-white hover:text-[#8b3e69]'" @click="openDropdown = null">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-md" :class="route.path === item.to ? 'bg-white/15' : 'bg-white group-hover:bg-white'"><component :is="item.icon" :size="14" :stroke-width="1.8" :class="route.path === item.to ? 'text-white' : 'text-[#8f7597] group-hover:text-[#e45c91]'" /></span><span class="min-w-0 flex-1">{{ item.label }}</span><span v-if="route.path === item.to" class="size-1.5 rounded-full bg-white" />
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="grid min-h-0 flex-1 grid-cols-[124px_minmax(0,1fr)] overflow-hidden sm:grid-cols-[168px_minmax(0,1fr)] lg:grid-cols-[198px_minmax(0,1fr)]">
      <aside class="flex h-full min-h-0 flex-col border-r border-[#4a214f] bg-cthm-plum px-1.5 py-3 text-white sm:px-2 sm:py-4" aria-label="Section navigation">
        <div class="px-1.5 pb-2.5 sm:px-2"><h2 class="mt-1 text-[9px] font-semibold leading-3.5 text-white sm:text-[10px]">{{ currentGroup }}</h2></div>
        <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto" aria-label="Navigation items">
          <RouterLink v-for="item in activeNavigation.items" :key="item.label" :to="item.to" class="group relative flex min-h-[32px] items-center gap-1.5 rounded-sm px-1.5 text-[9px] font-medium leading-3.5 text-white/75 transition-colors sm:min-h-[34px] sm:gap-2 sm:px-2" :class="route.path === item.to ? 'bg-cthm-pink text-white border border-[#ff91b7] before:absolute before:left-0 before:h-4 before:w-0.75 before:rounded-r before:bg-white' : 'hover:bg-white/10 hover:text-white'" :aria-current="route.path === item.to ? 'page' : undefined">
            <component :is="item.icon" :size="12" :stroke-width="1.8" class="shrink-0" :class="route.path === item.to ? 'text-white' : 'text-[#ffc3d7] group-hover:text-white'" /><span class="min-w-0 text-xs">{{ item.label }}</span>
          </RouterLink>
        </nav>
        <RouterLink to="/admin/overview" class="mt-3 flex min-h-[32px] items-center gap-1.5 rounded-md border-t border-white/20 px-1.5 pt-2.5 text-[9px] font-medium text-white/75 transition-colors hover:text-white sm:gap-2 sm:px-2" aria-label="Admin portal"><Shield :size="12" class="shrink-0 text-[#ffc3d7]" /> Admin portal</RouterLink>
      </aside>

      <div class="h-full min-w-0 overflow-y-auto bg-gray-100 p-2 sm:p-3 lg:p-4">
        <div class="mx-auto max-w-full">
          <main class="min-h-[calc(100vh-170px)] rounded-lg border border-[#e7e3e9] bg-white p-2 shadow-[0_1px_3px_rgba(33,28,39,.04)] sm:p-3 lg:p-4">
            <RouterView />
          </main>
        </div>
      </div>
    </div>
  </div>
</template>
