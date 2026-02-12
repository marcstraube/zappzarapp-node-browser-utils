# Downloader

File download utilities with security validation and automatic Blob URL cleanup.

## Quick Start

```typescript
import { Downloader } from '@zappzarapp/browser-utils/download';

// Download JSON
Downloader.json({ user: 'data' }, 'export.json');

// Download CSV
Downloader.csv('name,age\nAlice,30\nBob,25', 'users.csv');

// Download plain text
Downloader.text('Hello World', 'message.txt');
```

## Exports

| Export                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `Downloader`           | Static methods for triggering file downloads |
| `DownloadOptions`      | Immutable configuration for downloads        |
| `DownloadOptionsInput` | Options interface for creating downloads     |

## Methods

### Downloader.json()

Download JSON content with automatic serialization:

```typescript
Downloader.json({ foo: 'bar' }, 'data.json');
Downloader.json(exportData, `export-${Date.now()}.json`);

// Custom indentation
Downloader.json(data, 'compact.json', 0); // No indentation
```

### Downloader.csv()

Download CSV content:

```typescript
Downloader.csv('a,b,c\n1,2,3', 'data.csv');
```

### Downloader.text()

Download plain text:

```typescript
Downloader.text('Hello World', 'greeting.txt');
```

### Downloader.html()

Download HTML content:

```typescript
Downloader.html('<html><body>Hello</body></html>', 'page.html');
```

### Downloader.blob()

Download binary data (Blob or ArrayBuffer):

```typescript
const blob = new Blob([arrayBuffer], { type: 'image/png' });
Downloader.blob(blob, 'image.png');

// ArrayBuffer directly
Downloader.blob(arrayBuffer, 'file.bin');
```

### Downloader.download()

Download with DownloadOptions:

```typescript
import {
  Downloader,
  DownloadOptions,
} from '@zappzarapp/browser-utils/download';

const options = DownloadOptions.json('data.json');
Downloader.download(jsonString, options);
```

### Downloader.withOptions()

Download with custom options:

```typescript
Downloader.withOptions('content', {
  filename: 'export.dat',
  mimeType: 'application/x-custom',
});
```

### Downloader.safe()

Download with sanitized filename (for user input):

```typescript
// User input: "../../../etc/passwd"
// Sanitized to: "etc_passwd"
Downloader.safe(content, userProvidedFilename);

// With custom MIME type
Downloader.safe(content, filename, 'text/plain');
```

## DownloadOptions

### Factory Methods

```typescript
import { DownloadOptions } from '@zappzarapp/browser-utils/download';

// Type-specific options
const jsonOpts = DownloadOptions.json('data.json');
const csvOpts = DownloadOptions.csv('report.csv');
const textOpts = DownloadOptions.text('notes.txt');
const htmlOpts = DownloadOptions.html('page.html');
const binaryOpts = DownloadOptions.binary('file.bin');

// Custom options
const custom = DownloadOptions.create({
  filename: 'export.xml',
  mimeType: 'application/xml',
  sanitizeFilename: false,
});
```

### Fluent API

```typescript
const options = DownloadOptions.json('data.json')
  .withFilename('new-name.json')
  .withMimeType('application/json');
```

### Configuration

| Option             | Type      | Default                      | Description                             |
| ------------------ | --------- | ---------------------------- | --------------------------------------- |
| `filename`         | `string`  | Required                     | Filename for the download               |
| `mimeType`         | `string`  | `'application/octet-stream'` | MIME type for the content               |
| `sanitizeFilename` | `boolean` | `false`                      | Sanitize instead of throwing on invalid |

## Usage Examples

### Export Data

```typescript
function exportToJson(data: unknown): void {
  Downloader.json(data, `export-${new Date().toISOString()}.json`);
}

function exportToCsv(rows: string[][]): void {
  const csv = rows.map((row) => row.join(',')).join('\n');
  Downloader.csv(csv, 'export.csv');
}
```

### Generate and Download Report

```typescript
async function downloadReport(reportId: string): Promise<void> {
  const response = await fetch(`/api/reports/${reportId}`);
  const blob = await response.blob();
  Downloader.blob(blob, `report-${reportId}.pdf`);
}
```

### User-Provided Filename

```typescript
function downloadWithUserFilename(content: string, userFilename: string): void {
  // Safe: sanitizes dangerous characters and path traversal attempts
  Downloader.safe(content, userFilename, 'text/plain');
}
```

## Security Considerations

1. **Filename Validation** - All filenames are validated to prevent:
   - Path traversal attacks (`../../../etc/passwd`)
   - Special character injection
   - Empty or whitespace-only filenames

2. **Automatic Cleanup** - Blob URLs are immediately revoked after download to
   prevent memory leaks

3. **Sanitization Option** - Use `Downloader.safe()` or `sanitizeFilename: true`
   when filename comes from user input

4. **MIME Type Validation** - MIME types are validated to ensure proper format
