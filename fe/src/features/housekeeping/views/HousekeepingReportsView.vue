<script setup lang="ts">
import { computed, ref } from 'vue'
import { housekeepingInspections, housekeepingPublicSpaces, housekeepingRooms, housekeepingWorkTasks, maintenanceCostCentre, maintenanceRequests } from '@/features/housekeeping/stores/housekeeping'
import { housekeepingRequisitions, housekeepingStock, housekeepingStockReturns } from '@/features/housekeeping/stores/housekeepingSupplies'
import { housekeepingReadyRooms, housekeepingRooms as dirtyRooms, housekeepingCleaningRooms, reservations } from '@/features/front-office/stores/reservations'

type ReportSection = 'Rooms' | 'Works & Quality' | 'Supplies'
type ReportRecord = Record<string, string | number>
const sections: ReportSection[] = ['Rooms', 'Works & Quality', 'Supplies']
const reportsBySection: Record<ReportSection, string[]> = {
  Rooms: ['Room work', 'Room status', 'Public area status'],
  'Works & Quality': ['Cleaning tasks', 'Inspection scores', 'Maintenance'],
  Supplies: ['Stock levels', 'Stores requisitions', 'Stock returns'],
}
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date())
const section = ref<ReportSection>('Rooms')
const report = ref('Room work')
const period = ref('All history')
const specificDate = ref(todayKey())
const rangeStart = ref(todayKey())
const rangeEnd = ref(todayKey())
const search = ref('')
const statusFilter = ref('All statuses')
const floorFilter = ref('All floors')
const categoryFilter = ref('All categories')
const showFilters = ref(false)
const showColumns = ref(false)
const showSummarySettings = ref(false)
const showNotes = ref(false)
const noteDraft = ref('')
const savedNote = ref('')
const notice = ref('')
const refreshedAt = ref(new Date())
const hiddenColumns = ref<string[]>([])
const hiddenSummary = ref<string[]>([])

function selectSection(next: ReportSection) {
  section.value = next
  report.value = reportsBySection[next][0]!
  statusFilter.value = 'All statuses'
  categoryFilter.value = 'All categories'
  hiddenColumns.value = []
}
const periodBounds = computed(() => period.value === 'Today'
  ? { from: todayKey(), to: todayKey() }
  : period.value === 'Specific date'
    ? { from: specificDate.value, to: specificDate.value }
    : period.value === 'Date range'
      ? { from: rangeStart.value, to: rangeEnd.value }
      : null)
function withinPeriod(date: string) {
  return !periodBounds.value || (date >= periodBounds.value.from && date <= periodBounds.value.to)
}
function roomStatus(number: string, taskState: string, occupancy: string) {
  if (housekeepingCleaningRooms.value.includes(number) || taskState === 'Cleaning') return 'Cleaning'
  if (dirtyRooms.value.includes(number) || ['Dirty', 'Inspection'].includes(taskState)) return taskState === 'Inspection' ? 'Inspection' : 'Dirty'
  if (reservations.value.some((stay) => stay.room === number && stay.status === 'In house') || occupancy === 'Occupied') return 'Occupied'
  return housekeepingReadyRooms.value.includes(number) || taskState === 'Clean' ? 'Ready' : 'Vacant'
}
const roomRows = computed<ReportRecord[]>(() => housekeepingRooms.value.map((room) => {
  const roomTasks = housekeepingWorkTasks.value.filter((task) => task.room === room.number)
  const completed = roomTasks.filter((task) => task.status === 'Completed').length
  const lastTask = [...roomTasks].sort((a, b) => b.id.localeCompare(a.id))[0]
  const inspections = housekeepingInspections.value.filter((entry) => entry.room === room.number)
  const latestInspection = inspections[0]
  return {
    Room: room.number,
    'Room type': room.type,
    Status: roomStatus(room.number, room.taskState, room.occupancy),
    Tasks: roomTasks.length,
    Completed: completed,
    'Still open': roomTasks.length - completed,
    'Last cleaned': room.taskState === 'Clean' ? room.updatedAt : '—',
    'Last task': lastTask?.job || '—',
    'Last attendant': lastTask?.assigned || '—',
    Inspections: inspections.length,
    'Inspection score': latestInspection ? `${latestInspection.score}/100` : '—',
  }
}))
const publicAreaRows = computed<ReportRecord[]>(() => housekeepingPublicSpaces.value.map((space) => ({ Area: space.name, Status: space.taskState, 'Last updated': space.updatedAt })))
const taskRows = computed<ReportRecord[]>(() => housekeepingWorkTasks.value.map((task) => ({
  Task: task.id, Room: task.room, Job: task.job, Category: task.category, Status: task.status, Assigned: task.assigned, Priority: task.priority, 'Duration (min)': task.duration,
})))
const inspectionRows = computed<ReportRecord[]>(() => housekeepingInspections.value.filter((inspection) => withinPeriod(inspection.inspectedAt.slice(0, 10))).map((inspection) => {
  const room = housekeepingRooms.value.find((entry) => entry.number === inspection.room)
  return { Room: inspection.room, 'Room type': room?.type || '—', Status: inspection.score >= 80 ? 'Passed' : 'Needs follow-up', Inspector: inspection.inspector, Score: `${inspection.score}/100`, Notes: inspection.note || '—', 'Inspected at': inspection.inspectedAt }
}))
const maintenanceRows = computed<ReportRecord[]>(() => maintenanceRequests.value.filter((request) => withinPeriod(request.reportedAt)).map((request) => {
  const costs = maintenanceCostCentre.value.filter((entry) => entry.requestId === request.id)
  return { ID: request.id, Room: request.room, Category: request.category, Priority: request.priority, Status: request.status, Description: request.description, Assigned: request.assigned, 'Reported date': request.reportedAt, 'Maintenance cost': costs.reduce((sum, entry) => sum + entry.amount, 0) }
}))
const stockRows = computed<ReportRecord[]>(() => housekeepingStock.value.map((item) => ({ Code: item.code, Item: item.item, Category: item.category, 'On hand': item.onHand, Reorder: item.reorder, Unit: item.unit, Level: item.onHand <= 0 ? 'Out' : item.onHand <= item.reorder ? 'Low' : 'OK' })))
const requisitionRows = computed<ReportRecord[]>(() => housekeepingRequisitions.value.map((request) => ({ Request: request.id, Item: request.item, Quantity: request.quantity, 'Requested by': request.requestedBy, Status: request.status })))
const returnRows = computed<ReportRecord[]>(() => housekeepingStockReturns.value.filter((entry) => withinPeriod(new Date(entry.date).toISOString().slice(0, 10))).map((entry) => ({ Item: entry.item, Quantity: entry.quantity, 'Returned by': entry.returnedBy, Condition: entry.condition, Date: entry.date })))
const sourceRows = computed<ReportRecord[]>(() => {
  if (report.value === 'Room status') return roomRows.value.map((row): ReportRecord => ({
    Room: row.Room ?? '',
    'Room type': row['Room type'] ?? '',
    Status: row.Status ?? '',
    'Last cleaned': row['Last cleaned'] ?? '',
  }))
  if (report.value === 'Public area status') return publicAreaRows.value
  if (report.value === 'Cleaning tasks') return taskRows.value.filter((row) => row.Category === 'Cleaning')
  if (report.value === 'Inspection scores') return inspectionRows.value
  if (report.value === 'Maintenance') return maintenanceRows.value
  if (report.value === 'Stock levels') return stockRows.value
  if (report.value === 'Stores requisitions') return requisitionRows.value
  if (report.value === 'Stock returns') return returnRows.value
  return roomRows.value
})
const dateFilteredRows = computed(() => sourceRows.value)
const filteredRows = computed(() => dateFilteredRows.value.filter((row) => {
  const query = search.value.trim().toLowerCase()
  const matchesQuery = !query || Object.values(row).some((value) => String(value).toLowerCase().includes(query))
  const matchesStatus = statusFilter.value === 'All statuses' || !('Status' in row) || String(row.Status) === statusFilter.value
  const matchesFloor = floorFilter.value === 'All floors' || !('Room' in row) || String(row.Room).startsWith(floorFilter.value.slice(-1))
  const matchesCategory = categoryFilter.value === 'All categories' || !('Category' in row) || String(row.Category) === categoryFilter.value
  return matchesQuery && matchesStatus && matchesFloor && matchesCategory
}))
const columns = computed(() => filteredRows.value.length ? Object.keys(filteredRows.value[0]!) : Object.keys(sourceRows.value[0] || {}))
const visibleColumns = computed(() => columns.value.filter((column) => !hiddenColumns.value.includes(column)))
const statuses = computed(() => ['All statuses', ...new Set(sourceRows.value.filter((row) => 'Status' in row).map((row) => String(row.Status)))])
const categories = computed(() => ['All categories', ...new Set(sourceRows.value.filter((row) => 'Category' in row).map((row) => String(row.Category)))])
const roomCount = computed(() => filteredRows.value.filter((row) => 'Room' in row).length)
const withWork = computed(() => filteredRows.value.filter((row) => Number(row.Tasks || 0) > 0).length)
const completedTasks = computed(() => filteredRows.value.reduce((sum, row) => sum + Number(row.Completed || 0), 0))
const openTasks = computed(() => filteredRows.value.reduce((sum, row) => sum + Number(row['Still open'] || 0), 0))
const summaryItems = computed(() => {
  if (report.value === 'Inspection scores') {
    const passed = inspectionRows.value.filter((row) => row.Status === 'Passed')
    const average = inspectionRows.value.length ? Math.round(inspectionRows.value.reduce((sum, row) => sum + Number(String(row.Score).split('/')[0]), 0) / inspectionRows.value.length) : 0
    return [{ label: 'Inspections', value: inspectionRows.value.length }, { label: 'Passed', value: passed.length }, { label: 'Follow-up', value: inspectionRows.value.length - passed.length }, { label: 'Average score', value: `${average}/100` }]
  }
  if (report.value === 'Maintenance') {
    return [{ label: 'Requests', value: maintenanceRows.value.length }, { label: 'Open', value: maintenanceRows.value.filter((row) => row.Status !== 'Completed').length }, { label: 'High priority', value: maintenanceRows.value.filter((row) => row.Priority === 'High').length }, { label: 'Maintenance cost', value: money(maintenanceCostCentre.value.reduce((sum, entry) => sum + entry.amount, 0)) }]
  }
  if (report.value === 'Stock levels') {
    return [{ label: 'Items', value: stockRows.value.length }, { label: 'Out of stock', value: stockRows.value.filter((row) => row.Level === 'Out').length }, { label: 'Low stock', value: stockRows.value.filter((row) => row.Level === 'Low').length }, { label: 'Requisitions', value: housekeepingRequisitions.value.length }]
  }
  if (report.value === 'Room work') return [
    { label: 'Rooms', value: roomCount.value },
    { label: 'With work', value: withWork.value },
    { label: 'Completed', value: completedTasks.value },
    { label: 'Still open', value: openTasks.value },
  ]
  return [{ label: 'Records', value: filteredRows.value.length }, { label: 'Open', value: filteredRows.value.filter((row) => ['Pending', 'Reported', 'In Progress'].includes(String(row.Status))).length }, { label: 'Completed / received', value: filteredRows.value.filter((row) => ['Completed', 'Received'].includes(String(row.Status))).length }, { label: 'Period', value: period.value }]
})
function toggleColumn(column: string) {
  hiddenColumns.value = hiddenColumns.value.includes(column) ? hiddenColumns.value.filter((item) => item !== column) : [...hiddenColumns.value, column]
}
function toggleSummary(label: string) {
  hiddenSummary.value = hiddenSummary.value.includes(label) ? hiddenSummary.value.filter((item) => item !== label) : [...hiddenSummary.value, label]
}
function refresh() {
  refreshedAt.value = new Date()
  notice.value = 'Report refreshed from current housekeeping records.'
  window.setTimeout(() => { notice.value = '' }, 3000)
}
function saveNote() {
  savedNote.value = noteDraft.value.trim()
  showNotes.value = false
  notice.value = 'Report note saved for this session.'
  window.setTimeout(() => { notice.value = '' }, 3000)
}
function printReport() { window.print() }
function exportCsv() {
  const csv = [visibleColumns.value.join(','), ...filteredRows.value.map((row) => visibleColumns.value.map((column) => `"${String(row[column] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `housekeeping-${report.value.toLowerCase().replaceAll(' ', '-')}-${todayKey()}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
function money(value: number) { return `GHC ${value.toFixed(2)}` }
</script>

<template>
  <section class="space-y-3">
    <header class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#1768d5]">▥ Housekeeping intelligence</p><h1 class="mt-1 font-serif text-[25px] font-medium tracking-[-0.035em] text-[#30243e]">Reports &amp; Analysis <span class="text-[#aaa2ae]">ⓘ</span></h1></div><div class="flex flex-wrap gap-1.5"><button class="report-action" @click="refresh">⟳ Refresh</button><button class="report-action" @click="showNotes = true">▤ Notes</button><button class="report-action" @click="printReport">▣ Print</button><button class="report-export" @click="exportCsv">↓ Export</button></div></header>
    <p v-if="notice" class="rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[9px] text-[#4a7356]">{{ notice }}</p>
    <section class="overflow-visible rounded-lg border border-[#e7e2e9] bg-white shadow-[0_2px_8px_rgba(48,36,62,0.035)]">
      <nav class="flex flex-wrap items-center gap-4 border-b border-[#eeeaf0] px-3 pt-2.5" aria-label="Report sections"><button v-for="item in sections" :key="item" class="report-tab" :class="section === item ? 'report-tab-active' : ''" @click="selectSection(item)">{{ item }}</button></nav>
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-[#edf0f3] p-3"><div class="flex min-w-0 flex-1 flex-wrap items-end gap-2"><label class="form-label min-w-52.5 flex-1">Report<select v-model="report" class="form-input mt-1"><option v-for="choice in reportsBySection[section]" :key="choice">{{ choice }}</option></select></label><div class="flex flex-wrap items-end gap-1.5"><span class="mb-2 text-[8px] font-semibold uppercase text-[#7b8790]">▦ Reporting period</span><button v-for="value in ['All history', 'Today', 'Specific date', 'Date range']" :key="value" class="rounded-full border px-2.5 py-1.5 text-[8px]" :class="period === value ? 'border-[#1768d5] bg-[#1768d5] text-white' : 'border-[#e1e5e9] text-[#596671]'" @click="period = value">{{ value }}</button></div><input v-if="period === 'Specific date'" v-model="specificDate" class="form-input max-w-36.25" type="date" /><template v-if="period === 'Date range'"><input v-model="rangeStart" class="form-input max-w-36.25" type="date" /><input v-model="rangeEnd" class="form-input max-w-36.25" type="date" /></template></div></div>
      <div class="flex flex-wrap items-center gap-2 px-3 py-2"><label class="client-search min-w-45 flex-1"><span aria-hidden="true">⌕</span><span class="sr-only">Search report records</span><input v-model="search" placeholder="Room, staff, task..." /></label><div class="relative"><button class="report-action" @click="showFilters = !showFilters">▽ Filters</button><div v-if="showFilters" class="report-popover left-0 top-full z-20 mt-1 w-60 space-y-2"><label class="form-label">Status<select v-model="statusFilter" class="form-input mt-1"><option v-for="value in statuses" :key="value">{{ value }}</option></select></label><label class="form-label">Floor<select v-model="floorFilter" class="form-input mt-1"><option>All floors</option><option>Floor 1</option><option>Floor 2</option><option>Floor 3</option><option>Floor 4</option></select></label><label class="form-label">Category<select v-model="categoryFilter" class="form-input mt-1"><option v-for="value in categories" :key="value">{{ value }}</option></select></label></div></div><span class="ml-auto text-[8px] text-[#82909a]">Showing {{ filteredRows.length }} of {{ sourceRows.length }}</span></div>
      <div class="mx-3 mb-2 flex flex-wrap items-center gap-3 rounded-md border border-[#e7e9ed] px-3 py-2"><span v-for="item in summaryItems" v-show="!hiddenSummary.includes(item.label)" :key="item.label" class="text-[8px] uppercase tracking-wide text-[#67737d]">{{ item.label }} <strong class="ml-1 text-[10px] text-[#303c45]">{{ item.value }}</strong></span><div class="relative ml-auto"><button class="report-action" @click="showSummarySettings = !showSummarySettings">☷ Customize summary</button><div v-if="showSummarySettings" class="report-popover right-0 top-full z-20 mt-1 w-44"><label v-for="item in summaryItems" :key="item.label" class="flex items-center gap-2 py-1 text-[9px] text-[#655b69]"><input type="checkbox" :checked="!hiddenSummary.includes(item.label)" @change="toggleSummary(item.label)" />{{ item.label }}</label></div></div></div>
      <section class="mx-3 mb-3 overflow-hidden rounded-lg border border-[#e7e9ed]"><header class="flex flex-wrap items-end justify-between gap-2 border-b border-[#edf0f3] p-3"><div><h2 class="text-[12px] font-semibold text-[#303c45]">{{ report }}</h2><p class="mt-1 text-[8px] text-[#82909a]">{{ report === 'Room work' ? 'One row per room: tasks done, last clean, open work, and supply context.' : `Housekeeping ${report.toLowerCase()} records for the selected period.` }}</p></div><div class="flex items-center gap-2 text-right text-[7px] text-[#82909a]"><span>{{ period }}<br />Generated {{ refreshedAt.toLocaleString('en-SG') }}</span><div class="relative"><button class="report-action" @click="showColumns = !showColumns">☷ Columns</button><div v-if="showColumns" class="report-popover right-0 top-full z-20 mt-1 max-h-64 w-48 overflow-y-auto"><label v-for="column in columns" :key="column" class="flex items-center gap-2 py-1 text-left text-[9px] text-[#655b69]"><input type="checkbox" :checked="!hiddenColumns.includes(column)" @change="toggleColumn(column)" />{{ column }}</label></div></div></div></header><div class="overflow-x-auto"><table class="w-full min-w-215 border-collapse text-left"><thead><tr class="bg-[#fafbfc] text-[8px] uppercase tracking-wide text-[#69747d]"><th v-for="column in visibleColumns" :key="column" class="px-3 py-2.5">{{ column }}</th></tr></thead><tbody><tr v-for="(row, index) in filteredRows" :key="index" class="border-t border-[#edf0f3] text-[9px] text-[#46515a]"><td v-for="column in visibleColumns" :key="column" class="px-3 py-2.5" :class="column === 'Room' ? 'font-medium text-[#303c45]' : ''">{{ row[column] ?? '—' }}</td></tr><tr v-if="filteredRows.length === 0"><td :colspan="Math.max(visibleColumns.length, 1)" class="py-10 text-center text-[10px] text-[#849098]">No records for this report and filter.</td></tr></tbody></table></div></section>
    </section>
    <p v-if="savedNote" class="rounded-md border border-[#ece5f1] bg-[#faf7fc] px-3 py-2 text-[9px] text-[#695976]">Report note: {{ savedNote }}</p>
    <div v-if="showNotes" class="modal-backdrop" @click.self="showNotes = false"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="report-note-title"><header class="flex items-center justify-between"><div><p class="eyebrow">Housekeeping intelligence</p><h2 id="report-note-title" class="mt-1 font-serif text-[21px] text-[#30243e]">Report notes</h2></div><button class="rounded-md p-1.5" aria-label="Close notes" @click="showNotes = false">×</button></header><label class="form-label mt-4">Add a note<textarea v-model="noteDraft" class="form-input mt-1 min-h-28 py-2" placeholder="Context or follow-up for this report"></textarea></label><footer class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="showNotes = false">Cancel</button><button class="arrival-action-primary" @click="saveNote">Save note</button></footer></section></div>
  </section>
</template>
