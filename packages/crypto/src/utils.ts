// Low-level binary, encoding, and random utilities using WebCrypto

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BASE32_MAP: Record<string, number> = {};
for (let i = 0; i < BASE32_ALPHABET.length; i++) {
  BASE32_MAP[BASE32_ALPHABET[i]] = i;
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`Invalid hex string length: ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const val = parseInt(hex.substring(i, i + 2), 16);
    if (Number.isNaN(val)) {
      throw new Error(`Invalid hex character in: ${hex.substring(i, i + 2)}`);
    }
    bytes[i / 2] = val;
  }
  return bytes;
}

export function u32be(value: number): Uint8Array {
  if (value < 0 || value > 0xffffffff || !Number.isInteger(value)) {
    throw new RangeError(`u32be out of range: ${value}`);
  }
  const buf = new Uint8Array(4);
  const view = new DataView(buf.buffer);
  view.setUint32(0, value, false); // big-endian
  return buf;
}

export function readU32be(bytes: Uint8Array, offset = 0): number {
  if (bytes.length < offset + 4) {
    throw new RangeError('Buffer too small to read u32be');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
  return view.getUint32(0, false);
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Safely casts a Uint8Array to WebCrypto BufferSource to satisfy TypeScript 5.7+
 * strict typing where Uint8Array is generic over ArrayBufferLike.
 */
export function toBufferSource(arr: Uint8Array): BufferSource {
  return arr as unknown as BufferSource;
}

export async function sha256Digest(data: Uint8Array): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', toBufferSource(data));
  return bytesToHex(new Uint8Array(hashBuf));
}

/**
 * Encodes bytes into RFC 4648 Base32 without padding.
 * 32 bytes (256 bits) produces 52 characters.
 */
export function base32Encode(data: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < data.length; i++) {
    value = (value << 8) | data[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes RFC 4648 Base32 string (without padding, case-insensitive).
 */
export function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const result: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const val = BASE32_MAP[char];
    if (val === undefined) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(result);
}

/**
 * Formats a 52-character base32 recovery key into groups of 4 separated by hyphens.
 * (13 groups of 4 = 52 chars).
 */
export function formatRecoveryKey(base32Str: string): string {
  const clean = base32Str.toUpperCase().replace(/[\s-]/g, '');
  if (clean.length !== 52) {
    throw new Error(`Invalid recovery key character count: expected 52, got ${clean.length}`);
  }
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    groups.push(clean.substring(i, i + 4));
  }
  return groups.join('-');
}

/**
 * Parses and verifies a formatted recovery key string. Returns 32 raw bytes.
 */
export function parseRecoveryKey(inputStr: string): Uint8Array {
  const bytes = base32Decode(inputStr);
  if (bytes.length !== 32) {
    throw new Error(`Invalid recovery key byte length: expected 32 bytes, got ${bytes.length}`);
  }
  return bytes;
}
