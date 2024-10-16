export class CosmosSdkError extends Error {
  code: number;
  codespace: string;
  log: string;

  constructor(code: number, codespace: string, log: string) {
    super(log);
    this.code = code;
    this.codespace = codespace;
    this.log = log;
  }
}

export const isCosmosSdkErr = (e: unknown): e is CosmosSdkError => {
  return e !== null && typeof e === 'object' && 'code' in e;
};
