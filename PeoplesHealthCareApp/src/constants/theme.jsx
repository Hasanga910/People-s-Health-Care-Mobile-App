// Matches the web app's per-role color palettes
export const COLORS = {
  doctor:   { primary: '#6366f1', light: '#e0e7ff', dark: '#4338ca' }, // indigo
  patient:  { primary: '#0d9488', light: '#ccfbf1', dark: '#0f766e' }, // teal
  lab:      { primary: '#0284c7', light: '#e0f2fe', dark: '#0369a1' }, // blue
  pharmacy: { primary: '#7c3aed', light: '#ede9fe', dark: '#5b21b6' }, // violet
  cashier:  { primary: '#2563eb', light: '#dbeafe', dark: '#1d4ed8' }, // blue
  admin:    { primary: '#4f46e5', light: '#e0e7ff', dark: '#3730a3' }, // indigo
  default:  { primary: '#0ea5e9', light: '#e0f2fe', dark: '#0284c7' },
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};
