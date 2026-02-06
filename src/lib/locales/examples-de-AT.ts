/**
 * Comprehensive Few-Shot Examples for Austrian/German Message Parsing
 * 
 * 100+ real-world examples categorized by message type and source.
 * Based on research of SchoolFox, WebUntis, WhatsApp, Telegram, and voice patterns.
 */

import type { InputExample } from './types';

// ===========================================
// 1. SCHOOL LETTERS (Elternbriefe) - 20 examples
// ===========================================

export const schoolLetterExamples: InputExample[] = [
  // Wandertag / Excursions
  {
    type: 'school_letter',
    description: 'Wandertag mit Kosten und Erlaubnis',
    text: `Liebe Eltern,
am Freitag, 15.03.2026, findet der Wandertag der 3a statt. Wir wandern zum Patscherkofel.
Treffpunkt: 8:00 Uhr Hauptbahnhof
Rückkehr: ca. 16:00 Uhr
Kosten: €12 (Seilbahn)
Mitzubringen: Jause, Getränk, feste Schuhe, Regenjacke
Bitte unterschreiben Sie den Abschnitt unten.`,
    expectedEvents: [{
      title: 'Wandertag 3a - Patscherkofel',
      date: '2026-03-15',
      time: '08:00',
      endTime: '16:00',
      location: 'Hauptbahnhof Treffpunkt',
    }],
  },
  {
    type: 'school_letter',
    description: 'Schulausflug Museum',
    text: `Sehr geehrte Erziehungsberechtigte,
die Klasse 2b besucht am 20.03. das Technische Museum Wien.
Abfahrt: 7:30 Uhr vom Schulparkplatz
Rückkehr: etwa 18:00 Uhr
Kosten: €25 (inkl. Bus und Eintritt)
Abgabe Einverständniserklärung bis 15.03.`,
    expectedEvents: [{
      title: 'Schulausflug Technisches Museum Wien',
      date: '2026-03-20',
      time: '07:30',
      endTime: '18:00',
      location: 'Schulparkplatz',
    }],
  },
  {
    type: 'school_letter',
    description: 'Projekttage/Klassenfahrt',
    text: `Liebe Eltern!
Vom 12. bis 14. Mai finden die Projekttage in Wagrain statt.
Programm: Hochseilgarten, Wanderungen, Teambuilding
Kosten: €180 (Unterkunft, Verpflegung, Programm)
Anzahlung €50 bis 20.04., Rest bis 05.05.
Packliste folgt.`,
    expectedEvents: [{
      title: 'Projekttage Wagrain',
      date: '2026-05-12',
      endDate: '2026-05-14',
      isAllDay: true,
      location: 'Wagrain',
    }],
  },
  // Schulschwimmen
  {
    type: 'school_letter',
    description: 'Schulschwimmen Information',
    text: `Liebe Eltern,
ab 10. Jänner findet jeden Dienstag Schulschwimmen statt.
Zeit: 10:00-11:30 Uhr im Hallenbad West
Mitzubringen: Badeanzug/Badehose, 2 Handtücher, Badelatschen, Duschgel
Bitte das Schwimmabzeichen eintragen im unteren Abschnitt.`,
    expectedEvents: [{
      title: 'Schulschwimmen',
      date: '2026-01-10',
      time: '10:00',
      endTime: '11:30',
      location: 'Hallenbad West',
      recurrence: 'weekly',
    }],
  },
  // Elternsprechtag
  {
    type: 'school_letter',
    description: 'Elternsprechtag mit Online-Buchung',
    text: `Sehr geehrte Eltern!
Der Elternsprechtag findet am 28.11. von 15:00-19:00 Uhr statt.
Terminbuchung online über SchoolFox bis 25.11.
Pro Lehrkraft max. 10 Minuten.
Wir freuen uns auf den Austausch!`,
    expectedEvents: [{
      title: 'Elternsprechtag',
      date: '2026-11-28',
      time: '15:00',
      endTime: '19:00',
      location: 'Schule',
    }],
  },
  // Schulfest / Sommerfest
  {
    type: 'school_letter',
    description: 'Sommerfest Einladung',
    text: `Herzliche Einladung zum Sommerfest!
Wann: Freitag, 27. Juni, 15:00-19:00 Uhr
Wo: Schulhof und Turnhalle
Programm: Aufführungen, Spiele, Tombola, Buffet
Wir bitten um Kuchenspenden! Bitte in der Klasse melden.`,
    expectedEvents: [{
      title: 'Sommerfest',
      date: '2026-06-27',
      time: '15:00',
      endTime: '19:00',
      location: 'Schulhof',
    }],
  },
  // Fasching
  {
    type: 'school_letter',
    description: 'Faschingsdienstag',
    text: `Liebe Eltern!
Am Faschingsdienstag, 17.02., feiern wir in der Schule.
Die Kinder dürfen verkleidet kommen!
ACHTUNG: Keine Waffen oder Plastikschwerter!
Unterricht von 8:00-11:40, danach Kostümparade im Turnsaal.
Bitte Jause für Buffet mitgeben.`,
    expectedEvents: [{
      title: 'Faschingsfeier in der Schule',
      date: '2026-02-17',
      time: '08:00',
      endTime: '11:40',
      location: 'Schule/Turnsaal',
    }],
  },
  // Schularbeit / Test
  {
    type: 'school_letter',
    description: 'Mathematik Schularbeit',
    text: `Info: Nächste Mathematik-Schularbeit am Donnerstag, 13.03.
Stoff: Kapitel 5-7 (Brüche, Dezimalzahlen)
Beginn: 2. Stunde
Bitte Geodreieck und Zirkel mitbringen!`,
    expectedEvents: [{
      title: 'Mathematik Schularbeit',
      date: '2026-03-13',
      time: '08:50',
      location: 'Klassenzimmer',
    }],
  },
  // Supplierung / Entfall
  {
    type: 'school_letter',
    description: 'Stundenänderung',
    text: `WebUntis Info: Am 05.02. entfällt die 6. Stunde (Biologie).
Unterrichtsende: 12:35 Uhr statt 13:30 Uhr.`,
    expectedEvents: [{
      title: 'Unterricht endet früher (Bio entfällt)',
      date: '2026-02-05',
      time: '12:35',
      isCancelled: true,
    }],
  },
  // Schulanmeldung
  {
    type: 'school_letter',
    description: 'Einschreibung Volksschule',
    text: `Sehr geehrte Eltern der Schulanfänger 2026/27!
Die Einschreibung findet statt:
Montag, 12.01., 14:00-17:00 Uhr
Dienstag, 13.01., 9:00-12:00 Uhr
Mitzubringen: Geburtsurkunde, Meldezettel, E-Card des Kindes`,
    expectedEvents: [
      { title: 'Schuleinschreibung', date: '2026-01-12', time: '14:00', endTime: '17:00' },
      { title: 'Schuleinschreibung', date: '2026-01-13', time: '09:00', endTime: '12:00' },
    ],
  },
  // Zeugnis
  {
    type: 'school_letter',
    description: 'Zeugnisverteilung',
    text: `Semesterzeugnisse werden am Freitag, 14.02., verteilt.
Unterrichtsschluss: 10:45 Uhr (nach der 4. Stunde)
Semesterferien: 15.02. - 23.02.`,
    expectedEvents: [{
      title: 'Zeugnisverteilung - Unterrichtsende 10:45',
      date: '2026-02-14',
      time: '10:45',
    }],
  },
  // Theaterbesuch
  {
    type: 'school_letter',
    description: 'Theater Vorstellung',
    text: `Am 18.03. besuchen wir die Vorstellung "Der kleine Prinz" im Landestheater.
Abfahrt: 9:30 Uhr von der Schule
Kosten: €8
Rückkehr: ca. 13:00 Uhr`,
    expectedEvents: [{
      title: 'Theaterbesuch - Der kleine Prinz',
      date: '2026-03-18',
      time: '09:30',
      endTime: '13:00',
      location: 'Landestheater',
    }],
  },
  // Fotograf
  {
    type: 'school_letter',
    description: 'Schulfotograf',
    text: `Der Schulfotograf kommt am Mittwoch, 05.03.
Bitte achten Sie auf ordentliche Kleidung.
Einzelfotos: 2. Stunde (3a)
Klassenfotos: 3. Stunde`,
    expectedEvents: [{
      title: 'Schulfotograf',
      date: '2026-03-05',
      time: '08:50',
      location: 'Schule',
    }],
  },
  // Impfung
  {
    type: 'school_letter',
    description: 'Schulimpfung',
    text: `Erinnerung: FSME-Impfung am 22.04. für angemeldete Kinder.
Ort: Turnsaal, ab 9:00 Uhr
Bitte Impfpass mitbringen!`,
    expectedEvents: [{
      title: 'FSME-Schulimpfung',
      date: '2026-04-22',
      time: '09:00',
      location: 'Turnsaal',
    }],
  },
  // Bibliothek
  {
    type: 'school_letter',
    description: 'Büchereistunde',
    text: `Jeden Mittwoch: Büchereistunde in der 5. Stunde.
Bitte ausgeliehene Bücher rechtzeitig zurückgeben!`,
    expectedEvents: [{
      title: 'Büchereistunde',
      time: '11:45',
      recurrence: 'weekly',
      dayOfWeek: 'wednesday',
    }],
  },
  // Elternverein
  {
    type: 'school_letter',
    description: 'Elternverein Sitzung',
    text: `Einladung zur Elternverein-Sitzung
Datum: 10.03.2026, 19:00 Uhr
Ort: Konferenzzimmer
Themen: Schulball, Förderungen, Diverses`,
    expectedEvents: [{
      title: 'Elternverein-Sitzung',
      date: '2026-03-10',
      time: '19:00',
      location: 'Konferenzzimmer',
    }],
  },
  // Verkehrserziehung
  {
    type: 'school_letter',
    description: 'Radfahrprüfung',
    text: `Radfahrprüfung für die 4. Klassen:
Theoretische Prüfung: 08.05., 2.-3. Stunde
Praktische Prüfung: 15.05., 8:00-12:00 Uhr
Bitte verkehrssicheres Rad und Helm mitbringen!`,
    expectedEvents: [
      { title: 'Radfahrprüfung - Theorie', date: '2026-05-08', time: '08:50' },
      { title: 'Radfahrprüfung - Praxis', date: '2026-05-15', time: '08:00', endTime: '12:00' },
    ],
  },
  // Skikurs
  {
    type: 'school_letter',
    description: 'Skikurs Wintersportwoche',
    text: `Wintersportwoche 2026
Termin: 09.-13. März
Ort: Saalbach-Hinterglemm
Kosten: €380 (all inclusive)
Anmeldung bis 15.01. über SchoolFox`,
    expectedEvents: [{
      title: 'Wintersportwoche Saalbach',
      date: '2026-03-09',
      endDate: '2026-03-13',
      isAllDay: true,
      location: 'Saalbach-Hinterglemm',
    }],
  },
  // Erste Hilfe Kurs
  {
    type: 'school_letter',
    description: 'Erste Hilfe Kurs',
    text: `16-Stunden Erste-Hilfe-Kurs für 8. Klassen
Termine: 20. und 21.03., jeweils 8:00-16:00 Uhr
Ort: Turnsaal
Kosten: €35 (vom Jugendrotkreuz)`,
    expectedEvents: [
      { title: 'Erste Hilfe Kurs Tag 1', date: '2026-03-20', time: '08:00', endTime: '16:00' },
      { title: 'Erste Hilfe Kurs Tag 2', date: '2026-03-21', time: '08:00', endTime: '16:00' },
    ],
  },
  // Schulveranstaltung mit Übernachtung
  {
    type: 'school_letter',
    description: 'Lesenacht',
    text: `Lesenacht der 2a
Datum: 28.03. (18:00) bis 29.03. (8:00)
Mitzubringen: Schlafsack, Isomatte, Taschenlampe, Lieblingsbuch, Schlafanzug, Zahnbürste`,
    expectedEvents: [{
      title: 'Lesenacht 2a',
      date: '2026-03-28',
      time: '18:00',
      endDate: '2026-03-29',
      endTime: '08:00',
      location: 'Schule',
    }],
  },
];

// ===========================================
// 2. SPORTS/TRAINING MESSAGES - 15 examples
// ===========================================

export const sportsExamples: InputExample[] = [
  {
    type: 'training_message',
    description: 'Fußball Training Absage wegen Wetter',
    text: 'Hallo zusammen, leider muss das Training am [Datum] um [Uhrzeit] wegen schlechtem Wetter ausfallen. Als Ersatztermin schlagen wir den [Vorgeschlagenes Datum] um [Vorgeschlagene Uhrzeit] vor.',
    expectedEvents: [],
  },
  {
    type: 'training_message',
    description: 'Trainingsplan Woche',
    text: `Trainingsplan 10.-16.02.
Mo: Kondition 17:00-18:30 Turnhalle
Mi: Technik 16:30-18:00 Sportplatz
Fr: Spiel 15:00-17:00 Hartplatz`,
    expectedEvents: [
      { title: 'Training Kondition', dayOfWeek: 'monday', time: '17:00', endTime: '18:30', location: 'Turnhalle' },
      { title: 'Training Technik', dayOfWeek: 'wednesday', time: '16:30', endTime: '18:00', location: 'Sportplatz' },
      { title: 'Training Spiel', dayOfWeek: 'friday', time: '15:00', endTime: '17:00', location: 'Hartplatz' },
    ],
  },
  {
    type: 'training_message',
    description: 'Tennis Stunde verschoben',
    text: 'Liebe Eltern, die Tennisstunde am Donnerstag 14:00 muss auf 16:00 verschoben werden. Gleicher Ort.',
    expectedEvents: [{
      title: 'Tennisstunde',
      dayOfWeek: 'thursday',
      time: '16:00',
    }],
  },
  {
    type: 'training_message',
    description: 'Schwimmkurs Anmeldung',
    text: `Schwimmkurs Anfänger
Start: 07.01.2026
Jeden Samstag 10:00-11:00
Ort: Hallenbad Olympia
10 Einheiten, €120`,
    expectedEvents: [{
      title: 'Schwimmkurs Anfänger',
      date: '2026-01-07',
      time: '10:00',
      endTime: '11:00',
      location: 'Hallenbad Olympia',
      recurrence: 'weekly',
    }],
  },
  {
    type: 'training_message',
    description: 'Kaderlehrgang Einladung',
    text: `Einladung zum Kaderlehrgang
Termin: 22.-24.02.2026
Ort: Bundessportzentrum Südstadt
Programm: Intensivtraining für Nachwuchskader
Anreise: Eigenregie, Check-in ab 14:00`,
    expectedEvents: [{
      title: 'Kaderlehrgang Bundessportzentrum',
      date: '2026-02-22',
      endDate: '2026-02-24',
      isAllDay: true,
      location: 'Bundessportzentrum Südstadt',
    }],
  },
  {
    type: 'training_message',
    description: 'Ballett Vorstellung',
    text: 'Reminder: Ballettaufführung am 15.12. um 17:00 im Stadtsaal. Bitte 30 Min vorher da sein. Kostüm anziehen!',
    expectedEvents: [{
      title: 'Ballettaufführung',
      date: '2026-12-15',
      time: '16:30',
      location: 'Stadtsaal',
    }],
  },
  {
    type: 'training_message',
    description: 'Turnier Anmeldung',
    text: `U12 Turnier am 08.03.
Spielort: Sportanlage West
Anpfiff 1. Spiel: 9:00 Uhr
Bitte um 8:15 da sein!
Trikot und Stutzen mitbringen`,
    expectedEvents: [{
      title: 'U12 Turnier',
      date: '2026-03-08',
      time: '08:15',
      location: 'Sportanlage West',
    }],
  },
  {
    type: 'training_message',
    description: 'Semesterferien Training',
    text: `Ferien-Intensivtraining
17.-21.02., täglich 9:00-12:00
Turnhalle Mitte
Kosten: €80 (inkl. Getränke)`,
    expectedEvents: [{
      title: 'Ferien-Intensivtraining',
      date: '2026-02-17',
      endDate: '2026-02-21',
      time: '09:00',
      endTime: '12:00',
      location: 'Turnhalle Mitte',
    }],
  },
  {
    type: 'training_message',
    description: 'Trainer krank',
    text: 'Training heute 17:00 fällt aus - Trainer krank. Nächstes Training wie geplant am Mittwoch.',
    expectedEvents: [{
      title: 'Training (entfällt)',
      time: '17:00',
      isCancelled: true,
    }],
  },
  {
    type: 'training_message',
    description: 'Kunstturnen Wettkampf',
    text: `Landesmeisterschaft Kunstturnen
Datum: 22.03.2026
Ort: Sporthalle Dornbirn
Eintreffen: 8:30 (Wettkampf ab 10:00)
Startreihenfolge wird vor Ort bekannt gegeben`,
    expectedEvents: [{
      title: 'Landesmeisterschaft Kunstturnen',
      date: '2026-03-22',
      time: '08:30',
      location: 'Sporthalle Dornbirn',
    }],
  },
  {
    type: 'training_message',
    description: 'Eishockey Eiszeit',
    text: 'Eiszeit Samstag 6:30-8:00 Olympiahalle!! Früh aufstehen 😅',
    expectedEvents: [{
      title: 'Eishockey Training',
      dayOfWeek: 'saturday',
      time: '06:30',
      endTime: '08:00',
      location: 'Olympiahalle',
    }],
  },
  {
    type: 'training_message',
    description: 'Reitstunde',
    text: 'Reitstunde verschoben: statt Do 15:00 → Fr 16:30 wegen Tierarztbesuch',
    expectedEvents: [{
      title: 'Reitstunde',
      dayOfWeek: 'friday',
      time: '16:30',
    }],
  },
  {
    type: 'training_message',
    description: 'Musikschule Konzert',
    text: `Vorspielabend Klavierklasse
Mittwoch, 19.03., 18:30
Festsaal Musikschule
Bitte 15 Min früher kommen!`,
    expectedEvents: [{
      title: 'Vorspielabend Klavier',
      date: '2026-03-19',
      time: '18:15',
      location: 'Festsaal Musikschule',
    }],
  },
  {
    type: 'training_message',
    description: 'Vereinsausflug',
    text: `Familien-Vereinsausflug!
1. Juni, 10:00-17:00
Freizeitpark XY
Kosten: €15/Kind, Erwachsene €25
Anmeldung bis 20.05.`,
    expectedEvents: [{
      title: 'Familien-Vereinsausflug Freizeitpark',
      date: '2026-06-01',
      time: '10:00',
      endTime: '17:00',
      location: 'Freizeitpark XY',
    }],
  },
  {
    type: 'training_message',
    description: 'Yoga für Kinder',
    text: 'Neuer Kinderyoga-Kurs ab 08.01. Jeden Mittwoch 15:30-16:30, Vereinshaus',
    expectedEvents: [{
      title: 'Kinderyoga',
      date: '2026-01-08',
      time: '15:30',
      endTime: '16:30',
      location: 'Vereinshaus',
      recurrence: 'weekly',
    }],
  },
];

// ===========================================
// 3. MEDICAL APPOINTMENTS - 10 examples
// ===========================================

export const medicalExamples: InputExample[] = [
  {
    type: 'appointment',
    description: 'Kinderarzt Termin SMS',
    text: 'Erinnerung: Termin bei Dr. Huber morgen 14:30. Bitte E-Card und Impfpass mitbringen.',
    expectedEvents: [{
      title: 'Kinderarzt Dr. Huber',
      date: 'tomorrow',
      time: '14:30',
    }],
  },
  {
    type: 'appointment',
    description: 'Zahnarzt Kontrolle',
    text: 'Zahnarzttermin für Max: 12.03. um 9:15, Praxis Dr. Maier, Hauptstraße 5',
    expectedEvents: [{
      title: 'Zahnarzt Max - Dr. Maier',
      date: '2026-03-12',
      time: '09:15',
      location: 'Praxis Dr. Maier, Hauptstraße 5',
    }],
  },
  {
    type: 'appointment',
    description: 'Kieferorthopäde',
    text: 'Spangenkontrolle Lena: Do 16:45 bei Dr. Schneider',
    expectedEvents: [{
      title: 'Spangenkontrolle Lena',
      dayOfWeek: 'thursday',
      time: '16:45',
      location: 'Dr. Schneider',
    }],
  },
  {
    type: 'appointment',
    description: 'Impftermin',
    text: 'FSME Auffrischung für die Kinder am 15.04. um 10:00 beim Hausarzt',
    expectedEvents: [{
      title: 'FSME Impfung Kinder',
      date: '2026-04-15',
      time: '10:00',
      location: 'Hausarzt',
    }],
  },
  {
    type: 'appointment',
    description: 'Logopädie',
    text: 'Logopädie wie immer: Dienstag 14:00, Praxis Stimmfit',
    expectedEvents: [{
      title: 'Logopädie',
      dayOfWeek: 'tuesday',
      time: '14:00',
      location: 'Praxis Stimmfit',
      recurrence: 'weekly',
    }],
  },
  {
    type: 'appointment',
    description: 'Augenarzt',
    text: 'Augenarzttermin verschoben auf 20.03., 11:30 (statt 15.03.)',
    expectedEvents: [{
      title: 'Augenarzt',
      date: '2026-03-20',
      time: '11:30',
    }],
  },
  {
    type: 'appointment',
    description: 'Physiotherapie',
    text: 'Physio Tim: Mo+Do 16:00, Therapiezentrum Nord. Bitte kurze Hose mitbringen!',
    expectedEvents: [
      { title: 'Physio Tim', dayOfWeek: 'monday', time: '16:00', location: 'Therapiezentrum Nord', recurrence: 'weekly' },
      { title: 'Physio Tim', dayOfWeek: 'thursday', time: '16:00', location: 'Therapiezentrum Nord', recurrence: 'weekly' },
    ],
  },
  {
    type: 'appointment',
    description: 'Mutter-Kind-Pass',
    text: 'Muki-Pass Untersuchung Sophie: 28.02. um 9:00 bei Dr. Wagner',
    expectedEvents: [{
      title: 'Mutter-Kind-Pass Untersuchung Sophie',
      date: '2026-02-28',
      time: '09:00',
      location: 'Dr. Wagner',
    }],
  },
  {
    type: 'appointment',
    description: 'HNO Arzt',
    text: 'HNO wg Paukenröhrchen: 05.03. 15:15, bitte nüchtern kommen',
    expectedEvents: [{
      title: 'HNO Paukenröhrchen',
      date: '2026-03-05',
      time: '15:15',
    }],
  },
  {
    type: 'appointment',
    description: 'Allergietest',
    text: 'Hautarzt Allergietest für Mia: Donnerstag 8:30. Keine Antihistaminika 3 Tage vorher!',
    expectedEvents: [{
      title: 'Allergietest Mia',
      dayOfWeek: 'thursday',
      time: '08:30',
      location: 'Hautarzt',
    }],
  },
];

// ===========================================
// 4. BIRTHDAY INVITATIONS - 10 examples  
// ===========================================

export const birthdayExamples: InputExample[] = [
  {
    type: 'invitation',
    description: 'Kindergeburtstag klassisch',
    text: `Hallo! 🎉
Ich feiere meinen 8. Geburtstag!
Wann: Samstag, 15.03., 14:00-17:00 Uhr
Wo: Bei mir zu Hause (Bergweg 12)
Bitte sag Mama bis 10.03. Bescheid!
Deine Anna`,
    expectedEvents: [{
      title: 'Kindergeburtstag Anna',
      date: '2026-03-15',
      time: '14:00',
      endTime: '17:00',
      location: 'Bergweg 12',
    }],
  },
  {
    type: 'invitation',
    description: 'Motto-Party Piraten',
    text: `Ahoi Landratte! 🏴‍☠️
Piratenparty bei Luis!
28.02. um 15:00, Gemeindesaal
Ende: 18:00
Bitte verkleidet kommen!
RSVP: 0664/1234567`,
    expectedEvents: [{
      title: 'Piratenparty Luis',
      date: '2026-02-28',
      time: '15:00',
      endTime: '18:00',
      location: 'Gemeindesaal',
    }],
  },
  {
    type: 'invitation',
    description: 'Schwimmbad Party',
    text: `Pack deine Badesachen ein! 🏊‍♂️
Paul feiert im Hallenbad!
So 22.03., 10:00-13:00
Treffpunkt Eingang Hallenbad Süd
Eltern können gerne mit ins Café`,
    expectedEvents: [{
      title: 'Geburtstag Paul - Hallenbad',
      date: '2026-03-22',
      time: '10:00',
      endTime: '13:00',
      location: 'Hallenbad Süd',
    }],
  },
  {
    type: 'invitation',
    description: 'Kino Geburtstag',
    text: `Kino-Geburtstag! 🎬
Emma wird 10!
Sa 08.03. um 14:00
Cineplexx, Film: [Kinderfilm]
Danach Pizza bei uns
Abholen: 18:30`,
    expectedEvents: [{
      title: 'Kino-Geburtstag Emma',
      date: '2026-03-08',
      time: '14:00',
      endTime: '18:30',
      location: 'Cineplexx',
    }],
  },
  {
    type: 'invitation',
    description: 'Fußball Geburtstag',
    text: `⚽ Fußball-Party! ⚽
Jakob wird 9!
Sonntag 16.03., 10:00-13:00
Soccerhalle City
Sportkleidung + Hallenschuhe!`,
    expectedEvents: [{
      title: 'Fußball-Party Jakob',
      date: '2026-03-16',
      time: '10:00',
      endTime: '13:00',
      location: 'Soccerhalle City',
    }],
  },
  {
    type: 'invitation',
    description: 'Übernachtungsparty',
    text: `Pyjamaparty! 🌙
Frieda wird 11
Fr 21.03. 17:00 bis Sa 10:00
Schlafsack + Kuscheltier mitbringen
Max 6 Kinder`,
    expectedEvents: [{
      title: 'Pyjamaparty Frieda',
      date: '2026-03-21',
      time: '17:00',
      endDate: '2026-03-22',
      endTime: '10:00',
    }],
  },
  {
    type: 'invitation',
    description: 'Bauernhof Party',
    text: `Bauernhof-Abenteuer! 🐄🐔
Leo lädt zum 7. Geburtstag
Sa 29.03. 13:00-16:30
Erlebnisbauernhof Müller
Bitte wetterfeste Kleidung + Gummistiefel`,
    expectedEvents: [{
      title: 'Bauernhof-Geburtstag Leo',
      date: '2026-03-29',
      time: '13:00',
      endTime: '16:30',
      location: 'Erlebnisbauernhof Müller',
    }],
  },
  {
    type: 'invitation',
    description: 'Prinzessinnen Party',
    text: `👑 Prinzessinnen-Ball 👑
Marie feiert 6. Geburtstag!
22.03. von 14:30-18:00
Bei uns im Garten
Komm als Prinzessin verkleidet!`,
    expectedEvents: [{
      title: 'Prinzessinnen-Party Marie',
      date: '2026-03-22',
      time: '14:30',
      endTime: '18:00',
    }],
  },
  {
    type: 'invitation',
    description: 'Klettern Geburtstag',
    text: `Ab in die Höhe! 🧗
Ben wird 12
Kletterhalle Boulder-Base
So 30.03., 11:00-14:00
Sportkleidung, Kletterschuhe vor Ort`,
    expectedEvents: [{
      title: 'Kletter-Geburtstag Ben',
      date: '2026-03-30',
      time: '11:00',
      endTime: '14:00',
      location: 'Kletterhalle Boulder-Base',
    }],
  },
  {
    type: 'invitation',
    description: 'Mini Golf Party',
    text: `Minigolf-Spaß! ⛳
Clara wird 9
Samstag 05.04., 14:00
Minigolfanlage Stadtpark
Danach Eis essen 🍦`,
    expectedEvents: [{
      title: 'Minigolf-Geburtstag Clara',
      date: '2026-04-05',
      time: '14:00',
      location: 'Minigolfanlage Stadtpark',
    }],
  },
];

// ===========================================
// 5. VOICE MESSAGE TRANSCRIPTIONS - 10 examples
// ===========================================

export const voiceExamples: InputExample[] = [
  {
    type: 'voice_message',
    description: 'Hastige Oma-Nachricht',
    text: 'Ja hallo Schatzi, also die Oma, ich wollte nur sagen am Sonntag komm ich euch besuchen, so gegen drei, bring ich Kuchen mit, bis dann!',
    expectedEvents: [{ title: 'Oma kommt zu Besuch', dayOfWeek: 'sunday', time: '15:00' }],
  },
  {
    type: 'voice_message',
    description: 'Fahrgemeinschaft organisieren',
    text: 'Hey, also wegen morgen Training, ich hol die Kinder um halb fünf bei euch ab und bring sie dann danach wieder zurück, so gegen sieben, passt das?',
    expectedEvents: [{ title: 'Fahrgemeinschaft Training', date: 'tomorrow', time: '16:30', endTime: '19:00' }],
  },
  {
    type: 'voice_message',
    description: 'Spontane Verabredung',
    text: 'Servas, hast du Lust heute Nachmittag auf den Spielplatz? So um drei?',
    expectedEvents: [{ title: 'Spielplatz Verabredung', date: 'today', time: '15:00' }],
  },
  {
    type: 'voice_message',
    description: 'Elternabend Erinnerung',
    text: 'Kurze Erinnerung, der Elternabend ist ja morgen Abend um sieben, kommt ihr auch?',
    expectedEvents: [{ title: 'Elternabend', date: 'tomorrow', time: '19:00' }],
  },
  {
    type: 'voice_message',
    description: 'Arzttermin verschieben',
    text: 'Grüß dich, hier die Ordination Dr Hofer, wegen dem Termin am Freitag vierzehn Uhr, der muss verschoben werden auf Montag, gleiche Zeit.',
    expectedEvents: [{ title: 'Dr. Hofer (verschoben)', dayOfWeek: 'monday', time: '14:00' }],
  },
  {
    type: 'voice_message',
    description: 'Papa Abhol-Chaos',
    text: 'Schatz ich steh im Stau, kannst du die Lena um halb vier vom Turnen abholen?',
    expectedEvents: [{ title: 'Lena vom Turnen abholen', time: '15:30' }],
  },
  {
    type: 'voice_message',
    description: 'Geburtstag absagen',
    text: 'Leider müssen wir für den Geburtstag am Samstag absagen, die Sophie ist krank.',
    expectedEvents: [{ title: 'Geburtstag (Absage)', dayOfWeek: 'saturday', isCancelled: true }],
  },
  {
    type: 'voice_message',
    description: 'Training Ortwechsel',
    text: 'Kurze Info, Training heute ausnahmsweise im Turnsaal, nicht am Platz wegen dem Wetter!',
    expectedEvents: [{ title: 'Training - TURNSAAL', location: 'Turnsaal' }],
  },
  {
    type: 'voice_message',
    description: 'Schwiegereltern zu Besuch',
    text: 'Also der Papa und ich, wir kommen am Samstag vorbei, so um elf Uhr.',
    expectedEvents: [{ title: 'Schwiegereltern zu Besuch', dayOfWeek: 'saturday', time: '11:00' }],
  },
  {
    type: 'voice_message',
    description: 'Handwerker Termin',
    text: 'Hier der Installateur Müller, ich komme am Dienstag zwischen neun und zehn wegen der Heizung.',
    expectedEvents: [{ title: 'Installateur Müller', dayOfWeek: 'tuesday', time: '09:00', endTime: '10:00' }],
  },
];

// ===========================================
// 6. RELIGIOUS EVENTS - 10 examples
// ===========================================

export const religiousExamples: InputExample[] = [
  {
    type: 'religious',
    description: 'Erstkommunion',
    text: 'Anna empfängt die erste heilige Kommunion am Sonntag, 11. Mai 2026, um 10:00 Uhr in der Pfarrkirche St. Josef',
    expectedEvents: [{ title: 'Erstkommunion Anna', date: '2026-05-11', time: '10:00', location: 'Pfarrkirche St. Josef' }],
  },
  {
    type: 'religious',
    description: 'Firmung',
    text: 'Die Firmung findet am 8. Juni 2026, 15:00 Uhr in der Pfarrkirche statt. Bitte 30 Min früher erscheinen!',
    expectedEvents: [{ title: 'Firmung', date: '2026-06-08', time: '14:30', location: 'Pfarrkirche' }],
  },
  {
    type: 'religious',
    description: 'Tauffeier',
    text: 'Taufe von Maximilian Sonntag 15.03. um 11:00 Pfarrkirche Maria Himmelfahrt',
    expectedEvents: [{ title: 'Taufe Maximilian', date: '2026-03-15', time: '11:00' }],
  },
  {
    type: 'religious',
    description: 'Schulmesse',
    text: 'Schulmesse am Freitag, 28.02., 8:00 Uhr in der Schulkapelle. Eltern herzlich willkommen!',
    expectedEvents: [{ title: 'Schulmesse', date: '2026-02-28', time: '08:00', location: 'Schulkapelle' }],
  },
  {
    type: 'religious',
    description: 'Sternsinger',
    text: 'Die Sternsinger kommen am 5. Jänner zwischen 9:00 und 12:00 in unserer Siedlung.',
    expectedEvents: [{ title: 'Sternsinger', date: '2026-01-05', time: '09:00', endTime: '12:00' }],
  },
  {
    type: 'religious',
    description: 'Kinderkirche',
    text: 'Kinderkirche jeden 2. Sonntag im Monat, 10:30-11:15, Pfarrsaal',
    expectedEvents: [{ title: 'Kinderkirche', time: '10:30', endTime: '11:15', location: 'Pfarrsaal', recurrence: 'biweekly' }],
  },
  {
    type: 'religious',
    description: 'Ministrantenprobe',
    text: 'Miniprobe Freitag 17:00 Sakristei - bitte pünktlich!',
    expectedEvents: [{ title: 'Ministrantenprobe', dayOfWeek: 'friday', time: '17:00', location: 'Sakristei' }],
  },
  {
    type: 'religious',
    description: 'Osternacht',
    text: 'Osternacht Samstag 20.04. ab 20:30, Beginn mit Osterfeuer vorm Kirchenportal',
    expectedEvents: [{ title: 'Osternacht mit Osterfeuer', date: '2026-04-20', time: '20:30' }],
  },
  {
    type: 'religious',
    description: 'Adventfeier',
    text: 'Pfarrliche Adventfeier 1. Adventsonntag, 30.11. 16:00 Uhr Pfarrheim',
    expectedEvents: [{ title: 'Adventfeier', date: '2026-11-30', time: '16:00', location: 'Pfarrheim' }],
  },
  {
    type: 'religious',
    description: 'Maiandacht',
    text: 'Maiandacht jeden Mittwoch im Mai, 18:30 bei der Marienkapelle',
    expectedEvents: [{ title: 'Maiandacht', time: '18:30', location: 'Marienkapelle', recurrence: 'weekly' }],
  },
];

// ===========================================
// 7. WHATSAPP GROUP - 15 examples
// ===========================================

export const whatsappExamples: InputExample[] = [
  { type: 'whatsapp', description: 'Pooling', text: 'Wer kann morgen 3. zur Schule mitnehmen? 🙈', expectedEvents: [] },
  { type: 'whatsapp', description: 'Jausen-Erinnerung', text: 'Reminder: morgen Jausenbuffet! Wer bringt was? 🥪', expectedEvents: [] },
  { type: 'whatsapp', description: 'Geburtstagssammlung', text: 'Sammeln für Frau Müllers Geschenk! €5 bis Fr 🎁', expectedEvents: [] },
  { type: 'whatsapp', description: 'Spielplatz spontan', text: 'Wir sind am Spielplatz hinterm Billa, wer Lust hat 🙂', expectedEvents: [] },
  { type: 'whatsapp', description: 'Training-Änderung', text: '⚠️ Training heute NICHT Sportplatz sondern Turnhalle!! ⚠️', expectedEvents: [{ title: 'Training - TURNHALLE', location: 'Turnhalle' }] },
  { type: 'whatsapp', description: 'Elterncafé', text: 'Elterncafé Mittwoch 8:30 nach der Schule! ☕', expectedEvents: [{ title: 'Elterncafé', dayOfWeek: 'wednesday', time: '08:30' }] },
  { type: 'whatsapp', description: 'Schulfest Helfer', text: 'Noch Helfer fürs Schulfest gesucht! 27.6. ab 14 Uhr? 🙋‍♀️', expectedEvents: [{ title: 'Schulfest Helfen', date: '2026-06-27', time: '14:00' }] },
  { type: 'whatsapp', description: 'Spielergebnis', text: 'Gewonnen!!! 3:1! 🎉 Nächstes Spiel Samstag 14 Uhr', expectedEvents: [{ title: 'Fußballspiel', dayOfWeek: 'saturday', time: '14:00' }] },
  { type: 'whatsapp', description: 'Stammtisch-Absage', text: 'Elternstammtisch heute Abend fällt aus 😔', expectedEvents: [{ title: 'Elternstammtisch (abgesagt)', isCancelled: true }] },
  { type: 'whatsapp', description: 'Martinsumzug', text: 'Martinsumzug am 11.11. um 17:00! Treffpunkt Feuerwehrhaus 🏮', expectedEvents: [{ title: 'Martinsumzug', date: '2026-11-11', time: '17:00', location: 'Feuerwehrhaus' }] },
  { type: 'whatsapp', description: 'Wandertag Wetter', text: 'Morgen Wandertag trotz Regen!! Regenjacke nicht vergessen 🌧️', expectedEvents: [] },
  { type: 'whatsapp', description: 'Hausübung', text: 'Hat jemand abfotografiert was in Mathe auf ist? 😅', expectedEvents: [] },
  { type: 'whatsapp', description: 'Krankheit', text: 'FYI: Bei uns geht die Magen-Darm rum 🤢', expectedEvents: [] },
  { type: 'whatsapp', description: 'Jacke suchen', text: 'Hat jemand eine rote Jacke von Jack Wolfskin gefunden? Größe 128', expectedEvents: [] },
  { type: 'whatsapp', description: 'Foto-Bestellung', text: 'Klassenfotos können bis Mo über SchoolFox bestellt werden!', expectedEvents: [] },
];

// ===========================================
// 8. SCHOOLFOX - 10 examples
// ===========================================

export const schoolfoxExamples: InputExample[] = [
  { type: 'schoolfox', description: 'Ausflug-Bestätigung', text: 'Bitte bestätigen Sie die Teilnahme am Schulausflug 20.03. bis 15.03.', expectedEvents: [{ title: 'Ausflug-Anmeldung fällig', date: '2026-03-15' }] },
  { type: 'schoolfox', description: 'Elternsprechtag-Buchung', text: 'Ihr Termin bei Fr. Mag. Huber: 28.11., 15:45-15:55 Uhr, Zimmer 204', expectedEvents: [{ title: 'Elternsprechtag Fr. Huber', date: '2026-11-28', time: '15:45', endTime: '15:55', location: 'Zimmer 204' }] },
  { type: 'schoolfox', description: 'Zahlungserinnerung', text: 'Schikurs 2026 - Offener Betrag: €180 - Bitte bis 01.03. überweisen.', expectedEvents: [{ title: 'Schikurs Zahlung fällig', date: '2026-03-01' }] },
  { type: 'schoolfox', description: 'Unterrichtsende', text: 'Am Freitag 07.03. endet der Unterricht nach der 4. Stunde (11:40 Uhr).', expectedEvents: [{ title: 'Unterricht endet 11:40', date: '2026-03-07', time: '11:40' }] },
  { type: 'schoolfox', description: 'Schularbeit', text: 'Deutsch-Schularbeit Datum: 25.03.2026 Stoff: Kapitel 1-4', expectedEvents: [{ title: 'Deutsch-Schularbeit', date: '2026-03-25' }] },
  { type: 'schoolfox', description: 'Elternabend', text: 'Einladung zum Elternabend 05.02.2026, 18:30 Uhr Klassenzimmer 3b', expectedEvents: [{ title: 'Elternabend 3b', date: '2026-02-05', time: '18:30', location: 'Klassenzimmer 3b' }] },
  { type: 'schoolfox', description: 'Material', text: 'Für Werken am Montag bitte mitbringen: 2 Klopapierrollen, Wasserfarben, Malkittel', expectedEvents: [{ title: 'Werken - Material mitbringen', dayOfWeek: 'monday' }] },
  { type: 'schoolfox', description: 'Sprechstunde', text: 'Fr. Berger bietet Sprechstunde an: Jeden Dienstag, 10:00-10:50 Uhr', expectedEvents: [{ title: 'Sprechstunde Fr. Berger', dayOfWeek: 'tuesday', time: '10:00', recurrence: 'weekly' }] },
  { type: 'schoolfox', description: 'Krankmeldung', text: 'Ihr Kind Anna wurde heute als abwesend gemeldet. Bitte um Entschuldigung.', expectedEvents: [] },
  { type: 'schoolfox', description: 'Umfrage', text: 'Umfrage: Projektwoche - Bitte stimmen Sie bis 20.02. ab', expectedEvents: [] },
];

// ===========================================
// 9. CANCELLATIONS - 10 examples
// ===========================================

export const cancellationExamples: InputExample[] = [
  { type: 'cancellation', description: 'Lehrerfortbildung', text: 'Schulfrei am 28.02. wegen schulinterner Lehrerfortbildung.', expectedEvents: [{ title: 'Schulfrei - Lehrerfortbildung', date: '2026-02-28', isAllDay: true }] },
  { type: 'cancellation', description: 'Hitzefrei', text: 'HITZEFREI morgen! Unterricht endet um 11:40.', expectedEvents: [{ title: 'Hitzefrei - Unterricht bis 11:40', date: 'tomorrow', time: '11:40' }] },
  { type: 'cancellation', description: 'Trainer krank', text: 'Schwimmkurs heute fällt aus (Trainer krank). Wird nachgeholt.', expectedEvents: [{ title: 'Schwimmkurs (entfällt)', date: 'today', isCancelled: true }] },
  { type: 'cancellation', description: 'Verschiebung', text: 'Der Elternabend am 05.02. muss auf 12.02. verschoben werden, 18:30.', expectedEvents: [{ title: 'Elternabend (verschoben)', date: '2026-02-12', time: '18:30' }] },
  { type: 'cancellation', description: 'Halle gesperrt', text: 'Training Mittwoch fällt aus - Turnhalle wegen Sanierung gesperrt.', expectedEvents: [{ title: 'Training Mittwoch (entfällt)', dayOfWeek: 'wednesday', isCancelled: true }] },
  { type: 'cancellation', description: 'Fest abgesagt', text: 'Das Schulfest am 27.06. muss leider abgesagt werden.', expectedEvents: [{ title: 'Schulfest (abgesagt)', date: '2026-06-27', isCancelled: true }] },
  { type: 'cancellation', description: 'Arzt Urlaub', text: 'Ordination Dr. Schmidt bleibt von 03.-07.03. wegen Urlaub geschlossen.', expectedEvents: [{ title: 'Dr. Schmidt geschlossen', date: '2026-03-03', endDate: '2026-03-07', isAllDay: true }] },
  { type: 'cancellation', description: 'Kursende', text: 'Der Gitarrenkurs endet planmäßig am 15.06. Neue Kurse im Herbst.', expectedEvents: [{ title: 'Gitarrenkurs letzte Stunde', date: '2026-06-15' }] },
  { type: 'cancellation', description: 'Unwetter', text: 'Wandertag morgen abgesagt wegen Unwetterwarnung! Normaler Unterricht.', expectedEvents: [{ title: 'Wandertag (abgesagt)', date: 'tomorrow', isCancelled: true }] },
  { type: 'cancellation', description: 'Freistellung', text: 'Freistellung für Max: 14.-16.03. wegen Familienfeier genehmigt.', expectedEvents: [{ title: 'Freistellung Max', date: '2026-03-14', endDate: '2026-03-16', isAllDay: true }] },
];

// ===========================================
// 10. TELEGRAM GROUPS - 10 examples
// ===========================================

export const telegramExamples: InputExample[] = [
  { type: 'telegram', description: 'Hauptversammlung', text: '📋 Jahreshauptversammlung 📅 Fr 28.03. 🕖 19:00 📍 Vereinsheim', expectedEvents: [{ title: 'Jahreshauptversammlung', date: '2026-03-28', time: '19:00', location: 'Vereinsheim' }] },
  { type: 'telegram', description: 'Trainingsplan', text: 'Mo 17:00 - Lauftraining, Mi 18:00 - Kraft, Fr 16:30 - Spiel', expectedEvents: [{ title: 'Lauftraining', dayOfWeek: 'monday', time: '17:00' }, { title: 'Krafttraining', dayOfWeek: 'wednesday', time: '18:00' }, { title: 'Spiel', dayOfWeek: 'friday', time: '16:30' }] },
  { type: 'telegram', description: 'Weihnachtsmarkt', text: 'Helfer gesucht: Sa 14.12. 10:00-14:00, So 15.12. 14:00-18:00', expectedEvents: [{ title: 'Weihnachtsmarkt Helfen', date: '2026-12-14', time: '10:00', endTime: '14:00' }, { title: 'Weihnachtsmarkt Helfen', date: '2026-12-15', time: '14:00', endTime: '18:00' }] },
  { type: 'telegram', description: 'Saisonabschluss', text: '🎉 SAISONABSCHLUSSFEIER Sa 28.06. ab 15:00 Sportplatz', expectedEvents: [{ title: 'Saisonabschlussfeier', date: '2026-06-28', time: '15:00', location: 'Sportplatz' }] },
  { type: 'telegram', description: 'Trikot-Deadline', text: '⚽ Trikot-Bestellung Deadline: 15.03.', expectedEvents: [{ title: 'Trikot-Bestellung Deadline', date: '2026-03-15' }] },
  { type: 'telegram', description: 'Vorstandssitzung', text: '📌 Vorstandssitzung Do 06.03. 19:30 Vereinsheim', expectedEvents: [{ title: 'Vorstandssitzung', date: '2026-03-06', time: '19:30', location: 'Vereinsheim' }] },
  { type: 'telegram', description: 'Arbeitseinsatz', text: '🔧 Arbeitseinsatz Sa 08.03. ab 9:00 Platzpflege', expectedEvents: [{ title: 'Arbeitseinsatz Platzpflege', date: '2026-03-08', time: '09:00' }] },
  { type: 'telegram', description: 'Jugendtraining', text: 'U10 Training Di + Do 16:00-17:30 Hartplatz', expectedEvents: [{ title: 'U10 Training', dayOfWeek: 'tuesday', time: '16:00', endTime: '17:30' }, { title: 'U10 Training', dayOfWeek: 'thursday', time: '16:00', endTime: '17:30' }] },
  { type: 'telegram', description: 'Auswärtsfahrt', text: '🚐 Auswärtsspiel Sa Abfahrt 12:00 Vereinsheim Spiel 14:30 Wörgl', expectedEvents: [{ title: 'Auswärtsspiel Wörgl', dayOfWeek: 'saturday', time: '12:00', location: 'Vereinsheim' }] },
  { type: 'telegram', description: 'Elternabend Verein', text: '📣 Elternabend Nachwuchs Mi 19.03. 19:00 Vereinslokal', expectedEvents: [{ title: 'Elternabend Nachwuchs', date: '2026-03-19', time: '19:00', location: 'Vereinslokal' }] },
];

// ===========================================
// 11. COMPLEX & DIALECT EXAMPLES - 30 examples
// ===========================================

// ===========================================
// 11. COMPLEX & DIALECT EXAMPLES - 30 examples
// ===========================================

export const complexExamples: InputExample[] = [
  // Dialect / Tyrolian Informal
  {
    type: 'group_message',
    description: 'Tirolerisch - Training absagen',
    text: 'Heite kimm i nit zum Kickn, bin total vaschnupft. Bis nächste Wochn dann!',
    expectedEvents: [{
      title: 'Fußballtraining Absage (Individuell)',
      isCancelled: true,
    }],
  },
  {
    type: 'group_message',
    description: 'Tirolerisch - Jause vergessen',
    text: 'Hat wer a Jausch übrig? Der Maxl hat sein Rucksackl dahoam lassn. 🥪',
    expectedEvents: [],
  },
  {
    type: 'voice_message',
    description: 'Tirolerisch - Oma Besuch',
    text: 'Griaß enk, die Oma isch am Apparat. I schaug am Sunntig bei enk vorbei, so gegen hoalb drei. Pfiat enk!',
    expectedEvents: [{
      title: 'Oma kommt zu Besuch',
      dayOfWeek: 'sunday',
      time: '14:30',
    }],
  },
  // Gymnasium Specialized
  {
    type: 'school_letter',
    description: 'Gymnasium - Nachzipf / Wiederholungsprüfung',
    text: `Termine für Wiederholungsprüfungen Sept 2026:
Mathe: Mo, 07.09. 08:00 Uhr
Englisch: Di, 08.09. 10:30 Uhr
Treffpunkt 15 Min vor Beginn vor dem jeweiligen Prüfungsraum.`,
    expectedEvents: [
      { title: 'Wiederholungsprüfung Mathe', date: '2026-09-07', time: '08:00' },
      { title: 'Wiederholungsprüfung Englisch', date: '2026-09-08', time: '10:30' },
    ],
  },
  {
    type: 'school_letter',
    description: 'Gymnasium - Maturaball Vorbereitung',
    text: 'Maturaball-Komiteesitzung am Donnerstag in der 7. Stunde im Mehrzwecksaal. Anwesenheit ist für alle Mitglieder verpflichtend.',
    expectedEvents: [{
      title: 'Maturaball-Komiteesitzung',
      dayOfWeek: 'thursday',
      time: '14:30', // 7. Stunde
      location: 'Mehrzwecksaal',
    }],
  },
  // Detailed SchoolFox
  {
    type: 'schoolfox_message',
    description: 'SchoolFox - Läusealarm mit Handlungsanweisung',
    text: `⚠️ WICHTIG: Erhöhtes Aufkommen von Kopfläusen in der 2b.
Bitte kontrollieren Sie heute Abend die Haare Ihres Kindes. 
Sollte ein Befall vorliegen, ist der Schulbesuch erst nach einer Behandlung und Vorlage einer Bestätigung wieder gestattet.`,
    expectedEvents: [{
      title: 'Haare auf Läuse kontrollieren',
      date: 'today',
    }],
  },
  // Complex Events
  {
    type: 'school_letter',
    description: 'Großes Schulfest mit Stationen',
    text: `Sommerfest der VS Innsbruck:
14:00 Eröffnung durch den Chor
14:30 - 16:30 Stationenbetrieb im Garten
17:00 Tombola-Verlosung
18:00 Ende der Veranstaltung
Bitte bringen Sie Geschirr und Besteck selbst mit (Zero Waste)!`,
    expectedEvents: [
      { title: 'Eröffnung Schulfest (Chor)', date: '2026-06-25', time: '14:00' },
      { title: 'Stationenbetrieb Schulfest', date: '2026-06-25', time: '14:30', endTime: '16:30' },
      { title: 'Tombola-Verlosung', date: '2026-06-25', time: '17:00' },
    ],
  },
  // Messy Voice Transcriptions
  {
    type: 'voice_message',
    description: 'Messy voice - Basketball reschedule',
    text: 'Äh hallo, hier ist der äh... Basketball-Trainer, also ich wollte sagen, das Spiel am Samstag äh nein, warte, am Sonntag um elf wurde verschoben auf... äh... zwei Uhr nachmittags am gleichen Ort.',
    expectedEvents: [{
      title: 'Basketball Spiel (Verschoben)',
      dayOfWeek: 'sunday',
      time: '14:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Self-correction transcription',
    text: 'Du, ich hol die Kinder morgen um vier ab, äh nein, ich schaffs erst um halb fünf, weil ich noch länger im Büro bin.',
    expectedEvents: [{
      title: 'Kinder abholen',
      date: 'tomorrow',
      time: '16:30',
    }],
  },
  // Action Items Focused
  {
    type: 'school_letter',
    description: 'Projekttage Packliste & Deadline',
    text: `Für die Projekttage am 12.05. bitte unbedingt mitbringen:
- Festes Schuhwerk
- Regenschutz
- Trinkflasche (mind. 1 Liter)
NICHT mitzubringen: Handys, elektronische Spiele.
Abgabe der Einverständniserklärung bis spätestens Freitag!`,
    expectedEvents: [{
      title: 'Projekttage Start',
      date: '2026-05-12',
      action_items: {
        bring: ['Festes Schuhwerk', 'Regenschutz', 'Trinkflasche'],
        not_bring: ['Handys', 'elektronische Spiele'],
        deadline: 'Freitag',
      },
    }],
  },
  // Further specialized Gymnasium / High School
  {
    type: 'school_letter',
    description: 'Oberstufe - Wahlpflichtfächer Anmeldung',
    text: `Anmeldung zu den Wahlpflichtfächern für das Schuljahr 2026/27:
Abgabe des Formulars beim Klassenvorstand bis 15.02.
Infoveranstaltung dazu am 03.02. in der 6. Stunde im Festsaal.`,
    expectedEvents: [
      { title: 'Infoveranstaltung Wahlpflichtfächer', date: '2026-02-03', time: '12:40' },
      { title: 'Abgabe Wahlpflichtfach-Formular', date: '2026-02-15' },
    ],
  },
  {
    type: 'school_letter',
    description: 'Gymnasium - Sprechstunden-Ausfall',
    text: 'Die Sprechstunde von Prof. Huber am Mittwoch, 11.03., entfällt wegen einer Fortbildung.',
    expectedEvents: [{
      title: 'Sprechstunde Prof. Huber',
      date: '2026-03-11',
      isCancelled: true,
    }],
  },
  {
    type: 'school_letter',
    description: 'Gymnasium - Brandschutzübung',
    text: 'Am Freitag findet in der 3. Stunde eine unangekündigte Brandschutzübung statt. Bitte die Klassenräume geordnet verlassen.',
    expectedEvents: [{
      title: 'Brandschutzübung',
      dayOfWeek: 'friday',
      time: '09:55',
    }],
  },
  // Detailed SchoolFox Handlungsbedarf
  {
    type: 'schoolfox_message',
    description: 'SchoolFox - Bestätigung für Impfaktion',
    text: `Impfaktion "Schutzherz" an der Schule am 18.04.
Bitte bestätigen Sie die Teilnahme oder Nicht-Teilnahme über die Schaltfläche in SchoolFox bis zum 10.04.
Impfpässe sind am Impftag mitzugeben.`,
    expectedEvents: [{
      title: 'Impfaktion an der Schule',
      date: '2026-04-18',
      action_items: {
        deadline: '2026-04-10',
        prepare: ['Impfpass mitgeben'],
      },
    }],
  },
  {
    type: 'schoolfox_message',
    description: 'SchoolFox - Elternbrief mit Rücklaufabschnitt',
    text: 'Bitte lesen Sie den angehängten Elternbrief zum Wandertag und bringen Sie den unterschriebenen Rücklaufabschnitt bis Montag mit.',
    expectedEvents: [{
      title: 'Wandertag Rücklaufabschnitt Abgabe',
      dayOfWeek: 'monday',
      action_items: { prepare: ['Rücklaufabschnitt unterschreiben'] },
    }],
  },
  // Messy & Informal (Slack/WhatsApp) - 10 examples
  {
    type: 'group_message',
    description: 'WhatsApp - Flohmarkt Hilfe',
    text: 'Wer von euch kann am Samstag beim Aufbau vom Flohmarkt helfen? Wir treffen uns um 8 im Schulhof. 🧱',
    expectedEvents: [{
      title: 'Aufbau Flohmarkt Hilfe',
      dayOfWeek: 'saturday',
      time: '08:00',
      location: 'Schulhof',
    }],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Kindergeburtstag Fahrgemeinschaft',
    text: 'Fährt wer am Sonntag zum Minigolf? Könnt wer den Paul mitnehmen? Er wär um 13:45 fertig zum Abholen.',
    expectedEvents: [{
      title: 'Paul zum Minigolf mitnehmen',
      dayOfWeek: 'sunday',
      time: '13:45',
    }],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Fundgrube Kleider',
    text: 'Habe eine rote Jacke (Gr. 128) in der Garderobe gefunden. Liegt jetzt beim Portier.',
    expectedEvents: [],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Jausen-Dienst',
    text: 'Morgen ist der Max mit der gesunden Jause dran! Bitte Obst und Gemüse für 25 Kinder mitbringen. 🍏',
    expectedEvents: [{
      title: 'Gesunde Jause bringen (Max)',
      date: 'tomorrow',
      action_items: { bring: ['Obst und Gemüse für 25 Kinder'] },
    }],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Turnbeutel vergessen',
    text: 'Hat wer den Turnbeutel von der Sophie gesehen? Pink mit Einhörnern. Vielleicht in der Turnhalle liegen gelassen?',
    expectedEvents: [],
  },
  // Messy Voice / Dialect variants
  {
    type: 'voice_message',
    description: 'Dialect messy - Piano lesson time',
    text: 'Du, i hobs grod gheat, das Klavier is heit nit um fümfe, sondern scho um viere. De Lehrerin hat gschriebn. Passt des bei dir?',
    expectedEvents: [{
      title: 'Klavierunterricht (Verschoben)',
      date: 'today',
      time: '16:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Dialect messy - Pick up details',
    text: 'Servus, i bin no beim Einkaufn. Kannst du die Leni vom Ballett abholen? Des is eh um sechse aus. I kimm dann direkt hoam.',
    expectedEvents: [{
      title: 'Leni vom Ballett abholen',
      time: '18:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Informal check-in',
    text: 'Hast du an den Elternabend heut dacht? Das geht um simme los in der Schule. I fahr scho a bissl früher hin.',
    expectedEvents: [{
      title: 'Elternabend',
      date: 'today',
      time: '19:00',
      location: 'Schule',
    }],
  },
  {
    type: 'voice_message',
    description: 'Hectic morning - missing item',
    text: 'Max hat sein Geo-Dreieck vergessen! Kannst dus ihm bitte nachbringen? Er hat in der zweiten Stunde Geometrie.',
    expectedEvents: [{
      title: 'Geo-Dreieck nachbringen',
      date: 'today',
      time: '08:50', // 2. Stunde
    }],
  },
  {
    type: 'voice_message',
    description: 'Babysitter change',
    text: 'Du, die Lena kann am Freitag doch nit sitzn. I hab jetzt die Susi gfrogt, die kommt um hoalb achte.',
    expectedEvents: [{
      title: 'Babysitter Susi kommt',
      dayOfWeek: 'friday',
      time: '19:30',
    }],
  },
  // Event with deadline and location
  {
    type: 'school_letter',
    description: 'Chor-Wochenende Anmeldung',
    text: `Chor-Wochenende in Obergurgl vom 20.11. bis 22.11.
Anmeldung und Anzahlung von €50 bis spätestens 30.10. im Sekretariat.`,
    expectedEvents: [{
      title: 'Chor-Wochenende Obergurgl',
      date: '2026-11-20',
      endDate: '2026-11-22',
      location: 'Obergurgl',
      action_items: { deadline: '2026-10-30', prepare: ['Anzahlung €50'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Schultaschen-Check',
    text: 'Wir machen am Mittwoch einen Schultaschen-Check. Bitte alles Unnötige ausmisten und Stifte spitzen!',
    expectedEvents: [{
      title: 'Schultaschen-Check',
      dayOfWeek: 'wednesday',
      action_items: { prepare: ['Ausmisten', 'Stifte spitzen'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Lese-Frühstück',
    text: 'Am Freitag laden wir zum Lese-Frühstück ein! Bitte ein Lieblingsbuch und einen kleinen Beitrag zum Buffet mitbringen.',
    expectedEvents: [{
      title: 'Lese-Frühstück',
      dayOfWeek: 'friday',
      action_items: { bring: ['Lieblingsbuch', 'Beitrag zum Buffet'] },
    }],
  },
  {
    type: 'appointment',
    description: 'Kieferorthopäde - Termin verschieben',
    text: 'Ihre Nachricht: Wir müssen den Termin am Montag leider absagen, da wir im Urlaub sind. Bitte um neuen Termin ab dem 15.04.',
    expectedEvents: [{
      title: 'Kieferorthopäde Termin',
      dayOfWeek: 'monday',
      isCancelled: true,
    }],
  },
  {
    type: 'school_letter',
    description: 'Hitzefrei Ankündigung',
    text: 'Aufgrund der extremen Hitze ist am Donnerstag nach der 4. Stunde unterrichtsfrei. Die Nachmittagsbetreuung findet wie gewohnt statt.',
    expectedEvents: [{
      title: 'Unterrichtsfrei (Hitzefrei)',
      dayOfWeek: 'thursday',
      time: '11:40',
    }],
  },
];

// ===========================================
// 12. GANZTAGSSCHULE & HORT - 10 examples
// ===========================================

export const hortExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'Anmeldung zum Mittagstisch',
    text: 'Bitte geben Sie die Anmeldung für den Mittagstisch im kommenden Semester bis spätestens 15.01. ab.',
    expectedEvents: [{
      title: 'Abgabe Anmeldung Mittagstisch',
      date: '2026-01-15',
    }],
  },
  {
    type: 'school_letter',
    description: 'Hort - Ausflug in den Park',
    text: 'Der Hort geht am Dienstag bei Schönwetter in den Rapoldipark. Bitte geben Sie Ihrem Kind eine Jause und wetterfeste Kleidung mit.',
    expectedEvents: [{
      title: 'Hort-Ausflug Rapoldipark',
      dayOfWeek: 'tuesday',
      location: 'Rapoldipark',
      action_items: { bring: ['Jause', 'wetterfeste Kleidung'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Ganztagsschule - Entschuldigung für Nachmittag',
    text: 'Wenn Ihr Kind am Donnerstag den Nachmittagsunterricht nicht besuchen kann (z.B. wegen eines Arzttermins), benötigen wir eine schriftliche Entschuldigung bis Mittwoch früh.',
    expectedEvents: [{
      title: 'Entschuldigung Nachmittag Abgabe',
      dayOfWeek: 'wednesday',
      time: '08:00',
    }],
  },
];

// ===========================================
// 13. ADDITIONAL GERMAN EXAMPLES - 7 examples (Total 150)
// ===========================================

export const additionalGermanExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'Elternbeitrag - Erinnerung',
    text: 'Erinnerung: Bitte überweisen Sie den Elternbeitrag für das 2. Semester (€25,-) bis Ende dieser Woche auf das Schulkonto.',
    expectedEvents: [{
      title: 'Elternbeitrag überweisen (€25)',
      date: 'within this week',
    }],
  },
  {
    type: 'school_letter',
    description: 'Schulbus - Fahrplanänderung',
    text: 'Achtung: Der Schulbus nach Igls fährt ab Montag 10 Minuten früher ab (07:15 statt 07:25).',
    expectedEvents: [{
      title: 'Schulbus Abfahrt NEU (07:15)',
      dayOfWeek: 'monday',
      time: '07:15',
    }],
  },
  {
    type: 'school_letter',
    description: 'Schwimmunterricht - Seepferdchen Prüfung',
    text: 'Am Freitag findet die Seepferdchen-Prüfung statt. Bitte €5,- Prüfungsgebühr und den Schwimmpass mitgeben.',
    expectedEvents: [{
      title: 'Seepferdchen-Prüfung (Schwimmen)',
      dayOfWeek: 'friday',
      action_items: { prepare: ['Schwimmpass mitgeben', '€5,- Prüfungsgebühr mitgeben'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Förderverein - Jahreshauptversammlung',
    text: 'Der Förderverein lädt zur Jahreshauptversammlung am 12.02. um 19:30 Uhr im Musiksaal ein.',
    expectedEvents: [{
      title: 'Jahreshauptversammlung Förderverein',
      date: '2026-02-12',
      time: '19:30',
      location: 'Musiksaal',
    }],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Fundsachen Versteigerung',
    text: 'Morgen nach dem Unterricht werden alle Fundsachen vor dem Eingang versteigert. Was übrig bleibt, kommt zur Caritas.',
    expectedEvents: [{
      title: 'Versteigerung Fundsachen',
      date: 'tomorrow',
    }],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Flohmarkt Standanmeldung',
    text: 'Wer beim Schulflohmarkt einen Stand haben möchte, bitte bis morgen Abend bei mir melden! Kostet 5€ Standgebühr.',
    expectedEvents: [{
      title: 'Anmeldung Flohmarktstand Deadline',
      date: 'tomorrow',
    }],
  },
  {
    type: 'voice_message',
    description: 'Tirolerisch - Skikurs Info',
    text: 'Du, wegerm Skikurs morgen: Die Kinder müssen schon um hoalb achte beim Parkplatz sein. Die Ausrüstung wird heit am Abend scho verladn.',
    expectedEvents: [{
      title: 'Skikurs Treffpunkt (Parkplatz)',
      date: 'tomorrow',
      time: '07:30',
      location: 'Parkplatz',
    }],
  },
];

// Combine all sets for final export
export const allExamples: InputExample[] = [
  ...schoolLetterExamples,    // 20
  ...sportsExamples,          // 15
  ...medicalExamples,         // 10
  ...birthdayExamples,        // 10
  ...voiceExamples,           // 10
  ...religiousExamples,       // 10
  ...whatsappExamples,        // 15
  ...schoolfoxExamples,       // 10
  ...cancellationExamples,    // 10
  ...telegramExamples,        // 10
  ...complexExamples,         // 10
  ...hortExamples,            // 3
  ...additionalGermanExamples, // 7
  // Total: 150
];

export const EXAMPLE_COUNT = allExamples.length;
