/**
 * IndexedDB Error for IndexedDB operations.
 *
 * Thrown when IndexedDB operations fail due to:
 * - IndexedDB not supported
 * - Database open failures
 * - Store not found
 * - Transaction failures
 * - Operation failures
 *
 * @example
 * ```TypeScript
 * try {
 *   const db = await IndexedDBManager.open(config);
 * } catch (error) {
 *   if (error instanceof IndexedDBError && error.code === 'OPEN_FAILED') {
 *     // Handle open failure
 *   }
 * }
 * ```
 */
import { BrowserUtilsError } from './BrowserUtilsError.js';

/**
 * IndexedDB error codes.
 */
export type IndexedDBErrorCode =
  | 'NOT_SUPPORTED'
  | 'OPEN_FAILED'
  | 'STORE_NOT_FOUND'
  | 'TRANSACTION_FAILED'
  | 'OPERATION_FAILED'
  | 'VERSION_ERROR'
  | 'BLOCKED';

/**
 * IndexedDB-specific error.
 */
export class IndexedDBError extends BrowserUtilsError {
  constructor(
    readonly code: IndexedDBErrorCode,
    message: string,
    cause?: unknown
  ) {
    super(message, cause);
  }

  static notSupported(): IndexedDBError {
    return new IndexedDBError('NOT_SUPPORTED', 'IndexedDB is not supported in this environment');
  }

  static openFailed(name: string, cause?: unknown): IndexedDBError {
    return new IndexedDBError('OPEN_FAILED', `Failed to open database "${name}"`, cause);
  }

  static storeNotFound(name: string): IndexedDBError {
    return new IndexedDBError('STORE_NOT_FOUND', `Object store "${name}" not found`);
  }

  static transactionFailed(cause?: unknown): IndexedDBError {
    return new IndexedDBError('TRANSACTION_FAILED', 'Transaction failed', cause);
  }

  static operationFailed(operation: string, cause?: unknown): IndexedDBError {
    return new IndexedDBError('OPERATION_FAILED', `Operation "${operation}" failed`, cause);
  }

  static versionError(message: string): IndexedDBError {
    return new IndexedDBError('VERSION_ERROR', message);
  }

  static blocked(): IndexedDBError {
    return new IndexedDBError('BLOCKED', 'Database upgrade blocked by open connections');
  }
}
