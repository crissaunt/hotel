<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
        style="background: rgba(15,8,4,0.75);"
        @click.self="$emit('close')"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
      >
        <div class="bg-cream-50 rounded-md shadow-warm-lg w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <!-- Modal Header -->
          <div class="bg-walnut-700 p-6 rounded-t-md flex items-start justify-between">
            <div>
              <h2 id="booking-modal-title" class="font-serif text-cream-50 text-2xl font-bold">Reserve Your Room</h2>
              <p class="text-cream-200/60 text-sm mt-1">My Dream Place Hotel · Butuan City</p>
            </div>
            <button
              @click="$emit('close')"
              id="booking-close-btn"
              class="text-cream-200/60 hover:text-cream-50 transition-colors mt-1"
              aria-label="Close booking modal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Modal Body -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
            <!-- Room Type -->
            <div>
              <label for="room-type" class="block text-walnut-700 text-sm font-semibold mb-2">Room Type</label>
              <select
                id="room-type"
                v-model="form.roomType"
                class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                required
              >
                <option value="">Select a room type</option>
                <option value="double">Double Room</option>
                <option value="triple">Triple Room</option>
                <option value="family">Family Room</option>
              </select>
            </div>

            <!-- Dates Row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="check-in" class="block text-walnut-700 text-sm font-semibold mb-2">Check-In</label>
                <input
                  id="check-in"
                  type="date"
                  v-model="form.checkIn"
                  :min="today"
                  class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label for="check-out" class="block text-walnut-700 text-sm font-semibold mb-2">Check-Out</label>
                <input
                  id="check-out"
                  type="date"
                  v-model="form.checkOut"
                  :min="form.checkIn || today"
                  class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <!-- Guests Row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="adults" class="block text-walnut-700 text-sm font-semibold mb-2">Adults</label>
                <input
                  id="adults"
                  type="number"
                  v-model="form.adults"
                  min="1"
                  max="6"
                  class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                  required
                />
              </div>
              <div>
                <label for="children" class="block text-walnut-700 text-sm font-semibold mb-2">Children</label>
                <input
                  id="children"
                  type="number"
                  v-model="form.children"
                  min="0"
                  max="6"
                  class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm"
                />
              </div>
            </div>

            <!-- Name & Contact -->
            <div>
              <label for="guest-name" class="block text-walnut-700 text-sm font-semibold mb-2">Full Name</label>
              <input
                id="guest-name"
                type="text"
                v-model="form.name"
                placeholder="Your full name"
                class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm placeholder-bronze-300"
                required
              />
            </div>

            <div>
              <label for="guest-contact" class="block text-walnut-700 text-sm font-semibold mb-2">Contact Number</label>
              <input
                id="guest-contact"
                type="tel"
                v-model="form.contact"
                placeholder="+63 9XX XXX XXXX"
                class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm placeholder-bronze-300"
                required
              />
            </div>

            <!-- Airport Shuttle -->
            <div class="bg-cream-100 rounded-md p-4 border border-cream-300">
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  id="shuttle-request"
                  type="checkbox"
                  v-model="form.shuttle"
                  class="mt-0.5 accent-gold-400"
                />
                <div>
                  <span class="text-walnut-700 text-sm font-semibold">Request Airport Shuttle</span>
                  <p class="text-bronze-400 text-xs mt-0.5">
                    Round-trip airport transfer at ₱350/person. Must be coordinated 48 hours before arrival.
                  </p>
                </div>
              </label>
            </div>

            <!-- Special Requests -->
            <div>
              <label for="special-requests" class="block text-walnut-700 text-sm font-semibold mb-2">
                Special Requests <span class="text-bronze-300 font-normal">(optional)</span>
              </label>
              <textarea
                id="special-requests"
                v-model="form.requests"
                rows="3"
                placeholder="Early check-in, extra pillows, dietary needs, etc."
                class="w-full border border-cream-300 rounded-md px-4 py-3 text-walnut-600 bg-white focus:outline-none focus:border-gold-400 transition-colors text-sm resize-none placeholder-bronze-300"
              ></textarea>
            </div>

            <!-- Cash Notice -->
            <div class="flex items-start gap-3 text-bronze-400 text-xs bg-gold-100/50 border border-gold-400/20 rounded-sm p-3">
              <span class="text-gold-500 flex-shrink-0 mt-0.5">💵</span>
              <span>Cash is our preferred payment method. A cash deposit will be collected upon check-in for incidental security.</span>
            </div>

            <!-- Submit Button -->
            <button
              id="booking-submit-btn"
              type="submit"
              class="btn-primary w-full justify-center text-base py-4"
            >
              Confirm Reservation Inquiry
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Success Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="submitted"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
        style="background: rgba(15,8,4,0.75);"
      >
        <div class="bg-cream-50 rounded-md shadow-warm-lg w-full max-w-sm text-center p-10">
          <div class="text-5xl mb-4">🎉</div>
          <h3 class="font-serif text-walnut-700 text-2xl font-bold mb-2">Inquiry Sent!</h3>
          <p class="text-bronze-400 text-sm mb-6 leading-relaxed">
            Thank you, <strong class="text-walnut-600">{{ form.name }}</strong>! Our team will contact you shortly at {{ form.contact }} to confirm your reservation.
          </p>
          <button @click="submitted = false; $emit('close')" class="btn-primary w-full justify-center">
            Done
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close'])

const today = new Date().toISOString().split('T')[0]
const submitted = ref(false)

const form = ref({
  roomType: '',
  checkIn: '',
  checkOut: '',
  adults: 1,
  children: 0,
  name: '',
  contact: '',
  shuttle: false,
  requests: '',
})

function handleSubmit() {
  submitted.value = true
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
</style>
