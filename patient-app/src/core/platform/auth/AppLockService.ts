import { logger } from '../../../services/Logger';
import { AppState, AppStateStatus } from 'react-native';

export class AppLockService {
  private log = logger.scope('AppLockService');
  
  private lastActiveTime: number = Date.now();
  private TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes inactivity timeout
  private isLocked: boolean = false;
  
  private onLockCallback?: () => void;

  /**
   * Initializes AppState listener to track background/foreground transitions
   */
  public initialize(onLock: () => void): void {
    this.onLockCallback = onLock;
    
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    this.log.info('AppLockService initialized');
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.lastActiveTime = Date.now();
    } else if (nextAppState === 'active') {
      this.checkTimeout();
    }
  }

  private checkTimeout(): void {
    const inactiveDuration = Date.now() - this.lastActiveTime;
    if (inactiveDuration > this.TIMEOUT_MS && !this.isLocked) {
      this.log.warn('App timeout reached. Locking app.');
      this.isLocked = true;
      if (this.onLockCallback) {
        this.onLockCallback(); // Triggers UI to show AppLock screen
      }
    }
  }

  /**
   * Unlocks the app (typically called after successful Biometric verification)
   */
  public unlock(): void {
    this.isLocked = false;
    this.lastActiveTime = Date.now();
    this.log.info('App unlocked');
  }

  public getIsLocked(): boolean {
    return this.isLocked;
  }
}
