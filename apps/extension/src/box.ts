import { JsonValue } from '@bufbuild/protobuf';
import { base64ToUint8Array, uint8ArrayToBase64 } from '@penumbra-zone/types/base64';
import { Jsonified } from '@penumbra-zone/types/jsonified';

export interface Box {
  nonce: Uint8Array;
  cipherText: Uint8Array;
}

export const boxFromJson = (obj: JsonValue): Box => ({
  nonce: base64ToUint8Array((obj as Jsonified<Box>).nonce),
  cipherText: base64ToUint8Array((obj as Jsonified<Box>).cipherText),
});

export const boxToJson = (box: Box): Jsonified<Box> => ({
  nonce: uint8ArrayToBase64(box.nonce),
  cipherText: uint8ArrayToBase64(box.cipherText),
});
