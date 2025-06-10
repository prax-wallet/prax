import {
  TransactionPlan,
  WitnessData,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import type { ActionBuildRequest } from '@penumbra-zone/types/internal-msg/offscreen';
import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';

// necessary to propagate errors that occur in promises
// see: https://stackoverflow.com/questions/39992417/how-to-bubble-a-web-worker-error-in-a-promise-via-worker-onerror
self.addEventListener(
  'unhandledrejection',
  event => {
    // the event object has two special properties:
    // event.promise - the promise that generated the error
    // event.reason  - the unhandled error object
    throw event.reason;
  },
  { once: true },
);

const workerListener = ({ data }: { data: ActionBuildRequest }) => {
  const {
    transactionPlan: transactionPlanJson,
    witness: witnessJson,
    fullViewingKey: fullViewingKeyJson,
    actionPlanIndex,
  } = data;

  // Deserialize payload
  const transactionPlan = TransactionPlan.fromJson(transactionPlanJson);
  const witness = WitnessData.fromJson(witnessJson);
  const fullViewingKey = FullViewingKey.fromJson(fullViewingKeyJson);

  void executeWorker(transactionPlan, witness, fullViewingKey, actionPlanIndex).then(
    self.postMessage,
  );
};

self.addEventListener('message', workerListener, { once: true });

async function executeWorker(
  transactionPlan: TransactionPlan,
  witness: WitnessData,
  fullViewingKey: FullViewingKey,
  actionPlanIndex: number,
): Promise<{ witness: number[]; matrices: number[] }> {
  // Dynamically load wasm module
  const penumbraWasmModule = await import('@penumbra-zone/wasm/build');

  // Build action according to specification in `TransactionPlan`
  const result = await penumbraWasmModule.buildDelegatedProving(
    transactionPlan,
    witness,
    fullViewingKey,
    actionPlanIndex,
  );

  // Convert Uint8Arrays to number arrays for JSON serialization
  return {
    witness: Array.from(result.witness),
    matrices: Array.from(result.matrices),
  };
}
