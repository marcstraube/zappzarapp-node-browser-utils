// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Session Storage Example - Type-safe sessionStorage for temporary data
 *
 * This example demonstrates:
 * - Creating a type-safe session storage manager
 * - Storing and retrieving typed session data
 * - Automatic LRU eviction when limits are reached
 * - Tab-specific data that clears on close
 * - Result-based error handling (no exceptions)
 * - Debug logging for development
 *
 * Session storage differs from localStorage:
 * - Data persists only for the browser session (tab lifetime)
 * - Data is cleared when the tab is closed
 * - Each tab has its own isolated session storage
 *
 * @packageDocumentation
 */

import { Result } from '@zappzarapp/browser-utils/core';
import { SessionStorageManager, type SessionStorageStats } from '@zappzarapp/browser-utils/session';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User session data stored in sessionStorage.
 */
interface UserSession {
  readonly userId: string;
  readonly loginTime: string;
  readonly permissions: ReadonlyArray<string>;
}

/**
 * Form draft data for auto-save.
 */
interface FormDraft {
  readonly title: string;
  readonly content: string;
  readonly tags: ReadonlyArray<string>;
  readonly lastModified: string;
}

/**
 * Wizard/multi-step form state.
 */
interface WizardState {
  readonly currentStep: number;
  readonly completedSteps: ReadonlyArray<number>;
  readonly formData: Record<string, unknown>;
}

/**
 * Shopping cart item.
 */
interface CartItem {
  readonly productId: string;
  readonly name: string;
  readonly quantity: number;
  readonly price: number;
}

// =============================================================================
// Basic Usage
// =============================================================================

/**
 * Create a simple session storage manager with default settings.
 */
function basicUsageExample(): void {
  console.log('--- Basic Usage ---');

  // Create session storage with a prefix to namespace your app's data
  const session = SessionStorageManager.create<UserSession>({
    prefix: 'myApp',
  });

  // Store user session
  const userSession: UserSession = {
    userId: 'user-123',
    loginTime: new Date().toISOString(),
    permissions: ['read', 'write', 'admin'],
  };

  session.set('currentUser', userSession);
  console.log('Stored user session');

  // Retrieve session (type-safe)
  const retrieved = session.get('currentUser');
  if (retrieved !== null) {
    console.log('User ID:', retrieved.userId);
    console.log('Login time:', retrieved.loginTime);
    console.log('Permissions:', retrieved.permissions.join(', '));
  }

  // Check if key exists
  console.log('Has session:', session.has('currentUser'));
  console.log('Has other:', session.has('nonexistent'));

  // Get all keys managed by this storage instance
  console.log('All keys:', session.keys());

  // Get storage statistics
  const stats: SessionStorageStats = session.stats();
  console.log('Stats:', stats);

  // Clean up when user logs out
  session.remove('currentUser');
}

// =============================================================================
// Form Draft Auto-Save
// =============================================================================

/**
 * Session storage for auto-saving form drafts.
 */
class FormDraftManager {
  private readonly storage: SessionStorageManager<FormDraft>;
  private readonly draftKey: string;
  private autoSaveInterval: number | null = null;

  constructor(formId: string) {
    this.storage = SessionStorageManager.create<FormDraft>({
      prefix: 'formDraft',
    });
    this.draftKey = formId;
  }

  /**
   * Save the current form state as a draft.
   */
  saveDraft(data: Omit<FormDraft, 'lastModified'>): void {
    const draft: FormDraft = {
      ...data,
      lastModified: new Date().toISOString(),
    };
    this.storage.set(this.draftKey, draft);
    console.log('Draft saved at', draft.lastModified);
  }

  /**
   * Load a saved draft if available.
   */
  loadDraft(): FormDraft | null {
    return this.storage.get(this.draftKey);
  }

  /**
   * Check if a draft exists.
   */
  hasDraft(): boolean {
    return this.storage.has(this.draftKey);
  }

  /**
   * Clear the draft (after successful submission).
   */
  clearDraft(): void {
    this.storage.remove(this.draftKey);
    console.log('Draft cleared');
  }

  /**
   * Start auto-save at regular intervals.
   */
  startAutoSave(getFormData: () => Omit<FormDraft, 'lastModified'>, intervalMs = 5000): void {
    this.stopAutoSave();
    this.autoSaveInterval = window.setInterval(() => {
      const data = getFormData();
      if (data.title || data.content) {
        this.saveDraft(data);
      }
    }, intervalMs);
    console.log(`Auto-save started (every ${intervalMs}ms)`);
  }

  /**
   * Stop auto-save.
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      window.clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('Auto-save stopped');
    }
  }
}

/**
 * Example: Auto-save form drafts.
 */
function formDraftExample(): void {
  console.log('\n--- Form Draft Auto-Save ---');

  const draftManager = new FormDraftManager('blog-post-editor');

  // Check for existing draft
  if (draftManager.hasDraft()) {
    const draft = draftManager.loadDraft();
    console.log('Found existing draft from', draft?.lastModified);
    // Could prompt user: "Would you like to restore your draft?"
  }

  // Save a draft manually
  draftManager.saveDraft({
    title: 'My Blog Post',
    content: 'This is the beginning of my post...',
    tags: ['typescript', 'tutorial'],
  });

  // Load and display the draft
  const draft = draftManager.loadDraft();
  if (draft !== null) {
    console.log('Draft title:', draft.title);
    console.log('Draft content:', draft.content.substring(0, 50) + '...');
    console.log('Draft tags:', draft.tags.join(', '));
  }

  // After successful form submission
  draftManager.clearDraft();
}

// =============================================================================
// Multi-Step Wizard
// =============================================================================

/**
 * Session storage for multi-step wizard/form state.
 */
class WizardManager {
  private readonly storage: SessionStorageManager<WizardState>;
  private readonly wizardKey: string;

  constructor(wizardId: string) {
    this.storage = SessionStorageManager.create<WizardState>({
      prefix: 'wizard',
    });
    this.wizardKey = wizardId;
  }

  /**
   * Initialize a new wizard session.
   */
  start(): WizardState {
    const initialState: WizardState = {
      currentStep: 0,
      completedSteps: [],
      formData: {},
    };
    this.storage.set(this.wizardKey, initialState);
    return initialState;
  }

  /**
   * Get current wizard state.
   */
  getState(): WizardState | null {
    return this.storage.get(this.wizardKey);
  }

  /**
   * Move to next step and save data from current step.
   */
  nextStep(stepData: Record<string, unknown>): WizardState | null {
    const state = this.getState();
    if (state === null) return null;

    const newState: WizardState = {
      currentStep: state.currentStep + 1,
      completedSteps: [...state.completedSteps, state.currentStep],
      formData: { ...state.formData, ...stepData },
    };

    this.storage.set(this.wizardKey, newState);
    return newState;
  }

  /**
   * Go back to previous step.
   */
  previousStep(): WizardState | null {
    const state = this.getState();
    if (state === null || state.currentStep === 0) return null;

    const newState: WizardState = {
      ...state,
      currentStep: state.currentStep - 1,
    };

    this.storage.set(this.wizardKey, newState);
    return newState;
  }

  /**
   * Jump to a specific step (if completed).
   */
  goToStep(step: number): WizardState | null {
    const state = this.getState();
    if (state === null) return null;

    // Can only go to completed steps or current step
    if (step > state.currentStep && !state.completedSteps.includes(step)) {
      console.warn('Cannot jump to incomplete step');
      return state;
    }

    const newState: WizardState = {
      ...state,
      currentStep: step,
    };

    this.storage.set(this.wizardKey, newState);
    return newState;
  }

  /**
   * Complete the wizard and clear state.
   */
  complete(): Record<string, unknown> {
    const state = this.getState();
    const formData = state?.formData ?? {};
    this.storage.remove(this.wizardKey);
    return formData;
  }

  /**
   * Cancel wizard and clear state.
   */
  cancel(): void {
    this.storage.remove(this.wizardKey);
  }
}

/**
 * Example: Multi-step registration wizard.
 */
function wizardExample(): void {
  console.log('\n--- Multi-Step Wizard ---');

  const wizard = new WizardManager('registration');

  // Start new wizard
  let state = wizard.start();
  console.log('Started wizard at step', state.currentStep);

  // Complete step 1 (personal info)
  state =
    wizard.nextStep({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    }) ?? state;
  console.log('Completed step 1, now at step', state.currentStep);

  // Complete step 2 (account info)
  state =
    wizard.nextStep({
      username: 'johndoe',
      password: '***',
    }) ?? state;
  console.log('Completed step 2, now at step', state.currentStep);

  // Go back to review
  state = wizard.previousStep() ?? state;
  console.log('Went back to step', state.currentStep);

  // Complete wizard
  const finalData = wizard.complete();
  console.log('Wizard completed with data:', Object.keys(finalData));
}

// =============================================================================
// Shopping Cart (Tab-Specific)
// =============================================================================

/**
 * Tab-specific shopping cart using session storage.
 * Each browser tab maintains its own cart.
 */
class SessionCart {
  private readonly storage: SessionStorageManager<CartItem[]>;

  constructor() {
    this.storage = SessionStorageManager.create<CartItem[]>({
      prefix: 'cart',
    });
  }

  /**
   * Get all items in cart.
   */
  getItems(): CartItem[] {
    return this.storage.get('items') ?? [];
  }

  /**
   * Add item to cart.
   */
  addItem(item: CartItem): void {
    const items = this.getItems();
    const existingIndex = items.findIndex((i) => i.productId === item.productId);

    if (existingIndex >= 0) {
      // Update quantity
      const existing = items[existingIndex]!;
      items[existingIndex] = {
        ...existing,
        quantity: existing.quantity + item.quantity,
      };
    } else {
      items.push(item);
    }

    this.storage.set('items', items);
    console.log(`Added ${item.name} to cart`);
  }

  /**
   * Update item quantity.
   */
  updateQuantity(productId: string, quantity: number): void {
    const items = this.getItems();
    const index = items.findIndex((i) => i.productId === productId);

    if (index >= 0) {
      if (quantity <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = { ...items[index]!, quantity };
      }
      this.storage.set('items', items);
    }
  }

  /**
   * Remove item from cart.
   */
  removeItem(productId: string): void {
    const items = this.getItems().filter((i) => i.productId !== productId);
    this.storage.set('items', items);
  }

  /**
   * Get cart total.
   */
  getTotal(): number {
    return this.getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Get item count.
   */
  getItemCount(): number {
    return this.getItems().reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Clear cart.
   */
  clear(): void {
    this.storage.remove('items');
  }
}

/**
 * Example: Session-based shopping cart.
 */
function cartExample(): void {
  console.log('\n--- Shopping Cart (Session) ---');

  const cart = new SessionCart();

  // Add items
  cart.addItem({
    productId: 'prod-1',
    name: 'TypeScript Handbook',
    quantity: 1,
    price: 29.99,
  });

  cart.addItem({
    productId: 'prod-2',
    name: 'JavaScript Guide',
    quantity: 2,
    price: 24.99,
  });

  // Add more of same item
  cart.addItem({
    productId: 'prod-1',
    name: 'TypeScript Handbook',
    quantity: 1,
    price: 29.99,
  });

  // Display cart
  const items = cart.getItems();
  console.log('Cart items:');
  for (const item of items) {
    console.log(`  ${item.name} x${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`);
  }
  console.log(`Total: $${cart.getTotal().toFixed(2)}`);
  console.log(`Item count: ${cart.getItemCount()}`);

  // Update quantity
  cart.updateQuantity('prod-2', 1);
  console.log('Updated JavaScript Guide quantity to 1');

  // Remove item
  cart.removeItem('prod-2');
  console.log('Removed JavaScript Guide from cart');

  console.log(`Final total: $${cart.getTotal().toFixed(2)}`);
}

// =============================================================================
// Result-Based Error Handling
// =============================================================================

/**
 * Use Result API to avoid exceptions.
 */
function resultBasedExample(): void {
  console.log('\n--- Result-Based Error Handling ---');

  const session = SessionStorageManager.create<UserSession>({
    prefix: 'resultDemo',
  });

  // Store some data first
  session.set('currentSession', {
    userId: 'user-456',
    loginTime: new Date().toISOString(),
    permissions: ['read'],
  });

  // Get with Result (no exceptions thrown)
  const result = session.getResult('currentSession');

  if (Result.isOk(result)) {
    console.log('Success:', result.value?.userId);
  } else {
    console.error('Error:', result.error.message);
  }

  // Handle missing keys gracefully
  const missingResult = session.getResult('nonexistent');
  if (Result.isOk(missingResult)) {
    console.log('Missing key returns:', missingResult.value); // null
  }

  // Cleanup
  session.clear();
}

// =============================================================================
// Debug Logging
// =============================================================================

/**
 * Enable debug logging for development.
 */
function debugLoggingExample(): void {
  console.log('\n--- Debug Logging ---');

  // Method 1: Use factory method
  const debugSession = SessionStorageManager.withDebugLogging<string>('debugDemo');

  debugSession.set('test', 'value'); // Logs: [debugDemo] Stored: test
  debugSession.get('test'); // Logs debug info
  debugSession.remove('test'); // Logs: [debugDemo] Removed: test

  // Method 2: Custom logger configuration
  const customSession = SessionStorageManager.create<string>({
    prefix: 'custom',
    logger: {
      level: 0, // LogLevel.Debug
      prefix: '[SessionStorage]',
    },
  });

  customSession.set('key', 'data');
  customSession.clear();
}

// =============================================================================
// Tab Communication Pattern
// =============================================================================

/**
 * Pattern for detecting duplicate tabs.
 * Uses sessionStorage to identify each tab uniquely.
 */
class TabIdentifier {
  private readonly storage: SessionStorageManager<{ id: string; createdAt: string }>;
  private readonly tabId: string;

  constructor() {
    this.storage = SessionStorageManager.create({
      prefix: 'tab',
    });

    // Check if this tab already has an ID (page refresh)
    const existing = this.storage.get('identity');
    if (existing !== null) {
      this.tabId = existing.id;
      console.log('Tab restored:', this.tabId);
    } else {
      // Generate new tab ID
      this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      this.storage.set('identity', {
        id: this.tabId,
        createdAt: new Date().toISOString(),
      });
      console.log('New tab created:', this.tabId);
    }
  }

  /**
   * Get this tab's unique ID.
   */
  getId(): string {
    return this.tabId;
  }

  /**
   * Get tab creation time.
   */
  getCreatedAt(): string | null {
    return this.storage.get('identity')?.createdAt ?? null;
  }
}

/**
 * Example: Tab identification.
 */
function tabIdentifierExample(): void {
  console.log('\n--- Tab Identifier ---');

  const tab = new TabIdentifier();
  console.log('Tab ID:', tab.getId());
  console.log('Created at:', tab.getCreatedAt());
}

// =============================================================================
// LRU Eviction
// =============================================================================

/**
 * Demonstrate LRU eviction when max entries is reached.
 */
function lruEvictionExample(): void {
  console.log('\n--- LRU Eviction ---');

  // Create storage with low limit to demonstrate eviction
  const session = SessionStorageManager.create<string>({
    prefix: 'lruDemo',
    maxEntries: 5, // Only keep 5 entries
  });

  // Add more entries than the limit
  for (let i = 1; i <= 8; i++) {
    session.set(`item${i}`, `Value ${i}`);
    console.log(`Added item${i}`);
  }

  // Check which entries remain (should be newest 5)
  console.log('Remaining keys:', session.keys());
  console.log('Count:', session.stats().count);

  // Oldest entries (item1, item2, item3) should be evicted
  console.log('item1 exists:', session.has('item1')); // false
  console.log('item5 exists:', session.has('item5')); // true
  console.log('item8 exists:', session.has('item8')); // true

  // Cleanup
  session.clear();
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all session storage examples.
 */
export function runSessionStorageExamples(): void {
  console.log('=== Session Storage Examples ===\n');

  basicUsageExample();
  formDraftExample();
  wizardExample();
  cartExample();
  resultBasedExample();
  debugLoggingExample();
  tabIdentifierExample();
  lruEvictionExample();

  console.log('\n=== Session Storage Examples Complete ===');
}

// Uncomment to run directly
// runSessionStorageExamples();
