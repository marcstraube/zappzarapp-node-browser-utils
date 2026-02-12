/**
 * Observer Wrappers - Simplified APIs for browser observation APIs.
 *
 * @packageDocumentation
 */
export {
  IntersectionObserverWrapper,
  type IntersectionOptions,
  type ObserveResult,
} from './IntersectionObserverWrapper.js';

export {
  ResizeObserverWrapper,
  type BoxModel,
  type ResizeOptions,
} from './ResizeObserverWrapper.js';

export { MutationObserverWrapper, type MutationOptions } from './MutationObserverWrapper.js';
