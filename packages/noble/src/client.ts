import { FullViewingKey } from '@penumbra-zone/protobuf/penumbra/core/keys/v1/keys_pb';
import { MsgRegisterAccount } from '@penumbra-zone/protobuf/noble/forwarding/v1/tx_pb';
import { bech32mAddress } from '@penumbra-zone/bech32m/penumbra';
import { getNobleForwardingAddr } from '@penumbra-zone/wasm/keys';
import { StargateClient } from '@cosmjs/stargate';
import { Any } from '@bufbuild/protobuf';
import { Tx } from '@penumbra-zone/protobuf/cosmos/tx/v1beta1/tx_pb';
import { SignMode } from '@penumbra-zone/protobuf/cosmos/tx/signing/v1beta1/signing_pb';
import { ForwardingPubKey } from '@penumbra-zone/protobuf/noble/forwarding/v1/account_pb';
import { CosmosSdkError, isCosmosSdkErr } from './error';

export enum NobleRegistrationResponse {
  // There are no funds in the account. Send funds first and request registration again.
  NeedsDeposit,
  // There were funds already deposited into the address. They have been flushed and forwarded to the sent registration address.
  Success,
  // A successful registration+flush has already occurred for this sequence number.
  AlreadyRegistered,
}

export interface NobleClientInterface {
  registerAccount: (props: {
    sequence: number;
    accountIndex?: number;
  }) => Promise<NobleRegistrationResponse>;
}

interface NobleClientProps {
  endpoint: string;
  channel: string;
  fvk: FullViewingKey;
}

export class NobleClient implements NobleClientInterface {
  private readonly channel: string;
  private readonly fvk: FullViewingKey;
  private readonly endpoint: string;

  constructor({ endpoint, channel, fvk }: NobleClientProps) {
    this.fvk = fvk;
    this.channel = channel;
    this.endpoint = endpoint;
  }

  async registerAccount({ sequence, accountIndex }: { sequence: number; accountIndex?: number }) {
    const { penumbraAddr, nobleAddrBech32, nobleAddrBytes } = getNobleForwardingAddr(
      sequence,
      this.fvk,
      this.channel,
      accountIndex,
    );

    const msg = new MsgRegisterAccount({
      signer: nobleAddrBech32,
      recipient: bech32mAddress(penumbraAddr),
      channel: this.channel,
    });

    const pubKey = new ForwardingPubKey({ key: nobleAddrBytes });

    const tx = new Tx({
      body: {
        messages: [
          new Any({ typeUrl: '/noble.forwarding.v1.MsgRegisterAccount', value: msg.toBinary() }),
        ],
      },
      authInfo: {
        signerInfos: [
          {
            publicKey: new Any({
              typeUrl: '/noble.forwarding.v1.ForwardingPubKey',
              value: pubKey.toBinary(),
            }),
            modeInfo: { sum: { case: 'single', value: { mode: SignMode.DIRECT } } },
          },
        ],
        fee: {
          gasLimit: 200000n,
        },
      },
      signatures: [new Uint8Array()],
    });

    const client = await StargateClient.connect(this.endpoint);

    try {
      const res = await client.broadcastTx(tx.toBinary());
      if (res.code !== 0) {
        throw new CosmosSdkError(res.code, 'sdk', JSON.stringify(res));
      }
      return NobleRegistrationResponse.Success;
    } catch (e) {
      if (isCosmosSdkErr(e)) {
        if (e.code === 9) {
          return NobleRegistrationResponse.NeedsDeposit;
        } else if (e.code === 19 || e.message.includes('tx already exists in cache')) {
          return NobleRegistrationResponse.AlreadyRegistered;
        }
      }
      throw e;
    }
  }
}
