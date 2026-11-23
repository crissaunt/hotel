<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('access_level');
            $table->string('permission_scope');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('role_user', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('user_roles')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->primary(['role_id', 'user_id']);
            $table->timestamps();
        });

        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('registration_number')->nullable()->unique();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('billing_address')->nullable();
            $table->string('billing_contact')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('guests', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable()->index();
            $table->string('phone')->nullable()->index();
            $table->string('nationality')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('room_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->unsignedSmallInteger('max_occupancy');
            $table->string('bed_setup')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('room_type_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('floor');
            $table->string('view')->nullable();
            $table->string('operational_status')->default('Ready');
            $table->string('housekeeping_status')->default('Clean');
            $table->boolean('is_out_of_service')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['floor', 'operational_status']);
            $table->index(['housekeeping_status', 'is_out_of_service']);
        });

        Schema::create('amenities', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('category');
            $table->string('availability_status')->default('Available');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('amenity_room_type', function (Blueprint $table) {
            $table->foreignId('amenity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_type_id')->constrained()->cascadeOnDelete();
            $table->string('location')->nullable();
            $table->primary(['amenity_id', 'room_type_id']);
        });

        Schema::create('rate_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('code')->unique();
            $table->string('payment_terms')->nullable();
            $table->string('cancellation_terms')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('room_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_type_id')->constrained()->restrictOnDelete();
            $table->foreignId('rate_plan_id')->constrained()->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['room_type_id', 'rate_plan_id', 'valid_from', 'valid_to']);
        });

        Schema::create('guest_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_id')->constrained()->cascadeOnDelete();
            $table->string('category');
            $table->text('preference');
            $table->string('scope')->default('All stays');
            $table->string('status')->default('Active');
            $table->timestamps();
            $table->index(['guest_id', 'status']);
        });

        Schema::create('service_charge_codes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('department')->nullable();
            $table->decimal('default_amount', 12, 2)->nullable();
            $table->char('currency', 3)->default('PHP');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('hotel_policies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->text('summary');
            $table->string('owner')->nullable();
            $table->string('status')->default('Draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotel_policies');
        Schema::dropIfExists('service_charge_codes');
        Schema::dropIfExists('guest_preferences');
        Schema::dropIfExists('room_rates');
        Schema::dropIfExists('rate_plans');
        Schema::dropIfExists('amenity_room_type');
        Schema::dropIfExists('amenities');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('room_types');
        Schema::dropIfExists('guests');
        Schema::dropIfExists('companies');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('user_roles');
    }
};
