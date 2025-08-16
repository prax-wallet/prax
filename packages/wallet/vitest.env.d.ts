interface ImportMetaEnv {
  readonly LEDGER_APP: string;
  readonly LEDGER_MODEL: string;
  readonly LEDGER_TIMEOUT: string;
  readonly CI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
