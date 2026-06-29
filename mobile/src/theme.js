// Design tokens for the "MP Nagrik Traffic Seva" redesign — a calm, paper-like
// civic identity with restrained tricolour accents (see the Claude Design doc).
import { Platform } from 'react-native';

export const colors = {
  // surfaces
  paper: '#F4EEE3',
  paperLight: '#FBF7EF',
  card: '#FFFFFF',
  doc: '#FCFAF4',

  // brand
  navy: '#1C3A57',
  navySoft: '#A9C0D6',
  saffron: '#D97A2B',
  saffronSoft: '#FDEBD6',
  green: '#2E6B4F',
  greenBright: '#2E7D52',
  red: '#C2554A',

  // ink / text
  ink: '#23201A',
  body: '#4a4434',
  muted: '#6F6757',
  muted2: '#8a8170',
  faint: '#a59c8a',

  // hairlines
  border: '#E2D8C6',
  borderSoft: '#EFE7D8',
  borderInput: '#DAD0BD',

  // status accents { fg, bg, border }
  amberFg: '#9A6512',
  amberBg: '#FBEBD2',
  amberCard: '#FBEFDE',
  amberBorder: '#EAD6BC',
  greenFg: '#2E6B4F',
  greenBg: '#D8E9DF',
  greenCard: '#EAF2EC',
  blueFg: '#1C3A57',
  blueBg: '#DCE7F2',
  blueCard: '#E4ECF4',
};

// Source Serif 4 / Mukta aren't bundled; fall back to platform serif for the
// headings so the redesign keeps its official, editorial feel everywhere.
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

// Tricolour saffron / paper / green accent ratio used across headers & cards.
export const TRICOLOR = [colors.saffron, '#F4EEE3', colors.greenBright];

export const STATUS = {
  PENDING: { fg: colors.amberFg, bg: colors.amberBg, card: colors.amberCard, border: colors.amberBorder, dot: colors.amberFg },
  UNDER_REVIEW: { fg: colors.blueFg, bg: colors.blueBg, card: colors.blueCard, border: '#C3D4E6', dot: colors.navy },
  CHALLAN_ISSUED: { fg: colors.greenFg, bg: colors.greenBg, card: colors.greenCard, border: '#BBD8C5', dot: colors.green },
  REJECTED: { fg: colors.red, bg: '#F6E2DF', card: '#F8E9E6', border: '#E6C4BE', dot: colors.red },
};

export const shadow = {
  card: { shadowColor: '#28201040', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
};
