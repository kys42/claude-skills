import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';

import { PressedShoe } from '@/components/glyphs';
import { font, ink } from '@/components/theme';
import { CATEGORIES, CATEGORY_ORDER } from '@/domain/categories';
import { addDays, compareISO, formatKoreanDate, isValidISODate, todayISO } from '@/domain/dates';
import { STEPS } from '@/domain/level';
import type { Category, Size } from '@/domain/types';
import { useFootprints } from '@/store/footprints';

/** Break Korean lines between words, not inside them. */
const keepWords = Platform.select<TextStyle>({ web: { wordBreak: 'keep-all' } as TextStyle, default: {} });

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function EditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; id?: string }>();
  const existing = useFootprints((s) => s.footprints.find((f) => f.id === params.id));
  const add = useFootprints((s) => s.add);
  const update = useFootprints((s) => s.update);
  const remove = useFootprints((s) => s.remove);
  const today = todayISO();

  const initialDate = existing?.date ?? (params.date && isValidISODate(params.date) ? params.date : today);
  const [date, setDate] = useState(initialDate);
  const [dateText, setDateText] = useState(initialDate);
  const [size, setSize] = useState<Size>(existing?.size ?? 'big');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'project');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFuture = compareISO(date, today) > 0;
  const canSave = title.trim().length > 0 && !isFuture;
  const heading = existing ? '발자국 고치기' : '발자국 남기기';

  const moveDate = (days: number) => {
    const next = addDays(date, days);
    if (compareISO(next, today) > 0) return;
    setDate(next);
    setDateText(next);
  };

  const onDateText = (text: string) => {
    setDateText(text);
    if (isValidISODate(text)) setDate(text);
  };

  const save = () => {
    if (!title.trim()) return setError('제목을 적어 주세요.');
    if (isFuture) return setError('아직 오지 않은 날에는 남길 수 없어요.');
    const draft = { date, size, category, title, note };
    if (existing) update(existing.id, draft);
    else add(draft);
    close();
  };

  const onDelete = () => {
    if (!existing) return;
    if (!confirmDelete) return setConfirmDelete(true);
    remove(existing.id);
    close();
  };

  const dateLabel = useMemo(() => formatKoreanDate(date), [date]);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="닫기" style={styles.iconButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" stroke={ink.strong} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <Text style={styles.heading} accessibilityRole="header">
          {heading}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>언제였나요?</Text>
          <View style={styles.dateRow}>
            <Pressable onPress={() => moveDate(-1)} accessibilityRole="button" accessibilityLabel="하루 전" style={styles.stepper}>
              <Text style={styles.stepperText}>‹</Text>
            </Pressable>
            <Text style={styles.dateText}>{dateLabel}</Text>
            <Pressable
              onPress={() => moveDate(1)}
              disabled={date === today}
              accessibilityRole="button"
              accessibilityLabel="하루 뒤"
              style={[styles.stepper, date === today && styles.disabled]}>
              <Text style={styles.stepperText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.dateInputRow}>
            <TextInput
              value={dateText}
              onChangeText={onDateText}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8A96A3"
              accessibilityLabel="날짜 직접 입력"
              maxLength={10}
              style={[styles.input, styles.dateInput, !isValidISODate(dateText) && styles.inputError]}
            />
            {date !== today && (
              <Pressable onPress={() => onDateText(today)} accessibilityRole="button" style={styles.todayChip}>
                <Text style={styles.todayChipText}>오늘</Text>
              </Pressable>
            )}
          </View>
          {isFuture && <Text style={styles.errorText}>아직 오지 않은 날이에요.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>얼마나 큰 걸음이었나요?</Text>
          <View style={styles.sizeRow} accessibilityRole="radiogroup">
            {(['big', 'small'] as Size[]).map((s) => {
              const on = size === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSize(s)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.sizeCard, on && styles.sizeCardOn]}>
                  <Svg width={s === 'big' ? 44 : 26} height={s === 'big' ? 44 : 34} viewBox={s === 'big' ? '0 0 40 40' : '0 0 16 28'}>
                    {s === 'big' ? (
                      <>
                        <G transform="translate(2 10)">
                          <PressedShoe shade="#B3C1CF" tint={CATEGORIES[category].tint} tintOpacity={on ? 0.7 : 0.3} />
                        </G>
                        <G transform="translate(20 2)">
                          <PressedShoe shade="#B3C1CF" tint={CATEGORIES[category].tint} tintOpacity={on ? 0.7 : 0.3} />
                        </G>
                      </>
                    ) : (
                      <PressedShoe shade="#B3C1CF" tint={CATEGORIES[category].tint} tintOpacity={on ? 0.6 : 0.25} />
                    )}
                  </Svg>
                  <Text style={styles.sizeTitle}>{s === 'big' ? '큰 발자국' : '작은 발자국'}</Text>
                  <Text style={[styles.sizeDesc, keepWords]}>{s === 'big' ? '오래 기억할 성취와 전환점' : '자잘한 진척, 한 줄이면 충분'}</Text>
                  <Text style={styles.sizeSteps}>+{STEPS[s]} 걸음</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>어떤 발자국인가요?</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {CATEGORY_ORDER.map((c) => {
              const meta = CATEGORIES[c];
              const on = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && { backgroundColor: meta.wash, borderColor: meta.tint, borderWidth: 1.5 }]}>
                  <View style={[styles.chipDot, { backgroundColor: meta.tint }]} />
                  <Text style={[styles.chipText, on && { color: meta.text, ...font.bold }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label} nativeID="titleLabel">
            {size === 'big' ? '제목' : '한 줄로 남기기'}
          </Text>
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setError(null);
            }}
            placeholder={size === 'big' ? '예) 첫 사이드 프로젝트 출시' : '예) 리팩터링으로 빌드 시간 절반'}
            placeholderTextColor="#8A96A3"
            accessibilityLabelledBy="titleLabel"
            maxLength={60}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label} nativeID="noteLabel">
            어떤 의미였나요? <Text style={styles.optional}>(선택)</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="무엇이 달라졌는지, 왜 기억하고 싶은지"
            placeholderTextColor="#8A96A3"
            accessibilityLabelledBy="noteLabel"
            multiline
            maxLength={140}
            style={[styles.input, styles.noteInput]}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          style={({ pressed }) => [styles.save, !canSave && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.saveText}>{existing ? '고친 내용 저장' : '발자국 남기기'}</Text>
          <Text style={styles.saveSteps}>+{STEPS[size]} 걸음</Text>
        </Pressable>

        {existing && (
          <Pressable onPress={onDelete} accessibilityRole="button" style={({ pressed }) => [styles.delete, pressed && styles.pressed]}>
            <Text style={styles.deleteText}>{confirmDelete ? '정말 지울까요? 한 번 더 누르면 지워져요' : '이 발자국 지우기'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9FB' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 6 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { ...font.bold, fontSize: 17, color: ink.strong },
  body: { padding: 20, paddingBottom: 48, gap: 22, width: '100%', maxWidth: 520, alignSelf: 'center' },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3E8EE', gap: 10 },
  section: { gap: 10 },
  label: { ...font.bold, fontSize: 13, color: ink.body },
  optional: { ...font.regular, color: ink.muted },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F7' },
  stepperText: { fontSize: 24, lineHeight: 28, color: ink.strong },
  dateText: { ...font.bold, fontSize: 18, color: ink.strong },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateInput: { flex: 1, minWidth: 0, width: '100%', height: 44, minHeight: 44, fontSize: 15 },
  todayChip: { height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', backgroundColor: '#F1F4F7' },
  todayChipText: { ...font.bold, fontSize: 14, color: ink.strong },
  sizeRow: { flexDirection: 'row', gap: 10 },
  sizeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    gap: 6,
    minHeight: 150,
  },
  sizeCardOn: { borderColor: ink.strong, borderWidth: 1.5 },
  sizeTitle: { ...font.bold, fontSize: 15, color: ink.strong, marginTop: 4 },
  sizeDesc: { ...font.regular, fontSize: 12, lineHeight: 18, color: ink.muted },
  sizeSteps: { ...font.bold, fontSize: 12, color: ink.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDE3E9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...font.regular, fontSize: 14, color: ink.strong },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE3E9',
    backgroundColor: '#FFFFFF',
    ...font.regular,
    fontSize: 16,
    color: ink.strong,
  },
  inputError: { borderColor: '#C2410C' },
  noteInput: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  errorText: { ...font.regular, fontSize: 13, color: '#B42318' },
  save: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ink.strong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  saveText: { ...font.bold, fontSize: 16, color: '#FFFFFF' },
  saveSteps: { ...font.regular, fontSize: 13, color: '#C9D2DC' },
  delete: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { ...font.bold, fontSize: 14, color: '#B42318' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
