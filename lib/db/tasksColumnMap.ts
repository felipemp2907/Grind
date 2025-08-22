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

  const result = {
    primaryDateCol: primary,
    alsoSetDateCols,
    timeCol,
    typeMap,
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
    if (map.jsonVariant) {
      applyTaskTypeVariant(row, map, kind, map.jsonVariant);
    } else {
      row[col] = { kind };
    }
  } else if (t === 'text') {
    const fmt = map.textFormatter ?? ((k: 'today' | 'streak') => k);
    row[col] = fmt(kind);
  } else {
    row[col] = kind === 'streak';
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
  if (!map.typeMap || map.typeMap.kind !== 'json') return;
  const col = map.typeMap.col;
  switch (variant) {
    case 'json_kind':
      row[col] = { kind: logicalKind };
      break;
    case 'json_type':
      row[col] = { type: logicalKind };
      break;
    case 'json_task_type':
      row[col] = { task_type: logicalKind };
      break;
    case 'json_flag':
      row[col] = logicalKind === 'streak' ? { streak: true } : { today: true };
      break;
    case 'json_string':
      row[col] = logicalKind; // JSONB string value
      break;
    case 'json_array':
      row[col] = [logicalKind];
      break;
    case 'json_union':
      row[col] = { kind: logicalKind, version: 1 };
      break;
    case 'json_discriminated':
      row[col] = { _type: logicalKind };
      break;
    case 'json_k':
      row[col] = { k: logicalKind };
      break;
    case 'json_t':
      row[col] = { t: logicalKind };
      break;
    default:
      row[col] = { kind: logicalKind };
  }
}

export type TextTypeFormatter = (logicalKind: 'today' | 'streak') => string;
export const TEXT_TYPE_VARIANTS: TextTypeFormatter[] = [
  (k) => k,
  (k) => JSON.stringify({ kind: k }),
  (k) => JSON.stringify({ type: k }),
  (k) => JSON.stringify({ task_type: k }),
  (k) => k.toUpperCase(),
];

export function applyTextTypeVariant(row: Record<string, unknown>, map: TaskColumnMap, logicalKind: 'today' | 'streak', formatter: TextTypeFormatter) {
  if (!map.typeMap || map.typeMap.kind !== 'text') return;
  const col = map.typeMap.col;
  row[col] = formatter(logicalKind);
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
