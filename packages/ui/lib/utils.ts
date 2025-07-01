import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const shorten = (str: string, endsLength = 4) =>
  str.length <= endsLength * 2 ? str : str.slice(0, endsLength) + '…' + str.slice(-endsLength);
