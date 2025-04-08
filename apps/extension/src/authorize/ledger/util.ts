/* eslint-disable no-restricted-syntax */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable no-bitwise */

export const DEFAULT_PATH = "m/44'/6532'/0";

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

export function convertBits(
  data: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;

  for (let p = 0; p < data.length; p++) {
    const value = data[p]!;
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  }

  return result;
}

function createChecksum(prefix: string, words: number[]): string {
  // Compute polynomial modulo
  const values = [...prefix.split('').map(c => c.charCodeAt(0) & 31), 0, ...words];
  let polymod = 1;
  for (let v of values) {
    let b = polymod >> 25;
    polymod = ((polymod & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 25; i++) {
      if ((b >> i) & 1) {
        polymod ^= 0x3b6a57b2 << i;
      }
    }
  }

  // Convert to 6 characters
  const result: string[] = [];
  for (let i = 0; i < 6; i++) {
    result.push(CHARSET[polymod & 31]!);
    polymod >>= 5;
  }
  return result.reverse().join('');
}

export function encodeBech32m(prefix: string, words: number[]): string {
  const checksum = createChecksum(prefix, words);
  let result = `${prefix}1`;
  for (const word of words) {
    result += CHARSET.charAt(word);
  }
  return result + checksum;
}
