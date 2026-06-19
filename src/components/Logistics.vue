<template>
  <section id="location" class="py-24 bg-walnut-700 relative overflow-hidden">
    <!-- Pattern decoration -->
    <div class="absolute bottom-0 left-0 w-64 h-64 bg-gold-400/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

    <div class="max-w-7xl mx-auto px-6 relative z-10">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="text-gold-400 text-xs font-semibold tracking-widest uppercase mb-3">Getting Here</p>
        <h2 class="font-serif text-cream-50 text-3xl md:text-4xl font-bold mb-4">Location & Transport</h2>
        <div class="w-16 h-0.5 bg-gold-400 mb-6 mx-auto"></div>
      </div>

      <div class="grid md:grid-cols-2 gap-12 items-start">
        <!-- Left: Map + Address -->
        <div class="space-y-6">
          <!-- Map iframe -->
          <div class="rounded-md overflow-hidden shadow-warm-lg border border-gold-400/20">
            <iframe
              title="My Dream Place Hotel location map"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.7543789!2d125.5429!3d8.9490!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x32ff9226d03aa111%3A0x1ba7e71cf9dc3a81!2sMy%20Dream%20Place%20Hotel%20-%20Near%20Robinsons%20Mall!5e0!3m2!1sen!2sph!4v1620000000000"
              width="100%"
              height="300"
              style="border:0;"
              allowfullscreen=""
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <!-- Address Card -->
          <div class="bg-walnut-800/50 border border-gold-400/20 rounded-md p-6">
            <div class="flex items-start gap-4">
              <span class="text-gold-400 text-2xl">📍</span>
              <div>
                <h3 class="font-serif text-cream-50 font-semibold mb-1">Our Address</h3>
                <p class="text-cream-200/70 text-sm leading-relaxed">
                  JC Aquino corner 1st Street,<br/>
                  Pareja Subdivision, Barangay Doongan,<br/>
                  Butuan City, Agusan del Norte 8600,<br/>
                  Philippines
                </p>
                <a
                  href="tel:+639173233373"
                  class="inline-flex items-center gap-2 text-gold-400 text-sm font-medium mt-3 hover:text-gold-300 transition-colors"
                >
                  📞 +63 917 323 3373
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Transport Info -->
        <div class="space-y-5">
          <div
            v-for="item in logistics"
            :key="item.title"
            class="bg-walnut-800/40 border border-gold-400/15 rounded-md p-5 hover:border-gold-400/30 transition-colors duration-200"
          >
            <div class="flex items-start gap-4">
              <span class="text-2xl flex-shrink-0">{{ item.icon }}</span>
              <div>
                <h3 class="font-serif text-cream-50 font-semibold mb-1">{{ item.title }}</h3>
                <p class="text-cream-200/60 text-sm leading-relaxed">{{ item.description }}</p>
                <span
                  v-if="item.tag"
                  class="inline-block mt-2 bg-gold-400/20 text-gold-300 text-xs font-semibold px-3 py-1 rounded-sm"
                >
                  {{ item.tag }}
                </span>
              </div>
            </div>
          </div>

          <!-- Parking Image -->
          <div class="img-zoom-wrap rounded-md overflow-hidden shadow-warm">
            <img
              src="https://cf.bstatic.com/xdata/images/hotel/max1280x900/164155963.jpg?k=20197864687897901da7edb65f475d4cc8446f6691f136eb8e425781b3fc53d3&o=&hp=1"
              alt="Free parking area with car and palm trees at My Dream Place Hotel Butuan"
              class="w-full h-44 object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const logistics = [
  {
    icon: '🏬',
    title: 'Near Robinsons Place Butuan',
    description: 'Just a 2-minute drive or short walk to Robinsons Place Butuan, the city\'s premier shopping destination.',
    tag: '~2 min away',
  },
  {
    icon: '✈️',
    title: 'Bancasi Airport (Butuan Airport)',
    description: 'Located approximately 4.3 to 5.1 km from the hotel — roughly a 10-minute drive.',
    tag: '~10 min drive',
  },
  {
    icon: '🚐',
    title: 'Airport Shuttle Service',
    description: 'Round-trip airport transfers available on request. Please coordinate with the front desk at least 48 hours before arrival.',
    tag: '₱350/person',
  },
  {
    icon: '🚗',
    title: 'Free Private Parking',
    description: 'Large, secure on-site parking lot. Self-parking and wheelchair-accessible spaces are completely free for all checked-in guests.',
    tag: 'Complimentary',
  },
  {
    icon: '🚙',
    title: 'Car Rental Available',
    description: 'On-site vehicle hire can be arranged through our front desk for exploring Butuan City and nearby attractions.',
  },
]
</script>
