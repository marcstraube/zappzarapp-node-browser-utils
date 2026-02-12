// noinspection JSUnusedGlobalSymbols - Example file

/**
 * Download Files Example - Programmatic file downloads
 *
 * This example demonstrates:
 * - Downloading JSON data
 * - Downloading CSV files
 * - Downloading plain text files
 * - Downloading HTML files
 * - Downloading binary/blob data
 * - Custom MIME types
 * - Filename sanitization for user input
 * - Building an export feature
 *
 * @packageDocumentation
 */

import { Downloader, DownloadOptions } from '@zappzarapp/browser-utils/download';
import { Logger } from '@zappzarapp/browser-utils/logging';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * User data for export examples.
 */
interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: 'admin' | 'user' | 'guest';
  readonly createdAt: string;
}

/**
 * Report data structure.
 */
interface Report {
  readonly title: string;
  readonly generatedAt: string;
  readonly data: readonly User[];
  readonly summary: {
    readonly total: number;
    readonly byRole: Record<string, number>;
  };
}

/**
 * Export format options.
 */
type ExportFormat = 'json' | 'csv' | 'text' | 'html';

// =============================================================================
// Sample Data
// =============================================================================

/**
 * Sample user data for examples.
 */
const SAMPLE_USERS: readonly User[] = [
  {
    id: 1,
    name: 'Alice Smith',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2024-01-15',
  },
  { id: 2, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', createdAt: '2024-02-20' },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol@example.com',
    role: 'user',
    createdAt: '2024-03-10',
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david@example.com',
    role: 'guest',
    createdAt: '2024-03-25',
  },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'admin', createdAt: '2024-04-05' },
] as const;

// =============================================================================
// Basic Downloads
// =============================================================================

/**
 * Download JSON data.
 */
function downloadJsonExample(): void {
  console.log('--- JSON Download ---');

  const data = {
    users: SAMPLE_USERS,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };

  // Simple JSON download
  Downloader.json(data, 'users-export.json');
  console.log('Downloaded: users-export.json');

  // With custom indentation
  Downloader.json(data, 'users-compact.json', 0);
  console.log('Downloaded: users-compact.json (compact)');

  // Timestamp in filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  Downloader.json(data, `users-${timestamp}.json`);
  console.log(`Downloaded: users-${timestamp}.json`);
}

/**
 * Download CSV data.
 */
function downloadCsvExample(): void {
  console.log('\n--- CSV Download ---');

  // Convert users to CSV
  const headers = ['ID', 'Name', 'Email', 'Role', 'Created At'];
  const rows = SAMPLE_USERS.map((user) => [
    user.id.toString(),
    user.name,
    user.email,
    user.role,
    user.createdAt,
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Download CSV
  Downloader.csv(csvContent, 'users.csv');
  console.log('Downloaded: users.csv');

  // Alternative: With BOM for Excel compatibility
  const bom = '\uFEFF'; // UTF-8 BOM
  const csvWithBom = bom + csvContent;
  Downloader.withOptions(csvWithBom, {
    filename: 'users-excel.csv',
    mimeType: 'text/csv;charset=utf-8',
  });
  console.log('Downloaded: users-excel.csv (with BOM for Excel)');
}

/**
 * Download plain text.
 */
function downloadTextExample(): void {
  console.log('\n--- Text Download ---');

  // Simple text
  const simpleText = 'Hello, World!\nThis is a plain text file.';
  Downloader.text(simpleText, 'hello.txt');
  console.log('Downloaded: hello.txt');

  // Formatted report
  const report = [
    'User Report',
    '===========',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'Users:',
    ...SAMPLE_USERS.map((u) => `  - ${u.name} (${u.email}) - ${u.role}`),
    '',
    `Total: ${SAMPLE_USERS.length} users`,
  ].join('\n');

  Downloader.text(report, 'user-report.txt');
  console.log('Downloaded: user-report.txt');
}

/**
 * Download HTML content.
 */
function downloadHtmlExample(): void {
  console.log('\n--- HTML Download ---');

  // Generate HTML table
  const tableRows = SAMPLE_USERS.map(
    (user) => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.createdAt}</td>
      </tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>User Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>User Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Email</th>
        <th>Role</th>
        <th>Created</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <p><em>Total: ${SAMPLE_USERS.length} users</em></p>
</body>
</html>
  `.trim();

  Downloader.html(html, 'user-report.html');
  console.log('Downloaded: user-report.html');
}

// =============================================================================
// Binary Downloads
// =============================================================================

/**
 * Download binary data.
 */
function downloadBinaryExample(): void {
  console.log('\n--- Binary Download ---');

  // Create a simple binary file (e.g., a small PNG)
  // This is a 1x1 pixel transparent PNG
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);

  // Download as Blob
  const blob = new Blob([pngData], { type: 'image/png' });
  Downloader.blob(blob, 'pixel.png');
  console.log('Downloaded: pixel.png (1x1 transparent PNG)');

  // Download ArrayBuffer directly
  Downloader.blob(pngData.buffer, 'pixel-from-buffer.png');
  console.log('Downloaded: pixel-from-buffer.png');
}

/**
 * Download data URL content.
 */
async function downloadFromDataUrl(): Promise<void> {
  console.log('\n--- Download from Data URL ---');

  // Example: Download SVG from data URL
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <circle cx="50" cy="50" r="40" fill="#4CAF50"/>
      <text x="50" y="55" text-anchor="middle" fill="white" font-size="20">Hi</text>
    </svg>
  `.trim();

  // As SVG file
  Downloader.withOptions(svgContent, {
    filename: 'circle.svg',
    mimeType: 'image/svg+xml',
  });
  console.log('Downloaded: circle.svg');

  // Convert to blob for other uses
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  console.log(`Created blob: ${blob.size} bytes`);
}

// =============================================================================
// Advanced: Custom Download Options
// =============================================================================

/**
 * Download with custom options.
 */
function customOptionsExample(): void {
  console.log('\n--- Custom Download Options ---');

  // Create options for JSON
  const jsonOptions = DownloadOptions.json('data.json');
  console.log(`JSON options: ${jsonOptions.filename} (${jsonOptions.mimeType})`);

  // Create options for CSV
  const csvOptions = DownloadOptions.csv('report.csv');
  console.log(`CSV options: ${csvOptions.filename} (${csvOptions.mimeType})`);

  // Create options for custom MIME type
  const customOptions = DownloadOptions.create({
    filename: 'config.yaml',
    mimeType: 'application/x-yaml',
  });
  console.log(`Custom options: ${customOptions.filename} (${customOptions.mimeType})`);

  // Fluent API for modifying options
  const modifiedOptions = jsonOptions.withFilename('modified-data.json');
  console.log(`Modified: ${modifiedOptions.filename}`);

  // Download with custom content
  const yamlContent = `
name: MyApp
version: 1.0.0
database:
  host: localhost
  port: 5432
  `.trim();

  Downloader.download(yamlContent, customOptions);
  console.log('Downloaded: config.yaml');
}

// =============================================================================
// Filename Sanitization
// =============================================================================

/**
 * Handle user-provided filenames safely.
 */
function filenameSanitizationExample(): void {
  console.log('\n--- Filename Sanitization ---');

  // Simulate user-provided filenames (potentially dangerous)
  const userFilenames = [
    'my report.txt', // Spaces (usually OK)
    '../../../etc/passwd', // Path traversal attempt
    'CON.txt', // Reserved name on Windows
    'file<with>invalid:chars', // Invalid characters
    'normal_file.txt', // Normal filename
  ];

  console.log('Testing user-provided filenames:');

  for (const filename of userFilenames) {
    try {
      // Using safe() method sanitizes instead of throwing
      console.log(`  Input: "${filename}"`);

      // Create options with sanitization
      const options = DownloadOptions.create({
        filename,
        mimeType: 'text/plain',
        sanitizeFilename: true,
      });

      console.log(`  Output: "${options.filename}"`);
      console.log('');
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
    }
  }

  // Safe download with user input
  const userProvidedName = '../malicious/path.txt';
  Downloader.safe('Safe content', userProvidedName);
  console.log(`Downloaded with sanitized name from: "${userProvidedName}"`);
}

// =============================================================================
// Export Feature Builder
// =============================================================================

/**
 * A complete export feature for applications.
 */
class DataExporter {
  private readonly logger: ReturnType<typeof Logger.create>;

  constructor(debug = false) {
    this.logger = Logger.create({
      prefix: '[Exporter]',
      level: debug ? 0 : 2, // Debug or Warn
    });
  }

  /**
   * Export data in the specified format.
   */
  export(data: readonly User[], format: ExportFormat, filename?: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = filename ?? `export-${timestamp}`;

    this.logger.debug(`Exporting ${data.length} records as ${format}`);

    switch (format) {
      case 'json':
        this.exportJson(data, baseFilename);
        break;
      case 'csv':
        this.exportCsv(data, baseFilename);
        break;
      case 'text':
        this.exportText(data, baseFilename);
        break;
      case 'html':
        this.exportHtml(data, baseFilename);
        break;
    }
  }

  /**
   * Generate a report with summary.
   */
  generateReport(data: readonly User[]): Report {
    const byRole: Record<string, number> = {};
    for (const user of data) {
      byRole[user.role] = (byRole[user.role] ?? 0) + 1;
    }

    return {
      title: 'User Export Report',
      generatedAt: new Date().toISOString(),
      data,
      summary: {
        total: data.length,
        byRole,
      },
    };
  }

  /**
   * Export full report as JSON.
   */
  exportReport(data: readonly User[]): void {
    const report = this.generateReport(data);
    Downloader.json(report, `report-${Date.now()}.json`);
    this.logger.info('Report exported');
  }

  private exportJson(data: readonly User[], filename: string): void {
    Downloader.json(data, `${filename}.json`);
    this.logger.info(`Exported JSON: ${filename}.json`);
  }

  private exportCsv(data: readonly User[], filename: string): void {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Created At'];
    const rows = data.map((user) =>
      [user.id, user.name, user.email, user.role, user.createdAt]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    Downloader.csv(csv, `${filename}.csv`);
    this.logger.info(`Exported CSV: ${filename}.csv`);
  }

  private exportText(data: readonly User[], filename: string): void {
    const lines = [
      'User Export',
      '='.repeat(50),
      `Generated: ${new Date().toLocaleString()}`,
      '',
      ...data.map(
        (user) =>
          `[${user.id}] ${user.name}\n    Email: ${user.email}\n    Role: ${user.role}\n    Created: ${user.createdAt}\n`
      ),
      '='.repeat(50),
      `Total: ${data.length} users`,
    ];

    Downloader.text(lines.join('\n'), `${filename}.txt`);
    this.logger.info(`Exported text: ${filename}.txt`);
  }

  private exportHtml(data: readonly User[], filename: string): void {
    const rows = data
      .map(
        (user) => `
      <tr>
        <td>${user.id}</td>
        <td>${this.escapeHtml(user.name)}</td>
        <td><a href="mailto:${user.email}">${user.email}</a></td>
        <td><span class="badge ${user.role}">${user.role}</span></td>
        <td>${user.createdAt}</td>
      </tr>`
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>User Export</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { margin-top: 0; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #4CAF50; color: white; }
    tr:hover { background: #f5f5f5; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .admin { background: #e3f2fd; color: #1565c0; }
    .user { background: #e8f5e9; color: #2e7d32; }
    .guest { background: #fff3e0; color: #ef6c00; }
    .footer { margin-top: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>User Export</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <table>
      <thead>
        <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="footer">Total: ${data.length} users</p>
  </div>
</body>
</html>`.trim();

    Downloader.html(html, `${filename}.html`);
    this.logger.info(`Exported HTML: ${filename}.html`);
  }

  private escapeHtml(text: string): string {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => escapes[char] ?? char);
  }
}

/**
 * Example: Using DataExporter.
 */
function dataExporterExample(): void {
  console.log('\n--- Data Exporter Example ---');

  const exporter = new DataExporter(true);

  // Export in different formats
  console.log('Exporting data in all formats:');
  exporter.export(SAMPLE_USERS, 'json', 'users');
  exporter.export(SAMPLE_USERS, 'csv', 'users');
  exporter.export(SAMPLE_USERS, 'text', 'users');
  exporter.export(SAMPLE_USERS, 'html', 'users');

  // Export full report
  console.log('\nExporting full report:');
  exporter.exportReport(SAMPLE_USERS);
}

// =============================================================================
// Batch Download
// =============================================================================

/**
 * Example: Download multiple files in sequence.
 */
async function batchDownloadExample(): Promise<void> {
  console.log('\n--- Batch Download ---');

  const files = [
    { name: 'data-1.json', content: JSON.stringify({ id: 1, value: 'First' }) },
    { name: 'data-2.json', content: JSON.stringify({ id: 2, value: 'Second' }) },
    { name: 'data-3.json', content: JSON.stringify({ id: 3, value: 'Third' }) },
  ];

  console.log(`Downloading ${files.length} files...`);

  // Add delay between downloads to avoid overwhelming the browser
  for (const file of files) {
    Downloader.json(file.content, file.name, 2);
    console.log(`  Downloaded: ${file.name}`);

    // Small delay between downloads
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log('Batch download complete');
}

// =============================================================================
// Download with Progress (conceptual)
// =============================================================================

/**
 * Example: Generate large file with progress indication.
 */
function largeFileGenerationExample(): void {
  console.log('\n--- Large File Generation ---');

  const rowCount = 1000;
  const rows: string[] = ['id,value,timestamp'];

  console.log(`Generating ${rowCount} rows...`);

  for (let i = 0; i < rowCount; i++) {
    rows.push(`${i},value_${i},${Date.now()}`);

    // Report progress every 250 rows
    if ((i + 1) % 250 === 0) {
      const progress = Math.round(((i + 1) / rowCount) * 100);
      console.log(`  Progress: ${progress}%`);
    }
  }

  const csvContent = rows.join('\n');
  console.log(`Generated ${csvContent.length} bytes`);

  Downloader.csv(csvContent, 'large-data.csv');
  console.log('Downloaded: large-data.csv');
}

// =============================================================================
// Run All Examples
// =============================================================================

/**
 * Run all download examples.
 */
export async function runDownloadExamples(): Promise<void> {
  console.log('=== Download Files Examples ===\n');

  downloadJsonExample();
  downloadCsvExample();
  downloadTextExample();
  downloadHtmlExample();
  downloadBinaryExample();
  await downloadFromDataUrl();
  customOptionsExample();
  filenameSanitizationExample();
  dataExporterExample();
  await batchDownloadExample();
  largeFileGenerationExample();

  console.log('\n=== Download Examples Complete ===');
}

// Export for module usage
export { DataExporter, SAMPLE_USERS, type User, type Report, type ExportFormat };

// Uncomment to run directly
// runDownloadExamples().catch(console.error);
