import { randomBytes } from 'node:crypto';

export function createId(prefix = 'id') {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function createElementorId() {
  return randomBytes(4).toString('hex');
}

export function createToken() {
  return randomBytes(32).toString('hex');
}
