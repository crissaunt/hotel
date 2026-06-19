<template>
  <footer class="bg-walnut-900 text-cream-200/70 pt-16 pb-8">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Top Grid -->
      <div class="grid md:grid-cols-4 gap-10 mb-12 pb-12 border-b border-walnut-600">
        <!-- Brand -->
        <div class="md:col-span-2">
          <div class="flex flex-col mb-4">
            <span class="font-serif text-gold-400 text-2xl font-bold tracking-wide">My Dream</span>
            <span class="font-serif text-cream-200 text-sm font-medium tracking-widest uppercase">Place Hotel</span>
          </div>
          <p class="text-sm leading-relaxed mb-6 max-w-xs">
            A peaceful urban sanctuary offering comfortable stays, complimentary breakfast, and warm Filipino hospitality in the heart of Butuan City.
          </p>
          <!-- Contact -->
          <div class="space-y-2 text-sm">
            <a href="tel:+639173233373" class="flex items-center gap-2 hover:text-gold-400 transition-colors">
              📞 +63 917 323 3373
            </a>
            <div class="flex items-start gap-2">
              <span>📍</span>
              <span>JC Aquino corner 1st Street, Pareja Subdivision, Barangay Doongan, Butuan City 8600</span>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div>
          <h3 class="font-serif text-cream-100 font-semibold mb-4 text-sm tracking-widest uppercase">Quick Links</h3>
          <ul class="space-y-2 text-sm">
            <li v-for="link in quickLinks" :key="link.id">
              <button
                @click="scrollTo(link.id)"
                class="hover:text-gold-400 transition-colors text-left"
              >
                {{ link.label }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Hours & Policies -->
        <div>
          <h3 class="font-serif text-cream-100 font-semibold mb-4 text-sm tracking-widest uppercase">Hours</h3>
          <ul class="space-y-2 text-sm">
            <li class="flex justify-between gap-4">
              <span>Check-In</span>
              <span class="text-gold-400 font-medium">2:00 PM</span>
            </li>
            <li class="flex justify-between gap-4">
              <span>Check-Out</span>
              <span class="text-gold-400 font-medium">12:00 PM</span>
            </li>
            <li class="flex justify-between gap-4">
              <span>Breakfast</span>
              <span class="text-gold-400 font-medium">6:30 – 10:00 AM</span>
            </li>
            <li class="flex justify-between gap-4">
              <span>Front Desk</span>
              <span class="text-gold-400 font-medium">24 Hours</span>
            </li>
          </ul>

          <div class="mt-6">
            <h3 class="font-serif text-cream-100 font-semibold mb-3 text-sm tracking-widest uppercase">Nearby</h3>
            <ul class="space-y-1 text-xs">
              <li>🏬 Robinsons Place — 2 min</li>
              <li>🏬 Gaisano Mall — 3 km</li>
              <li>✈️ Bancasi Airport — 10 min</li>
              <li>🏛️ Butuan National Museum — 8 min</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-cream-200/40">
        <span>© {{ currentYear }} My Dream Place Hotel. All rights reserved. · Butuan City, Philippines</span>
        <span>
          Book direct via
          <a href="tel:+639173233373" class="text-gold-500 hover:text-gold-400 transition-colors">+63 917 323 3373</a>
        </span>
      </div>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear()

const quickLinks = [
  { id: 'home', label: 'Home' },
  { id: 'rooms', label: 'Room Types' },
  { id: 'dining', label: 'My Dream Cafe' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location & Transport' },
  { id: 'policies', label: 'Hotel Policies' },
]

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}
</script>
