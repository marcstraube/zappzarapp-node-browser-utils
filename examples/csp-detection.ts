// noinspection JSUnusedGlobalSymbols - Example file

/**
 * CSP Detection Example - Content Security Policy detection and nonce handling
 *
 * This example demonstrates:
 * - Detecting CSP restrictions (inline scripts, eval, inline styles)
 * - Generating secure nonces for script tags
 * - Calculating hashes for script integrity
 * - Handling CSP violations with event listeners
 * - Using NonceManager for automatic nonce rotation
 * - Checking if URLs are allowed by CSP directives
 * - Building CSP-aware components
 *
 * @packageDocumentation
 */

import { type CleanupFn } from '@zappzarapp/browser-utils/core';
import { CspUtils, NonceManager, type CspViolationDetail } from '@zappzarapp/browser-utils/csp';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * CSP capability report.
 */
interface CspCapabilities {
  readonly inlineScripts: boolean;
  readonly eval: boolean;
  readonly inlineStyles: boolean;
  readonly timestamp: number;
}

/**
 * Script loading strategy based on CSP.
 */
type ScriptStrategy = 'inline' | 'nonce' | 'hash' | 'external';

// =============================================================================
// Basic CSP Detection
// =============================================================================

/**
 * Check what CSP allows in the current page.
 */
function detectCspCapabilities(): CspCapabilities {
  console.log('--- CSP Capability Detection ---');

  // Clear cache for fresh detection
  CspUtils.clearCache();

  const capabilities: CspCapabilities = {
    inlineScripts: CspUtils.allowsInlineScript(),
    eval: CspUtils.allowsEval(),
    inlineStyles: CspUtils.allowsInlineStyle(),
    timestamp: Date.now(),
  };

  console.log('CSP Capabilities:');
  console.log(`  Inline scripts: ${capabilities.inlineScripts ? 'ALLOWED' : 'BLOCKED'}`);
  console.log(`  eval/Function: ${capabilities.eval ? 'ALLOWED' : 'BLOCKED'}`);
  console.log(`  Inline styles: ${capabilities.inlineStyles ? 'ALLOWED' : 'BLOCKED'}`);

  // Provide guidance based on restrictions
  if (!capabilities.inlineScripts) {
    console.log('\nNote: Inline scripts are blocked.');
    console.log('      Use nonces, hashes, or external scripts.');
  }

  if (!capabilities.eval) {
    console.log('\nNote: eval() and new Function() are blocked.');
    console.log('      Avoid dynamic code execution.');
  }

  return capabilities;
}

/**
 * Determine the best script loading strategy based on CSP.
 */
function determineScriptStrategy(): ScriptStrategy {
  console.log('\n--- Determining Script Strategy ---');

  if (CspUtils.allowsInlineScript()) {
    console.log('Strategy: inline (no CSP restrictions on inline scripts)');
    return 'inline';
  }

  // If inline blocked, we need nonce or hash
  // Nonce is preferred for dynamic content
  console.log('Strategy: nonce (CSP blocks inline scripts, using nonces)');
  return 'nonce';
}

// =============================================================================
// Nonce Generation
// =============================================================================

/**
 * Generate and use a nonce for script execution.
 */
function nonceGenerationExample(): void {
  console.log('\n--- Nonce Generation ---');

  // Generate a secure nonce (16 bytes = 128 bits of entropy)
  const nonce = CspUtils.generateNonce();
  console.log(`Generated nonce: ${nonce}`);
  console.log(`Nonce length: ${nonce.length} characters`);

  // Generate with custom length (32 bytes = 256 bits)
  const strongNonce = CspUtils.generateNonce(32);
  console.log(`Strong nonce (32 bytes): ${strongNonce}`);

  // How to use the nonce
  console.log('\nUsage example:');
  console.log(`1. Add to CSP header: script-src 'nonce-${nonce}'`);
  console.log(`2. Add to script tag: <script nonce="${nonce}">...</script>`);
}

/**
 * Example: Creating a script element with nonce.
 */
function createScriptWithNonce(code: string, nonce: string): HTMLScriptElement | null {
  if (typeof document === 'undefined') {
    console.log('Document not available (server-side)');
    return null;
  }

  const script = document.createElement('script');
  script.nonce = nonce;
  script.textContent = code;

  console.log(`Created script element with nonce: ${nonce.substring(0, 8)}...`);

  return script;
}

// =============================================================================
// Hash Calculation
// =============================================================================

/**
 * Calculate script hash for CSP integrity.
 */
async function hashCalculationExample(): Promise<void> {
  console.log('\n--- Hash Calculation ---');

  const scriptContent = 'console.log("Hello from hashed script!");';

  // Calculate SHA-256 hash
  const hash = await CspUtils.calculateHash(scriptContent);

  if (hash !== undefined) {
    console.log(`Script content: ${scriptContent}`);
    console.log(`SHA-256 hash: ${hash}`);
    console.log(`\nAdd to CSP header: script-src '${hash}'`);
  } else {
    console.log('Hash calculation not available (crypto.subtle missing)');
  }

  // Example with multiple scripts
  console.log('\nCalculating hashes for multiple scripts:');
  const scripts = ['alert("Script 1")', 'console.log("Script 2")', 'document.ready()'];

  for (const script of scripts) {
    const scriptHash = await CspUtils.calculateHash(script);
    if (scriptHash !== undefined) {
      console.log(`  "${script.substring(0, 20)}..." -> ${scriptHash.substring(0, 30)}...`);
    }
  }
}

// =============================================================================
// Nonce Manager
// =============================================================================

/**
 * Using NonceManager for automatic nonce rotation.
 */
function nonceManagerExample(): CleanupFn {
  console.log('\n--- Nonce Manager ---');

  // Create a nonce manager
  const manager = NonceManager.create({
    nonceLength: 16, // 128 bits
  });

  const currentNonce = manager.getCurrentNonce();
  console.log(`Initial nonce: ${currentNonce}`);

  // Manual rotation
  const newNonce = manager.rotateNonce();
  console.log(`After rotation: ${newNonce}`);

  // Generate without rotation (for preview/validation)
  const previewNonce = manager.generateNonce();
  console.log(`Preview nonce (not active): ${previewNonce}`);
  console.log(`Current still: ${manager.getCurrentNonce()}`);

  manager.destroy();

  return () => {};
}

/**
 * Using NonceManager with automatic rotation.
 */
function autoRotatingNonceExample(): CleanupFn {
  console.log('\n--- Auto-Rotating Nonce Manager ---');

  // Create manager with auto-rotation
  const manager = NonceManager.create({
    autoRotate: true,
    rotationInterval: 5000, // 5 seconds for demo (use longer in production)
    nonceLength: 16,
  });

  console.log(`Initial nonce: ${manager.getCurrentNonce()}`);
  console.log(`Auto-rotating: ${manager.isAutoRotating()}`);

  // Subscribe to rotation events
  const cleanup = manager.onRotation((newNonce, oldNonce) => {
    console.log(`[Rotation] ${oldNonce.substring(0, 8)}... -> ${newNonce.substring(0, 8)}...`);
    // In a real app, update your CSP header or script nonces here
  });

  console.log('Nonce will rotate every 5 seconds...');

  // Return cleanup that stops rotation and removes handler
  return () => {
    cleanup();
    manager.destroy();
    console.log('Auto-rotation stopped and manager destroyed');
  };
}

// =============================================================================
// CSP Violation Monitoring
// =============================================================================

/**
 * Monitor and log CSP violations.
 */
function cspViolationMonitorExample(): CleanupFn {
  console.log('\n--- CSP Violation Monitoring ---');

  const logger = Logger.create({
    prefix: '[CSP]',
    level: 1, // Info
  });

  const cleanup = CspUtils.onViolation((detail: CspViolationDetail) => {
    logger.warn('CSP Violation detected:');
    logger.warn(`  Directive: ${detail.violatedDirective}`);
    logger.warn(`  Effective: ${detail.effectiveDirective}`);
    logger.warn(`  Blocked URI: ${detail.blockedUri}`);

    if (detail.sourceFile !== undefined) {
      logger.warn(`  Source: ${detail.sourceFile}:${detail.lineNumber ?? '?'}`);
    }

    if (detail.sample !== undefined) {
      logger.warn(`  Sample: ${detail.sample.substring(0, 50)}...`);
    }

    // You could send this to your analytics/logging service
    reportViolation(detail);
  });

  console.log('CSP violation monitor active');
  console.log('Try loading a blocked resource to see violations');

  return cleanup;
}

/**
 * Report violation to analytics (mock implementation).
 */
function reportViolation(detail: CspViolationDetail): void {
  // In a real app, send to your analytics service
  console.log('[Analytics] Would report CSP violation:', {
    directive: detail.effectiveDirective,
    blockedUri: detail.blockedUri,
    documentUri: detail.documentUri,
  });
}

// =============================================================================
// URL Validation Against CSP
// =============================================================================

/**
 * Check if URLs would be allowed by CSP directives.
 */
function urlValidationExample(): void {
  console.log('\n--- URL Validation Against CSP ---');

  // Example CSP directive values
  const scriptSrcPolicy = "'self' https://cdn.example.com https://*.trusted.com";
  const imgSrcPolicy = "'self' data: https://images.example.com";

  // Get current origin (or use example)
  const selfOrigin =
    typeof location !== 'undefined' ? location.origin : 'https://myapp.example.com';

  console.log(`Self origin: ${selfOrigin}`);
  console.log(`Script policy: ${scriptSrcPolicy}`);
  console.log(`Image policy: ${imgSrcPolicy}`);

  // Test URLs against script-src
  console.log('\nScript URL checks:');
  const scriptUrls = [
    '/scripts/app.js', // self
    'https://cdn.example.com/lib.js', // allowed CDN
    'https://api.trusted.com/widget.js', // wildcard match
    'https://evil.com/malicious.js', // not allowed
  ];

  for (const url of scriptUrls) {
    const allowed = CspUtils.isUrlAllowedByDirective(url, selfOrigin, scriptSrcPolicy);
    console.log(`  ${url}: ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
  }

  // Test URLs against img-src
  console.log('\nImage URL checks:');
  const imageUrls = [
    '/images/logo.png', // self
    'data:image/png;base64,iVBOR...', // data URI
    'https://images.example.com/photo.jpg', // allowed host
    'https://unknown.com/image.png', // not allowed
  ];

  for (const url of imageUrls) {
    const allowed = CspUtils.isUrlAllowedByDirective(url, selfOrigin, imgSrcPolicy);
    console.log(`  ${url.substring(0, 40)}...: ${allowed ? 'ALLOWED' : 'BLOCKED'}`);
  }

  // None policy
  console.log('\nNone policy (blocks everything):');
  const nonePolicy = "'none'";
  console.log(
    `  /local.js: ${CspUtils.isUrlAllowedByDirective('/local.js', selfOrigin, nonePolicy) ? 'ALLOWED' : 'BLOCKED'}`
  );
}

// =============================================================================
// CSP-Aware Component
// =============================================================================

/**
 * A component that adapts to CSP restrictions.
 */
class CspAwareScriptLoader {
  private readonly logger: ReturnType<typeof Logger.create>;
  private readonly nonceManager: ReturnType<typeof NonceManager.create>;
  private readonly capabilities: CspCapabilities;

  constructor() {
    this.logger = Logger.create({
      prefix: '[ScriptLoader]',
      level: 1,
    });

    this.nonceManager = NonceManager.create();
    CspUtils.clearCache();
    this.capabilities = {
      inlineScripts: CspUtils.allowsInlineScript(),
      eval: CspUtils.allowsEval(),
      inlineStyles: CspUtils.allowsInlineStyle(),
      timestamp: Date.now(),
    };

    this.logger.info('CSP-aware script loader initialized');
    this.logger.info(`Inline scripts: ${this.capabilities.inlineScripts}`);
  }

  /**
   * Load a script with the best available method.
   */
  async loadScript(options: {
    src?: string;
    code?: string;
    async?: boolean;
  }): Promise<HTMLScriptElement | null> {
    if (typeof document === 'undefined') {
      this.logger.error('Document not available');
      return null;
    }

    const script = document.createElement('script');

    if (options.src !== undefined) {
      // External script - always works
      script.src = options.src;
      script.async = options.async ?? true;
      this.logger.info(`Loading external script: ${options.src}`);
    } else if (options.code !== undefined) {
      // Inline script - may need nonce
      if (this.capabilities.inlineScripts) {
        // CSP allows inline scripts
        script.textContent = options.code;
        this.logger.info('Using inline script (CSP allows)');
      } else {
        // Need nonce for inline script
        const nonce = this.nonceManager.getCurrentNonce();
        script.nonce = nonce;
        script.textContent = options.code;
        this.logger.info(`Using nonce for inline script: ${nonce.substring(0, 8)}...`);
      }
    } else {
      this.logger.error('Either src or code must be provided');
      return null;
    }

    return script;
  }

  /**
   * Get hash for inline script (for CSP policy generation).
   */
  async getScriptHash(code: string): Promise<string | undefined> {
    return CspUtils.calculateHash(code);
  }

  /**
   * Get current nonce for CSP header.
   */
  getCurrentNonce(): string {
    return this.nonceManager.getCurrentNonce();
  }

  /**
   * Check if feature is available.
   */
  canUse(feature: 'inline' | 'eval' | 'styles'): boolean {
    switch (feature) {
      case 'inline':
        return this.capabilities.inlineScripts;
      case 'eval':
        return this.capabilities.eval;
      case 'styles':
        return this.capabilities.inlineStyles;
    }
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.nonceManager.destroy();
    this.logger.info('Script loader destroyed');
  }
}

/**
 * Example: Using CSP-aware script loader.
 */
async function cspAwareLoaderExample(): Promise<void> {
  console.log('\n--- CSP-Aware Script Loader ---');

  const loader = new CspAwareScriptLoader();

  // Check capabilities
  console.log('Capabilities:');
  console.log(`  Can use inline: ${loader.canUse('inline')}`);
  console.log(`  Can use eval: ${loader.canUse('eval')}`);
  console.log(`  Can use inline styles: ${loader.canUse('styles')}`);

  // Get nonce for CSP header
  const nonce = loader.getCurrentNonce();
  console.log(`\nCurrent nonce: ${nonce}`);
  console.log(`CSP header: script-src 'nonce-${nonce}'`);

  // Load inline script
  const inlineScript = await loader.loadScript({
    code: 'console.log("Hello from inline script!");',
  });
  console.log(`\nInline script created: ${inlineScript !== null}`);
  if (inlineScript !== null && inlineScript.nonce) {
    console.log(`  with nonce: ${inlineScript.nonce.substring(0, 8)}...`);
  }

  // Load external script
  const externalScript = await loader.loadScript({
    src: 'https://cdn.example.com/lib.js',
    async: true,
  });
  console.log(`External script created: ${externalScript !== null}`);

  // Get hash for policy
  const hash = await loader.getScriptHash('alert("test")');
  if (hash !== undefined) {
    console.log(`\nHash for 'alert("test")': ${hash}`);
  }

  loader.destroy();
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all CSP detection examples.
 */
export async function runCspExamples(): Promise<{ cleanup: () => void }> {
  console.log('=== CSP Detection Examples ===\n');

  const cleanups: CleanupFn[] = [];

  detectCspCapabilities();
  determineScriptStrategy();
  nonceGenerationExample();
  await hashCalculationExample();
  cleanups.push(nonceManagerExample());
  cleanups.push(autoRotatingNonceExample());
  cleanups.push(cspViolationMonitorExample());
  urlValidationExample();
  await cspAwareLoaderExample();

  console.log('\n=== CSP Examples Active ===');
  console.log('Auto-rotation running. Call cleanup() to stop.');

  return {
    cleanup: (): void => {
      for (const fn of cleanups) {
        fn();
      }
      console.log('\n=== CSP Examples Cleaned Up ===');
    },
  };
}

// Export for module usage
export {
  CspAwareScriptLoader,
  createScriptWithNonce,
  detectCspCapabilities,
  type CspCapabilities,
  type ScriptStrategy,
};

// Uncomment to run directly
// runCspExamples().catch(console.error);
