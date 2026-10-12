import { randomInt } from 'node:crypto';

// No 0/O, 1/I/L, so codes are easy to read out loud and type
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;
export const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

// crypto.randomInt is a CSPRNG, so one code says nothing about the next
export function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
