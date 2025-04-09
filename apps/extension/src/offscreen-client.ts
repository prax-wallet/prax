import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import {
  Action,
  TransactionPlan,
  WitnessData,
} from '@penumbra-zone/protobuf/penumbra/core/transaction/v1/transaction_pb';
import { ConnectError } from '@connectrpc/connect';
import { errorFromJson } from '@connectrpc/connect/protocol-connect';
import type { Jsonified } from '@penumbra-zone/types/jsonified';
import { JsonObject } from '@bufbuild/protobuf';

let active = 0;

const activateOffscreen = async () => {
  const noOffscreen = chrome.runtime
    .getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    })
    .then(offscreenContexts => !offscreenContexts.length);

  if (!active++ || (await noOffscreen)) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('/offscreen.html'),
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Manages Penumbra transaction WASM workers',
    });
  }
};

/**
 * Decrement and close if there is no remaining activity.
 */
const releaseOffscreen = async () => {
  if (!--active) {
    await chrome.offscreen.closeDocument();
  }
};

const offscreenBuild = async (Offscreen: BuildAction) =>
  chrome.runtime.sendMessage({ Offscreen }).then((res: JsonObject) => {
    if ('error' in res) {
      throw errorFromJson(res['error'], undefined, ConnectError.from('Build action worker failed'));
    } else if ('Offscreen' in res) {
      return Action.fromJson(res['Offscreen']);
    }
    throw new TypeError('Unknown response', { cause: res });
  });

const offscreenCancel = (Offscreen: Omit<BuildAction, 'actionPlanIndex'>) =>
  void chrome.runtime.sendMessage({ Offscreen });

export interface BuildAction {
  actionPlanIndex: number;
  transactionPlan: Jsonified<TransactionPlan>;
  witness: Jsonified<WitnessData>;
  fullViewingKey: Jsonified<FullViewingKey>;
}

/**
 * Build actions in parallel, in an offscreen window where we can launch Workers.
 * @returns An independently-promised list of action build results.
 */
export const buildActions = (
  transactionPlan: TransactionPlan,
  witness: WitnessData,
  fvk: Promise<FullViewingKey>,
  signal?: AbortSignal,
): Promise<Action>[] => {
  const activation = activateOffscreen();

  // this json serialization involves a lot of binary -> base64 which is slow,
  // so just do it once and reuse
  const partialRequest = fvk.then(fullViewingKey => ({
    transactionPlan: transactionPlan.toJson() as Jsonified<TransactionPlan>,
    witness: witness.toJson() as Jsonified<WitnessData>,
    fullViewingKey: fullViewingKey.toJson() as Jsonified<FullViewingKey>,
  }));

  const requestBuildTasks = () =>
    transactionPlan.actions.map((_, actionPlanIndex) =>
      activation.then(async () => offscreenBuild({ ...(await partialRequest), actionPlanIndex })),
    );

  const cancelBuildTasks = () => void partialRequest.then(offscreenCancel);

  signal?.addEventListener('abort', cancelBuildTasks);

  const buildTasks = requestBuildTasks();

  void Promise.all(buildTasks).finally(() => {
    signal?.removeEventListener('abort', cancelBuildTasks);
    void releaseOffscreen();
  });

  return buildTasks;
};
