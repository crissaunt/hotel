<script setup lang="ts">
import { computed, ref } from 'vue'
import { CalendarDays, Check, CircleAlert, Clock3, FileText, Plus, Printer, Search, X } from '@lucide/vue'
import { reservations } from '@/features/front-office/stores/reservations'
import { pettyExpenses, tillSessions, todayKey, type PettyExpense, type TillSession } from '@/features/front-office/stores/cashier'

type CashierTab = 'Till' | 'Petty expense'
const tabs: CashierTab[] = ['Till', 'Petty expense']
const cashierName = 'Jordan Lee'
const today = todayKey()
const activeTab = ref<CashierTab>('Till')
const search = ref('')
const dateFilter = ref<'All dates' | 'Today' | 'Specific date'>('All dates')
const specificDate = ref(today)
const showExpenseForm = ref(false)
const expenseDate = ref(today)
const expenseCategory = ref('Supplies')
const expenseDescription = ref('')
const expensePayee = ref('')
const expenseMethod = ref<'Cash' | 'Mobile money' | 'Card' | 'Bank transfer'>('Cash')
const expenseAmount = ref('')
const expenseReference = ref('')
const expenseNotes = ref('')
const expenseError = ref('')
const voidExpense = ref<PettyExpense | null>(null)
const voidReason = ref('')
const voidError = ref('')
const showOpenTill = ref(false)
const tillBusinessDate = ref(today)
const tillName = ref('Cash')
const tillOpeningAmount = ref('')
const tillOpeningNotes = ref('')
const tillError = ref('')
const closingTill = ref<TillSession | null>(null)
const tillClosingAmount = ref('')
const closeTillError = ref('')
const notice = ref('')

const datePayments = computed(() => reservations.value.flatMap((reservation) => (reservation.payments || []).filter((payment) => payment.receivedAt.slice(0, 10) === today)))
const paymentTotals = computed(() => ({
  cash: datePayments.value.filter((payment) => payment.method.toLowerCase() === 'cash').reduce((sum, payment) => sum + payment.amount, 0),
  mobile: datePayments.value.filter((payment) => payment.method.toLowerCase().includes('mobile') || payment.method.toLowerCase().includes('momo')).reduce((sum, payment) => sum + payment.amount, 0),
  card: datePayments.value.filter((payment) => payment.method.toLowerCase().includes('card')).reduce((sum, payment) => sum + payment.amount, 0),
  other: datePayments.value.filter((payment) => !['cash', 'card'].includes(payment.method.toLowerCase()) && !payment.method.toLowerCase().includes('mobile') && !payment.method.toLowerCase().includes('momo')).reduce((sum, payment) => sum + payment.amount, 0),
  received: datePayments.value.reduce((sum, payment) => sum + payment.amount, 0),
}))
const pettyExpensesToday = computed(() => pettyExpenses.value.filter((expense) => expense.date === today && expense.status === 'Recorded'))
const pettyTotalToday = computed(() => pettyExpensesToday.value.reduce((sum, expense) => sum + expense.amount, 0))
const cashPettyTotalToday = computed(() => pettyExpensesToday.value.filter((expense) => expense.method === 'Cash').reduce((sum, expense) => sum + expense.amount, 0))
const openingCashToday = computed(() => tillSessions.value.filter((till) => till.businessDate === today).reduce((sum, till) => sum + till.openingAmount, 0))
const expectedCashToday = computed(() => openingCashToday.value + paymentTotals.value.cash - cashPettyTotalToday.value)
const openTills = computed(() => tillSessions.value.filter((till) => till.status === 'Open'))
const filteredExpenses = computed(() => {
  const query = search.value.trim().toLowerCase()
  return pettyExpenses.value.filter((expense) => {
    const matchesQuery = !query || [expense.id, expense.category, expense.description, expense.payee, expense.reference || '', expense.cashier].some((value) => value.toLowerCase().includes(query))
    const matchesDate = dateFilter.value === 'All dates' || (dateFilter.value === 'Today' ? expense.date === today : expense.date === specificDate.value)
    return matchesQuery && matchesDate
  }).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
})

function money(value: number) {
  return `₱${value.toFixed(2)}`
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}
function resetExpenseForm() {
  expenseDate.value = today
  expenseCategory.value = 'Supplies'
  expenseDescription.value = ''
  expensePayee.value = ''
  expenseMethod.value = 'Cash'
  expenseAmount.value = ''
  expenseReference.value = ''
  expenseNotes.value = ''
  expenseError.value = ''
}
function recordExpense() {
  expenseError.value = ''
  const amount = Math.round(Number(expenseAmount.value) * 100) / 100
  if (!expenseDate.value || expenseDate.value > today || !expenseCategory.value || !expenseDescription.value.trim() || !expensePayee.value.trim() || !Number.isFinite(amount) || amount <= 0) {
    expenseError.value = 'Enter an expense date, category, description, payee, and amount greater than zero.'
    return
  }
  const expense: PettyExpense = {
    id: `PEX-${today.replaceAll('-', '')}-${Date.now().toString(36).toUpperCase()}`,
    date: expenseDate.value,
    category: expenseCategory.value,
    description: expenseDescription.value.trim(),
    payee: expensePayee.value.trim(),
    method: expenseMethod.value,
    amount,
    reference: expenseReference.value.trim() || undefined,
    notes: expenseNotes.value.trim() || undefined,
    status: 'Recorded',
    cashier: cashierName,
    recordedAt: new Date().toISOString(),
  }
  pettyExpenses.value.unshift(expense)
  notice.value = `${money(amount)} petty expense recorded.`
  showExpenseForm.value = false
  resetExpenseForm()
  window.setTimeout(() => { notice.value = '' }, 4500)
}
function startVoidExpense(expense: PettyExpense) {
  voidExpense.value = expense
  voidReason.value = ''
  voidError.value = ''
}
function confirmVoidExpense() {
  if (!voidExpense.value) return
  if (!voidReason.value.trim()) {
    voidError.value = 'Enter a reason to keep the audit record complete.'
    return
  }
  voidExpense.value.status = 'Voided'
  voidExpense.value.voidReason = voidReason.value.trim()
  voidExpense.value.voidedAt = new Date().toISOString()
  voidExpense.value = null
  voidReason.value = ''
}
function openTillForm() {
  tillBusinessDate.value = today
  tillName.value = ['Cash', 'Till 2', 'Till 3'].find((name) => !tillSessions.value.some((till) => till.name === name && till.businessDate === today && till.status === 'Open')) || 'Cash'
  tillOpeningAmount.value = ''
  tillOpeningNotes.value = ''
  tillError.value = ''
  showOpenTill.value = true
}
function createTill() {
  const openingAmount = Math.round(Number(tillOpeningAmount.value) * 100) / 100
  if (!tillBusinessDate.value || tillBusinessDate.value > today || !Number.isFinite(openingAmount) || openingAmount < 0) {
    tillError.value = 'Choose a valid business date and enter an opening cash amount.'
    return
  }
  if (tillSessions.value.some((till) => till.name === tillName.value && till.businessDate === tillBusinessDate.value && till.status === 'Open')) {
    tillError.value = 'This till is already open for the selected business date.'
    return
  }
  tillSessions.value.unshift({ id: `TILL-${Date.now().toString(36).toUpperCase()}`, businessDate: tillBusinessDate.value, name: tillName.value, openingAmount, openingNotes: tillOpeningNotes.value.trim() || undefined, openedBy: cashierName, openedAt: new Date().toISOString(), status: 'Open' })
  showOpenTill.value = false
  notice.value = `${tillName.value} opened with ${money(openingAmount)}.`
  window.setTimeout(() => { notice.value = '' }, 4500)
}
function expectedTillCash(till: TillSession) {
  const receipts = reservations.value.flatMap((reservation) => (reservation.payments || []).filter((payment) => payment.receivedAt.slice(0, 10) === till.businessDate && payment.method.toLowerCase() === 'cash')).reduce((sum, payment) => sum + payment.amount, 0)
  const expenses = pettyExpenses.value.filter((expense) => expense.date === till.businessDate && expense.method === 'Cash' && expense.status === 'Recorded').reduce((sum, expense) => sum + expense.amount, 0)
  return till.openingAmount + receipts - expenses
}
function startCloseTill(till: TillSession) {
  closingTill.value = till
  tillClosingAmount.value = expectedTillCash(till).toFixed(2)
  closeTillError.value = ''
}
function closeTill() {
  if (!closingTill.value) return
  const closingAmount = Math.round(Number(tillClosingAmount.value) * 100) / 100
  if (!Number.isFinite(closingAmount) || closingAmount < 0) {
    closeTillError.value = 'Enter the counted closing cash amount.'
    return
  }
  closingTill.value.closingAmount = closingAmount
  closingTill.value.closedAt = new Date().toISOString()
  closingTill.value.closedBy = cashierName
  closingTill.value.status = 'Closed'
  closingTill.value = null
}
function printExpenses() {
  window.print()
}
</script>

<template>
  <section>
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 class="font-serif text-[32px] font-medium tracking-[-0.035em] text-[#30243e] sm:text-[36px]">Cashiering</h1><p class="mt-2 text-[12px] text-[#748087]">Manage front desk tills and track petty cash expenses.</p></div><div class="flex items-center gap-2 rounded-md border border-[#e7dfed] bg-[#fffdfb] px-3 py-2 text-[10px] text-[#74647f]"><Clock3 :size="14" class="text-[#805ca0]" /> Business date · {{ formatDate(today) }}</div></div>

    <div v-if="notice" class="mt-4 flex items-center gap-2 rounded-md border border-[#d9e8de] bg-[#f3f8f4] px-3 py-2 text-[10px] text-[#4a7356]"><Check :size="14" />{{ notice }}</div>

    <div class="mt-7 overflow-hidden rounded-lg border border-[#e6e1e8] bg-[#fffdfb]">
      <div class="flex items-center justify-between gap-3 border-b border-[#ece7ee] px-4 py-3 sm:px-5"><div class="flex gap-1" role="tablist" aria-label="Cashiering views"><button v-for="tab in tabs" :key="tab" class="ledger-tab" :class="activeTab === tab ? 'ledger-tab-active' : ''" role="tab" :aria-selected="activeTab === tab" @click="activeTab = tab">{{ tab }}<span v-if="tab === 'Till'">{{ tillSessions.length }}</span><span v-else>{{ pettyExpenses.length }}</span></button></div><button v-if="activeTab === 'Till'" class="arrival-action-primary" @click="openTillForm"><Plus :size="13" /> Open till</button><div v-else class="flex gap-2"><button class="arrival-action" @click="printExpenses"><Printer :size="13" /> Print</button><button class="arrival-action-primary" @click="showExpenseForm = true; resetExpenseForm()"><Plus :size="13" /> Record petty expense</button></div></div>

      <template v-if="activeTab === 'Till'">
        <div class="flex flex-col gap-3 border-b border-[#ece7ee] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><label class="ledger-search"><Search :size="14" /><span class="sr-only">Search till records</span><input v-model="search" placeholder="Search cashier or business date" /></label><div class="flex flex-wrap items-center gap-2"><span class="flex items-center gap-1 text-[9px] text-[#8c858f]"><CalendarDays :size="12" /> Date:</span><button v-for="dateOption in (['All dates', 'Today'] as const)" :key="dateOption" class="date-mode-button" :class="dateFilter === dateOption ? 'date-mode-active' : ''" @click="dateFilter = dateOption">{{ dateOption }}</button></div></div>
        <section class="m-4 rounded-lg border border-[#e8e4e9] bg-[#fffdfb] p-4 sm:m-5 sm:p-5"><h2 class="text-[12px] font-semibold text-[#4d4355]">Cash and payments · {{ formatDate(today) }}</h2><div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5"><div class="cash-summary"><span>Holding</span><strong>{{ money(expectedCashToday) }}</strong></div><div class="cash-summary"><span>Received</span><strong>{{ money(paymentTotals.received) }}</strong></div><div class="cash-summary"><span>Forwarded</span><strong>{{ money(0) }}</strong></div><div class="cash-summary"><span>Cash sales</span><strong>{{ money(paymentTotals.cash) }}</strong></div><div class="cash-summary"><span>Petty expenses</span><strong class="text-[#9a6258]">{{ money(pettyTotalToday) }}</strong></div><div class="cash-summary"><span>Mobile money</span><strong>{{ money(paymentTotals.mobile) }}</strong></div><div class="cash-summary"><span>Card</span><strong>{{ money(paymentTotals.card) }}</strong></div><div class="cash-summary"><span>Other</span><strong>{{ money(paymentTotals.other) }}</strong></div><div class="cash-summary"><span>Open tills</span><strong>{{ openTills.length }}</strong></div><div class="cash-summary"><span>Cash difference</span><strong>{{ openTills.length ? '—' : money(0) }}</strong></div></div><p class="mt-4 border-t border-[#eee9ef] pt-3 text-[9px] text-[#938b98]">Cash holding = opening floats + cash receipts − cash petty expenses.</p></section>
        <div class="overflow-x-auto px-4 pb-4 sm:px-5"><table class="w-full min-w-190 border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-3">Business date</th><th class="reservation-head">Till</th><th class="reservation-head">Cashier</th><th class="reservation-head">Status</th><th class="reservation-head text-right">Opening float</th><th class="reservation-head text-right">Expected cash</th><th class="reservation-head text-right">Counted cash</th><th class="reservation-head pr-3 text-right">Action</th></tr></thead><tbody><tr v-for="till in tillSessions.filter((item) => (search === '' || [item.name, item.openedBy, item.businessDate].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))) && (dateFilter === 'All dates' || item.businessDate === today))" :key="till.id" class="reservation-row"><td class="reservation-cell pl-3 text-[#69767c]">{{ formatDate(till.businessDate) }}</td><td class="reservation-cell font-medium text-[#46565f]">{{ till.name }}</td><td class="reservation-cell text-[#69767c]">{{ till.openedBy }}</td><td class="reservation-cell"><span class="reservation-status" :class="till.status === 'Open' ? 'status-confirmed' : 'status-noshow'">{{ till.status }}</span></td><td class="reservation-cell text-right">{{ money(till.openingAmount) }}</td><td class="reservation-cell text-right">{{ money(expectedTillCash(till)) }}</td><td class="reservation-cell text-right">{{ till.closingAmount === undefined ? '—' : money(till.closingAmount) }}</td><td class="reservation-cell pr-3 text-right"><button v-if="till.status === 'Open'" class="arrival-action" @click="startCloseTill(till)">Close till</button><span v-else class="text-[9px] text-[#948b98]">Closed {{ till.closedBy }}</span></td></tr><tr v-if="tillSessions.length === 0"><td colspan="8" class="py-12 text-center"><p class="text-[11px] font-medium text-[#5c5264]">No till sessions recorded</p><p class="mt-1 text-[9px] text-[#948b98]">Open a till to record the starting cash float.</p></td></tr></tbody></table></div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-3 border-b border-[#ece7ee] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div class="flex flex-wrap items-center gap-2"><label class="ledger-search"><Search :size="14" /><span class="sr-only">Search petty expenses</span><input v-model="search" placeholder="Search expense, payee, reference" /></label><span class="text-[9px] text-[#8c858f]">{{ filteredExpenses.length }} records</span></div><div class="flex flex-wrap items-center gap-1.5"><span class="flex items-center gap-1 text-[9px] text-[#8c858f]"><CalendarDays :size="12" /> Date:</span><button v-for="dateOption in (['All dates', 'Today', 'Specific date'] as const)" :key="dateOption" class="date-mode-button" :class="dateFilter === dateOption ? 'date-mode-active' : ''" @click="dateFilter = dateOption">{{ dateOption }}</button><label v-if="dateFilter === 'Specific date'" class="date-input-label"><span class="sr-only">Expense date</span><input v-model="specificDate" type="date" class="date-input" /></label></div></div>
        <div class="grid grid-cols-2 gap-2 border-b border-[#ece7ee] bg-[#fcfafc] px-4 py-3 sm:grid-cols-4 sm:px-5"><div class="expense-summary"><span>Recorded expenses</span><strong>{{ filteredExpenses.filter((item) => item.status === 'Recorded').length }}</strong></div><div class="expense-summary"><span>Total outflow</span><strong>{{ money(filteredExpenses.filter((item) => item.status === 'Recorded').reduce((sum, item) => sum + item.amount, 0)) }}</strong></div><div class="expense-summary"><span>Paid in cash</span><strong>{{ money(filteredExpenses.filter((item) => item.status === 'Recorded' && item.method === 'Cash').reduce((sum, item) => sum + item.amount, 0)) }}</strong></div><div class="expense-summary"><span>Voided</span><strong>{{ filteredExpenses.filter((item) => item.status === 'Voided').length }}</strong></div></div>
        <div class="overflow-x-auto"><table class="w-full min-w-237.5 border-collapse text-left"><thead><tr class="bg-[#faf8fb]"><th class="reservation-head pl-5">Date</th><th class="reservation-head">Reference</th><th class="reservation-head">Category / description</th><th class="reservation-head">Payee</th><th class="reservation-head">Method</th><th class="reservation-head">Cashier</th><th class="reservation-head text-right">Amount</th><th class="reservation-head">Status</th><th class="reservation-head pr-5"></th></tr></thead><tbody><tr v-for="expense in filteredExpenses" :key="expense.id" class="reservation-row" :class="expense.status === 'Voided' ? 'folio-entry-inactive' : ''"><td class="reservation-cell pl-5 text-[#69767c]">{{ formatDate(expense.date) }}</td><td class="reservation-cell text-[#65428e]">{{ expense.reference || expense.id }}</td><td class="reservation-cell"><span class="font-medium text-[#46565f]">{{ expense.category }}</span><span class="block text-[8px] text-[#8b838f]">{{ expense.description }}<span v-if="expense.voidReason"> · Void: {{ expense.voidReason }}</span></span></td><td class="reservation-cell text-[#5f6d74]">{{ expense.payee }}</td><td class="reservation-cell text-[#69767c]">{{ expense.method }}</td><td class="reservation-cell text-[#69767c]">{{ expense.cashier }}</td><td class="reservation-cell text-right font-medium" :class="expense.status === 'Voided' ? 'line-through text-[#948b98]' : 'text-[#a25454]'">{{ money(expense.amount) }}</td><td class="reservation-cell"><span class="folio-entry-status" :class="expense.status === 'Voided' ? 'folio-entry-status-muted' : ''">{{ expense.status }}</span></td><td class="reservation-cell pr-5 text-right"><button v-if="expense.status === 'Recorded'" class="folio-row-action folio-void-button" @click="startVoidExpense(expense)">Void record</button></td></tr><tr v-if="filteredExpenses.length === 0"><td colspan="9" class="py-14 text-center"><FileText :size="18" class="mx-auto text-[#a79aaf]" /><p class="mt-2 text-[11px] font-medium text-[#5c5264]">No petty expenses recorded</p><p class="mt-1 text-[9px] text-[#948b98]">Use Record petty expense to add a cash or other payment outflow.</p></td></tr></tbody></table></div>
      </template>
    </div>
  </section>

  <div v-if="showExpenseForm" class="modal-backdrop" @click.self="showExpenseForm = false"><section class="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title"><header class="flex items-start justify-between border-b border-[#ece7ee] px-5 py-4"><div><p class="eyebrow">Cashiering · cash control</p><h2 id="expense-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Record petty expense</h2><p class="mt-1 text-[10px] text-[#7d7583]">Record an expense and keep the receipt details on file.</p></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close expense form" @click="showExpenseForm = false"><X :size="16" /></button></header><div class="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2"><label class="form-label">Expense date<input v-model="expenseDate" type="date" :max="today" class="form-input" /></label><label class="form-label">Category<select v-model="expenseCategory" class="form-input"><option>Supplies</option><option>Food &amp; beverage</option><option>Transport</option><option>Maintenance</option><option>Guest amenity</option><option>Staff expense</option><option>Other</option></select></label><label class="form-label sm:col-span-2">Description<input v-model="expenseDescription" class="form-input" placeholder="What was purchased or paid for?" /></label><label class="form-label">Paid to<input v-model="expensePayee" class="form-input" placeholder="Vendor or recipient" /></label><label class="form-label">Amount (₱)<input v-model="expenseAmount" type="number" min="0.01" step="0.01" class="form-input" placeholder="0.00" /></label><label class="form-label">Payment method<select v-model="expenseMethod" class="form-input"><option>Cash</option><option>Mobile money</option><option>Card</option><option>Bank transfer</option></select></label><label class="form-label">Receipt / reference<input v-model="expenseReference" class="form-input" placeholder="Receipt number (optional)" /></label><label class="form-label sm:col-span-2">Notes<textarea v-model="expenseNotes" class="form-input h-20 py-2" placeholder="Optional notes for the cashier log" /></label><p v-if="expenseError" class="sm:col-span-2 flex items-center gap-2 text-[10px] text-[#a25454]"><CircleAlert :size="13" />{{ expenseError }}</p></div><footer class="flex justify-end gap-2 border-t border-[#ece7ee] px-5 py-3"><button class="secondary-button" @click="showExpenseForm = false">Cancel</button><button class="arrival-action-primary" @click="recordExpense"><Check :size="13" /> Record expense</button></footer></section></div>

  <div v-if="voidExpense" class="modal-backdrop" @click.self="voidExpense = null"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="void-expense-title"><h2 id="void-expense-title" class="text-[13px] font-semibold text-[#493d50]">Void petty expense?</h2><p class="mt-1 text-[10px] text-[#807884]">{{ voidExpense.id }} · {{ voidExpense.description }} · {{ money(voidExpense.amount) }}</p><label class="form-label mt-4">Reason<input v-model="voidReason" class="form-input" placeholder="Reason required; record will be retained" /></label><p v-if="voidError" class="mt-2 text-[9px] text-[#a25454]">{{ voidError }}</p><div class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="voidExpense = null">Cancel</button><button class="folio-void-confirm" @click="confirmVoidExpense">Void record</button></div></section></div>

  <div v-if="showOpenTill" class="modal-backdrop" @click.self="showOpenTill = false"><section class="expense-modal" role="dialog" aria-modal="true" aria-labelledby="open-till-title"><header class="flex items-start justify-between border-b border-[#ece7ee] px-5 py-4"><div><p class="eyebrow">Cashiering · shift control</p><h2 id="open-till-title" class="mt-1 font-serif text-[22px] text-[#30243e]">Open front desk till</h2></div><button class="rounded-md p-1.5 text-[#8c858f] hover:bg-[#f4f0f5]" aria-label="Close till form" @click="showOpenTill = false"><X :size="16" /></button></header><div class="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2"><label class="form-label sm:col-span-2">Business date<input v-model="tillBusinessDate" type="date" :max="today" class="form-input" /></label><label class="form-label">Till<select v-model="tillName" class="form-input"><option>Cash</option><option>Till 2</option><option>Till 3</option></select></label><label class="form-label">Opening amount (₱)<input v-model="tillOpeningAmount" type="number" min="0" step="0.01" class="form-input" placeholder="0.00" /></label><label class="form-label sm:col-span-2">Notes (optional)<input v-model="tillOpeningNotes" class="form-input" placeholder="Opening float notes" /></label><p v-if="tillError" class="sm:col-span-2 text-[10px] text-[#a25454]">{{ tillError }}</p></div><footer class="flex justify-end gap-2 border-t border-[#ece7ee] px-5 py-3"><button class="secondary-button" @click="showOpenTill = false">Cancel</button><button class="arrival-action-primary" @click="createTill"><Check :size="13" /> Open shift</button></footer></section></div>

  <div v-if="closingTill" class="modal-backdrop" @click.self="closingTill = null"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="close-till-title"><h2 id="close-till-title" class="text-[13px] font-semibold text-[#493d50]">Close {{ closingTill.name }}?</h2><p class="mt-1 text-[10px] text-[#807884]">Expected cash: {{ money(expectedTillCash(closingTill)) }}</p><label class="form-label mt-4">Counted closing cash (₱)<input v-model="tillClosingAmount" type="number" min="0" step="0.01" class="form-input" /></label><p v-if="closeTillError" class="mt-2 text-[9px] text-[#a25454]">{{ closeTillError }}</p><div class="mt-4 flex justify-end gap-2"><button class="secondary-button" @click="closingTill = null">Cancel</button><button class="arrival-action-primary" @click="closeTill">Close till</button></div></section></div>
</template>
