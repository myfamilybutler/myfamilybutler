import { create } from 'zustand';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

interface WizardFormData {
  headOfHousehold: {
    name: string;
    role: string;
  };
  familyMembers: FamilyMember[];
}

interface WizardStore {
  currentStep: number;
  formData: WizardFormData;
  nextStep: () => void;
  prevStep: () => void;
  setHeadOfHousehold: (data: { name: string; role: string }) => void;
  addFamilyMember: (member: { name: string; role: string }) => void;
  removeFamilyMember: (id: string) => void;
  updateFamilyMember: (id: string, data: { name?: string; role?: string }) => void;
  reset: () => void;
}

const initialFormData: WizardFormData = {
  headOfHousehold: { name: '', role: '' },
  familyMembers: [],
};

export const useWizardStore = create<WizardStore>((set) => ({
  currentStep: 1,
  formData: initialFormData,

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, 3),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 1),
    })),

  setHeadOfHousehold: (data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        headOfHousehold: data,
      },
    })),

  addFamilyMember: (member) =>
    set((state) => ({
      formData: {
        ...state.formData,
        familyMembers: [
          ...state.formData.familyMembers,
          { ...member, id: crypto.randomUUID() },
        ],
      },
    })),

  removeFamilyMember: (id) =>
    set((state) => ({
      formData: {
        ...state.formData,
        familyMembers: state.formData.familyMembers.filter((m) => m.id !== id),
      },
    })),

  updateFamilyMember: (id, data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        familyMembers: state.formData.familyMembers.map((m) =>
          m.id === id ? { ...m, ...data } : m
        ),
      },
    })),

  reset: () =>
    set({
      currentStep: 1,
      formData: initialFormData,
    }),
}));
