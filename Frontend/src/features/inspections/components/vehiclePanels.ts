import type { InspectionView, ReportSection } from '../api/inspectionApi';

/** Shape of a panel on the top-view car diagram (viewBox 0 0 300 560, front of the car at the top). */
export interface PanelShape {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

export interface PanelInfo {
  section: ReportSection;
  /** Photo angles this panel is visible from, best first */
  views: InspectionView[];
  /** Interior panels are not drawn on the exterior diagram */
  shape?: PanelShape;
}

/** Same panel list as the backend. LEFT is the driver side, drawn on the left with the front at the top. */
export const VEHICLE_PANELS: Record<string, PanelInfo> = {
  FRONT_BUMPER: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'], shape: { x: 62, y: 18, width: 176, height: 30, rx: 14 } },
  GRILLE: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'], shape: { x: 112, y: 52, width: 76, height: 14, rx: 4 } },
  HOOD: { section: 'EXTERIOR', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'], shape: { x: 82, y: 70, width: 136, height: 100, rx: 10 } },
  WINDSHIELD: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_LEFT', 'FRONT_RIGHT'], shape: { x: 92, y: 174, width: 116, height: 40, rx: 8 } },
  ROOF: { section: 'EXTERIOR', views: ['ROOF'], shape: { x: 96, y: 218, width: 108, height: 140, rx: 8 } },
  REAR_WINDOW: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'], shape: { x: 92, y: 362, width: 116, height: 36, rx: 8 } },
  TRUNK: { section: 'EXTERIOR', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'], shape: { x: 82, y: 402, width: 136, height: 76, rx: 10 } },
  REAR_BUMPER: { section: 'EXTERIOR', views: ['REAR', 'REAR_LEFT', 'REAR_RIGHT'], shape: { x: 62, y: 500, width: 176, height: 30, rx: 14 } },
  LEFT_HEADLIGHT: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_LEFT'], shape: { x: 64, y: 52, width: 42, height: 14, rx: 6 } },
  RIGHT_HEADLIGHT: { section: 'GLASS_LIGHTS', views: ['FRONT', 'FRONT_RIGHT'], shape: { x: 194, y: 52, width: 42, height: 14, rx: 6 } },
  LEFT_TAILLIGHT: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_LEFT'], shape: { x: 64, y: 482, width: 42, height: 14, rx: 6 } },
  RIGHT_TAILLIGHT: { section: 'GLASS_LIGHTS', views: ['REAR', 'REAR_RIGHT'], shape: { x: 194, y: 482, width: 42, height: 14, rx: 6 } },
  LEFT_FRONT_FENDER: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT'], shape: { x: 46, y: 70, width: 32, height: 100, rx: 8 } },
  LEFT_FRONT_DOOR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT'], shape: { x: 46, y: 174, width: 32, height: 108, rx: 6 } },
  LEFT_REAR_DOOR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'REAR_LEFT'], shape: { x: 46, y: 286, width: 32, height: 108, rx: 6 } },
  LEFT_REAR_QUARTER: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'REAR_LEFT'], shape: { x: 46, y: 398, width: 32, height: 80, rx: 8 } },
  LEFT_SIDE_SKIRT: { section: 'EXTERIOR', views: ['DRIVER_SIDE'], shape: { x: 34, y: 174, width: 9, height: 220, rx: 4 } },
  LEFT_MIRROR: { section: 'EXTERIOR', views: ['DRIVER_SIDE', 'FRONT_LEFT', 'FRONT'], shape: { x: 16, y: 182, width: 26, height: 16, rx: 6 } },
  LEFT_WINDOWS: { section: 'GLASS_LIGHTS', views: ['DRIVER_SIDE'], shape: { x: 82, y: 218, width: 11, height: 140, rx: 4 } },
  RIGHT_FRONT_FENDER: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT'], shape: { x: 222, y: 70, width: 32, height: 100, rx: 8 } },
  RIGHT_FRONT_DOOR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT'], shape: { x: 222, y: 174, width: 32, height: 108, rx: 6 } },
  RIGHT_REAR_DOOR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'REAR_RIGHT'], shape: { x: 222, y: 286, width: 32, height: 108, rx: 6 } },
  RIGHT_REAR_QUARTER: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'REAR_RIGHT'], shape: { x: 222, y: 398, width: 32, height: 80, rx: 8 } },
  RIGHT_SIDE_SKIRT: { section: 'EXTERIOR', views: ['PASSENGER_SIDE'], shape: { x: 257, y: 174, width: 9, height: 220, rx: 4 } },
  RIGHT_MIRROR: { section: 'EXTERIOR', views: ['PASSENGER_SIDE', 'FRONT_RIGHT', 'FRONT'], shape: { x: 258, y: 182, width: 26, height: 16, rx: 6 } },
  RIGHT_WINDOWS: { section: 'GLASS_LIGHTS', views: ['PASSENGER_SIDE'], shape: { x: 207, y: 218, width: 11, height: 140, rx: 4 } },
  LEFT_FRONT_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_FRONT_LEFT', 'DRIVER_SIDE', 'FRONT_LEFT'], shape: { x: 20, y: 92, width: 22, height: 58, rx: 8 } },
  LEFT_REAR_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_REAR_LEFT', 'DRIVER_SIDE', 'REAR_LEFT'], shape: { x: 20, y: 408, width: 22, height: 58, rx: 8 } },
  RIGHT_FRONT_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_FRONT_RIGHT', 'PASSENGER_SIDE', 'FRONT_RIGHT'], shape: { x: 258, y: 92, width: 22, height: 58, rx: 8 } },
  RIGHT_REAR_WHEEL: { section: 'WHEELS_TYRES', views: ['WHEEL_REAR_RIGHT', 'PASSENGER_SIDE', 'REAR_RIGHT'], shape: { x: 258, y: 408, width: 22, height: 58, rx: 8 } },
  SEATS: { section: 'INTERIOR', views: ['INTERIOR'] },
  DASHBOARD: { section: 'INTERIOR', views: ['INTERIOR'] },
  STEERING_WHEEL: { section: 'INTERIOR', views: ['INTERIOR'] },
  DOOR_TRIMS: { section: 'INTERIOR', views: ['INTERIOR'] },
  HEADLINER: { section: 'INTERIOR', views: ['INTERIOR'] },
  CARPETS: { section: 'INTERIOR', views: ['INTERIOR'] },
};

export const REPORT_SECTIONS: ReportSection[] = ['EXTERIOR', 'GLASS_LIGHTS', 'WHEELS_TYRES', 'INTERIOR'];

export const SEVERITY_COLOR: Record<string, string> = {
  LOW: '#CA8A04',
  MEDIUM: '#EA580C',
  HIGH: '#DC2626',
  EXTREME: '#7F1D1D',
};

/** Category letter used in the diagram codes, e.g. D3 = high dent. */
export const CATEGORY_CODES: Array<[string, string]> = [
  ['S', 'SCRATCH'],
  ['D', 'DENT'],
  ['C', 'PAINT_CHIP'],
  ['K', 'CRACK'],
  ['B', 'BROKEN_PART'],
  ['P', 'PAINT_MARKED'],
  ['R', 'RUST'],
];
