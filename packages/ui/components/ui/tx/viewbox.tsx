'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import { IncognitoIcon } from '../icons/incognito';
import { Box } from '../box';

export interface ViewBoxProps {
  label: string;
  visibleContent?: React.ReactElement;
  isOpaque?: boolean;
}

const Label = ({ label }: { label: string }) => (
  <span className='text-lg font-bold text-gray-300'>{label}</span>
);

export const ViewBox = ({ label, visibleContent, isOpaque }: ViewBoxProps) => {
  // if isOpaque is undefined, set it to !visibleContent
  isOpaque = isOpaque ?? !visibleContent?.props;

  return (
    <Box overflow='hidden'>
      <div className={cn('flex flex-col gap-2', isOpaque ? 'cursor-not-allowed' : '')}>
        <div className='flex items-center gap-2'>
          <span className={cn('text-base', isOpaque ? 'text-gray-600' : '')}>
            {isOpaque ? (
              <div className='flex items-center gap-2'>
                <IncognitoIcon fill='#4b5563' />
                <Label label={label} />
              </div>
            ) : (
              <Label label={label} />
            )}
          </span>
        </div>
        {visibleContent && <div className='border-t border-gray-700 pt-2'>{visibleContent}</div>}
      </div>
    </Box>
  );
};

export interface ViewSectionProps {
  heading: React.ReactNode;
  children?: React.ReactNode;
}

export const ViewSection = ({ heading, children }: ViewSectionProps) => {
  return (
    <div className='grid gap-2'>
      <div className='text-xl font-bold'>{heading}</div>
      {children}
    </div>
  );
};
