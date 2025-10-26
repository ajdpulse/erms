import CryptoJS from 'crypto-js';

// Encryption key - in production, this should be from environment variables
const ENCRYPTION_KEY = 'ZP_CHANDRAPUR_2025_SECURE_KEY_!@#$%^&*()';

/**
 */
export const encryptPassword = (password: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting password:', error);
    return password; // Fallback to original password if encryption fails
  }
};

/**
 * Decrypt password (for server-side use)
 */
export const decryptPassword = (encryptedPassword: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Error decrypting password:', error);
    return encryptedPassword; // Fallback to original if decryption fails
  }
};

/**
 * Session timeout configuration
 */
export const SESSION_CONFIG = {
  TIMEOUT_DURATION: 5 * 60 * 1000,  // 5 minutes in milliseconds
  WARNING_DURATION: 1 * 60 * 1000,  // Show warning 1 minute before timeout
  CHECK_INTERVAL: 60 * 1000,        // Check every minute
};

/**
 * Session timeout manager
 */
export class SessionTimeoutManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private warningTimeoutId: NodeJS.Timeout | null = null;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private onTimeout: () => void;
  private onWarning: () => void;
  private isActive: boolean = false;

  constructor(onTimeout: () => void, onWarning: () => void) {
    this.onTimeout = onTimeout;
    this.onWarning = onWarning;
  }

  /**
   * Start session timeout monitoring
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastActivity = Date.now();
    this.resetTimeout();
    this.startActivityMonitoring();
    
    console.log('🔒 Session timeout monitoring started');
  }

  /**
   * Stop session timeout monitoring
   */
  stop(): void {
    this.isActive = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    
    console.log('🔓 Session timeout monitoring stopped');
  }

  /**
   * Reset timeout when user activity is detected
   */
  resetTimeout(): void {
    if (!this.isActive) return;
    
    this.lastActivity = Date.now();
    
    // Clear existing timeouts
    if (this.timeoutId) clearTimeout(this.timeoutId);
    if (this.warningTimeoutId) clearTimeout(this.warningTimeoutId);
    
    // Set warning timeout (5 minutes before session expires)
    this.warningTimeoutId = setTimeout(() => {
      if (this.isActive) {
        this.onWarning();
      }
    }, SESSION_CONFIG.TIMEOUT_DURATION - SESSION_CONFIG.WARNING_DURATION);
    
    // Set session timeout
    this.timeoutId = setTimeout(() => {
      if (this.isActive) {
        this.onTimeout();
      }
    }, SESSION_CONFIG.TIMEOUT_DURATION);
  }

  /**
   * Start monitoring user activity
   */
  private startActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => {
      this.resetTimeout();
    };
    
    // Add event listeners for user activity
    events.forEach(event => {
      document.addEventListener(event, activityHandler, true);
    });
    
    // Periodic check for session validity
    this.checkIntervalId = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      
      if (timeSinceLastActivity >= SESSION_CONFIG.TIMEOUT_DURATION) {
        this.onTimeout();
      }
    }, SESSION_CONFIG.CHECK_INTERVAL);
    
    // Clean up event listeners when stopped
    const cleanup = () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true);
      });
    };
    
    // Store cleanup function for later use
    (this as any).cleanup = cleanup;
  }

  /**
   * Extend session manually
   */
  extendSession(): void {
    this.resetTimeout();
    console.log('🔄 Session extended');
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_CONFIG.TIMEOUT_DURATION - elapsed);
  }

  /**
   * Get remaining time in human readable format
   */
  getRemainingTimeFormatted(): string {
    const remaining = this.getRemainingTime();
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}