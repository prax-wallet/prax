export interface PraxRevoke {
  revoke: string;
}

export const isPraxRevoke = (req: unknown): req is PraxRevoke =>
  req != null && typeof req === 'object' && 'revoke' in req && typeof req.revoke === 'string';
