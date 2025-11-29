import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Label } from '../ui/Label';
import type { LoanStatus } from '../../types/database';

interface LoanRow {
  loan_reference: string;
  borrower_state?: string;
  borrower_zip?: string;
  original_principal: number;
  current_balance: number;
  interest_rate: number;
  term_months: number;
  origination_date: string;
  maturity_date?: string;
  fico_score?: number;
  dti_ratio?: number;
  monthly_payment?: number;
  payments_made?: number;
  payments_remaining?: number;
  status?: LoanStatus;
  days_delinquent?: number;
}

interface ColumnMapping {
  [key: string]: string;
}

interface LoanTapeUploadProps {
  poolId: string;
  onUploadComplete?: (loanCount: number) => void;
}

// Standard field definitions for loan tape
const LOAN_FIELDS = [
  { key: 'loan_reference', label: 'Loan ID/Reference', required: true },
  { key: 'borrower_state', label: 'Borrower State', required: false },
  { key: 'borrower_zip', label: 'Borrower ZIP', required: false },
  { key: 'original_principal', label: 'Original Principal', required: true },
  { key: 'current_balance', label: 'Current Balance', required: true },
  { key: 'interest_rate', label: 'Interest Rate (APR %)', required: true },
  { key: 'term_months', label: 'Term (Months)', required: true },
  { key: 'origination_date', label: 'Origination Date', required: true },
  { key: 'maturity_date', label: 'Maturity Date', required: false },
  { key: 'fico_score', label: 'FICO Score', required: false },
  { key: 'dti_ratio', label: 'DTI Ratio (%)', required: false },
  { key: 'monthly_payment', label: 'Monthly Payment', required: false },
  { key: 'payments_made', label: 'Payments Made', required: false },
  { key: 'payments_remaining', label: 'Payments Remaining', required: false },
  { key: 'status', label: 'Loan Status', required: false },
  { key: 'days_delinquent', label: 'Days Delinquent', required: false },
];

const STATUS_MAP: Record<string, LoanStatus> = {
  'current': 'current',
  'delinquent': 'delinquent_30',
  '30': 'delinquent_30',
  '30+': 'delinquent_30',
  '60': 'delinquent_60',
  '60+': 'delinquent_60',
  '90': 'delinquent_90',
  '90+': 'delinquent_90',
  'default': 'default',
  'charged off': 'charged_off',
  'chargedoff': 'charged_off',
  'charged_off': 'charged_off',
  'paid off': 'paid_off',
  'paidoff': 'paid_off',
  'paid_off': 'paid_off',
};

export function LoanTapeUpload({ poolId, onUploadComplete }: LoanTapeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'uploading' | 'complete'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Parse uploaded file
  const parseFile = useCallback((file: File) => {
    setError(null);
    const fileType = file.name.split('.').pop()?.toLowerCase();

    if (fileType === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            return;
          }
          const data = results.data as Record<string, unknown>[];
          if (data.length === 0) {
            setError('No data found in file');
            return;
          }
          const headers = Object.keys(data[0]);
          setHeaders(headers);
          setRawData(data);
          autoMapColumns(headers);
          setStep('mapping');
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

          if (data.length === 0) {
            setError('No data found in file');
            return;
          }

          const headers = Object.keys(data[0]);
          setHeaders(headers);
          setRawData(data);
          autoMapColumns(headers);
          setStep('mapping');
        } catch (err) {
          setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Unsupported file type. Please upload a CSV or Excel file.');
    }
  }, []);

  // Auto-map columns based on header names
  const autoMapColumns = (headers: string[]) => {
    const mapping: ColumnMapping = {};
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    LOAN_FIELDS.forEach(field => {
      const normalizedKey = field.key.replace(/_/g, '');
      const matchIndex = normalizedHeaders.findIndex(h =>
        h.includes(normalizedKey) ||
        normalizedKey.includes(h) ||
        (field.key === 'loan_reference' && (h.includes('loanid') || h.includes('id') || h.includes('reference'))) ||
        (field.key === 'original_principal' && (h.includes('principal') || h.includes('original'))) ||
        (field.key === 'current_balance' && (h.includes('balance') || h.includes('current'))) ||
        (field.key === 'interest_rate' && (h.includes('rate') || h.includes('apr') || h.includes('interest'))) ||
        (field.key === 'term_months' && (h.includes('term') || h.includes('months'))) ||
        (field.key === 'fico_score' && (h.includes('fico') || h.includes('credit') || h.includes('score'))) ||
        (field.key === 'dti_ratio' && (h.includes('dti') || h.includes('debt'))) ||
        (field.key === 'borrower_state' && h.includes('state')) ||
        (field.key === 'borrower_zip' && (h.includes('zip') || h.includes('postal')))
      );

      if (matchIndex !== -1) {
        mapping[field.key] = headers[matchIndex];
      }
    });

    setColumnMapping(mapping);
  };

  // Validate and transform data
  const validateAndTransform = (): LoanRow[] | null => {
    const errors: string[] = [];
    const loans: LoanRow[] = [];

    // Check required fields are mapped
    const requiredFields = LOAN_FIELDS.filter(f => f.required);
    for (const field of requiredFields) {
      if (!columnMapping[field.key]) {
        errors.push(`Required field "${field.label}" is not mapped`);
      }
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return null;
    }

    // Transform each row
    rawData.forEach((row, index) => {
      try {
        const loan: LoanRow = {
          loan_reference: String(row[columnMapping.loan_reference] || ''),
          original_principal: parseFloat(String(row[columnMapping.original_principal] || 0)),
          current_balance: parseFloat(String(row[columnMapping.current_balance] || 0)),
          interest_rate: parseFloat(String(row[columnMapping.interest_rate] || 0)),
          term_months: parseInt(String(row[columnMapping.term_months] || 0), 10),
          origination_date: formatDate(row[columnMapping.origination_date]),
        };

        // Optional fields
        if (columnMapping.borrower_state && row[columnMapping.borrower_state]) {
          loan.borrower_state = String(row[columnMapping.borrower_state]).substring(0, 2).toUpperCase();
        }
        if (columnMapping.borrower_zip && row[columnMapping.borrower_zip]) {
          loan.borrower_zip = String(row[columnMapping.borrower_zip]).substring(0, 10);
        }
        if (columnMapping.maturity_date && row[columnMapping.maturity_date]) {
          loan.maturity_date = formatDate(row[columnMapping.maturity_date]);
        }
        if (columnMapping.fico_score && row[columnMapping.fico_score]) {
          loan.fico_score = parseInt(String(row[columnMapping.fico_score]), 10);
        }
        if (columnMapping.dti_ratio && row[columnMapping.dti_ratio]) {
          loan.dti_ratio = parseFloat(String(row[columnMapping.dti_ratio]));
        }
        if (columnMapping.monthly_payment && row[columnMapping.monthly_payment]) {
          loan.monthly_payment = parseFloat(String(row[columnMapping.monthly_payment]));
        }
        if (columnMapping.payments_made && row[columnMapping.payments_made]) {
          loan.payments_made = parseInt(String(row[columnMapping.payments_made]), 10);
        }
        if (columnMapping.payments_remaining && row[columnMapping.payments_remaining]) {
          loan.payments_remaining = parseInt(String(row[columnMapping.payments_remaining]), 10);
        }
        if (columnMapping.status && row[columnMapping.status]) {
          const statusStr = String(row[columnMapping.status]).toLowerCase();
          loan.status = STATUS_MAP[statusStr] || 'current';
        }
        if (columnMapping.days_delinquent && row[columnMapping.days_delinquent]) {
          loan.days_delinquent = parseInt(String(row[columnMapping.days_delinquent]), 10);
        }

        // Validate row
        if (!loan.loan_reference) {
          errors.push(`Row ${index + 2}: Missing loan reference`);
        }
        if (isNaN(loan.original_principal) || loan.original_principal <= 0) {
          errors.push(`Row ${index + 2}: Invalid original principal`);
        }
        if (isNaN(loan.current_balance) || loan.current_balance < 0) {
          errors.push(`Row ${index + 2}: Invalid current balance`);
        }
        if (isNaN(loan.interest_rate) || loan.interest_rate < 0 || loan.interest_rate > 100) {
          errors.push(`Row ${index + 2}: Invalid interest rate`);
        }
        if (isNaN(loan.term_months) || loan.term_months <= 0) {
          errors.push(`Row ${index + 2}: Invalid term`);
        }

        loans.push(loan);
      } catch (err) {
        errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors.slice(0, 20)); // Show first 20 errors
      if (errors.length > 20) {
        setValidationErrors(prev => [...prev, `... and ${errors.length - 20} more errors`]);
      }
      return null;
    }

    setValidationErrors([]);
    return loans;
  };

  // Format date from various formats
  const formatDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split('T')[0];

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    const strValue = String(value);

    // Try parsing as ISO date
    const isoDate = new Date(strValue);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }

    // Try MM/DD/YYYY
    const parts = strValue.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return new Date().toISOString().split('T')[0];
  };

  // Handle mapping change
  const handleMappingChange = (fieldKey: string, columnName: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: columnName === '' ? undefined : columnName,
    }));
  };

  // Proceed to preview
  const handlePreview = () => {
    const loans = validateAndTransform();
    if (loans) {
      setStep('preview');
    }
  };

  // Upload loans
  const handleUpload = async () => {
    const loans = validateAndTransform();
    if (!loans) return;

    setStep('uploading');
    setUploadProgress(0);
    setError(null);

    const batchSize = 100;
    const totalBatches = Math.ceil(loans.length / batchSize);
    let uploaded = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = loans.slice(i * batchSize, (i + 1) * batchSize);

        const response = await fetch('/api/lender/pools/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pool_id: poolId,
            loans: batch,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || 'Failed to upload loans');
        }

        uploaded += batch.length;
        setUploadProgress(Math.round((uploaded / loans.length) * 100));
        setUploadedCount(uploaded);
      }

      setStep('complete');
      onUploadComplete?.(loans.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('preview');
    }
  };

  // File drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      parseFile(droppedFile);
    }
  }, [parseFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setRawData([]);
    setHeaders([]);
    setColumnMapping({});
    setStep('upload');
    setError(null);
    setValidationErrors([]);
    setUploadProgress(0);
    setUploadedCount(0);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-light rounded-xl p-12 text-center hover:border-primary transition-colors cursor-pointer"
          onClick={() => document.getElementById('loan-tape-input')?.click()}
        >
          <input
            id="loan-tape-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-lightest flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-darkest">Drop your loan tape here</p>
              <p className="text-medium mt-1">or click to browse</p>
            </div>
            <p className="text-sm text-medium">Supports CSV and Excel (.xlsx, .xls)</p>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-darkest">Map Columns</h3>
              <p className="text-medium">
                {file?.name} - {rawData.length.toLocaleString()} loans found
              </p>
            </div>
            <Button variant="outline" onClick={handleReset}>
              Upload Different File
            </Button>
          </div>

          {validationErrors.length > 0 && (
            <Alert variant="error">
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-xl border border-light divide-y divide-light">
            {LOAN_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <span className={field.required ? 'font-medium text-darkest' : 'text-dark'}>
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-xs text-error">*</span>
                  )}
                </div>
                <div className="w-64">
                  <Select
                    value={columnMapping[field.key] || ''}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not mapped --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button onClick={handlePreview}>
              Preview Import
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-darkest">Preview Import</h3>
              <p className="text-medium">
                Ready to import {rawData.length.toLocaleString()} loans
              </p>
            </div>
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Back to Mapping
            </Button>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-light overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-lightest border-b border-light">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-dark">Loan ID</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">Principal</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">Balance</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">APR</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">Term</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">FICO</th>
                    <th className="px-4 py-3 text-left font-medium text-dark">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {rawData.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-darkest">{String(row[columnMapping.loan_reference] || '-')}</td>
                      <td className="px-4 py-3">${Number(row[columnMapping.original_principal] || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">${Number(row[columnMapping.current_balance] || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">{Number(row[columnMapping.interest_rate] || 0).toFixed(2)}%</td>
                      <td className="px-4 py-3">{row[columnMapping.term_months] || '-'} mo</td>
                      <td className="px-4 py-3">{row[columnMapping.fico_score] || '-'}</td>
                      <td className="px-4 py-3">{row[columnMapping.borrower_state] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawData.length > 10 && (
              <div className="px-4 py-3 bg-lightest text-medium text-sm">
                Showing 10 of {rawData.length.toLocaleString()} loans
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button onClick={handleUpload}>
              Import {rawData.length.toLocaleString()} Loans
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Uploading */}
      {step === 'uploading' && (
        <div className="bg-white rounded-xl border border-light p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-darkest">Importing loans...</p>
              <p className="text-medium mt-1">
                {uploadedCount.toLocaleString()} of {rawData.length.toLocaleString()} loans uploaded
              </p>
            </div>
            <div className="w-full max-w-md bg-lightest rounded-full h-3 mt-4">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-medium">{uploadProgress}% complete</p>
          </div>
        </div>
      )}

      {/* Step 5: Complete */}
      {step === 'complete' && (
        <div className="bg-white rounded-xl border border-light p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-darkest">Import Complete!</p>
              <p className="text-medium mt-1">
                Successfully imported {uploadedCount.toLocaleString()} loans
              </p>
            </div>
            <Button onClick={handleReset} variant="outline">
              Import More Loans
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
