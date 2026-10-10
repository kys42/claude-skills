import { Platform, type TextStyle } from 'react-native';

export const ink = {
  strong: '#1F2A36',
  body: '#3E4C5A',
  muted: '#55626F',
  soft: '#4A5866',
  line: 'rgba(31, 42, 54, 0.14)',
};

/**
 * Native apps bundle one font file per weight (registered in the root layout);
 * the web loads subsetted Google Fonts instead of ~16 MB of Korean TTFs.
 */
export const font: Record<'regular' | 'bold' | 'numeral', TextStyle> = Platform.select({
  web: {
    regular: { fontFamily: '"Gowun Batang", serif', fontWeight: '400' },
    bold: { fontFamily: '"Gowun Batang", serif', fontWeight: '700' },
    numeral: { fontFamily: '"Cormorant Garamond", serif', fontWeight: '300' },
  },
  default: {
    regular: { fontFamily: 'GowunBatang_400Regular' },
    bold: { fontFamily: 'GowunBatang_700Bold' },
    numeral: { fontFamily: 'CormorantGaramond_300Light' },
  },
});

export const WEB_FONTS_CSS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300&family=Gowun+Batang:wght@400;700&display=swap';

export const MAX_CONTENT_W = 460;
