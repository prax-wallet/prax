import { CompactBlockQuerier } from './queriers/compact-block';
import { AppQuerier } from './queriers/app';
import { TendermintQuerier } from './queriers/tendermint';
import { ShieldedPoolQuerier } from './queriers/shielded-pool';
import { IbcClientQuerier } from './queriers/ibc-client';
import { CnidariumQuerier } from './queriers/cnidarium';
import { StakeQuerier } from './queriers/staking';
import type { RootQuerierInterface } from '@penumbra-zone/types/querier';
import { AuctionQuerier } from './queriers/auction';
import { SctQuerier } from './queriers/sct';

// Given the amount of query services, this root querier aggregates them all
// to make it easier for consumers
export class RootQuerier implements RootQuerierInterface {
  readonly app: AppQuerier;
  readonly compactBlock: CompactBlockQuerier;
  readonly tendermint: TendermintQuerier;
  readonly shieldedPool: ShieldedPoolQuerier;
  readonly ibcClient: IbcClientQuerier;
  readonly sct: SctQuerier;
  readonly stake: StakeQuerier;
  readonly cnidarium: CnidariumQuerier;
  readonly auction: AuctionQuerier;

  constructor({ grpcEndpoint }: { grpcEndpoint: string }) {
    this.app = new AppQuerier({ grpcEndpoint });
    this.compactBlock = new CompactBlockQuerier({ grpcEndpoint });
    this.tendermint = new TendermintQuerier({ grpcEndpoint });
    this.shieldedPool = new ShieldedPoolQuerier({ grpcEndpoint });
    this.ibcClient = new IbcClientQuerier({ grpcEndpoint });
    this.sct = new SctQuerier({ grpcEndpoint });
    this.stake = new StakeQuerier({ grpcEndpoint });
    this.cnidarium = new CnidariumQuerier({ grpcEndpoint });
    this.auction = new AuctionQuerier({ grpcEndpoint });
  }
}
