import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Footprint, FootprintDraft } from '@/domain/types';
import { SAMPLE_FOOTPRINTS } from './samples';

/**
 * Local-first store. Everything lives on the device (AsyncStorage, which is
 * localStorage on the web). A sync backend can later subscribe to this store
 * without the screens changing.
 */
interface FootprintState {
  footprints: Footprint[];
  hydrated: boolean;
  add: (draft: FootprintDraft) => Footprint;
  update: (id: string, draft: FootprintDraft) => void;
  remove: (id: string) => void;
  loadSamples: () => void;
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

function clean(draft: FootprintDraft): FootprintDraft {
  const note = draft.note?.trim();
  return { ...draft, title: draft.title.trim(), note: note ? note : undefined };
}

export const useFootprints = create<FootprintState>()(
  persist(
    (set, get) => ({
      footprints: [],
      hydrated: false,
      add: (draft) => {
        const now = new Date().toISOString();
        const footprint: Footprint = { ...clean(draft), id: newId(), createdAt: now, updatedAt: now };
        set({ footprints: [...get().footprints, footprint] });
        return footprint;
      },
      update: (id, draft) => {
        const now = new Date().toISOString();
        set({
          footprints: get().footprints.map((f) => (f.id === id ? { ...f, ...clean(draft), updatedAt: now } : f)),
        });
      },
      remove: (id) => set({ footprints: get().footprints.filter((f) => f.id !== id) }),
      loadSamples: () => {
        const now = new Date().toISOString();
        const samples = SAMPLE_FOOTPRINTS.map((s, i) => ({
          ...s,
          id: newId() + i,
          createdAt: now,
          updatedAt: now,
        }));
        set({ footprints: [...get().footprints, ...samples] });
      },
    }),
    {
      name: 'baljachwi/footprints',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ footprints: state.footprints }),
      onRehydrateStorage: () => () => {
        useFootprints.setState({ hydrated: true });
      },
    },
  ),
);
