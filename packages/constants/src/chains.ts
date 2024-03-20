// Canonical data source: https://github.com/cosmos/chain-registry/tree/master
export interface Chain {
  displayName: string;
  chainId: string;
  ibcChannel: string;
  iconUrl: string;
}

export const testnetIbcChains: Chain[] = [
  {
    displayName: 'Osmosis',
    chainId: 'osmo-test-5',
    ibcChannel: 'channel-0',
    iconUrl:
      'https://raw.githubusercontent.com/cosmos/chain-registry/f1348793beb994c6cc0256ed7ebdb48c7aa70003/osmosis/images/osmo.svg',
  },
];