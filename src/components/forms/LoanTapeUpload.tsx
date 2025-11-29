import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from '../ui/Button';
import { Alert, AlertDescription } from '../ui/Alert';
import { Input } from '../ui/Input';
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

interface LoanTapeUploadProps {
  poolId: string;
  onUploadComplete?: (loanCount: number) => void;
}

// Required columns for validation
const REQUIRED_COLUMNS = ['loan_reference', 'original_principal', 'current_balance'];

// Column name variations for auto-mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  loan_reference: ['loan_reference', 'loan_id', 'loanid', 'id', 'reference', 'loan_number'],
  original_principal: ['original_principal', 'principal', 'original_amount', 'loan_amount', 'amount'],
  current_balance: ['current_balance', 'balance', 'outstanding_balance', 'remaining_balance'],
  interest_rate: ['interest_rate', 'rate', 'apr', 'interest'],
  term_months: ['term_months', 'term', 'months', 'loan_term'],
  origination_date: ['origination_date', 'orig_date', 'start_date', 'issue_date'],
  maturity_date: ['maturity_date', 'end_date', 'due_date'],
  fico_score: ['fico_score', 'fico', 'credit_score', 'score'],
  dti_ratio: ['dti_ratio', 'dti', 'debt_to_income'],
  borrower_state: ['borrower_state', 'state', 'st'],
  borrower_zip: ['borrower_zip', 'zip', 'zipcode', 'postal_code'],
  monthly_payment: ['monthly_payment', 'payment', 'monthly_pmt'],
  payments_made: ['payments_made', 'pmts_made', 'payments_completed'],
  payments_remaining: ['payments_remaining', 'pmts_remaining'],
  status: ['status', 'loan_status', 'current_status'],
  days_delinquent: ['days_delinquent', 'delinquent_days', 'dpd'],
};

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

interface ValidationResult {
  columnsFound: number;
  columnsRequired: number;
  formattingErrors: number;
  recordsPassed: number;
  totalRecords: number;
}

export function LoanTapeUpload({ poolId, onUploadComplete }: LoanTapeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [step, setStep] = useState<'upload' | 'validated' | 'uploading' | 'complete'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Auto-map columns based on header names
  const autoMapColumns = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

    Object.entries(COLUMN_ALIASES).forEach(([fieldKey, aliases]) => {
      for (const alias of aliases) {
        const normalizedAlias = alias.replace(/[^a-z0-9]/g, '');
        const matchIndex = normalizedHeaders.findIndex(h =>
          h === normalizedAlias || h.includes(normalizedAlias) || normalizedAlias.includes(h)
        );
        if (matchIndex !== -1 && !mapping[fieldKey]) {
          mapping[fieldKey] = headers[matchIndex];
          break;
        }
      }
    });

    return mapping;
  };

  // Validate data and return results
  const validateData = (data: Record<string, unknown>[], mapping: Record<string, string>): ValidationResult => {
    const columnsFound = REQUIRED_COLUMNS.filter(col => mapping[col]).length;
    let formattingErrors = 0;
    let recordsPassed = 0;

    data.forEach(row => {
      let hasError = false;

      // Check required fields
      if (!row[mapping.loan_reference]) hasError = true;
      if (!row[mapping.original_principal] || isNaN(Number(row[mapping.original_principal]))) hasError = true;
      if (!row[mapping.current_balance] || isNaN(Number(row[mapping.current_balance]))) hasError = true;

      if (hasError) {
        formattingErrors++;
      } else {
        recordsPassed++;
      }
    });

    return {
      columnsFound,
      columnsRequired: REQUIRED_COLUMNS.length,
      formattingErrors,
      recordsPassed,
      totalRecords: data.length,
    };
  };

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
          const mapping = autoMapColumns(headers);
          const validationResult = validateData(data, mapping);

          setRawData(data);
          setColumnMapping(mapping);
          setValidation(validationResult);
          setStep('validated');
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
          const mapping = autoMapColumns(headers);
          const validationResult = validateData(data, mapping);

          setRawData(data);
          setColumnMapping(mapping);
          setValidation(validationResult);
          setStep('validated');
        } catch (err) {
          setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Unsupported file type. Please upload a CSV or Excel file.');
    }
  }, []);

  // Format date from various formats
  const formatDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split('T')[0];

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    const strValue = String(value);
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

  // Transform data for upload
  const transformData = (): LoanRow[] => {
    return rawData.map(row => {
      const loan: LoanRow = {
        loan_reference: String(row[columnMapping.loan_reference] || ''),
        original_principal: parseFloat(String(row[columnMapping.original_principal] || 0)),
        current_balance: parseFloat(String(row[columnMapping.current_balance] || 0)),
        interest_rate: columnMapping.interest_rate ? parseFloat(String(row[columnMapping.interest_rate] || 0)) : 0,
        term_months: columnMapping.term_months ? parseInt(String(row[columnMapping.term_months] || 36), 10) : 36,
        origination_date: columnMapping.origination_date ? formatDate(row[columnMapping.origination_date]) : new Date().toISOString().split('T')[0],
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

      return loan;
    });
  };

  // Upload loans
  const handleUpload = async () => {
    const loans = transformData();
    if (!loans.length) return;

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
            description: description || undefined,
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
      setStep('validated');
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
    setColumnMapping({});
    setDescription('');
    setStep('upload');
    setError(null);
    setValidation(null);
    setUploadProgress(0);
    setUploadedCount(0);
  };

  // Remove file
  const handleRemoveFile = () => {
    setFile(null);
    setRawData([]);
    setColumnMapping({});
    setValidation(null);
    setStep('upload');
  };

  return (
    <div className="bg-white rounded-xl border border-light p-8">
      {error && (
        <Alert variant="error" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-darkest">Upload Loan Tape</h2>
            <p className="text-dark mt-1">
              Upload a CSV or Excel file containing your loan data. Only a single sheet is supported.
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-light rounded-lg p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById('loan-tape-input')?.click()}
          >
            <input
              id="loan-tape-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <svg className="w-10 h-10 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="font-semibold text-darkest">Choose file to upload</p>
                <p className="text-sm text-medium mt-1">.CSV or .XLSX file, maximum 10MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Pool Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button className="w-full" disabled>
            Upload Tape
          </Button>
        </div>
      )}

      {/* Step 2: Validated */}
      {step === 'validated' && validation && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-darkest">Loan Tape Validation</h2>
            <span className="text-sm font-medium text-success">Upload succeeded</span>
          </div>

          {/* File info */}
          <div className="space-y-2">
            <p className="font-medium text-darkest">File Uploaded</p>
            <div className="flex items-center justify-between p-4 bg-lightest rounded-lg border border-light">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-white border border-light flex items-center justify-center">
                  <svg className="w-5 h-5 text-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-darkest truncate max-w-[200px]">{file?.name}</p>
                  <p className="text-sm text-medium">{rawData.length.toLocaleString()} records</p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-2 text-medium hover:text-darkest transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <p className="font-medium text-darkest">Summary</p>
            <div className="space-y-2">
              <Label htmlFor="pool-description">Pool description</Label>
              <Input
                id="pool-description"
                placeholder="Pool Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Validation Results */}
          <div className="space-y-3">
            <p className="font-bold text-darkest">Validation Results</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  validation.columnsFound === validation.columnsRequired ? 'bg-success/10' : 'bg-error/10'
                }`}>
                  {validation.columnsFound === validation.columnsRequired ? (
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-dark">
                  File includes {validation.columnsFound} of {validation.columnsRequired} required columns
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  validation.formattingErrors === 0 ? 'bg-success/10' : 'bg-error/10'
                }`}>
                  {validation.formattingErrors === 0 ? (
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-dark">
                  {validation.formattingErrors === 0
                    ? 'No rows contain formatting errors'
                    : `${validation.formattingErrors} rows contain formatting errors`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  validation.recordsPassed === validation.totalRecords ? 'bg-success/10' : 'bg-error/10'
                }`}>
                  {validation.recordsPassed === validation.totalRecords ? (
                    <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-error" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-dark">
                  {validation.recordsPassed === validation.totalRecords
                    ? `All ${validation.totalRecords.toLocaleString()} records passed data checks`
                    : `${validation.recordsPassed.toLocaleString()} of ${validation.totalRecords.toLocaleString()} records passed data checks`}
                </span>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={validation.columnsFound !== validation.columnsRequired}
          >
            Continue
          </Button>
        </div>
      )}

      {/* Step 3: Uploading */}
      {step === 'uploading' && (
        <div className="py-12 text-center">
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

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="py-12 text-center">
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
