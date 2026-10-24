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
import './CustomerPortal.css';

export function CustomerDocumentsPage() {
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
        title: title || `${docType.replace(/_/g, ' ')} Upload`,
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
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="cp-badge cp-badge-success">Verified</span>;
      case 'PENDING_VERIFICATION':
        return <span className="cp-badge cp-badge-warning">Pending Review</span>;
      case 'REJECTED':
        return <span className="cp-badge cp-badge-danger">Rejected</span>;
      default:
        return <span className="cp-badge cp-badge-primary">Missing</span>;
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
          <h1 className="cp-page-title">Driver Documents & Verification</h1>
          <p className="cp-page-subtitle">Upload required identity and license documents for fast-lane contactless pickup.</p>
        </div>
        <div className="cp-header-actions">
          <button className="cp-btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Upload size={16} />
            Upload Document
          </button>
        </div>
      </div>

      {/* Verification Checklist Banner */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Mandatory Verification Checklist</h2>
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
                <span style={{ fontWeight: 700, color: 'var(--cp-primary)', fontSize: '0.95rem' }}>{item.label}</span>
                {getStatusBadge(item.status)}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--cp-text-muted)', margin: 0 }}>
                {item.isUploaded
                  ? `Uploaded • ${item.document?.fileName || 'Attached'}`
                  : 'Required prior to vehicle key handover'}
              </p>
              {!item.isUploaded && (
                <button
                  className="cp-btn-outline"
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '0.78rem', marginTop: '4px' }}
                  onClick={() => {
                    setDocType(item.type);
                    setTitle(item.label);
                    setIsUploadOpen(true);
                  }}
                >
                  <Plus size={12} />
                  Upload Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded Documents Archive */}
      <div className="cp-card">
        <h2 className="cp-card-title" style={{ marginBottom: '16px' }}>Uploaded Driver Documents</h2>
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
                      Type: {doc.documentType.replace(/_/g, ' ')} • Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.expiresAt && ` • Expiry: ${new Date(doc.expiresAt).toLocaleDateString()}`}
                    </div>
                    {doc.rejectionReason && (
                      <div style={{ color: 'var(--cp-danger)', fontSize: '0.8rem', marginTop: '4px' }}>
                        Reason for rejection: {doc.rejectionReason}
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
                      View File
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--cp-text-muted)', fontSize: '0.9rem', margin: 0 }}>No documents uploaded yet.</p>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="cp-modal-backdrop">
          <div className="cp-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="cp-card-title">Upload Verification Document</h2>
              <button
                onClick={() => setIsUploadOpen(false)}
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
                <label className="cp-label">Document Category</label>
                <select className="cp-select" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="DRIVER_LICENSE_FRONT">Driver's License (Front Side)</option>
                  <option value="DRIVER_LICENSE_BACK">Driver's License (Back Side)</option>
                  <option value="PASSPORT">Passport / National ID</option>
                  <option value="PROOF_OF_ADDRESS">Proof of Address (Utility Bill)</option>
                </select>
              </div>

              <div className="cp-form-group">
                <label className="cp-label">Document Label / Title</label>
                <input
                  type="text"
                  className="cp-input"
                  placeholder="e.g. My Driving License (Front)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="cp-form-group">
                  <label className="cp-label">Document / License #</label>
                  <input
                    type="text"
                    className="cp-input"
                    placeholder="e.g. DL-29481"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                  />
                </div>
                <div className="cp-form-group">
                  <label className="cp-label">Expiration Date</label>
                  <input
                    type="date"
                    className="cp-input"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="cp-form-group" style={{ marginTop: '12px' }}>
                <label className="cp-label">Select File (JPG, PNG, PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="cp-btn-outline"
                  onClick={() => setIsUploadOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="cp-btn-primary" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Submit Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
