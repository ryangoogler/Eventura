import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    const viewMap: Record<string, string> = {
      dept_event_counts:       "v_dept_event_counts",
      top_events:              "v_top_events_registrations",
      conversion_rates:        "v_event_conversion_rates",
      participant_ratio:       "v_participant_ratio",
      monthly_frequency:       "v_monthly_event_frequency",
      category_feedback:       "v_category_feedback",
      active_organizers:       "v_active_organizers",
      dept_participation:      "v_dept_participation_volume",
      semester_trends:         "v_semester_trends",
      participation_rate:      "v_participation_rate",
      top_performers:          "v_top_performers",
      interdept_comparison:    "v_interdept_comparison",
    };

    if (view && viewMap[view]) {
      const { data, error } = await supabase.from(viewMap[view]).select("*");
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ data });
    }

    // Fetch all in parallel
    const [
      deptEventCounts,
      topEvents,
      conversionRates,
      participantRatio,
      semesterTrends,
      categoryFeedback,
      activeOrganizers,
      deptParticipation,
      topPerformers,
      interdeptComparison,
    ] = await Promise.all([
      supabase.from("v_dept_event_counts").select("*"),
      supabase.from("v_top_events_registrations").select("*").limit(10),
      supabase.from("v_event_conversion_rates").select("*").limit(10),
      supabase.from("v_participant_ratio").select("*").limit(8),
      supabase.from("v_semester_trends").select("*"),
      supabase.from("v_category_feedback").select("*"),
      supabase.from("v_active_organizers").select("*").limit(10),
      supabase.from("v_dept_participation_volume").select("*"),
      supabase.from("v_top_performers").select("*").limit(10),
      supabase.from("v_interdept_comparison").select("*"),
    ]);

    // Summary counts
    const [eventsCount, activeCount, regsCount, participantsCount] = await Promise.all([
      supabase.from("events").select("*", { count: "exact", head: true }),
      supabase.from("events").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("registrations").select("*", { count: "exact", head: true }),
      supabase.from("participants").select("*", { count: "exact", head: true }),
    ]);

    // Surface view errors
    const viewErrors: Record<string, string> = {};
    for (const [key, result] of Object.entries({
      deptEventCounts, topEvents, conversionRates, participantRatio,
      semesterTrends, categoryFeedback, activeOrganizers,
      deptParticipation, topPerformers, interdeptComparison,
    })) {
      const r = result as { error: { message: string } | null };
      if (r.error) viewErrors[key] = r.error.message;
    }

    return NextResponse.json({
      summary: {
        totalEvents:        eventsCount.count,
        activeEvents:       activeCount.count,
        totalRegistrations: regsCount.count,
        totalParticipants:  participantsCount.count,
      },
      deptEventCounts:      deptEventCounts.data     ?? [],
      topEvents:            topEvents.data            ?? [],
      conversionRates:      conversionRates.data      ?? [],
      participantRatio:     participantRatio.data     ?? [],
      semesterTrends:       semesterTrends.data       ?? [],
      categoryFeedback:     categoryFeedback.data     ?? [],
      activeOrganizers:     activeOrganizers.data     ?? [],
      deptParticipation:    deptParticipation.data    ?? [],
      topPerformers:        topPerformers.data        ?? [],
      interdeptComparison:  interdeptComparison.data  ?? [],
      ...(Object.keys(viewErrors).length ? { _viewErrors: viewErrors } : {}),
    });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
