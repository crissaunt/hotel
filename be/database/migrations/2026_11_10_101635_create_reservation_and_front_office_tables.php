<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->string('confirmation_number')->unique();
            $table->foreignId('group_reservation_id')->nullable()->constrained('reservations')->nullOnDelete();
            $table->foreignId('lead_guest_id')->constrained('guests')->restrictOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->string('billing_type')->default('Guest');
            $table->string('billing_name')->nullable();
            $table->string('status')->default('Pending');
            $table->string('purpose')->nullable();
            $table->string('booking_source')->nullable();
            $table->string('booking_reference')->nullable();
            $table->string('rate_plan_name')->nullable();
            $table->date('booking_date')->nullable();
            $table->date('check_in');
            $table->time('arrival_time')->nullable();
            $table->date('check_out');
            $table->time('expected_arrival_time')->nullable();
            $table->unsignedSmallInteger('adults')->default(1);
            $table->unsignedSmallInteger('children')->default(0);
            $table->unsignedSmallInteger('infants')->default(0);
            $table->unsignedSmallInteger('number_of_rooms')->default(1);
            $table->decimal('nightly_rate', 12, 2);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->string('discount_type')->nullable();
            $table->decimal('discount_value', 12, 2)->nullable();
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->boolean('is_tax_exempt')->default(false);
            $table->string('tax_exemption_reference')->nullable();
            $table->decimal('estimated_total', 12, 2)->default(0);
            $table->char('currency', 3)->default('PHP');
            $table->string('payment_option')->nullable();
            $table->string('payment_status')->default('Unpaid');
            $table->decimal('deposit_required', 12, 2)->default(0);
            $table->decimal('commission_amount', 12, 2)->default(0);
            $table->string('payment_guarantee')->nullable();
            $table->string('guarantee_reference')->nullable();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'check_in', 'check_out']);
            $table->index(['lead_guest_id', 'check_in']);
        });

        Schema::create('reservation_guests', function (Blueprint $table) {
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->constrained()->restrictOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            $table->primary(['reservation_id', 'guest_id']);
        });

        Schema::create('reservation_rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('room_type_id')->constrained()->restrictOnDelete();
            $table->string('assignment_method')->default('Manual');
            $table->string('status')->default('Reserved');
            $table->decimal('nightly_rate', 12, 2);
            $table->timestamps();
            $table->index(['room_id', 'status']);
        });

        Schema::create('reservation_nightly_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_room_id')->constrained()->cascadeOnDelete();
            $table->date('stay_date');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->timestamps();
            $table->unique(['reservation_room_id', 'stay_date']);
        });

        Schema::create('reservation_check_ins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guest_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('identity_type')->nullable();
            $table->string('identity_reference')->nullable();
            $table->boolean('identity_verified')->default(false);
            $table->boolean('key_issued')->default(false);
            $table->timestamp('checked_in_at');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['reservation_id', 'checked_in_at']);
        });

        Schema::create('reservation_check_outs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_out_at');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('room_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->foreignId('to_room_id')->nullable()->constrained('rooms')->nullOnDelete();
            $table->foreignId('transferred_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transferred_at');
            $table->string('reason')->nullable();
            $table->timestamps();
        });

        Schema::create('wake_up_calls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->date('call_date');
            $table->time('call_time');
            $table->string('status')->default('Scheduled');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'call_date', 'call_time']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wake_up_calls');
        Schema::dropIfExists('room_transfers');
        Schema::dropIfExists('reservation_check_outs');
        Schema::dropIfExists('reservation_check_ins');
        Schema::dropIfExists('reservation_nightly_rates');
        Schema::dropIfExists('reservation_rooms');
        Schema::dropIfExists('reservation_guests');
        Schema::dropIfExists('reservations');
    }
};
