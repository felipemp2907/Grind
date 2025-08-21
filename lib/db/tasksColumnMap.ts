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
  // Prefer explicit TEXT markers first
  if (await columnExists(supa, 'task_type')) {
    typeMap = { kind: 'text', col: 'task_type' };
    console.log('✅ Found type column (TEXT): task_type');
  } else if (await columnExists(supa, 'kind')) {
    typeMap = { kind: 'text', col: 'kind' };
    console.log('✅ Found type column (TEXT): kind');
  } else if (await columnExists(supa, 'is_streak')) {
    typeMap = { kind: 'bool', col: 'is_streak' };
    console.log('✅ Found type column (BOOL): is_streak');
  } else if (await columnExists(supa, 'streak')) {
    typeMap = { kind: 'bool', col: 'streak' };
    console.log('✅ Found type column (BOOL): streak');
  } else if (await columnExists(supa, 'type')) {
    // Finally consider generic 'type' column, probe a value but default to TEXT for safety
    const sample = await sampleColumnValue(supa, 'type');
    if (sample != null) {
      if (typeof sample === 'string') {
        typeMap = { kind: 'text', col: 'type' };
        console.log('✅ Detected type column as TEXT via sample: type');
      } else if (typeof sample === 'boolean') {
        typeMap = { kind: 'bool', col: 'type' };
        console.log('✅ Detected type column as BOOL via sample: type');
      } else if (typeof sample === 'object' && !Array.isArray(sample)) {
        typeMap = { kind: 'json', col: 'type' };
        console.log('✅ Detected type column as JSON via sample: type');
      }
    }
    if (!typeMap) {
      typeMap = { kind: 'text', col: 'type' };
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
    proofCol,
    tagsCol,
  };
  
  console.log('🔍 Column detection complete:', result);
  return result;
}

export function setTaskType(row: Record<string, unknown>, map: TaskColumnMap, kind: 'today' | 'streak') {
  if (!map.typeMap) return;
  const { kind: t, col } = map.typeMap;
  if (t === 'json') row[col] = { kind };
  else if (t === 'text') row[col] = kind;
  else row[col] = kind === 'streak';
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
  // Additional fallbacks for diverse JSONB constraints
  'json_string',      // JSONB string value: "today" | "streak"
  'json_array',       // JSONB array: ["today"] | ["streak"]
  'json_union',       // JSON object with extra version: { kind: 'today', version: 1 }
  'json_discriminated', // { _type: 'today' }
  'json_k',           // { k: 'today' }
  'json_t',           // { t: 'today' }
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
