/**
 * Lightweight metrics collection — in-memory counters and histograms with
 * Prometheus-compatible text output. In production, swap the storage backend
 * for Redis or a real Prometheus client without changing the call sites.
 */

interface CounterEntry {
  value: number;
  labels: Record<string, string>;
}

interface HistogramEntry {
  count: number;
  sum: number;
  /** Mutable per-bucket cumulative counts (index matches bucket boundaries). */
  counts: number[];
  labels: Record<string, string>;
}

interface GaugeEntry {
  value: number;
  labels: Record<string, string>;
}

const counters = new Map<string, CounterEntry[]>();
const histograms = new Map<string, { boundaries: readonly number[]; entries: HistogramEntry[] }>();
const gauges = new Map<string, GaugeEntry[]>();

function labelKey(labels: Record<string, string>): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}="${labels[k]}"`)
    .join(",");
}

function getOrCreateCounter(name: string, labels: Record<string, string>): CounterEntry {
  const entries = counters.get(name) ?? [];
  const key = labelKey(labels);
  let entry = entries.find((e) => labelKey(e.labels) === key);
  if (!entry) {
    entry = { value: 0, labels };
    entries.push(entry);
    counters.set(name, entries);
  }
  return entry;
}

function getOrCreateHistogram(
  name: string,
  labels: Record<string, string>,
  boundaries: readonly number[]
): HistogramEntry {
  const hist = histograms.get(name) ?? { boundaries, entries: [] };
  const key = labelKey(labels);
  let entry = hist.entries.find((e) => labelKey(e.labels) === key);
  if (!entry) {
    entry = { count: 0, sum: 0, counts: new Array(boundaries.length).fill(0), labels };
    hist.entries.push(entry);
    histograms.set(name, hist);
  }
  return entry;
}

export const metrics = {
  increment(name: string, value = 1, labels: Record<string, string> = {}): void {
    const entry = getOrCreateCounter(name, labels);
    entry.value += value;
  },

  histogram(
    name: string,
    value: number,
    labels: Record<string, string> = {},
    boundaries: readonly number[] = [0.1, 0.5, 1, 2, 5, 10, 30]
  ): void {
    const entry = getOrCreateHistogram(name, labels, boundaries);
    entry.count++;
    entry.sum += value;
    for (let i = 0; i < boundaries.length; i++) {
      if (value <= boundaries[i]) {
        entry.counts[i]++;
      }
    }
  },

  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const entries = gauges.get(name) ?? [];
    const key = labelKey(labels);
    let entry = entries.find((e) => labelKey(e.labels) === key);
    if (!entry) {
      entry = { value: 0, labels };
      entries.push(entry);
      gauges.set(name, entries);
    }
    entry.value = value;
  },

  /**
   * Export all metrics in Prometheus text exposition format.
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    // Counters
    for (const [name, entries] of counters) {
      lines.push(`# TYPE ${name} counter`);
      for (const entry of entries) {
        const labelStr =
          Object.keys(entry.labels).length > 0 ? `{${labelKey(entry.labels)}}` : "";
        lines.push(`${name}${labelStr} ${entry.value}`);
      }
    }

    // Histograms
    for (const [name, hist] of histograms) {
      lines.push(`# TYPE ${name} histogram`);
      for (const entry of hist.entries) {
        const labelStr =
          Object.keys(entry.labels).length > 0 ? `{${labelKey(entry.labels)}}` : "";
        for (let i = 0; i < hist.boundaries.length; i++) {
          const bucketLabels = { ...entry.labels, le: String(hist.boundaries[i]) };
          lines.push(`${name}_bucket{${labelKey(bucketLabels)}} ${entry.counts[i]}`);
        }
        const infLabels = { ...entry.labels, le: "+Inf" };
        lines.push(`${name}_bucket{${labelKey(infLabels)}} ${entry.count}`);
        lines.push(`${name}_sum${labelStr} ${entry.sum}`);
        lines.push(`${name}_count${labelStr} ${entry.count}`);
      }
    }

    // Gauges
    for (const [name, entries] of gauges) {
      lines.push(`# TYPE ${name} gauge`);
      for (const entry of entries) {
        const labelStr =
          Object.keys(entry.labels).length > 0 ? `{${labelKey(entry.labels)}}` : "";
        lines.push(`${name}${labelStr} ${entry.value}`);
      }
    }

    return lines.join("\n") + "\n";
  },

  /** Clear all metrics (useful for testing) */
  reset(): void {
    counters.clear();
    histograms.clear();
    gauges.clear();
  },
};

/** Standard bucket presets for common metric types */
export const BUCKETS = {
  durationMs: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  refundCents: [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000],
} as const;
