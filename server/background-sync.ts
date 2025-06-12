import { storage } from './storage';
import { cache } from './cache';

class BackgroundSync {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  start() {
    console.log('[BackgroundSync] Starting background data sync...');
    
    // Initial sync
    this.performSync();
    
    // Set up periodic sync every 3 minutes
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 3 * 60 * 1000);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performSync() {
    if (this.isSyncing) {
      console.log('[BackgroundSync] Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;
    const startTime = Date.now();

    try {
      console.log('[BackgroundSync] Starting data sync...');

      // Warm up the cache with frequently accessed data
      await Promise.all([
        storage.getCranes(),
        storage.getFailureRecords(),
        storage.getUniqueFactories(),
        storage.getUniqueCraneNames(),
        storage.getDashboardSummary()
      ]);

      const duration = Date.now() - startTime;
      console.log(`[BackgroundSync] Sync completed in ${duration}ms`);
    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // Force a sync (useful for testing or manual refresh)
  async forceSync() {
    this.isSyncing = false; // Reset flag
    await this.performSync();
  }

  // Clear all cache and perform fresh sync
  async refresh() {
    console.log('[BackgroundSync] Clearing cache and refreshing data...');
    cache.clear();
    await this.forceSync();
  }
}

export const backgroundSync = new BackgroundSync();