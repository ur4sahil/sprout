import type { Oracle } from '../types';
import { expression3, operation3 } from './h5Expression';

// Oracles added by wave H5. Their names and facts are in src/engine/oracleFacts/h5.ts.
export const WAVE: Record<string, Oracle> = { expression3, operation3 };
