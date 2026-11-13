import { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Plus,
  X,
  Eye,
} from 'lucide-react';
import {
  customerPortalApi,
  type CustomerDocumentItem,
  type DocumentChecklistItem,
} from '../api/customerPortalApi';
import { CustomSelect } from '../../../components/common/CustomSelect';
import './CustomerPortal.css';
import { useTranslation } from 'react-i18next';

export function CustomerDocumentsPage() {
  const { t, i18n } = useTranslation();
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(value));
  const [documents, setDocuments] = useState<CustomerDocumentItem[]>([]);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [docType, setDocType] = useState('DRIVER_LICENSE_FRONT');
  const [title, setTitle] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const res = await customerPortalApi.listDocuments();
      if (res.success) {
        setDocuments(res.documents);
        setChecklist(res.checklist);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileBase64) {
      setUploadError('Please select a document image or PDF file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      await customerPortalApi.uploadDocument({
        documentType: docType,
        title: title || t(`portalPages.documents.types.${docType}`),
        documentNumber: docNumber || undefined,
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        fileName: selectedFile?.name || 'document.png',
        fileSize: selectedFile?.size || 0,
        fileBase64: fileBase64 || undefined,
      });

      setIsUploadOpen(false);
      setSelectedFile(null);
      setFileBase64(null);
      setTitle('');
      setDocNumber('');
      setExpiryDate('');
      fetchDocuments();
    } catch (err: any) {
      setUploadError(err?.message || t('portalPages.documents.errUpload'));
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="cp-badge cp-badge-success">{t('portalPages.documents.status.VERIFIED')}</span>;
      case 'PENDING_VERIFICATION':
        return <span className="cp-badge cp-badge-warning">{t('portalPages.documents.status.PENDING_VERIFICATION')}</span>;
      case 'REJECTED':
        return <span className="cp-badge cp-badge-danger">{t('portalPages.documents.status.REJECTED')}</span>;
      default:
        return <span className="cp-badge cp-badge-primary">{t('portalPages.documents.status.MISSING')}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="cp-page-container">
        <div className="cp-card cp-skeleton" style={{ height: '400px' }} />
      </div>
    );
  }

  return (
    <div className="cp-page-container">
      {/* Header */}
      <div className="cp-page-header">
        <div>
          <h1 className="cp-page-title">{t('portalPages.documents.title')}</h1>
          <p className="cp-page-subtitle">{t('portalPages.documents.subtitle')}</p>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Upload size={16} />
            {t('portalPages.documents.upload')}
          </button>
        </div>
      </div>

      {/* Verification Checklist Banner */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.documents.checklistTitle')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {checklist.map((item, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--cp-border)',
                borderRadius: '12px',
                padding: '16px',
                background: item.isUploaded ? '#FFFFFF' : '#FBF9FC',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)', fontSize: '0.95rem' }}>{t(`portalPages.documents.checklist.${item.type}`, { defaultValue: item.label })}</span>
                {getStatusBadge(item.status)}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: 0 }}>
                {item.isUploaded
                  ? t('portalPages.documents.uploadedFile', { file: item.document?.fileName || t('portalPages.documents.attached') })
                  : t('portalPages.documents.requiredBeforePickup')}
              </p>
              {!item.isUploaded && (
                <button
                  className="cp-btn-outline"
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '0.78rem', marginTop: '4px' }}
                  onClick={() => {
                    setDocType(item.type);
                    setTitle(t(`portalPages.documents.checklist.${item.type}`, { defaultValue: item.label }));
                    setIsUploadOpen(true);
                  }}
                >
                  <Plus size={12} />
                  {t('portalPages.documents.uploadNow')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded Documents Archive */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>{t('portalPages.documents.uploadedTitle')}</h2>
        {documents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: '1px solid var(--cp-border)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '8px',
                      background: 'rgba(30, 5, 40, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={22} color="var(--cp-primary)" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--cp-primary)' }}>{doc.title}</span>
                      {getStatusBadge(doc.verificationStatus)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', marginTop: '2px' }}>
                      {t(`portalPages.documents.types.${doc.documentType}`, { defaultValue: doc.documentType.replace(/_/g, ' ') })}
                      {' • '}
                      {t('portalPages.documents.uploadedOn', { date: formatDate(doc.createdAt) })}
                      {doc.expiresAt && ` • ${t('portalPages.documents.expiresOn', { date: formatDate(doc.expiresAt) })}`}
                    </div>
                    {doc.rejectionReason && (
                      <div style={{ color: 'var(--cp-danger)', fontSize: '0.8rem', marginTop: '4px' }}>
                        {t('portalPages.documents.rejectionReason', { reason: doc.rejectionReason })}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-btn-outline"
                      style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    >
                      <Eye size={14} />
                      {t('portalPages.documents.viewFile')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>{t('portalPages.documents.empty')}</p>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="cp-card-title">{t('portalPages.documents.modalTitle')}</h2>
              <button
                onClick={() => setIsUploadOpen(false)}
                aria-label={t('portalPages.documents.close')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div
                style={{
                  background: 'var(--cp-danger-bg)',
                  color: 'var(--cp-danger)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.documents.category')}</label>
                <CustomSelect
                  value={docType}
                  onChange={(val) => setDocType(String(val))}
                  options={[
                    // Must match the document types the server accepts
                    ...(['DRIVER_LICENSE_FRONT', 'DRIVER_LICENSE_BACK', 'NATIONAL_ID', 'PASSPORT', 'UTILITY_BILL'] as const).map(
                      (type) => ({ value: type, label: t(`portalPages.documents.types.${type}`) })
                    ),
                  ]}
                  size="md"
                />
              </div>

              <div className="cp-form-group">
                <label className="cp-label">{t('portalPages.documents.label')}</label>
                <input
                  type="text"
                  className="cp-input"
                  placeholder={t('portalPages.documents.labelPlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '12px' }}>
                <div className="cp-form-group">
                  <label className="cp-label">{t('portalPages.documents.number')}</label>
                  <input
                    type="text"
                    className="cp-input"
                    placeholder={t('portalPages.documents.numberPlaceholder')}
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                  />
                </div>
                <div className="cp-form-group">
                  <label className="cp-label">{t('portalPages.documents.expiry')}</label>
                  <input
                    type="date"
                    className="cp-input"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="cp-form-group" style={{ marginTop: '12px' }}>
                <label className="cp-label">{t('portalPages.documents.file')}</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="cp-btn-outline"
                  onClick={() => setIsUploadOpen(false)}
                >
                  {t('portalPages.documents.cancel')}
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isUploading}>
                  {isUploading ? t('portalPages.documents.uploading') : t('portalPages.documents.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
