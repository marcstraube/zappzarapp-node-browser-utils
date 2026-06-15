/**
 * AES-GCM encryption overhead benchmarks.
 *
 * The `encryption` module (EncryptedStorage) encrypts with AES-GCM-256 via the
 * Web Crypto API. These benchmarks isolate that primitive -- the same
 * `crypto.subtle.encrypt`/`decrypt` calls the module makes internally -- across
 * payload sizes, excluding the surrounding storage I/O (covered separately).
 *
 * Node's `crypto.subtle` is backed by the same native implementation as the
 * browser, so absolute timings are environment-dependent but the scaling with
 * payload size is representative.
 *
 * Run with: pnpm bench
 */
import { bench, describe } from 'vitest';

const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
  'encrypt',
  'decrypt',
]);

/** Fill a buffer with random bytes (getRandomValues caps at 65536 per call). */
function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const buffer = new Uint8Array(new ArrayBuffer(length));
  for (let offset = 0; offset < length; offset += 65536) {
    crypto.getRandomValues(buffer.subarray(offset, Math.min(offset + 65536, length)));
  }
  return buffer;
}

const SIZES: ReadonlyArray<readonly [string, number]> = [
  ['1 KB', 1024],
  ['10 KB', 10240],
  ['100 KB', 102400],
  ['1 MB', 1048576],
];

for (const [label, size] of SIZES) {
  const plaintext = randomBytes(size);
  const iv = randomBytes(12);
  // Pre-encrypted ciphertext for the decrypt benchmark.
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  describe(`AES-GCM ${label}`, () => {
    bench('encrypt', async () => {
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    });

    bench('decrypt', async () => {
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    });
  });
}
