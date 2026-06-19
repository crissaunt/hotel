<template>
  <section id="rooms" class="py-24 bg-cream-100">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="section-subtitle">Accommodations</p>
        <h2 class="section-title mb-4">Our Rooms</h2>
        <div class="gold-divider mx-auto"></div>
        <p class="text-bronze-400 max-w-xl mx-auto leading-relaxed">
          All 18 rooms feature tiled flooring, individual air conditioning, flat-screen TVs, and private en-suite bathrooms — designed for restful comfort.
        </p>
      </div>

      <!-- Room Cards -->
      <div class="grid md:grid-cols-3 gap-8 mb-16">
        <div
          v-for="room in rooms"
          :key="room.name"
          class="card group"
        >
          <div class="img-zoom-wrap h-56">
            <img
              :src="room.image"
              :alt="room.imageAlt"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <h3 class="font-serif text-walnut-700 text-xl font-semibold">{{ room.name }}</h3>
              <span class="text-gold-500 text-lg">{{ room.icon }}</span>
            </div>
            <p class="text-bronze-400 text-sm leading-relaxed mb-4">{{ room.description }}</p>
            <ul class="space-y-1.5 mb-6">
              <li
                v-for="feature in room.features"
                :key="feature"
                class="flex items-center gap-2 text-walnut-600 text-sm"
              >
                <span class="text-gold-500 text-xs">✦</span>
                {{ feature }}
              </li>
            </ul>
            <button
              :id="`book-${room.id}`"
              @click="$emit('openBooking')"
              class="btn-primary w-full justify-center text-sm py-2.5"
            >
              Book This Room
            </button>
          </div>
        </div>
      </div>

      <!-- Amenities Strip -->
      <div class="bg-walnut-700 rounded-md p-8">
        <p class="text-gold-400 text-xs font-semibold tracking-widest uppercase text-center mb-6">All Rooms Include</p>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="amenity in roomAmenities"
            :key="amenity.label"
            class="flex items-center gap-3 text-cream-100"
          >
            <span class="text-gold-400 text-xl flex-shrink-0">{{ amenity.icon }}</span>
            <span class="text-sm font-medium">{{ amenity.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineEmits(['openBooking'])

const rooms = [
  {
    id: 'double',
    name: 'Double Room',
    icon: '🛏',
    image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/164155956.jpg?k=fcb516567a3a3d5e22a0795caec5b71caeb586e51123d28f31bb857d7416f10d&o=&hp=1',
    imageAlt: 'Comfortable double room with bed and chair at My Dream Place Hotel Butuan',
    description: 'A well-appointed room perfect for solo travelers or couples, with all the essentials for a comfortable stay.',
    features: [
      'Double bed with quality linen',
      'Flat-screen TV with cable/satellite',
      'Individual air conditioning',
      'Private bathroom with shower',
      'Work desk with laptop space',
      'Electric kettle',
    ],
  },
  {
    id: 'triple',
    name: 'Triple Room',
    icon: '🛏️',
    image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/164155958.jpg?k=4644c2307f7bc0ccfd1d9726a111e3fb4d1704432e3abd1c0130597e537c3e64&o=&hp=1',
    imageAlt: 'Triple room collage at My Dream Place Hotel Butuan Philippines',
    description: 'Ideal for small groups or families, offering three beds and ample space to relax after a busy day.',
    features: [
      'Three single or mixed beds',
      'Flat-screen TV with cable/satellite',
      'Individual air conditioning',
      'Private bathroom with shower',
      'Work desk area',
      'Free toiletries',
    ],
  },
  {
    id: 'family',
    name: 'Family Room',
    icon: '🏠',
    image: 'https://cf.bstatic.com/xdata/images/hotel/max1024x768/223593722.jpg?k=6ea1d03e5509f6eab07498c79b27da3b73644c6490e93adf46b53895422b7b83&o=&hp=1',
    imageAlt: 'Family living area with chairs and tiled floor at My Dream Place Hotel Butuan',
    description: 'Spacious and family-friendly, this room comfortably sleeps the whole family with room to breathe.',
    features: [
      'Multiple beds for the whole family',
      'Flat-screen TV with cable/satellite',
      'Individual air conditioning',
      'Private bathroom with shower',
      'Extra bed available for children',
      'Daily housekeeping',
    ],
  },
]

const roomAmenities = [
  { icon: '❄️', label: 'Air Conditioning' },
  { icon: '📺', label: 'Flat-Screen TV' },
  { icon: '🚿', label: 'Private Bathroom' },
  { icon: '💻', label: 'Work Desk' },
  { icon: '☕', label: 'Electric Kettle' },
  { icon: '🧹', label: 'Daily Housekeeping' },
  { icon: '📵', label: 'Non-Smoking Rooms' },
  { icon: '📞', label: 'Free Local Calls' },
]
</script>
