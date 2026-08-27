import { IDatabaseDriver } from '../drivers/IDatabaseDriver';

/**
 * Monitors database health, checks for corruption, and measures query performance.
 */
export class DatabaseHealthChecker {
  private driver: IDatabaseDriver;

  constructor(driver: IDatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Runs SQLite's internal integrity check.
   */
  async checkIntegrity(): Promise<boolean> {
    try {
      const result = await this.driver.executeSql('PRAGMA integrity_check;');
      // SQLite returns a row with 'ok' if there are no errors
      const isOk = result.rows.length > 0 && result.rows[0].integrity_check === 'ok';
      return isOk;
    } catch (error) {
      console.error('[DatabaseHealthChecker] Integrity check failed', error);
      return false;
    }
  }

  /**
   * Performs a simple read to verify the database is responsive.
   */
  async ping(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.driver.executeSql('SELECT 1;');
      const duration = Date.now() - startTime;
      
      if (duration > 500) {
        console.warn(`[DatabaseHealthChecker] Ping took ${duration}ms, database may be slow.`);
      }
      return true;
    } catch (error) {
      console.error('[DatabaseHealthChecker] Ping failed', error);
      return false;
    }
  }
}
