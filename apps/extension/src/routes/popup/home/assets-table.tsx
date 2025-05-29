import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { ValueViewComponent } from '@repo/ui/components/ui/value';
import { ValueView } from '@penumbra-zone/protobuf/penumbra/core/asset/v1/asset_pb';
import { getDisplayDenomFromView, getEquivalentValues } from '@penumbra-zone/getters/value-view';
import { getMetadataFromBalancesResponse } from '@penumbra-zone/getters/balances-response';
import { asValueView } from '@penumbra-zone/getters/equivalent-value';
import { useQuery } from '@tanstack/react-query';
import { viewClient } from '../../../clients';
import { assetPatterns } from '@penumbra-zone/types/assets';

const EquivalentValues = ({ valueView }: { valueView?: ValueView }) => {
  const equivalentValuesAsValueViews = (getEquivalentValues.optional(valueView) ?? []).map(
    asValueView,
  );

  return (
    <div className='flex flex-wrap gap-2'>
      {equivalentValuesAsValueViews.map(equivalentValueAsValueView => (
        <ValueViewComponent
          key={getDisplayDenomFromView(equivalentValueAsValueView)}
          view={equivalentValueAsValueView}
          variant='equivalent'
        />
      ))}
    </div>
  );
};

export interface AssetsTableProps {
  account: number;
}

export const AssetsTable = ({ account }: AssetsTableProps) => {
  const {
    data: balances,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['balances', account],
    staleTime: Infinity,
    queryFn: async () => {
      try {
        const allBalances = await Array.fromAsync(
          viewClient.balances({ accountFilter: { account } }),
        );

        // Filter out auction, voted, and LP NFT assets by checking for relevant identifiers in the base metadata field.
        const filteredBalances = allBalances.filter(balance => {
          const metadata = getMetadataFromBalancesResponse.optional(balance);

          // We probably want to display unknown assets
          if (!metadata) {
            return true;
          }

          if (metadata.base && typeof metadata.base === 'string') {
            if (
              assetPatterns.auctionNft.matches(metadata.base) ||
              assetPatterns.lpNft.matches(metadata.base) ||
              assetPatterns.proposalNft.matches(metadata.base) ||
              assetPatterns.votingReceipt.matches(metadata.base)
            ) {
              return false;
            }
          }

          return true;
        });

        filteredBalances.sort((a, b) => {
          const aScore = getMetadataFromBalancesResponse.optional(a)?.priorityScore ?? 0n;
          const bScore = getMetadataFromBalancesResponse.optional(b)?.priorityScore ?? 0n;
          return Number(bScore - aScore);
        });

        return filteredBalances;
      } catch (_) {
        return [];
      }
    },
  });

  if (isLoading || error || !balances?.length) {
    return null;
  }

  return (
    <Table>
      <TableHeader className='group'>
        <TableRow>
          <TableHead>Balance</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {balances.map((assetBalance, index) => (
          <TableRow className='group' key={index}>
            <TableCell>
              <ValueViewComponent view={assetBalance.balanceView} />
            </TableCell>
            <TableCell>
              <EquivalentValues valueView={assetBalance.balanceView} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
