/**
 * Escapes a CSV field value to handle special characters
 * @param value - The value to escape
 * @returns Escaped string suitable for CSV
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let stringValue = String(value);

  // If the value contains comma, quote, or newline, wrap it in quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Escape quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param headers - Optional array of header names. If not provided, uses object keys
 * @returns CSV string
 */
function convertToCSV<T extends Record<string, any>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(escapeCsvValue).join(',');

  // Create data rows
  const dataRows = data.map((row) =>
    csvHeaders.map((header) => escapeCsvValue(row[header])).join(',')
  );

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Triggers a browser download of a CSV file
 * @param csvContent - The CSV content as a string
 * @param filename - The name of the file to download
 */
function downloadCSV(csvContent: string, filename: string): void {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Formats a filename with current date
 * @param prefix - Prefix for the filename
 * @param extension - File extension (default: 'csv')
 * @returns Formatted filename with date
 */
function formatFilename(prefix: string, extension: string = 'csv'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${prefix}_${year}-${month}-${day}.${extension}`;
}

/**
 * Main function to export data as CSV
 * @param data - Array of objects to export
 * @param filename - Name of the file (will be formatted with date)
 * @param headers - Optional custom header names
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    const csvContent = convertToCSV(data, headers);
    const formattedFilename = formatFilename(filename);
    downloadCSV(csvContent, formattedFilename);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export CSV');
  }
}

/**
 * Export with custom formatting for numbers and specific data types
 * @param data - Array of objects to export
 * @param filename - Name of the file
 * @param formatters - Optional object mapping field names to formatter functions
 */
export function exportToCSVWithFormatting<T extends Record<string, any>>(
  data: T[],
  filename: string,
  formatters?: Record<string, (value: any) => string>
): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  try {
    // Apply formatters if provided
    const formattedData = formatters
      ? data.map((row) => {
          const formattedRow: Record<string, any> = { ...row };
          Object.keys(formatters).forEach((key) => {
            if (key in formattedRow) {
              formattedRow[key] = formatters[key](formattedRow[key]);
            }
          });
          return formattedRow as T;
        })
      : data;

    const csvContent = convertToCSV(formattedData);
    const formattedFilename = formatFilename(filename);
    downloadCSV(csvContent, formattedFilename);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error('Failed to export CSV');
  }
}

export default exportToCSV;
