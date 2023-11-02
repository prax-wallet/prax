'use client';

import { shorten } from '@penumbra-zone/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@penumbra-zone/ui';
import Link from 'next/link';
import { useTxs } from '../../../hooks/transactions';
import { FilledImage } from '../../../shared';

export default function TransactionTable() {
  const { data, error } = useTxs();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='text-center'>Block Height</TableHead>
          <TableHead className='text-center'>Description</TableHead>
          <TableHead className='text-center'>Transaction Hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((tx, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className='flex items-center justify-center gap-3 text-[15px] font-normal'>
                {tx.height}
              </div>
            </TableCell>
            <TableCell>
              <div className='flex items-center justify-center gap-[10px] font-normal'>
                {tx.description}
              </div>
            </TableCell>
            <TableCell>
              <div className='flex items-center justify-center gap-[10px] font-mono font-normal'>
                <Link href={`/tx/?hash=${tx.hash}`}>{shorten(tx.hash, 8)}</Link>
              </div>
            </TableCell>
            <TableCell>
              <Link href={`/tx/?hash=${tx.hash}`}>
                <FilledImage
                  src='/more.svg'
                  className='h-4 w-4 cursor-pointer hover:opacity-50'
                  alt='More'
                />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {error}
    </Table>
  );
}