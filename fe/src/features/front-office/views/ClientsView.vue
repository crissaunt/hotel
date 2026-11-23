<script setup lang="ts">
import { computed, ref } from 'vue'
import { Building2, CalendarDays, Check, ChevronRight, CircleUserRound, FileText, Mail, MapPin, Phone, Plus, Search, SlidersHorizontal, UsersRound, X } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { reservations, type Reservation } from '@/features/front-office/stores/reservations'
import { clientProfiles, type ClientKind, type ClientProfile } from '@/features/front-office/stores/clients'

type ClientRecord = {
  id: string
  kind: ClientKind
  name: string
  email: string
  phone: string
  nationality: string
  companyRegistration: string
  notes: string
  stays: Reservation[]
  totalBilled: number
  outstanding: number
  lastStay: string
  nextStay: string
  source: 'Reservation' | 'Profile'
}
const activeKind = ref<'All clients' | 'Guests' | 'Companies'>('All clients')
const search = ref('')
const statusFilter = ref('All stay statuses')
const showNewClient = ref(false)
const selectedClient = ref<ClientRecord | null>(null)
const formKind = ref<ClientKind>('Guest')
const formName = ref('')
const formEmail = ref('')
const formPhone = ref('')
const formNationality = ref('')
const formRegistration = ref('')
const formNotes = ref('')
const formError = ref('')
const notice = ref('')
const tabs = ['All clients', 'Guests', 'Companies'] as const

function stayTotal(reservation: Reservation) {
  const active = (charge: { status?: string }) => !['Voided', 'Moved', 'Split'].includes(charge.status || 'Posted')
  const room = reservation.roomCharges ? reservation.roomCharges.filter(active).reduce((sum, charge) => sum + charge.amount, 0) : Math.max(1, nights(reservation)) * reservation.rate
  const service = (reservation.charges || []).filter(active).reduce((sum, charge) => sum + charge.amount, 0)
  const subtotal = Math.max(0, room + reservation.otherCharges + service - (reservation.discount?.amount || 0))
  return subtotal + (reservation.taxExempt ? 0 : Math.round(subtotal * 0.21 * 100) / 100)
}
function nights(reservation: Reservation) {
  return Math.max(1, Math.round((new Date(`${reservation.checkOut}T12:00:00`).getTime() - new Date(`${reservation.checkIn}T12:00:00`).getTime()) / 86400000))
}
function paid(reservation: Reservation) {
  return reservation.amountPaid ?? (reservation.payments || []).reduce((sum, payment) => sum + payment.amount, 0)
}
const records = computed<ClientRecord[]>(() => {
  const result = new Map<string, ClientRecord>()
  const ensure = (key: string, kind: ClientKind, name: string, source: ClientRecord['source'] = 'Reservation') => {
    if (!result.has(key)) result.set(key, { id: key, kind, name, email: '', phone: '', nationality: '', companyRegistration: '', notes: '', stays: [], totalBilled: 0, outstanding: 0, lastStay: '', nextStay: '', source })
    return result.get(key)!
  }
  for (const stay of reservations.value) {
    const guestNames = [...new Set([stay.guest, ...(stay.additionalGuests || [])].filter(Boolean))]
    for (const guestName of guestNames) {
      const guest = ensure(`guest:${guestName.toLowerCase()}`, 'Guest', guestName)
      if (!guest.stays.some((item) => item.id === stay.id)) guest.stays.push(stay)
    }
    if (stay.billingType === 'Company') {
      const company = ensure(`company:${stay.billingPerson.toLowerCase()}`, 'Company', stay.billingPerson)
      if (!company.stays.some((item) => item.id === stay.id)) company.stays.push(stay)
    }
  }
  for (const profile of clientProfiles.value) {
    const key = `${profile.kind.toLowerCase()}:${profile.name.toLowerCase()}`
    const record = ensure(key, profile.kind, profile.name, 'Profile')
    Object.assign(record, { id: profile.id, email: profile.email, phone: profile.phone, nationality: profile.nationality, companyRegistration: profile.companyRegistration || '', notes: profile.notes, source: 'Profile' as const })
  }
  return [...result.values()].map((record) => {
    record.stays.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    record.totalBilled = record.stays.reduce((sum, stay) => sum + stayTotal(stay), 0)
    record.outstanding = record.stays.reduce((sum, stay) => sum + Math.max(0, stayTotal(stay) - paid(stay)), 0)
    const today = new Date().toISOString().slice(0, 10)
    record.lastStay = [...record.stays].filter((stay) => stay.checkOut <= today).sort((a, b) => b.checkOut.localeCompare(a.checkOut))[0]?.checkOut || ''
    record.nextStay = [...record.stays].filter((stay) => stay.checkOut >= today && !['Cancelled', 'No show'].includes(stay.status)).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0]?.checkIn || ''
    return record
  }).sort((a, b) => a.name.localeCompare(b.name))
})
const filteredClients = computed(() => records.value.filter((client) => {
  if (activeKind.value === 'Guests' && client.kind !== 'Guest') return false
  if (activeKind.value === 'Companies' && client.kind !== 'Company') return false
  if (statusFilter.value !== 'All stay statuses' && !client.stays.some((stay) => stay.status === statusFilter.value)) return false
  const query = search.value.trim().toLowerCase()
  return !query || [client.name, client.email, client.phone, client.nationality, client.companyRegistration, ...client.stays.map((stay) => stay.id)].some((value) => value.toLowerCase().includes(query))
}))
const guestsCount = computed(() => records.value.filter((item) => item.kind === 'Guest').length)
const companiesCount = computed(() => records.value.filter((item) => item.kind === 'Company').length)
const activeStaysCount = computed(() => reservations.value.filter((stay) => ['Confirmed', 'In house', 'Pending'].includes(stay.status)).length)
const outstandingCount = computed(() => records.value.filter((item) => item.kind === 'Company').reduce((sum, item) => sum + item.outstanding, 0))

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })
}
function money(value: number) { return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') }
function stayStatus(stay: Reservation) {
  if (stay.status === 'In house') return 'In-house'
  if (stay.status === 'Checked out') return 'Checked out'
  if (stay.status === 'No show') return 'No show'
  if (stay.status === 'Cancelled') return 'Cancelled'
  return stay.status
}
function resetForm() {
  formKind.value = 'Guest'; formName.value = ''; formEmail.value = ''; formPhone.value = ''; formNationality.value = ''; formRegistration.value = ''; formNotes.value = ''; formError.value = ''
}
function createClient() {
  formError.value = ''
  if (!formName.value.trim()) { formError.value = 'Enter a guest or company name.'; return }
  const exists = records.value.some((client) => client.kind === formKind.value && client.name.toLowerCase() === formName.value.trim().toLowerCase())
  if (exists) { formError.value = 'A client with this name is already in the directory.'; return }
  const profile: ClientProfile = { id: `CLI-${Date.now().toString(36).toUpperCase()}`, kind: formKind.value, name: formName.value.trim(), email: formEmail.value.trim(), phone: formPhone.value.trim(), nationality: formNationality.value.trim(), companyRegistration: formRegistration.value.trim() || undefined, notes: formNotes.value.trim(), createdAt: new Date().toISOString() }
  clientProfiles.value.unshift(profile)
  showNewClient.value = false
  activeKind.value = formKind.value === 'Company' ? 'Companies' : 'Guests'
  search.value = ''
  notice.value = `${profile.kind} profile created.`
  resetForm()
  window.setTimeout(() => { notice.value = '' }, 3500)
}
</script>

<template>
  <section class="space-y-5">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><h1 class="font-serif text-[30px] font-medium tracking-[-0.035em] text-[#30243e] sm:text-[34px]">Clients</h1><p class="mt-1 text-[11px] text-[#7d7583]">Guest profiles and company accounts connected to their stays.</p></div><button class="arrival-action-primary" @click="resetForm(); showNewClient = true"><Plus :size="13" /> Add client</button></header>
    <div v-if="notice" class="rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[10px] text-[#4a7356]" role="status">{{ notice }}</div>

    <section class="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb] sm:grid-cols-4">
      <div class="client-metric"><span><UsersRound :size="13" /> Guest profiles</span><strong>{{ guestsCount }}</strong><small>Linked to reservations</small></div>
      <div class="client-metric"><span><Building2 :size="13" /> Company accounts</span><strong>{{ companiesCount }}</strong><small>Corporate bill-to clients</small></div>
      <div class="client-metric"><span><CalendarDays :size="13" /> Active stays</span><strong>{{ activeStaysCount }}</strong><small>Upcoming or in-house</small></div>
      <div class="client-metric"><span><FileText :size="13" /> Company balance</span><strong class="!text-[#9a5947]">{{ money(outstandingCount) }}</strong><small>Across company stays</small></div>
    </section>

    <section class="overflow-hidden rounded-lg border border-[#e7e2e9] bg-[#fffdfb]">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeaf0] px-4 pt-3"><nav class="flex gap-4" role="tablist" aria-label="Client type"><button v-for="tab in tabs" :key="tab" class="report-tab" :class="activeKind === tab ? 'report-tab-active' : ''" role="tab" :aria-selected="activeKind === tab" @click="activeKind = tab">{{ tab }}<span class="ml-1 text-[9px] text-[#a29aa6]">{{ tab === 'Guests' ? guestsCount : tab === 'Companies' ? companiesCount : records.length }}</span></button></nav><div class="flex flex-wrap items-center gap-2 pb-2"><label class="client-search"><Search :size="13" /><span class="sr-only">Search clients</span><input v-model="search" placeholder="Search name, email, phone, or stay" /></label><label class="sr-only" for="client-status">Filter by stay status</label><select id="client-status" v-model="statusFilter" class="reservation-select"><option>All stay statuses</option><option>Pending</option><option>Confirmed</option><option>In house</option><option>Checked out</option><option>No show</option></select></div></div>
      <div class="flex items-center justify-between px-4 py-2.5"><p class="text-[9px] text-[#8c8490]">{{ filteredClients.length }} {{ filteredClients.length === 1 ? 'client' : 'clients' }} · Guest profiles follow individual stays; company profiles group company-billed stays.</p><span class="hidden items-center gap-1 text-[9px] text-[#877d8e] sm:flex"><SlidersHorizontal :size="12" /> Directory</span></div>
      <div class="overflow-x-auto"><table class="w-full min-w-[930px] border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-4">Client</th><th class="reservation-head">Type</th><th class="reservation-head">Contact</th><th class="reservation-head text-center">Stays</th><th class="reservation-head">Last stay / next arrival</th><th class="reservation-head text-right">Total billed</th><th class="reservation-head text-right">Outstanding</th><th class="reservation-head pr-4"></th></tr></thead><tbody><tr v-for="client in filteredClients" :key="client.id" class="reservation-row cursor-pointer" @click="selectedClient = client"><td class="reservation-cell pl-4"><div class="flex items-center gap-2.5"><span class="flex size-8 shrink-0 items-center justify-center rounded-full" :class="client.kind === 'Company' ? 'bg-[#f1eafa] text-[#6c4b91]' : 'bg-[#f1f4ef] text-[#526f5d]'"><Building2 v-if="client.kind === 'Company'" :size="14" /><span v-else class="text-[9px] font-semibold">{{ initials(client.name) }}</span></span><span><strong class="block font-semibold text-[#403747]">{{ client.name }}</strong><small v-if="client.kind === 'Company'" class="text-[8px] text-[#8d8591]">Company bill-to account</small><small v-else-if="client.nationality" class="text-[8px] text-[#8d8591]">{{ client.nationality }}</small></span></div></td><td class="reservation-cell"><span class="client-kind" :class="client.kind === 'Company' ? 'client-kind-company' : ''">{{ client.kind }}</span></td><td class="reservation-cell text-[#6f6675]"><span v-if="client.email" class="block">{{ client.email }}</span><span v-if="client.phone" class="block text-[8px]">{{ client.phone }}</span><span v-if="!client.email && !client.phone" class="text-[9px] text-[#aaa2ad]">No contact details</span></td><td class="reservation-cell text-center text-[#5f5665]">{{ client.stays.length }}</td><td class="reservation-cell text-[#6f6675]"><span class="block">Last · {{ formatDate(client.lastStay) }}</span><span class="block text-[8px] text-[#7b668c]">Next · {{ formatDate(client.nextStay) }}</span></td><td class="reservation-cell text-right text-[#51465c]">{{ money(client.totalBilled) }}</td><td class="reservation-cell text-right font-medium" :class="client.outstanding > 0 ? 'text-[#a25454]' : 'text-[#44815a]'">{{ money(client.outstanding) }}</td><td class="reservation-cell pr-4 text-right"><button class="text-[#8b7b95] hover:text-[#64418b]" :aria-label="`View ${client.name}`" @click.stop="selectedClient = client"><ChevronRight :size="15" /></button></td></tr><tr v-if="filteredClients.length === 0"><td colspan="8" class="py-14 text-center"><CircleUserRound :size="19" class="mx-auto text-[#aa9bb6]" /><p class="mt-2 text-[11px] font-medium text-[#5b5162]">No clients found</p><p class="mt-1 text-[9px] text-[#918894]">Try another search or add a client profile.</p></td></tr></tbody></table></div>
    </section>

    <div v-if="showNewClient" class="modal-backdrop" @click.self="showNewClient = false"><section class="modal-card max-h-[90vh] overflow-y-auto text-left" role="dialog" aria-modal="true" aria-labelledby="new-client-title"><header class="flex items-start justify-between gap-3"><div><p class="eyebrow">Client directory</p><h2 id="new-client-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Add a client</h2><p class="mt-1 text-[10px] text-[#807884]">Create a guest profile or a company bill-to account.</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close form" @click="showNewClient = false"><X :size="16" /></button></header><div class="mt-4 flex gap-1 rounded-md bg-[#f6f3f7] p-1"><button class="flex-1 rounded px-3 py-2 text-[10px]" :class="formKind === 'Guest' ? 'bg-white font-semibold text-[#65428e] shadow-sm' : 'text-[#807884]'" @click="formKind = 'Guest'">Guest</button><button class="flex-1 rounded px-3 py-2 text-[10px]" :class="formKind === 'Company' ? 'bg-white font-semibold text-[#65428e] shadow-sm' : 'text-[#807884]'" @click="formKind = 'Company'">Company</button></div><div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label class="form-label sm:col-span-2">{{ formKind === 'Company' ? 'Company name' : 'Guest full name' }}<input v-model="formName" class="form-input mt-1" :placeholder="formKind === 'Company' ? 'Registered company name' : 'First and last name'" /></label><label class="form-label">Email<input v-model="formEmail" type="email" class="form-input mt-1" placeholder="name@example.com" /></label><label class="form-label">Phone<input v-model="formPhone" type="tel" class="form-input mt-1" placeholder="+63" /></label><label v-if="formKind === 'Guest'" class="form-label">Nationality<input v-model="formNationality" class="form-input mt-1" placeholder="Optional" /></label><label v-else class="form-label">Company registration / TIN<input v-model="formRegistration" class="form-input mt-1" placeholder="Optional" /></label><label class="form-label sm:col-span-2">Notes<textarea v-model="formNotes" class="form-input mt-1 min-h-20 py-2" placeholder="Optional client notes"></textarea></label></div><p v-if="formError" class="mt-3 text-[10px] text-[#a25454]">{{ formError }}</p><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showNewClient = false">Cancel</button><button class="arrival-action-primary" @click="createClient"><Check :size="13" /> Save client</button></footer></section></div>

    <div v-if="selectedClient" class="modal-backdrop" @click.self="selectedClient = null"><section class="client-detail" role="dialog" aria-modal="true" :aria-labelledby="`client-${selectedClient.id}`"><header class="flex items-start justify-between gap-3 border-b border-[#eee8f0] bg-[#2a2032] px-5 py-4 text-white"><div class="flex items-center gap-3"><span class="flex size-10 items-center justify-center rounded-full bg-[#bea3dc] text-[#30243e]"><Building2 v-if="selectedClient.kind === 'Company'" :size="17" /><span v-else class="text-[11px] font-semibold">{{ initials(selectedClient.name) }}</span></span><div><p class="text-[8px] uppercase tracking-[0.14em] text-white/60">{{ selectedClient.kind }} profile</p><h2 :id="`client-${selectedClient.id}`" class="mt-1 font-serif text-[23px]">{{ selectedClient.name }}</h2><p class="mt-1 text-[9px] text-white/65">{{ selectedClient.stays.length }} linked stay{{ selectedClient.stays.length === 1 ? '' : 's' }} <span v-if="selectedClient.companyRegistration">· {{ selectedClient.companyRegistration }}</span></p></div></div><button class="rounded-md p-1.5 text-white/65 hover:bg-white/10" aria-label="Close client profile" @click="selectedClient = null"><X :size="16" /></button></header><div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3"><div class="client-detail-metric"><span>Total billed</span><strong>{{ money(selectedClient.totalBilled) }}</strong></div><div class="client-detail-metric"><span>Outstanding</span><strong :class="selectedClient.outstanding ? 'text-[#a25454]' : 'text-[#44815a]'">{{ money(selectedClient.outstanding) }}</strong></div><div class="client-detail-metric"><span>Stays</span><strong>{{ selectedClient.stays.length }}</strong></div></div><div class="grid grid-cols-1 gap-2 px-4 pb-4 text-[10px] text-[#6e6574] sm:grid-cols-2"><p class="flex items-center gap-2"><Mail :size="12" class="text-[#907aa0]" />{{ selectedClient.email || 'No email on file' }}</p><p class="flex items-center gap-2"><Phone :size="12" class="text-[#907aa0]" />{{ selectedClient.phone || 'No phone on file' }}</p><p v-if="selectedClient.nationality" class="flex items-center gap-2"><MapPin :size="12" class="text-[#907aa0]" />{{ selectedClient.nationality }}</p><p v-if="selectedClient.notes" class="sm:col-span-2">{{ selectedClient.notes }}</p></div><div class="border-t border-[#eee8f0] px-4 py-3"><div class="mb-2 flex items-center justify-between"><h3 class="text-[11px] font-semibold text-[#493d50]">Stay history</h3><RouterLink v-if="selectedClient.kind === 'Company'" to="/invoices" class="text-[9px] font-medium text-[#704b99] hover:underline" @click="selectedClient = null">Open company ledger</RouterLink></div><div v-if="selectedClient.stays.length" class="max-h-[34vh] overflow-y-auto"><div v-for="stay in selectedClient.stays" :key="stay.id" class="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0edf1] py-2 text-[9px]"><div><strong class="text-[#483d50]">{{ stay.id }} · Room {{ stay.room }}</strong><span class="ml-2 rounded-full bg-[#f4f0f6] px-2 py-0.5 text-[8px] text-[#6d5b7d]">{{ stayStatus(stay) }}</span><p class="mt-1 text-[#837a89]">{{ formatDate(stay.checkIn) }} – {{ formatDate(stay.checkOut) }}</p></div><div class="text-right"><strong class="text-[#50445b]">{{ money(stayTotal(stay)) }}</strong><p class="mt-1 text-[#8b8190]">Due {{ money(Math.max(0, stayTotal(stay) - paid(stay))) }}</p></div></div></div><p v-else class="rounded-md bg-[#faf8fb] px-3 py-5 text-center text-[10px] text-[#8b8490]">No stays linked yet.</p></div><footer class="flex justify-end border-t border-[#eee8f0] px-4 py-3"><button class="secondary-button" @click="selectedClient = null">Close profile</button></footer></section></div>
  </section>
</template>
