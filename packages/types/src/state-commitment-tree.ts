import { z } from 'zod';
import { InnerBase64Schema } from './base64';
import { NoteSchema } from './note';

export const Position = z.object({
  epoch: z.number(),
  block: z.number(),
  commitment: z.number(),
});

export const StoredPositionSchema = z.union([
  z.object({
    Position: Position,
  }),
  z.literal('Full'),
]);

export type StoredPosition = z.infer<typeof StoredPositionSchema>;

export const StoreHashSchema = z.object({
  position: Position,
  height: z.number(),
  hash: z.instanceof(Uint8Array),
  essential: z.boolean(),
});

export type StoreHash = z.infer<typeof StoreHashSchema>;

export const StoreCommitmentSchema = z.object({
  position: Position,
  commitment: z.unknown(),
});

export type StoreCommitment = z.infer<typeof StoreCommitmentSchema>;

export const DeleteRange = z.object({
  below_height: z.number(),
  positions: z.object({
    start: Position,
    end: Position,
  }),
});

export const NctUpdatesSchema = z.object({
  set_position: StoredPositionSchema.optional(),
  set_forgotten: z.number().optional(),
  store_commitments: z.array(StoreCommitmentSchema),
  store_hashes: z.array(StoreHashSchema),
  delete_ranges: z.array(DeleteRange),
});

export type NctUpdates = z.infer<typeof NctUpdatesSchema>;

const AddressIndexSchema = z.object({
  account: z.number().optional(),
  randomizer: z.string(),
});

const NoteRecordSchema = z.object({
  noteCommitment: InnerBase64Schema,
  note: NoteSchema,
  addressIndex: AddressIndexSchema,
  nullifier: InnerBase64Schema,
  position: z.string(),
  source: InnerBase64Schema,
  heightSpent: z.bigint().optional(),
});

export type NewNoteRecord = z.infer<typeof NoteRecordSchema>;

export const ScanResultSchema = z.object({
  height: z.number(),
  nct_updates: NctUpdatesSchema,
  new_notes: z.array(NoteRecordSchema),
  new_swaps: z.array(z.unknown()),
});

export type ScanResult = z.infer<typeof ScanResultSchema>;

export const StateCommitmentTreeSchema = z.object({
  last_position: StoredPositionSchema,
  last_forgotten: z.number(),
  hashes: z.array(StoreHashSchema),
  commitments: z.array(StoreCommitmentSchema),
});

export type StateCommitmentTree = z.infer<typeof StateCommitmentTreeSchema>;