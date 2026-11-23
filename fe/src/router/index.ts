import { createRouter, createWebHistory } from 'vue-router'
const RoomsView = () => import('@/features/front-office/views/RoomsView.vue')
const FrontOfficeCalendarView = () => import('@/features/front-office/views/ReservationsView.vue')
const DeskView = () => import('@/features/front-office/views/DeskView.vue')
const RoomTransferView = () => import('@/features/front-office/views/RoomTransferView.vue')
const InvoicesView = () => import('@/features/front-office/views/InvoicesView.vue')
const CashieringView = () => import('@/features/front-office/views/CashieringView.vue')
const ReportsView = () => import('@/features/front-office/views/ReportsView.vue')
const NightAuditView = () => import('@/features/front-office/views/NightAuditView.vue')
const ClientsView = () => import('@/features/front-office/views/ClientsView.vue')
const ServiceChargesView = () => import('@/features/front-office/views/ServiceChargesView.vue')
const RestaurantPosView = () => import('@/features/restaurant/views/RestaurantPosView.vue')
const RestaurantKitchenView = () => import('@/features/restaurant/views/RestaurantKitchenView.vue')
const RestaurantTransactionsView = () => import('@/features/restaurant/views/RestaurantTransactionsView.vue')
const RestaurantSuppliesView = () => import('@/features/restaurant/views/RestaurantSuppliesView.vue')
const RestaurantMenuView = () => import('@/features/restaurant/views/RestaurantMenuView.vue')
const RestaurantReportsView = () => import('@/features/restaurant/views/RestaurantReportsView.vue')
const HousekeepingFloorView = () => import('@/features/housekeeping/views/HousekeepingFloorView.vue')
const EventManagementView = () => import('@/features/events/views/EventManagementView.vue')
const EventGuestRatesView = () => import('@/features/events/views/EventGuestRatesView.vue')
const EventReportsView = () => import('@/features/events/views/EventReportsView.vue')
const HousekeepingWorkView = () => import('@/features/housekeeping/views/HousekeepingWorkView.vue')
const HousekeepingSuppliesView = () => import('@/features/housekeeping/views/HousekeepingSuppliesView.vue')
const HousekeepingStaffView = () => import('@/features/housekeeping/views/HousekeepingStaffView.vue')
const HousekeepingReportsView = () => import('@/features/housekeeping/views/HousekeepingReportsView.vue')
const ModulePlaceholder = () => import('@/features/shared/views/ModulePlaceholder.vue')
const PublicBookingView = () => import('@/features/public-booking/views/PublicBookingView.vue')
const AdminPortalLayout = () => import('@/features/admin/views/AdminPortalLayout.vue')
const AdminOverviewView = () => import('@/features/admin/views/AdminOverviewView.vue')
const AdminRecordsView = () => import('@/features/admin/views/AdminRecordsView.vue')
const AdminReservationsView = () => import('@/features/admin/views/AdminReservationsView.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/book', name: 'public-booking', component: PublicBookingView, meta: { public: true, title: 'Book a stay' } },
    { path: '/book/rooms', name: 'public-booking-rooms', component: PublicBookingView, meta: { public: true, title: 'Available rooms' } },
    { path: '/book/guest', name: 'public-booking-guest', component: PublicBookingView, meta: { public: true, title: 'Guest details' } },
    { path: '/book/success', name: 'public-booking-success', component: PublicBookingView, meta: { public: true, title: 'Reservation confirmed' } },
    { path: '/', redirect: '/rooms' },
    {
      path: '/admin',
      component: AdminPortalLayout,
      meta: { adminPortal: true },
      children: [
        { path: '', redirect: '/admin/overview' },
        { path: 'overview', name: 'admin-overview', component: AdminOverviewView, meta: { title: 'Overview' } },
        { path: 'rooms', name: 'admin-rooms', component: AdminRecordsView, meta: { title: 'Rooms', recordKey: 'rooms' } },
        { path: 'room-types', name: 'admin-room-types', component: AdminRecordsView, meta: { title: 'Room types', recordKey: 'roomTypes' } },
        { path: 'amenities', name: 'admin-amenities', component: AdminRecordsView, meta: { title: 'Amenities', recordKey: 'amenities' } },
        { path: 'rate-types', name: 'admin-rate-types', component: AdminRecordsView, meta: { title: 'Rate types', recordKey: 'rateTypes' } },
        { path: 'room-rates', name: 'admin-room-rates', component: AdminRecordsView, meta: { title: 'Room rates', recordKey: 'roomRates' } },
        { path: 'reservations', name: 'admin-reservations', component: AdminReservationsView, meta: { title: 'Reservations' } },
        { path: 'user-roles', name: 'admin-user-roles', component: AdminRecordsView, meta: { title: 'User roles', recordKey: 'userRoles' } },
        { path: 'preferences', name: 'admin-preferences', component: AdminRecordsView, meta: { title: 'Guest preferences', recordKey: 'preferences' } },
        { path: 'service-charges', name: 'admin-service-charges', component: AdminRecordsView, meta: { title: 'Service charges', recordKey: 'serviceCharges' } },
        { path: 'policies', name: 'admin-policies', component: AdminRecordsView, meta: { title: 'Policies', recordKey: 'policies' } },
      ],
    },
    { path: '/rooms', name: 'rooms', component: RoomsView },
    { path: '/reservations', name: 'reservations', component: AdminReservationsView },
    { path: '/calendar', name: 'calendar', component: FrontOfficeCalendarView },
    { path: '/desk', name: 'desk', component: DeskView },
    { path: '/room-transfers', name: 'room-transfers', component: RoomTransferView },
    { path: '/invoices', name: 'invoices', component: InvoicesView },
    { path: '/cashiering', name: 'cashiering', component: CashieringView },
    { path: '/reports', name: 'reports', component: ReportsView },
    { path: '/night-audit', name: 'night-audit', component: NightAuditView },
    { path: '/clients', name: 'clients', component: ClientsView },
    { path: '/charges', name: 'charges', component: ServiceChargesView },
    { path: '/restaurant/pos', name: 'restaurant-pos', component: RestaurantPosView },
    { path: '/restaurant/kitchen', name: 'restaurant-kitchen', component: RestaurantKitchenView },
    { path: '/restaurant/transactions', name: 'restaurant-transactions', component: RestaurantTransactionsView },
    { path: '/restaurant/supplies', name: 'restaurant-supplies', component: RestaurantSuppliesView },
    { path: '/restaurant/menu', name: 'restaurant-menu', component: RestaurantMenuView },
    { path: '/restaurant/reports', name: 'restaurant-reports', component: RestaurantReportsView },
    { path: '/housekeeping/floor', name: 'housekeeping-floor', component: HousekeepingFloorView },
    { path: '/housekeeping/work', name: 'housekeeping-work', component: HousekeepingWorkView },
    { path: '/housekeeping/supplies', name: 'housekeeping-supplies', component: HousekeepingSuppliesView },
    { path: '/housekeeping/staff', name: 'housekeeping-staff', component: HousekeepingStaffView },
    { path: '/housekeeping/reports', name: 'housekeeping-reports', component: HousekeepingReportsView },
    { path: '/events/management', name: 'events-management', component: EventManagementView },
    { path: '/events/guest-rates', name: 'events-guest-rates', component: EventGuestRatesView },
    { path: '/events/reports', name: 'events-reports', component: EventReportsView },
    { path: '/:pathMatch(.*)*', component: ModulePlaceholder },
  ],
})

export default router
