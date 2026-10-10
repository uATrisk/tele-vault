import { describe, it, expect } from 'vitest';
import { CRYPTO_VERSION } from './index';

describe('Crypto baseline', () => {
  it('exports CRYPTO_VERSION', () => {
    expect(CRYPTO_VERSION).toBe(1);
  });
});
