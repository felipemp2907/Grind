import { SupabaseClient } from '@supabase/supabase-js';

export type TaskTypeMapping =
  | { kind: 'json'; col: string }
  | { kind: 'text'; col: string }
  | { kind: 'bool'; col: string };

export type TaskColumnMap = {
  primaryDateCol: string;
  alsoSetDateCols: string[];
  timeCol?: string;
  typeMap?: TaskTypeMapping;
  // Additional type-related columns to also set if present
  extraTypeTargets?: TaskTypeMapping[];
  // Preferred formatting for the detected type column
  textFormatter?: TextTypeFormatter;
  jsonVariant?: JsonTypeVariant;
  proofCol?: string;
  tagsCol?: string;
};

async function columnExists(supa: SupabaseClient, col: string) {
  try {
    const { error } = await supa.from('tasks').select(col).limit(0);
    return !error;
  } catch (_e) {
    return false;
  }
}

async function findFirst(supa: SupabaseClient, candidates: string[], fallback?: string) {
  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) return c;
  }
  if (fallback && (await columnExists(supa, fallback))) {
    return fallback;
  }
  return undefined;
}

function deriveTextFormatter(sample: string): TextTypeFormatter {
  try {
    const parsed = JSON.parse(sample);
    if (parsed && typeof parsed === 'object') {
      if ('kind' in parsed) return (k) => JSON.stringify({ kind: k });
      if ('type' in parsed) return (k) => JSON.stringify({ type: k });
      if ('task_type' in parsed) return (k) => JSON.stringify({ task_type: k });
    }
  } catch (_) {
    // not JSON, fall through
  }
  const upper = sample.toUpperCase();
  if (upper === 'TODAY' || upper === 'STREAK') return (k) => k.toUpperCase();
  return (k) => k;
}

function deriveJsonVariant(sample: Record<string, unknown>): JsonTypeVariant {
  if (sample && typeof sample === 'object') {
    if ('kind' in sample) return 'json_kind';
    if ('type' in sample) return 'json_type';
    if ('task_type' in sample) return 'json_task_type';
    if ('streak' in sample || 'today' in sample) return 'json_flag';
    if (Array.isArray(sample)) return 'json_array';
  }
  return 'json_union';
}

async function sampleColumnValue(supa: SupabaseClient, col: string): Promise<unknown | undefined> {
  try {
    const { data, error } = await supa.from('tasks').select(col).not(col, 'is', null).limit(1);
    if (error) return undefined;
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0] as unknown as Record<string, unknown>;
      const v = row[col];
      return v;
    }
    return undefined;
  } catch (_e) {
    return undefined;
  }
}

export async function detectTasksColumnMap(supa: SupabaseClient): Promise<TaskColumnMap> {
  console.log('🔍 Detecting tasks table column schema...');
  
  const datePriority = [
    'scheduled_for_date',
    'scheduled_for',
    'scheduled_at', 
    'due_date',
    'due_at',
    'date',
    'planned_for_date',
    'planned_date',
  ];

  // Find the primary date column - must exist or we fail
  let primary: string | undefined;
  for (const c of datePriority) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) {
      primary = c;
      console.log(`✅ Found primary date column: ${c}`);
      break;
    }
  }
  
  if (!primary) {
    throw new Error(`No date column found in tasks table. Checked: ${datePriority.join(', ')}`);
  }

  // Find additional date columns to also set
  const alsoSetDateCols: string[] = [];
  for (const c of datePriority) {
    // eslint-disable-next-line no-await-in-loop
    if (c !== primary && (await columnExists(supa, c))) {
      alsoSetDateCols.push(c);
      console.log(`✅ Found additional date column: ${c}`);
    }
  }

  const timeCol = await findFirst(supa, ['scheduled_for_time', 'time', 'due_time']);
  const proofCol = await findFirst(supa, ['proof_required', 'requires_proof', 'require_proof', 'needs_proof']);
  const tagsCol = await findFirst(supa, ['tags', 'labels']);

  // Detect type column mapping with runtime value probe
  let typeMap: TaskTypeMapping | undefined;
  let textFormatter: TextTypeFormatter | undefined;
  let jsonVariant: JsonTypeVariant | undefined;
  // Prefer explicit TEXT markers first
  if (await columnExists(supa, 'task_type')) {
    typeMap = { kind: 'text', col: 'task_type' };
    const sample = await sampleColumnValue(supa, 'task_type');
    if (typeof sample === 'string') {
      textFormatter = deriveTextFormatter(sample);
    }
    console.log('✅ Found type column (TEXT): task_type');
  } else if (await columnExists(supa, 'kind')) {
    typeMap = { kind: 'text', col: 'kind' };
    const sample = await sampleColumnValue(supa, 'kind');
    if (typeof sample === 'string') {
      textFormatter = deriveTextFormatter(sample);
    }
    console.log('✅ Found type column (TEXT): kind');
  } else if (await columnExists(supa, 'is_streak')) {
    typeMap = { kind: 'bool', col: 'is_streak' };
    console.log('✅ Found type column (BOOL): is_streak');
  } else if (await columnExists(supa, 'streak')) {
    typeMap = { kind: 'bool', col: 'streak' };
    console.log('✅ Found type column (BOOL): streak');
  } else if (await columnExists(supa, 'type')) {
    // Finally consider generic 'type' column, probe a value
    const sample = await sampleColumnValue(supa, 'type');
    if (sample != null) {
      if (typeof sample === 'string') {
        // Ambiguous: could be TEXT or stringified JSON. Try to detect JSON string
        const guessedFmt = deriveTextFormatter(sample);
        const looksJsonString = guessedFmt !== ((k: 'today' | 'streak') => k);
        if (looksJsonString) {
          typeMap = { kind: 'text', col: 'type' };
          textFormatter = guessedFmt;
          console.log('✅ Detected type column as TEXT(JSON-string) via sample: type');
        } else {
          typeMap = { kind: 'text', col: 'type' };
          textFormatter = (k) => k;
          console.log('✅ Detected type column as TEXT via sample: type');
        }
      } else if (typeof sample === 'boolean') {
        typeMap = { kind: 'bool', col: 'type' };
        console.log('✅ Detected type column as BOOL via sample: type');
      } else if (typeof sample === 'object' && !Array.isArray(sample)) {
        typeMap = { kind: 'json', col: 'type' };
        jsonVariant = deriveJsonVariant(sample as Record<string, unknown>);
        console.log('✅ Detected type column as JSON via sample: type');
      }
    }
    if (!typeMap) {
      // Default conservatively to TEXT for generic 'type' column if no sample exists
      typeMap = { kind: 'text', col: 'type' };
      textFormatter = (k) => k;
      console.log('ℹ️ Defaulting type column to TEXT: type');
    }
  } else {
    console.log('⚠️ No type column found - tasks will be inserted without type classification');
  }

  if (timeCol) console.log(`✅ Found time column: ${timeCol}`);
  if (proofCol) console.log(`✅ Found proof column: ${proofCol}`);
  if (tagsCol) console.log(`✅ Found tags column: ${tagsCol}`);

  // Discover any extra type columns we can mirror into (to satisfy strict CHECK constraints)
  const extraTypeTargets: TaskTypeMapping[] = [];
  const typeCandidates: Array<{ col: string; kind: TaskTypeMapping['kind'] | 'probe' }> = [
    { col: 'task_type', kind: 'text' },
    { col: 'kind', kind: 'text' },
    { col: 'is_streak', kind: 'bool' },
    { col: 'streak', kind: 'bool' },
    { col: 'type', kind: 'probe' },
  ];
  for (const c of typeCandidates) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c.col)) {
      if (!typeMap || c.col !== typeMap.col) {
        if (c.kind === 'probe') {
          const sample = await sampleColumnValue(supa, c.col);
          if (typeof sample === 'boolean') extraTypeTargets.push({ kind: 'bool', col: c.col });
          else if (typeof sample === 'object' && sample !== null && !Array.isArray(sample)) extraTypeTargets.push({ kind: 'json', col: c.col });
          else extraTypeTargets.push({ kind: 'text', col: c.col });
        } else {
          extraTypeTargets.push({ kind: c.kind as TaskTypeMapping['kind'], col: c.col });
        }
      }
    }
  }

  const result = {
    primaryDateCol: primary,
    alsoSetDateCols,
    timeCol,
    typeMap,
    extraTypeTargets,
    textFormatter,
    jsonVariant,
    proofCol,
    tagsCol,
  };
  
  console.log('🔍 Column detection complete:', result);
  return result;
}

export function setTaskType(row: Record<string, unknown>, map: TaskColumnMap, kind: 'today' | 'streak') {
  if (!map.typeMap) return;
  const targets: TaskTypeMapping[] = [map.typeMap, ...(map.extraTypeTargets ?? [])];
  for (const target of targets) {
    const { kind: t, col } = target;
    if (t === 'json') {
      if (map.jsonVariant && target.col === map.typeMap.col) {
        applyTaskTypeVariant(row, map, kind, map.jsonVariant);
      } else {
        (row as any)[col] = { kind };
      }
    } else if (t === 'text') {
      const fmt = map.textFormatter && target.col === map.typeMap.col ? map.textFormatter : (k: 'today' | 'streak') => k;
      (row as any)[col] = fmt(kind);
    } else {
      (row as any)[col] = kind === 'streak';
    }
  }
}

export type JsonTypeVariant =
  | 'json_kind'
  | 'json_type'
  | 'json_task_type'
  | 'json_flag'
  | 'json_string'
  | 'json_array'
  | 'json_union'
  | 'json_discriminated'
  | 'json_k'
  | 'json_t';
export const JSON_TYPE_VARIANTS: JsonTypeVariant[] = [
  'json_kind',
  'json_type',
  'json_task_type',
  'json_flag',
  'json_union',
  // deprioritize exotic shapes known to fail often
  'json_discriminated',
  'json_k',
  'json_t',
  'json_string',
  'json_array',
];

export function applyTaskTypeVariant(
  row: Record<string, unknown>,
  map: TaskColumnMap,
  logicalKind: 'today' | 'streak',
  variant: JsonTypeVariant,
) {
  if (!map.typeMap) return;
  const targets: TaskTypeMapping[] = [map.typeMap, ...(map.extraTypeTargets ?? [])];
  const setJson = (col: string) => {
    switch (variant) {
      case 'json_kind':
        (row as any)[col] = { kind: logicalKind };
        break;
      case 'json_type':
        (row as any)[col] = { type: logicalKind };
        break;
      case 'json_task_type':
        (row as any)[col] = { task_type: logicalKind };
        break;
      case 'json_flag':
        (row as any)[col] = logicalKind === 'streak' ? { streak: true } : { today: true };
        break;
      case 'json_string':
        (row as any)[col] = logicalKind;
        break;
      case 'json_array':
        (row as any)[col] = [logicalKind];
        break;
      case 'json_union':
        (row as any)[col] = { kind: logicalKind, version: 1 };
        break;
      case 'json_discriminated':
        (row as any)[col] = { _type: logicalKind };
        break;
      case 'json_k':
        (row as any)[col] = { k: logicalKind };
        break;
      case 'json_t':
        (row as any)[col] = { t: logicalKind };
        break;
      default:
        (row as any)[col] = { kind: logicalKind };
    }
  };
  for (const t of targets) {
    if (t.kind === 'json') setJson(t.col);
    else if (t.kind === 'text') (row as any)[t.col] = logicalKind;
    else if (t.kind === 'bool') (row as any)[t.col] = logicalKind === 'streak';
  }
}

export type TextTypeFormatter = (logicalKind: 'today' | 'streak') => string;
export const TEXT_TYPE_VARIANTS: TextTypeFormatter[] = [
  (k) => k.toUpperCase(),
  (k) => k,
  (k) => JSON.stringify({ kind: k }),
  (k) => JSON.stringify({ type: k }),
  (k) => JSON.stringify({ task_type: k }),
];

export function applyTextTypeVariant(row: Record<string, unknown>, map: TaskColumnMap, logicalKind: 'today' | 'streak', formatter: TextTypeFormatter) {
  if (!map.typeMap) return;
  const targets: TaskTypeMapping[] = [map.typeMap, ...(map.extraTypeTargets ?? [])];
  for (const t of targets) {
    if (t.kind === 'text') {
      (row as any)[t.col] = formatter(logicalKind);
    } else if (t.kind === 'bool') {
      (row as any)[t.col] = logicalKind === 'streak';
    } else if (t.kind === 'json') {
      (row as any)[t.col] = { kind: logicalKind };
    }
  }
}

export function setTaskDates(row: Record<string, unknown>, map: TaskColumnMap, yyyyMmDd: string) {
  row[map.primaryDateCol] = yyyyMmDd;
  for (const extra of map.alsoSetDateCols) {
    row[extra] = yyyyMmDd;
  }
}

export function setTaskTimeIfNeeded(row: Record<string, unknown>, map: TaskColumnMap) {
  if (!map.timeCol) return;
  if (row[map.timeCol] == null) {
    row[map.timeCol] = '12:00:00';
  }
}

export function toLocalYyyyMmDd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
