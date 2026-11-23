<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Check, Plus, Search, Trash2, X } from '@lucide/vue'
import { adminModules, adminRecords, type AdminRecord, type RecordKey } from '@/features/admin/adminData'

const route = useRoute()
const recordKey = computed(() => String(route.meta.recordKey || 'rooms') as RecordKey)
const moduleInfo = computed(() => adminModules[recordKey.value])
const records = computed(() => adminRecords[recordKey.value] || [])
const search = ref('')
const statusFilter = ref('All records')
const modalOpen = ref(false)
const editingIndex = ref<number | null>(null)
const form = ref<AdminRecord>({})
const notice = ref('')
const formError = ref('')

const statuses = computed(() => ['All records', ...new Set(records.value.map((record) => record.status).filter((status): status is string => Boolean(status)))])
const filteredRecords = computed(() => records.value.map((record, index) => ({ record, index })).filter(({ record }) => {
  const query = search.value.trim().toLowerCase()
  const matchesSearch = !query || moduleInfo.value.searchKeys.some((key) => (record[key] || '').toLowerCase().includes(query))
  const matchesStatus = statusFilter.value === 'All records' || record.status === statusFilter.value
  return matchesSearch && matchesStatus
}))

watch(recordKey, () => { search.value = ''; statusFilter.value = 'All records'; modalOpen.value = false; notice.value = '' })

function openCreate() {
  notice.value = ''
  formError.value = ''
  editingIndex.value = null
  form.value = Object.fromEntries(moduleInfo.value.fields.map((field) => [field.key, field.options?.[0] || '']))
  modalOpen.value = true
}
function openEdit(index: number) {
  notice.value = ''
  formError.value = ''
  editingIndex.value = index
  form.value = { ...records.value[index] }
  modalOpen.value = true
}
function saveRecord() {
  const missing = moduleInfo.value.fields.find((field) => field.required && !form.value[field.key]?.trim())
  if (missing) { formError.value = `${missing.label} is required.`; return }
  if (editingIndex.value === null) adminRecords[recordKey.value].unshift({ ...form.value })
  else adminRecords[recordKey.value][editingIndex.value] = { ...form.value }
  notice.value = `${moduleInfo.value.singular} ${editingIndex.value === null ? 'added' : 'updated'} in this preview.`
  formError.value = ''
  modalOpen.value = false
  editingIndex.value = null
}
function removeRecord(index: number) {
  adminRecords[recordKey.value].splice(index, 1)
  notice.value = `${moduleInfo.value.singular} removed from this preview.`
}
function statusTone(status: string) {
  const value = status.toLowerCase()
  if (['ready', 'active', 'confirmed', 'on duty', 'published', 'available'].includes(value)) return 'admin-status-good'
  if (['occupied', 'in house', 'pending', 'draft', 'needs cleaning', 'seasonal'].includes(value)) return 'admin-status-wait'
  if (['inactive', 'cancelled', 'off duty', 'archived', 'out of service', 'leave'].includes(value)) return 'admin-status-muted'
  return 'admin-status-neutral'
}
function cellValue(key: string, value: string) {
  if (key === 'amount') return `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (['arrival', 'departure', 'from', 'to'].includes(key) && value) return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  return value || '—'
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p class="eyebrow">Admin portal · Front office</p><h1 class="mt-2 font-serif text-[31px] tracking-[-.035em] text-[#293740] sm:text-[36px]">{{ moduleInfo.title }}</h1><p class="mt-2 max-w-[600px] text-[11px] leading-5 text-[#7b888c]">{{ moduleInfo.description }}</p></div>
      <button class="admin-primary-button self-start sm:self-auto" @click="openCreate"><Plus :size="14" /> Add {{ moduleInfo.singular }}</button>
    </div>

    <p v-if="notice" class="mt-5 flex items-center gap-2 rounded border border-[#dce9df] bg-[#f4faf5] px-3 py-2 text-[10px] text-[#587a61]"><Check :size="13" /> {{ notice }}<button class="ml-auto p-1 text-[#82968a] hover:text-[#42694f]" aria-label="Dismiss message" @click="notice = ''"><X :size="13" /></button></p>

    <div class="mt-6 overflow-hidden rounded-md border border-[#e6e9e4] bg-white">
      <div class="flex flex-col gap-3 border-b border-[#eceee9] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 class="text-[11px] font-semibold text-[#435159]">{{ moduleInfo.title }} list</h2><p class="mt-0.5 text-[9px] text-[#929c9d]">{{ filteredRecords.length }} of {{ records.length }} records</p></div>
        <div class="flex flex-col gap-2 xs:flex-row">
          <label class="admin-search"><Search :size="13" /><input v-model="search" :aria-label="`Search ${moduleInfo.title.toLowerCase()}`" :placeholder="`Search ${moduleInfo.title.toLowerCase()}`" /></label>
          <select v-model="statusFilter" class="admin-select" aria-label="Filter by status"><option v-for="status in statuses" :key="status">{{ status }}</option></select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] border-collapse text-left">
          <thead><tr class="bg-[#fafbf9] text-[9px] uppercase tracking-[.08em] text-[#8f9999]">
            <th v-for="key in moduleInfo.columns" :key="key" class="px-4 py-2.5 font-semibold first:pl-5">{{ moduleInfo.fields.find((field) => field.key === key)?.label || key }}</th><th class="w-[86px] px-3 py-2.5 text-right font-semibold">Actions</th>
          </tr></thead>
          <tbody>
            <tr v-for="item in filteredRecords" :key="`${recordKey}-${item.index}`" class="border-t border-[#eef0ec] transition-colors hover:bg-[#fcfcfb]">
              <td v-for="(key, columnIndex) in moduleInfo.columns" :key="key" class="max-w-[260px] px-4 py-3 text-[10px] text-[#68767b] first:pl-5" :class="columnIndex === 0 ? 'font-medium text-[#435159]' : ''">
                <span v-if="key === 'status'" class="admin-status" :class="statusTone(item.record[key] || '')">{{ item.record[key] || '—' }}</span>
                <span v-else class="block truncate" :title="item.record[key]">{{ cellValue(key, item.record[key] || '') }}</span>
              </td>
              <td class="px-3 py-2"><div class="flex justify-end gap-1"><button class="admin-row-action" :aria-label="`Edit ${moduleInfo.singular}`" @click="openEdit(item.index)">Edit</button><button class="admin-row-icon" :aria-label="`Remove ${moduleInfo.singular}`" @click="removeRecord(item.index)"><Trash2 :size="13" /></button></div></td>
            </tr>
            <tr v-if="!filteredRecords.length"><td :colspan="moduleInfo.columns.length + 1" class="px-4 py-12 text-center text-[10px] text-[#929c9d]">No matching records. Adjust the search or add a {{ moduleInfo.singular }}.</td></tr>
          </tbody>
        </table>
      </div>
      <footer class="flex flex-wrap items-center justify-between gap-2 border-t border-[#eceee9] bg-[#fcfcfb] px-4 py-3 text-[9px] text-[#9aa3a2] sm:px-5"><span>Sample records for the frontend preview</span><span>Showing {{ filteredRecords.length }} records</span></footer>
    </div>

    <div v-if="modalOpen" class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-[#1b2024]/40 p-4" @click.self="modalOpen = false">
      <section class="my-auto w-full max-w-[560px] overflow-hidden rounded-lg border border-[#e4e7e1] bg-[#fffdfb] shadow-2xl" role="dialog" aria-modal="true" :aria-label="`${editingIndex === null ? 'Add' : 'Edit'} ${moduleInfo.singular}`">
        <header class="flex items-start justify-between border-b border-[#eceee9] px-5 py-4"><div><p class="eyebrow">{{ editingIndex === null ? 'New record' : 'Edit record' }}</p><h2 class="mt-1 text-[15px] font-semibold text-[#39484e]">{{ editingIndex === null ? 'Add' : 'Update' }} {{ moduleInfo.singular }}</h2></div><button class="rounded p-1 text-[#849092] hover:bg-[#f1f2ef]" aria-label="Close form" @click="modalOpen = false"><X :size="16" /></button></header>
        <form class="p-5" @submit.prevent="saveRecord">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label v-for="field in moduleInfo.fields" :key="field.key" class="block" :class="field.key === 'summary' || field.key === 'preference' ? 'sm:col-span-2' : ''"><span class="mb-1.5 block text-[9px] font-medium text-[#6f7d81]">{{ field.label }}<span v-if="field.required" class="text-[#a85d60]"> *</span></span>
              <select v-if="field.type === 'select'" v-model="form[field.key]" class="admin-form-control" :required="field.required"><option v-for="option in field.options" :key="option">{{ option }}</option></select>
              <input v-else v-model="form[field.key]" class="admin-form-control" :type="field.type || 'text'" :placeholder="field.placeholder || `Enter ${field.label.toLowerCase()}`" :required="field.required" :min="field.type === 'number' ? 0 : undefined" :step="field.type === 'number' ? '0.01' : undefined" />
            </label>
          </div>
          <p v-if="formError" class="mt-3 text-[9px] text-[#a25454]">{{ formError }}</p>
          <div class="mt-5 flex justify-end gap-2 border-t border-[#eceee9] pt-4"><button type="button" class="admin-secondary-button" @click="modalOpen = false">Cancel</button><button type="submit" class="admin-primary-button"><Check :size="13" /> Save {{ moduleInfo.singular }}</button></div>
          <p class="mt-3 text-[9px] text-[#9ca5a3]">Saved to temporary in-page preview data only.</p>
        </form>
      </section>
    </div>
  </section>
</template>
