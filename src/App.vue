<template>
  <div>
    <Navbar @openBooking="bookingOpen = true" />
    <main>
      <Hero @openBooking="bookingOpen = true" />
      <Rooms @openBooking="bookingOpen = true" />
      <Dining />
      <Amenities />
      <Logistics />
      <Policies />
    </main>
    <Footer />
    <BookingModal :show="bookingOpen" @close="bookingOpen = false" />

    <!-- Floating Book Now Button (mobile) -->
    <div class="fixed bottom-6 right-6 z-40 md:hidden">
      <button
        id="floating-book-btn"
        @click="bookingOpen = true"
        class="btn-primary shadow-warm-lg rounded-md px-5 py-3 text-sm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        Book Now
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import Rooms from './components/Rooms.vue'
import Dining from './components/Dining.vue'
import Amenities from './components/Amenities.vue'
import Logistics from './components/Logistics.vue'
import Policies from './components/Policies.vue'
import Footer from './components/Footer.vue'
import BookingModal from './components/BookingModal.vue'

const bookingOpen = ref(false)
</script>
