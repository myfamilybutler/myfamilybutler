'use client';

import { User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWizardStore } from '@/stores/wizard-store';

const roles = [
  { value: 'parent', label: 'Parent' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'other', label: 'Other' },
];

export function StepHousehold() {
  const { formData, setHeadOfHousehold } = useWizardStore();
  const { name, role } = formData.headOfHousehold;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome! Let&apos;s get started</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Tell us about yourself. You&apos;ll be the head of this household and can invite others to join.
        </p>
      </div>

      {/* Form */}
      <div className="max-w-sm mx-auto space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-700">
            Your Name
          </label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setHeadOfHousehold({ name: e.target.value, role })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-medium text-gray-700">
            Your Role
          </label>
          <Select
            value={role}
            onValueChange={(value) => setHeadOfHousehold({ name, role: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
