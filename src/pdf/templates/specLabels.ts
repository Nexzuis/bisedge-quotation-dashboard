/**
 * Specification Label Mappings
 * Maps spec codes to human-readable labels
 */

export const SPEC_LABELS: Record<string, string> = {
  // General
  '1100': 'Forklift Type',
  '1150': 'Manufacturer',

  // Load Capacity
  '2100': 'Load Capacity (kg)',
  '2200': 'Load Capacity at 600mm (kg)',
  '2300': 'Load Centre (mm)',
  '2310': 'Load Centre Distance (mm)',

  // Lift Heights
  '3200': 'Standard Lift Height (mm)',
  '3400': 'Maximum Lift Height (mm)',
  '3500': 'Free Lift Height (mm)',
  '3510': 'Free Lift (mm)',
  '3520': 'Collapsed Height (mm)',

  // Fork Dimensions
  '3600': 'Fork Length (mm)',
  '3610': 'Fork Width (mm)',
  '3620': 'Fork Thickness (mm)',

  // Overall Dimensions
  '4400': 'Overall Length (mm)',
  '4410': 'Overall Width (mm)',
  '4420': 'Overall Height (mm)',
  '4500': 'Wheelbase (mm)',
  '4600': 'Turning Radius (mm)',
  '4700': 'Aisle Width (mm)',

  // Weights
  '5000': 'Service Weight (kg)',
  '5100': 'Axle Load (Front/Rear) (kg)',

  // Performance
  '6000': 'Travel Speed (Loaded) (km/h)',
  '6010': 'Travel Speed (Unloaded) (km/h)',
  '6100': 'Lift Speed (Loaded) (m/s)',
  '6110': 'Lift Speed (Unloaded) (m/s)',
  '6200': 'Lowering Speed (m/s)',
  '6300': 'Gradeability (Loaded) (%)',
  '6310': 'Gradeability (Unloaded) (%)',

  // Tires
  '8000': 'Tire Type',
  '8010': 'Tire Size (Front)',
  '8020': 'Tire Size (Rear)',

  // Drive & Motor
  '9100': 'Drive Motor Power (kW)',
  '9200': 'Lift Motor Power (kW)',
  '9300': 'Hydraulic Pump (l/min)',

  // Battery (for electric models)
  'battery.type': 'Battery Type',
  'battery.voltage': 'Battery Voltage (V)',
  'battery.capacity': 'Battery Capacity (Ah)',
  'battery.weight': 'Battery Weight (kg)',
  'battery.dimensions': 'Battery Dimensions (mm)',

  // Engine (for IC models)
  'engine.type': 'Engine Type',
  'engine.power': 'Engine Power (kW)',
  'engine.displacement': 'Engine Displacement (cc)',
  'engine.fuel': 'Fuel Type',

  // Mast
  'mast.type': 'Mast Type',
  'mast.stages': 'Mast Stages',
  'mast.tilt.forward': 'Mast Tilt Forward (degrees)',
  'mast.tilt.backward': 'Mast Tilt Backward (degrees)',
};

/**
 * Get label for spec code, fallback to code if not found
 */
export function getSpecLabel(code: string): string {
  return SPEC_LABELS[code] || code;
}

/**
 * Organize specs into logical sections
 */
export interface SpecSection {
  title: string;
  specs: Array<{ code: string; label: string; value: string }>;
}

export function organizeSpecs(specifications: Record<string, string>): SpecSection[] {
  const sections: SpecSection[] = [];

  // General Information
  const general = Object.entries(specifications)
    .filter(([code]) => code.startsWith('11'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (general.length > 0) {
    sections.push({ title: 'General Information', specs: general });
  }

  // Load Capacity
  const loadCapacity = Object.entries(specifications)
    .filter(([code]) => code.startsWith('2'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (loadCapacity.length > 0) {
    sections.push({ title: 'Load Capacity', specs: loadCapacity });
  }

  // Lift Heights & Forks
  const liftHeight = Object.entries(specifications)
    .filter(([code]) => code.startsWith('3'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (liftHeight.length > 0) {
    sections.push({ title: 'Lift Heights & Fork Dimensions', specs: liftHeight });
  }

  // Dimensions
  const dimensions = Object.entries(specifications)
    .filter(([code]) => code.startsWith('4'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (dimensions.length > 0) {
    sections.push({ title: 'Overall Dimensions', specs: dimensions });
  }

  // Weights
  const weights = Object.entries(specifications)
    .filter(([code]) => code.startsWith('5'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (weights.length > 0) {
    sections.push({ title: 'Weights', specs: weights });
  }

  // Performance
  const performance = Object.entries(specifications)
    .filter(([code]) => code.startsWith('6'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (performance.length > 0) {
    sections.push({ title: 'Performance', specs: performance });
  }

  // Tires
  const tires = Object.entries(specifications)
    .filter(([code]) => code.startsWith('8'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (tires.length > 0) {
    sections.push({ title: 'Tires', specs: tires });
  }

  // Drive & Motor
  const drive = Object.entries(specifications)
    .filter(([code]) => code.startsWith('9'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (drive.length > 0) {
    sections.push({ title: 'Drive & Motor', specs: drive });
  }

  // Battery/Engine
  const battery = Object.entries(specifications)
    .filter(([code]) => code.startsWith('battery.') || code.startsWith('engine.'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (battery.length > 0) {
    sections.push({ title: 'Power Source', specs: battery });
  }

  // Mast
  const mast = Object.entries(specifications)
    .filter(([code]) => code.startsWith('mast.'))
    .map(([code, value]) => ({ code, label: getSpecLabel(code), value }));
  if (mast.length > 0) {
    sections.push({ title: 'Mast Specifications', specs: mast });
  }

  return sections;
}
