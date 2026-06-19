<template>
  <section id="home" class="relative min-h-screen flex items-end pb-24 overflow-hidden">
    <!-- Background Image with Parallax feel -->
    <div class="absolute inset-0 z-0">
      <img
        :src="heroImage"
        alt="My Dream Place Hotel exterior facade in Butuan City Philippines"
        class="w-full h-full object-cover object-center"
        loading="eager"
      />
      <div class="absolute inset-0 bg-overlay"></div>
      <!-- Warm gradient overlay -->
      <div class="absolute inset-0 bg-gradient-to-r from-walnut-900/60 via-transparent to-transparent"></div>
    </div>

    <!-- Hero Content -->
    <div class="relative z-10 max-w-7xl mx-auto px-6 w-full">
      <div class="max-w-2xl animate-fade-in-up">
        <!-- Tag -->
        <div class="inline-flex items-center gap-2 bg-gold-400/20 border border-gold-400/40 text-gold-300 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-sm mb-6 backdrop-blur-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-gold-400 inline-block"></span>
          3-Star Boutique Hotel · Butuan City, Philippines
        </div>

        <h1 class="font-serif text-cream-50 text-5xl md:text-6xl lg:text-7xl font-bold leading-none text-shadow mb-6">
          My Dream<br />
          <span class="text-gold-300 italic">Place</span> Hotel
        </h1>

        <p class="text-cream-200 text-lg md:text-xl leading-relaxed mb-8 text-shadow-sm max-w-lg">
          A peaceful urban sanctuary just minutes from Robinsons Place Butuan. Where comfort meets affordability in the heart of Agusan del Norte.
        </p>

        <!-- Quick Facts -->
        <div class="flex flex-wrap gap-6 mb-10">
          <div v-for="fact in facts" :key="fact.label" class="flex items-center gap-2 text-cream-200">
            <span class="text-gold-400 text-lg">{{ fact.icon }}</span>
            <span class="text-sm font-medium">{{ fact.label }}</span>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="flex flex-wrap gap-4">
          <button
            id="hero-book-btn"
            @click="$emit('openBooking')"
            class="btn-primary text-base px-8 py-4"
          >
            <span>Reserve a Room</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
            </svg>
          </button>
          <a
            href="tel:+639173233373"
            id="hero-call-btn"
            class="btn-outline text-base px-8 py-4 border-cream-200 text-cream-100 hover:bg-cream-100 hover:text-walnut-700"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
            Call Us
          </a>
        </div>
      </div>
    </div>

    <!-- Scroll indicator -->
    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-cream-200/60">
      <span class="text-xs tracking-widest uppercase">Explore</span>
      <div class="scroll-bounce">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- Floating rating badge -->
    <div class="absolute top-28 right-6 md:right-12 z-10 hidden md:flex flex-col items-center bg-walnut-700/80 backdrop-blur-sm border border-gold-400/30 p-4 rounded-md shadow-warm">
      <div class="text-gold-400 text-3xl font-serif font-bold">★★★</div>
      <div class="text-cream-100 text-xs font-semibold mt-1 tracking-wide">3-Star Hotel</div>
      <div class="text-cream-200/60 text-xs">Est. 2017</div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['openBooking'])

const heroImage = 'https://cf.bstatic.com/xdata/images/hotel/max1280x900/164155938.jpg?k=837a62d71bb5b0e82b0f485c56ce33ede4b21c5c16c0f5ef0b7b8590a0eb7a46&o=&hp=1'

const facts = [
  { icon: '🛌', label: '18 Cozy Rooms' },
  { icon: '🍳', label: 'Free Breakfast' },
  { icon: '🚗', label: 'Free Parking' },
  { icon: '📶', label: 'Free Wi-Fi' },
]
</script>
