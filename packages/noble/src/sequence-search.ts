import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { NobleClientInterface, NobleRegistrationResponse } from './client';

// Search space (sequence number) is 2 bytes wide
export const MAX_SEQUENCE_NUMBER = 65535;

// Perform binary search to find the earliest unused noble sequence number
export const getNextSequence = async ({
  fvk,
  accountIndex,
  client,
}: {
  client: NobleClientInterface;
  fvk: FullViewingKey;
  accountIndex?: number;
}): Promise<number> => {
  const left = 0;
  const right = MAX_SEQUENCE_NUMBER;

  const nextSeq = await _getNextSequence({ fvk, accountIndex, client, left, right });
  if (nextSeq !== undefined) {
    return nextSeq;
  } else {
    // All sequence numbers are used, return a random one.
    // As it is already registered, it will flush automatically.
    return Math.floor(Math.random() * (MAX_SEQUENCE_NUMBER + 1));
  }
};

// Helper function to perform recursive binary search
const _getNextSequence = async ({
  left,
  right,
  client,
  fvk,
  accountIndex,
}: {
  left: number;
  right: number;
  client: NobleClientInterface;
  fvk: FullViewingKey;
  accountIndex?: number;
}): Promise<number | undefined> => {
  // Entire search sequence space has been exhausted
  if (left > right) {
    return undefined;
  }

  const mid = Math.floor((left + right) / 2);
  const response = await client.registerAccount({ sequence: mid, accountIndex });

  switch (response) {
    case NobleRegistrationResponse.NeedsDeposit: {
      // Found an unused sequence number. Now, check if there's an earlier one.
      const leftResult = await _getNextSequence({
        left,
        right: mid - 1,
        client,
        fvk,
        accountIndex,
      });
      return leftResult ?? mid;
    }
    case NobleRegistrationResponse.Success:
    // This means the midpoint had a deposit in it waiting for registration.
    // This will "flush" this unregistered address, however the user still wants a new one, so continue the search
    // eslint-disable-next-line no-fallthrough -- see above
    case NobleRegistrationResponse.AlreadyRegistered:
      // The midpoint has been registered already, search the right-hand side
      return _getNextSequence({
        left: mid + 1,
        right,
        fvk,
        accountIndex,
        client,
      });
  }
};
