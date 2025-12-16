import { create } from 'zustand';

interface FamilyMember {
  id: string;
  name: string;
}

interface WizardStore {
  familyMembers: FamilyMember[];
  addFamilyMember: (name: string) => void;
  removeFamilyMember: (id: string) => void;
  reset: () => void;
}

export const useWizardStore = create<WizardStore>((set) => ({
  familyMembers: [],

  addFamilyMember: (name) =>
    set((state) => ({
      familyMembers: [
        ...state.familyMembers,
        { id: crypto.randomUUID(), name },
      ],
    })),

  removeFamilyMember: (id) =>
    set((state) => ({
      familyMembers: state.familyMembers.filter((m) => m.id !== id),
    })),

  reset: () =>
    set({
      familyMembers: [],
    }),
}));
