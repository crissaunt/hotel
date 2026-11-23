import { ref } from 'vue'

export type HousekeepingStockItem = {
  code: string
  item: string
  category: 'Housekeeping' | 'Food & Produce' | 'Beverages' | 'Guest Amenities' | 'Cleaning'
  onHand: number
  reorder: number
  min: number
  max: number
  unit: string
  status: 'Active' | 'Inactive'
}

export const housekeepingStock = ref<HousekeepingStockItem[]>([
  { code: 'STK-113', item: 'Bath Towels', category: 'Housekeeping', onHand: 0, reorder: 40, min: 30, max: 150, unit: 'Piece', status: 'Active' },
  { code: 'STK-118', item: 'Beans (50kg bag)', category: 'Food & Produce', onHand: 0, reorder: 2, min: 1, max: 10, unit: 'Bag', status: 'Active' },
  { code: 'STK-114', item: 'Bed Sheets (queen)', category: 'Housekeeping', onHand: 0, reorder: 30, min: 20, max: 120, unit: 'Piece', status: 'Active' },
  { code: 'STK-111', item: 'Bottled Water 500ml (carton of 24)', category: 'Beverages', onHand: 0, reorder: 10, min: 6, max: 60, unit: 'Carton', status: 'Active' },
  { code: 'STK-102', item: 'Chicken (whole)', category: 'Food & Produce', onHand: 0, reorder: 25, min: 15, max: 100, unit: 'Kilogram', status: 'Active' },
  { code: 'STK-110', item: 'Club Beer (crate of 24)', category: 'Beverages', onHand: 0, reorder: 8, min: 5, max: 30, unit: 'Crate', status: 'Active' },
  { code: 'STK-104', item: 'Cooking Oil', category: 'Food & Produce', onHand: 0, reorder: 12, min: 8, max: 60, unit: 'Litre', status: 'Active' },
  { code: 'STK-107', item: 'Flour (25kg bag)', category: 'Food & Produce', onHand: 0, reorder: 4, min: 3, max: 20, unit: 'Bag', status: 'Active' },
  { code: 'STK-106', item: 'Fresh Tilapia', category: 'Food & Produce', onHand: 0, reorder: 12, min: 8, max: 50, unit: 'Kilogram', status: 'Active' },
  { code: 'STK-115', item: 'Hand Soap', category: 'Guest Amenities', onHand: 0, reorder: 50, min: 30, max: 200, unit: 'Piece', status: 'Active' },
  { code: 'STK-116', item: 'Laundry Detergent', category: 'Cleaning', onHand: 0, reorder: 10, min: 5, max: 40, unit: 'Kilogram', status: 'Active' },
  { code: 'STK-117', item: 'Shampoo (single use)', category: 'Guest Amenities', onHand: 0, reorder: 60, min: 40, max: 240, unit: 'Piece', status: 'Active' },
  { code: 'STK-101', item: 'Star Beer (bottle)', category: 'Beverages', onHand: 0, reorder: 12, min: 6, max: 96, unit: 'Piece', status: 'Active' },
  { code: 'STK-109', item: 'Toilet Paper', category: 'Housekeeping', onHand: 0, reorder: 40, min: 20, max: 160, unit: 'Roll', status: 'Active' },
  { code: 'STK-105', item: 'Tomatoes', category: 'Food & Produce', onHand: 0, reorder: 10, min: 5, max: 40, unit: 'Kilogram', status: 'Active' },
  { code: 'STK-103', item: 'White Rice (50kg bag)', category: 'Food & Produce', onHand: 0, reorder: 5, min: 3, max: 25, unit: 'Bag', status: 'Active' },
  { code: 'STK-120', item: 'Window Cleaner', category: 'Cleaning', onHand: 0, reorder: 6, min: 3, max: 24, unit: 'Litre', status: 'Active' },
  { code: 'STK-112', item: 'Bath Mat', category: 'Housekeeping', onHand: 0, reorder: 20, min: 10, max: 80, unit: 'Piece', status: 'Active' },
  { code: 'STK-119', item: 'Room Slippers', category: 'Guest Amenities', onHand: 0, reorder: 30, min: 20, max: 100, unit: 'Pair', status: 'Active' },
])

export type HousekeepingRoomKitItem = { itemCode: string; quantity: number }
export type HousekeepingRoomKit = { roomType: string; turnover: HousekeepingRoomKitItem[]; stayover: HousekeepingRoomKitItem[] }
export const housekeepingRoomKits = ref<HousekeepingRoomKit[]>([
  { roomType: 'Standard', turnover: [], stayover: [] },
  { roomType: 'Deluxe', turnover: [], stayover: [] },
  { roomType: 'Executive', turnover: [], stayover: [] },
])

export type HousekeepingRequisition = { id: string; itemCode: string; item: string; quantity: number; requestedBy: string; status: 'Pending' | 'Approved' | 'Received' }
export const housekeepingRequisitions = ref<HousekeepingRequisition[]>([])

export type ExtraSupplyRequest = { id: string; itemCode: string; item: string; quantity: number; destination: string; requestedBy: string; status: 'Pending approval' | 'Approved' | 'Rejected' }
export type HousekeepingStockReturn = { id: string; itemCode: string; item: string; quantity: number; returnedBy: string; condition: 'Unused' | 'Damaged'; date: string }

export const housekeepingExtraSupplyRequests = ref<ExtraSupplyRequest[]>([])
export const housekeepingStockReturns = ref<HousekeepingStockReturn[]>([])
