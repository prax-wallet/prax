enum StorageLock {
  'Migration' = 'Migration',
  'Storage' = 'Storage',
}

export const withStorageLock = async <L>(
  opt: { mode: LockMode; signal?: AbortSignal },
  cb: (lock: Lock) => L,
): Promise<L> =>
  navigator.locks.request(
    // all storage locks globally when the lock is acquired
    `${chrome.runtime.id}${StorageLock.Storage}`,
    { ...opt, ifAvailable: false, steal: false },
    /** @note cast ok, dom type is wrong. lock will never be null when `ifAvailable` is false */
    cb as LockGrantedCallback,
  ) as Promise<L>;

export const withMigrationLock = async <L>(
  opt: { mode: LockMode; ifAvailable: boolean; signal?: AbortSignal },
  cb: (lock: Lock | null) => L | Promise<L>,
): Promise<L> =>
  navigator.locks.request(
    `${chrome.runtime.id}${StorageLock.Migration}`,
    { ...opt, steal: false },
    cb,
  ) as Promise<L>;
