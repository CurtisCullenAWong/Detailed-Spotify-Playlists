// Dashboard statistics and metrics data

export interface KeyDataIndicator {
  label: string;
  value: string;
  sub: string;
  color: string;
}

export const KEY_DATA_INDICATORS: KeyDataIndicator[] = [];

export interface AggregateStats {
  label: string;
  value: string;
  iconName: string;
  color: string;
}

export const AGGREGATE_STATS: AggregateStats[] = [];
