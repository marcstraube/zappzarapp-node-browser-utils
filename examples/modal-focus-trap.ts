/**
 * Modal Focus Trap Example
 *
 * Demonstrates how to create an accessible modal dialog with proper focus
 * management using the FocusTrap utility. This ensures keyboard users cannot
 * accidentally tab out of the modal, which is essential for accessibility.
 *
 * Features demonstrated:
 * - Focus trapping within modal boundaries
 * - Escape key to close modal
 * - Return focus to trigger element on close
 * - ARIA attributes for screen readers
 * - Click outside to close (optional)
 */

import { FocusTrap, type FocusTrapInstance } from '@zappzarapp/browser-utils/focus';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ModalOptions {
  /** Modal title for accessibility */
  readonly title: string;
  /** Modal content HTML */
  readonly content: string;
  /** Allow closing by clicking outside */
  readonly closeOnBackdrop?: boolean;
  /** Callback when modal is closed */
  readonly onClose?: () => void;
}

interface Modal {
  /** Open the modal */
  open(): void;
  /** Close the modal */
  close(): void;
  /** Check if modal is open */
  isOpen(): boolean;
  /** Destroy modal and remove from DOM */
  destroy(): void;
}

// -----------------------------------------------------------------------------
// Modal Factory
// -----------------------------------------------------------------------------

/**
 * Create an accessible modal with focus trap.
 *
 * @example
 * ```typescript
 * const modal = createModal({
 *   title: 'Confirm Action',
 *   content: `
 *     <p>Are you sure you want to proceed?</p>
 *     <div class="modal-actions">
 *       <button type="button" data-action="cancel">Cancel</button>
 *       <button type="button" data-action="confirm">Confirm</button>
 *     </div>
 *   `,
 *   closeOnBackdrop: true,
 *   onClose: () => console.log('Modal closed'),
 * });
 *
 * modal.open();
 * ```
 */
function createModal(options: ModalOptions): Modal {
  const { title, content, closeOnBackdrop = true, onClose } = options;

  // Generate unique ID for ARIA labelling
  const modalId = `modal-${crypto.randomUUID()}`;

  // Track state
  let isOpen = false;
  let focusTrap: FocusTrapInstance | null = null;

  // Create modal structure
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', `${modalId}-title`);
  dialog.setAttribute('tabindex', '-1');

  dialog.innerHTML = `
    <header class="modal-header">
      <h2 id="${modalId}-title" class="modal-title">${title}</h2>
      <button
        type="button"
        class="modal-close"
        aria-label="Close modal"
        data-modal-close
      >
        &times;
      </button>
    </header>
    <div class="modal-body">
      ${content}
    </div>
  `;

  // Handle backdrop clicks
  backdrop.addEventListener('click', (event) => {
    if (closeOnBackdrop && event.target === backdrop) {
      close();
    }
  });

  // Handle close button clicks
  dialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.hasAttribute('data-modal-close')) {
      close();
    }
  });

  /**
   * Open the modal.
   */
  function open(): void {
    if (isOpen) return;
    isOpen = true;

    // Add to DOM
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Show with slight delay for CSS transitions
    requestAnimationFrame(() => {
      backdrop.classList.add('modal-backdrop--visible');
      dialog.classList.add('modal-dialog--visible');
    });

    // Create and activate focus trap
    focusTrap = FocusTrap.create(dialog, {
      // Focus the close button initially (good UX for closing)
      initialFocus: '[data-modal-close]',
      // Return focus to the element that opened the modal
      returnFocus: true,
      // Allow Escape key to close
      escapeDeactivates: true,
      // Handle Escape key close
      onEscapeDeactivate: () => {
        close();
      },
      // Prevent clicks outside the dialog
      allowOutsideClick: closeOnBackdrop,
    });

    focusTrap.activate();
  }

  /**
   * Close the modal.
   */
  function close(): void {
    if (!isOpen) return;
    isOpen = false;

    // Deactivate focus trap (returns focus to trigger)
    if (focusTrap !== null) {
      focusTrap.deactivate();
      focusTrap = null;
    }

    // Hide with CSS transition
    backdrop.classList.remove('modal-backdrop--visible');
    dialog.classList.remove('modal-dialog--visible');

    // Remove from DOM after transition
    setTimeout(() => {
      if (!isOpen && backdrop.parentElement !== null) {
        document.body.removeChild(backdrop);
        backdrop.removeChild(dialog);
      }
    }, 300); // Match CSS transition duration

    // Restore body scroll
    document.body.style.overflow = '';

    // Notify callback
    onClose?.();
  }

  /**
   * Check if modal is currently open.
   */
  function checkIsOpen(): boolean {
    return isOpen;
  }

  /**
   * Destroy modal and clean up.
   */
  function destroy(): void {
    close();
    // Remove any lingering elements
    if (backdrop.parentElement !== null) {
      document.body.removeChild(backdrop);
    }
  }

  return {
    open,
    close,
    isOpen: checkIsOpen,
    destroy,
  };
}

// -----------------------------------------------------------------------------
// Usage Example
// -----------------------------------------------------------------------------

/**
 * Example: Setting up a confirmation modal.
 */
function setupConfirmationModal(): void {
  const triggerButton = document.querySelector<HTMLButtonElement>('#open-modal');
  if (triggerButton === null) return;

  const modal = createModal({
    title: 'Delete Item',
    content: `
      <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      <div class="modal-actions">
        <button type="button" class="btn btn--secondary" data-modal-close>
          Cancel
        </button>
        <button type="button" class="btn btn--danger" id="confirm-delete">
          Delete
        </button>
      </div>
    `,
    closeOnBackdrop: true,
    onClose: () => {
      console.log('Modal was closed');
    },
  });

  triggerButton.addEventListener('click', () => {
    modal.open();
  });

  // Handle confirm action (would be set up after modal opens)
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.id === 'confirm-delete') {
      console.log('Item deleted!');
      modal.close();
    }
  });
}

// -----------------------------------------------------------------------------
// CSS (for reference - add to your stylesheet)
// -----------------------------------------------------------------------------

/*
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s, visibility 0.3s;
  z-index: 1000;
}

.modal-backdrop--visible {
  opacity: 1;
  visibility: visible;
}

.modal-dialog {
  background: white;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
  transform: scale(0.9);
  transition: transform 0.3s;
}

.modal-dialog--visible {
  transform: scale(1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.modal-body {
  padding: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
*/

// Export for module usage
export { createModal, type Modal, type ModalOptions };

// Run example if this is the entry point
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', setupConfirmationModal);
}
