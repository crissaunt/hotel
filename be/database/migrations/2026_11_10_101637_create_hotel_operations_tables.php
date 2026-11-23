<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_members', function (Blueprint $table) {
            $table->id();
            $table->string('staff_number')->unique();
            $table->string('name');
            $table->string('department');
            $table->string('role');
            $table->string('status')->default('Active');
            $table->timestamps();
        });

        Schema::create('housekeeping_tasks', function (Blueprint $table) {
            $table->id();
            $table->string('task_number')->unique();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area_name')->nullable();
            $table->string('job');
            $table->string('category');
            $table->string('status')->default('Pending');
            $table->foreignId('assigned_to')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->string('priority')->default('Medium');
            $table->unsignedSmallInteger('estimated_minutes')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['status', 'priority']);
            $table->index(['room_id', 'created_at']);
        });

        Schema::create('housekeeping_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inspector_id')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->unsignedSmallInteger('score');
            $table->text('note')->nullable();
            $table->timestamp('inspected_at');
            $table->timestamps();
        });

        Schema::create('housekeeping_public_areas', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('task_state')->default('Clean');
            $table->foreignId('updated_by')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->timestamp('state_updated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('room_shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_member_id')->constrained()->cascadeOnDelete();
            $table->string('shift');
            $table->string('label')->nullable();
            $table->timestamps();
        });

        Schema::create('room_shift_assignment_rooms', function (Blueprint $table) {
            $table->foreignId('room_shift_assignment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->primary(['room_shift_assignment_id', 'room_id']);
        });

        Schema::create('maintenance_requests', function (Blueprint $table) {
            $table->id();
            $table->string('request_number')->unique();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->string('area_name')->nullable();
            $table->string('category');
            $table->string('priority')->default('Normal');
            $table->string('status')->default('Reported');
            $table->text('description');
            $table->foreignId('assigned_to')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->timestamp('reported_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'priority']);
        });

        Schema::create('maintenance_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_request_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->string('cost_centre')->default('Maintenance');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->date('cost_date');
            $table->foreignId('technician_id')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->timestamp('recorded_at');
            $table->timestamps();
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category');
            $table->decimal('on_hand', 12, 3)->default(0);
            $table->decimal('reorder_point', 12, 3)->default(0);
            $table->decimal('minimum_stock', 12, 3)->default(0);
            $table->decimal('maximum_stock', 12, 3)->nullable();
            $table->string('unit');
            $table->string('location')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
            $table->index(['category', 'status']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('movement_type');
            $table->decimal('quantity', 12, 3);
            $table->string('unit');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['inventory_item_id', 'occurred_at']);
        });

        Schema::create('inventory_requisitions', function (Blueprint $table) {
            $table->id();
            $table->string('requisition_number')->unique();
            $table->string('department')->default('Housekeeping');
            $table->foreignId('requested_by')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('Pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_requisition_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_requisition_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity_requested', 12, 3);
            $table->decimal('quantity_received', 12, 3)->default(0);
            $table->timestamps();
        });

        Schema::create('inventory_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number')->unique();
            $table->foreignId('inventory_item_id')->constrained()->restrictOnDelete();
            $table->foreignId('returned_by')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->decimal('quantity', 12, 3);
            $table->string('condition');
            $table->date('returned_on');
            $table->timestamps();
        });

        Schema::create('room_type_supply_kits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_type_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inventory_item_id')->constrained()->restrictOnDelete();
            $table->string('service_type');
            $table->decimal('quantity', 12, 3);
            $table->timestamps();
            $table->unique(['room_type_id', 'inventory_item_id', 'service_type']);
        });

        Schema::create('restaurant_tables', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('venue');
            $table->unsignedSmallInteger('seats');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category');
            $table->decimal('price', 12, 2);
            $table->decimal('cost', 12, 2)->nullable();
            $table->unsignedSmallInteger('prep_minutes')->nullable();
            $table->string('unit')->nullable();
            $table->string('station')->default('Kitchen');
            $table->foreignId('inventory_item_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });

        Schema::create('restaurant_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->foreignId('restaurant_table_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('folio_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('waiter_id')->nullable()->constrained('staff_members')->nullOnDelete();
            $table->string('venue');
            $table->string('order_type');
            $table->string('source')->default('Walk-in');
            $table->string('guest_name')->nullable();
            $table->string('room_number')->nullable();
            $table->string('status')->default('Open');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('gratuity', 12, 2)->default(0);
            $table->decimal('change_due', 12, 2)->default(0);
            $table->timestamp('placed_at');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'placed_at']);
        });

        Schema::create('restaurant_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('inventory_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('item_name');
            $table->string('category');
            $table->string('station');
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 12, 2);
            $table->string('status')->default('New');
            $table->boolean('stock_deducted')->default(false);
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('restaurant_order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_order_id')->constrained()->cascadeOnDelete();
            $table->string('method');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('reference')->nullable();
            $table->timestamp('paid_at');
            $table->timestamps();
        });

        Schema::create('event_venues', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('venue_type');
            $table->unsignedSmallInteger('capacity');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('event_rates', function (Blueprint $table) {
            $table->id();
            $table->string('package_name');
            $table->string('rate_type');
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('always_effective')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['rate_type', 'is_active']);
        });

        Schema::create('hotel_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_number')->unique();
            $table->string('name');
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('client_name');
            $table->foreignId('venue_id')->nullable()->constrained('event_venues')->nullOnDelete();
            $table->string('event_kind');
            $table->string('accommodation_type')->default('Non-residential');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->time('start_time')->nullable();
            $table->unsignedInteger('pax');
            $table->string('status')->default('Quote');
            $table->string('coordinator')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('contact_email')->nullable();
            $table->text('coordinator_notes')->nullable();
            $table->decimal('quoted_amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('PHP');
            $table->string('layout')->nullable();
            $table->unsignedSmallInteger('tables_count')->nullable();
            $table->unsignedSmallInteger('chairs_count')->nullable();
            $table->unsignedSmallInteger('registration_count')->nullable();
            $table->unsignedSmallInteger('display_count')->nullable();
            $table->text('access_notes')->nullable();
            $table->text('parking_notes')->nullable();
            $table->text('setup_notes')->nullable();
            $table->string('service_style')->nullable();
            $table->string('meal_service')->nullable();
            $table->unsignedSmallInteger('tea_breaks')->default(0);
            $table->unsignedSmallInteger('special_diets')->default(0);
            $table->text('dietary_notes')->nullable();
            $table->text('allergies')->nullable();
            $table->text('beverages')->nullable();
            $table->text('snacks')->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('invoice_status')->nullable();
            $table->timestamps();
            $table->index(['status', 'starts_on', 'ends_on']);
        });

        Schema::create('event_timeline_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_event_id')->constrained()->cascadeOnDelete();
            $table->time('item_time');
            $table->string('item');
            $table->string('department');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('event_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_event_id')->constrained()->cascadeOnDelete();
            $table->string('department');
            $table->string('duty');
            $table->string('owner')->nullable();
            $table->date('due_date')->nullable();
            $table->boolean('is_complete')->default(false);
            $table->timestamps();
        });

        Schema::create('event_folio_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hotel_event_id')->constrained()->cascadeOnDelete();
            $table->string('entry_type');
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('method')->nullable();
            $table->string('reference')->nullable();
            $table->string('status')->default('Posted');
            $table->text('void_reason')->nullable();
            $table->date('entry_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_folio_entries');
        Schema::dropIfExists('event_tasks');
        Schema::dropIfExists('event_timeline_items');
        Schema::dropIfExists('hotel_events');
        Schema::dropIfExists('event_rates');
        Schema::dropIfExists('event_venues');
        Schema::dropIfExists('restaurant_order_payments');
        Schema::dropIfExists('restaurant_order_lines');
        Schema::dropIfExists('restaurant_orders');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('restaurant_tables');
        Schema::dropIfExists('room_type_supply_kits');
        Schema::dropIfExists('inventory_returns');
        Schema::dropIfExists('inventory_requisition_lines');
        Schema::dropIfExists('inventory_requisitions');
        Schema::dropIfExists('inventory_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('maintenance_costs');
        Schema::dropIfExists('maintenance_requests');
        Schema::dropIfExists('room_shift_assignment_rooms');
        Schema::dropIfExists('room_shift_assignments');
        Schema::dropIfExists('housekeeping_public_areas');
        Schema::dropIfExists('housekeeping_inspections');
        Schema::dropIfExists('housekeeping_tasks');
        Schema::dropIfExists('staff_members');
    }
};
