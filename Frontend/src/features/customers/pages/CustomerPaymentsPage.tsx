import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { CustomSelect } from '../../../components/common/CustomSelect';
import { StripePaymentForm } from '../../payments/components/StripePaymentForm';
import { formatMoney } from '../../../utils/carImageHelper';
import './CustomerPortal.css';

export function CustomerPaymentsPage() {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string | Date) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const [data, setData] = useState<CustomerPaymentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pay modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  // Amount locked in when the customer continues to the Stripe card form
  const [stripeAmount, setStripeAmount] = useState<number | null>(null);
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
        } else {
          setSelectedBookingId('');
          setPayAmount(0);
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

  const selectedInvoiceForPay = data?.invoices.find((i) => i.bookingId === selectedBookingId);
  const maxPayable = selectedInvoiceForPay?.balanceDue ?? 0;

  const closePayModal = () => {
    setIsPayModalOpen(false);
    setStripeAmount(null);
    setPaySuccessMessage(null);
  };

  const handlePaymentSuccess = () => {
    setPaySuccessMessage(t('portalPages.payments.paySuccess'));
    setTimeout(() => {
      closePayModal();
      fetchPayments();
    }, 1500);
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
    currency: '',
  };

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.payments.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.payments.subtitle')}</p>
        </div>
        {summary.totalOutstanding > 0 && (
          <div className="cp-header-actions">
            <button className="cp-btn-primary" onClick={() => setIsPayModalOpen(true)}>
              <CreditCard size={16} />
              {t('portalPages.payments.payOutstanding', { amount: formatMoney(summary.totalOutstanding, summary.currency, 2) })}
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <CheckCircle2 size={18} color="#10B981" />
            {t('portalPages.payments.totalPaid')}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {formatMoney(summary.totalPaid, summary.currency, 2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            {t('portalPages.payments.totalPaidNote')}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <AlertCircle size={18} color={summary.totalOutstanding > 0 ? '#EF4444' : '#10B981'} />
            {t('portalPages.payments.outstanding')}
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: summary.totalOutstanding > 0 ? 'var(--cp-danger)' : 'var(--cp-primary)',
            }}
          >
            {formatMoney(summary.totalOutstanding, summary.currency, 2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            {summary.totalOutstanding > 0 ? t('portalPages.payments.pendingSettlement') : t('portalPages.payments.allSettled')}
          </div>
        </div>

        <div className="cp-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--cp-text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#FAB826" />
            {t('portalPages.payments.depositsHeld')}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cp-primary)' }}>
            {formatMoney(summary.securityDepositsHeld, summary.currency, 2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cp-text-muted)', marginTop: '4px' }}>
            {t('portalPages.payments.depositsNote')}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.payments.invoicesTitle')}</h2>
        {data?.invoices && data.invoices.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cp-border)', color: 'var(--cp-text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.booking')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.vehicle')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.date')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.rentalTotal')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.deposit')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.balanceDue')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.statusLabel')}</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>{t('portalPages.payments.action')}</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid rgba(30, 5, 40, 0.04)' }}>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--cp-primary)' }}>
                      #{inv.bookingNumber}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-primary)' }}>{inv.vehicleName}</td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-text-muted)' }}>{formatDate(inv.date)}</td>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: 'var(--cp-primary)' }}>
                      {formatMoney(inv.totalAmount, inv.currency || summary.currency, 2)}
                    </td>
                    <td style={{ padding: '14px 8px', color: 'var(--cp-text-muted)' }}>
                      {formatMoney(inv.depositAmount || 0, inv.currency || summary.currency, 2)}
                    </td>
                    <td
                      style={{
                        padding: '14px 8px',
                        fontWeight: 700,
                        color: inv.balanceDue > 0 ? 'var(--cp-danger)' : '#10B981',
                      }}
                    >
                      {formatMoney(inv.balanceDue, inv.currency || summary.currency, 2)}
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
                        {t(`portalPages.payments.status.${inv.status}`, { defaultValue: inv.status })}
                      </span>
                    </td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                      <button
                        className="cp-btn-outline"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <Receipt size={14} />
                        {t('portalPages.payments.view')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('portalPages.payments.noInvoices')}</p>
        )}
      </div>

      {/* Transactions History */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.payments.transactionsTitle')}</h2>
        {data?.transactions && data.transactions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--cp-border)', color: 'var(--cp-text-muted)' }}>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.transactionId')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.booking')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.provider')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.date')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.amount')}</th>
                  <th style={{ padding: '12px 8px' }}>{t('portalPages.payments.statusLabel')}</th>
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
                      {formatDate(tx.createdAt)}
                    </td>
                    <td style={{ padding: '14px 8px', fontWeight: 700, color: '#10B981' }}>
                      +{formatMoney(tx.amount, tx.currency, 2)}
                    </td>
                    <td style={{ padding: '14px 8px' }}>
                      <span className={`cp-badge ${tx.status === 'SUCCEEDED' ? 'cp-badge-success' : tx.status === 'REFUNDED' ? 'cp-badge-warning' : 'cp-badge-danger'}`}>
                        {t(`portalPages.payments.status.${tx.status}`, { defaultValue: tx.status })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('portalPages.payments.noTransactions')}</p>
        )}
      </div>

      {/* Pay Balance Modal */}
      {isPayModalOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.payments.settleTitle')}</h2>

            {paySuccessMessage ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cp-primary)', margin: 0 }}>
                  {paySuccessMessage}
                </h3>
              </div>
            ) : (
              <>
                {stripeAmount === null ? (
                  <>
                    <div className="cp-form-group">
                      <label className="cp-label">{t('portalPages.payments.selectBooking')}</label>
                      <CustomSelect
                        value={selectedBookingId}
                        onChange={(val) => {
                          const bookingId = String(val);
                          setSelectedBookingId(bookingId);
                          const inv = data?.invoices.find((i) => i.bookingId === bookingId);
                          setPayAmount(inv ? inv.balanceDue : 0);
                        }}
                        options={(data?.invoices || [])
                          .filter((inv) => inv.balanceDue > 0)
                          .map((inv) => ({
                            value: inv.bookingId,
                            label: t('portalPages.payments.bookingOption', { number: inv.bookingNumber, vehicle: inv.vehicleName }),
                            sublabel: t('portalPages.payments.balanceOption', { amount: formatMoney(inv.balanceDue, inv.currency, 2) }),
                            badge: t(`portalPages.payments.status.${inv.status}`, { defaultValue: inv.status }),
                          }))}
                        placeholder={t('portalPages.payments.selectBookingPlaceholder')}
                        size="md"
                      />
                    </div>

                    <div className="cp-form-group">
                      <label className="cp-label">
                        {t('portalPages.payments.amountToPay')}
                        {selectedInvoiceForPay?.currency ? ` (${selectedInvoiceForPay.currency})` : ''}
                      </label>
                      <input
                        type="number"
                        className="cp-input"
                        value={payAmount}
                        onChange={(e) => setPayAmount(Number(e.target.value))}
                        min={1}
                        max={maxPayable}
                        step="0.01"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                      <button className="cp-btn-outline" onClick={closePayModal}>
                        {t('portalPages.payments.cancel')}
                      </button>
                      <button
                        className="cp-btn-primary"
                        disabled={!selectedBookingId || payAmount <= 0 || payAmount > maxPayable}
                        onClick={() => setStripeAmount(Math.round(payAmount * 100) / 100)}
                      >
                        {t('portalPages.payments.continueToCard')}
                      </button>
                    </div>
                  </>
                ) : (
                  <StripePaymentForm
                    bookingId={selectedBookingId}
                    amount={stripeAmount}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setStripeAmount(null)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box printable-document" style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="cp-badge cp-badge-accent">{t('portalPages.payments.taxInvoice')}</span>
                <h2 className="cp-card-title" style={{ marginTop: '6px' }}>
                  {t('portalPages.payments.invoiceNumber', { number: selectedInvoice.bookingNumber })}
                </h2>
              </div>
              <button
                className="no-print"
                onClick={() => setSelectedInvoice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8F6F9', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.vehicleColon')}</span>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{selectedInvoice.vehicleName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.issuedDate')}</span>
                <span style={{ fontWeight: 600, color: 'var(--cp-primary)' }}>{formatDate(selectedInvoice.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.paymentStatus')}</span>
                <span className={`cp-badge ${selectedInvoice.status === 'PAID' ? 'cp-badge-success' : 'cp-badge-danger'}`}>
                  {t(`portalPages.payments.status.${selectedInvoice.status}`, { defaultValue: selectedInvoice.status })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.subtotal')}</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(selectedInvoice.subtotal, selectedInvoice.currency || summary.currency, 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.tax')}</span>
                <span style={{ fontWeight: 600 }}>{formatMoney(selectedInvoice.taxAmount, selectedInvoice.currency || summary.currency, 2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--cp-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 800 }}>{t('portalPages.payments.total')}</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--cp-primary)' }}>
                  {formatMoney(selectedInvoice.totalAmount, selectedInvoice.currency || summary.currency, 2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.refundableDeposit')}</span>
                <span style={{ fontWeight: 600 }}>
                  +{formatMoney(selectedInvoice.depositAmount || 0, selectedInvoice.currency || summary.currency, 2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.amountPaid')}</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>-{formatMoney(selectedInvoice.paidAmount, selectedInvoice.currency || summary.currency, 2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--cp-text-muted)' }}>{t('portalPages.payments.balanceRemaining')}</span>
                <span style={{ fontWeight: 800, color: selectedInvoice.balanceDue > 0 ? 'var(--cp-danger)' : '#10B981' }}>
                  {formatMoney(selectedInvoice.balanceDue, selectedInvoice.currency || summary.currency, 2)}
                </span>
              </div>
            </div>

            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => window.print()} className="cp-btn-secondary">
                <Printer size={16} />
                {t('portalPages.payments.printInvoice')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
