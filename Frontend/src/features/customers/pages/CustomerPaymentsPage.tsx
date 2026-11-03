import { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  X,
} from 'lucide-react';
import { customerPortalApi, type CustomerPaymentSummary } from '../api/customerPortalApi';
import './CustomerPortal.css';

export function CustomerPaymentsPage() {
  const [data, setData] = useState<CustomerPaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pay modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccessMessage, setPaySuccessMessage] = useState<string | null>(null);

  // Invoice view modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.getPaymentsSummary();
      if (res.success) {
        setData(res);
        const unpaid = res.invoices.find((i) => i.balanceDue > 0);
        if (unpaid) {
          setSelectedBookingId(unpaid.bookingId);
          setPayAmount(unpaid.balanceDue);
        } else if (res.invoices.length > 0) {
          setSelectedBookingId(res.invoices[0].bookingId);
          setPayAmount(100);
        }
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleProcessPayment = async () => {
    if (!selectedBookingId || payAmount <= 0) return;
    try {
      setIsPaying(true);
      await customerPortalApi.processPayment({
        bookingId: selectedBookingId,
        amount: payAmount,
        paymentMethod: 'CREDIT_CARD',
        cardNumberLast4: '4242',
        cardBrand: 'Visa',
      });
      setPaySuccessMessage('Payment processed successfully!');
      setTimeout(() => {
        setIsPayModalOpen(false);
        setPaySuccessMessage(null);
        fetchPayments();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  const summary = data?.summary || {
    totalPaid: 0,
    totalOutstanding: 0,
    securityDepositsHeld: 0,
    currency: 'USD',
  };

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">Payments, Invoices & Deposits</h1>
          <p className="cp-page-subtitle">Track your transaction history, view invoices, and settle balances.</p>
        </div>
        {summary.totalOutstanding > 0 && (
          <div className="cp-header-actions">
            <button className="cp-btn-primary" onClick={() => setIsPayModalOpen(true)}>
              <CreditCard size={16} />
              Pay Outstanding (${summary.totalOutstanding.toFixed(2)})
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            Total Settled & Paid
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            ${summary.totalPaid.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            Across all completed & active rentals
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <AlertCircle size={18} color={summary.totalOutstanding > 0 ? '#EF4444' : '#10B981'} />
            Outstanding Balance Due
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: summary.totalOutstanding > 0 ? 'var(--cp-danger)' : 'var(--cp-primary)',
            }}
          >
            ${summary.totalOutstanding.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            {summary.totalOutstanding > 0 ? 'Pending payment settlement' : 'All accounts settled'}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#FAB826" />
            Security Deposits Held
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            ${summary.securityDepositsHeld.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            Refunded automatically upon trip completion
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Rental Invoices & Billing Statements</h2>
        {data?.invoices && data.invoices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cp-border)', color: 'var(--cp-text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Booking</th>
                  <th style={{ padding: '12px 8px' }}>Vehicle</th>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Total Amount</th>
                  <th style={{ padding: '12px 8px' }}>Balance Due</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(30, 5, 40, 0.04)' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--cp-primary)' }}>
                      #{inv.bookingNumber}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-primary)' }}>{inv.vehicleName}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-text-muted)' }}>{inv.date}</td>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--cp-primary)' }}>
                      ${inv.totalAmount.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '14px 8px',
                        fontWeight: 700,
                        color: inv.balanceDue > 0 ? 'var(--cp-danger)' : '#10B981',
                      }}
                    >
                      ${inv.balanceDue.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span
                        className={`cp-badge ${
                          inv.status === 'PAID'
                            ? 'cp-badge-success'
                            : inv.status === 'PARTIAL'
                            ? 'cp-badge-warning'
                            : 'cp-badge-danger'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button
                        className="cp-btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <Receipt size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>No invoices generated yet.</p>
        )}
      </div>

      {/* Transactions History */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Payment Transactions Log</h2>
        {data?.transactions && data.transactions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cp-border)', color: 'var(--cp-text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>Transaction ID</th>
                  <th style={{ padding: '12px 8px' }}>Booking</th>
                  <th style={{ padding: '12px 8px' }}>Provider</th>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Amount</th>
                  <th style={{ padding: '12px 8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid rgba(30, 5, 40, 0.04)' }}>
                    <td style={{ padding: '14px 8px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {tx.id.slice(0, 12)}...
                    </td>
                    <td style={{ padding: '14px 8px', fontWeight: 600, color: 'var(--cp-primary)' }}>
                      #{tx.bookingNumber}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-text-muted)' }}>{tx.provider}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-text-muted)' }}>
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: '#10B981' }}>
                      +${tx.amount.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className="cp-badge cp-badge-success">{tx.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>No transactions recorded yet.</p>
        )}
      </div>

      {/* Pay Balance Modal */}
      {isPayModalOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Settle Rental Payment</h2>

            {paySuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cp-primary)', margin: 0 }}>
                  {paySuccessMessage}
                </h3>
              </div>
            ) : (
              <>
                <div className="cp-form-group">
                  <label className="cp-label">Select Booking</label>
                  <select
                    className="cp-select"
                    value={selectedBookingId}
                    onChange={(e) => {
                      setSelectedBookingId(e.target.value);
                      const inv = data?.invoices.find((i) => i.bookingId === e.target.value);
                      if (inv) setPayAmount(inv.balanceDue > 0 ? inv.balanceDue : inv.totalAmount);
                    }}
                  >
                    {data?.invoices.map((inv) => (
                      <option key={inv.bookingId} value={inv.bookingId}>
                        Booking #{inv.bookingNumber} - {inv.vehicleName} (Balance: ${inv.balanceDue.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Amount to Pay ($ USD)</label>
                  <input
                    type="number"
                    className="cp-input"
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    min={1}
                  />
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Credit Card Number</label>
                  <input
                    type="text"
                    className="cp-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="cp-form-group">
                    <label className="cp-label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      className="cp-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div className="cp-form-group">
                    <label className="cp-label">CVC</label>
                    <input
                      type="text"
                      className="cp-input"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                  <button className="cp-btn-outline" onClick={() => setIsPayModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="cp-btn-primary"
                    disabled={isPaying || payAmount <= 0}
                    onClick={handleProcessPayment}
                  >
                    {isPaying ? 'Processing...' : `Pay $${payAmount.toFixed(2)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="cp-badge cp-badge-accent">Finovo Tax Invoice</span>
                <h2 className="cp-card-title" style={{ marginTop: '6px' }}>Invoice #{selectedInvoice.bookingNumber}</h2>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8F6F9', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Vehicle:</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{selectedInvoice.vehicleName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Issued Date:</span>
                <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{selectedInvoice.date}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Payment Status:</span>
                <span className={`cp-badge ${selectedInvoice.status === 'PAID' ? 'cp-badge-success' : 'cp-badge-danger'}`}>
                  {selectedInvoice.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>VAT (10%):</span>
                <span style={{ fontWeight: 600 }}>${selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>Total:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--cp-primary)' }}>
                  ${selectedInvoice.totalAmount.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Amount Paid:</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>-${selectedInvoice.paidAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>Balance Remaining:</span>
                <span style={{ fontWeight: 800, color: selectedInvoice.balanceDue > 0 ? 'var(--cp-danger)' : '#10B981' }}>
                  ${selectedInvoice.balanceDue.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => window.print()} className="cp-btn-secondary">
                <Printer size={16} />
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
