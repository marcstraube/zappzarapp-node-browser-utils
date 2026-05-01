# Secure File Upload with Progress Tracking

Upload files with real-time progress, input validation, filename sanitization,
and CSP compliance using `RequestInterceptor`, `trackUploadProgress`,
`HtmlSanitizer`, and `CspUtils`.

## Modules Used

| Module                     | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `RequestInterceptor`       | Authenticated fetch with middleware         |
| `trackUploadProgress`      | Stream-based upload progress tracking       |
| `createProgressMiddleware` | Middleware factory for progress callbacks   |
| `HtmlSanitizer`            | Sanitize user-provided filenames            |
| `CspUtils`                 | Detect CSP restrictions, monitor violations |

## Step 1 -- Validate Files Before Upload

Reject invalid files early to avoid wasting bandwidth.

```typescript
import { HtmlSanitizer } from '@zappzarapp/browser-utils/sanitize';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'] as const;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

interface ValidatedFile {
  readonly file: File;
  readonly safeName: string;
}

function validateFile(file: File): ValidatedFile {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`File exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit`);
  }

  if (file.size === 0) {
    throw new Error('File is empty');
  }

  // Strip HTML/script injection from filename
  const safeName = HtmlSanitizer.stripTags(file.name);

  return { file, safeName };
}
```

## Step 2 -- Check CSP Compliance

Verify that CSP allows connections to the upload endpoint before attempting the
request.

```typescript
import { CspUtils } from '@zappzarapp/browser-utils/csp';
import type { CspViolationDetail } from '@zappzarapp/browser-utils/csp';

const UPLOAD_URL = 'https://api.example.com/uploads';

function checkCspCompliance(): void {
  const allowed = CspUtils.isUrlAllowedByDirective(
    UPLOAD_URL,
    window.location.origin,
    'connect-src'
  );

  if (!allowed) {
    throw new Error(
      `CSP blocks connections to ${UPLOAD_URL}. ` +
        'Add the domain to your connect-src directive.'
    );
  }
}

// Monitor violations during upload
function watchCspViolations(
  onViolation: (detail: CspViolationDetail) => void
): () => void {
  return CspUtils.onViolation(onViolation);
}
```

## Step 3 -- Configure the Upload Client

Set up `RequestInterceptor` with progress middleware.

```typescript
import { RequestInterceptor } from '@zappzarapp/browser-utils/request';
import {
  createProgressMiddleware,
  type ProgressInfo,
} from '@zappzarapp/browser-utils/request';

function createUploadClient(onProgress: (progress: ProgressInfo) => void) {
  const api = RequestInterceptor.create({
    baseUrl: 'https://api.example.com',
    auth: {
      type: 'bearer',
      token: () => localStorage.getItem('token') ?? '',
    },
    allowedProtocols: ['https:'],
    timeout: 120_000, // 2 minutes for large uploads
  });

  api.use(
    createProgressMiddleware({
      onUploadProgress: onProgress,
    })
  );

  return api;
}
```

## Step 4 -- Upload with Error Handling

```typescript
import type { RequestInterceptorInstance } from '@zappzarapp/browser-utils/request';

async function uploadFile(
  api: RequestInterceptorInstance,
  validated: ValidatedFile
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', validated.file, validated.safeName);

  const response = await api.fetch('/uploads', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 413) throw new Error('Server rejected file: too large');
    if (status === 415) throw new Error('Server rejected file type');
    if (status === 401) throw new Error('Authentication required');
    throw new Error(`Upload failed with status ${status}`);
  }

  return response.json() as Promise<{ id: string }>;
}
```

## Complete Example

A file upload form with drag-and-drop, progress bar, and all security checks.

```typescript
import { RequestInterceptor } from '@zappzarapp/browser-utils/request';
import {
  createProgressMiddleware,
  type ProgressInfo,
} from '@zappzarapp/browser-utils/request';
import { HtmlSanitizer } from '@zappzarapp/browser-utils/sanitize';
import { CspUtils } from '@zappzarapp/browser-utils/csp';

// --- Configuration ---

const UPLOAD_ENDPOINT = 'https://api.example.com/uploads';
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const MAX_SIZE = 10 * 1024 * 1024;

// --- Validation ---

function validateFile(file: File): { file: File; safeName: string } {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported type: ${file.type}`);
  }
  if (file.size === 0 || file.size > MAX_SIZE) {
    throw new Error(
      file.size === 0 ? 'Empty file' : 'File too large (10 MB max)'
    );
  }
  return { file, safeName: HtmlSanitizer.stripTags(file.name) };
}

// --- UI Updates ---

function updateProgress(bar: HTMLElement, info: ProgressInfo): void {
  const pct = info.percentage ?? 0;
  bar.style.width = `${pct}%`;
  bar.textContent = `${pct}%`;
}

function showError(container: HTMLElement, message: string): void {
  const sanitized = HtmlSanitizer.sanitize(`<p>${message}</p>`, {
    allowedTags: ['p'],
  });
  container.innerHTML = sanitized;
}

// --- Main ---

function initUploadForm(form: HTMLFormElement): void {
  const input = form.querySelector<HTMLInputElement>('input[type="file"]')!;
  const dropZone = form.querySelector<HTMLElement>('.drop-zone')!;
  const progressBar = form.querySelector<HTMLElement>('.progress-bar')!;
  const errorContainer = form.querySelector<HTMLElement>('.errors')!;

  // CSP compliance check
  const cspAllowed = CspUtils.isUrlAllowedByDirective(
    UPLOAD_ENDPOINT,
    window.location.origin,
    'connect-src'
  );
  if (!cspAllowed) {
    showError(
      errorContainer,
      'Upload endpoint blocked by Content Security Policy.'
    );
    return;
  }

  // Monitor CSP violations
  const stopWatching = CspUtils.onViolation((violation) => {
    console.warn('CSP violation during upload:', violation.blockedUri);
  });

  // Create upload client
  const api = RequestInterceptor.create({
    baseUrl: UPLOAD_ENDPOINT,
    auth: {
      type: 'bearer',
      token: () => localStorage.getItem('token') ?? '',
    },
    allowedProtocols: ['https:'],
    timeout: 120_000,
  });

  api.use(
    createProgressMiddleware({
      onUploadProgress: (info) => updateProgress(progressBar, info),
    })
  );

  // Upload handler
  async function handleUpload(file: File): Promise<void> {
    errorContainer.innerHTML = '';
    progressBar.style.width = '0%';

    try {
      const validated = validateFile(file);

      const formData = new FormData();
      formData.append('file', validated.file, validated.safeName);

      const response = await api.fetch('/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const messages: Record<number, string> = {
          401: 'Authentication required. Please log in.',
          413: 'File too large for server.',
          415: 'File type not accepted by server.',
        };
        throw new Error(
          messages[response.status] ?? `Upload failed (${response.status})`
        );
      }

      progressBar.textContent = 'Done';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        showError(errorContainer, 'Network error. Check your connection.');
      } else {
        showError(errorContainer, message);
      }
    }
  }

  // File input
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) void handleUpload(file);
  });

  // Drag-and-drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-active');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-active');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-active');
    const file = e.dataTransfer?.files[0];
    if (file) void handleUpload(file);
  });

  // Cleanup on form removal
  form.addEventListener('submit', (e) => e.preventDefault());

  // Stop CSP monitoring when no longer needed
  window.addEventListener('beforeunload', () => {
    stopWatching();
    api.destroy();
  });
}
```

## Error Handling Summary

| Error Type     | Cause                         | Handling                          |
| -------------- | ----------------------------- | --------------------------------- |
| Validation     | Wrong type, size, empty file  | Reject before upload starts       |
| Network        | `TypeError: Failed to fetch`  | Show connection error message     |
| Authentication | 401 response                  | Prompt user to log in             |
| Size limit     | 413 response                  | Inform server limit exceeded      |
| Type rejected  | 415 response                  | Inform server rejected file type  |
| CSP violation  | `connect-src` blocks endpoint | Detect upfront, log if at runtime |
| Timeout        | Upload exceeds `timeout`      | Caught as `AbortError`            |
