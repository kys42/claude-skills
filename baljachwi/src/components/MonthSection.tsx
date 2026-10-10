import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type TextStyle,
} from "react-native";
import Svg, { Circle, Defs, G, RadialGradient, Stop } from "react-native-svg";

import { CATEGORIES, CATEGORY_ORDER } from "@/domain/categories";
import { formatShort } from "@/domain/dates";
import { SEASONS } from "@/domain/seasons";
import type { Footprint } from "@/domain/types";
import {
  HEADER_H,
  NOW,
  PRINT,
  TITLE_PLACEHOLDER,
  dateAtY,
  type MonthLayout,
  type PlacedEntry,
} from "@/trail/layout";
import { DecoShape, PressedShoe, Shoe } from "./glyphs";
import { monthGround } from "./ground";
import { PlusIcon } from "./icons";
import { SeasonIcon } from "./SeasonIcon";
import { font, ink } from "./theme";

export const COACH_ROOM = 150;

interface Props {
  layout: MonthLayout;
  fullW: number;
  offsetX: number;
  contentW: number;
  todayLabel: string;
  highlightId?: string;
  stampId?: string;
  showCoach?: boolean;
  /** A tap on bare ground: the date it points to and how far across (0–1) it landed. */
  onPressGround: (date: string, x: number) => void;
  onPressEntry: (footprint: Footprint) => void;
  onPressNow: () => void;
  onSample: () => void;
}

const useNative = Platform.OS !== "web";

function MonthSectionImpl({
  layout,
  fullW,
  offsetX,
  contentW,
  todayLabel,
  highlightId,
  stampId,
  showCoach,
  onPressGround,
  onPressEntry,
  onPressNow,
  onSample,
}: Props) {
  const season = SEASONS[layout.season];
  const ground = monthGround(layout.month);
  const ref = useRef<View>(null);
  const numeralSize = Math.min(150, Math.max(70, layout.height - 30));

  // locationX/Y are relative to whatever child was hit, so measure the section itself.
  const handlePress = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    ref.current?.measure((_x, _y, _w, _h, left, top) =>
      onPressGround(
        dateAtY(layout, pageY - top),
        (pageX - left - offsetX) / contentW,
      ),
    );
  };

  return (
    <Pressable
      ref={ref}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${layout.year}년 ${layout.month}월. 눌러서 그날의 발자국 남기기`}
      style={{ width: fullW, height: layout.height, overflow: "hidden" }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[ground.top, ground.here, ground.here, ground.bottom]}
          locations={[
            0,
            Math.min(0.3, 40 / layout.height),
            Math.max(0.7, 1 - 40 / layout.height),
            1,
          ]}
          style={StyleSheet.absoluteFill}
        />
        <Text
          style={[
            styles.numeral,
            {
              left: offsetX + 4,
              top: HEADER_H - 50,
              fontSize: numeralSize,
              lineHeight: numeralSize * 1.08,
            },
          ]}
        >
          {layout.month}
        </Text>

        <Svg
          width={fullW}
          height={layout.height}
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            {CATEGORY_ORDER.map((c) => (
              <RadialGradient
                key={c}
                id={`glow-${c}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <Stop
                  offset="0"
                  stopColor={`rgb(${CATEGORIES[c].glow})`}
                  stopOpacity={0.22}
                />
                <Stop
                  offset="1"
                  stopColor={`rgb(${CATEGORIES[c].glow})`}
                  stopOpacity={0}
                />
              </RadialGradient>
            ))}
          </Defs>

          {layout.decos.map((d, i) => (
            <G
              key={`d${i}`}
              opacity={d.opacity}
              transform={`translate(${d.x} ${d.y}) rotate(${d.rot} ${d.size / 2} ${d.size / 2}) scale(${d.size / 24})`}
            >
              <DecoShape kind={d.kind} color={d.color} />
            </G>
          ))}

          {layout.steps.map((s, i) => (
            <G
              key={`s${i}`}
              transform={`translate(${s.x} ${s.y}) rotate(${s.rot}) translate(-5.5 -9.6) scale(0.6875)`}
            >
              <Shoe fill={layout.stepColor} opacity={s.opacity} />
            </G>
          ))}

          {layout.entries.map((e) => (
            <PrintMark
              key={e.footprint.id}
              entry={e}
              shade={season.shade}
              dim={highlightId !== undefined && e.footprint.id !== highlightId}
            />
          ))}
        </Svg>

        <View
          style={[styles.header, { left: offsetX + 20, right: offsetX + 20 }]}
        >
          <View style={styles.rule} />
          <View style={styles.headerRow}>
            <Text style={styles.month}>{layout.month}월</Text>
            <Text style={styles.year}>{layout.year}</Text>
            {layout.showSeason && (
              <View style={styles.seasonTag}>
                <SeasonIcon season={layout.season} size={13} />
                <Text style={[styles.seasonText, { color: season.accent }]}>
                  {season.label}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {layout.entries.map((e) => (
        <EntryLabel
          key={e.footprint.id}
          entry={e}
          highlighted={e.footprint.id === highlightId}
          dim={highlightId !== undefined && e.footprint.id !== highlightId}
          onPress={onPressEntry}
        />
      ))}
      {highlightId &&
        layout.entries.some((e) => e.footprint.id === highlightId) && (
          <HighlightRing
            entry={layout.entries.find((e) => e.footprint.id === highlightId)!}
          />
        )}
      {stampId && layout.entries.some((e) => e.footprint.id === stampId) && (
        <StampBurst
          key={stampId}
          entry={layout.entries.find((e) => e.footprint.id === stampId)!}
        />
      )}

      {layout.nowMarker && (
        <NowButton
          x={layout.nowMarker.x}
          y={layout.nowMarker.y}
          onLeft={layout.nowMarker.x > offsetX + contentW / 2}
          todayLabel={todayLabel}
          active={highlightId === "__draft__"}
          onPress={onPressNow}
        />
      )}
      {showCoach && layout.nowMarker && (
        <Coach
          x={layout.nowMarker.x}
          y={layout.nowMarker.y + NOW.size / 2 + 14}
          offsetX={offsetX}
          contentW={contentW}
          onSample={onSample}
        />
      )}
    </Pressable>
  );
}

function PrintMark({
  entry: e,
  shade,
  dim,
}: {
  entry: PlacedEntry;
  shade: string;
  dim: boolean;
}) {
  const meta = CATEGORIES[e.footprint.category];
  const opacity = e.opacity * (dim ? 0.55 : 1);
  if (e.footprint.size === "big") {
    return (
      <G>
        <Circle
          cx={e.x}
          cy={e.y}
          r={68}
          fill={`url(#glow-${e.footprint.category})`}
          opacity={dim ? 0.5 : 1}
        />
        <G
          opacity={opacity}
          transform={`translate(${e.x} ${e.y}) rotate(${e.rot}) translate(-26 -26) scale(1.3)`}
        >
          <G transform="translate(2 10)">
            <PressedShoe shade={shade} tint={meta.tint} tintOpacity={0.66} />
          </G>
          <G transform="translate(20 2)">
            <PressedShoe shade={shade} tint={meta.tint} tintOpacity={0.66} />
          </G>
        </G>
      </G>
    );
  }
  return (
    <G
      opacity={opacity}
      transform={`translate(${e.x} ${e.y}) rotate(${e.rot}) translate(-7.5 -13) scale(0.9375)`}
    >
      <PressedShoe shade={shade} tint={meta.tint} tintOpacity={0.55} />
    </G>
  );
}

function EntryLabel({
  entry: e,
  highlighted,
  dim,
  onPress,
}: {
  entry: PlacedEntry;
  highlighted: boolean;
  dim: boolean;
  onPress: (f: Footprint) => void;
}) {
  const f = e.footprint;
  const meta = CATEGORIES[f.category];
  const big = f.size === "big";
  const spec = big ? PRINT.big : PRINT.small;
  const align = e.label.align;
  const placeholder = highlighted && !f.title;
  const title = placeholder ? TITLE_PLACEHOLDER : f.title;
  const a11y = `${big ? "큰" : "작은"} 발자국, ${meta.label}, ${f.date}, ${f.title}. 눌러서 고치기`;
  const titleStyle = [
    big ? styles.bigTitle : styles.smallTitle,
    keepWords,
    { textAlign: align },
    placeholder && styles.placeholder,
  ];

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity: dim ? 0.45 : 1 }]}
      pointerEvents={highlighted ? "none" : "box-none"}
    >
      <Pressable
        onPress={() => onPress(f)}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          position: "absolute",
          left: e.x - spec.w / 2 - 8,
          top: e.y - spec.h / 2 - 8,
          width: spec.w + 16,
          height: spec.h + 16,
        }}
      />
      {/* Only the words themselves take the tap, so the bare ground around a short label stays free to stamp. */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: e.label.left,
          top: e.label.top,
          width: e.label.width,
          alignItems: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <Pressable
          onPress={() => onPress(f)}
          accessibilityRole="button"
          accessibilityLabel={a11y}
          style={{
            maxWidth: "100%",
            alignItems: align === "right" ? "flex-end" : "flex-start",
          }}
        >
          {big ? (
            <>
              <Text style={[styles.meta, { textAlign: align }]}>
                <Text style={[styles.metaCat, { color: meta.text }]}>
                  {meta.label}
                </Text>{" "}
                · {formatShort(f.date)}
              </Text>
              <Text
                numberOfLines={3}
                style={titleStyle}
                lineBreakStrategyIOS="hangul-word"
              >
                {title}
              </Text>
              {f.note ? (
                <Text
                  numberOfLines={2}
                  style={[styles.note, keepWords, { textAlign: align }]}
                  lineBreakStrategyIOS="hangul-word"
                >
                  {f.note}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text
                numberOfLines={3}
                style={titleStyle}
                lineBreakStrategyIOS="hangul-word"
              >
                {title}
              </Text>
              <Text style={[styles.meta, { textAlign: align }]}>
                <Text style={{ color: meta.text }}>{meta.label}</Text> ·{" "}
                {formatShort(f.date)}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function usePulse(duration: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value;
}

function HighlightRing({ entry: e }: { entry: PlacedEntry }) {
  const pulse = usePulse(1800);
  const size = e.footprint.size === "big" ? 84 : 46;
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.25],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.7, 0.2, 0],
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.focusRing,
          {
            left: e.x - size / 2,
            top: e.y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.focusPulse,
          {
            left: e.x - size / 2,
            top: e.y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
}

/** A puff of dust where a footprint was just stamped. */
function StampBurst({ entry: e }: { entry: PlacedEntry }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNative,
    }).start();
  }, [t]);
  const big = e.footprint.size === "big";
  const base = big ? 60 : 30;
  const tint = CATEGORIES[e.footprint.category].tint;
  const ringScale = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 2.1],
  });
  const ringOpacity = t.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.55, 0],
  });
  const dots = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={{
          position: "absolute",
          left: e.x - base / 2,
          top: e.y - base / 2,
          width: base,
          height: base,
          borderRadius: base / 2,
          borderWidth: 2,
          borderColor: tint,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      {dots.map((i) => {
        const a = (i / dots.length) * Math.PI * 2 + 0.3;
        const dist = base * 0.95;
        const tx = t.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(a) * dist],
        });
        const ty = t.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(a) * dist],
        });
        const op = t.interpolate({
          inputRange: [0, 0.15, 1],
          outputRange: [0, 0.8, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: e.x - 3,
              top: e.y - 3,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i % 2 ? tint : ink.muted,
              opacity: op,
              transform: [{ translateX: tx }, { translateY: ty }],
            }}
          />
        );
      })}
    </View>
  );
}

function NowButton({
  x,
  y,
  onLeft,
  todayLabel,
  active,
  onPress,
}: {
  x: number;
  y: number;
  onLeft: boolean;
  todayLabel: string;
  active: boolean;
  onPress: () => void;
}) {
  const pulse = usePulse(2400);
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });
  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });
  const s = NOW.size;
  return (
    <>
      {!active && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.nowPulse,
            {
              left: x - s / 2,
              top: y - s / 2,
              width: s,
              height: s,
              borderRadius: s / 2,
              opacity,
              transform: [{ scale }],
            },
          ]}
        />
      )}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="오늘의 발자국 남기기"
        hitSlop={8}
        style={({ pressed }) => [
          styles.nowButton,
          {
            left: x - s / 2,
            top: y - s / 2,
            width: s,
            height: s,
            borderRadius: s / 2,
          },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <PlusIcon size={22} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>
      <View
        pointerEvents="none"
        style={[
          styles.nowLabel,
          onLeft
            ? {
                right: undefined,
                left: x - s / 2 - 132,
                alignItems: "flex-end",
              }
            : { left: x + s / 2 + 12 },
          { top: y - 19 },
        ]}
      >
        <Text style={styles.nowTitle}>지금 여기</Text>
        <Text style={styles.nowDate}>{todayLabel}</Text>
      </View>
    </>
  );
}

function Coach({
  x,
  y,
  offsetX,
  contentW,
  onSample,
}: {
  x: number;
  y: number;
  offsetX: number;
  contentW: number;
  onSample: () => void;
}) {
  const w = Math.min(268, contentW - 32);
  const left = Math.min(
    Math.max(x - w / 2, offsetX + 16),
    offsetX + contentW - 16 - w,
  );
  return (
    <View style={[styles.coach, { left, top: y + 8, width: w }]}>
      <View style={[styles.coachTail, { left: x - left - 7 }]} />
      <Text style={styles.coachTitle}>여기를 눌러 첫 발자국을 남겨 보세요</Text>
      <Text style={styles.coachBody}>
        지난날도 길 위 아무 곳이나 누르면 그날에 남길 수 있어요.
      </Text>
      <Pressable
        onPress={onSample}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.coachLink, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.coachLinkText}>예시 발자취로 둘러보기</Text>
      </Pressable>
    </View>
  );
}

export const MonthSection = memo(MonthSectionImpl);

/** Break Korean lines between words, not inside them. */
const keepWords = Platform.select<TextStyle>({
  web: { wordBreak: "keep-all" } as TextStyle,
  default: {},
});

const styles = StyleSheet.create({
  numeral: {
    position: "absolute",
    ...font.numeral,
    color: "rgba(31, 42, 54, 0.05)",
    letterSpacing: -4,
  },
  header: { position: "absolute", top: 0, height: HEADER_H },
  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: ink.line },
  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 7,
    paddingTop: 11,
  },
  month: { ...font.bold, fontSize: 16, color: ink.strong },
  year: { ...font.regular, fontSize: 12, color: ink.muted },
  seasonTag: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
  },
  seasonText: { ...font.bold, fontSize: 12 },
  meta: { ...font.regular, fontSize: 12, lineHeight: 17, color: ink.muted },
  metaCat: { ...font.bold },
  bigTitle: {
    ...font.bold,
    fontSize: 18,
    lineHeight: 24,
    color: ink.strong,
    marginTop: 5,
    letterSpacing: -0.2,
  },
  note: {
    ...font.regular,
    fontSize: 13,
    lineHeight: 20,
    color: ink.soft,
    marginTop: 5,
  },
  smallTitle: {
    ...font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: ink.strong,
    marginBottom: 3,
  },
  placeholder: { color: "#8A96A3", fontStyle: "italic" },
  focusRing: {
    position: "absolute",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: ink.strong,
  },
  focusPulse: { position: "absolute", borderWidth: 2, borderColor: ink.strong },
  nowPulse: { position: "absolute", backgroundColor: ink.strong },
  nowButton: {
    position: "absolute",
    backgroundColor: ink.strong,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1F2A36",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  nowLabel: { position: "absolute", width: 120, gap: 1 },
  nowTitle: { ...font.bold, fontSize: 14, color: ink.strong },
  nowDate: { ...font.regular, fontSize: 12, color: ink.muted },
  coach: {
    position: "absolute",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    gap: 4,
    shadowColor: "#1F2A36",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  coachTail: {
    position: "absolute",
    top: -6,
    width: 14,
    height: 14,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  coachTitle: { ...font.bold, fontSize: 14, color: ink.strong },
  coachBody: {
    ...font.regular,
    fontSize: 12,
    lineHeight: 18,
    color: ink.muted,
  },
  coachLink: {
    alignSelf: "flex-start",
    marginTop: 6,
    minHeight: 32,
    justifyContent: "center",
  },
  coachLinkText: {
    ...font.bold,
    fontSize: 13,
    color: "#2F5BC0",
    textDecorationLine: "underline",
  },
});
