import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface FilterStore {
  selectedMembers: string[];
  actions: {
    toggleMember: (member: string) => void;
    clearFilters: () => void;
    setMembers: (members: string[]) => void;
  };
}

export const useFilterStore = create<FilterStore>()(
  immer((set) => ({
    selectedMembers: [],
    actions: {
      toggleMember: (member) =>
        set((state) => {
          if (state.selectedMembers.includes(member)) {
            state.selectedMembers = state.selectedMembers.filter((m: string) => m !== member);
          } else {
            state.selectedMembers.push(member);
          }
        }),
      clearFilters: () =>
        set((state) => {
          state.selectedMembers = [];
        }),
      setMembers: (members) =>
        set((state) => {
          state.selectedMembers = members;
        }),
    },
  }))
);

export const useFilterActions = () => useFilterStore((state) => state.actions);
export const useSelectedMembers = () => useFilterStore((state) => state.selectedMembers);
