import { useMemo, useState } from 'react';
import {
  activitySeries,
  consistencyScore,
  currentStreak,
  interviewReadiness,
  longestStreak,
  readinessLevel,
  type SolveRecord,
} from '../lib/consistency';

interface Props {
  /** ms timestamps of every submission (one activity event each). */
  activity: number[];
  /** Solved problems, with the date of their most recent proof. */
  solves: SolveRecord[];
  /** Size of the full problem set, for readiness normalisation. */
  totalProblems: number;
  /** Server-computed "now" so SSR and client hydration agree. */
  now: number;
}

const WINDOWS = [14, 30, 60] as const;
type Window = (typeof WINDOWS)[number];

/** Tailwind text-color class for a 0..100 score, warm (low) → phosphor (high). */
function scoreColor(score: number): string {
  if (score >= 60) return 'text-phosphor';
  if (score >= 35) return 'text-gold';
  if (score >= 15) return 'text-medium';
  return 'text-hard';
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted">{title}</h2>
        {hint && <span className="font-mono text-[10px] text-muted">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** Donut progress ring with the score in the middle. */
function Gauge({ value, colorClass }: { value: number; colorClass: string }) {
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div className="relative grid place-items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${colorClass} transition-all`}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`font-mono text-3xl font-bold tabular ${colorClass}`}>{value}</div>
        <div className="font-mono text-[10px] text-muted">/ 100</div>
      </div>
    </div>
  );
}

/** Thin one-bar-per-day activity strip (a sparkline you can read day by day). */
function ActivityBars({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-12 items-end gap-px" aria-hidden>
      {data.map((count, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${count > 0 ? 'bg-phosphor' : 'bg-surface-2'}`}
          style={{ height: count > 0 ? `${Math.max(12, (count / max) * 100)}%` : '8%' }}
          title={`${count} solved`}
        />
      ))}
    </div>
  );
}

export default function ConsistencyPanel({ activity, solves, totalProblems, now }: Props) {
  const [window, setWindow] = useState<Window>(14);

  const streak = useMemo(() => currentStreak(activity, now), [activity, now]);
  const best = useMemo(() => longestStreak(activity), [activity]);
  const windowScore = useMemo(
    () => consistencyScore(activity, now, window),
    [activity, now, window]
  );
  const series = useMemo(() => activitySeries(activity, now, window), [activity, now, window]);
  const readiness = useMemo(
    () => interviewReadiness(solves, totalProblems, activity, now),
    [solves, totalProblems, activity, now]
  );

  const readyColor = scoreColor(readiness.score);

  return (
    <section className="mb-6 grid gap-3 md:grid-cols-3">
      <Panel title="Consistency" hint="current streak">
        <div className="flex items-end gap-2">
          <span className="font-mono text-5xl font-bold leading-none text-phosphor tabular">
            {streak}
          </span>
          <span className="pb-1 font-mono text-sm text-muted">
            {streak === 1 ? 'day' : 'days'} in a row
          </span>
          <span className="pb-1.5 ml-auto text-2xl" aria-hidden>
            {streak > 0 ? '🔥' : '·'}
          </span>
        </div>
        <p className="mt-3 font-mono text-xs text-muted">
          longest streak: <span className="text-ink tabular">{best}</span> days
        </p>
      </Panel>

      <Panel title="Interview readiness" hint={readinessLevel(readiness.score)}>
        <div className="flex items-center gap-4">
          <Gauge value={readiness.score} colorClass={readyColor} />
          <dl className="space-y-2 font-mono text-xs">
            <div>
              <dt className="text-muted">recent solves</dt>
              <dd className="text-ink tabular">
                {Math.round(readiness.effectiveSolved)}
                <span className="text-muted"> / {readiness.totalSolved} all-time</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">30d consistency</dt>
              <dd className="text-ink tabular">{Math.round(readiness.consistency * 100)}%</dd>
            </div>
          </dl>
        </div>
        <p className="mt-2 font-mono text-[10px] leading-snug text-muted">
          recent solves × consistency. Problems solved over ~90 days ago stop counting.
        </p>
      </Panel>

      <Panel title="Consistency over time" hint="active days / window">
        <div className="flex items-center justify-between gap-3">
          <div className="flex overflow-hidden rounded border border-border font-mono text-xs">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-2.5 py-1 ${
                  window === w ? 'bg-phosphor/15 text-phosphor' : 'text-muted hover:text-ink'
                }`}
              >
                {w}d
              </button>
            ))}
          </div>
          <span className={`font-mono text-2xl font-bold tabular ${scoreColor(windowScore * 100)}`}>
            {Math.round(windowScore * 100)}%
          </span>
        </div>
        <div className="mt-4">
          <p className="mb-1 font-mono text-[10px] text-muted">last {window} days</p>
          <ActivityBars data={series} />
        </div>
      </Panel>
    </section>
  );
}
