import { describe, test, expect } from 'vitest';
import { CompactBlock } from '@penumbra-zone/protobuf/penumbra/core/component/compact_block/v1/compact_block_pb';
import { join } from 'path';
import { readFileSync } from 'fs';

describe('Genesis block type conversion', () => {
  test('penumbra-1 deserializes correctly', () => {
    const filePath = join(__dirname, '../../../apps/extension/public/penumbra-1-genesis.bin');
    const genesisBinaryData = readFileSync(filePath);
    expect(() => CompactBlock.fromBinary(new Uint8Array(genesisBinaryData))).not.toThrow();
  });
});
