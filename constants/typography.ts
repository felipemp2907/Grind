import { RF } from '@/utils/responsive';

export const typography = {
  h1: {
    fontSize: RF(28),
    fontWeight: '700' as const,
    lineHeight: RF(34),
  },
  h2: {
    fontSize: RF(22),
    fontWeight: '600' as const,
    lineHeight: RF(28),
  },
  h3: {
    fontSize: RF(18),
    fontWeight: '600' as const,
    lineHeight: RF(24),
  },
  body: {
    fontSize: RF(16),
    fontWeight: '500' as const,
    lineHeight: RF(24),
  },
  bodySmall: {
    fontSize: RF(14),
    fontWeight: '500' as const,
    lineHeight: RF(20),
  },
  caption: {
    fontSize: RF(12),
    fontWeight: '400' as const,
    lineHeight: RF(16),
  },
  button: {
    fontSize: RF(16),
    fontWeight: '600' as const,
    lineHeight: RF(20),
  },
  buttonSmall: {
    fontSize: RF(14),
    fontWeight: '600' as const,
    lineHeight: RF(18),
  },
};