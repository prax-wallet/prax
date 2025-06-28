export class MockStorageArea implements chrome.storage.StorageArea {
  public mock = new Map<string, unknown>();

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
    return Promise.resolve();
  }

  async set(items: Record<string, unknown>) {
    console.debug('MockStorageArea.set', items);
    for (const [key, value] of Object.entries(items)) {
      // In chrome storage, setting undefined values is a no-op
      if (value !== undefined) {
        this.mock.set(key, value);
      }
    }
    return Promise.resolve();
  }

  get onChanged(): chrome.storage.StorageAreaChangedEvent {
    return {
      addListener: listener => {
        console.debug('MockStorageArea.onChanged.addListener', listener);
      },
      removeListener: listener => {
        console.debug('MockStorageArea.onChanged.removeListener', listener);
      },
      hasListener: listener => {
        console.debug('MockStorageArea.onChanged.hasListener', listener);
        throw new Error('Not implemented');
      },
      hasListeners: () => {
        console.debug('MockStorageArea.onChanged.hasListeners');
        throw new Error('Not implemented');
      },
      getRules: undefined as never,
      addRules: undefined as never,
      removeRules: undefined as never,
    };
  }

  async clear() {
    console.debug('MockStorageArea.clear');
    this.mock.clear();
    return Promise.resolve();
  }

  async setAccessLevel() {
    console.debug('MockStorageArea.setAccessLevel');
    return Promise.reject(new Error('Not implemented'));
  }
}
