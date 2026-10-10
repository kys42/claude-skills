import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextStyle,
} from 'react-native';
import Svg, { G } from 'react-native-svg';

import { CATEGORIES, CATEGORY_ORDER } from '@/domain/categories';
import { compareISO, parseISODate, weekday } from '@/domain/dates';
import { STEPS } from '@/domain/level';
import type { FootprintDraft, Size } from '@/domain/types';
import { Calendar } from './Calendar';
import { PressedShoe } from './glyphs';
import { CalendarIcon, ChevronIcon, CloseIcon, TrashIcon } from './icons';
import { font, ink } from './theme';

export const SHEET_RESERVE = 470;
const TITLE_MAX = 60;
const NOTE_MAX = 140;

interface Props {
  mode: 'new' | 'edit';
  draft: FootprintDraft;
  today: string;
  bottomInset: number;
  onChange: (draft: FootprintDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const useNative = Platform.OS !== 'web';
const keepWords = Platform.select<TextStyle>({ web: { wordBreak: 'keep-all' } as TextStyle, default: {} });
/** The underline already shows focus; drop the browser's focus box. */
const noOutline = Platform.select<TextStyle>({ web: { outlineWidth: 0 }, default: {} });

function dateTitle(iso: string, today: string) {
  const { y, m, d } = parseISODate(iso);
  const sameYear = y === parseISODate(today).y;
  return `${sameYear ? '' : `${y}년 `}${m}월 ${d}일 ${weekday(iso)}요일`;
}

export function FootprintSheet({ mode, draft, today, bottomInset, onChange, onSave, onDelete, onClose }: Props) {
  const { height: screenH, width: screenW } = useWindowDimensions();
  const [t] = useState(() => new Animated.Value(0));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const leaving = useRef(false);
  const meta = CATEGORIES[draft.category];
  const canSave = draft.title.trim().length > 0 && compareISO(draft.date, today) <= 0;

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [t]);

  const leave = (then: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    Animated.timing(t, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: useNative }).start(() => then());
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave(onClose);
      return true;
    });
    if (Platform.OS !== 'web') return () => sub.remove();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave(onClose);
    document.addEventListener('keydown', onKey);
    return () => {
      sub.remove();
      document.removeEventListener('keydown', onKey);
    };
    // `leave` is stable for the sheet's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const set = (patch: Partial<FootprintDraft>) => onChange({ ...draft, ...patch });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [Math.min(560, screenH), 0] });
  const sheetW = Math.min(screenW, 560);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dock} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[styles.sheet, { width: sheetW, maxHeight: screenH * 0.86, paddingBottom: bottomInset + 14, transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <View style={styles.heading}>
                <Text style={styles.eyebrow}>{mode === 'new' ? '새 발자국' : '발자국 고치기'}</Text>
                <Text style={styles.hint}>길 위를 누르면 그 자리로 옮겨져요</Text>
              </View>
              <Pressable onPress={() => leave(onClose)} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={6} style={styles.close}>
                <CloseIcon size={20} color={ink.body} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => setCalendarOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityState={{ expanded: calendarOpen }}
              accessibilityHint="날짜 바꾸기"
              style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]}>
              <CalendarIcon size={18} color={ink.strong} />
              <Text style={styles.dateText}>{dateTitle(draft.date, today)}</Text>
              {draft.date === today && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>오늘</Text>
                </View>
              )}
              <View style={styles.flex} />
              <ChevronIcon dir={calendarOpen ? 'up' : 'down'} size={16} color={ink.muted} />
            </Pressable>
            {calendarOpen && (
              <View style={styles.calendarBox}>
                <Calendar
                  value={draft.date}
                  max={today}
                  onChange={(iso) => {
                    set({ date: iso });
                    setCalendarOpen(false);
                  }}
                />
              </View>
            )}

            <View style={styles.segment} accessibilityRole="radiogroup">
              {(['big', 'small'] as Size[]).map((s) => {
                const on = draft.size === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => set({ size: s })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.segItem, on && styles.segItemOn]}>
                    <Svg width={s === 'big' ? 30 : 16} height={s === 'big' ? 30 : 26} viewBox={s === 'big' ? '0 0 40 40' : '0 0 16 28'}>
                      {s === 'big' ? (
                        <>
                          <G transform="translate(2 10)">
                            <PressedShoe shade="#B3C1CF" tint={meta.tint} tintOpacity={on ? 0.75 : 0.25} />
                          </G>
                          <G transform="translate(20 2)">
                            <PressedShoe shade="#B3C1CF" tint={meta.tint} tintOpacity={on ? 0.75 : 0.25} />
                          </G>
                        </>
                      ) : (
                        <PressedShoe shade="#B3C1CF" tint={meta.tint} tintOpacity={on ? 0.7 : 0.25} />
                      )}
                    </Svg>
                    <View style={styles.segTexts}>
                      <Text style={[styles.segTitle, !on && styles.segMuted]}>{s === 'big' ? '큰 발자국' : '작은 발자국'}</Text>
                      <Text style={[styles.segSub, keepWords]} numberOfLines={1}>
                        {s === 'big' ? '성취 · 전환점' : '자잘한 진척'} · +{STEPS[s]}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.chips} accessibilityRole="radiogroup">
              {CATEGORY_ORDER.map((c) => {
                const m = CATEGORIES[c];
                const on = draft.category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => set({ category: c })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.chip, on && { backgroundColor: m.wash, borderColor: m.tint }]}>
                    <View style={[styles.chipDot, { backgroundColor: m.tint }]} />
                    <Text style={[styles.chipText, on && { color: m.text, ...font.bold }]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.field, titleFocused && styles.fieldFocused]}>
              <TextInput
                value={draft.title}
                onChangeText={(title) => set({ title })}
                onFocus={() => setTitleFocused(true)}
                onBlur={() => setTitleFocused(false)}
                placeholder={draft.size === 'big' ? '어떤 발자국인가요?' : '한 줄로 남겨요'}
                placeholderTextColor="#98A3AF"
                accessibilityLabel="제목"
                maxLength={TITLE_MAX}
                returnKeyType="done"
                onSubmitEditing={() => canSave && leave(onSave)}
                style={[styles.titleInput, noOutline]}
              />
              <Text style={styles.counter}>
                {draft.title.length}/{TITLE_MAX}
              </Text>
            </View>
            <TextInput
              value={draft.note ?? ''}
              onChangeText={(note) => set({ note })}
              placeholder="무엇이 달라졌는지 한 줄 메모 (선택)"
              placeholderTextColor="#98A3AF"
              accessibilityLabel="메모"
              maxLength={NOTE_MAX}
              multiline
              style={[styles.noteInput, noOutline]}
            />
          </ScrollView>

          <View style={styles.footer}>
            {confirmDelete ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmText}>이 발자국을 지울까요?</Text>
                <Pressable onPress={() => setConfirmDelete(false)} accessibilityRole="button" style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
                  <Text style={styles.ghostText}>취소</Text>
                </Pressable>
                <Pressable onPress={() => leave(onDelete)} accessibilityRole="button" style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}>
                  <Text style={styles.dangerText}>지우기</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actionRow}>
                {mode === 'edit' && (
                  <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" accessibilityLabel="이 발자국 지우기" style={({ pressed }) => [styles.trashBtn, pressed && styles.pressed]}>
                    <TrashIcon color="#B42318" />
                  </Pressable>
                )}
                <Pressable
                  onPress={() => canSave && leave(onSave)}
                  disabled={!canSave}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSave }}
                  style={({ pressed }) => [styles.primary, !canSave && styles.primaryOff, pressed && styles.pressed]}>
                  <Text style={styles.primaryText}>{mode === 'new' ? '발자국 찍기' : '저장하기'}</Text>
                  {mode === 'new' && (
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>+{STEPS[draft.size]}걸음</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    backgroundColor: '#FCFDFE',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#1F2A36',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#D3DAE2', marginTop: 10, marginBottom: 2 },
  body: { paddingHorizontal: 20, paddingTop: 4, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { gap: 2 },
  eyebrow: { ...font.bold, fontSize: 12, color: ink.muted, letterSpacing: 0.4 },
  hint: { ...font.regular, fontSize: 12, color: '#7A8794' },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F3F6', marginRight: -4 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F3F6F9',
    marginTop: -6,
  },
  dateText: { ...font.bold, fontSize: 16, color: ink.strong },
  todayBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: ink.strong },
  todayBadgeText: { ...font.bold, fontSize: 11, color: '#FFFFFF' },
  flex: { flex: 1 },
  calendarBox: { paddingHorizontal: 4, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: '#E1E7ED' },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 18, backgroundColor: '#EEF2F5' },
  segItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 12, borderRadius: 14 },
  segItemOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#1F2A36',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segTexts: { flex: 1, gap: 1 },
  segTitle: { ...font.bold, fontSize: 14, color: ink.strong },
  segMuted: { color: ink.body, ...font.regular },
  segSub: { ...font.regular, fontSize: 11, color: ink.muted },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3E8ED',
    backgroundColor: '#FFFFFF',
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...font.regular, fontSize: 13, color: ink.strong },
  field: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 1.5, borderBottomColor: '#D8DFE6', paddingBottom: 2 },
  fieldFocused: { borderBottomColor: ink.strong },
  titleInput: { flex: 1, minWidth: 0, minHeight: 50, ...font.bold, fontSize: 20, color: ink.strong, paddingVertical: 8 },
  counter: { ...font.regular, fontSize: 11, color: '#98A3AF', paddingBottom: 12 },
  noteInput: { minHeight: 44, maxHeight: 96, ...font.regular, fontSize: 15, lineHeight: 22, color: ink.body, paddingVertical: 8, textAlignVertical: 'top' },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  actionRow: { flexDirection: 'row', gap: 10 },
  trashBtn: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#F0C9C4', backgroundColor: '#FFF7F6' },
  primary: { flex: 1, height: 56, borderRadius: 18, backgroundColor: ink.strong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryOff: { opacity: 0.32 },
  primaryText: { ...font.bold, fontSize: 16, color: '#FFFFFF' },
  stepBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, backgroundColor: 'rgba(255, 255, 255, 0.16)' },
  stepBadgeText: { ...font.bold, fontSize: 12, color: '#DCE3EA' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56 },
  confirmText: { flex: 1, ...font.bold, fontSize: 15, color: ink.strong },
  ghostBtn: { height: 48, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F3F6' },
  ghostText: { ...font.bold, fontSize: 14, color: ink.body },
  dangerBtn: { height: 48, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#B42318' },
  dangerText: { ...font.bold, fontSize: 14, color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
});
