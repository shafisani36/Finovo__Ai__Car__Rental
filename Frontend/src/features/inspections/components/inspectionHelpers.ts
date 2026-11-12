import {
  INSPECTION_VIEWS,
  REQUIRED_VIEWS,
  type ComparisonClassification,
  type InspectionView,
} from '../api/inspectionApi';

export type CapturedPhotos = Partial<Record<InspectionView, string>>;

export const VIEW_LABELS: Record<InspectionView, string> = {
  FRONT: 'Front',
  DRIVER_SIDE: 'Driver side (left)',
  PASSENGER_SIDE: 'Passenger side (right)',
  REAR: 'Rear',
  ROOF: 'Roof',
  INTERIOR: 'Interior',
};

export const CLASSIFICATION_LABEL: Record<ComparisonClassification, string> = {
  PRE_EXISTING_UNCHANGED: 'Pre-existing',
  PRE_EXISTING_WORSENED: 'Worsened',
  CONFIRMED_NEW_DAMAGE: 'New damage',
  POSSIBLY_NEW_DAMAGE: 'Needs review',
  INCONCLUSIVE: 'Needs review',
};

export function missingRequiredViews(photos: CapturedPhotos): InspectionView[] {
  return REQUIRED_VIEWS.filter((v) => !photos[v]);
}

export function toAnalyzePhotos(photos: CapturedPhotos) {
  return INSPECTION_VIEWS.filter((v) => photos[v]).map((view) => ({ view, imageData: photos[view]! }));
}
