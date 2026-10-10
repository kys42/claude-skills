/** Picks the particle that fits the last syllable: 탐험가 → 탐험가가, 개척자 → 개척자가, 지도 제작자 → 지도 제작자가, 전설 → 전설이. */
export function withJosa(word: string, afterConsonant: string, afterVowel: string): string {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return `${word}${afterVowel}`;
  return `${word}${(last - 0xac00) % 28 ? afterConsonant : afterVowel}`;
}
