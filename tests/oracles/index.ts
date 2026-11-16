import type { OracleId } from '../../src/engine/types';
import { add } from './add';
import { attribute } from './attribute';
import { compare } from './compare';
import { count } from './count';
import { matchEqual } from './matchEqual';
import { missing } from './missing';
import { oddOne } from './oddOne';
import { order } from './order';
import { pattern } from './pattern';
import { sequence } from './sequence';
import { sortBy } from './sortBy';
import { subtract } from './subtract';
import type { Oracle } from './types';

// The oracles written so far. A content phase adds the ones it needs before its first generator.
export const ORACLES: Partial<Record<OracleId, Oracle>> = {
  count,
  add,
  subtract,
  missing,
  compare,
  order,
  sequence,
  pattern,
  attribute,
  oddOne,
  sortBy,
  matchEqual,
};
