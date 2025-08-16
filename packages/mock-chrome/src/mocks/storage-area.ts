/* eslint-disable @typescript-eslint/consistent-indexed-object-style -- meets external mapped types */
export class MockStorageArea implements chrome.storage.StorageArea {
  public mock = new MapWithUpdates<string, unknown>();

  public listeners = new Set<(changes: { [key: string]: chrome.storage.StorageChange }) => void>();

  get(cb: (result: Record<string, unknown>) => void): void;
  get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
  get(
    query?:
      | string
      | string[]
      | Record<string, unknown>
      | null
      | ((result: Record<string, unknown>) => void),
  ): void | Promise<Record<string, unknown>> {
    console.debug('MockStorageArea.get', query);
    let result: Record<string, unknown>;

    if (query == null || typeof query === 'function') {
      result = Object.fromEntries(this.mock.entries());
    } else if (typeof query === 'string') {
      result = this.mock.has(query) ? { [query]: this.mock.get(query) } : {};
    } else if (Array.isArray(query)) {
      result = Object.fromEntries(
        query.filter(key => this.mock.has(key)).map(key => [key, this.mock.get(key)] as const),
      );
    } else if (typeof query === 'object') {
      result = {
        ...query,
        ...Object.fromEntries(
          Object.keys(query)
            .filter(key => this.mock.has(key))
            .map(key => [key, this.mock.get(key)] as const),
        ),
      };
    } else {
      throw new TypeError('Invalid query');
    }

    if (typeof query !== 'function') {
      return Promise.resolve(result);
    } else {
      query(result);
    }
  }

  async getBytesInUse() {
    console.debug('MockStorageArea.getBytesInUse', this.mock.size);
    return Promise.resolve(this.mock.size);
  }

  async remove(query: string | string[]) {
    console.debug('MockStorageArea.remove', query);
    if (typeof query === 'string') {
      this.mock.delete(query);
      return Promise.resolve();
    } else if (Array.isArray(query)) {
      for (const key of query) {
        this.mock.delete(key);
      }
    } else {
      throw new TypeError('Invalid query');
    }

    const updates = this.mock.flushUpdates();
    const callListeners = Promise.all(
      Array.from(this.listeners).map(listener => Promise.resolve(updates).then(listener)),
    );
    void callListeners;

    return Promise.resolve();
  }

  async set(items: Record<string, unknown>) {
    console.debug('MockStorageArea.set', items);
    for (const [key, value] of Object.entries(items)) {
      // In chrome storage, setting certain values is a no-op
      if (
        !(value === undefined || Number.isNaN(value) || value === Infinity || value === -Infinity)
      ) {
        this.mock.set(key, value);
      }
    }

    const updates = this.mock.flushUpdates();
    const callListeners = Promise.all(
      Array.from(this.listeners).map(listener => Promise.resolve(updates).then(listener)),
    );
    void callListeners;

    return Promise.resolve();
  }

  get onChanged(): chrome.storage.StorageAreaChangedEvent {
    return {
      addListener: listener => this.listeners.add(listener),
      removeListener: listener => this.listeners.delete(listener),
      hasListener: listener => this.listeners.has(listener),
      hasListeners: () => this.listeners.size > 0,
      getRules: undefined as never,
      addRules: undefined as never,
      removeRules: undefined as never,
    };
  }

  async clear() {
    console.debug('MockStorageArea.clear');
    this.mock.clear();

    const updates = this.mock.flushUpdates();
    const callListeners = Promise.all(
      Array.from(this.listeners).map(listener => Promise.resolve(updates).then(listener)),
    );
    void callListeners;

    return Promise.resolve();
  }

  async setAccessLevel() {
    console.debug('MockStorageArea.setAccessLevel');
    return Promise.reject(new Error('Not implemented'));
  }
}

class MapWithUpdates<K extends string, V> extends Map<K, V> {
  public previous = new Map<K, V | undefined>();

  override set(key: K, value: V) {
    this.previous.set(key, super.get(key));
    return super.set(key, value);
  }

  override delete(key: K): boolean {
    if (super.has(key)) {
      this.previous.set(key, super.get(key));
    }
    return super.delete(key);
  }

  override clear() {
    this.previous = new Map(super.entries());
    super.clear();
  }

  flushUpdates() {
    const updates = new Map<K, chrome.storage.StorageChange>();

    for (const [key, oldValue] of this.previous.entries()) {
      updates.set(key, { oldValue, newValue: super.get(key) });
    }

    this.previous.clear();

    return Object.fromEntries(updates.entries()) as {
      [key: string]: chrome.storage.StorageChange;
    };
  }
}
