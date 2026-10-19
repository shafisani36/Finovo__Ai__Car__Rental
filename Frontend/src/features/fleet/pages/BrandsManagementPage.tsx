import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import type { VehicleBrandItem } from '../types/fleet.types';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import {
  Car,
  Search,
  Plus,
  Pencil,
  Trash2,
  Globe,
  Check,
  X,
  Layers,
  ChevronRight,
  LayoutGrid,
  List,
  Building2,
  CheckCircle2,
  UploadCloud,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

function BrandLogoThumbnail({
  url,
  name,
  size = 44,
  fontSize = '0.95rem',
}: {
  url?: string | null;
  name: string;
  size?: number;
  fontSize?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const initials = name.substring(0, 2).toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [url]);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: size > 48 ? '12px' : '10px',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #EFEAEF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px',
        boxSizing: 'border-box',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {url && !hasError ? (
        <img
          src={url}
          alt={name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={() => setHasError(true)}
        />
      ) : (
        <span style={{ fontWeight: 800, color: '#1E0432', fontSize }}>
          {initials}
        </span>
      )}
    </div>
  );
}

export function BrandsManagementPage() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const [brands, setBrands] = useState<VehicleBrandItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'MODELS_DESC' | 'NEWEST'>('NAME_ASC');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [isLoading, setIsLoading] = useState(true);

  // Brand Form Modal
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandCountry, setBrandCountry] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandIsActive, setBrandIsActive] = useState(true);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // Brand Logo Upload & Management States
  const [logoFileMeta, setLogoFileMeta] = useState<{
    name: string;
    sizeFormatted: string;
    format: string;
    dimensions?: string;
  } | null>(null);
  const [logoValidationError, setLogoValidationError] = useState<string | null>(null);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleLogoFileSelect = (file: File) => {
    setLogoValidationError(null);

    // 1. Strict MIME validation
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
    if (!validMimes.includes(file.type.toLowerCase()) && !isSvg) {
      setLogoValidationError(
        `Unsupported file type "${file.name}". Please upload a PNG, JPG, WEBP, or SVG image.`
      );
      return;
    }

    // 2. Size limit validation (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setLogoValidationError(
        `Logo file "${file.name}" exceeds 5MB limit (${formatFileSize(file.size)}). Please compress or select a smaller image.`
      );
      return;
    }

    const ext = file.name.split('.').pop()?.toUpperCase() || 'IMAGE';
    const reader = new FileReader();
    reader.onerror = () => {
      setLogoValidationError('Unable to read the selected file. Please try again.');
    };
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl === 'string') {
        setBrandLogoUrl(dataUrl);

        // Load image to extract resolution
        const img = new Image();
        img.onload = () => {
          setLogoFileMeta({
            name: file.name,
            sizeFormatted: formatFileSize(file.size),
            format: ext,
            dimensions: `${img.naturalWidth} × ${img.naturalHeight}px`,
          });
        };
        img.onerror = () => {
          setLogoFileMeta({
            name: file.name,
            sizeFormatted: formatFileSize(file.size),
            format: ext,
          });
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDraggingLogo(true);
    } else if (e.type === 'dragleave') {
      setIsDraggingLogo(false);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLogo(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleLogoFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClearLogo = () => {
    setBrandLogoUrl('');
    setLogoFileMeta(null);
    setLogoValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadBrands = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fleetApi.getBrands({
        search: search.trim() || undefined,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });
      if (res?.brands) {
        setBrands(res.brands);
      }
    } catch (err: any) {
      console.error('Failed to load brands:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBrands();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadBrands]);

  // Sorted and filtered list
  const processedBrands = useMemo(() => {
    let result = [...brands];

    if (sortBy === 'NAME_ASC') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'NAME_DESC') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'MODELS_DESC') {
      result.sort((a, b) => (b.models?.length || 0) - (a.models?.length || 0));
    } else if (sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [brands, sortBy]);

  // Statistics
  const totalBrandsCount = brands.length;
  const activeBrandsCount = brands.filter((b) => b.isActive).length;
  const totalModelsCount = brands.reduce((acc, b) => acc + (b.models?.length || 0), 0);
  const uniqueCountriesCount = new Set(brands.map((b) => b.country).filter(Boolean)).size;

  // Open Add Brand Modal
  const handleOpenAddBrand = () => {
    setBrandEditId(null);
    setBrandName('');
    setBrandCountry('');
    setBrandLogoUrl('');
    setLogoFileMeta(null);
    setLogoValidationError(null);
    setBrandIsActive(true);
    setIsBrandModalOpen(true);
  };

  // Open Edit Brand Modal
  const handleOpenEditBrand = (brand: VehicleBrandItem) => {
    setBrandEditId(brand.id);
    setBrandName(brand.name);
    setBrandCountry(brand.country || '');
    setBrandLogoUrl(brand.logoUrl || '');
    setLogoFileMeta(
      brand.logoUrl
        ? {
            name: `${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-logo`,
            sizeFormatted: 'Uploaded',
            format: brand.logoUrl.endsWith('.svg') ? 'SVG' : 'PNG',
          }
        : null
    );
    setLogoValidationError(null);
    setBrandIsActive(brand.isActive ?? true);
    setIsBrandModalOpen(true);
  };

  // Save Brand
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setIsSavingBrand(true);
    try {
      if (brandEditId) {
        await fleetApi.updateBrand(brandEditId, {
          name: brandName.trim(),
          country: brandCountry.trim() || undefined,
          logoUrl: brandLogoUrl.trim() || undefined,
          isActive: brandIsActive,
        });
        showNotification(`Brand "${brandName}" updated successfully`);
      } else {
        await fleetApi.createBrand({
          name: brandName.trim(),
          country: brandCountry.trim() || undefined,
          logoUrl: brandLogoUrl.trim() || undefined,
        });
        showNotification(`Brand "${brandName}" created successfully`);
      }
      setIsBrandModalOpen(false);
      await loadBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to save brand');
    } finally {
      setIsSavingBrand(false);
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (brand: VehicleBrandItem) => {
    const modelCount = brand.models?.length || 0;
    const ok = await confirm({
      title: `Delete Brand: ${brand.name}?`,
      message: `Are you sure you want to delete "${brand.name}"? This action will permanently remove the brand and all ${modelCount} associated model definitions from your fleet catalog.`,
      confirmText: 'Delete Brand',
      cancelText: 'Keep Brand',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await fleetApi.deleteBrand(brand.id);
      showNotification(`Brand "${brand.name}" deleted successfully`);
      await loadBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to delete brand');
    }
  };


  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Check size={18} />
          {notification.message}
        </div>
      )}

      {/* Header & Breadcrumb */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#8A7090', marginBottom: '8px' }}>
          <Link to="/admin/dashboard" style={{ color: '#8A7090', textDecoration: 'none', fontWeight: 500 }}>
            Dashboard
          </Link>
          <ChevronRight size={14} />
          <Link to="/admin/cars" style={{ color: '#8A7090', textDecoration: 'none', fontWeight: 500 }}>
            Fleet
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#1E0432', fontWeight: 700 }}>Brands Directory</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#1E0432', margin: 0, letterSpacing: '-0.02em' }}>
              Vehicle Brands
            </h1>
            <p style={{ margin: '6px 0 0', color: '#6A5672', fontSize: '0.95rem' }}>
              Manage automotive manufacturers, official emblem logos, origins, and connected models.
            </p>
          </div>

          <div className="fleet-header-actions">
            <Link
              to="/admin/models"
              className="fleet-header-action-btn fleet-btn-secondary"
            >
              <Layers size={17} color="#8A7090" />
              <span className="fleet-btn-label">
                <span className="label-full">Manage Models</span>
                <span className="label-short">Models</span>
              </span>
            </Link>

            <Link
              to="/admin/cars/new"
              className="fleet-header-action-btn fleet-btn-neutral"
            >
              <Car size={17} />
              <span className="fleet-btn-label">
                <span className="label-full">Add Vehicle</span>
                <span className="label-short">Vehicle</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={handleOpenAddBrand}
              className="fleet-header-action-btn fleet-btn-gold"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="fleet-btn-label">
                <span className="label-full">Add Brand</span>
                <span className="label-short">Brand</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1.5px solid #EFEAEF',
            boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#8A7090', letterSpacing: '0.04em' }}>
              Total Brands
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {totalBrandsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Manufacturers configured</div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(30, 4, 50, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1E0432',
            }}
          >
            <Building2 size={24} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1.5px solid #EFEAEF',
            boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#10B981', letterSpacing: '0.04em' }}>
              Active Brands
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {activeBrandsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Visible in client booking</div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1.5px solid #EFEAEF',
            boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#8A7090', letterSpacing: '0.04em' }}>
              Linked Models
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {totalModelsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Variants across all brands</div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(250, 184, 38, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B47800',
            }}
          >
            <Layers size={24} />
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px 24px',
            border: '1.5px solid #EFEAEF',
            boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#8A7090', letterSpacing: '0.04em' }}>
              Global Origins
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {uniqueCountriesCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Countries represented</div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
            }}
          >
            <Globe size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Controls Bar */}
      <div className="fleet-filter-bar">
        {/* Search Input */}
        <div className="fleet-filter-search-box">
          <Search size={18} color="#8A7090" className="fleet-filter-search-icon" />
          <input
            type="text"
            placeholder="Search brands by name, country, or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fleet-filter-search-input"
          />
        </div>

        {/* Filter Dropdowns and Layout Toggle */}
        <div className="fleet-filter-controls">
          <div className="fleet-filter-grid-brands">
            <div className="fleet-filter-col fleet-col-status">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                size="sm"
                fullWidth={true}
              />
            </div>

            <div className="fleet-filter-col fleet-col-sort">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'NAME_ASC', label: 'Sort: Name (A-Z)' },
                  { value: 'NAME_DESC', label: 'Sort: Name (Z-A)' },
                  { value: 'MODELS_DESC', label: 'Sort: Most Models' },
                  { value: 'NEWEST', label: 'Sort: Recently Added' },
                ]}
                size="sm"
                fullWidth={true}
              />
            </div>
          </div>

          {/* Action Footer / View Switcher */}
          <div className="fleet-filter-actions">
            <span className="fleet-filter-count-badge">
              {processedBrands.length} {processedBrands.length === 1 ? 'brand' : 'brands'}
            </span>
            {!isMobile && (
              <div className="fleet-view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`fleet-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                >
                  <List size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid Card View"
                  className={`fleet-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                >
                  <LayoutGrid size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1.5px solid #EFEAEF',
          }}
        >
          <div style={{ color: '#8A7090', fontSize: '1rem', fontWeight: 600 }}>Loading brand records...</div>
        </div>
      ) : processedBrands.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1.5px solid #EFEAEF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#F8F5F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A7090',
            }}
          >
            <Building2 size={30} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1E0432', fontWeight: 800 }}>No Brands Found</h3>
          <p style={{ margin: 0, color: '#6A5672', maxWidth: '420px', fontSize: '0.92rem' }}>
            {search.trim()
              ? `No brand matching "${search}". Try adjusting your search or filters.`
              : 'You have not added any brands yet. Click "Add Brand" to register automotive manufacturers.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddBrand}
            style={{
              marginTop: '8px',
              backgroundColor: 'rgb(250, 184, 38)',
              color: 'rgb(26, 3, 34)',
              fontWeight: 700,
              fontSize: '0.9rem',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'rgba(250, 184, 38, 0.35) 0px 4px 14px',
              transition: '0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = 'rgba(250, 184, 38, 0.5) 0px 6px 18px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'rgba(250, 184, 38, 0.35) 0px 4px 14px';
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create First Brand</span>
          </button>
        </div>
      ) : effectiveViewMode === 'table' ? (
        /* ================= ROW & COLUMN TABLE VIEW ================= */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #EFEAEF',
            boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FBF9FB', borderBottom: '1.5px solid #EFEAEF' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Manufacturer
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Country / Origin
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Slug Identifier
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Models
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {processedBrands.map((brand, idx) => {
                  const modelsCount = brand.models?.length || 0;
                  return (
                    <tr
                      key={brand.id}
                      style={{
                        borderBottom: idx === processedBrands.length - 1 ? 'none' : '1px solid #F3EDF3',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FCFAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Logo and Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <BrandLogoThumbnail url={brand.logoUrl} name={brand.name} size={44} fontSize="0.95rem" />
                          <div>
                            <div style={{ fontWeight: 800, color: '#1E0432', fontSize: '0.98rem' }}>{brand.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#8A7090', marginTop: '2px' }}>
                              Created {new Date(brand.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Country */}
                      <td style={{ padding: '16px 20px', color: '#4A315A', fontSize: '0.92rem', fontWeight: 600 }}>
                        {brand.country ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={14} color="#8A7090" />
                            {brand.country}
                          </span>
                        ) : (
                          <span style={{ color: '#A08DA4', fontStyle: 'italic' }}>Global</span>
                        )}
                      </td>

                      {/* Slug */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#F3EEF4',
                            color: '#5B416B',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                          }}
                        >
                          {brand.slug}
                        </span>
                      </td>

                      {/* Linked Models */}
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/models?brandId=${brand.id}`)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: modelsCount > 0 ? '#F3EDF3' : '#F9F7FA',
                            color: modelsCount > 0 ? '#1E0432' : '#8A7090',
                            border: '1px solid #E5DFE7',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="View models under this brand"
                        >
                          <Layers size={13} color="#FAB826" />
                          <span>{modelsCount} {modelsCount === 1 ? 'Model' : 'Models'}</span>
                          <ChevronRight size={13} color="#8A7090" />
                        </button>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {brand.isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#065F46',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#991B1B',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/models?brandId=${brand.id}`)}
                            title="Manage Models for this brand"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '7px 12px',
                              borderRadius: '8px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5DFE7',
                              color: '#1E0432',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Layers size={14} color="#8A7090" />
                            <span>Models</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditBrand(brand)}
                            title="Edit Brand details"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#F3EEF4',
                              border: '1px solid #E5DFE7',
                              color: '#1E0432',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Pencil size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBrand(brand)}
                            title="Delete Brand"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FEE2E2',
                              color: '#DC2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= GRID CARD VIEW ================= */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
            gap: isMobile ? '14px' : '20px',
          }}
        >
          {processedBrands.map((brand) => {
            const modelsCount = brand.models?.length || 0;
            return (
              <div
                key={brand.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1.5px solid #EFEAEF',
                  boxShadow: '0 4px 20px rgba(30, 4, 38, 0.03)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <BrandLogoThumbnail url={brand.logoUrl} name={brand.name} size={54} fontSize="1.1rem" />

                    {brand.isActive ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 9px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#065F46',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                        Active
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 9px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#991B1B',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                        Inactive
                      </span>
                    )}
                  </div>

                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1E0432' }}>{brand.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '0.85rem', color: '#6A5672' }}>
                    <Globe size={14} color="#8A7090" />
                    <span>{brand.country || 'Global Origin'}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace', color: '#8A7090' }}>{brand.slug}</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FAF7FA',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: '#6A5672', fontWeight: 600 }}>
                    Connected Models: <strong style={{ color: '#1E0432' }}>{modelsCount}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/models?brandId=${brand.id}`)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1E0432',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    View Models <ChevronRight size={14} />
                  </button>
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #F3EDF3' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditBrand(brand)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#F3EEF4',
                      border: '1px solid #E5DFE7',
                      color: '#1E0432',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBrand(brand)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FEE2E2',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Delete Brand"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= BRAND ADD/EDIT MODAL ================= */}
      {isBrandModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(28, 3, 36, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsBrandModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              padding: '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              boxSizing: 'border-box',
              position: 'relative',
              animation: 'modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1E0432' }}>
                  {brandEditId ? 'Edit Brand' : 'Add Automotive Brand'}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6A5672', fontSize: '0.88rem' }}>
                  {brandEditId ? 'Update brand details and logo emblem' : 'Register a new vehicle manufacturer into the system'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8A7090',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Brand Form */}
            <form onSubmit={handleSaveBrand} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Brand Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', marginBottom: '6px' }}>
                  Brand Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Porsche, BMW, Mercedes-Benz, Tesla"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="fleet-form-input"
                />
                {brandName.trim() && (
                  <div style={{ fontSize: '0.78rem', color: '#8A7090', marginTop: '4px' }}>
                    Slug: <code style={{ color: '#1E0432' }}>{brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</code>
                  </div>
                )}
              </div>

              {/* Country of Origin */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', marginBottom: '6px' }}>
                  Country of Origin
                </label>
                <input
                  type="text"
                  placeholder="e.g. Germany, Japan, United States, Italy, Sweden"
                  value={brandCountry}
                  onChange={(e) => setBrandCountry(e.target.value)}
                  className="fleet-form-input"
                />
              </div>

              {/* Brand Logo Upload & Preview Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', margin: 0 }}>
                      Brand Logo
                    </label>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#8A7090', backgroundColor: '#F0EBF2', padding: '2px 8px', borderRadius: '6px' }}>
                      Optional
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#8A7090' }}>
                    PNG, SVG, WEBP, or JPG • Max 5MB
                  </span>
                </div>

                {/* Validation Error Alert */}
                {logoValidationError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                      backgroundColor: '#FEF2F2',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#991B1B',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={16} style={{ flexShrink: 0, color: '#DC2626' }} />
                      <span>{logoValidationError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoValidationError(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#991B1B',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Dismiss error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* If logo is attached / present */}
                {brandLogoUrl ? (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #E5DFE7',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 2px 8px rgba(30, 4, 38, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          border: '1.5px solid #ECE7ED',
                          backgroundColor: '#FAF8FB',
                          backgroundImage: 'radial-gradient(#E8E0EC 1px, transparent 1px)',
                          backgroundSize: '8px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          boxSizing: 'border-box',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={brandLogoUrl}
                          alt="Brand Logo"
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: '#1E0432',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {logoFileMeta?.name || `${brandName.trim() || 'Brand'} Logo`}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: '#059669',
                              backgroundColor: '#ECFDF5',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              border: '1px solid #A7F3D0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Check size={11} strokeWidth={3} /> Ready
                          </span>
                          {logoFileMeta?.format && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#6C1E84',
                                backgroundColor: '#F5EEF8',
                                padding: '2px 7px',
                                borderRadius: '4px',
                              }}
                            >
                              {logoFileMeta.format}
                            </span>
                          )}
                          {logoFileMeta?.sizeFormatted && (
                            <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>
                              {logoFileMeta.sizeFormatted}
                            </span>
                          )}
                          {logoFileMeta?.dimensions && (
                            <span style={{ fontSize: '0.72rem', color: '#8A7090' }}>
                              • {logoFileMeta.dimensions}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Replace / Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1.5px solid #E5DFE7',
                          backgroundColor: '#FAF8FB',
                          color: '#4A315A',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Choose a different image"
                      >
                        <RefreshCw size={12} />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearLogo}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: '1.5px solid #FEE2E2',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Remove brand logo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop File Upload Zone */
                  <div
                    onDragEnter={handleLogoDrag}
                    onDragLeave={handleLogoDrag}
                    onDragOver={handleLogoDrag}
                    onDrop={handleLogoDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDraggingLogo ? '#6C1E84' : '#DED7E2'}`,
                      borderRadius: '12px',
                      padding: '24px 18px',
                      textAlign: 'center',
                      backgroundColor: isDraggingLogo ? '#FBF6FD' : '#FAF8FB',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (!isDraggingLogo) {
                        e.currentTarget.style.borderColor = '#6C1E84';
                        e.currentTarget.style.backgroundColor = '#FAF4FB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDraggingLogo) {
                        e.currentTarget.style.borderColor = '#DED7E2';
                        e.currentTarget.style.backgroundColor = '#FAF8FB';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: isDraggingLogo ? '#6C1E84' : '#F3EAF6',
                        color: isDraggingLogo ? '#FFFFFF' : '#6C1E84',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <UploadCloud size={22} strokeWidth={2.2} />
                    </div>

                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E0432' }}>
                        {isDraggingLogo ? 'Drop brand logo here' : 'Click to upload or drag & drop'}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#8A7090', marginTop: '2px' }}>
                        PNG, SVG, WEBP, or JPG • Max 5MB (Transparent emblem recommended)
                      </div>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#6C1E84',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5DFE7',
                        padding: '5px 14px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      Browse Image Files
                    </span>
                  </div>
                )}

                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLogoFileSelect(file);
                    }
                  }}
                />
              </div>

              {/* Status Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FAF7FA', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E0432' }}>Active Brand</div>
                  <div style={{ fontSize: '0.78rem', color: '#8A7090' }}>Allow vehicles under this brand to be selected in inventory</div>
                </div>
                <input
                  type="checkbox"
                  checked={brandIsActive}
                  onChange={(e) => setBrandIsActive(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#1E0432', cursor: 'pointer' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #E5DFE7',
                    backgroundColor: '#FFFFFF',
                    color: '#6A5672',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBrand || !brandName.trim()}
                  style={{
                    backgroundColor: 'rgb(250, 184, 38)',
                    color: 'rgb(26, 3, 34)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'rgba(250, 184, 38, 0.35) 0px 4px 14px',
                    transition: '0.2s',
                    cursor: isSavingBrand || !brandName.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSavingBrand || !brandName.trim() ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSavingBrand && brandName.trim()) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = 'rgba(250, 184, 38, 0.5) 0px 6px 18px';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'rgba(250, 184, 38, 0.35) 0px 4px 14px';
                  }}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>{isSavingBrand ? 'Saving...' : brandEditId ? 'Update Brand' : 'Create Brand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Filter Bar & Mobile Layout Styles */}
      <style>{`
        .fleet-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .fleet-header-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 11px 20px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.92rem;
          text-decoration: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
          white-space: nowrap;
          cursor: pointer;
        }

        .fleet-btn-secondary {
          background-color: #FFFFFF;
          color: #4A315A;
          border: 1.5px solid #E5DFE7;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }
        .fleet-btn-secondary:hover {
          background-color: #FAF8FB;
          border-color: #6C1E84;
          transform: translateY(-1px);
        }

        .fleet-btn-neutral {
          background-color: #F8F5F1;
          color: #4A315A;
          border: 1.5px solid #E5DFE7;
        }
        .fleet-btn-neutral:hover {
          background-color: #F0ECE4;
          transform: translateY(-1px);
        }

        .fleet-btn-gold {
          background-color: rgb(250, 184, 38);
          color: rgb(26, 3, 34);
          border: none;
          border-radius: 10px;
          box-shadow: rgba(250, 184, 38, 0.35) 0px 4px 14px;
        }
        .fleet-btn-gold:hover {
          transform: translateY(-1px);
          box-shadow: rgba(250, 184, 38, 0.5) 0px 6px 18px;
        }

        .fleet-btn-label .label-short {
          display: none;
        }
        .fleet-btn-label .label-full {
          display: inline;
        }

        .fleet-filter-bar {
          background-color: #FFFFFF;
          border-radius: 16px;
          padding: 16px 20px;
          border: 1.5px solid #EFEAEF;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          box-shadow: 0 2px 10px rgba(30, 4, 38, 0.02);
          box-sizing: border-box;
          width: 100%;
        }

        .fleet-filter-search-box {
          position: relative;
          flex: 1 1 300px;
          min-width: 240px;
        }

        .fleet-filter-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .fleet-filter-search-input {
          width: 100%;
          height: 40px;
          padding: 0 14px 0 42px;
          border-radius: 10px;
          border: 1.5px solid #E5DFE7;
          background-color: #FBF9FC;
          font-size: 0.9rem;
          color: #1E0432;
          outline: none !important;
          box-sizing: border-box;
          transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
        }
        .fleet-filter-search-input:focus,
        .fleet-filter-search-input:focus-visible {
          border-color: #6C1E84 !important;
          background-color: #FFFFFF !important;
          outline: none !important;
          box-shadow: 0 0 0 3.5px rgba(108, 30, 132, 0.12) !important;
        }

        .fleet-form-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #E5DFE7;
          background-color: #FAF7FA;
          font-size: 0.95rem;
          color: #1E0432;
          box-sizing: border-box;
          outline: none !important;
          transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
        }
        .fleet-form-input:focus,
        .fleet-form-input:focus-visible {
          border-color: #6C1E84 !important;
          background-color: #FFFFFF !important;
          outline: none !important;
          box-shadow: 0 0 0 3.5px rgba(108, 30, 132, 0.12) !important;
        }

        .fleet-filter-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .fleet-filter-grid-brands {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fleet-col-status { width: 150px; }
        .fleet-col-sort { width: 180px; }

        .fleet-filter-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .fleet-filter-count-badge {
          display: none;
          font-size: 0.82rem;
          font-weight: 700;
          color: #8A7090;
        }

        .fleet-view-toggle {
          display: inline-flex;
          background-color: #F3EEF4;
          border-radius: 10px;
          padding: 3px;
          border: 1px solid #E5DFE7;
          flex-shrink: 0;
        }

        .fleet-toggle-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background-color: transparent;
          color: #8A7090;
          box-shadow: none;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .fleet-toggle-btn.active {
          background-color: #FFFFFF;
          color: #1E0432;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        }

        /* Large Tablet / Medium Desktop breakpoint (1024px - 1100px) */
        @media (max-width: 1100px) {
          .fleet-filter-bar {
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }
          .fleet-filter-search-box {
            width: 100%;
            flex: none;
          }
          .fleet-filter-controls {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
          }
          .fleet-filter-grid-brands {
            flex: 1;
            flex-wrap: wrap;
            gap: 10px;
          }
          .fleet-col-status,
          .fleet-col-sort {
            flex: 1 1 150px;
            width: auto;
            min-width: 130px;
          }
        }

        /* Mobile & Small Tablet (< 768px): Strictly 1 single row for the 3 buttons! */
        @media (max-width: 768px) {
          .fleet-header-actions {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
            margin-top: 6px;
          }
          .fleet-header-action-btn {
            width: 100% !important;
            padding: 9px 4px !important;
            font-size: 0.8rem !important;
            border-radius: 10px !important;
            gap: 6px !important;
          }
          .fleet-header-action-btn svg {
            width: 15px !important;
            height: 15px !important;
            flex-shrink: 0 !important;
          }

          .fleet-filter-bar {
            padding: 14px 16px;
            border-radius: 14px;
            gap: 12px;
          }
          .fleet-filter-search-input {
            height: 40px;
            font-size: 0.88rem;
            padding-left: 40px;
          }
          .fleet-filter-controls {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
            width: 100%;
          }
          .fleet-filter-grid-brands {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .fleet-col-status,
          .fleet-col-sort {
            width: 100% !important;
            min-width: 0 !important;
            flex: none !important;
          }
          .fleet-filter-actions {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
            padding-top: 8px !important;
            border-top: 1px solid #F5F1F6 !important;
          }
          .fleet-filter-count-badge {
            display: inline-block !important;
          }
        }

        /* Compact Mobile (< 420px) */
        @media (max-width: 420px) {
          .fleet-header-actions {
            gap: 5px !important;
          }
          .fleet-header-action-btn {
            padding: 8px 3px !important;
            font-size: 0.74rem !important;
            gap: 4px !important;
          }
          .fleet-header-action-btn svg {
            width: 13px !important;
            height: 13px !important;
          }
        }

        /* Very Small Phones (< 380px) */
        @media (max-width: 380px) {
          .fleet-filter-bar {
            padding: 12px 10px;
            border-radius: 12px;
          }
          .fleet-filter-grid-brands {
            gap: 6px !important;
          }
        }

        /* Ultra Compact (< 360px) */
        @media (max-width: 360px) {
          .fleet-btn-label .label-full {
            display: none !important;
          }
          .fleet-btn-label .label-short {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BrandsManagementPage;
