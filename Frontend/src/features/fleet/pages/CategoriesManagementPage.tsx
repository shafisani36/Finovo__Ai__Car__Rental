import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fleetApi } from '../api/fleetApi';
import type { VehicleCategory } from '../types/fleet.types';
import { useConfirm } from '../../../components/common/ConfirmModal';
import { CustomSelect } from '../../../components/common/CustomSelect';
import {
  Tag,
  Search,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Layers,
  ChevronRight,
  LayoutGrid,
  List,
  Car,
  Banknote,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import './CategoriesManagementPage.css';
import { APP_CURRENCY, formatMoney } from '../../../utils/carImageHelper';
import { useTranslation } from 'react-i18next';

export type CategoryWithCount = VehicleCategory & {
  _count?: { vehicles: number };
};

export function CategoriesManagementPage() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'RATE_DESC' | 'RATE_ASC' | 'VEHICLES_DESC'>('NAME_ASC');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [baseRate, setBaseRate] = useState<string>('150');
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Load Categories from Backend
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fleetApi.getCategories();
      if (res && res.categories) {
        setCategories(res.categories);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      setErrorMessage(err?.message || t('adminPages.fleet.errLoadCategories'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Auto-slug generation from Name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched && !editId) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditId(null);
    setName('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setBaseRate('8000');
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat: CategoryWithCount) => {
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSlugTouched(true);
    setDescription(cat.description || '');
    setBaseRate(String(cat.baseRate || '0'));
    setModalError(null);
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setModalError(t('adminPages.fleet.errCategoryName'));
      return;
    }

    const trimmedSlug = (slug.trim() || trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const parsedRate = parseFloat(baseRate);
    if (isNaN(parsedRate) || parsedRate < 0) {
      setModalError(t('adminPages.fleet.errRate'));
      return;
    }

    setIsSaving(true);
    try {
      if (editId) {
        await fleetApi.updateCategory(editId, {
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
          baseRate: parsedRate,
        });
        setSuccessMessage(t('adminPages.fleet._categoryUpdated', { name: trimmedName }));
      } else {
        await fleetApi.createCategory({
          name: trimmedName,
          slug: trimmedSlug,
          description: description.trim() || undefined,
          baseRate: parsedRate,
        });
        setSuccessMessage(t('adminPages.fleet._categoryCreated', { name: trimmedName }));
      }

      setIsModalOpen(false);
      await loadCategories();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving category:', err);
      setModalError(err?.message || t('adminPages.fleet.errSaveCategory'));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Category with Confirmation
  const handleDeleteCategory = async (cat: CategoryWithCount) => {
    const vehicleCount = cat._count?.vehicles || 0;
    if (vehicleCount > 0) {
      await confirm({
        title: t('adminPages.fleet.cannotDeleteCategory'),
        message: t('adminPages.fleet._categoryInUse', { name: cat.name, count: vehicleCount }),
        variant: 'warning',
        confirmText: t('adminPages.fleet.understood'),
        cancelText: '',
      });
      return;
    }

    const confirmed = await confirm({
      title: t('adminPages.fleet.deleteCategoryTitle'),
      message: t('adminPages.fleet._deleteCategoryMessage', { name: cat.name }),
      variant: 'danger',
      confirmText: t('adminPages.fleet.deleteCategory'),
      cancelText: t('adminPages.fleet.cancel'),
    });

    if (!confirmed) return;

    try {
      await fleetApi.deleteCategory(cat.id);
      setSuccessMessage(t('adminPages.fleet._categoryRemoved', { name: cat.name }));
      await loadCategories();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Error deleting category:', err);
      setErrorMessage(err?.message || t('adminPages.fleet.errDeleteCategory'));
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  // Filter & Sort
  const filteredCategories = useMemo(() => {
    let result = [...categories];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      if (sortBy === 'NAME_DESC') return b.name.localeCompare(a.name);
      if (sortBy === 'RATE_DESC') return Number(b.baseRate || 0) - Number(a.baseRate || 0);
      if (sortBy === 'RATE_ASC') return Number(a.baseRate || 0) - Number(b.baseRate || 0);
      if (sortBy === 'VEHICLES_DESC') return (b._count?.vehicles || 0) - (a._count?.vehicles || 0);
      return 0;
    });

    return result;
  }, [categories, search, sortBy]);

  // Aggregate Metrics
  const totalVehiclesCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c._count?.vehicles || 0), 0);
  }, [categories]);

  const avgBaseRate = useMemo(() => {
    if (categories.length === 0) return 0;
    const sum = categories.reduce((total, c) => total + Number(c.baseRate || 0), 0);
    return Math.round(sum / categories.length);
  }, [categories]);

  const topCategory = useMemo(() => {
    if (categories.length === 0) return t('adminPages.fleet.none');
    const sorted = [...categories].sort((a, b) => (b._count?.vehicles || 0) - (a._count?.vehicles || 0));
    return sorted[0]._count?.vehicles ? sorted[0].name : sorted[0].name;
  }, [categories, t]);

  // Helper for Category icon badge styling
  const getCategoryColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('van') || n.includes('minibus')) return { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    if (n.includes('suv')) return { bg: '#E0E7FF', color: '#3730A3', border: '#C7D2FE' };
    if (n.includes('pickup')) return { bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' };
    if (n.includes('luxury') || n.includes('executive')) return { bg: '#FDF4FF', color: '#86198F', border: '#F5D0FE' };
    if (n.includes('sports') || n.includes('coupe')) return { bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' };
    return { bg: '#F3E8FF', color: '#6B21A8', border: '#E9D5FF' };
  };

  return (
    <div className="cat-container">
      {/* Breadcrumb */}
      <div className="cat-breadcrumb">
        <Link to="/admin/dashboard">{t('adminPages.fleet.dashboard')}</Link>
        <ChevronRight size={14} />
        <Link to="/admin/cars">{t('adminPages.fleet.fleet')}</Link>
        <ChevronRight size={14} />
        <span className="cat-breadcrumb-current">{t('adminPages.fleet.categoriesTitle')}</span>
      </div>

      {/* Page Header */}
      <div className="cat-header">
        <div className="cat-header-title-wrap">
          <h1 className="cat-header-title">{t('adminPages.fleet.categoriesTitle')}</h1>
          <p className="cat-header-desc">
            {t('adminPages.fleet.categoriesSubtitle')}
          </p>
        </div>

        <div className="cat-header-actions">
          <button
            type="button"
            onClick={loadCategories}
            disabled={isLoading}
            className="cat-btn-refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            <span>{t('adminPages.fleet.refresh')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="cat-btn-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('adminPages.fleet.newCategory')}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ECFDF5',
            border: '1.5px solid #A7F3D0',
            color: '#065F46',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: 'clamp(0.82rem, 1.4vw, 0.9rem)',
            fontWeight: 700,
          }}
        >
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065F46' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FECACA',
            color: '#991B1B',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            fontSize: 'clamp(0.82rem, 1.4vw, 0.9rem)',
            fontWeight: 700,
          }}
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="cat-kpi-grid">
        <div className="cat-kpi-card">
          <div className="cat-kpi-content">
            <div className="cat-kpi-label">{t('adminPages.fleet.totalCategories')}</div>
            <div className="cat-kpi-value">{categories.length}</div>
            <div className="cat-kpi-subtext">{t('adminPages.fleet.totalCategoriesSub')}</div>
          </div>
          <div className="cat-kpi-icon" style={{ backgroundColor: '#F5EEF8', color: '#6C1E84' }}>
            <Tag size={20} />
          </div>
        </div>

        <div className="cat-kpi-card">
          <div className="cat-kpi-content">
            <div className="cat-kpi-label">{t('adminPages.fleet.vehiclesAssigned')}</div>
            <div className="cat-kpi-value">{totalVehiclesCount}</div>
            <div className="cat-kpi-subtext">{t('adminPages.fleet.vehiclesAssignedSub')}</div>
          </div>
          <div className="cat-kpi-icon" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
            <Car size={20} />
          </div>
        </div>

        <div className="cat-kpi-card">
          <div className="cat-kpi-content">
            <div className="cat-kpi-label">{t('adminPages.fleet.avgRate')}</div>
            <div className="cat-kpi-value">{formatMoney(avgBaseRate)}</div>
            <div className="cat-kpi-subtext">{t('adminPages.fleet.avgRateSub')}</div>
          </div>
          <div className="cat-kpi-icon" style={{ backgroundColor: '#FEF8E7', color: '#D97706' }}>
            <Banknote size={20} />
          </div>
        </div>

        <div className="cat-kpi-card">
          <div className="cat-kpi-content">
            <div className="cat-kpi-label">{t('adminPages.fleet.largestCategory')}</div>
            <div className="cat-kpi-value" title={topCategory}>{topCategory}</div>
            <div className="cat-kpi-subtext">{t('adminPages.fleet.largestCategorySub')}</div>
          </div>
          <div className="cat-kpi-icon" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cat-toolbar">
        <div className="cat-toolbar-left">
          <div className="cat-search-box">
            <Search size={16} color="#8A7090" />
            <input
              type="text"
              placeholder={t('adminPages.fleet.searchCategories')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cat-search-input"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A7090', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span className="cat-search-count">
            {t('adminPages.fleet._showingOf', { shown: filteredCategories.length, total: categories.length })}
          </span>
        </div>

        <div className="cat-toolbar-right">
          {/* Sorting */}
          <div className="cat-sort-wrapper">
            <CustomSelect
              size="sm"
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'NAME_ASC', label: t('adminPages.fleet.nameAsc') },
                { value: 'NAME_DESC', label: t('adminPages.fleet.nameDesc') },
                { value: 'RATE_DESC', label: t('adminPages.fleet.rateDesc') },
                { value: 'RATE_ASC', label: t('adminPages.fleet.rateAsc') },
                { value: 'VEHICLES_DESC', label: t('adminPages.fleet.mostVehicles') },
              ]}
            />
          </div>

          {/* View Toggle */}
          <div className="cat-view-toggles">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`cat-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            >
              <List size={15} />
              <span>{t('adminPages.fleet.table')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`cat-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <LayoutGrid size={15} />
              <span>{t('adminPages.fleet.grid')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredCategories.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #EFEAEF',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: '#8A7090',
          }}
        >
          <Tag size={44} style={{ margin: '0 auto 14px', color: '#6C1E84', opacity: 0.7 }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#1E0432', fontWeight: 800 }}>
            {t('adminPages.fleet.noCategories')}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 'clamp(0.82rem, 1.4vw, 0.88rem)' }}>
            {search ? t('adminPages.fleet._noCategoryMatch', { search }) : t('adminPages.fleet.noCategoriesYet')}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6C1E84',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('adminPages.fleet.createFirstCategory')}
          </button>
        </div>
      ) : effectiveViewMode === 'table' ? (
        /* TABLE VIEW (Desktop Only) */
        <div className="cat-table-card">
          <div className="cat-table-scroll">
            <table className="cat-table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>{t('adminPages.fleet.category')}</th>
                  <th style={{ width: '140px' }}>{t('adminPages.fleet.slugIdShort')}</th>
                  <th>{t('adminPages.fleet.descriptionScope')}</th>
                  <th style={{ width: '150px' }}>{t('adminPages.fleet.baseDailyRate')}</th>
                  <th style={{ width: '130px' }}>{t('adminPages.fleet.fleetInventory')}</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>{t('adminPages.fleet.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => {
                  const style = getCategoryColor(cat.name);
                  const count = cat._count?.vehicles || 0;
                  return (
                    <tr key={cat.id} className="cat-table-row">
                      {/* Name & Badge */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: style.bg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            <Tag size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#1E0432', fontSize: 'clamp(0.88rem, 1.4vw, 0.95rem)' }}>
                              {cat.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Slug */}
                      <td>
                        <code
                          style={{
                            fontFamily: 'monospace',
                            backgroundColor: '#F4EEF7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            color: '#6C1E84',
                            fontWeight: 700,
                          }}
                        >
                          {cat.slug}
                        </code>
                      </td>

                      {/* Description - Responsive fluid font & clean line wrap */}
                      <td className="cat-table-desc">
                        {cat.description || <span style={{ color: '#B5A7BC', fontStyle: 'italic' }}>{t('adminPages.fleet.noDescription')}</span>}
                      </td>

                      {/* Base Rate */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#1E0432', fontSize: 'clamp(0.88rem, 1.3vw, 0.95rem)' }}>
                          {formatMoney(Number(cat.baseRate || 0))}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#8A7090' }}>{t('adminPages.fleet.perDayStandard')}</div>
                      </td>

                      {/* Fleet Count */}
                      <td>
                        <Link
                          to={`/admin/cars?category=${encodeURIComponent(cat.id)}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            color: count > 0 ? '#1E0432' : '#8A7090',
                            fontWeight: 700,
                            backgroundColor: count > 0 ? '#F5EEF8' : '#FAF8FB',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: count > 0 ? '#E8DCEE' : '#EFEAEF',
                            fontSize: '0.8rem',
                          }}
                        >
                          <Car size={13} color={count > 0 ? '#6C1E84' : '#8A7090'} />
                          <span>{t('adminPages.fleet._carCount', { count })}</span>
                        </Link>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cat)}
                            title={t('adminPages.fleet.editCategory')}
                            className="cat-action-btn cat-action-btn-edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            title={t('adminPages.fleet.deleteCategory')}
                            className="cat-action-btn cat-action-btn-delete"
                          >
                            <Trash2 size={14} />
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
        /* GRID VIEW */
        <div className="cat-grid">
          {filteredCategories.map((cat) => {
            const style = getCategoryColor(cat.name);
            const count = cat._count?.vehicles || 0;
            return (
              <div key={cat.id} className="cat-card">
                <div>
                  <div className="cat-card-header">
                    <div className="cat-card-title-group">
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: style.bg,
                          color: style.color,
                          border: `1px solid ${style.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Tag size={19} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 className="cat-card-name" title={cat.name}>{cat.name}</h3>
                        <span className="cat-card-slug">{cat.slug}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '4px 9px',
                        borderRadius: '20px',
                        backgroundColor: count > 0 ? '#ECFDF5' : '#F5EEF8',
                        color: count > 0 ? '#065F46' : '#8A7090',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        border: '1px solid',
                        borderColor: count > 0 ? '#A7F3D0' : '#EFEAEF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Car size={12} />
                      <span>{t('adminPages.counts.vehicles', { count })}</span>
                    </div>
                  </div>

                  {/* Responsive Card Description */}
                  <p className="cat-card-desc">
                    {cat.description || t('adminPages.fleet.noCabinDetails')}
                  </p>
                </div>

                <div className="cat-card-footer">
                  <div>
                    <div className="cat-card-rate-label">{t('adminPages.fleet.baseRate')}</div>
                    <div className="cat-card-rate-value">
                      {formatMoney(Number(cat.baseRate || 0))}
                      <span className="cat-card-rate-unit"> {t('adminPages.fleet.perDay')}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid #E5DCE8',
                        color: '#6C1E84',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        minHeight: '36px',
                      }}
                    >
                      <Pencil size={13} />
                      <span>{t('adminPages.fleet.edit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="cat-action-btn cat-action-btn-delete"
                      style={{ width: '36px', height: '36px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div
          className="cat-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) setIsModalOpen(false);
          }}
        >
          <div className="cat-modal-dialog">
            {/* Modal Header */}
            <div className="cat-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#F5EEF8',
                    color: '#6C1E84',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Tag size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'clamp(1rem, 2vw, 1.15rem)', fontWeight: 800, color: '#1E0432' }}>
                    {editId ? t('adminPages.fleet.editCategory') : t('adminPages.fleet.createCategoryTitle')}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#66566A' }}>
                    {editId ? t('adminPages.fleet.editCategorySubtitle') : t('adminPages.fleet.createCategorySubtitle')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8A7090',
                  padding: '6px',
                  borderRadius: '8px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCategory}>
              <div className="cat-modal-body">
                {modalError && (
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#991B1B',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#1E0432',
                      marginBottom: '6px',
                    }}
                  >
                    {t('adminPages.fleet.categoryNameReq')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('adminPages.fleet.categoryPlaceholder')}
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #DED7E2',
                      fontSize: 'clamp(0.85rem, 1.4vw, 0.9rem)',
                      color: '#1E0432',
                      backgroundColor: '#FAF8FB',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Slug */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#1E0432',
                      marginBottom: '6px',
                    }}
                  >
                    {t('adminPages.fleet.slugLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('adminPages.fleet.slugPlaceholder')}
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      height: '42px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #DED7E2',
                      fontSize: 'clamp(0.85rem, 1.4vw, 0.9rem)',
                      color: '#6C1E84',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      backgroundColor: '#FAF8FB',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '0.74rem', color: '#8A7090', marginTop: '4px' }}>
                    {t('adminPages.fleet.slugHelp')}
                  </div>
                </div>

                {/* Base Rate */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#1E0432',
                      marginBottom: '6px',
                    }}
                  >
                    {t('adminPages.fleet._rateLabel', { currency: APP_CURRENCY })}
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '10px',
                      border: '1.5px solid #DED7E2',
                      backgroundColor: '#FAF8FB',
                      overflow: 'hidden',
                      height: '42px',
                    }}
                  >
                    <span
                      style={{
                        padding: '0 12px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: '#6C1E84',
                        backgroundColor: '#F5EEF8',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        borderRight: '1px solid #E5DCE8',
                      }}
                    >
                      {APP_CURRENCY}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      required
                      placeholder="e.g. 15000"
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        outline: 'none',
                        padding: '0 12px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        color: '#1E0432',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#8A7090', marginTop: '4px' }}>
                    {t('adminPages.fleet.rateHelp')}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      color: '#1E0432',
                      marginBottom: '6px',
                    }}
                  >
                    {t('adminPages.fleet.descriptionLabel')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={t('adminPages.fleet.descriptionPlaceholder')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="cat-modal-desc-input"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="cat-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #EFEAEF',
                    backgroundColor: '#FFFFFF',
                    color: '#66566A',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    minHeight: '42px',
                  }}
                >
                  {t('adminPages.fleet.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#FAB826',
                    color: '#1A0322',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(250, 184, 38, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    minHeight: '42px',
                  }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="spin-icon" />
                      <span>{t('adminPages.fleet.saving')}</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>{editId ? t('adminPages.fleet.saveChanges') : t('adminPages.fleet.createCategory')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
