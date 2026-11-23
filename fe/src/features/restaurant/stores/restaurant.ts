import { ref } from 'vue'

export type MenuCategory = 'Food' | 'Beverage' | 'Dessert' | 'Snack'
export type KitchenStation = 'Kitchen' | 'Bar'
export type RestaurantInventoryItem = { id: string; name: string; category: string; onHand: number; reorderPoint: number; min: number; max: number; unit: string; location?: string; active: boolean }
export type RestaurantStockMovement = { id: string; inventoryItemId: string; itemName: string; quantity: number; unit: string; reference: string; usedAt: string }
export type MenuItem = { id: string; name: string; category: MenuCategory; price: number; cost?: number; prepMinutes?: number; unit?: string; station: KitchenStation; available: boolean; inventoryItemId?: string }
export type RestaurantOrderLine = { id: string; menuItemId: string; inventoryItemId?: string; stockDeducted?: boolean; name: string; category: MenuCategory; station: KitchenStation; quantity: number; unitPrice: number; note?: string; status: 'New' | 'Cooking' | 'Ready' | 'Served' }
export type RestaurantPayment = { method: 'Cash' | 'Visa' | 'Visa Debit' | 'Mastercard' | 'GCash' | 'Maya' | 'Bank Transfer' | 'Bill to Room'; amount: number }
export type RestaurantOrder = {
  id: string
  tableId: string
  venue: 'Restaurant' | 'Bar'
  orderType: 'Dine-in' | 'Room service' | 'Takeaway'
  source: 'Walk-in' | 'In-house'
  guestName: string
  room?: string
  reservationId?: string
  waiter: string
  lines: RestaurantOrderLine[]
  subtotal: number
  placedAt: string
  status: 'Open' | 'Paid'
  paymentMethod?: string
  payments?: RestaurantPayment[]
  gratuity?: number
  cashReceived?: number
  changeDue?: number
  folioChargeId?: string
  isDemo?: boolean
}

export const restaurantMenu = ref<MenuItem[]>([
  { id: 'FOOD-001', name: 'Jollof Rice & Chicken', category: 'Food', price: 85, cost: 28, prepMinutes: 15, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-001' },
  { id: 'FOOD-002', name: 'Banku & Tilapia', category: 'Food', price: 95, prepMinutes: 20, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-002' },
  { id: 'FOOD-003', name: 'Waakye with Stew', category: 'Food', price: 65, prepMinutes: 15, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-003' },
  { id: 'FOOD-004', name: 'Fufu & Light Soup', category: 'Food', price: 75, prepMinutes: 20, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-004' },
  { id: 'FOOD-005', name: 'Club Sandwich', category: 'Food', price: 70, prepMinutes: 12, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-005' },
  { id: 'FOOD-006', name: 'Continental Breakfast', category: 'Food', price: 95, prepMinutes: 15, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-FOOD-006' },
  { id: 'BEV-001', name: 'Star Beer (Bottle)', category: 'Beverage', price: 25, prepMinutes: 3, unit: 'Bottle', station: 'Bar', available: true, inventoryItemId: 'STK-109' },
  { id: 'BEV-002', name: 'Club Beer (Bottle)', category: 'Beverage', price: 25, prepMinutes: 3, unit: 'Bottle', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-002' },
  { id: 'BEV-003', name: 'Gin & Tonic', category: 'Beverage', price: 40, prepMinutes: 3, unit: 'Glass', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-003' },
  { id: 'BEV-004', name: 'Red Wine (Glass)', category: 'Beverage', price: 55, prepMinutes: 3, unit: 'Glass', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-004' },
  { id: 'BEV-005', name: 'Fresh Fruit Juice', category: 'Beverage', price: 30, prepMinutes: 5, unit: 'Glass', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-005' },
  { id: 'BEV-006', name: 'Soft Drink (Can)', category: 'Beverage', price: 15, prepMinutes: 3, unit: 'Can', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-006' },
  { id: 'BEV-007', name: 'Water (500ml)', category: 'Beverage', price: 10, prepMinutes: 3, unit: 'Bottle', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-007' },
  { id: 'BEV-008', name: 'Coffee', category: 'Beverage', price: 25, prepMinutes: 5, unit: 'Cup', station: 'Bar', available: true, inventoryItemId: 'STK-BEV-008' },
  { id: 'DES-001', name: 'Chocolate Cake', category: 'Dessert', price: 40, prepMinutes: 3, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-DES-001' },
  { id: 'SNK-001', name: 'Kelewele', category: 'Snack', price: 30, prepMinutes: 12, unit: 'Portion', station: 'Kitchen', available: true, inventoryItemId: 'STK-SNK-001' },
])

export const restaurantTables = ref([
  { id: 'T1', name: 'Table 1', venue: 'Restaurant' as const, seats: 4 },
  { id: 'T2', name: 'Table 2', venue: 'Restaurant' as const, seats: 4 },
  { id: 'T3', name: 'Table 3', venue: 'Restaurant' as const, seats: 2 },
  { id: 'T4', name: 'Table 4', venue: 'Restaurant' as const, seats: 6 },
  { id: 'T5', name: 'Table 5', venue: 'Restaurant' as const, seats: 4 },
  { id: 'B1', name: 'Bar 1', venue: 'Bar' as const, seats: 2 },
  { id: 'B2', name: 'Bar 2', venue: 'Bar' as const, seats: 2 },
  { id: 'T8', name: 'Bar Table 8', venue: 'Bar' as const, seats: 4 },
])

function sampleOrder(id: string, tableId: string, venue: 'Restaurant' | 'Bar', time: string, waiter: string, items: Array<[string, string, MenuCategory, KitchenStation, number, number]>, paymentMethod: string): RestaurantOrder {
  const lines: RestaurantOrderLine[] = items.map(([menuItemId, name, category, station, quantity, unitPrice], index) => ({ id: `${id}-${index + 1}`, menuItemId, name, category, station, quantity, unitPrice, status: 'Served' }))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return { id, tableId, venue, orderType: 'Dine-in', source: 'Walk-in', guestName: 'Walk-in guest', waiter, lines, subtotal: lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0), placedAt: `${today}T${time}:00+08:00`, status: 'Paid', paymentMethod, isDemo: true }
}

// Sample tickets are clearly labeled so the MVP ledger is useful before live POS orders exist.
export const restaurantOrders = ref<RestaurantOrder[]>([
  sampleOrder('FB-0901', 'T2', 'Restaurant', '12:18', 'Mavis Anane', [['FOOD-001', 'Jollof Rice & Chicken', 'Food', 'Kitchen', 1, 85], ['FOOD-002', 'Banku & Tilapia', 'Food', 'Kitchen', 1, 95], ['BEV-001', 'Star Beer (Bottle)', 'Beverage', 'Bar', 2, 25]], 'Cash'),
  sampleOrder('FB-0902', 'T5', 'Restaurant', '13:06', 'Efua Quaye', [['FOOD-004', 'Fufu & Light Soup', 'Food', 'Kitchen', 2, 75], ['FOOD-003', 'Waakye with Stew', 'Food', 'Kitchen', 2, 65], ['BEV-005', 'Fresh Fruit Juice', 'Beverage', 'Bar', 4, 30]], 'Card'),
  sampleOrder('FB-0903', 'T3', 'Restaurant', '14:25', 'Kofi Adjei', [['FOOD-005', 'Club Sandwich', 'Food', 'Kitchen', 1, 70], ['BEV-006', 'Soft Drink (Can)', 'Beverage', 'Bar', 1, 15]], 'GCash'),
  sampleOrder('FB-0904', 'B1', 'Bar', '16:42', 'Selasi Agbeko', [['BEV-002', 'Club Beer (Bottle)', 'Beverage', 'Bar', 2, 25], ['BEV-008', 'Coffee', 'Beverage', 'Bar', 1, 25]], 'Cash'),
])
export const restaurantTillOpen = ref(false)
export const restaurantStockMovements = ref<RestaurantStockMovement[]>([])
export const restaurantInventory = ref<RestaurantInventoryItem[]>([
  { id: 'STK-FOOD-001', name: 'Jollof Rice & Chicken', category: 'Food', onHand: 34, reorderPoint: 10, min: 5, max: 80, unit: 'Portion', active: true },
  { id: 'STK-FOOD-002', name: 'Banku & Tilapia', category: 'Food', onHand: 18, reorderPoint: 8, min: 4, max: 40, unit: 'Portion', active: true },
  { id: 'STK-FOOD-003', name: 'Waakye with Stew', category: 'Food', onHand: 26, reorderPoint: 10, min: 5, max: 60, unit: 'Portion', active: true },
  { id: 'STK-FOOD-004', name: 'Fufu & Light Soup', category: 'Food', onHand: 20, reorderPoint: 8, min: 4, max: 45, unit: 'Portion', active: true },
  { id: 'STK-FOOD-005', name: 'Club Sandwich', category: 'Food', onHand: 22, reorderPoint: 8, min: 4, max: 48, unit: 'Portion', active: true },
  { id: 'STK-FOOD-006', name: 'Continental Breakfast', category: 'Food', onHand: 16, reorderPoint: 6, min: 3, max: 36, unit: 'Portion', active: true },
  { id: 'STK-109', name: 'Star Beer (bottle)', category: 'Beverages', onHand: 23, reorderPoint: 12, min: 6, max: 96, unit: 'Piece', active: true },
  { id: 'STK-BEV-002', name: 'Club Beer (bottle)', category: 'Beverages', onHand: 36, reorderPoint: 12, min: 6, max: 96, unit: 'Bottle', active: true },
  { id: 'STK-BEV-003', name: 'Gin & Tonic', category: 'Beverages', onHand: 28, reorderPoint: 10, min: 5, max: 60, unit: 'Glass', active: true },
  { id: 'STK-BEV-004', name: 'Red Wine (Glass)', category: 'Beverages', onHand: 30, reorderPoint: 12, min: 6, max: 60, unit: 'Glass', active: true },
  { id: 'STK-BEV-005', name: 'Fresh Fruit Juice', category: 'Beverages', onHand: 28, reorderPoint: 10, min: 5, max: 60, unit: 'Glass', active: true },
  { id: 'STK-BEV-006', name: 'Soft Drink (can)', category: 'Beverages', onHand: 48, reorderPoint: 18, min: 8, max: 120, unit: 'Can', active: true },
  { id: 'STK-BEV-007', name: 'Water (500ml)', category: 'Beverages', onHand: 60, reorderPoint: 20, min: 10, max: 144, unit: 'Bottle', active: true },
  { id: 'STK-BEV-008', name: 'Coffee', category: 'Beverages', onHand: 40, reorderPoint: 15, min: 8, max: 100, unit: 'Cup', active: true },
  { id: 'STK-DES-001', name: 'Chocolate Cake', category: 'Food', onHand: 16, reorderPoint: 6, min: 3, max: 36, unit: 'Slice', active: true },
  { id: 'STK-SNK-001', name: 'Kelewele', category: 'Food', onHand: 24, reorderPoint: 8, min: 4, max: 48, unit: 'Portion', active: true },
  { id: 'STK-108', name: 'Star Beer (crate of 24)', category: 'Beverages', onHand: 3, reorderPoint: 8, min: 5, max: 30, unit: 'Crate', active: true },
])

export function availableRestaurantStock(inventoryItemId: string) {
  const item = restaurantInventory.value.find((entry) => entry.id === inventoryItemId)
  if (!item) return 0
  const reserved = restaurantOrders.value
    .filter((order) => order.status !== 'Paid')
    .flatMap((order) => order.lines)
    .filter((line) => line.inventoryItemId === inventoryItemId && !line.stockDeducted)
    .reduce((total, line) => total + line.quantity, 0)
  return Math.max(0, item.onHand - reserved)
}

export function deductRestaurantStock(inventoryItemId: string, quantity: number, reference: string) {
  const item = restaurantInventory.value.find((entry) => entry.id === inventoryItemId)
  if (!item || item.onHand < quantity) return false
  item.onHand -= quantity
  restaurantStockMovements.value.unshift({ id: `${reference}-${inventoryItemId}`, inventoryItemId, itemName: item.name, quantity, unit: item.unit, reference, usedAt: new Date().toISOString() })
  return true
}
