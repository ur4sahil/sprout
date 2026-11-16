import type { OracleId } from '../../src/engine/types';
import { add } from './add';
import { analogy } from './analogy';
import { attribute } from './attribute';
import { compare } from './compare';
import { count } from './count';
import { fold } from './fold';
import { fraction } from './fraction';
import { graph } from './graph';
import { letter } from './letter';
import { matchEqual } from './matchEqual';
import { matrix } from './matrix';
import { missing } from './missing';
import { money } from './money';
import { numberRule } from './numberRule';
import { oddOne } from './oddOne';
import { order } from './order';
import { pattern } from './pattern';
import { place } from './place';
import { sequence } from './sequence';
import { series } from './series';
import { shapeFacts } from './shapeFacts';
import { sortBy } from './sortBy';
import { subtract } from './subtract';
import { time } from './time';
import { transform } from './transform';
import type { Oracle } from './types';
import { wordSet } from './wordSet';

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
  shapeFacts,
  place,
  letter,
  wordSet,
  analogy,
  matrix,
  transform,
  numberRule,
  series,
  fold,
  time,
  graph,
  money,
  fraction,
};
