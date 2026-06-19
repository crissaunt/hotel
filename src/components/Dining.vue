<template>
  <section id="dining" class="py-24 bg-walnut-800 relative overflow-hidden">
    <!-- Decorative element -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-gold-400/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-6 relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="text-gold-400 text-xs font-semibold tracking-widest uppercase mb-3">Food & Beverage</p>
        <h2 class="font-serif text-cream-50 text-3xl md:text-4xl font-bold mb-4">My Dream Cafe</h2>
        <div class="w-16 h-0.5 bg-gold-400 mb-6 mx-auto"></div>
        <p class="text-cream-200/70 max-w-xl mx-auto leading-relaxed">
          Start your day right with a complimentary à la carte breakfast, and enjoy Filipino and Asian cuisine throughout your stay at our charming on-site cafe.
        </p>
      </div>

      <!-- Main Dining Feature -->
      <div class="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div class="img-zoom-wrap rounded-md overflow-hidden shadow-warm-lg">
          <img
            src="https://cf.bstatic.com/xdata/images/hotel/max1280x900/164155974.jpg?k=821820f167eb22417a936c63169e63a4d4c4a9cc7be6ee7cd7a322470c8cfd56&o=&hp=1"
            alt="Dream Place wooden sign at My Dream Place Hotel cafe area Butuan"
            class="w-full h-80 object-cover"
            loading="lazy"
          />
        </div>
        <div>
          <span class="inline-flex items-center gap-2 text-gold-400 text-xs font-semibold tracking-widest uppercase mb-4">
            <span class="w-6 h-px bg-gold-400 inline-block"></span>
            On-Site Dining
          </span>
          <h3 class="font-serif text-cream-50 text-2xl font-bold mb-4">Filipino & Asian Specialties</h3>
          <p class="text-cream-200/70 leading-relaxed mb-6">
            My Dream Cafe is a casual yet charming coffee shop and restaurant serving an enticing selection of local Filipino dishes and broader Asian specialties. Warm, cozy ambiance with wooden accents.
          </p>

          <!-- Breakfast Info Card -->
          <div class="bg-walnut-700 border border-gold-400/20 rounded-md p-5 mb-6">
            <div class="flex items-start gap-4">
              <span class="text-3xl">🍳</span>
              <div>
                <h4 class="font-serif text-cream-50 font-semibold mb-1">Complimentary Breakfast</h4>
                <p class="text-cream-200/60 text-sm leading-relaxed">
                  A free à la carte Asian or Filipino breakfast is typically included with your stay, served fresh from <strong class="text-gold-400">6:30 AM to 10:00 AM</strong> every morning.
                </p>
              </div>
            </div>
          </div>

          <!-- Cafe Highlights -->
          <ul class="space-y-2">
            <li v-for="item in cafeFeatures" :key="item" class="flex items-center gap-3 text-cream-200/80 text-sm">
              <span class="text-gold-400">✦</span>
              {{ item }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Wellness Note -->
      <div class="bg-walnut-700/60 border border-gold-400/15 rounded-md p-8 text-center">
        <span class="text-4xl mb-4 block">💆</span>
        <h3 class="font-serif text-cream-50 text-xl font-semibold mb-2">Wellness & Leisure</h3>
        <p class="text-cream-200/60 max-w-md mx-auto text-sm leading-relaxed">
          Unwind in our small outdoor garden area or book a restorative massage treatment on request at the front desk. Your peace of mind is our priority.
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
const cafeFeatures = [
  'Local Filipino cuisine & Asian specialties',
  'Complimentary à la carte breakfast daily',
  'Breakfast served 6:30 AM – 10:00 AM',
  'Casual and cozy dine-in atmosphere',
  'Vintage wood-grain decor ambiance',
]
</script>
