/**
 * Small typed LRU cache backed by a Map.
 *
 * Uses JavaScript's Map insertion order to track recency:
 * - `get` promotes an entry to most-recently used.
 * - `set` evicts the least-recently used entry when the size exceeds maxSize.
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  readonly maxSize: number;

  constructor(maxSize: number) {
    if (!Number.isFinite(maxSize) || maxSize < 1) {
      throw new RangeError('LRUCache maxSize must be a positive integer');
    }
    this.maxSize = Math.floor(maxSize);
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value === undefined && !this.cache.has(key)) {
      return undefined;
    }
    // Promote to most-recently used.
    this.cache.delete(key);
    this.cache.set(key, value as V);
    return value as V;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict the oldest (least-recently used) entry.
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
}
