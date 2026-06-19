<template>
  <section id="policies" class="py-24 bg-cream-100">
    <div class="max-w-7xl mx-auto px-6">
      <!-- Section Header -->
      <div class="text-center mb-16">
        <p class="section-subtitle">Guest Information</p>
        <h2 class="section-title mb-4">Hotel Policies</h2>
        <div class="gold-divider mx-auto"></div>
        <p class="text-bronze-400 max-w-xl mx-auto leading-relaxed">
          Everything you need to know before, during, and after your stay to ensure a smooth and enjoyable experience.
        </p>
      </div>

      <!-- Policies Grid -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div
          v-for="policy in policies"
          :key="policy.title"
          class="bg-white rounded-md p-6 shadow-warm hover:shadow-warm-lg transition-all duration-300 group"
        >
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 bg-gold-400/15 rounded-sm flex items-center justify-center text-xl group-hover:bg-gold-400/25 transition-colors duration-200">
              {{ policy.icon }}
            </div>
            <h3 class="font-serif text-walnut-700 font-semibold">{{ policy.title }}</h3>
          </div>
          <ul class="space-y-2">
            <li
              v-for="point in policy.points"
              :key="point"
              class="text-bronze-400 text-sm leading-relaxed flex items-start gap-2"
            >
              <span class="text-gold-500 mt-0.5 flex-shrink-0 text-xs">✦</span>
              {{ point }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Notice Banner -->
      <div class="bg-walnut-700 rounded-md p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
        <span class="text-3xl flex-shrink-0">💡</span>
        <div>
          <h3 class="font-serif text-cream-50 font-semibold mb-1">Important Note</h3>
          <p class="text-cream-200/70 text-sm leading-relaxed">
            Cash is the preferred and primary method of payment on-site. A cash deposit will be requested at check-in for incidental security purposes. For airport shuttle bookings, please contact the front desk at least <strong class="text-gold-400">48 hours before arrival</strong>.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const policies = [
  {
    icon: '🕑',
    title: 'Check-In & Check-Out',
    points: [
      'Check-in from 2:00 PM onwards',
      '24-hour reception & express check-in',
      'Early check-in available (subject to availability, may be free)',
      'Check-out by 12:00 PM (Noon)',
    ],
  },
  {
    icon: '💵',
    title: 'Payment',
    points: [
      'Cash is the highly preferred on-site payment method',
      'Cash deposit required at check-in for incidentals',
      'Please prepare exact or near-exact amounts',
    ],
  },
  {
    icon: '📶',
    title: 'Wi-Fi & Connectivity',
    points: [
      'Free Wi-Fi available throughout the property',
      'Most stable in common public areas',
      'Signal may vary in concrete-walled rooms',
      'Contact front desk for assistance',
    ],
  },
  {
    icon: '👶',
    title: 'Child Policy',
    points: [
      'Infants (0–2 years) stay free under standard room conditions',
      'Children aged 3–7 generally require an extra bed setup',
      'Guests aged 8 and older are considered adults',
    ],
  },
  {
    icon: '🐾',
    title: 'Pet Policy',
    points: [
      'Pets are NOT allowed on the property',
      'Service animals: please inquire with front desk',
    ],
  },
  {
    icon: '🚭',
    title: 'Smoking Policy',
    points: [
      'All rooms are strictly non-smoking',
      'Smoking in designated outdoor areas only',
      'Violation may result in additional charges',
    ],
  },
]
</script>
