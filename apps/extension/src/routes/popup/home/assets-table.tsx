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
import { asValueView } from '@penumbra-zone/getters/equivalent-value';
import { useQuery } from '@tanstack/react-query';
import { viewClient } from '../../../clients';

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
      return Array.fromAsync(viewClient.balances({ accountFilter: { account } }));
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
