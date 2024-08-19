import { describe, test, expect } from 'vitest';
import Penumbra1Genesis from './penumbra-1-genesis.json';
import { CompactBlock } from '@buf/penumbra-zone_penumbra.bufbuild_es/penumbra/core/component/compact_block/v1/compact_block_pb';
import { JsonValue } from '@bufbuild/protobuf';

describe('Genesis block type conversion', () => {
  test('penumbra-1 deserializes correctly', () => {
    expect(() => CompactBlock.fromJson(Penumbra1Genesis as JsonValue)).not.toThrow();
  });
});
