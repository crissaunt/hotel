import { reactive } from 'vue'

export type AdminRecord = Record<string, string>
export type RecordKey = 'rooms' | 'roomTypes' | 'amenities' | 'rateTypes' | 'roomRates' | 'preferences' | 'serviceCharges' | 'policies' | 'userRoles'
export type AdminField = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'select'; options?: string[]; required?: boolean; placeholder?: string }
export type AdminModule = { title: string; description: string; singular: string; fields: AdminField[]; columns: string[]; searchKeys: string[] }

export const adminModules: Record<RecordKey, AdminModule> = {
  rooms: {
    title: 'Rooms', singular: 'room', description: 'Manage physical room inventory and its operational availability.',
    fields: [
      { key: 'number', label: 'Room number', required: true }, { key: 'type', label: 'Room type', type: 'select', options: ['Standard King', 'Deluxe Twin', 'Garden Suite', 'Family Room'], required: true },
      { key: 'floor', label: 'Floor', type: 'number', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['Ready', 'Occupied', 'Needs cleaning', 'Out of service'] }, { key: 'view', label: 'View / location' },
    ], columns: ['number', 'type', 'floor', 'status', 'view'], searchKeys: ['number', 'type', 'status', 'view'],
  },
  roomTypes: {
    title: 'Room types', singular: 'room type', description: 'Define sellable room categories, capacity, and standard features.',
    fields: [{ key: 'name', label: 'Room type name', required: true }, { key: 'code', label: 'Short code', required: true }, { key: 'occupancy', label: 'Max occupancy', type: 'number', required: true }, { key: 'bed', label: 'Bed setup' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }],
    columns: ['name', 'code', 'occupancy', 'bed', 'status'], searchKeys: ['name', 'code', 'bed', 'status'],
  },
  amenities: {
    title: 'Amenities', singular: 'amenity', description: 'Maintain the amenities available in rooms and guest areas.',
    fields: [{ key: 'name', label: 'Amenity', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['In-room', 'Bathroom', 'Technology', 'Property'] }, { key: 'location', label: 'Applies to' }, { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Seasonal', 'Unavailable'] }],
    columns: ['name', 'category', 'location', 'status'], searchKeys: ['name', 'category', 'location'],
  },
  rateTypes: {
    title: 'Rate types', singular: 'rate type', description: 'Set the commercial rules used by room rate plans.',
    fields: [{ key: 'name', label: 'Rate type', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'payment', label: 'Payment terms', type: 'select', options: ['Flexible', 'Prepaid', 'Company account'] }, { key: 'cancellation', label: 'Cancellation window' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }],
    columns: ['name', 'code', 'payment', 'cancellation', 'status'], searchKeys: ['name', 'code', 'payment', 'cancellation'],
  },
  roomRates: {
    title: 'Room rates', singular: 'room rate', description: 'Set nightly prices by room type, rate plan, and effective date.',
    fields: [{ key: 'roomType', label: 'Room type', type: 'select', options: ['Standard King', 'Deluxe Twin', 'Garden Suite', 'Family Room'], required: true }, { key: 'rateType', label: 'Rate type', type: 'select', options: ['Best available', 'Advance purchase', 'Corporate'] }, { key: 'amount', label: 'Nightly rate', type: 'number', required: true }, { key: 'from', label: 'Valid from', type: 'date' }, { key: 'to', label: 'Valid until', type: 'date' }],
    columns: ['roomType', 'rateType', 'amount', 'from', 'to'], searchKeys: ['roomType', 'rateType', 'from', 'to'],
  },
  preferences: {
    title: 'Guest preferences', singular: 'preference', description: 'Record guest requests to help personalize future stays.',
    fields: [{ key: 'guest', label: 'Guest name', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Room setup', 'Dietary', 'Accessibility', 'Communication'] }, { key: 'preference', label: 'Preference', required: true }, { key: 'scope', label: 'Applies to', type: 'select', options: ['All stays', 'Next stay only'] }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Archived'] }],
    columns: ['guest', 'category', 'preference', 'scope', 'status'], searchKeys: ['guest', 'category', 'preference', 'scope'],
  },
  serviceCharges: {
    title: 'Service charges', singular: 'service charge', description: 'Manage charge codes that can be posted to a guest folio.',
    fields: [{ key: 'name', label: 'Charge name', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'department', label: 'Department', type: 'select', options: ['Front office', 'Restaurant', 'Spa', 'Other'] }, { key: 'amount', label: 'Default amount', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }],
    columns: ['name', 'code', 'department', 'amount', 'status'], searchKeys: ['name', 'code', 'department', 'status'],
  },
  policies: {
    title: 'Policies', singular: 'policy', description: 'Keep front office guidance for arrivals, stays, and departures in one place.',
    fields: [{ key: 'name', label: 'Policy name', required: true }, { key: 'category', label: 'Category', type: 'select', options: ['Check-in', 'Check-out', 'Payment', 'Guest conduct', 'Other'] }, { key: 'summary', label: 'Summary', required: true }, { key: 'owner', label: 'Responsible team' }, { key: 'status', label: 'Status', type: 'select', options: ['Published', 'Draft', 'Archived'] }],
    columns: ['name', 'category', 'summary', 'owner', 'status'], searchKeys: ['name', 'category', 'summary', 'owner', 'status'],
  },
  userRoles: {
    title: 'User roles', singular: 'user role', description: 'Define what each front office role can see and manage in CTHM Hotel.',
    fields: [
      { key: 'name', label: 'Role name', required: true }, { key: 'code', label: 'Role code', required: true },
      { key: 'level', label: 'Access level', type: 'select', options: ['Administrator', 'Manager', 'Supervisor', 'Staff'], required: true },
      { key: 'scope', label: 'Permission scope', type: 'select', options: ['All front office modules', 'Reservations & guest records', 'Rooms & housekeeping', 'Cashiering & reports', 'Read-only front office'], required: true },
      { key: 'assigned', label: 'Assigned users', type: 'number' }, { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
    columns: ['name', 'code', 'level', 'scope', 'assigned', 'status'], searchKeys: ['name', 'code', 'level', 'scope', 'status'],
  },
}

export const adminRecords = reactive<Record<RecordKey, AdminRecord[]>>({
  rooms: [
    { number: '101', type: 'Standard King', floor: '1', status: 'Ready', view: 'Courtyard' },
    { number: '102', type: 'Standard King', floor: '1', status: 'Occupied', view: 'Courtyard' },
    { number: '203', type: 'Deluxe Twin', floor: '2', status: 'Needs cleaning', view: 'Garden' },
    { number: '301', type: 'Garden Suite', floor: '3', status: 'Ready', view: 'Garden' },
  ],
  roomTypes: [
    { name: 'Standard King', code: 'STD-K', occupancy: '2', bed: '1 king', status: 'Active' },
    { name: 'Deluxe Twin', code: 'DLX-T', occupancy: '2', bed: '2 twins', status: 'Active' },
    { name: 'Garden Suite', code: 'STE-G', occupancy: '3', bed: '1 king + sofa', status: 'Active' },
    { name: 'Family Room', code: 'FAM', occupancy: '4', bed: '1 king + 2 twins', status: 'Active' },
  ],
  amenities: [
    { name: 'High-speed Wi-Fi', category: 'Technology', location: 'All rooms', status: 'Available' },
    { name: 'Breakfast service', category: 'Property', location: 'Dining room', status: 'Available' },
    { name: 'Accessible shower', category: 'Bathroom', location: 'Rooms 104, 204', status: 'Available' },
  ],
  rateTypes: [
    { name: 'Best available', code: 'BAR', payment: 'Flexible', cancellation: 'Until 24 hours before arrival', status: 'Active' },
    { name: 'Advance purchase', code: 'ADV', payment: 'Prepaid', cancellation: 'Non-refundable', status: 'Active' },
    { name: 'Corporate', code: 'CORP', payment: 'Company account', cancellation: 'Until 18:00 day before', status: 'Active' },
  ],
  roomRates: [
    { roomType: 'Standard King', rateType: 'Best available', amount: '242', from: '2026-01-01', to: '2026-12-31' },
    { roomType: 'Deluxe Twin', rateType: 'Best available', amount: '318', from: '2026-01-01', to: '2026-12-31' },
    { roomType: 'Garden Suite', rateType: 'Corporate', amount: '726', from: '2026-01-01', to: '2026-12-31' },
  ],
  preferences: [
    { guest: 'Zakaria Yakubu', category: 'Room setup', preference: 'Extra firm pillows', scope: 'All stays', status: 'Active' },
    { guest: 'Difa Amenyo', category: 'Dietary', preference: 'Vegetarian breakfast', scope: 'All stays', status: 'Active' },
    { guest: 'Selorm Dzokoto', category: 'Communication', preference: 'Email receipts', scope: 'All stays', status: 'Active' },
  ],
  serviceCharges: [
    { name: 'Late checkout', code: 'LCO', department: 'Front office', amount: '45', status: 'Active' },
    { name: 'Airport transfer', code: 'AIR', department: 'Front office', amount: '60', status: 'Active' },
    { name: 'Breakfast', code: 'BFST', department: 'Restaurant', amount: '18', status: 'Active' },
  ],
  policies: [
    { name: 'Standard check-in', category: 'Check-in', summary: 'Guest identification required at arrival.', owner: 'Front office', status: 'Published' },
    { name: 'Guarantee and deposit', category: 'Payment', summary: 'Secure a payment guarantee before key issue.', owner: 'Front office', status: 'Published' },
    { name: 'Late checkout', category: 'Check-out', summary: 'Confirm availability and apply charge code when applicable.', owner: 'Front office', status: 'Draft' },
  ],
  userRoles: [
    { name: 'System administrator', code: 'SYS-ADMIN', level: 'Administrator', scope: 'All front office modules', assigned: '1', status: 'Active' },
    { name: 'Front office manager', code: 'FO-MGR', level: 'Manager', scope: 'All front office modules', assigned: '2', status: 'Active' },
    { name: 'Receptionist', code: 'FO-DESK', level: 'Staff', scope: 'Reservations & guest records', assigned: '5', status: 'Active' },
    { name: 'Night auditor', code: 'FO-AUDIT', level: 'Supervisor', scope: 'Cashiering & reports', assigned: '2', status: 'Active' },
    { name: 'Housekeeping supervisor', code: 'HK-SUP', level: 'Supervisor', scope: 'Rooms & housekeeping', assigned: '1', status: 'Active' },
  ],
})
