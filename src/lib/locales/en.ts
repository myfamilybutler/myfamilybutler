/**
 * English Locale Configuration (en)
 * 
 * Target: English-speaking families (UK/US/International Schools).
 * Contains terminology, examples, and cultural context for AI prompts.
 */

import type { LocaleConfig, TermDefinition, HolidayConfig } from './types';
import { allExamples } from './examples-en';

// ===========================================
// School Terminology
// ===========================================

const schoolTerms: Record<string, TermDefinition> = {
  // === Events & Meetings ===
  "Parents' Evening": {
    meaning: 'Parent-teacher conference meeting',
    isEventType: true,
    category: 'school',
  },
  'Parent-Teacher Conference': {
    meaning: 'Individual meeting between parents and teachers',
    isEventType: true,
    category: 'school',
  },
  'Assembly': {
    meaning: 'School-wide gathering for announcements/performances',
    isEventType: true,
    category: 'school',
  },
  'PTA Meeting': {
    meaning: 'Parent-Teacher Association meeting',
    isEventType: true,
    category: 'school',
  },
  'Open Day': {
    meaning: 'Day when school is open for prospective parents to visit',
    isEventType: true,
    category: 'school',
  },

  // === School Activities ===
  'Field Trip': {
    meaning: 'Educational excursion outside of school',
    isEventType: true,
    category: 'school',
  },
  'School Trip': {
    meaning: 'Educational excursion outside of school',
    isEventType: true,
    category: 'school',
  },
  'Sports Day': {
    meaning: 'A day dedicated to athletic competitions for students',
    isEventType: true,
    category: 'school',
  },
  'Sports Carnival': {
    meaning: 'Large-scale athletic competition event',
    isEventType: true,
    category: 'school',
  },
  'Bake Sale': {
    meaning: 'Event where home-baked goods are sold for fundraising',
    isEventType: true,
    category: 'school',
  },
  'Book Fair': {
    meaning: 'Event where books are displayed and sold',
    isEventType: true,
    category: 'school',
  },

  // === Academic & Reports ===
  'Term Report': {
    meaning: 'Student progress report at the end of a term',
    isEventType: true,
    category: 'school',
  },
  'Mock Exam': {
    meaning: 'Practice examination before real finals',
    isEventType: true,
    category: 'school',
  },
  'In-service Day': {
    meaning: 'Staff training day, no classes for students',
    isEventType: true,
    category: 'school',
  },
  'Teacher Training Day': {
    meaning: 'Staff training day, no classes for students',
    isEventType: true,
    category: 'school',
  },
  'PD Day': {
    meaning: 'Professional Development day, school closed for students',
    isEventType: true,
    category: 'school',
  },

  // === Absences ===
  'Absence Note': {
    meaning: 'Communication explaining a student\'s absence',
    category: 'school',
  },
  'Sick Leave': {
    meaning: 'Absence due to illness',
    category: 'school',
  },
  'Authorized Absence': {
    meaning: 'Pre-approved absence for specific reasons',
    category: 'school',
  },
};

// ===========================================
// Sports Terminology
// ===========================================

const sportsTerms: Record<string, TermDefinition> = {
  'Practice': {
    meaning: 'Regular athletic training session',
    isEventType: true,
    category: 'sports',
  },
  'Training': {
    meaning: 'Athletic training session',
    isEventType: true,
    category: 'sports',
  },
  'Match': {
    meaning: 'Competitive sports game',
    isEventType: true,
    category: 'sports',
  },
  'Fixture': {
    meaning: 'Scheduled sports match',
    isEventType: true,
    category: 'sports',
  },
  'Tournament': {
    meaning: 'Competition with multiple matches',
    isEventType: true,
    category: 'sports',
  },
  'Swim Meet': {
    meaning: 'Swimming competition',
    isEventType: true,
    category: 'sports',
  },
  'PE Kit': {
    meaning: 'Physical Education clothing uniform',
    category: 'sports',
  },
};

// ===========================================
// Medical Terminology
// ===========================================

const medicalTerms: Record<string, TermDefinition> = {
  'Check-up': {
    meaning: 'Routine medical examination',
    isEventType: true,
    category: 'medical',
  },
  'Appointment': {
    meaning: 'Scheduled medical visit',
    isEventType: true,
    category: 'medical',
  },
  'Vaccination': {
    meaning: 'Medical immunization procedure',
    isEventType: true,
    category: 'medical',
  },
  'Jab': {
    meaning: 'Informal UK term for vaccination/shot',
    isEventType: true,
    category: 'medical',
  },
  'Shot': {
    meaning: 'Informal US term for vaccination/injection',
    isEventType: true,
    category: 'medical',
  },
};

// ===========================================
// Religious Terminology
// ===========================================

const religiousTerms: Record<string, TermDefinition> = {
  'Mass': {
    meaning: 'Christian religious service',
    isEventType: true,
    category: 'religious',
  },
  'Church Service': {
    meaning: 'Christian religious gathering',
    isEventType: true,
    category: 'religious',
  },
  'Baptism': {
    meaning: 'Christian rite of admission into the church',
    isEventType: true,
    category: 'religious',
  },
  'Confirmation': {
    meaning: 'Christian rite of passage',
    isEventType: true,
    category: 'religious',
  },
  'First Communion': {
    meaning: 'Religious ceremony for children',
    isEventType: true,
    category: 'religious',
  },
};

// ===========================================
// General Terms
// ===========================================

const generalTerms: Record<string, TermDefinition> = {
  'Birthday Party': {
    meaning: 'Celebration of a child\'s birthday',
    isEventType: true,
    defaultDuration: '2.5h',
    category: 'other',
  },
  'Playdate': {
    meaning: 'Arranged meeting for children to play',
    isEventType: true,
    category: 'other',
  },
  'Pick-up': {
    meaning: 'The act of collecting a child after school/activity',
    isEventType: true,
    category: 'other',
  },
  'Drop-off': {
    meaning: 'The act of delivering a child to school/activity',
    isEventType: true,
    category: 'other',
  },
};

// ===========================================
// English/US Holidays (Sample)
// ===========================================

const holidays: HolidayConfig[] = [
  { name: 'Half-term Break', description: 'Break in the middle of a school term', timing: 'Various' },
  { name: 'Christmas Break', description: 'Winter holidays', timing: 'Late December' },
  { name: 'Easter Break', description: 'Spring break', timing: 'March/April' },
  { name: 'Summer Holidays', description: 'End of academic year break', timing: 'July-August' },
];

export const enConfig: LocaleConfig = {
  id: 'en-GB',
  name: 'English (UK/International)',
  region: 'United Kingdom',
  timezone: 'Europe/London',
  countryCode: '+44',
  currency: 'GBP',
  dateFormat: {
    standard: 'DD/MM/YYYY',
    short: 'DD/MM',
    jsLocale: 'en-GB',
  },
  terminology: {
    school: schoolTerms,
    sports: sportsTerms,
    medical: medicalTerms,
    religious: religiousTerms,
    general: generalTerms,
  },
  holidays,
  schoolPeriods: {
    '1st Period': { start: '08:30', end: '09:30' },
    '2nd Period': { start: '09:30', end: '10:30' },
    'Break': { start: '10:30', end: '10:50' },
    '3rd Period': { start: '10:50', end: '11:50' },
    '4th Period': { start: '11:50', end: '12:50' },
    'Lunch': { start: '12:50', end: '13:50' },
    '5th Period': { start: '13:50', end: '14:50' },
    '6th Period': { start: '14:50', end: '15:50' },
  },
  culturalContext: [
    'Dates are primarily DD/MM/YYYY in UK and MM/DD/YYYY in US. AI should be flexible.',
    'Common sources include: Classroom Dojo, ParentSquare, Seesaw, Email Newsletters, WhatsApp.',
    'Terminology varies: "Primary School" (UK) vs "Elementary School" (US).',
  ],
  examples: allExamples,
};

export default enConfig;
