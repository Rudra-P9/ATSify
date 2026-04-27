import { ATSProfile } from './types';
import { WORKDAY_PROFILE } from './workday';
import { TALEO_PROFILE } from './taleo';
import { ICIMS_PROFILE } from './icims';
import { GREENHOUSE_PROFILE } from './greenhouse';
import { LEVER_PROFILE } from './lever';
import { SUCCESSFACTORS_PROFILE } from './successfactors';

export const PLATFORMS: ATSProfile[] = [
  WORKDAY_PROFILE,
  TALEO_PROFILE,
  ICIMS_PROFILE,
  GREENHOUSE_PROFILE,
  LEVER_PROFILE,
  SUCCESSFACTORS_PROFILE
];

export * from './types';
export * from './workday';
export * from './taleo';
export * from './icims';
export * from './greenhouse';
export * from './lever';
export * from './successfactors';
