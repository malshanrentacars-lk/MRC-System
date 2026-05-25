import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity";

export const runtime = "nodejs";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function daysBetween(startDate: string, endDate: string) {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / 86400000));
}

function addDays(date: string, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const body = (await request.json().catch(() => ({}))) as {
      days?: number;
      expected_return_date?: string;
    };

    const { data: rental, error } = await supabaseAdmin
      .from("rentals")
      .select(
        "id, rental_number, start_date, end_date, daily_rate, applied_rate, additional_charges, discount, amount_paid, advance_paid, security_deposit_amount, deposit, is_deposit_collected"
      )
      .eq("id", id)
      .single();

    if (error || !rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const extensionDays = Number.isFinite(Number(body.days)) ? Math.max(1, Math.floor(Number(body.days))) : 0;
    const nextEndDate = (body.expected_return_date && body.expected_return_date.trim()) ||
      (extensionDays > 0 ? addDays(rental.end_date, extensionDays) : "");

    if (!nextEndDate) {
      return NextResponse.json({ error: "Expected return date or days is required" }, { status: 400 });
    }

    const rentalDuration = daysBetween(rental.start_date, nextEndDate);
    const rate = Number(rental.applied_rate ?? rental.daily_rate ?? 0);
    const subtotal = roundMoney(rate * rentalDuration);
    const additionalCharges = roundMoney(Number(rental.additional_charges ?? 0));
    const discount = roundMoney(Number(rental.discount ?? 0));
    const totalAmount = roundMoney(subtotal + additionalCharges - discount);
    const amountPaid = roundMoney(Number(rental.amount_paid ?? rental.advance_paid ?? 0));

    const paymentStatus = totalAmount <= amountPaid ? "paid" : amountPaid > 0 ? "partial" : "pending";

    const { error: updateError } = await supabaseAdmin
      .from("rentals")
      .update({
        end_date: nextEndDate,
        rental_duration: rentalDuration,
        subtotal,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        status: "extended",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity({
      action: "updated",
      module: "Rentals",
      entity_id: id,
      entity_label: rental.rental_number,
      details: `Extended rental to ${nextEndDate}`,
    });

    return NextResponse.json({
      success: true,
      end_date: nextEndDate,
      rental_duration: rentalDuration,
      subtotal,
      total_amount: totalAmount,
      payment_status: paymentStatus,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}