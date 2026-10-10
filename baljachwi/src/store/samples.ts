import type { FootprintDraft } from '@/domain/types';

/** Example trail taken from the claude-skills repository history. */
export const SAMPLE_FOOTPRINTS: FootprintDraft[] = [
  { date: '2026-03-23', size: 'big', category: 'change', title: '반복 작업을 스킬로 자동화하기 시작', note: '스킬 레포를 열고 첫 스킬 묶음을 올림' },
  { date: '2026-03-23', size: 'small', category: 'growth', title: '첫 이식 스킬 agent-browser' },
  { date: '2026-03-24', size: 'small', category: 'project', title: 'work-manager · summary 추가' },
  { date: '2026-03-30', size: 'small', category: 'project', title: 'blog_post callout 가이드 확장' },
  { date: '2026-05-15', size: 'big', category: 'growth', title: 'agent-web-guide 공개', note: '에이전트를 웹에 붙이는 법을 정리' },
  { date: '2026-05-15', size: 'small', category: 'project', title: 'README 스킬 목록 정리' },
  { date: '2026-09-16', size: 'big', category: 'achieve', title: '올마이티 스킬 공개', note: '먼저 제안하고 끝까지 책임지는 모드' },
  { date: '2026-09-16', size: 'small', category: 'achieve', title: '커스텀 스킬 10개 달성' },
  { date: '2026-10-10', size: 'big', category: 'project', title: '발자취 프로젝트 구상 시작', note: '걸어온 길을 남기는 앱을 그리기 시작' },
];
