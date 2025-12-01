import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface LoanRow {
  [key: string]: unknown;
}

interface ValidationIssue {
  row: number;
  field: string;
  value: unknown;
  severity: 'error' | 'warning';
  message: string;
}

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
  columnStats: {
    field: string;
    mapped: boolean;
    mappedTo?: string;
  }[];
}

// Column name variations for auto-mapping
const COLUMN_ALIASES: Record<string, string[]> = {
  loan_id: ['loan_id', 'loan_reference', 'loanid', 'id', 'reference', 'loan_number', 'loan_ref'],
  principal: ['principal', 'original_principal', 'loan_amount', 'amount', 'original_amount'],
  balance: ['balance', 'current_balance', 'outstanding_balance', 'remaining_balance'],
  rate: ['rate', 'interest_rate', 'apr', 'interest', 'int_rate'],
  fico: ['fico', 'fico_score', 'credit_score', 'score', 'fico_at_origination'],
  state: ['state', 'borrower_state', 'st', 'state_code'],
  origination_date: ['origination_date', 'orig_date', 'start_date', 'issue_date', 'loan_date'],
  status: ['status', 'loan_status', 'current_status'],
};

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export function TapeValidator() {
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<LoanRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'validating' | 'preview' | 'results'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [cleanedData, setCleanedData] = useState<LoanRow[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // Check auth state and restore pending validation on mount
  useEffect(() => {
    // Check for auth cookie or localStorage flag
    const authToken = document.cookie.includes('sb-access-token') ||
                     localStorage.getItem('primebridge_auth') === 'true';
    setIsLoggedIn(authToken);

    // Check if returning from signup with pending validation
    const urlParams = new URLSearchParams(window.location.search);
    const isUnlocked = urlParams.get('unlocked') === 'true';

    if (isUnlocked && authToken) {
      // Restore pending validation from sessionStorage
      const pendingData = sessionStorage.getItem('primebridge_pending_validation');
      if (pendingData) {
        try {
          const { fileName, validation: savedValidation, cleanedData: savedCleanedData } = JSON.parse(pendingData);
          setFile(new File([], fileName));
          setValidation(savedValidation);
          setCleanedData(savedCleanedData);
          setStep('results');
          // Save to dashboard
          saveToDashboard(fileName, savedValidation);
          // Clear pending data
          sessionStorage.removeItem('primebridge_pending_validation');
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        } catch (e) {
          console.error('Failed to restore validation:', e);
        }
      }
    }
  }, []);

  // Auto-map columns based on header names
  const autoMapColumns = (headers: string[]): Record<string, string> => {
    const mapping: Record<string, string> = {};
    const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    Object.entries(COLUMN_ALIASES).forEach(([fieldKey, aliases]) => {
      for (const alias of aliases) {
        const normalizedAlias = alias.replace(/[^a-z0-9_]/g, '');
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

  // Validate all data rows
  const validateData = (data: LoanRow[], mapping: Record<string, string>): ValidationSummary => {
    const issues: ValidationIssue[] = [];
    const seenLoanIds = new Map<string, number>();
    let validRows = 0;

    data.forEach((row, idx) => {
      const rowNum = idx + 2;
      let rowHasError = false;

      // Check loan_id
      const loanId = mapping.loan_id ? String(row[mapping.loan_id] || '').trim() : '';
      if (!loanId) {
        issues.push({
          row: rowNum, field: 'loan_id', value: row[mapping.loan_id],
          severity: 'error', message: 'Missing loan ID'
        });
        rowHasError = true;
      } else if (seenLoanIds.has(loanId)) {
        issues.push({
          row: rowNum, field: 'loan_id', value: loanId,
          severity: 'warning', message: `Duplicate loan ID (also on row ${seenLoanIds.get(loanId)})`
        });
      } else {
        seenLoanIds.set(loanId, rowNum);
      }

      // Check principal
      if (mapping.principal) {
        const principal = parseFloat(String(row[mapping.principal] || ''));
        if (isNaN(principal)) {
          issues.push({ row: rowNum, field: 'principal', value: row[mapping.principal], severity: 'error', message: 'Invalid principal amount' });
          rowHasError = true;
        } else if (principal <= 0) {
          issues.push({ row: rowNum, field: 'principal', value: principal, severity: 'error', message: 'Principal must be greater than 0' });
          rowHasError = true;
        } else if (principal > 10000000) {
          issues.push({ row: rowNum, field: 'principal', value: principal, severity: 'warning', message: 'Unusually high principal (> $10M)' });
        }
      }

      // Check rate/APR
      if (mapping.rate) {
        const rate = parseFloat(String(row[mapping.rate] || ''));
        if (!isNaN(rate)) {
          if (rate < 0) {
            issues.push({ row: rowNum, field: 'rate', value: rate, severity: 'error', message: 'Interest rate cannot be negative' });
            rowHasError = true;
          } else if (rate > 100) {
            issues.push({ row: rowNum, field: 'rate', value: rate, severity: 'error', message: 'Interest rate exceeds 100%' });
            rowHasError = true;
          } else if (rate > 36) {
            issues.push({ row: rowNum, field: 'rate', value: rate, severity: 'warning', message: 'High interest rate (> 36%)' });
          }
        }
      }

      // Check FICO
      if (mapping.fico) {
        const fico = row[mapping.fico];
        if (fico !== null && fico !== undefined && fico !== '') {
          const ficoNum = parseInt(String(fico), 10);
          if (isNaN(ficoNum)) {
            issues.push({ row: rowNum, field: 'fico', value: fico, severity: 'warning', message: 'Invalid FICO score format' });
          } else if (ficoNum < 300 || ficoNum > 850) {
            issues.push({ row: rowNum, field: 'fico', value: ficoNum, severity: 'error', message: `FICO score out of range (300-850): ${ficoNum}` });
            rowHasError = true;
          }
        } else {
          issues.push({ row: rowNum, field: 'fico', value: fico, severity: 'warning', message: 'Missing FICO score' });
        }
      }

      // Check state
      if (mapping.state) {
        const state = String(row[mapping.state] || '').trim().toUpperCase();
        if (state && !US_STATES.includes(state)) {
          issues.push({ row: rowNum, field: 'state', value: row[mapping.state], severity: 'error', message: `Invalid state code: ${state}` });
          rowHasError = true;
        }
      }

      // Check date format
      if (mapping.origination_date) {
        const dateVal = row[mapping.origination_date];
        if (dateVal) {
          const dateStr = String(dateVal);
          const hasSpaces = dateStr.includes(' ');
          const hasDashes = dateStr.includes('-');
          if (hasSpaces && !hasDashes) {
            issues.push({ row: rowNum, field: 'origination_date', value: dateVal, severity: 'warning', message: 'Non-standard date format' });
          }
        }
      }

      if (!rowHasError) validRows++;
    });

    const columnStats = Object.keys(COLUMN_ALIASES).map(field => ({
      field, mapped: !!mapping[field], mappedTo: mapping[field]
    }));

    return { totalRows: data.length, validRows, errors: issues.filter(i => i.severity === 'error').length, warnings: issues.filter(i => i.severity === 'warning').length, issues, columnStats };
  };

  // Clean the data
  const cleanData = (data: LoanRow[], mapping: Record<string, string>): LoanRow[] => {
    return data.map(row => {
      const cleaned: LoanRow = { ...row };
      if (mapping.state && cleaned[mapping.state]) {
        cleaned[mapping.state] = String(cleaned[mapping.state]).trim().toUpperCase();
      }
      if (mapping.origination_date && cleaned[mapping.origination_date]) {
        const dateStr = String(cleaned[mapping.origination_date]);
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            cleaned[mapping.origination_date] = date.toISOString().split('T')[0];
          }
        } catch { /* Keep original */ }
      }
      return cleaned;
    });
  };

  // Parse uploaded file
  const parseFile = useCallback((file: File) => {
    setError(null);
    setStep('validating');
    const fileType = file.name.split('.').pop()?.toLowerCase();

    const processData = (data: LoanRow[], headers: string[]) => {
      const mapping = autoMapColumns(headers);
      const validationResult = validateData(data, mapping);
      const cleaned = cleanData(data, mapping);

      setRawData(data);
      setColumnMapping(mapping);
      setValidation(validationResult);
      setCleanedData(cleaned);

      // Show preview first, then full results if logged in
      if (isLoggedIn) {
        setStep('results');
        saveToDashboard(file.name, validationResult);
      } else {
        setStep('preview');
      }
    };

    if (fileType === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError(`CSV parsing error: ${results.errors[0].message}`);
            setStep('upload');
            return;
          }
          const data = results.data as LoanRow[];
          if (data.length === 0) {
            setError('No data found in file');
            setStep('upload');
            return;
          }
          processData(data, Object.keys(data[0]));
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
          setStep('upload');
        },
      });
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'binary', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet) as LoanRow[];
          if (data.length === 0) {
            setError('No data found in file');
            setStep('upload');
            return;
          }
          processData(data, Object.keys(data[0]));
        } catch (err) {
          setError(`Failed to parse Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setStep('upload');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Unsupported file type. Please upload a CSV or Excel file.');
      setStep('upload');
    }
  }, [isLoggedIn]);

  // Export clean CSV
  const exportCleanCSV = () => {
    if (!cleanedData.length) return;
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${file?.name.replace(/\.[^.]+$/, '')}_clean.csv`;
    link.click();
  };

  // Export validation report
  const exportReport = () => {
    if (!validation) return;
    const report = {
      summary: { fileName: file?.name, totalRows: validation.totalRows, validRows: validation.validRows, errorCount: validation.errors, warningCount: validation.warnings, validationScore: Math.round((validation.validRows / validation.totalRows) * 100) },
      columnMapping: validation.columnStats,
      issues: validation.issues
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${file?.name.replace(/\.[^.]+$/, '')}_validation_report.json`;
    link.click();
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

  // Save to dashboard (Supabase if logged in, localStorage as fallback)
  const saveToDashboard = async (fileName: string, validationResult: ValidationSummary) => {
    const validationScore = Math.round((validationResult.validRows / validationResult.totalRows) * 100);
    const tapeRecord = {
      id: crypto.randomUUID(),
      name: fileName,
      totalRows: validationResult.totalRows,
      validRows: validationResult.validRows,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      validationScore,
      uploadedAt: new Date().toISOString()
    };

    // Always save to localStorage (for offline access and non-logged-in users)
    const existingTapes = JSON.parse(localStorage.getItem('primebridge_tapes') || '[]');
    existingTapes.unshift(tapeRecord);
    localStorage.setItem('primebridge_tapes', JSON.stringify(existingTapes.slice(0, 50)));

    // If logged in, also save to Supabase
    if (isLoggedIn) {
      try {
        const response = await fetch('/api/tapes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fileName,
            fileName: fileName,
            totalRows: validationResult.totalRows,
            validationScore,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            validationData: {
              issues: validationResult.issues.slice(0, 100), // Limit stored issues
              columnMapping: validationResult.columnMapping,
            },
          }),
        });
        if (!response.ok) {
          console.error('Failed to save tape to cloud:', await response.text());
        }
      } catch (err) {
        console.error('Failed to save tape to cloud:', err);
      }
    }
  };

  // Handle unlock - redirect to signup with return URL
  const handleUnlock = () => {
    // Store validation data temporarily
    if (validation && file) {
      sessionStorage.setItem('primebridge_pending_validation', JSON.stringify({
        fileName: file.name,
        validation,
        cleanedData
      }));
    }
    window.location.href = '/signup?redirect=/upload&unlock=true';
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setRawData([]);
    setColumnMapping({});
    setStep('upload');
    setError(null);
    setValidation(null);
    setCleanedData([]);
    setShowSignupPrompt(false);
  };

  // Calculate validation score
  const validationScore = validation ? Math.round((validation.validRows / validation.totalRows) * 100) : 0;
  const scoreColor = validationScore >= 90 ? 'text-green-600' : validationScore >= 70 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = validationScore >= 90 ? 'bg-green-50' : validationScore >= 70 ? 'bg-amber-50' : 'bg-red-50';
  const scoreRingColor = validationScore >= 90 ? 'bg-green-100' : validationScore >= 70 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <div className="bg-white rounded-2xl border border-light overflow-hidden shadow-sm">
      {error && (
        <div className="m-6 mb-0 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-800 text-base">{error}</p>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="p-8 lg:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-darkest" style={{ lineHeight: 1.2 }}>Upload your loan tape</h2>
            <p className="text-dark mt-2 text-lg" style={{ lineHeight: 1.5 }}>
              Drag and drop your CSV or Excel file, or click to browse
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-medium rounded-xl p-12 lg:p-16 text-center hover:border-primary transition-colors cursor-pointer bg-lightest"
            onClick={() => document.getElementById('tape-input')?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && document.getElementById('tape-input')?.click()}
          >
            <input
              id="tape-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload loan tape file"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-darkest text-lg">Drop your file here</p>
                <p className="text-dark mt-1">or click to browse</p>
                <p className="text-sm text-medium mt-4">.CSV or .XLSX files supported</p>
              </div>
            </div>
          </div>

          {/* Sample data - Tertiary action */}
          <p className="text-center mt-6 text-base text-dark">
            Want to try with sample data?{' '}
            <button
              onClick={() => {
                const sampleData = [
                  { loan_id: '', principal: 50000, rate: 12.5, fico: 720, state: 'TX', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L002', principal: 75000, rate: 150, fico: 680, state: 'CA', origination_date: '01/15/2024', status: 'current' },
                  { loan_id: 'L003', principal: 100000, rate: 8.5, fico: '', state: 'NY', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L004', principal: 25000, rate: 10, fico: 250, state: 'FL', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L005', principal: 60000, rate: 9.5, fico: 710, state: 'XX', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L002', principal: 60000, rate: 11, fico: 700, state: 'TX', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L007', principal: 50000, rate: 8, fico: 690, state: 'IL', origination_date: 'Jan 15 2024', status: 'current' },
                  { loan_id: 'L008', principal: -5000, rate: 7.5, fico: 720, state: 'OH', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L009', principal: 45000, rate: 9.0, fico: 705, state: 'WA', origination_date: '2024-01-15', status: 'current' },
                  { loan_id: 'L010', principal: 80000, rate: 11.5, fico: 650, state: 'AZ', origination_date: '2024-01-15', status: 'current' },
                ];
                const csv = Papa.unparse(sampleData);
                const blob = new Blob([csv], { type: 'text/csv' });
                const sampleFile = new File([blob], 'sample_loan_tape.csv', { type: 'text/csv' });
                setFile(sampleFile);
                parseFile(sampleFile);
              }}
              className="text-primary hover:text-primary-hover underline underline-offset-2 font-medium"
            >
              Use sample data
            </button>
          </p>
        </div>
      )}

      {/* Step 2: Validating */}
      {step === 'validating' && (
        <div className="p-16 text-center">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-darkest">Validating your tape...</p>
              <p className="text-dark mt-2 text-lg">Checking for errors and inconsistencies</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Preview (Gated - Not Logged In) */}
      {step === 'preview' && validation && (
        <div>
          {/* Score Header */}
          <div className={`p-8 ${scoreBg}`}>
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-2xl ${scoreRingColor} flex items-center justify-center`}>
                <span className={`text-3xl font-bold ${scoreColor}`}>{validationScore}%</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-darkest" style={{ lineHeight: 1.2 }}>Validation complete</h2>
                <p className="text-dark text-lg mt-1">
                  {validation.validRows.toLocaleString()} of {validation.totalRows.toLocaleString()} rows passed validation
                </p>
              </div>
              <button onClick={handleReset} className="p-2 text-dark hover:text-darkest rounded-lg hover:bg-white/50 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Start over">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-light">
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-darkest">{validation.totalRows.toLocaleString()}</p>
              <p className="text-base text-dark mt-1">Total rows</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-green-600">{validation.validRows.toLocaleString()}</p>
              <p className="text-base text-dark mt-1">Valid rows</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-red-600">{validation.errors}</p>
              <p className="text-base text-dark mt-1">Errors</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-amber-600">{validation.warnings}</p>
              <p className="text-base text-dark mt-1">Warnings</p>
            </div>
          </div>

          {/* Column Mapping Preview */}
          <div className="p-6 border-t border-light">
            <h3 className="font-bold text-darkest text-lg mb-4">Columns detected</h3>
            <div className="flex flex-wrap gap-2">
              {validation.columnStats.map(col => (
                <span key={col.field} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium ${col.mapped ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {col.mapped ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  )}
                  {col.field.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Blurred Issues Preview */}
          <div className="p-6 border-t border-light relative">
            <h3 className="font-bold text-darkest text-lg mb-4">
              Issues found ({validation.issues.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-hidden relative">
              {validation.issues.slice(0, 5).map((issue, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${issue.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${issue.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'}`}>
                    {issue.severity === 'error' ? (
                      <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-darkest">Row {issue.row}</span>
                      <span className="text-dark">•</span>
                      <span className="text-base font-medium text-dark">{issue.field}</span>
                    </div>
                    <p className="text-base text-dark mt-0.5">{issue.message}</p>
                  </div>
                </div>
              ))}
              {/* Blur overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none" style={{ top: '50%' }} />
            </div>
          </div>

          {/* Signup CTA - Primary Action */}
          <div className="p-8 border-t border-light bg-lightest">
            <div className="max-w-lg mx-auto text-center">
              <h3 className="text-xl font-bold text-darkest mb-2" style={{ lineHeight: 1.25 }}>
                Create a free account to unlock
              </h3>
              <ul className="text-left inline-block mb-6 space-y-2">
                <li className="flex items-center gap-3 text-dark text-base">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  View all {validation.issues.length} issues with details
                </li>
                <li className="flex items-center gap-3 text-dark text-base">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Download clean, investor-ready CSV
                </li>
                <li className="flex items-center gap-3 text-dark text-base">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Save validation history
                </li>
              </ul>
              <button
                onClick={handleUnlock}
                className="inline-flex items-center justify-center bg-primary text-white hover:bg-primary-hover min-h-[52px] px-8 rounded-lg font-semibold text-lg transition-colors w-full sm:w-auto"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                Create free account
              </button>
              <p className="text-sm text-medium mt-4">
                Already have an account?{' '}
                <a href="/login?redirect=/upload" className="text-primary underline underline-offset-2">Log in</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Full Results (Logged In) */}
      {step === 'results' && validation && (
        <div>
          {/* Score Header */}
          <div className={`p-8 ${scoreBg}`}>
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-2xl ${scoreRingColor} flex items-center justify-center`}>
                <span className={`text-3xl font-bold ${scoreColor}`}>{validationScore}%</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-darkest" style={{ lineHeight: 1.2 }}>Validation complete</h2>
                <p className="text-dark text-lg mt-1">
                  {validation.validRows.toLocaleString()} of {validation.totalRows.toLocaleString()} rows passed validation
                </p>
              </div>
              <button onClick={handleReset} className="p-2 text-dark hover:text-darkest rounded-lg hover:bg-white/50 transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Start over">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-light">
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-darkest">{validation.totalRows.toLocaleString()}</p>
              <p className="text-base text-dark mt-1">Total rows</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-green-600">{validation.validRows.toLocaleString()}</p>
              <p className="text-base text-dark mt-1">Valid rows</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-red-600">{validation.errors}</p>
              <p className="text-base text-dark mt-1">Errors</p>
            </div>
            <div className="bg-white p-6 text-center">
              <p className="text-3xl font-bold text-amber-600">{validation.warnings}</p>
              <p className="text-base text-dark mt-1">Warnings</p>
            </div>
          </div>

          {/* Column Mapping */}
          <div className="p-6 border-t border-light">
            <h3 className="font-bold text-darkest text-lg mb-4">Columns detected</h3>
            <div className="flex flex-wrap gap-2">
              {validation.columnStats.map(col => (
                <span key={col.field} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium ${col.mapped ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {col.mapped ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  )}
                  {col.field.replace(/_/g, ' ')}
                  {col.mapped && col.mappedTo && <span className="text-green-600 text-sm">→ {col.mappedTo}</span>}
                </span>
              ))}
            </div>
          </div>

          {/* Full Issues List */}
          {validation.issues.length > 0 && (
            <div className="p-6 border-t border-light">
              <h3 className="font-bold text-darkest text-lg mb-4">
                Issues found ({validation.issues.length})
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {validation.issues.slice(0, 100).map((issue, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${issue.severity === 'error' ? 'bg-red-50' : 'bg-amber-50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${issue.severity === 'error' ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {issue.severity === 'error' ? (
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-darkest">Row {issue.row}</span>
                        <span className="text-dark">•</span>
                        <span className="text-base font-medium text-dark">{issue.field}</span>
                      </div>
                      <p className="text-base text-dark mt-0.5">{issue.message}</p>
                    </div>
                  </div>
                ))}
                {validation.issues.length > 100 && (
                  <p className="text-base text-medium text-center py-3">
                    + {validation.issues.length - 100} more issues in full report
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions - Primary button first (left aligned) */}
          <div className="p-6 border-t border-light bg-lightest">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={exportCleanCSV}
                className="inline-flex items-center justify-center bg-primary text-white hover:bg-primary-hover min-h-[52px] px-6 rounded-lg font-semibold text-lg transition-colors flex-1"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download clean tape
              </button>
              <button
                onClick={exportReport}
                className="inline-flex items-center justify-center border-2 border-primary text-primary hover:bg-primary/5 min-h-[52px] px-6 rounded-lg font-semibold text-lg transition-colors flex-1"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download report
              </button>
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-base text-dark">
                <strong className="text-darkest">Need covenant monitoring?</strong>{' '}
                Track DSCR, delinquency, and more.{' '}
                <a href="/covenants" className="text-primary underline underline-offset-2 font-medium">Preview covenants</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
