<template>
  <section id="amenities" class="py-24 bg-cream-50">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="section-subtitle">Property Details</p>
        <h2 class="section-title mb-4">Hotel Amenities</h2>
        <div class="gold-divider mx-auto"></div>
        <p class="text-bronze-400 max-w-xl mx-auto leading-relaxed">
          Built in 2017, My Dream Place Hotel is a 2-floor low-rise boutique property featuring 18 cozy rooms with all the conveniences of home.
        </p>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-walnut-700 text-center p-6 rounded-md shadow-warm group hover:bg-walnut-600 transition-colors duration-300"
        >
          <div class="text-4xl mb-2">{{ stat.icon }}</div>
          <div class="font-serif text-gold-400 text-3xl font-bold mb-1">{{ stat.value }}</div>
          <div class="text-cream-200/70 text-xs tracking-wide uppercase">{{ stat.label }}</div>
        </div>
      </div>

      <!-- Amenities Grid -->
      <div class="grid md:grid-cols-2 gap-8 items-start">
        <!-- Left: Image -->
        <div class="space-y-4">
          <div class="img-zoom-wrap rounded-md overflow-hidden shadow-warm-lg">
            <img
              src="https://cf.bstatic.com/xdata/images/hotel/max1280x900/223594075.jpg?k=05010df718bca5112f2a124c5f20ba8d0d2d81abfc64ce6112d925d4a98d9c0c&o=&hp=1"
              alt="Garden area with white chair and green plant at My Dream Place Hotel Butuan"
              class="w-full h-64 object-cover"
              loading="lazy"
            />
          </div>
          <div class="img-zoom-wrap rounded-md overflow-hidden shadow-warm">
            <img
              src="https://cf.bstatic.com/xdata/images/hotel/max1024x768/223594069.jpg?k=32c954f24d0da320362600580ed1128d6a9dff9eae0e05093a520715c36ab44b&o=&hp=1"
              alt="Hallway corridor at My Dream Place Hotel Butuan Philippines"
              class="w-full h-44 object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <!-- Right: Amenity List -->
        <div>
          <span class="inline-flex items-center gap-2 text-gold-500 text-xs font-semibold tracking-widest uppercase mb-6">
            <span class="w-6 h-px bg-gold-400 inline-block"></span>
            What We Offer
          </span>
          <div class="grid grid-cols-1 gap-3">
            <div
              v-for="amenity in amenities"
              :key="amenity.label"
              class="flex items-start gap-4 p-4 bg-cream-100 rounded-md hover:bg-cream-200 transition-colors duration-200 group"
            >
              <span class="text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">{{ amenity.icon }}</span>
              <div>
                <p class="text-walnut-700 font-semibold text-sm">{{ amenity.label }}</p>
                <p class="text-bronze-400 text-xs mt-0.5 leading-relaxed">{{ amenity.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const stats = [
  { icon: '🏨', value: '18', label: 'Rooms' },
  { icon: '🏢', value: '2', label: 'Floors' },
  { icon: '⭐', value: '3', label: 'Star Rating' },
  { icon: '📅', value: '2017', label: 'Est. Year' },
]

const amenities = [
  {
    icon: '📶',
    label: 'Free Wi-Fi',
    description: 'Stable internet access throughout public areas and most rooms.',
  },
  {
    icon: '🚗',
    label: 'Free Private Parking',
    description: 'Secure on-site parking for guests. Wheelchair-accessible spaces available at no charge.',
  },
  {
    icon: '🕐',
    label: '24-Hour Front Desk',
    description: 'Our friendly staff are always available for check-in, inquiries, and assistance.',
  },
  {
    icon: '🏧',
    label: 'On-Site ATM / Banking',
    description: 'Convenient ATM access available on the property premises.',
  },
  {
    icon: '👜',
    label: 'Luggage Storage',
    description: 'Safe luggage storage facility available for arriving and departing guests.',
  },
  {
    icon: '👔',
    label: 'Laundry & Dry Cleaning',
    description: 'On-request laundry and dry cleaning services via the front desk.',
  },
  {
    icon: '🌿',
    label: 'Outdoor Garden Area',
    description: 'A small, tranquil garden space to relax and unwind during your stay.',
  },
  {
    icon: '🛎',
    label: 'Concierge Assistance',
    description: 'Recommendations for local attractions, dining, and transport coordination.',
  },
]
</script>
