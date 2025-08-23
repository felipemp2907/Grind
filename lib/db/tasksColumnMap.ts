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
  // Columns that look like type columns but are NOT the chosen one. We will explicitly null them.
  otherTypeCols?: string[];
  // Preferred formatting for the detected type column (unused for safety)
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
    'task_date',
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
      if (typeof sample === 'boolean') {
        typeMap = { kind: 'bool', col: 'type' };
        console.log('✅ Detected type column as BOOL via sample: type');
      } else if (typeof sample === 'object' && !Array.isArray(sample)) {
        typeMap = { kind: 'json', col: 'type' };
        jsonVariant = deriveJsonVariant(sample as Record<string, unknown>);
        console.log('✅ Detected type column as JSON via sample: type');
      } else if (typeof sample === 'string') {
        // If the column holds strings, treat it as TEXT. Many schemas enforce CHECK (type IN (...)).
        typeMap = { kind: 'text', col: 'type' };
        textFormatter = deriveTextFormatter(sample);
        console.log('✅ Detected type column as TEXT via sample: type');
      }
    }
    if (!typeMap) {
      // With no sample, default to TEXT to satisfy common CHECK constraints (type IN ('streak','today'))
      typeMap = { kind: 'text', col: 'type' };
      textFormatter = (k) => k;
      console.log('ℹ️ Defaulting type column to TEXT(kind): type');
    }
  } else {
    console.log('⚠️ No type column found - tasks will be inserted without type classification');
  }

  if (timeCol) console.log(`✅ Found time column: ${timeCol}`);
  if (proofCol) console.log(`✅ Found proof column: ${proofCol}`);
  if (tagsCol) console.log(`✅ Found tags column: ${tagsCol}`);

  // Identify other type-like columns to null out to satisfy shape checks
  const candidateTypeCols = ['type', 'task_type', 'kind', 'is_streak', 'streak'];
  const otherTypeCols: string[] = [];
  for (const c of candidateTypeCols) {
    // eslint-disable-next-line no-await-in-loop
    if (await columnExists(supa, c)) {
      if (!typeMap || c !== typeMap.col) otherTypeCols.push(c);
    }
  }

  const result = {
    primaryDateCol: primary,
    alsoSetDateCols,
    timeCol,
    typeMap,
    otherTypeCols,
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
  const { kind: t, col } = map.typeMap;
  if (t === 'json') {
    (row as any)[col] = { kind };
  } else if (t === 'text') {
    (row as any)[col] = kind;
  } else {
    (row as any)[col] = kind === 'streak';
  }
  for (const c of map.otherTypeCols ?? []) {
    (row as any)[c] = null;
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
  'json_union',
  'json_discriminated',
  'json_k',
  'json_t',
];

export function applyTaskTypeVariant(
  row: Record<string, unknown>,
  map: TaskColumnMap,
  logicalKind: 'today' | 'streak',
  variant: JsonTypeVariant,
) {
  if (!map.typeMap) return;
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
  const t = map.typeMap;
  if (t.kind === 'json') setJson(t.col);
  else if (t.kind === 'text') (row as any)[t.col] = logicalKind;
  else if (t.kind === 'bool') (row as any)[t.col] = logicalKind === 'streak';
  for (const c of map.otherTypeCols ?? []) {
    (row as any)[c] = null;
  }
}

export type TextTypeFormatter = (logicalKind: 'today' | 'streak') => string;
export const TEXT_TYPE_VARIANTS: TextTypeFormatter[] = [
  (k) => k,
];

export function applyTextTypeVariant(row: Record<string, unknown>, map: TaskColumnMap, logicalKind: 'today' | 'streak', formatter: TextTypeFormatter) {
  if (!map.typeMap) return;
  const t = map.typeMap;
  if (t.kind === 'text') {
    (row as any)[t.col] = formatter(logicalKind);
  } else if (t.kind === 'bool') {
    (row as any)[t.col] = logicalKind === 'streak';
  } else if (t.kind === 'json') {
    (row as any)[t.col] = { kind: logicalKind };
  }
  for (const c of map.otherTypeCols ?? []) {
    (row as any)[c] = null;
  }
}

export function setTaskDates(row: Record<string, unknown>, map: TaskColumnMap, yyyyMmDd: string) {
  row[map.primaryDateCol] = yyyyMmDd;
}

export function setTaskDatesForKind(
  row: Record<string, unknown>,
  map: TaskColumnMap,
  logicalKind: 'today' | 'streak',
  yyyyMmDd: string,
) {
  const dateOnly = yyyyMmDd;
  const toTs = (d: string) => `${d}T12:00:00Z`;
  const has = (c?: string) => (c ? map.alsoSetDateCols.includes(c) || map.primaryDateCol === c : false);

  if (logicalKind === 'streak') {
    if (has('task_date')) (row as any)['task_date'] = dateOnly;
    // Clear mutually exclusive columns
    if (has('due_at')) (row as any)['due_at'] = null;
    if (has('due_date')) (row as any)['due_date'] = null;
  } else {
    if (has('due_at')) (row as any)['due_at'] = toTs(dateOnly);
    if (has('due_date')) (row as any)['due_date'] = dateOnly;
    if (has('task_date')) (row as any)['task_date'] = null;
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
