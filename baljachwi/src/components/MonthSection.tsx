import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type TextStyle } from 'react-native';
import Svg, { Defs, G, RadialGradient, Stop, Circle } from 'react-native-svg';

import { CATEGORIES, CATEGORY_ORDER } from '@/domain/categories';
import { formatShort } from '@/domain/dates';
import { SEASONS, mixHex, seasonOf } from '@/domain/seasons';
import type { Footprint } from '@/domain/types';
import { HEADER_H, PRINT, dateAtY, type MonthLayout } from '@/trail/layout';
import { DecoShape, PressedShoe, Shoe } from './glyphs';
import { SeasonIcon } from './SeasonIcon';
import { font, ink } from './theme';

interface Props {
  layout: MonthLayout;
  fullW: number;
  offsetX: number;
  onPressDate: (date: string) => void;
  onPressEntry: (footprint: Footprint) => void;
}

const groundOf = (month: number) => SEASONS[seasonOf(month)].ground;

export function sectionColors(month: number) {
  const here = groundOf(month);
  const newer = groundOf((month % 12) + 1);
  const older = groundOf(((month + 10) % 12) + 1);
  return { top: mixHex(here, newer), here, bottom: mixHex(here, older) };
}

function MonthSectionImpl({ layout, fullW, offsetX, onPressDate, onPressEntry }: Props) {
  const season = SEASONS[layout.season];
  const colors = sectionColors(layout.month);

  const ref = useRef<View>(null);

  // locationY is relative to whatever child was hit, so measure the section itself.
  const handlePress = (e: GestureResponderEvent) => {
    const pageY = e.nativeEvent.pageY;
    ref.current?.measure((_x, _y, _w, _h, _pageX, top) => onPressDate(dateAtY(layout, pageY - top)));
  };

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${layout.year}년 ${layout.month}월. 눌러서 그날의 발자국 남기기`}
      style={{ width: fullW, height: layout.height }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[colors.top, colors.here, colors.here, colors.bottom]}
          locations={[0, 0.14, 0.86, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.watermark, { left: offsetX + 6, top: HEADER_H - 46 }]}>{layout.month}</Text>

        <Svg width={fullW} height={layout.height} style={StyleSheet.absoluteFill}>
          <Defs>
            {CATEGORY_ORDER.map((c) => (
              <RadialGradient key={c} id={`glow-${c}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={`rgb(${CATEGORIES[c].glow})`} stopOpacity={0.2} />
                <Stop offset="1" stopColor={`rgb(${CATEGORIES[c].glow})`} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>

          {layout.decos.map((d, i) => (
            <G
              key={`d${i}`}
              opacity={d.opacity}
              transform={`translate(${d.x} ${d.y}) rotate(${d.rot} ${d.size / 2} ${d.size / 2}) scale(${d.size / 24})`}>
              <DecoShape kind={d.kind} color={d.color} />
            </G>
          ))}

          {layout.steps.map((s, i) => (
            <G key={`s${i}`} transform={`translate(${s.x} ${s.y}) rotate(${s.rot}) translate(-5 -8.75) scale(0.625)`}>
              <Shoe fill={layout.stepColor} opacity={s.opacity} />
            </G>
          ))}

          {layout.entries.map((e) => {
            const meta = CATEGORIES[e.footprint.category];
            if (e.footprint.size === 'big') {
              return (
                <G key={e.footprint.id}>
                  <Circle cx={e.x} cy={e.y} r={62} fill={`url(#glow-${e.footprint.category})`} />
                  <G opacity={e.opacity} transform={`translate(${e.x} ${e.y}) rotate(${e.rot}) translate(-23 -23) scale(1.15)`}>
                    <G transform="translate(2 10)">
                      <PressedShoe shade={season.shade} tint={meta.tint} tintOpacity={0.64} />
                    </G>
                    <G transform="translate(20 2)">
                      <PressedShoe shade={season.shade} tint={meta.tint} tintOpacity={0.64} />
                    </G>
                  </G>
                </G>
              );
            }
            return (
              <G key={e.footprint.id} opacity={e.opacity} transform={`translate(${e.x} ${e.y}) rotate(${e.rot}) translate(-6.5 -11.5) scale(0.8125)`}>
                <PressedShoe shade={season.shade} tint={meta.tint} tintOpacity={0.5} />
              </G>
            );
          })}
        </Svg>

        <View style={[styles.header, { left: offsetX + 20, right: offsetX + 20 }]}>
          <View style={[styles.rule, layout.empty && styles.ruleQuiet]} />
          <View style={styles.headerRow}>
            <Text style={styles.month}>{layout.month}월</Text>
            <Text style={styles.year}>{layout.year}</Text>
            {layout.isCurrent ? (
              <Text style={styles.headerNote}>지금 걷는 중</Text>
            ) : layout.empty ? (
              <Text style={[styles.headerNote, styles.italic]}>{season.quiet}</Text>
            ) : null}
            {layout.showSeason && (
              <View style={styles.seasonTag}>
                <SeasonIcon season={layout.season} />
                <Text style={[styles.seasonText, { color: season.accent }]}>{season.label}</Text>
              </View>
            )}
          </View>
        </View>

        {layout.nowMarker && <NowMarker x={layout.nowMarker.x} y={layout.nowMarker.y} />}
      </View>

      {layout.entries.map((e) => {
        const f = e.footprint;
        const meta = CATEGORIES[f.category];
        const big = f.size === 'big';
        const spec = big ? PRINT.big : PRINT.small;
        const align = e.label.align;
        const a11y = `${big ? '큰' : '작은'} 발자국, ${meta.label}, ${f.date}, ${f.title}. 눌러서 고치기`;
        return (
          <View key={f.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable
              onPress={() => onPressEntry(f)}
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={{ position: 'absolute', left: e.x - spec.w / 2 - 6, top: e.y - spec.h / 2 - 6, width: spec.w + 12, height: spec.h + 12 }}
            />
            <Pressable
              onPress={() => onPressEntry(f)}
              accessibilityRole="button"
              accessibilityLabel={a11y}
              style={{ position: 'absolute', left: e.label.left, top: e.label.top, width: e.label.width, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
              {big ? (
                <>
                  <Text style={[styles.meta, { textAlign: align }]}>
                    <Text style={[styles.metaCat, { color: meta.text }]}>{meta.label}</Text> · {formatShort(f.date)}
                  </Text>
                  <Text numberOfLines={3} style={[styles.bigTitle, keepWords, { textAlign: align }]} lineBreakStrategyIOS="hangul-word">
                    {f.title}
                  </Text>
                  {f.note ? (
                    <Text numberOfLines={2} style={[styles.note, keepWords, { textAlign: align }]} lineBreakStrategyIOS="hangul-word">
                      {f.note}
                    </Text>
                  ) : null}
                </>
              ) : (
                <>
                  <Text numberOfLines={3} style={[styles.smallTitle, keepWords, { textAlign: align }]} lineBreakStrategyIOS="hangul-word">
                    {f.title}
                  </Text>
                  <Text style={[styles.meta, { textAlign: align }]}>
                    <Text style={{ color: meta.text }}>{meta.label}</Text> · {formatShort(f.date)}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        );
      })}
    </Pressable>
  );
}

function NowMarker({ x, y }: { x: number; y: number }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: Platform.OS !== 'web' }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
  return (
    <>
      <Animated.View style={[styles.nowPulse, { left: x - 7, top: y - 7, opacity, transform: [{ scale }] }]} />
      <View style={[styles.nowDot, { left: x - 5, top: y - 5 }]} />
      <Text style={[styles.nowText, { left: x + 14, top: y - 10 }]}>지금 여기</Text>
    </>
  );
}

export const MonthSection = memo(MonthSectionImpl);

/** Break Korean lines between words, not inside them. */
const keepWords = Platform.select<TextStyle>({ web: { wordBreak: 'keep-all' } as TextStyle, default: {} });

const styles = StyleSheet.create({
  watermark: {
    position: 'absolute',
    ...font.numeral,
    fontSize: 150,
    lineHeight: 160,
    color: 'rgba(31, 42, 54, 0.05)',
    letterSpacing: -4,
  },
  header: { position: 'absolute', top: 0, height: HEADER_H, justifyContent: 'flex-start' },
  rule: { height: 1, backgroundColor: ink.line },
  ruleQuiet: { backgroundColor: 'rgba(31, 42, 54, 0.1)' },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingTop: 10 },
  month: { ...font.bold, fontSize: 17, color: ink.strong },
  year: { ...font.regular, fontSize: 12, color: ink.muted },
  headerNote: { ...font.regular, fontSize: 13, color: ink.muted },
  italic: { fontStyle: 'italic' },
  seasonTag: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center' },
  seasonText: { ...font.bold, fontSize: 12 },
  meta: { ...font.regular, fontSize: 12, lineHeight: 17, color: ink.muted },
  metaCat: { ...font.bold },
  bigTitle: { ...font.bold, fontSize: 18, lineHeight: 24, color: ink.strong, marginTop: 5, letterSpacing: -0.2 },
  note: { ...font.regular, fontSize: 13, lineHeight: 20, color: ink.soft, marginTop: 5 },
  smallTitle: { ...font.regular, fontSize: 14, lineHeight: 20, color: ink.strong, marginBottom: 3 },
  nowPulse: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: ink.strong },
  nowDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: ink.strong },
  nowText: { position: 'absolute', ...font.bold, fontSize: 13, color: ink.strong },
});
