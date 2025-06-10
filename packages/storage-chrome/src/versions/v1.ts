/**
 * @attention Move `MatchOrNever` when writing a new migration.
 *
 * Write a local declaration matching any imported type. If an imported types
 * changes shape, this will output a `never` type, causing type errors.
 *
 * Historic storage formats should not import any types, and should statically
 * declare the entire format locally.
 *
 * @warning Can't detect format changes not reflected in the type.
 * @warning You must manually confirm things like string formats.
 */
type MatchOrNever<I, L extends I> = I extends L
  ? Extract<L, Pick<I, keyof L>> & Extract<I, Pick<L, keyof I>>
  : never;

export type local = {
  wallets: MatchOrNever<
    import('@penumbra-zone/types/wallet').WalletJson,
    {
      label: string;
      custody: {
        encryptedSeedPhrase: MatchOrNever<
          import('@penumbra-zone/types/box').BoxJson,
          { nonce: string; cipherText: string }
        >;
      };
      id: string;
      fullViewingKey: string;
    }
  >[];
  grpcEndpoint: string | undefined;
  frontendUrl: string | undefined;
  passwordKeyPrint?: MatchOrNever<
    import('@penumbra-zone/crypto-web/encryption').KeyPrintJson,
    { hash: string; salt: string }
  >;
  fullSyncHeight?: number;
  knownSites: { origin: string; choice: 'Approved' | 'Denied' | 'Ignored'; date: number }[];
  /** AppParameters JSON string */
  params: string | undefined;
  /** AssetId JSON string array */
  numeraires: string[];
  walletCreationBlockHeight: number | undefined;
  compactFrontierBlockHeight: number | undefined;
  backupReminderSeen: boolean | undefined;
};

export type sync = never;

export type session = {
  passwordKey: import('@penumbra-zone/crypto-web/encryption').KeyJson | undefined;
};
