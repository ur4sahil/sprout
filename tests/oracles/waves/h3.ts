import type { Oracle } from '../types';
import { earlyWords } from './h3-earlyWords';

// Oracles added by wave H3. Their names and facts are in src/engine/oracleFacts/h3.ts.
export const WAVE: Record<string, Oracle> = { earlyWords };
