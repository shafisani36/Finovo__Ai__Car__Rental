import React, { useRef, useState } from 'react';
import type { VehiclePhotoInput } from '../types/fleet.types';
import {
  Upload,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import { CustomSelect } from '../../../components/common/CustomSelect';

export interface VehiclePhotoPipelineProps {
  photos: VehiclePhotoInput[];
  onChange: (photos: VehiclePhotoInput[]) => void;
  minPhotos?: number;
  maxPhotos?: number;
  disabled?: boolean;
}

const DEFAULT_PERSPECTIVES = [
  'Front 3/4 Perspective',
  'Rear 3/4 Perspective',
  'Interior Cabin & Dashboard',
  'Trunk & Cargo Space',
  'Driver Side Profile',
  'Passenger Side Profile',
];

export function VehiclePhotoPipeline({
  photos,
  onChange,
  minPhotos = 4,
  maxPhotos = 6,
  disabled = false,
}: VehiclePhotoPipelineProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const count = photos.length;
  const isCompliant = count >= minPhotos && count <= maxPhotos;
  const isBelowMin = count < minPhotos;
  const neededPhotos = Math.max(0, minPhotos - count);

  const handleFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);

    if (photos.length + fileArray.length > maxPhotos) {
      setUploadError(
        `Cannot upload more than ${maxPhotos} photos. You currently have ${photos.length}. You can only add ${maxPhotos - photos.length
        } more.`
      );
      return;
    }

    const validFiles = fileArray.filter((file) => {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/)) {
        setUploadError(`File "${file.name}" is not a supported format. Please upload JPEG, PNG, or WEBP.`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds 10MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    let pendingReads = validFiles.length;
    const newItems: VehiclePhotoInput[] = [];

    validFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const nextIndex = photos.length + idx;
          const defaultCaption =
            DEFAULT_PERSPECTIVES[nextIndex] || `Vehicle Inspection Angle ${nextIndex + 1}`;

          newItems.push({
            data: reader.result,
            url: reader.result,
            caption: defaultCaption,
            isPrimary: photos.length === 0 && idx === 0,
            order: nextIndex,
          });
        }
        pendingReads -= 1;
        if (pendingReads === 0) {
          const updated = [...photos, ...newItems].slice(0, maxPhotos);
          // If no primary exists, set index 0 as primary
          if (!updated.some((p) => p.isPrimary) && updated.length > 0) {
            updated[0].isPrimary = true;
          }
          onChange(updated);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const setPrimary = (index: number) => {
    const updated = photos.map((p, i) => ({
      ...p,
      isPrimary: i === index,
    }));
    onChange(updated);
  };

  const updateCaption = (index: number, caption: string) => {
    const updated = photos.map((p, i) => (i === index ? { ...p, caption } : p));
    onChange(updated);
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const updated = [...photos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  return (
    <div className="car-card-section vehicle-photo-card">
      {/* Header & Status Indicator */}
      <div className="car-card-header">
        <div className="car-card-header-left">
          <div className="car-card-icon-badge">
            <Camera size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="car-card-title">5. Mandatory Inspection Photos</h2>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: isCompliant ? '#DEF7EC' : '#FDF2F2',
                  color: isCompliant ? '#03543F' : '#9B1C1C',
                  border: isCompliant ? '1px solid #A7F3D0' : '1px solid #F8B4B4',
                }}
              >
                {isCompliant ? '✓ 4–6 Photos Met' : 'Strict 4–6 Photos'}
              </span>
            </div>
            <p className="car-card-subtitle">
              Upload minimum 4 and maximum 6 high-resolution vehicle views (Front, Rear, Interior & Side)
            </p>
          </div>
        </div>

        {/* Upload Inspection Photos Trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || photos.length >= maxPhotos}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FAF8FB',
            color: '#6C1E84',
            border: '1.5px solid #E3D9E5',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: disabled || photos.length >= maxPhotos ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          title="Upload new vehicle inspection photos"
        >
          <Upload size={14} />
          <span>Upload Photos</span>
        </button>
      </div>

      {/* Compliance Meter */}
      <div
        style={{
          backgroundColor: isCompliant ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${isCompliant ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.35)'}`,
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isCompliant ? (
            <ShieldCheck size={20} color="#059669" />
          ) : (
            <AlertTriangle size={20} color="#D97706" />
          )}
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: isCompliant ? '#065F46' : '#92400E',
            }}
          >
            {isCompliant
              ? `Compliance Verified: ${count} of 4 minimum photos attached (maximum ${maxPhotos}).`
              : `Action Required: Please upload ${neededPhotos} more photo${neededPhotos > 1 ? 's' : ''
              } to meet minimum compliance.`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '120px',
              height: '8px',
              borderRadius: '999px',
              backgroundColor: '#E5DFE7',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (count / minPhotos) * 100)}%`,
                backgroundColor: isCompliant ? '#10B981' : '#F59E0B',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1A0322' }}>
            {count}/{maxPhotos}
          </span>
        </div>
      </div>

      {uploadError && (
        <div
          style={{
            backgroundColor: '#FDF2F2',
            border: '1px solid #F8B4B4',
            color: '#9B1C1C',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}
        >
          {uploadError}
        </div>
      )}

      {/* Grid of Uploaded Photos */}
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {photos.map((photo, index) => {
            const displayUrl = photo.url || photo.data || '';
            const isPrimary = Boolean(photo.isPrimary);

            return (
              <div
                key={index}
                style={{
                  borderRadius: '14px',
                  border: isPrimary ? '2px solid #FAB826' : '1px solid #ECE7ED',
                  backgroundColor: '#FAF9FB',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: isPrimary
                    ? '0 4px 16px rgba(250, 184, 38, 0.25)'
                    : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s',
                }}
              >
                {/* Image Container */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '150px',
                    backgroundColor: '#1E0528',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={displayUrl}
                    alt={photo.caption || `Vehicle view ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />

                  {/* Primary Badge */}
                  {isPrimary && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        backgroundColor: '#FAB826',
                        color: '#1A0322',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >
                      <Star size={12} fill="#1A0322" />
                      <span>PRIMARY COVER</span>
                    </div>
                  )}

                  {/* Index Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backdropFilter: 'blur(4px)',
                    }}
                  >
                    #{index + 1}
                  </div>
                </div>

                {/* Perspective & Actions */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Perspective Selector */}
                  <div>
                    <label
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: '#66566A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Perspective Angle
                    </label>
                    <CustomSelect
                      size="sm"
                      value={photo.caption || 'Front 3/4 Perspective'}
                      onChange={(val) => updateCaption(index, val)}
                      disabled={disabled}
                      options={[
                        ...DEFAULT_PERSPECTIVES.map((persp) => ({ value: persp, label: persp })),
                        { value: 'Engine Bay', label: 'Engine Bay' },
                        { value: 'Wheel & Tire Detail', label: 'Wheel & Tire Detail' },
                        { value: 'Undercarriage', label: 'Undercarriage' },
                        { value: 'Custom Inspection Angle', label: 'Custom Inspection Angle' },
                      ]}
                    />
                  </div>

                  {/* Controls: Make Primary, Reorder, Delete */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid #ECE7ED',
                    }}
                  >
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => setPrimary(index)}
                        disabled={disabled}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6C1E84',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0,
                        }}
                      >
                        <Star size={13} />
                        <span>Set Primary</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                        Active Cover
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'left')}
                        disabled={disabled || index === 0}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #DED7E2',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.4 : 1,
                        }}
                        title="Move left"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'right')}
                        disabled={disabled || index === photos.length - 1}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #DED7E2',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: index === photos.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === photos.length - 1 ? 0.4 : 1,
                        }}
                        title="Move right"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        disabled={disabled}
                        style={{
                          background: '#FDF2F2',
                          border: '1px solid #F8B4B4',
                          color: '#DC2626',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        title="Remove photo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {count < maxPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragActive ? '#6C1E84' : isBelowMin ? '#FAB826' : '#DED7E2'}`,
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            backgroundColor: dragActive
              ? 'rgba(108, 30, 132, 0.05)'
              : isBelowMin
                ? 'rgba(250, 184, 38, 0.04)'
                : '#FAF9FB',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files) {
                handleFiles(e.target.files);
              }
            }}
          />

          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: '#F5EEF8',
              color: '#6C1E84',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Upload size={24} />
          </div>

          <div style={{ fontSize: '0.95rem', color: '#1A0322', fontWeight: 700, marginBottom: '4px' }}>
            Click or drag & drop vehicle photos here
          </div>

          <div style={{ fontSize: '0.8125rem', color: '#8A7090', marginBottom: '12px' }}>
            JPEG, PNG, or WEBP (Max 10MB per file). You can upload up to{' '}
            <strong>{maxPhotos - count}</strong> more photo{maxPhotos - count !== 1 ? 's' : ''}.
          </div>

          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#FFFFFF',
              color: '#1E0426',
              border: '1.5px solid #DED7E2',
              borderRadius: '20px',
              padding: '6px 18px',
              fontSize: '0.8125rem',
              fontWeight: 700,
            }}
          >
            Browse files from device
          </div>
        </div>
      )}
    </div>
  );
}
