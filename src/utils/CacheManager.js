import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

export default class CacheManager {
  /**
   * Set a value in the cache with an optional TTL (Time To Live).
   * @param {string} key - Unique cache key.
   * @param {any} value - Data to store.
   * @param {number} ttl - Expiration time in milliseconds (default: 10 mins).
   */
  static async set(key, value, ttl = DEFAULT_TTL) {
    try {
      const now = Date.now();
      const item = {
        value,
        expiry: now + ttl,
      };
      await AsyncStorage.setItem(`CACHE_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn("[CacheManager] Set error:", error);
    }
  }

  /**
   * Get a value from the cache. Returns null if expired or not found.
   * @param {string} key - Unique cache key.
   * @returns {Promise<any|null>} - Cached value or null.
   */
  static async get(key) {
    try {
      const itemStr = await AsyncStorage.getItem(`CACHE_${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = Date.now();

      if (now > item.expiry) {
        await AsyncStorage.removeItem(`CACHE_${key}`);
        return null;
      }

      return item.value;
    } catch (error) {
      console.warn("[CacheManager] Get error:", error);
      return null;
    }
  }

  /**
   * Remove a specific item from the cache.
   * @param {string} key - Unique cache key.
   */
  static async remove(key) {
    try {
      await AsyncStorage.removeItem(`CACHE_${key}`);
    } catch (error) {
      console.warn("[CacheManager] Remove error:", error);
    }
  }

  /**
   * Clear all cached items managed by this utility (prefixed with CACHE_).
   */
  static async clearAll() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith("CACHE_"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn("[CacheManager] ClearAll error:", error);
    }
  }
}
