// ─── Keyboard Profiles Registry ─────────────────────────────────────────────
import { AULA_F87_PROFILE } from './aula/f87';

export const KEYBOARD_PROFILES = [
  AULA_F87_PROFILE,
  // Easily extend with additional keyboard profiles in the future:
  // AULA_F75_PROFILE,
  // AULA_F99_PROFILE,
  // RK84_PROFILE,
];

export const DEFAULT_KEYBOARD_PROFILE = AULA_F87_PROFILE;

/**
 * Match a connected WebHID device to a supported keyboard profile
 */
export function findKeyboardProfile(vendorId, productId) {
  return KEYBOARD_PROFILES.find(
    p => p.vid === vendorId && p.pid === productId
  ) || DEFAULT_KEYBOARD_PROFILE;
}

export const PROFILE_DRIVERS = {
  'aula-f87-pro': () => import('./aula/f87.js'),
};

export async function getProfileDriver(profileId) {
  const loader = PROFILE_DRIVERS[profileId] || PROFILE_DRIVERS['aula-f87-pro'];
  const module = await loader();
  return module.AULA_F87_PROFILE || module.default;
}
