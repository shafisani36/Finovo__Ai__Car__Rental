import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import type { VehicleBrandItem, VehicleModelItem } from '../types/fleet.types';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import {
  Layers,
  Car,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  List,
  LayoutGrid,
  Building2,
  CheckCircle2,
  Tag,
} from 'lucide-react';

const BODY_TYPES = [
  'Sedan',
  'SUV',
  'Coupe',
  'Convertible',
  'Hatchback',
  'Pickup',
  'Van',
  'Wagon',
  'Crossover',
  'Electric',
];

export function ModelsManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBrandId = searchParams.get('brandId') || 'ALL';

  const { confirm } = useConfirm();

  const [models, setModels] = useState<VehicleModelItem[]>([]);
  const [brands, setBrands] = useState<VehicleBrandItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>(initialBrandId);
  const [selectedBodyTypeFilter, setSelectedBodyTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'BRAND_ASC' | 'NEWEST'>('BRAND_ASC');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [isLoading, setIsLoading] = useState(true);

  // Model Form Modal
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelEditId, setModelEditId] = useState<string | null>(null);
  const [modelBrandId, setModelBrandId] = useState<string>('');
  const [modelName, setModelName] = useState('');
  const [modelBodyType, setModelBodyType] = useState('Sedan');
  const [modelIsActive, setModelIsActive] = useState(true);
  const [isSavingModel, setIsSavingModel] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Load Brands for dropdowns
  const loadBrands = useCallback(async () => {
    try {
      const res = await fleetApi.getBrands();
      if (res?.brands) {
        setBrands(res.brands);
      }
    } catch (err: any) {
      console.error('Failed to load brands:', err);
    }
  }, []);

  // Load Models
  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fleetApi.getModels({
        search: search.trim() || undefined,
        brandId: selectedBrandFilter === 'ALL' ? undefined : selectedBrandFilter,
        bodyType: selectedBodyTypeFilter === 'ALL' ? undefined : selectedBodyTypeFilter,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });
      if (res?.models) {
        setModels(res.models);
      }
    } catch (err: any) {
      console.error('Failed to load models:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedBrandFilter, selectedBodyTypeFilter, statusFilter]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadModels();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadModels]);

  // Keep query param in sync with brand filter
  const handleBrandFilterChange = (brandId: string) => {
    setSelectedBrandFilter(brandId);
    if (brandId === 'ALL') {
      searchParams.delete('brandId');
    } else {
      searchParams.set('brandId', brandId);
    }
    setSearchParams(searchParams);
  };

  // Sorted list
  const processedModels = useMemo(() => {
    const result = [...models];

    if (sortBy === 'NAME_ASC') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'NAME_DESC') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'BRAND_ASC') {
      result.sort((a, b) => {
        const brandA = a.brand?.name || '';
        const brandB = b.brand?.name || '';
        const comp = brandA.localeCompare(brandB);
        return comp !== 0 ? comp : a.name.localeCompare(b.name);
      });
    } else if (sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [models, sortBy]);

  // Statistics
  const totalModelsCount = models.length;
  const activeModelsCount = models.filter((m) => m.isActive).length;
  const distinctBrandsCount = new Set(models.map((m) => m.brandId)).size;
  const distinctBodyTypesCount = new Set(models.map((m) => m.bodyType).filter(Boolean)).size;

  // Open Add Model Modal
  const handleOpenAddModel = () => {
    setModelEditId(null);
    setModelBrandId(selectedBrandFilter !== 'ALL' ? selectedBrandFilter : brands[0]?.id || '');
    setModelName('');
    setModelBodyType('Sedan');
    setModelIsActive(true);
    setIsModelModalOpen(true);
  };

  // Open Edit Model Modal
  const handleOpenEditModel = (model: VehicleModelItem) => {
    setModelEditId(model.id);
    setModelBrandId(model.brandId);
    setModelName(model.name);
    setModelBodyType(model.bodyType || 'Sedan');
    setModelIsActive(model.isActive ?? true);
    setIsModelModalOpen(true);
  };

  // Save Model
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() || !modelBrandId) return;

    setIsSavingModel(true);
    try {
      if (modelEditId) {
        await fleetApi.updateModel(modelEditId, {
          name: modelName.trim(),
          brandId: modelBrandId,
          bodyType: modelBodyType,
          isActive: modelIsActive,
        });
        showNotification(`Model "${modelName}" updated successfully`);
      } else {
        await fleetApi.createModel({
          name: modelName.trim(),
          brandId: modelBrandId,
          bodyType: modelBodyType,
        });
        showNotification(`Model "${modelName}" created successfully`);
      }
      setIsModelModalOpen(false);
      await loadModels();
      await loadBrands(); // refresh model counts on brands
    } catch (err: any) {
      alert(err.message || 'Failed to save model');
    } finally {
      setIsSavingModel(false);
    }
  };

  // Delete Model
  const handleDeleteModel = async (model: VehicleModelItem) => {
    const brandName = model.brand?.name || 'Brand';
    const ok = await confirm({
      title: `Delete Model: ${model.name}?`,
      message: `Are you sure you want to delete "${model.name}" (${brandName})? This will permanently remove this model specification from your fleet options.`,
      confirmText: 'Delete Model',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await fleetApi.deleteModel(model.id);
      showNotification(`Model "${model.name}" deleted successfully`);
      await loadModels();
    } catch (err: any) {
      alert(err.message || 'Failed to delete model');
    }
  };

  // Custom select brand options
  const brandSelectOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Brands' }];
    brands.forEach((b) => {
      list.push({
        value: b.id,
        label: `${b.name} (${b.models?.length || 0})`,
      });
    });
    return list;
  }, [brands]);

  // Brand modal options (without ALL)
  const modalBrandOptions = useMemo(() => {
    return brands.map((b) => ({
      value: b.id,
      label: b.name,
    }));
  }, [brands]);

  // Body type filter options
  const bodyTypeFilterOptions = useMemo(() => {
    const list = [{ value: 'ALL', label: 'All Body Types' }];
    BODY_TYPES.forEach((bt) => {
      list.push({ value: bt, label: bt });
    });
    return list;
  }, []);

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
          <span style={{ color: '#1E0432', fontWeight: 700 }}>Models Directory</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.95rem', fontWeight: 800, color: '#1E0432', margin: 0, letterSpacing: '-0.02em' }}>
              Vehicle Models
            </h1>
            <p style={{ margin: '6px 0 0', color: '#6A5672', fontSize: '0.95rem' }}>
              Configure specific car models, body styling, and default categories associated with each brand.
            </p>
          </div>

          <div className="fleet-header-actions">
            <Link
              to="/admin/brands"
              className="fleet-header-action-btn fleet-btn-secondary"
            >
              <Building2 size={17} color="#8A7090" />
              <span className="fleet-btn-label">
                <span className="label-full">Manage Brands</span>
                <span className="label-short">Brands</span>
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
              onClick={handleOpenAddModel}
              className="fleet-header-action-btn fleet-btn-gold"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="fleet-btn-label">
                <span className="label-full">Add Model</span>
                <span className="label-short">Model</span>
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
              Total Models
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {totalModelsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Variants in registry</div>
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
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#10B981', letterSpacing: '0.04em' }}>
              Active Models
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {activeModelsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Eligible for inventory</div>
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
              Brands Represented
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {distinctBrandsCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>With active models</div>
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
            <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: '#8A7090', letterSpacing: '0.04em' }}>
              Body Styles
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1E0432', marginTop: '4px' }}>
              {distinctBodyTypesCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6A5672', marginTop: '2px' }}>Sedan, SUV, Coupe, etc.</div>
          </div>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8B5CF6',
            }}
          >
            <Car size={24} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="fleet-filter-bar">
        {/* Search */}
        <div className="fleet-filter-search-box">
          <Search size={18} color="#8A7090" className="fleet-filter-search-icon" />
          <input
            type="text"
            placeholder="Search models by name or body style..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="fleet-filter-search-input"
          />
        </div>

        {/* Filter Controls Wrapper */}
        <div className="fleet-filter-controls">
          {/* Dropdown Grid */}
          <div className="fleet-filter-grid-models">
            {/* Brand Filter */}
            <div className="fleet-filter-col fleet-col-brand">
              <CustomSelect
                value={selectedBrandFilter}
                onChange={handleBrandFilterChange}
                options={brandSelectOptions}
                size="sm"
                searchable={true}
                searchPlaceholder="Search brand..."
                fullWidth={true}
              />
            </div>

            {/* Body Type Filter */}
            <div className="fleet-filter-col fleet-col-body">
              <CustomSelect
                value={selectedBodyTypeFilter}
                onChange={(val) => setSelectedBodyTypeFilter(val)}
                options={bodyTypeFilterOptions}
                size="sm"
                searchable={true}
                searchPlaceholder="Search body style..."
                fullWidth={true}
              />
            </div>

            {/* Status Filter */}
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

            {/* Sort By */}
            <div className="fleet-filter-col fleet-col-sort">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'BRAND_ASC', label: 'Sort: Brand (A-Z)' },
                  { value: 'NAME_ASC', label: 'Sort: Model (A-Z)' },
                  { value: 'NAME_DESC', label: 'Sort: Model (Z-A)' },
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
              {processedModels.length} {processedModels.length === 1 ? 'model' : 'models'}
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
          <div style={{ color: '#8A7090', fontSize: '1rem', fontWeight: 600 }}>Loading vehicle models...</div>
        </div>
      ) : processedModels.length === 0 ? (
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
            <Layers size={30} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1E0432', fontWeight: 800 }}>No Models Found</h3>
          <p style={{ margin: 0, color: '#6A5672', maxWidth: '420px', fontSize: '0.92rem' }}>
            {brands.length === 0
              ? 'You have not registered any brands yet. Please add a brand before creating models.'
              : search.trim() || selectedBrandFilter !== 'ALL' || selectedBodyTypeFilter !== 'ALL'
              ? 'No models match your current filters. Try resetting the filters or search term.'
              : 'No vehicle models created yet. Click "Add Model" to configure model variants.'}
          </p>
          {brands.length === 0 ? (
            <Link
              to="/admin/brands"
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
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddModel}
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
              <span>Create First Model</span>
            </button>
          )}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: '#FBF9FB', borderBottom: '1.5px solid #EFEAEF' }}>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Model Specification
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Manufacturer / Brand
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Body Style
                  </th>
                  <th style={{ padding: '14px 20px', fontSize: '0.78rem', fontWeight: 800, color: '#8A7090', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Slug
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
                {processedModels.map((model, idx) => {
                  return (
                    <tr
                      key={model.id}
                      style={{
                        borderBottom: idx === processedModels.length - 1 ? 'none' : '1px solid #F3EDF3',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FCFAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Model Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: '#F7F3F8',
                              border: '1px solid #EFEAEF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#1E0432',
                              flexShrink: 0,
                            }}
                          >
                            <Car size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1E0432', fontSize: '0.98rem' }}>{model.name}</div>
                            <div style={{ fontSize: '0.78rem', color: '#8A7090', marginTop: '2px' }}>
                              Added {new Date(model.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Brand Info */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {model.brand?.logoUrl && (
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                backgroundColor: '#FFF',
                                border: '1px solid #EFEAEF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '3px',
                                boxSizing: 'border-box',
                              }}
                            >
                              <img
                                src={model.brand.logoUrl}
                                alt={model.brand.name}
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            </div>
                          )}
                          <div>
                            <span style={{ fontWeight: 700, color: '#1E0432', fontSize: '0.92rem' }}>
                              {model.brand?.name || 'Unknown'}
                            </span>
                            {model.brand?.country && (
                              <div style={{ fontSize: '0.78rem', color: '#8A7090' }}>{model.brand.country}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Body Style Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            backgroundColor: '#F3EDF3',
                            color: '#4A315A',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            border: '1px solid #E5DFE7',
                          }}
                        >
                          <Tag size={12} color="#FAB826" />
                          {model.bodyType || 'Sedan'}
                        </span>
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
                          {model.slug}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {model.isActive ? (
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
                            onClick={() => handleOpenEditModel(model)}
                            title="Edit Model"
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
                            onClick={() => handleDeleteModel(model)}
                            title="Delete Model"
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
          {processedModels.map((model) => {
            return (
              <div
                key={model.id}
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {model.brand?.logoUrl && (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EFEAEF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <img
                            src={model.brand.logoUrl}
                            alt={model.brand.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8A7090' }}>
                          {model.brand?.name || 'Brand'}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E0432' }}>
                          {model.name}
                        </h3>
                      </div>
                    </div>

                    {model.isActive ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#065F46',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                        Active
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#991B1B',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: '#F3EDF3',
                        color: '#4A315A',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        border: '1px solid #E5DFE7',
                      }}
                    >
                      <Tag size={12} color="#FAB826" />
                      {model.bodyType || 'Sedan'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#8A7090', fontFamily: 'monospace' }}>{model.slug}</span>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #F3EDF3' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditModel(model)}
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
                    onClick={() => handleDeleteModel(model)}
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
                    title="Delete Model"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODEL ADD/EDIT MODAL ================= */}
      {isModelModalOpen && (
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
            if (e.target === e.currentTarget) setIsModelModalOpen(false);
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
                  {modelEditId ? 'Edit Vehicle Model' : 'Add Vehicle Model'}
                </h2>
                <p style={{ margin: '4px 0 0', color: '#6A5672', fontSize: '0.88rem' }}>
                  {modelEditId ? 'Update model specifications and body classification' : 'Create a new model variant under a manufacturer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(false)}
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

            {/* Model Form */}
            <form onSubmit={handleSaveModel} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Manufacturer / Brand Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', marginBottom: '6px' }}>
                  Manufacturer / Brand <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <CustomSelect
                  value={modelBrandId}
                  onChange={(val) => setModelBrandId(val)}
                  options={modalBrandOptions}
                  placeholder="Select a brand..."
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search brand..."
                />
              </div>

              {/* Model Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', marginBottom: '6px' }}>
                  Model Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 911 Carrera, Camry, Model 3, X5, Mustang"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="fleet-form-input"
                />
                {modelName.trim() && (
                  <div style={{ fontSize: '0.78rem', color: '#8A7090', marginTop: '4px' }}>
                    Slug: <code style={{ color: '#1E0432' }}>{modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</code>
                  </div>
                )}
              </div>

              {/* Body Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1E0432', marginBottom: '6px' }}>
                  Body Style
                </label>
                <CustomSelect
                  value={modelBodyType}
                  onChange={(val) => setModelBodyType(val)}
                  options={BODY_TYPES.map((bt) => ({ value: bt, label: bt }))}
                  fullWidth
                  searchable={true}
                  searchPlaceholder="Search body style..."
                />
              </div>

              {/* Active Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#FAF7FA', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E0432' }}>Active Model</div>
                  <div style={{ fontSize: '0.78rem', color: '#8A7090' }}>Available for fleet inventory assignment</div>
                </div>
                <input
                  type="checkbox"
                  checked={modelIsActive}
                  onChange={(e) => setModelIsActive(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#1E0432', cursor: 'pointer' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
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
                  disabled={isSavingModel || !modelName.trim() || !modelBrandId}
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
                    cursor: isSavingModel || !modelName.trim() || !modelBrandId ? 'not-allowed' : 'pointer',
                    opacity: isSavingModel || !modelName.trim() || !modelBrandId ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSavingModel && modelName.trim() && modelBrandId) {
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
                  <span>{isSavingModel ? 'Saving...' : modelEditId ? 'Update Model' : 'Create Model'}</span>
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
          flex: 1 1 260px;
          min-width: 220px;
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

        .fleet-filter-grid-models {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fleet-col-brand { width: 180px; }
        .fleet-col-body { width: 160px; }
        .fleet-col-status { width: 140px; }
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

        /* Large Tablet / Medium Desktop breakpoint (1024px - 1280px) */
        @media (max-width: 1280px) {
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
          .fleet-filter-grid-models {
            flex: 1;
            flex-wrap: wrap;
            gap: 10px;
          }
          .fleet-col-brand,
          .fleet-col-body,
          .fleet-col-status,
          .fleet-col-sort {
            flex: 1 1 160px;
            width: auto;
            min-width: 140px;
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
          .fleet-filter-grid-models {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
            width: 100% !important;
          }
          .fleet-col-brand,
          .fleet-col-body,
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
          .fleet-filter-grid-models {
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

export default ModelsManagementPage;
