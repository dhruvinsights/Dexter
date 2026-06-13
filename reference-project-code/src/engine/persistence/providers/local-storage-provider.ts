import { errorManagerInstance } from '@app/engine/utils/errorManager';
import { StorageKey } from '../storage-key';
import type { StorageProvider, StorageProviderConfig } from '../storage-provider';

/**
 * LocalStorage implementation of StorageProvider.
 *
 * Provides synchronous-like access to localStorage with the async interface
 * required by the StorageProvider contract. Includes cross-tab synchronization
 * via StorageEvent listeners.
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly config_: StorageProviderConfig;
  private readonly subscribers_: Set<(key: string, value: string | null) => void> = new Set();
  private storageListener_: ((e: StorageEvent) => void) | null = null;

  constructor(config: StorageProviderConfig = {}) {
    this.config_ = config;
  }

  // eslint-disable-next-line require-await
  async initialize(): Promise<void> {
    // Set up cross-tab synchronization using storage events
    this.storageListener_ = (e: StorageEvent) => {
      if (e.key && Object.values(StorageKey).includes(e.key as StorageKey)) {
        this.notifySubscribers_(e.key, e.newValue);
      }
    };

    globalThis.addEventListener('storage', this.storageListener_);
  }

  // eslint-disable-next-line require-await
  async readAll(): Promise<Map<string, string>> {
    const map = new Map<string, string>();

    for (const key of Object.values(StorageKey)) {
      try {
        const val = localStorage.getItem(key);

        if (val !== null) {
          map.set(key, val);
        }
      } catch (error) {
        this.handleError_(new Error(`Failed to read key ${key}: ${error}`));
      }
    }

    return map;
  }

  // eslint-disable-next-line require-await
  async read(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      this.handleError_(new Error(`Failed to read from localStorage: ${error}`));

      return null;
    }
  }

  // eslint-disable-next-line require-await
  async write(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      this.handleError_(new Error(`Failed to write to localStorage: ${error}`));
    }
  }

  // eslint-disable-next-line require-await
  async writeBatch(entries: Map<string, string>): Promise<void> {
    for (const [key, value] of entries) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        this.handleError_(new Error(`Failed to write key ${key}: ${error}`));
      }
    }
  }

  // eslint-disable-next-line require-await
  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      this.handleError_(new Error(`Failed to remove from localStorage: ${error}`));
    }
  }

  // eslint-disable-next-line require-await
  async clear(): Promise<void> {
    for (const key of Object.values(StorageKey)) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        this.handleError_(new Error(`Failed to clear key ${key}: ${error}`));
      }
    }
  }

  subscribe(callback: (key: string, value: string | null) => void): () => void {
    this.subscribers_.add(callback);

    return () => {
      this.subscribers_.delete(callback);
    };
  }

  isConnected(): boolean {
    try {
      const test = '__storage_test__';

      localStorage.setItem(test, test);
      localStorage.removeItem(test);

      return true;
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line require-await
  async dispose(): Promise<void> {
    if (this.storageListener_) {
      globalThis.removeEventListener('storage', this.storageListener_);
      this.storageListener_ = null;
    }
    this.subscribers_.clear();
  }

  private notifySubscribers_(key: string, value: string | null): void {
    this.subscribers_.forEach((callback) => {
      try {
        callback(key, value);
      } catch (error) {
        errorManagerInstance.warn('Error in storage subscriber:', error);
      }
    });
  }

  private handleError_(error: Error): void {
    errorManagerInstance.warn('LocalStorageProvider error:', error);
    if (this.config_.onError) {
      this.config_.onError(error);
    }
  }
}
