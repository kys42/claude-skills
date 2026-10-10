import { CormorantGaramond_300Light } from '@expo-google-fonts/cormorant-garamond/300Light';
import { GowunBatang_400Regular } from '@expo-google-fonts/gowun-batang/400Regular';
import { GowunBatang_700Bold } from '@expo-google-fonts/gowun-batang/700Bold';
import { useFonts } from 'expo-font';

/** Bundled font files on iOS/Android. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold, CormorantGaramond_300Light });
  return loaded || error !== null;
}
