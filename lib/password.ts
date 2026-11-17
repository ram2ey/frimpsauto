/** Minimum length for new passwords. Existing shorter passwords still sign in until changed. */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_BYTES = 72; // bcrypt limit

export function validNewPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH && Buffer.byteLength(password, "utf8") <= MAX_PASSWORD_BYTES;
}
