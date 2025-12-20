/**
 * Austrian Locale Configuration (de-AT)
 * 
 * Central knowledge base for Austrian/Tirolean families.
 * Contains terminology, examples, and cultural context for AI prompts.
 * 
 * To add new terms or examples:
 * 1. Find the appropriate section (school, sports, medical, etc.)
 * 2. Add your term/example following the existing pattern
 * 3. The AI prompts will automatically include your additions
 */

import type { LocaleConfig, TermDefinition, InputExample, HolidayConfig } from './types';

// ===========================================
// School Terminology (Schulbegriffe)
// ===========================================

const schoolTerms: Record<string, TermDefinition> = {
  // === Events & Meetings ===
  'Elternabend': {
    meaning: 'Parent-teacher evening meeting at school',
    isEventType: true,
    defaultDuration: '2h',
    category: 'school',
  },
  'Elternsprechtag': {
    meaning: 'Parent-teacher conference day with individual appointments',
    isEventType: true,
    category: 'school',
  },
  'Klassenforum': {
    meaning: 'Class parent representative meeting',
    isEventType: true,
    category: 'school',
  },
  'Schulforum': {
    meaning: 'School-wide parent council meeting',
    isEventType: true,
    category: 'school',
  },
  
  // === Free Days & Holidays ===
  'Schulautonom': {
    meaning: 'School-scheduled free days (decided by each school)',
    isEventType: true,
    category: 'school',
  },
  'schulautonom frei': {
    meaning: 'School-autonomous free day - no classes',
    isEventType: true,
    category: 'school',
  },
  
  // === School Activities ===
  'Wandertag': {
    meaning: 'School hiking/outdoor excursion day',
    isEventType: true,
    category: 'school',
  },
  'Projekttage': {
    meaning: 'Project-based learning days',
    isEventType: true,
    category: 'school',
  },
  'Projektwoche': {
    meaning: 'Week-long project-based learning',
    isEventType: true,
    defaultDuration: '5d',
    category: 'school',
  },
  'Schullandwoche': {
    meaning: 'Class trip to countryside (usually 1 week)',
    isEventType: true,
    defaultDuration: '5d',
    category: 'school',
  },
  'Schikurs': {
    meaning: 'School ski week/course',
    isEventType: true,
    defaultDuration: '5d',
    category: 'school',
  },
  'Wintersportwoche': {
    meaning: 'Winter sports week (skiing/snowboarding)',
    isEventType: true,
    defaultDuration: '5d',
    category: 'school',
  },
  'Sommersportwoche': {
    meaning: 'Summer sports week',
    isEventType: true,
    defaultDuration: '5d',
    category: 'school',
  },
  'Schwimmkurs': {
    meaning: 'School swimming lessons/course',
    isEventType: true,
    category: 'school',
  },
  'Schulfest': {
    meaning: 'School celebration/party',
    isEventType: true,
    category: 'school',
  },
  'Sommerfest': {
    meaning: 'End-of-year summer celebration',
    isEventType: true,
    category: 'school',
  },
  'Schulfotograf': {
    meaning: 'School photo day',
    isEventType: true,
    category: 'school',
  },
  
  // === School Documents ===
  'Zeugnis': {
    meaning: 'School report card/certificate',
    isEventType: false,
    category: 'school',
  },
  'Zeugnisvergabe': {
    meaning: 'Report card distribution day',
    isEventType: true,
    category: 'school',
  },
  'Schuleinschreibung': {
    meaning: 'School enrollment/registration for next year',
    isEventType: true,
    category: 'school',
  },
  
  // === Daily School Life ===
  'Jause': {
    meaning: 'School snack/break time food',
    isEventType: false,
    category: 'school',
  },
  'Jausengeld': {
    meaning: 'Money for school snacks',
    isEventType: false,
    category: 'school',
  },
  'Turnen': {
    meaning: 'Physical education / gym class',
    isEventType: false,
    category: 'school',
  },
  'Werken': {
    meaning: 'Crafts/woodworking class',
    isEventType: false,
    category: 'school',
  },
  
  // === Technology (iPad schools) ===
  'iPad-Klasse': {
    meaning: 'Class using iPads for digital learning',
    isEventType: false,
    category: 'school',
  },
  'Bildschirmzeit': {
    meaning: 'Screen time / digital device usage time',
    isEventType: false,
    category: 'school',
  },
};

// ===========================================
// Sports Terminology (Sportbegriffe)
// ===========================================

const sportsTerms: Record<string, TermDefinition> = {
  'Training': {
    meaning: 'Sports practice session',
    isEventType: true,
    defaultDuration: '1.5h',
    category: 'sports',
  },
  'Turnier': {
    meaning: 'Sports tournament/competition',
    isEventType: true,
    category: 'sports',
  },
  'Match': {
    meaning: 'Sports match/game',
    isEventType: true,
    defaultDuration: '2h',
    category: 'sports',
  },
  'Spiel': {
    meaning: 'Game/match',
    isEventType: true,
    defaultDuration: '2h',
    category: 'sports',
  },
  'Meisterschaft': {
    meaning: 'Championship/league game',
    isEventType: true,
    category: 'sports',
  },
  'Trainingslager': {
    meaning: 'Training camp',
    isEventType: true,
    category: 'sports',
  },
  'Saisonstart': {
    meaning: 'Season start/beginning',
    isEventType: true,
    category: 'sports',
  },
  'Saisonende': {
    meaning: 'Season end/finish',
    isEventType: true,
    category: 'sports',
  },
  'Training fällt aus': {
    meaning: 'Training is cancelled',
    isEventType: true,
    category: 'sports',
  },
  'Verein': {
    meaning: 'Club/association',
    isEventType: false,
    category: 'sports',
  },
};

// ===========================================
// Medical Terminology (Medizinische Begriffe)
// ===========================================

const medicalTerms: Record<string, TermDefinition> = {
  'Impftermin': {
    meaning: 'Vaccination appointment',
    isEventType: true,
    category: 'medical',
  },
  'Schulimpfung': {
    meaning: 'School vaccination day',
    isEventType: true,
    category: 'medical',
  },
  'Zahnarzt': {
    meaning: 'Dentist appointment',
    isEventType: true,
    defaultDuration: '1h',
    category: 'medical',
  },
  'Kinderarzt': {
    meaning: 'Pediatrician appointment',
    isEventType: true,
    defaultDuration: '30min',
    category: 'medical',
  },
  'Schuluntersuchung': {
    meaning: 'School medical examination',
    isEventType: true,
    category: 'medical',
  },
  'Therapie': {
    meaning: 'Therapy session',
    isEventType: true,
    defaultDuration: '1h',
    category: 'medical',
  },
};

// ===========================================
// Religious Events (Religiöse Termine)
// ===========================================

const religiousTerms: Record<string, TermDefinition> = {
  'Erstkommunion': {
    meaning: 'First Communion (Catholic)',
    isEventType: true,
    category: 'religious',
  },
  'Erste Kommunion': {
    meaning: 'First Communion (Catholic)',
    isEventType: true,
    category: 'religious',
  },
  'Firmung': {
    meaning: 'Confirmation (Catholic)',
    isEventType: true,
    category: 'religious',
  },
  'Taufe': {
    meaning: 'Baptism',
    isEventType: true,
    category: 'religious',
  },
  'Gottesdienst': {
    meaning: 'Church service',
    isEventType: true,
    category: 'religious',
  },
  'Schulmesse': {
    meaning: 'School mass/church service',
    isEventType: true,
    category: 'religious',
  },
};

// ===========================================
// General Terms (Allgemeine Begriffe)
// ===========================================

const generalTerms: Record<string, TermDefinition> = {
  'Geburtstag': {
    meaning: 'Birthday',
    isEventType: true,
    category: 'other',
  },
  'Kindergeburtstag': {
    meaning: 'Child\'s birthday party',
    isEventType: true,
    defaultDuration: '3h',
    category: 'other',
  },
  'Ausflug': {
    meaning: 'Excursion/trip',
    isEventType: true,
    category: 'other',
  },
  'Termin': {
    meaning: 'Appointment',
    isEventType: true,
    category: 'other',
  },
  'Besprechung': {
    meaning: 'Meeting/discussion',
    isEventType: true,
    category: 'other',
  },
};

// ===========================================
// Austrian School Holidays
// ===========================================

const holidays: HolidayConfig[] = [
  {
    name: 'Semesterferien',
    description: 'Mid-year winter break (1 week in February)',
    timing: 'February, varies by Bundesland',
  },
  {
    name: 'Osterferien',
    description: 'Easter break (around 2 weeks)',
    timing: 'March/April, moveable',
  },
  {
    name: 'Pfingstferien',
    description: 'Pentecost long weekend',
    timing: 'May/June, moveable',
  },
  {
    name: 'Sommerferien',
    description: 'Summer holidays (9 weeks)',
    timing: 'July-August',
  },
  {
    name: 'Herbstferien',
    description: 'Autumn break (around All Saints)',
    timing: 'Late October/Early November',
  },
  {
    name: 'Weihnachtsferien',
    description: 'Christmas holidays',
    timing: 'December 24 - January 6',
  },
];

// ===========================================
// Real-World Examples (Add your inputs here!)
// ===========================================

const examples: InputExample[] = [
  // === School Letters ===
  {
    type: 'school_letter',
    description: 'iPad Elternabend - Akademisches Gymnasium Innsbruck',
    text: `Liebe Eltern und Erziehungsberechtigte, 

ich darf Ihnen hier eine Mitteilung von Herrn Deniz Tekin weiterleiten. 

Liebe Eltern und Erziehungsberechtigte,

Wie bereits am Elternabend der ersten Klassen angesprochen, lädt das Akademische Gymnasium Innsbruck alle interessierten Eltern und Erziehungsberechtigten aus allen Klassen zu einem Informationsabend rund um das iPad im Schulalltag ein.

Themen des Abends:
Bildschirmzeit und verantwortungsvoller Umgang
Tipps und Tricks für den Alltag
Sicherheit und sinnvolle Einstellungen
Verwendung des iPads im Unterricht
Offene Fragerunde

Termine:
Mittwoch, 12. November: in deutscher Sprache
Donnerstag, 13. November: in englischer Sprache

Beginn: jeweils um 18:00 Uhr
Ort: Aula des Akademischen Gymnasiums Innsbruck

Bitte bringen Sie das iPad Ihres Kindes inklusive des PIN-Codes mit.`,
    expectedEvents: [
      {
        title: 'iPad Elternabend (Deutsch)',
        date: '2025-11-12',
        time: '18:00',
        location: 'Aula des Akademischen Gymnasiums Innsbruck',
      },
      {
        title: 'iPad Elternabend (Englisch)',
        date: '2025-11-13',
        time: '18:00',
        location: 'Aula des Akademischen Gymnasiums Innsbruck',
      },
    ],
  },

  // === Training Messages ===
  {
    type: 'training_message',
    description: 'Training cancellation via WhatsApp',
    text: 'Hallo zusammen! Training am Mittwoch fällt leider aus, dafür am Freitag 17:00 in der Turnhalle.',
    expectedEvents: [
      {
        title: 'Training (Ersatztermin)',
        date: '2025-12-27', // Next Friday from current date
        time: '17:00',
        location: 'Turnhalle',
      },
    ],
  },

  {
    type: 'training_message',
    description: 'Regular training reminder',
    text: 'Reminder: Fußballtraining morgen um 16:30 am Sportplatz. Bitte Schienbeinschoner mitbringen!',
    expectedEvents: [
      {
        title: 'Fußballtraining',
        date: '2025-12-21', // Tomorrow from current date
        time: '16:30',
        location: 'Sportplatz',
      },
    ],
  },

  // === Appointment Examples ===
  {
    type: 'appointment',
    description: 'Doctor appointment',
    text: 'Termin bei Dr. Müller am 15.01. um 14:30. Bitte E-Card mitbringen.',
    expectedEvents: [
      {
        title: 'Arzttermin Dr. Müller',
        date: '2026-01-15',
        time: '14:30',
      },
    ],
  },

  // === School Event ===
  {
    type: 'school_letter',
    description: 'Elternsprechtag announcement',
    text: `Sehr geehrte Eltern!

Der 1. Elternsprechtag findet am Freitag, den 22. November von 16:00 bis 19:00 Uhr statt.

Bitte melden Sie sich über Schoolfox für die gewünschten Gespräche an.

Mit freundlichen Grüßen
Die Schulleitung`,
    expectedEvents: [
      {
        title: 'Elternsprechtag',
        date: '2025-11-22',
        time: '16:00',
        endTime: '19:00',
        location: 'Schule',
      },
    ],
  },
];

// ===========================================
// Cultural Context for AI Prompts
// ===========================================

const culturalContext: string[] = [
  // Date format awareness
  'Österreichische Daten verwenden das Format DD.MM.YYYY (Tag.Monat.Jahr), NICHT das amerikanische Format.',
  'Monate: Jänner (Januar), Feber (Februar) sind typisch österreichische Bezeichnungen.',
  
  // School system
  'Das österreichische Schulsystem hat 9 Schulstufen in der Pflichtschule.',
  'Gymnasium beginnt ab der 5. Schulstufe (10 Jahre).',
  'Schulautonom bedeutet, dass die Schule selbst über freie Tage entscheidet.',
  
  // Communication style
  'Offizielle Schreiben beginnen oft mit "Sehr geehrte Eltern und Erziehungsberechtigte".',
  '"Elternbrief" ist der typische Name für Schulkommunikation.',
  
  // Sports clubs
  'Vereine (Clubs) kommunizieren oft über WhatsApp-Gruppen.',
  'Training-Absagen werden kurzfristig per Nachricht mitgeteilt.',
  
  // Time format
  'Uhrzeiten werden im 24-Stunden-Format angegeben (z.B. 18:00, nicht 6pm).',
  '"um 14 Uhr" oder "14:00 Uhr" sind übliche Zeitangaben.',
];

// ===========================================
// Export Complete Configuration
// ===========================================

export const deAT: LocaleConfig = {
  id: 'de-AT',
  name: 'Österreich',
  region: 'Tirol',
  timezone: 'Europe/Vienna',
  countryCode: '+43',
  currency: 'EUR',
  
  dateFormat: {
    standard: 'DD.MM.YYYY',
    short: 'DD.MM.',
    jsLocale: 'de-AT',
    monthNames: {
      1: 'Jänner',
      2: 'Feber',
    },
  },
  
  terminology: {
    school: schoolTerms,
    sports: sportsTerms,
    medical: medicalTerms,
    religious: religiousTerms,
    general: generalTerms,
  },
  
  holidays,
  examples,
  culturalContext,
};

export default deAT;
