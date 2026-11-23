<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('folios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reservation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('billing_guest_id')->nullable()->constrained('guests')->nullOnDelete();
            $table->string('name')->nullable();
            $table->string('status')->default('Open');
            $table->char('currency', 3)->default('PHP');
            $table->timestamps();
            $table->index(['reservation_id', 'status']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('receipt_number')->nullable()->unique();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('method');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->string('reference')->nullable();
            $table->string('corporate_batch_reference')->nullable();
            $table->timestamp('received_at');
            $table->string('status')->default('Posted');
            $table->text('void_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->index(['method', 'received_at']);
            $table->index(['status', 'received_at']);
        });

        Schema::create('folio_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('folio_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('service_charge_code_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('moved_to_entry_id')->nullable()->constrained('folio_entries')->nullOnDelete();
            $table->foreignId('moved_from_entry_id')->nullable()->constrained('folio_entries')->nullOnDelete();
            $table->string('entry_type');
            $table->string('status')->default('Posted');
            $table->string('description');
            $table->string('category')->nullable();
            $table->string('outlet')->nullable();
            $table->string('reference')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('original_amount', 12, 2)->nullable();
            $table->char('currency', 3)->default('PHP');
            $table->date('entry_date');
            $table->timestamp('posted_at');
            $table->text('void_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamps();
            $table->index(['folio_id', 'entry_date', 'status']);
            $table->index(['entry_type', 'posted_at']);
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('folio_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('Draft');
            $table->date('issue_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('bill_to_name');
            $table->text('bill_to_address')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax_rate', 7, 4)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->char('currency', 3)->default('PHP');
            $table->timestamps();
            $table->index(['status', 'issue_date']);
        });

        Schema::create('invoice_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('folio_entry_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_amount', 12, 2);
            $table->decimal('line_amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('till_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('business_date');
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('opening_amount', 12, 2);
            $table->decimal('closing_amount', 12, 2)->nullable();
            $table->char('currency', 3)->default('PHP');
            $table->text('opening_notes')->nullable();
            $table->string('status')->default('Open');
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['business_date', 'status']);
        });

        Schema::create('petty_expenses', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->nullable()->unique();
            $table->foreignId('till_session_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category');
            $table->string('description');
            $table->string('payee');
            $table->string('method');
            $table->decimal('amount', 12, 2);
            $table->char('currency', 3)->default('PHP');
            $table->date('expense_date');
            $table->text('notes')->nullable();
            $table->string('status')->default('Recorded');
            $table->text('void_reason')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->timestamp('recorded_at');
            $table->timestamps();
            $table->index(['expense_date', 'status']);
        });

        Schema::create('night_audit_runs', function (Blueprint $table) {
            $table->id();
            $table->date('business_date')->unique();
            $table->date('next_business_date');
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('room_charges', 12, 2)->default(0);
            $table->decimal('other_charges', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('payments', 12, 2)->default(0);
            $table->char('currency', 3)->default('PHP');
            $table->timestamp('completed_at');
            $table->timestamps();
        });

        Schema::create('night_audit_no_shows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('night_audit_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reservation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('confirmation_number');
            $table->string('guest_name');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('night_audit_no_shows');
        Schema::dropIfExists('night_audit_runs');
        Schema::dropIfExists('petty_expenses');
        Schema::dropIfExists('till_sessions');
        Schema::dropIfExists('invoice_lines');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('folio_entries');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('folios');
    }
};
