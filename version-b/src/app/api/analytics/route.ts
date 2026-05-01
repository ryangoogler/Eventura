import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    const viewMap: Record<string, string> = {
      dept_event_counts: "v_dept_event_counts",
      top_events: "v_top_events_registrations",
      conversion_rates: "v_event_conversion_rates",
      participant_ratio: "v_participant_ratio",
      monthly_frequency: "v_monthly_event_frequency",
      category_feedback: "v_category_feedback",
      active_organizers: "v_active_organizers",
    };

    // Return a single view
    if (view && viewMap[view]) {
      const { data, error } = await supabase.from(viewMap[view]).select("*");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // Return all views in parallel
    const [
      deptEventCounts,
      topEvents,
      conversionRates,
      participantRatio,
      monthlyFrequency,
      categoryFeedback,
      activeOrganizers,
    ] = await Promise.all([
      supabase.from("v_dept_event_counts").select("*"),
      supabase.from("v_top_events_registrations").select("*").limit(10),
      supabase.from("v_event_conversion_rates").select("*"),
      supabase.from("v_participant_ratio").select("*"),
      supabase.from("v_monthly_event_frequency").select("*"),
      supabase.from("v_category_feedback").select("*"),
      supabase.from("v_active_organizers").select("*").limit(10),
    ]);

    // Summary stats
    const { count: totalEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true });

    const { count: totalRegistrations } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true });

    const { count: totalParticipants } = await supabase
      .from("participants")
      .select("*", { count: "exact", head: true });

    const { count: activeEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("status", "published");

    return NextResponse.json({
      summary: {
        totalEvents,
        totalRegistrations,
        totalParticipants,
        activeEvents,
      },
      deptEventCounts: deptEventCounts.data,
      topEvents: topEvents.data,
      conversionRates: conversionRates.data,
      participantRatio: participantRatio.data,
      monthlyFrequency: monthlyFrequency.data,
      categoryFeedback: categoryFeedback.data,
      activeOrganizers: activeOrganizers.data,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
