<template>
  <nav
    :class="[
      'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
      scrolled
        ? 'bg-walnut-700 shadow-warm-lg py-3'
        : 'bg-transparent py-5'
    ]"
  >
    <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <!-- Logo -->
      <div class="flex flex-col leading-tight cursor-pointer" @click="scrollTo('home')">
        <span class="font-serif text-gold-400 text-xl font-bold tracking-wide">My Dream</span>
        <span class="font-serif text-cream-100 text-sm font-medium tracking-widest uppercase">Place Hotel</span>
      </div>

      <!-- Desktop Nav -->
      <ul class="hidden md:flex items-center gap-8">
        <li v-for="link in navLinks" :key="link.id">
          <button @click="scrollTo(link.id)" class="nav-link text-sm font-medium">
            {{ link.label }}
          </button>
        </li>
      </ul>

      <!-- CTA Button -->
      <button
        id="nav-book-btn"
        @click="$emit('openBooking')"
        class="hidden md:inline-flex btn-primary text-sm py-2 px-5"
      >
        <span>Book Now</span>
      </button>

      <!-- Mobile Hamburger -->
      <button
        id="mobile-menu-btn"
        @click="mobileOpen = !mobileOpen"
        class="md:hidden text-cream-100 focus:outline-none"
        aria-label="Open menu"
      >
        <svg v-if="!mobileOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Mobile Menu -->
    <transition name="slide-down">
      <div
        v-if="mobileOpen"
        class="md:hidden bg-walnut-700 border-t border-walnut-600 px-6 py-4 flex flex-col gap-4"
      >
        <button
          v-for="link in navLinks"
          :key="link.id"
          @click="scrollTo(link.id); mobileOpen = false"
          class="nav-link text-left py-1 border-b border-walnut-600 pb-3 last:border-0"
        >
          {{ link.label }}
        </button>
        <button
          @click="$emit('openBooking'); mobileOpen = false"
          class="btn-primary w-full justify-center mt-2"
        >
          Book a Room
        </button>
      </div>
    </transition>
  </nav>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineEmits(['openBooking'])

const scrolled = ref(false)
const mobileOpen = ref(false)

const navLinks = [
  { id: 'home', label: 'Home' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'dining', label: 'Dining' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
  { id: 'policies', label: 'Policies' },
]

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

function onScroll() {
  scrolled.value = window.scrollY > 60
}

onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
