/**
 * Cookie Consent Example
 *
 * Demonstrates GDPR-compliant cookie consent handling using
 * CookieManager and StorageManager. Features:
 * - Granular consent categories (necessary, analytics, marketing)
 * - Persistent consent storage
 * - Secure cookie configuration
 * - Consent change tracking
 *
 * @packageDocumentation
 */

import { CookieManager, CookieOptions } from '@zappzarapp/browser-utils/cookie';
import { StorageManager } from '@zappzarapp/browser-utils/storage';

// =============================================================================
// Types
// =============================================================================

/** Cookie consent categories following GDPR guidelines */
interface ConsentCategories {
  /** Always required for site functionality */
  readonly necessary: true;
  /** Analytics and performance tracking */
  readonly analytics: boolean;
  /** Marketing and advertising */
  readonly marketing: boolean;
  /** Social media integration */
  readonly social: boolean;
}

/** Complete consent record with metadata */
interface ConsentRecord {
  readonly categories: ConsentCategories;
  readonly timestamp: string;
  readonly version: string;
  readonly source: 'banner' | 'settings' | 'api';
}

/** Consent banner configuration */
interface ConsentBannerConfig {
  readonly cookieName: string;
  readonly storageName: string;
  readonly consentVersion: string;
  readonly expirationDays: number;
}

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_CONFIG: ConsentBannerConfig = {
  cookieName: 'cookie_consent',
  storageName: 'consent_details',
  consentVersion: '1.0.0',
  expirationDays: 365,
};

/** Default consent state (only necessary cookies) */
const DEFAULT_CONSENT: ConsentCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
  social: false,
};

// =============================================================================
// Consent Manager Class
// =============================================================================

/**
 * Manages cookie consent with GDPR compliance.
 * Stores consent in both cookies (for server-side access) and
 * localStorage (for detailed consent record).
 */
export class ConsentManager {
  private readonly config: ConsentBannerConfig;
  private readonly storage: StorageManager<ConsentRecord>;
  private onConsentChangeCallbacks: Array<(consent: ConsentCategories) => void> = [];

  constructor(config: Partial<ConsentBannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.storage = StorageManager.create<ConsentRecord>({
      prefix: 'consent',
    });
  }

  // ===========================================================================
  // Core API
  // ===========================================================================

  /**
   * Check if user has given consent (any categories).
   * Use this to determine if consent banner should be shown.
   */
  hasConsented(): boolean {
    return CookieManager.has(this.config.cookieName);
  }

  /**
   * Check if consent needs to be renewed (version change).
   */
  needsRenewal(): boolean {
    const record = this.getConsentRecord();
    if (record === null) return true;
    return record.version !== this.config.consentVersion;
  }

  /**
   * Get current consent categories.
   * Returns default (necessary only) if no consent given.
   */
  getConsent(): ConsentCategories {
    const record = this.getConsentRecord();
    return record?.categories ?? DEFAULT_CONSENT;
  }

  /**
   * Get full consent record including metadata.
   */
  getConsentRecord(): ConsentRecord | null {
    return this.storage.get(this.config.storageName);
  }

  /**
   * Save user consent choices.
   * Stores in both cookie (for server) and localStorage (for details).
   */
  saveConsent(
    categories: Omit<ConsentCategories, 'necessary'>,
    source: ConsentRecord['source'] = 'banner'
  ): void {
    const consent: ConsentCategories = {
      necessary: true, // Always required
      ...categories,
    };

    const record: ConsentRecord = {
      categories: consent,
      timestamp: new Date().toISOString(),
      version: this.config.consentVersion,
      source,
    };

    // Store consent cookie (simplified for server-side access)
    const cookieOptions = CookieOptions.persistent(
      this.config.cookieName,
      this.config.expirationDays
    );

    CookieManager.set(this.config.cookieName, this.encodeConsentForCookie(consent), cookieOptions);

    // Store detailed record in localStorage
    this.storage.set(this.config.storageName, record);

    // Notify listeners
    this.notifyConsentChange(consent);

    console.log('[ConsentManager] Consent saved:', consent);
  }

  /**
   * Accept all cookie categories.
   */
  acceptAll(source: ConsentRecord['source'] = 'banner'): void {
    this.saveConsent(
      {
        analytics: true,
        marketing: true,
        social: true,
      },
      source
    );
  }

  /**
   * Reject all optional categories (keep only necessary).
   */
  rejectAll(source: ConsentRecord['source'] = 'banner'): void {
    this.saveConsent(
      {
        analytics: false,
        marketing: false,
        social: false,
      },
      source
    );
  }

  /**
   * Withdraw consent and remove all cookies.
   */
  withdrawConsent(): void {
    // Remove consent cookie
    CookieManager.remove(this.config.cookieName);

    // Remove consent record from storage
    this.storage.remove(this.config.storageName);

    // Notify listeners with default (necessary only)
    this.notifyConsentChange(DEFAULT_CONSENT);

    console.log('[ConsentManager] Consent withdrawn');
  }

  // ===========================================================================
  // Category Checks
  // ===========================================================================

  /**
   * Check if analytics cookies are allowed.
   */
  allowsAnalytics(): boolean {
    return this.getConsent().analytics;
  }

  /**
   * Check if marketing cookies are allowed.
   */
  allowsMarketing(): boolean {
    return this.getConsent().marketing;
  }

  /**
   * Check if social media cookies are allowed.
   */
  allowsSocial(): boolean {
    return this.getConsent().social;
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  /**
   * Register callback for consent changes.
   * Useful for enabling/disabling third-party scripts.
   */
  onConsentChange(callback: (consent: ConsentCategories) => void): () => void {
    this.onConsentChangeCallbacks.push(callback);
    return () => {
      const index = this.onConsentChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onConsentChangeCallbacks.splice(index, 1);
      }
    };
  }

  private notifyConsentChange(consent: ConsentCategories): void {
    for (const callback of this.onConsentChangeCallbacks) {
      callback(consent);
    }
  }

  // ===========================================================================
  // Cookie Encoding
  // ===========================================================================

  /**
   * Encode consent categories to a compact cookie value.
   * Format: "n1a0m0s0" (necessary=1, analytics=0, marketing=0, social=0)
   */
  private encodeConsentForCookie(consent: ConsentCategories): string {
    return [
      `n${consent.necessary ? 1 : 0}`,
      `a${consent.analytics ? 1 : 0}`,
      `m${consent.marketing ? 1 : 0}`,
      `s${consent.social ? 1 : 0}`,
    ].join('');
  }
}

// =============================================================================
// Integration Helpers
// =============================================================================

/**
 * Conditionally load a script based on consent.
 * Use this for third-party analytics, marketing scripts, etc.
 */
export function loadScriptWithConsent(
  consentManager: ConsentManager,
  category: keyof Omit<ConsentCategories, 'necessary'>,
  scriptUrl: string,
  options: { async?: boolean; defer?: boolean } = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const consent = consentManager.getConsent();

    if (!consent[category]) {
      console.log(`[ConsentManager] Script blocked (no ${category} consent):`, scriptUrl);
      reject(new Error(`No consent for category: ${category}`));
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = options.async ?? true;
    script.defer = options.defer ?? false;

    script.onload = () => {
      console.log(`[ConsentManager] Script loaded:`, scriptUrl);
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${scriptUrl}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Create a consent-aware Google Analytics loader.
 */
export function createAnalyticsLoader(
  consentManager: ConsentManager,
  measurementId: string
): () => Promise<void> {
  let loaded = false;

  return async () => {
    if (loaded) return;
    if (!consentManager.allowsAnalytics()) {
      console.log('[ConsentManager] Analytics blocked - no consent');
      return;
    }

    await loadScriptWithConsent(
      consentManager,
      'analytics',
      `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    );

    // Initialize gtag
    const w = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
    };
    w.dataLayer = w.dataLayer ?? [];
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    };
    w.gtag('js', new Date());
    w.gtag('config', measurementId);

    loaded = true;
    console.log('[ConsentManager] Google Analytics initialized');
  };
}

// =============================================================================
// Banner UI Helper
// =============================================================================

/**
 * Simple consent banner controller.
 * Manages banner visibility based on consent state.
 */
export class ConsentBanner {
  private readonly manager: ConsentManager;
  private readonly element: HTMLElement | null;

  constructor(manager: ConsentManager, bannerSelector: string) {
    this.manager = manager;
    this.element = document.querySelector(bannerSelector);
  }

  /**
   * Show banner if consent is needed.
   */
  initialize(): void {
    if (!this.element) {
      console.warn('[ConsentBanner] Banner element not found');
      return;
    }

    // Show banner if no consent or needs renewal
    if (!this.manager.hasConsented() || this.manager.needsRenewal()) {
      this.show();
    } else {
      this.hide();
    }
  }

  show(): void {
    if (this.element) {
      this.element.hidden = false;
      this.element.setAttribute('aria-hidden', 'false');
    }
  }

  hide(): void {
    if (this.element) {
      this.element.hidden = true;
      this.element.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Bind click handlers to banner buttons.
   */
  bindButtons(selectors: {
    acceptAll?: string;
    rejectAll?: string;
    savePreferences?: string;
  }): void {
    if (selectors.acceptAll) {
      const btn = document.querySelector(selectors.acceptAll);
      btn?.addEventListener('click', () => {
        this.manager.acceptAll();
        this.hide();
      });
    }

    if (selectors.rejectAll) {
      const btn = document.querySelector(selectors.rejectAll);
      btn?.addEventListener('click', () => {
        this.manager.rejectAll();
        this.hide();
      });
    }

    if (selectors.savePreferences) {
      const btn = document.querySelector(selectors.savePreferences);
      btn?.addEventListener('click', () => {
        // Read checkboxes and save preferences
        const form = this.element?.querySelector('form');
        if (form) {
          const data = new FormData(form);
          this.manager.saveConsent(
            {
              analytics: data.get('analytics') === 'on',
              marketing: data.get('marketing') === 'on',
              social: data.get('social') === 'on',
            },
            'settings'
          );
        }
        this.hide();
      });
    }
  }
}

// =============================================================================
// Usage Example
// =============================================================================

/**
 * Example initialization for a typical website.
 */
export function initCookieConsent(): ConsentManager {
  // Create consent manager
  const consentManager = new ConsentManager({
    consentVersion: '1.0.0',
    expirationDays: 365,
  });

  // Create analytics loader
  const loadAnalytics = createAnalyticsLoader(consentManager, 'G-XXXXXXXXXX');

  // Listen for consent changes
  consentManager.onConsentChange((consent) => {
    console.log('Consent changed:', consent);

    // Load analytics if now allowed
    if (consent.analytics) {
      loadAnalytics().catch(console.error);
    }

    // Trigger other consent-dependent features
    if (consent.marketing) {
      console.log('Marketing cookies enabled');
    }

    if (consent.social) {
      console.log('Social media cookies enabled');
    }
  });

  // Initialize banner
  const banner = new ConsentBanner(consentManager, '#cookie-consent-banner');
  banner.initialize();
  banner.bindButtons({
    acceptAll: '#accept-all-cookies',
    rejectAll: '#reject-all-cookies',
    savePreferences: '#save-cookie-preferences',
  });

  // Load analytics immediately if already consented
  if (consentManager.allowsAnalytics()) {
    loadAnalytics().catch(console.error);
  }

  return consentManager;
}

/*
 * Example HTML structure:
 *
 * <div id="cookie-consent-banner" hidden aria-hidden="true" role="dialog">
 *   <h2>Cookie Preferences</h2>
 *   <p>We use cookies to improve your experience.</p>
 *
 *   <form>
 *     <label>
 *       <input type="checkbox" name="necessary" checked disabled>
 *       Necessary (required)
 *     </label>
 *     <label>
 *       <input type="checkbox" name="analytics">
 *       Analytics
 *     </label>
 *     <label>
 *       <input type="checkbox" name="marketing">
 *       Marketing
 *     </label>
 *     <label>
 *       <input type="checkbox" name="social">
 *       Social Media
 *     </label>
 *   </form>
 *
 *   <button id="accept-all-cookies">Accept All</button>
 *   <button id="reject-all-cookies">Reject All</button>
 *   <button id="save-cookie-preferences">Save Preferences</button>
 * </div>
 */

// Export types and classes
export type { ConsentCategories, ConsentRecord, ConsentBannerConfig };
