import type { OracleId } from '../../src/engine/types';
import { add } from './add';
import { analogy } from './analogy';
import { attribute } from './attribute';
import { compare } from './compare';
import { count } from './count';
import { estimate } from './estimate';
import { fold } from './fold';
import { fraction } from './fraction';
import { graph } from './graph';
import { letter } from './letter';
import { line } from './line';
import { makeTen } from './makeTen';
import { matchEqual } from './matchEqual';
import { matrix } from './matrix';
import { measure } from './measure';
import { missing } from './missing';
import { money } from './money';
import { multiply } from './multiply';
import { numberName } from './numberName';
import { numberRule } from './numberRule';
import { oddOne } from './oddOne';
import { order } from './order';
import { parity } from './parity';
import { pattern } from './pattern';
import { place } from './place';
import { round } from './round';
import { sentence } from './sentence';
import { sequence } from './sequence';
import { series } from './series';
import { shapeFacts } from './shapeFacts';
import { sortBy } from './sortBy';
import { spell } from './spell';
import { subtract } from './subtract';
import { time } from './time';
import { transform } from './transform';
import { truth } from './truth';
import { twoStep } from './twoStep';
import type { Oracle } from './types';
import { wordSet } from './wordSet';

// The oracles written so far. A content phase adds the ones it needs before its first generator.
export const ORACLES: Partial<Record<OracleId, Oracle>> = {
  numberName,
  round,
  estimate,
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
  makeTen,
  truth,
  parity,
  line,
  measure,
  multiply,
  twoStep,
  spell,
  sentence,
};
