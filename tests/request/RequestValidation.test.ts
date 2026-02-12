import { describe, it, expect, vi } from 'vitest';
import { combineAbortSignals } from '../../src/request/RequestValidation.js';

describe('combineAbortSignals', () => {
  it('should abort combined signal when signal1 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(false);

    controller1.abort();

    expect(combined.aborted).toBe(true);
  });

  it('should abort combined signal when signal2 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(false);

    controller2.abort();

    expect(combined.aborted).toBe(true);
  });

  it('should return already-aborted signal when signal1 is pre-aborted', () => {
    const controller1 = new AbortController();
    controller1.abort();
    const controller2 = new AbortController();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(true);
  });

  it('should return already-aborted signal when signal2 is pre-aborted', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();
    controller2.abort();

    const combined = combineAbortSignals(controller1.signal, controller2.signal);

    expect(combined.aborted).toBe(true);
  });

  it('should remove listener from signal2 when signal1 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeSpy = vi.spyOn(controller2.signal, 'removeEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    controller1.abort();

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('should remove listener from signal1 when signal2 aborts', () => {
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    const removeSpy = vi.spyOn(controller1.signal, 'removeEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    controller2.abort();

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('should not add listeners when signal1 is pre-aborted', () => {
    const controller1 = new AbortController();
    controller1.abort();
    const controller2 = new AbortController();

    const addSpy = vi.spyOn(controller2.signal, 'addEventListener');

    combineAbortSignals(controller1.signal, controller2.signal);

    expect(addSpy).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });
});
