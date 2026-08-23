import { database, ensureObservabilitySchema } from "./database";

export type ObservabilityMetrics = {
  available: boolean;
  landingViews: number;
  dailyStarts: number;
  freeStarts: number;
  challengeStarts: number;
  firstRecaps: number;
  firstRecapLt5: number;
  firstRecap5To10: number;
  firstRecap10To20: number;
  firstRecap20Plus: number;
  careersFinished: number;
  replayStarts: number;
  feedbackPrepared: number;
  feedbackReceived: number;
  clientErrors: number;
};

const EMPTY_METRICS: ObservabilityMetrics = {
  available: false,
  landingViews: 0,
  dailyStarts: 0,
  freeStarts: 0,
  challengeStarts: 0,
  firstRecaps: 0,
  firstRecapLt5: 0,
  firstRecap5To10: 0,
  firstRecap10To20: 0,
  firstRecap20Plus: 0,
  careersFinished: 0,
  replayStarts: 0,
  feedbackPrepared: 0,
  feedbackReceived: 0,
  clientErrors: 0,
};

export async function getObservabilityMetrics(): Promise<ObservabilityMetrics> {
  const sql = database();
  if (!sql) return EMPTY_METRICS;
  try {
    await ensureObservabilitySchema(sql);
    const [funnel] = await sql<Record<string, string>[]>`
      select
        count(*) filter (where event = 'landing_view')::text as landing_views,
        count(*) filter (where event = 'daily_start')::text as daily_starts,
        count(*) filter (where event = 'free_start')::text as free_starts,
        count(*) filter (where event = 'challenge_start')::text as challenge_starts,
        count(*) filter (where event like 'first_recap_%')::text as first_recaps,
        count(*) filter (where event = 'first_recap_lt5')::text as first_recap_lt5,
        count(*) filter (where event = 'first_recap_5_10')::text as first_recap_5_10,
        count(*) filter (where event = 'first_recap_10_20')::text as first_recap_10_20,
        count(*) filter (where event = 'first_recap_20_plus')::text as first_recap_20_plus,
        count(*) filter (where event = 'career_finished')::text as careers_finished,
        count(*) filter (where event = 'replay_start')::text as replay_starts,
        count(*) filter (where event = 'feedback_prepare')::text as feedback_prepared
      from funnel_events
      where created_at >= now() - interval '7 days'
    `;
    const [feedback] = await sql<{ count: string }[]>`
      select count(*)::text as count from feedback_entries where created_at >= now() - interval '7 days'
    `;
    const [errors] = await sql<{ count: string }[]>`
      select count(*)::text as count from client_errors where created_at >= now() - interval '7 days'
    `;
    return {
      available: true,
      landingViews: Number(funnel.landing_views),
      dailyStarts: Number(funnel.daily_starts),
      freeStarts: Number(funnel.free_starts),
      challengeStarts: Number(funnel.challenge_starts),
      firstRecaps: Number(funnel.first_recaps),
      firstRecapLt5: Number(funnel.first_recap_lt5),
      firstRecap5To10: Number(funnel.first_recap_5_10),
      firstRecap10To20: Number(funnel.first_recap_10_20),
      firstRecap20Plus: Number(funnel.first_recap_20_plus),
      careersFinished: Number(funnel.careers_finished),
      replayStarts: Number(funnel.replay_starts),
      feedbackPrepared: Number(funnel.feedback_prepared),
      feedbackReceived: Number(feedback.count),
      clientErrors: Number(errors.count),
    };
  } catch {
    console.error(JSON.stringify({ type: "db_error", operation: "metrics_read" }));
    return EMPTY_METRICS;
  }
}
