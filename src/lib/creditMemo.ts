import PDFDocument from 'pdfkit';
import type { Deal, LoanPool, Lender } from '../types/database';

interface CreditMemoData {
  deal: Deal;
  loanPool: LoanPool;
  lender: Lender;
  loanStats?: {
    ficoDistribution: Record<string, number>;
    stateDistribution: Record<string, number>;
    statusDistribution: Record<string, number>;
    avgLoanSize: number;
  };
}

// Generate Credit Memo PDF
export async function generateCreditMemo(data: CreditMemoData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const { deal, loanPool, lender, loanStats } = data;

      // Colors
      const primaryColor = '#1a56db';
      const darkColor = '#1f2937';
      const mediumColor = '#6b7280';

      // Helper functions
      const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

      const formatPercent = (value: number, decimals = 2) =>
        `${(value * 100).toFixed(decimals)}%`;

      const drawLine = (y: number) => {
        doc.strokeColor('#e5e7eb').lineWidth(1);
        doc.moveTo(50, y).lineTo(562, y).stroke();
      };

      const drawSection = (title: string, y: number) => {
        doc.fontSize(14).fillColor(primaryColor).font('Helvetica-Bold').text(title, 50, y);
        return y + 25;
      };

      const drawKeyValue = (key: string, value: string, x: number, y: number, width = 200) => {
        doc.fontSize(9).fillColor(mediumColor).font('Helvetica').text(key, x, y);
        doc.fontSize(11).fillColor(darkColor).font('Helvetica-Bold').text(value, x, y + 12, { width });
        return y + 35;
      };

      // Header
      doc.fontSize(24).fillColor(primaryColor).font('Helvetica-Bold').text('CREDIT MEMO', 50, 50);

      doc.fontSize(10).fillColor(mediumColor).font('Helvetica')
        .text('CONFIDENTIAL - FOR ACCREDITED INVESTORS ONLY', 50, 80);

      doc.fontSize(12).fillColor(darkColor).font('Helvetica-Bold')
        .text(deal.title, 50, 100);

      doc.fontSize(10).fillColor(mediumColor).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 118);

      drawLine(140);

      // Executive Summary
      let y = drawSection('Executive Summary', 155);

      doc.fontSize(10).fillColor(darkColor).font('Helvetica')
        .text(
          `This credit memo presents an investment opportunity in a pool of ${loanPool.loan_type.replace('_', ' ')} loans originated by ${lender.company_name}. ` +
          `The pool consists of ${loanPool.total_loans.toLocaleString()} loans with a total outstanding balance of ${formatCurrency(loanPool.total_outstanding_balance)}.`,
          50, y, { width: 512, lineGap: 4 }
        );

      y += 60;

      // Key Terms Grid
      y = drawSection('Investment Terms', y);

      const col1 = 50, col2 = 200, col3 = 350;

      y = drawKeyValue('Total Offering', formatCurrency(deal.total_amount), col1, y);
      drawKeyValue('Minimum Investment', formatCurrency(deal.minimum_investment), col2, y - 35);
      drawKeyValue('Target Yield', `${deal.target_yield}% APY`, col3, y - 35);

      y = drawKeyValue('Term', `${deal.term_months} months`, col1, y);
      drawKeyValue('Payment Frequency', deal.payment_frequency.charAt(0).toUpperCase() + deal.payment_frequency.slice(1), col2, y - 35);
      drawKeyValue('Risk Tier', deal.risk_tier, col3, y - 35);

      drawLine(y);
      y += 15;

      // Pool Characteristics
      y = drawSection('Pool Characteristics', y);

      y = drawKeyValue('Loan Type', loanPool.loan_type.replace('_', ' ').toUpperCase(), col1, y);
      drawKeyValue('Total Loans', loanPool.total_loans.toLocaleString(), col2, y - 35);
      drawKeyValue('Total Principal', formatCurrency(loanPool.total_principal), col3, y - 35);

      y = drawKeyValue('Weighted Avg APR', `${loanPool.weighted_avg_apr}%`, col1, y);
      drawKeyValue('Weighted Avg Term', `${loanPool.weighted_avg_term_months} months`, col2, y - 35);
      if (loanPool.weighted_avg_fico) {
        drawKeyValue('Weighted Avg FICO', loanPool.weighted_avg_fico.toString(), col3, y - 35);
      }

      if (loanStats) {
        y = drawKeyValue('Average Loan Size', formatCurrency(loanStats.avgLoanSize), col1, y);
      }

      drawLine(y);
      y += 15;

      // Risk Metrics
      y = drawSection('Risk Metrics', y);

      if (loanPool.current_delinquency_rate !== null) {
        y = drawKeyValue('Current Delinquency', formatPercent(loanPool.current_delinquency_rate), col1, y);
      }
      if (loanPool.historical_default_rate !== null) {
        drawKeyValue('Historical Default Rate', formatPercent(loanPool.historical_default_rate), col2, y - 35);
      }
      if (loanPool.historical_loss_rate !== null) {
        drawKeyValue('Historical Loss Rate', formatPercent(loanPool.historical_loss_rate), col3, y - 35);
      }
      if (loanPool.expected_loss !== null) {
        y = drawKeyValue('Expected Loss', formatPercent(loanPool.expected_loss), col1, y);
      }

      drawLine(y);
      y += 15;

      // Originator Information
      y = drawSection('Originator Profile', y);

      y = drawKeyValue('Company', lender.company_name, col1, y);
      if (lender.year_founded) {
        drawKeyValue('Year Founded', lender.year_founded.toString(), col2, y - 35);
      }
      if (lender.headquarters_state) {
        drawKeyValue('Headquarters', lender.headquarters_state, col3, y - 35);
      }

      if (lender.monthly_origination_volume) {
        y = drawKeyValue('Monthly Volume', formatCurrency(lender.monthly_origination_volume), col1, y);
      }
      if (lender.total_loans_originated) {
        drawKeyValue('Total Originated', lender.total_loans_originated.toLocaleString() + ' loans', col2, y - 35);
      }
      if (lender.bank_partner_name) {
        drawKeyValue('Bank Partner', lender.bank_partner_name, col3, y - 35);
      }

      // Geographic Distribution (if available)
      if (loanPool.top_states && Object.keys(loanPool.top_states).length > 0) {
        drawLine(y);
        y += 15;
        y = drawSection('Geographic Distribution', y);

        const states = Object.entries(loanPool.top_states as Record<string, number>)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        let stateX = 50;
        states.forEach(([state, pct]) => {
          drawKeyValue(state, formatPercent(pct), stateX, y);
          stateX += 100;
        });
        y += 35;
      }

      // Page 2 - Disclaimers
      doc.addPage();

      y = drawSection('Important Disclosures', 50);

      const disclaimers = [
        'INVESTMENT RISK: Investment in private credit involves substantial risk, including the possible loss of principal. Past performance is not indicative of future results.',
        'ACCREDITED INVESTORS ONLY: This offering is available only to accredited investors as defined under Regulation D of the Securities Act of 1933.',
        'ILLIQUIDITY: Investments in this offering are illiquid and may not be transferred without prior consent. Investors should be prepared to hold their investment for the full term.',
        'NO GUARANTEE: Neither PrimeBridge Finance nor the originator guarantees any return on investment or the repayment of principal.',
        'DUE DILIGENCE: Investors should conduct their own due diligence and consult with financial, legal, and tax advisors before investing.',
        'CONFIDENTIALITY: This credit memo is confidential and intended solely for the use of prospective investors. Distribution to any other party is prohibited.',
      ];

      doc.fontSize(9).fillColor(darkColor).font('Helvetica');

      disclaimers.forEach((disclaimer, index) => {
        doc.text(`${index + 1}. ${disclaimer}`, 50, y, { width: 512, lineGap: 3 });
        y += 55;
      });

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        // Footer
        doc.fontSize(8).fillColor(mediumColor).font('Helvetica');
        doc.text(
          'PrimeBridge Finance | Institutional-grade private credit, without the Wall Street gatekeepers.',
          50, 730, { width: 512, align: 'center' }
        );
        doc.text(`Page ${i + 1} of ${pages.count}`, 50, 745, { width: 512, align: 'center' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Generate filename for credit memo
export function getCreditMemoFilename(dealTitle: string): string {
  const sanitized = dealTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `credit_memo_${sanitized}_${date}.pdf`;
}
