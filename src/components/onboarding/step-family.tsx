'use client';

import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useWizardStore } from '@/stores/wizard-store';

const roles = [
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
];

export function StepFamily() {
  const { formData, addFamilyMember, removeFamilyMember } = useWizardStore();
  const { familyMembers } = formData;
  
  const [newMember, setNewMember] = useState({ name: '', role: '' });

  const handleAddMember = () => {
    if (newMember.name && newMember.role) {
      addFamilyMember(newMember);
      setNewMember({ name: '', role: '' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Add Your Family</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Add family members who will be part of your household. You can always add more later.
        </p>
      </div>

      {/* Add new member form */}
      <div className="max-w-md mx-auto">
        <Card className="p-4 border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Name"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="h-11"
              />
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Role" />
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
            <Button
              onClick={handleAddMember}
              disabled={!newMember.name || !newMember.role}
              className="w-full"
              variant="secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </Card>
      </div>

      {/* Family members list */}
      <div className="max-w-md mx-auto space-y-3">
        <AnimatePresence mode="popLayout">
          {familyMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              layout
            >
              <Card className="p-4 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-emerald-700">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFamilyMember(member.id)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {familyMembers.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">
            No family members added yet
          </p>
        )}
      </div>
    </div>
  );
}
