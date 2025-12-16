'use client';

import { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useWizardStore } from '@/stores/wizard-store';

export function OnboardingStep() {
  const { familyMembers, addFamilyMember, removeFamilyMember } = useWizardStore();
  const [newName, setNewName] = useState('');

  const handleAddMember = () => {
    if (newName.trim()) {
      addFamilyMember(newName.trim());
      setNewName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddMember();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new member */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter a name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-11 flex-1"
        />
        <Button
          onClick={handleAddMember}
          disabled={!newName.trim()}
          variant="secondary"
          size="icon"
          className="h-11 w-11 shrink-0"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Family members list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {familyMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              layout
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
            >
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-emerald-700">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="flex-1 text-sm font-medium text-gray-900 truncate">
                {member.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFamilyMember(member.id)}
                className="h-8 w-8 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        {familyMembers.length === 0 && (
          <div className="flex items-center gap-2 text-gray-400 py-4 justify-center">
            <Users className="w-4 h-4" />
            <span className="text-sm">No family members added yet</span>
          </div>
        )}
      </div>
    </div>
  );
}
