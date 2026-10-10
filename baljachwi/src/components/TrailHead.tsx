import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G } from 'react-native-svg';

import { SEASONS, SEASON_ORDER, seasonOf, type Season } from '@/domain/seasons';
import { Shoe } from './glyphs';
import { monthGround } from './ground';
import { SeasonIcon } from './SeasonIcon';
import { font, ink } from './theme';

export const TOPBAR_H = 56;
export const GHOST_H = 76;

export const nextSeasonOf = (month: number): Season => SEASON_ORDER[(SEASON_ORDER.indexOf(seasonOf(month)) + 1) % 4];

interface Props {
  month: number;
  topX: number;
  fullW: number;
  offsetX: number;
  contentW: number;
  insetTop: number;
}

/** The road ahead: already wearing the next season, with footsteps not yet taken. */
export function TrailHead({ month, topX, fullW, offsetX, contentW, insetTop }: Props) {
  const ahead = nextSeasonOf(month);
  const height = insetTop + TOPBAR_H + GHOST_H;
  const ghosts = [0.18, 0.46, 0.74].map((t, i) => {
    const x = topX + Math.sin(t * 5 + 1) * 18 + (i % 2 ? 7 : -7);
    return { x, y: insetTop + TOPBAR_H + t * GHOST_H, opacity: 0.25 + t * 0.55 };
  });

  return (
    <View style={{ width: fullW, height }}>
      <LinearGradient colors={[SEASONS[ahead].ground, monthGround(month).top]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      <Svg width={fullW} height={height} style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no">
        {ghosts.map((g, i) => (
          <G key={i} transform={`translate(${g.x} ${g.y}) translate(-6 -10.5) scale(0.75)`}>
            <Shoe fill="none" stroke="#7F95AC" dash="2.6 2.2" opacity={g.opacity} />
          </G>
        ))}
      </Svg>
      <View style={[styles.ahead, { top: insetTop + TOPBAR_H + 4, right: offsetX + 20, maxWidth: contentW / 2 }]}>
        <SeasonIcon season={ahead} size={12} />
        <Text style={styles.aheadText}>다가오는 {SEASONS[ahead].label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ahead: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 5 },
  aheadText: { ...font.regular, fontSize: 12, color: ink.muted, fontStyle: 'italic' },
});
