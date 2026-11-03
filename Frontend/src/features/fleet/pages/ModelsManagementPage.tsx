
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
  'Sedan', 'SUV', 'Coupe', 'Convertible', 'Hatchback',
  'Pickup', 'Van', 'Wagon', 'Crossover', 'Electric',
];

const cardStyles = `
.models-page {
  width: 100%;
  max-width: 1440px;
  min-width: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-sizing: border-box;
}
.models-page * { box-sizing: border-box; }

.models-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.models-stat-card {
  min-width: 0;
  background: #fff;
  border: 1px solid #efe aef;
  border: 1.5px solid #EFEAEF;
  border-radius: 16px;
  padding: 20px 22px;
  box-shadow: 0 4px 20px rgba(30,4,38,.03);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.models-stat-label {
  font-size: .78rem;
  font-weight: 750;
  text-transform: uppercase;
  color: #8A7090;
  letter-spacing: .035em;
}
.models-stat-value {
  font-size: 2rem;
  line-height: 1.2;
  font-weight: 800;
  color: #1E0432;
  margin-top: 5px;
}
.models-stat-caption {
  font-size: .78rem;
  color: #6A5672;
  margin-top: 4px;
}
.models-stat-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.models-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: .84rem;
  color: #8A7090;
  margin-bottom: 10px;
}
.models-page-heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 18px;
}
.models-page-title {
  margin: 0;
  color: #1E0432;
  font-size: clamp(1.55rem, 2.4vw, 1.95rem);
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -.02em;
}
.models-page-description {
  margin: 7px 0 0;
  color: #6A5672;
  font-size: .92rem;
  line-height: 1.6;
  max-width: 720px;
}
.fleet-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.fleet-header-action-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: .85rem;
  font-weight: 750;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: background .2s, border-color .2s, transform .2s;
}
.fleet-btn-secondary {
  color: #4A315A;
  background: #fff;
  border: 1.5px solid #E5DFE7;
}
.fleet-btn-secondary:hover { background: #FAF8FB; border-color: #6C1E84; }
.fleet-btn-neutral {
  color: #4A315A;
  background: #F8F5F1;
  border: 1.5px solid #E5DFE7;
}
.fleet-btn-neutral:hover { background: #F0ECE4; }
.fleet-btn-gold {
  color: #1A0322;
  background: #FAB826;
  border: 1.5px solid #FAB826;
  box-shadow: 0 4px 12px rgba(250,184,38,.22);
}
.fleet-btn-gold:hover { background: #F5AD12; }
.fleet-btn-label .label-short { display: none; }

.fleet-filter-bar {
  width: 100%;
  min-width: 0;
  padding: 16px;
  background: #fff;
  border: 1.5px solid #EFEAEF;
  border-radius: 16px;
  box-shadow: 0 2px 10px rgba(30,4,38,.02);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.fleet-filter-search-box { position: relative; width: 100%; min-width: 0; }
.fleet-filter-search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}
.fleet-filter-search-input,
.fleet-form-input {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid #E5DFE7;
  background: #FBF9FC;
  color: #1E0432;
  font: inherit;
  font-size: .9rem;
  outline: none;
  transition: border-color .2s, box-shadow .2s, background .2s;
}
.fleet-filter-search-input { padding-left: 42px; }
.fleet-filter-search-input:focus,
.fleet-form-input:focus {
  border-color: #6C1E84;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(108,30,132,.12);
}
.fleet-filter-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.fleet-filter-grid-models {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  min-width: 0;
}
.fleet-filter-col { min-width: 0; width: 100%; }
.fleet-filter-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding-top: 10px;
  border-top: 1px solid #F3EDF3;
}
.fleet-filter-count-badge {
  color: #8A7090;
  font-size: .82rem;
  font-weight: 750;
}
.fleet-view-toggle {
  display: inline-flex;
  flex-shrink: 0;
  padding: 3px;
  gap: 2px;
  border: 1px solid #E5DFE7;
  border-radius: 10px;
  background: #F3EEF4;
}
.fleet-toggle-btn {
  width: 35px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #8A7090;
  cursor: pointer;
}
.fleet-toggle-btn.active {
  color: #1E0432;
  background: #fff;
  box-shadow: 0 2px 5px rgba(0,0,0,.08);
}

/* Responsive model cards */
.models-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 290px), 1fr));
  gap: 20px;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}
.model-card {
  min-width: 0;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 17px;
  background: #fff;
  border: 1.5px solid #EFEAEF;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(30,4,38,.035);
  transition: border-color .2s, box-shadow .2s, transform .2s;
}
.model-card:hover {
  border-color: #D8C7DF;
  box-shadow: 0 8px 24px rgba(30,4,38,.075);
  transform: translateY(-2px);
}
.model-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.model-card-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.model-card-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  color: #4A315A;
  background: #F7F3F8;
  border: 1px solid #EEE7F0;
  border-radius: 12px;
}
.model-card-icon img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.model-card-heading { min-width: 0; flex: 1; }
.model-card-brand {
  display: block;
  margin-bottom: 4px;
  color: #8A7090;
  font-size: .78rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.model-card-name {
  margin: 0;
  color: #1E0432;
  font-size: 1.08rem;
  line-height: 1.35;
  font-weight: 800;
  overflow-wrap: anywhere;
  word-break: normal;
}
.model-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: .73rem;
  line-height: 1;
  font-weight: 750;
  white-space: nowrap;
}
.model-status-active { color: #065F46; background: #E9F8F0; }
.model-status-inactive { color: #991B1B; background: #FEF0F0; }
.model-status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: 50%;
  background: currentColor;
}
.model-card-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 15px 0;
  border-top: 1px solid #F0EAF1;
  border-bottom: 1px solid #F0EAF1;
}
.model-detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}
.model-detail-label {
  flex-shrink: 0;
  color: #8A7090;
  font-size: .82rem;
  font-weight: 600;
}
.model-body-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 68%;
  padding: 6px 10px;
  color: #4A315A;
  background: #F5EFF7;
  border: 1px solid #E8DDEC;
  border-radius: 8px;
  font-size: .8rem;
  font-weight: 700;
  overflow-wrap: anywhere;
  text-align: right;
}
.model-body-badge svg { color: #B47800; flex-shrink: 0; }
.model-slug {
  min-width: 0;
  max-width: 68%;
  padding: 5px 8px;
  color: #5B416B;
  background: #F7F3F8;
  border-radius: 6px;
  font-family: monospace;
  font-size: .76rem;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: right;
}
.model-created-date {
  color: #4A315A;
  font-size: .82rem;
  font-weight: 650;
  text-align: right;
}
.model-card-actions {
  display: flex;
  align-items: stretch;
  gap: 10px;
  width: 100%;
  margin-top: auto;
}
.model-edit-btn,
.model-delete-btn {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background .18s, border-color .18s;
}
.model-edit-btn {
  flex: 1;
  padding: 10px 14px;
  color: #321443;
  background: #F5EFF7;
  border: 1px solid #E6D9EB;
  font-size: .86rem;
  font-weight: 750;
}
.model-edit-btn:hover { background: #ECE0F1; border-color: #D5C0DF; }
.model-delete-btn {
  width: 46px;
  flex: 0 0 46px;
  padding: 10px;
  color: #DC2626;
  background: #FFF5F5;
  border: 1px solid #FEE2E2;
}
.model-delete-btn:hover { background: #FEE2E2; border-color: #FECACA; }

.models-table-shell {
  min-width: 0;
  overflow: hidden;
  background: #fff;
  border: 1.5px solid #EFEAEF;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(30,4,38,.03);
}
.models-table-scroll { width: 100%; overflow-x: auto; }
.models-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
  text-align: left;
}
.models-table th {
  padding: 14px 20px;
  background: #FBF9FB;
  border-bottom: 1.5px solid #EFEAEF;
  color: #8A7090;
  font-size: .76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  white-space: nowrap;
}
.models-table td { padding: 16px 20px; }
.models-table tbody tr { border-bottom: 1px solid #F3EDF3; }
.models-table tbody tr:last-child { border-bottom: 0; }
.models-table tbody tr:hover { background: #FCFAFC; }
.models-table-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
}
.models-empty-state {
  padding: 54px 20px;
  text-align: center;
  background: #fff;
  border: 1.5px solid #EFEAEF;
  border-radius: 16px;
}
.models-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(28,3,36,.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
}
.models-modal {
  width: 100%;
  max-width: 520px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  padding: 28px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0,0,0,.3);
  animation: modalFadeIn .2s ease-out;
}
@keyframes modalFadeIn {
  from { opacity: 0; transform: translateY(8px) scale(.99); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.models-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10001;
  max-width: calc(100vw - 32px);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 10px 25px rgba(0,0,0,.2);
  overflow-wrap: anywhere;
}
.fleet-form-input { background: #FAF7FA; }
.models-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: 0;
  border-radius: 10px;
  background: #FAB826;
  color: #1A0322;
  font-size: .9rem;
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}
.models-primary-btn:disabled { opacity: .55; cursor: not-allowed; }
.models-secondary-btn {
  padding: 10px 18px;
  border: 1.5px solid #E5DFE7;
  border-radius: 10px;
  background: #fff;
  color: #6A5672;
  font-weight: 700;
  cursor: pointer;
}
.models-close-btn {
  flex-shrink: 0;
  padding: 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8A7090;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .models-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fleet-filter-grid-models { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .models-page { gap: 18px; }
  .models-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .models-stat-card { padding: 15px; border-radius: 13px; gap: 8px; }
  .models-stat-label { font-size: .68rem; }
  .models-stat-value { font-size: 1.65rem; }
  .models-stat-caption { font-size: .7rem; }
  .models-stat-icon { width: 36px; height: 36px; flex-basis: 36px; }
  .models-stat-icon svg { width: 20px; height: 20px; }
  .models-page-heading { flex-direction: column; gap: 14px; }
  .models-page-description { font-size: .86rem; }
  .fleet-header-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    width: 100%;
  }
  .fleet-header-action-btn {
    min-width: 0;
    min-height: 42px;
    width: 100%;
    padding: 8px 5px;
    gap: 5px;
    font-size: .76rem;
  }
  .fleet-header-action-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
  .fleet-filter-bar { padding: 12px; border-radius: 14px; gap: 12px; }
  .fleet-filter-grid-models { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .fleet-filter-search-input { font-size: .85rem; }
  .models-card-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .model-card { padding: 16px; border-radius: 14px; gap: 15px; }
  .model-card:hover { transform: none; }
  .model-card-icon { width: 42px; height: 42px; flex-basis: 42px; }
  .model-card-name { font-size: 1rem; }
  .model-card-details { gap: 13px; padding: 13px 0; }
  .models-modal { padding: 22px; border-radius: 16px; }
  .models-table th, .models-table td { padding: 13px 14px; }
}
@media (max-width: 420px) {
  .models-page { gap: 15px; }
  .models-breadcrumb { gap: 5px; font-size: .75rem; }
  .models-stat-card { padding: 12px 10px; }
  .models-stat-label { font-size: .63rem; }
  .models-stat-value { font-size: 1.45rem; }
  .models-stat-caption { font-size: .66rem; }
  .models-stat-icon { width: 31px; height: 31px; flex-basis: 31px; border-radius: 9px; }
  .models-stat-icon svg { width: 17px; height: 17px; }
  .fleet-header-actions { gap: 5px; }
  .fleet-header-action-btn { padding: 8px 3px; font-size: .7rem; gap: 4px; }
  .fleet-header-action-btn svg { width: 12px; height: 12px; }
  .fleet-filter-grid-models { gap: 6px; }
  .model-card { padding: 13px; gap: 13px; }
  .model-card-header { gap: 7px; }
  .model-card-identity { gap: 8px; }
  .model-card-icon { width: 36px; height: 36px; flex-basis: 36px; padding: 5px; }
  .model-status { gap: 4px; padding: 5px 7px; font-size: .67rem; }
  .model-card-name { font-size: .94rem; }
  .model-detail-row { gap: 8px; }
  .model-detail-label, .model-created-date { font-size: .74rem; }
  .model-slug { font-size: .68rem; }
  .models-modal { padding: 17px; }
  .models-toast { right: 12px; bottom: 12px; }
}
@media (max-width: 360px) {
  .fleet-btn-label .label-full { display: none; }
  .fleet-btn-label .label-short { display: inline; }
  .models-stat-card { gap: 5px; }
  .models-stat-caption { line-height: 1.3; }
}
`;

export function ModelsManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBrandId = searchParams.get('brandId') || 'ALL';
  const { confirm } = useConfirm();

  const [models, setModels] = useState<VehicleModelItem[]>([]);
  const [brands, setBrands] = useState<VehicleBrandItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>(initialBrandId);
  const [selectedBodyTypeFilter, setSelectedBodyTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'BRAND_ASC' | 'NEWEST'>('BRAND_ASC');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 768
  );
  const [isLoading, setIsLoading] = useState(true);

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelEditId, setModelEditId] = useState<string | null>(null);
  const [modelBrandId, setModelBrandId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelBodyType, setModelBodyType] = useState('Sedan');
  const [modelIsActive, setModelIsActive] = useState(true);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timer = window.setTimeout(() => setNotification(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notification]);

  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
  };

  const loadBrands = useCallback(async () => {
    try {
      const res = await fleetApi.getBrands();
      if (res?.brands) setBrands(res.brands);
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fleetApi.getModels({
        search: search.trim() || undefined,
        brandId: selectedBrandFilter === 'ALL' ? undefined : selectedBrandFilter,
        bodyType: selectedBodyTypeFilter === 'ALL' ? undefined : selectedBodyTypeFilter,
        isActive: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE',
      });
      if (res?.models) setModels(res.models);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedBrandFilter, selectedBodyTypeFilter, statusFilter]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadModels(), 200);
    return () => window.clearTimeout(timer);
  }, [loadModels]);

  const handleBrandFilterChange = (brandId: string) => {
    setSelectedBrandFilter(brandId);
    const nextParams = new URLSearchParams(searchParams);
    if (brandId === 'ALL') nextParams.delete('brandId');
    else nextParams.set('brandId', brandId);
    setSearchParams(nextParams);
  };

  const processedModels = useMemo(() => {
    const result = [...models];
    if (sortBy === 'NAME_ASC') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'NAME_DESC') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'BRAND_ASC') {
      result.sort((a, b) => {
        const compare = (a.brand?.name || '').localeCompare(b.brand?.name || '');
        return compare || a.name.localeCompare(b.name);
      });
    } else if (sortBy === 'NEWEST') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return result;
  }, [models, sortBy]);

  const totalModelsCount = models.length;
  const activeModelsCount = models.filter((model) => model.isActive).length;
  const distinctBrandsCount = new Set(models.map((model) => model.brandId)).size;
  const distinctBodyTypesCount = new Set(
    models.map((model) => model.bodyType).filter(Boolean)
  ).size;

  const handleOpenAddModel = () => {
    setModelEditId(null);
    setModelBrandId(
      selectedBrandFilter !== 'ALL' ? selectedBrandFilter : brands[0]?.id || ''
    );
    setModelName('');
    setModelBodyType('Sedan');
    setModelIsActive(true);
    setIsModelModalOpen(true);
  };

  const handleOpenEditModel = (model: VehicleModelItem) => {
    setModelEditId(model.id);
    setModelBrandId(model.brandId);
    setModelName(model.name);
    setModelBodyType(model.bodyType || 'Sedan');
    setModelIsActive(model.isActive ?? true);
    setIsModelModalOpen(true);
  };

  const handleSaveModel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
        showNotification(`Model "${modelName.trim()}" updated successfully`);
      } else {
        await fleetApi.createModel({
          name: modelName.trim(),
          brandId: modelBrandId,
          bodyType: modelBodyType,
        });
        showNotification(`Model "${modelName.trim()}" created successfully`);
      }

      setIsModelModalOpen(false);
      await loadModels();
      await loadBrands();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save model');
    } finally {
      setIsSavingModel(false);
    }
  };

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
      await loadBrands();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete model');
    }
  };

  const brandSelectOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Brands' },
      ...brands.map((brand) => ({
        value: brand.id,
        label: `${brand.name} (${brand.models?.length || 0})`,
      })),
    ],
    [brands]
  );

  const modalBrandOptions = useMemo(
    () => brands.map((brand) => ({ value: brand.id, label: brand.name })),
    [brands]
  );

  const bodyTypeFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Body Types' },
      ...BODY_TYPES.map((bodyType) => ({ value: bodyType, label: bodyType })),
    ],
    []
  );

  const emptyMessage = brands.length === 0
    ? 'You have not registered any brands yet. Please add a brand before creating models.'
    : search.trim() ||
      selectedBrandFilter !== 'ALL' ||
      selectedBodyTypeFilter !== 'ALL' ||
      statusFilter !== 'ALL'
      ? 'No models match your current filters. Try changing your filters or search term.'
      : 'No vehicle models created yet. Click "Add Model" to configure model variants.';

  return (
    <div className="models-page">
      <style>{cardStyles}</style>

      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="models-toast"
          style={{ backgroundColor: notification.type === 'success' ? '#10B981' : '#EF4444' }}
        >
          <Check size={18} />
          {notification.message}
        </div>
      )}

      <header>
        <nav className="models-breadcrumb" aria-label="Breadcrumb">
          <Link to="/admin/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <ChevronRight size={14} />
          <Link to="/admin/cars" style={{ color: 'inherit', textDecoration: 'none' }}>
            Fleet
          </Link>
          <ChevronRight size={14} />
          <span style={{ color: '#1E0432', fontWeight: 750 }}>Models Directory</span>
        </nav>

        <div className="models-page-heading">
          <div style={{ minWidth: 0 }}>
            <h1 className="models-page-title">Vehicle Models</h1>
            <p className="models-page-description">
              Configure specific car models, body styling, and default categories associated with each brand.
            </p>
          </div>

          <div className="fleet-header-actions">
            <Link to="/admin/brands" className="fleet-header-action-btn fleet-btn-secondary">
              <Building2 size={17} />
              <span className="fleet-btn-label">
                <span className="label-full">Manage Brands</span>
                <span className="label-short">Brands</span>
              </span>
            </Link>
            <Link to="/admin/cars/new" className="fleet-header-action-btn fleet-btn-neutral">
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
              <Plus size={16} />
              <span className="fleet-btn-label">
                <span className="label-full">Add Model</span>
                <span className="label-short">Model</span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="models-stats-grid" aria-label="Model statistics">
        <StatCard
          label="Total Models"
          value={totalModelsCount}
          caption="Variants in registry"
          icon={<Layers size={23} />}
          iconColor="#B47800"
          iconBackground="rgba(250,184,38,.15)"
        />
        <StatCard
          label="Active Models"
          value={activeModelsCount}
          caption="Eligible for inventory"
          icon={<CheckCircle2 size={23} />}
          iconColor="#10B981"
          iconBackground="rgba(16,185,129,.1)"
        />
        <StatCard
          label="Brands Represented"
          value={distinctBrandsCount}
          caption="Brands with models"
          icon={<Building2 size={23} />}
          iconColor="#1E0432"
          iconBackground="rgba(30,4,50,.05)"
        />
        <StatCard
          label="Body Styles"
          value={distinctBodyTypesCount}
          caption="Sedan, SUV, Coupe, etc."
          icon={<Car size={23} />}
          iconColor="#8B5CF6"
          iconBackground="rgba(139,92,246,.1)"
        />
      </section>

      <section className="fleet-filter-bar" aria-label="Model filters">
        <div className="fleet-filter-search-box">
          <Search size={18} color="#8A7090" className="fleet-filter-search-icon" />
          <input
            type="search"
            placeholder="Search models by name or body style..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="fleet-filter-search-input"
            aria-label="Search vehicle models"
          />
        </div>

        <div className="fleet-filter-controls">
          <div className="fleet-filter-grid-models">
            <div className="fleet-filter-col">
              <CustomSelect
                value={selectedBrandFilter}
                onChange={handleBrandFilterChange}
                options={brandSelectOptions}
                size="sm"
                searchable
                searchPlaceholder="Search brand..."
                fullWidth
              />
            </div>
            <div className="fleet-filter-col">
              <CustomSelect
                value={selectedBodyTypeFilter}
                onChange={setSelectedBodyTypeFilter}
                options={bodyTypeFilterOptions}
                size="sm"
                searchable
                searchPlaceholder="Search body style..."
                fullWidth
              />
            </div>
            <div className="fleet-filter-col">
              <CustomSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Inactive' },
                ]}
                size="sm"
                fullWidth
              />
            </div>
            <div className="fleet-filter-col">
              <CustomSelect
                value={sortBy}
                onChange={(value) => setSortBy(value as 'NAME_ASC' | 'NAME_DESC' | 'BRAND_ASC' | 'NEWEST')}
                options={[
                  { value: 'BRAND_ASC', label: 'Sort: Brand (A-Z)' },
                  { value: 'NAME_ASC', label: 'Sort: Model (A-Z)' },
                  { value: 'NAME_DESC', label: 'Sort: Model (Z-A)' },
                  { value: 'NEWEST', label: 'Sort: Recently Added' },
                ]}
                size="sm"
                fullWidth
              />
            </div>
          </div>

          <div className="fleet-filter-actions">
            <span className="fleet-filter-count-badge">
              {processedModels.length} {processedModels.length === 1 ? 'model' : 'models'}
            </span>
            {!isMobile && (
              <div className="fleet-view-toggle" aria-label="View mode">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                  className={`fleet-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                >
                  <List size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="Grid Card View"
                  aria-label="Grid card view"
                  aria-pressed={viewMode === 'grid'}
                  className={`fleet-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                >
                  <LayoutGrid size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="models-empty-state" role="status">
          <div style={{ color: '#8A7090', fontWeight: 650 }}>Loading vehicle models...</div>
        </div>
      ) : processedModels.length === 0 ? (
        <div className="models-empty-state">
          <div
            style={{
              width: 62,
              height: 62,
              margin: '0 auto 14px',
              borderRadius: '50%',
              background: '#F8F5F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8A7090',
            }}
          >
            <Layers size={29} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1E0432', fontWeight: 800 }}>
            No Models Found
          </h3>
          <p style={{ margin: '10px auto 0', color: '#6A5672', maxWidth: 440, fontSize: '.9rem', lineHeight: 1.6 }}>
            {emptyMessage}
          </p>
          {brands.length === 0 ? (
            <Link to="/admin/brands" className="models-primary-btn" style={{ marginTop: 18 }}>
              <Plus size={16} /> Create First Brand
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddModel}
              className="models-primary-btn"
              style={{ marginTop: 18 }}
            >
              <Plus size={16} /> Create First Model
            </button>
          )}
        </div>
      ) : effectiveViewMode === 'table' ? (
        <div className="models-table-shell">
          <div className="models-table-scroll">
            <table className="models-table">
              <thead>
                <tr>
                  <th>Model Specification</th>
                  <th>Manufacturer / Brand</th>
                  <th>Body Style</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedModels.map((model) => (
                  <tr key={model.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            flex: '0 0 38px',
                            borderRadius: 9,
                            background: '#F7F3F8',
                            border: '1px solid #EFEAEF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#1E0432',
                          }}
                        >
                          <Car size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, color: '#1E0432', fontSize: '.95rem' }}>
                            {model.name}
                          </div>
                          <div style={{ fontSize: '.77rem', color: '#8A7090', marginTop: 3 }}>
                            Added {new Date(model.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        {model.brand?.logoUrl && (
                          <div
                            style={{
                              width: 29,
                              height: 29,
                              flex: '0 0 29px',
                              padding: 3,
                              borderRadius: 6,
                              border: '1px solid #EFEAEF',
                            }}
                          >
                            <img
                              src={model.brand.logoUrl}
                              alt={`${model.brand.name || 'Brand'} logo`}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 750, color: '#1E0432', fontSize: '.9rem' }}>
                            {model.brand?.name || 'Unknown'}
                          </div>
                          {model.brand?.country && (
                            <div style={{ fontSize: '.76rem', color: '#8A7090' }}>
                              {model.brand.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="model-body-badge" style={{ maxWidth: 'none' }}>
                        <Tag size={12} />
                        {model.bodyType || 'Sedan'}
                      </span>
                    </td>
                    <td>
                      <code className="model-slug" style={{ maxWidth: 'none', textAlign: 'left' }}>
                        {model.slug}
                      </code>
                    </td>
                    <td>
                      <span className={`model-status ${model.isActive ? 'model-status-active' : 'model-status-inactive'}`}>
                        <span className="model-status-dot" />
                        {model.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModel(model)}
                          title={`Edit ${model.name}`}
                          aria-label={`Edit ${model.name}`}
                          className="models-table-action"
                          style={{ background: '#F3EEF4', border: '1px solid #E5DFE7', color: '#1E0432' }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteModel(model)}
                          title={`Delete ${model.name}`}
                          aria-label={`Delete ${model.name}`}
                          className="models-table-action"
                          style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#DC2626' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="models-card-grid">
          {processedModels.map((model) => (
            <article key={model.id} className="model-card">
              <div className="model-card-header">
                <div className="model-card-identity">
                  <div className="model-card-icon">
                    {model.brand?.logoUrl ? (
                      <img
                        src={model.brand.logoUrl}
                        alt={`${model.brand.name || 'Brand'} logo`}
                      />
                    ) : (
                      <Car size={23} />
                    )}
                  </div>
                  <div className="model-card-heading">
                    <span className="model-card-brand">
                      {model.brand?.name || 'Unknown Brand'}
                    </span>
                    <h3 className="model-card-name" title={model.name}>
                      {model.name}
                    </h3>
                  </div>
                </div>
                <span className={`model-status ${model.isActive ? 'model-status-active' : 'model-status-inactive'}`}>
                  <span className="model-status-dot" />
                  {model.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="model-card-details">
                <div className="model-detail-row">
                  <span className="model-detail-label">Body style</span>
                  <span className="model-body-badge">
                    <Tag size={13} />
                    {model.bodyType || 'Sedan'}
                  </span>
                </div>
                <div className="model-detail-row">
                  <span className="model-detail-label">Model slug</span>
                  <code className="model-slug" title={model.slug}>{model.slug}</code>
                </div>
                <div className="model-detail-row">
                  <span className="model-detail-label">Date added</span>
                  <span className="model-created-date">
                    {new Date(model.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {model.brand?.country && (
                  <div className="model-detail-row">
                    <span className="model-detail-label">Country</span>
                    <span className="model-created-date">{model.brand.country}</span>
                  </div>
                )}
              </div>

              <div className="model-card-actions">
                <button
                  type="button"
                  onClick={() => handleOpenEditModel(model)}
                  className="model-edit-btn"
                >
                  <Pencil size={15} /> Edit model
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteModel(model)}
                  className="model-delete-btn"
                  title={`Delete ${model.name}`}
                  aria-label={`Delete ${model.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModelModalOpen && (
        <div
          className="models-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSavingModel) {
              setIsModelModalOpen(false);
            }
          }}
        >
          <div
            className="models-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-modal-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 22 }}>
              <div style={{ minWidth: 0 }}>
                <h2 id="model-modal-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1E0432' }}>
                  {modelEditId ? 'Edit Vehicle Model' : 'Add Vehicle Model'}
                </h2>
                <p style={{ margin: '5px 0 0', color: '#6A5672', fontSize: '.85rem', lineHeight: 1.5 }}>
                  {modelEditId
                    ? 'Update model specifications and body classification'
                    : 'Create a new model variant under a manufacturer'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(false)}
                className="models-close-btn"
                aria-label="Close dialog"
                disabled={isSavingModel}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModel} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 750, color: '#1E0432', marginBottom: 7 }}>
                  Manufacturer / Brand <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <CustomSelect
                  value={modelBrandId}
                  onChange={setModelBrandId}
                  options={modalBrandOptions}
                  placeholder="Select a brand..."
                  fullWidth
                  searchable
                  searchPlaceholder="Search brand..."
                />
              </div>

              <div>
                <label htmlFor="model-name" style={{ display: 'block', fontSize: '.85rem', fontWeight: 750, color: '#1E0432', marginBottom: 7 }}>
                  Model Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  id="model-name"
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Camry, Model 3, X5, Mustang"
                  value={modelName}
                  onChange={(event) => setModelName(event.target.value)}
                  className="fleet-form-input"
                />
                {modelName.trim() && (
                  <div style={{ fontSize: '.77rem', color: '#8A7090', marginTop: 5, overflowWrap: 'anywhere' }}>
                    Slug: <code style={{ color: '#1E0432' }}>{modelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}</code>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.85rem', fontWeight: 750, color: '#1E0432', marginBottom: 7 }}>
                  Body Style
                </label>
                <CustomSelect
                  value={modelBodyType}
                  onChange={setModelBodyType}
                  options={BODY_TYPES.map((bodyType) => ({ value: bodyType, label: bodyType }))}
                  fullWidth
                  searchable
                  searchPlaceholder="Search body style..."
                />
              </div>

              {Boolean(modelEditId) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', background: '#FAF7FA', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 750, fontSize: '.9rem', color: '#1E0432' }}>Active Model</div>
                    <div style={{ fontSize: '.77rem', color: '#8A7090', lineHeight: 1.5 }}>
                      Available for fleet inventory assignment
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={modelIsActive}
                    onChange={(event) => setModelIsActive(event.target.checked)}
                    aria-label="Model is active"
                    style={{ width: 20, height: 20, flexShrink: 0, accentColor: '#1E0432', cursor: 'pointer' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setIsModelModalOpen(false)}
                  className="models-secondary-btn"
                  disabled={isSavingModel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="models-primary-btn"
                  disabled={isSavingModel || !modelName.trim() || !modelBrandId}
                >
                  <Plus size={16} />
                  {isSavingModel ? 'Saving...' : modelEditId ? 'Update Model' : 'Create Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  caption,
  icon,
  iconColor,
  iconBackground,
}: {
  label: string;
  value: number;
  caption: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBackground: string;
}) {
  return (
    <article className="models-stat-card">
      <div style={{ minWidth: 0 }}>
        <div className="models-stat-label">{label}</div>
        <div className="models-stat-value">{value}</div>
        <div className="models-stat-caption">{caption}</div>
      </div>
      <div
        className="models-stat-icon"
        style={{ color: iconColor, backgroundColor: iconBackground }}
      >
        {icon}
      </div>
    </article>
  );
}

export default ModelsManagementPage;
