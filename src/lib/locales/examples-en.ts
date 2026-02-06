/**
 * English Few-Shot Examples for Message Parsing
 * 
 * 100+ real-world examples covering UK, US, and International schools.
 */

import type { InputExample } from './types';

// ===========================================
// 1. SCHOOL LETTERS & NEWSLETTERS - 25 examples
// ===========================================

export const schoolLetterExamples: InputExample[] = [
  // Field Trips
  {
    type: 'school_letter',
    description: 'Museum trip with cost and deadline',
    text: `Dear Parents,
We have arranged a field trip to the Science Museum on Friday, April 24, 2026.
Departure: 9:00 AM from the school gates.
Return: Approximately 3:30 PM.
Cost: $15 per student (covers bus and entry).
Please ensure your child brings a packed lunch and a water bottle.
Consent forms must be returned by Friday, April 17.`,
    expectedEvents: [{
      title: 'Field Trip - Science Museum',
      date: '2026-04-24',
      time: '09:00',
      endTime: '15:30',
      location: 'School Gates departure',
    }],
  },
  {
    type: 'school_letter',
    description: 'Nature walk announcement',
    text: `Hi Everyone,
The Reception class will be going on a nature walk to the local park tomorrow afternoon.
We will leave school at 1:30 PM and be back by 3:00 PM.
Please make sure your child has their wellies and a waterproof jacket.`,
    expectedEvents: [{
      title: 'Reception Nature Walk',
      date: 'tomorrow',
      time: '13:30',
      endTime: '15:00',
      location: 'Local Park',
    }],
  },
  {
    type: 'school_letter',
    description: 'Residential trip (multi-day)',
    text: `PGL Residential Trip - Year 6
Dates: Monday 15th June to Friday 19th June 2026.
Location: Boreton Hall.
Total cost: £280. 
Initial deposit of £50 due by Oct 31st.
A full kit list is attached to this email.`,
    expectedEvents: [{
      title: 'PGL Residential Trip - Boreton Hall',
      date: '2026-06-15',
      endDate: '2026-06-19',
      isAllDay: true,
      location: 'Boreton Hall',
    }],
  },
  // Parents' Evening
  {
    type: 'school_letter',
    description: 'Parents\' Evening Booking',
    text: `Dear Parents,
Our Spring Parents' Evening will take place on Tuesday, March 10th and Wednesday, March 11th from 3:30 PM to 6:30 PM.
Appointments can be booked via the ParentSquare app starting Monday at 8:00 AM.
Meetings will be 10 minutes each.`,
    expectedEvents: [
      { title: 'Parents\' Evening Day 1', date: '2026-03-10', time: '15:30', endTime: '18:30' },
      { title: 'Parents\' Evening Day 2', date: '2026-03-11', time: '15:30', endTime: '18:30' },
    ],
  },
  // Sports Day
  {
    type: 'school_letter',
    description: 'Annual Sports Day',
    text: `Sports Day Reminder!
Wednesday, July 1st. 
KS1 Events: 9:30 AM - 12:00 PM
KS2 Events: 1:30 PM - 3:45 PM
Parents are welcome to join us on the field. 
Please bring chairs and plenty of sunscreen!
Students should wear house colors and their PE kit.`,
    expectedEvents: [
      { title: 'Sports Day - KS1', date: '2026-07-01', time: '09:30', endTime: '12:00', location: 'School Field' },
      { title: 'Sports Day - KS2', date: '2026-07-01', time: '13:30', endTime: '15:45', location: 'School Field' },
    ],
  },
  // Performances
  {
    type: 'school_letter',
    description: 'Christmas Play',
    text: `The Year 1 & 2 Nativity Play: "A Starry Night"
Tuesday, December 16th at 2:00 PM
Wednesday, December 17th at 6:00 PM
Tickets are limited to 2 per family. 
Please return the ticket request form by Dec 5th.`,
    expectedEvents: [
      { title: 'Nativity Play - Afternoon Show', date: '2025-12-16', time: '14:00' },
      { title: 'Nativity Play - Evening Show', date: '2025-12-17', time: '18:00' },
    ],
  },
  // Staff Training
  {
    type: 'school_letter',
    description: 'Inset Day Closure',
    text: `School Closure: Friday, February 13th, 2026.
School will be closed to all students for a Staff Training (INSET) day.
We will reopen on Monday, February 16th.`,
    expectedEvents: [{
      title: 'School Closed - Staff Training (INSET)',
      date: '2026-02-13',
      isAllDay: true,
    }],
  },
  // Fundraisers
  {
    type: 'school_letter',
    description: 'School Disco',
    text: `PTA Winter Disco!
Friday, Jan 30th.
Infants (Year R-2): 4:30 PM - 5:30 PM
Juniors (Year 3-6): 5:45 PM - 7:00 PM
Tickets: £3 (includes a drink and a snack).
To be held in the School Hall.`,
    expectedEvents: [
      { title: 'Winter Disco - Infants', date: '2026-01-30', time: '16:30', endTime: '17:30', location: 'School Hall' },
      { title: 'Winter Disco - Juniors', date: '2026-01-30', time: '17:45', endTime: '19:00', location: 'School Hall' },
    ],
  },
  {
    type: 'school_letter',
    description: 'School Bake Sale',
    text: `Bake Sale for Charity!
Next Friday, May 22nd. 
Please bring in nut-free cakes and treats in the morning.
The sale will take place after school at 3:15 PM in the playground.
All proceeds go to the local food bank.`,
    expectedEvents: [{
      title: 'School Bake Sale',
      date: '2026-05-22',
      time: '15:15',
      location: 'School Playground',
    }],
  },
  // Music/Art
  {
    type: 'school_letter',
    description: 'Music Recital',
    text: `Spring Music Recital
Monday evening, March 23rd at 7:00 PM.
Main Assembly Hall.
Students performing should arrive by 6:30 PM in their formal uniforms.`,
    expectedEvents: [{
      title: 'Spring Music Recital',
      date: '2026-03-23',
      time: '18:30',
      location: 'Assembly Hall',
    }],
  },
  // Library/Book Fair
  {
    type: 'school_letter',
    description: 'Book Fair Week',
    text: `The Scholastic Book Fair is coming!
From Nov 10th to Nov 14th.
The library will be open after school until 4:30 PM each day for browsing and purchasing.
Come support our school library!`,
    expectedEvents: [{
      title: 'Scholastic Book Fair',
      date: '2025-11-10',
      endDate: '2025-11-14',
      time: '15:15',
      endTime: '16:30',
      location: 'School Library',
    }],
  },
  // Photographs
  {
    type: 'school_letter',
    description: 'School Photo Day',
    text: `School Individual Portraits
Tuesday, October 7th.
Please make sure your child is in full school uniform (including tie and blazer for seniors).
Sibling photos will take place before school at 8:15 AM in the gym.`,
    expectedEvents: [
      { title: 'Individual School Photos', date: '2025-10-07', isAllDay: true },
      { title: 'Sibling School Photos', date: '2025-10-07', time: '08:15', location: 'Gym' },
    ],
  },
  // Uniform
  {
    type: 'school_letter',
    description: 'Non-Uniform Day',
    text: `Non-Uniform / Mufti Day!
Friday, June 12th.
Please bring a £1 donation for the summer fayre.
No open-toed shoes or crop tops please.`,
    expectedEvents: [{
      title: 'Non-Uniform Day (Mufti Day)',
      date: '2026-06-12',
      isAllDay: true,
    }],
  },
  // Exams
  {
    type: 'school_letter',
    description: 'Mock Exams Schedule',
    text: `Year 11 Mock Exams - Week 1
Mon Jan 12: English Lang (9:00), Maths P1 (1:30)
Tue Jan 13: Biology (9:00), French Reading (1:30)
Wed Jan 14: History (9:00), Maths P2 (1:30)`,
    expectedEvents: [
      { title: 'Mock Exam: English Lang', date: '2026-01-12', time: '09:00' },
      { title: 'Mock Exam: Maths P1', date: '2026-01-12', time: '13:30' },
      { title: 'Mock Exam: Biology', date: '2026-01-13', time: '09:00' },
      { title: 'Mock Exam: French Reading', date: '2026-01-13', time: '13:30' },
      { title: 'Mock Exam: History', date: '2026-01-14', time: '09:00' },
      { title: 'Mock Exam: Maths P2', date: '2026-01-14', time: '13:30' },
    ],
  },
  // Graduation/End of Year
  {
    type: 'school_letter',
    description: 'Year 6 Leavers\' Assembly',
    text: `Year 6 Leavers' Assembly and Award Ceremony
Friday, July 17th at 10:00 AM.
Afterward, we invite families to stay for a picnic on the field from 11:30 AM.
School closes for the summer at 1:30 PM.`,
    expectedEvents: [
      { title: 'Year 6 Leavers\' Assembly', date: '2026-07-17', time: '10:00', endTime: '11:30' },
      { title: 'Leavers\' Picnic', date: '2026-07-17', time: '11:30', endTime: '13:30', location: 'School Field' },
      { title: 'Early Finish - Summer Break', date: '2026-07-17', time: '13:30' },
    ],
  },
  // Health
  {
    type: 'school_letter',
    description: 'Vision Screening',
    text: `Health Notice: Vision and Hearing Screening for Reception students.
Tuesday, May 5th during school hours.
If you do NOT wish your child to participate, please contact the office by Friday.`,
    expectedEvents: [{
      title: 'Vision & Hearing Screening',
      date: '2026-05-05',
      isAllDay: true,
    }],
  },
  // Meetings
  {
    type: 'school_letter',
    description: 'Governors Annual Meeting',
    text: `Annual General Meeting of the School Governors
Date: Wednesday, Feb 18th
Time: 6:30 PM
Location: School Library
Open to all parents.`,
    expectedEvents: [{
      title: 'Governors Annual General Meeting',
      date: '2026-02-18',
      time: '18:30',
      location: 'School Library',
    }],
  },
  // After School Clubs
  {
    type: 'school_letter',
    description: 'After School Clubs Signup',
    text: `Clubs for Term 3 (Spring)
Starting week of Jan 5th.
Football: Tue 3:30-4:30
Choir: Wed 3:30-4:15
Chess: Thu 3:30-4:30
Coding: Fri 3:30-4:30
Please use the online portal to sign up.`,
    expectedEvents: [
      { title: 'After School Football', dayOfWeek: 'tuesday', time: '15:30', endTime: '16:30', recurrence: 'weekly' },
      { title: 'After School Choir', dayOfWeek: 'wednesday', time: '15:30', endTime: '16:15', recurrence: 'weekly' },
      { title: 'After School Chess', dayOfWeek: 'thursday', time: '15:30', endTime: '16:30', recurrence: 'weekly' },
      { title: 'After School Coding', dayOfWeek: 'friday', time: '15:30', endTime: '16:30', recurrence: 'weekly' },
    ],
  },
  // Emergency
  {
    type: 'school_letter',
    description: 'Snow Day Closure',
    text: `Emergency Closure Notice
Due to heavy snowfall and dangerous road conditions, school will be CLOSED today, Monday Feb 2nd.
Remote learning materials will be uploaded to Google Classroom by 10 AM.`,
    expectedEvents: [{
      title: 'School Closed - Snow Day',
      date: '2026-02-02',
      isAllDay: true,
      isCancelled: true,
    }],
  },
  // Parent Volunteers
  {
    type: 'school_letter',
    description: 'Field Trip Volunteer Call',
    text: `Volunteers Needed!
We are looking for three parents to chaperone the Year 1 trip to the Zoo on Thursday, June 4th.
Time: 9:00 AM - 3:15 PM.
Must have a valid DBS check. 
Email the office if you can help.`,
    expectedEvents: [{
      title: 'Zoo Trip - Parent Chaperone',
      date: '2026-06-04',
      time: '09:00',
      endTime: '15:15',
    }],
  },
  // Assemblies
  {
    type: 'school_letter',
    description: 'Class Performance Assembly',
    text: `Year 3 Performance Assembly: "The Ancient Greeks"
Friday morning, May 22nd at 9:00 AM.
Parents of Year 3 are invited to join us in the hall.
Coffee and tea will be served from 8:30 AM.`,
    expectedEvents: [
      { title: 'Morning Coffee for Parents', date: '2026-05-22', time: '08:30' },
      { title: 'Year 3 Performance Assembly', date: '2026-05-22', time: '09:00', location: 'School Hall' },
    ],
  },
  // Swimming
  {
    type: 'school_letter',
    description: 'Swimming Lessons Term',
    text: `Year 4 Swimming Lessons
Every Monday starting Feb 2nd for 10 weeks.
Departing school at 10:30 AM, returning for lunch.
Required: Swimsuit, towel, goggles, and float if needed.`,
    expectedEvents: [{
      title: 'Year 4 Swimming Lessons',
      date: '2026-02-02',
      time: '10:30',
      recurrence: 'weekly',
    }],
  },
  // Parent Drop-in
  {
    type: 'school_letter',
    description: 'Drop-in Math Workshop',
    text: `Math Mastery Parent Workshop
How we teach fractions and decimals.
Thursday, Nov 6th.
Session 1: 9:00 AM - 10:00 AM
Session 2: 6:00 PM - 7:00 PM
Please RSVP by Monday.`,
    expectedEvents: [
      { title: 'Math Workshop Session 1', date: '2025-11-06', time: '09:00', endTime: '10:00' },
      { title: 'Math Workshop Session 2', date: '2025-11-06', time: '18:00', endTime: '19:00' },
    ],
  },
  // Holiday Info
  {
    type: 'school_letter',
    description: 'Half Term Holiday Dates',
    text: `Half Term Break Reminder
School finishes at regular time on Friday, Oct 24th.
We are closed for one week.
Students return on Monday, Nov 3rd at 8:40 AM.`,
    expectedEvents: [{
      title: 'Half Term Break Starts',
      date: '2025-10-24',
      isAllDay: true,
    }],
  },
  // Science Fair
  {
    type: 'school_letter',
    description: 'Young Scientist Competition',
    text: `Annual Science Fair & Competition
Date: Wednesday, Feb 11th.
Exhibition open for parents from 3:30 PM - 5:00 PM.
Judging will take place during the school day.
Good luck to all participants!`,
    expectedEvents: [{
      title: 'Science Fair Exhibition',
      date: '2026-02-11',
      time: '15:30',
      endTime: '17:00',
    }],
  },
];

// ===========================================
// 2. SPORTS & TRAINING - 20 examples
// ===========================================

export const sportsExamples: InputExample[] = [
  {
    type: 'training_message',
    description: 'Football training change',
    text: 'Hi team, tomorrow\'s practice is moved from 4:00 PM to 5:30 PM due to the heat. Same field.',
    expectedEvents: [{
      title: 'Football Practice (Updated Time)',
      date: 'tomorrow',
      time: '17:30',
    }],
  },
  {
    type: 'training_message',
    description: 'Weekly training schedule',
    text: `Weekly Training Schedule:
Mon: Strength & Conditioning 5:00 PM - 6:30 PM (Gym)
Wed: Ball Skills 4:30 PM - 6:00 PM (Pitch A)
Fri: Tactical Session 4:00 PM - 5:30 PM (Classroom 3)`,
    expectedEvents: [
      { title: 'Strength & Conditioning', dayOfWeek: 'monday', time: '17:00', endTime: '18:30', location: 'Gym' },
      { title: 'Ball Skills', dayOfWeek: 'wednesday', time: '16:30', endTime: '18:00', location: 'Pitch A' },
      { title: 'Tactical Session', dayOfWeek: 'friday', time: '16:00', endTime: '17:30', location: 'Classroom 3' },
    ],
  },
  {
    type: 'training_message',
    description: 'Swimming gala notice',
    text: `Regional Swimming Gala
Saturday, March 14th.
Warm-ups start at 8:15 AM, First race at 9:00 AM.
Location: Central Aquatics Center.
Don't forget your goggles and club swimming cap!`,
    expectedEvents: [{
      title: 'Regional Swimming Gala',
      date: '2026-03-14',
      time: '08:15',
      location: 'Central Aquatics Center',
    }],
  },
  {
    type: 'training_message',
    description: 'Gymnastics class cancellation',
    text: 'Unfortunately, tonight\'s 6:00 PM gymnastics class is cancelled as Coach Sarah is unwell. A make-up session will be held on Sunday at 10:00 AM.',
    expectedEvents: [
      { title: 'Gymnastics Class', time: '18:00', isCancelled: true },
      { title: 'Gymnastics Make-up Session', dayOfWeek: 'sunday', time: '10:00' },
    ],
  },
  {
    type: 'training_message',
    description: 'Tennis lesson move',
    text: 'Tennis on Thursday: instead of 3 PM, please come at 4:30 PM because of the court maintenance.',
    expectedEvents: [{
      title: 'Tennis Lesson',
      dayOfWeek: 'thursday',
      time: '16:30',
    }],
  },
  {
    type: 'training_message',
    description: 'Away match travel details',
    text: `Away Game vs Highwood High
This Saturday, Oct 18th.
Bus leaves campus at 11:30 AM.
Kick-off: 1:30 PM.
Expected return: 4:30 PM.`,
    expectedEvents: [{
      title: 'Match vs Highwood High',
      date: '2025-10-18',
      time: '11:30',
      endTime: '16:30',
      location: 'Highwood High (Bus leaves 11:30)',
    }],
  },
  {
    type: 'training_message',
    description: 'Martial Arts grading',
    text: `Karate Belt Grading
Friday, Nov 14th at 6:00 PM.
Please ensure all students have their full Gi and required protective gear.
Testing fee of $40 due by Wednesday.`,
    expectedEvents: [{
      title: 'Karate Belt Grading',
      date: '2025-11-14',
      time: '18:00',
    }],
  },
  {
    type: 'training_message',
    description: 'Basketball tournament',
    text: `U14 Basketball Regional Tournament
Sun, Jan 25th.
Meet at school: 7:30 AM.
Trophy presentation at 5:00 PM.
Bring $10 for lunch at the venue.`,
    expectedEvents: [{
      title: 'Basketball Tournament',
      date: '2026-01-25',
      time: '07:30',
      endTime: '17:30',
    }],
  },
  {
    type: 'training_message',
    description: 'Dance rehearsal extra',
    text: 'Extra rehearsal for the dance competition! Next Tuesday from 3:30 to 5:00 PM in the Studio.',
    expectedEvents: [{
      title: 'Extra Dance Rehearsal',
      dayOfWeek: 'tuesday',
      time: '15:30',
      endTime: '17:00',
      location: 'Studio',
    }],
  },
  {
    type: 'training_message',
    description: 'Netball practice reminder',
    text: 'Reminder: Netball practice tomorrow morning at 7:30 AM. Don\'t be late!',
    expectedEvents: [{
      title: 'Netball Practice',
      date: 'tomorrow',
      time: '07:30',
    }],
  },
];

// ===========================================
// 3. MEDICAL & CLINICAL - 20 examples
// ===========================================

export const medicalExamples: InputExample[] = [
  {
    type: 'appointment',
    description: 'Pediatrician reminder',
    text: 'Confirmation: Your appointment with Dr. Smith is tomorrow at 2:45 PM. Please arrive 10 minutes early.',
    expectedEvents: [{
      title: 'Pediatrician - Dr. Smith',
      date: 'tomorrow',
      time: '14:45',
    }],
  },
  {
    type: 'appointment',
    description: 'Dentist check-up Max',
    text: 'Dental check-up for Max on March 12th at 9:15 AM. Dr. Miller\'s practice, 10 Main St.',
    expectedEvents: [{
      title: 'Dentist Max - Dr. Miller',
      date: '2026-03-12',
      time: '09:15',
      location: '10 Main St',
    }],
  },
  {
    type: 'appointment',
    description: 'Speech Therapy weekly',
    text: 'Max has speech therapy every Tuesday at 4:00 PM at the Wellness Center.',
    expectedEvents: [{
      title: 'Speech Therapy Max',
      dayOfWeek: 'tuesday',
      time: '16:00',
      location: 'Wellness Center',
      recurrence: 'weekly',
    }],
  },
  {
    type: 'appointment',
    description: 'Vaccination clinic',
    text: 'Reminder: Flu vaccinations at the community health center this Saturday from 9 AM to 12 PM. Drop-in basis.',
    expectedEvents: [{
      title: 'Flu Vaccination Clinic',
      dayOfWeek: 'saturday',
      time: '09:00',
      endTime: '12:00',
      location: 'Community health center',
    }],
  },
  {
    type: 'appointment',
    description: 'Orthodontist adjustment',
    text: 'Braces adjustment for Lily: Thursday at 4:45 PM with Dr. Harris.',
    expectedEvents: [{
      title: 'Braces Adjustment Lily',
      dayOfWeek: 'thursday',
      time: '16:45',
      location: 'Dr. Harris',
    }],
  },
  {
    type: 'appointment',
    description: 'Optometrist visit',
    text: 'Eye exam reminder: Friday at 11:30 AM. Vision Care Associates.',
    expectedEvents: [{
      title: 'Eye Exam',
      dayOfWeek: 'friday',
      time: '11:30',
      location: 'Vision Care Associates',
    }],
  },
  {
    type: 'appointment',
    description: 'Physiotherapy session',
    text: 'Physio for Toby: Monday and Thursday at 4 PM at North Therapy Center. Bring shorts!',
    expectedEvents: [
      { title: 'Physio Toby', dayOfWeek: 'monday', time: '16:00', location: 'North Therapy Center', recurrence: 'weekly' },
      { title: 'Physio Toby', dayOfWeek: 'thursday', time: '16:00', location: 'North Therapy Center', recurrence: 'weekly' },
    ],
  },
  {
    type: 'appointment',
    description: 'Blood test appointment',
    text: 'Lily blood test: Monday 8:15 AM at the Lab. Fasting required (no food since 8 PM Sunday).',
    expectedEvents: [{
      title: 'Blood Test Lily',
      dayOfWeek: 'monday',
      time: '08:15',
      location: 'The Lab',
    }],
  },
  {
    type: 'appointment',
    description: 'Dermatologist consult',
    text: 'Dermatology consult for Jack: 20/03 at 11:30 AM.',
    expectedEvents: [{
      title: 'Dermatologist Jack',
      date: '2026-03-20',
      time: '11:30',
    }],
  },
  {
    type: 'appointment',
    description: 'Hearing test',
    text: 'Hearing test for Mia: Next Thursday at 9:00 AM.',
    expectedEvents: [{
      title: 'Hearing Test Mia',
      dayOfWeek: 'thursday',
      time: '09:00',
    }],
  },
];

// ===========================================
// 4. BIRTHDAY PARTIES & INVITATIONS - 20 examples
// ===========================================

export const invitationExamples: InputExample[] = [
  {
    type: 'invitation',
    description: 'Birthday party at home',
    text: `Hi! 🎉
I'm celebrating my 7th birthday!
When: Saturday, March 15th, 2:00 PM - 4:30 PM
Where: Our house (12 Hillcrest Rd)
RSVP to Mom at 555-0123 by March 10th.
Hope you can come!
Love, Sophie`,
    expectedEvents: [{
      title: 'Sophie\'s 7th Birthday Party',
      date: '2026-03-15',
      time: '14:00',
      endTime: '16:30',
      location: '12 Hillcrest Rd',
    }],
  },
  {
    type: 'invitation',
    description: 'Soft Play Party',
    text: `Leo's 5th Birthday! 🦁
Join us at Jungle Jim's Soft Play
Sat, May 24th, 10:00 AM - 12:00 PM
Socks required for everyone! 🧦
RSVP by May 15th.`,
    expectedEvents: [{
      title: 'Leo\'s Birthday - Jungle Jim\'s',
      date: '2026-05-24',
      time: '10:00',
      endTime: '12:00',
      location: 'Jungle Jim\'s Soft Play',
    }],
  },
  {
    type: 'invitation',
    description: 'Trampoline Park Party',
    text: `Jump for Joy! 🤸‍♂️
Toby is turning 9!
Sunday, Feb 8th, 3:00 PM - 5:00 PM
Gravity Trampoline Park.
Please sign the online waiver before arrival.`,
    expectedEvents: [{
      title: 'Toby\'s Birthday - Gravity Park',
      date: '2026-02-08',
      time: '15:00',
      endTime: '17:00',
      location: 'Gravity Trampoline Park',
    }],
  },
  {
    type: 'invitation',
    description: 'Swimming Party',
    text: `Splish Splash! 🏊‍♀️
Emma's Swimming Party
Sun, June 21st, 1:00 PM - 3:30 PM
Leisure Center Pool.
Bring your swimsuit and a towel!`,
    expectedEvents: [{
      title: 'Emma\'s Swimming Party',
      date: '2026-06-21',
      time: '13:00',
      endTime: '15:30',
      location: 'Leisure Center Pool',
    }],
  },
  {
    type: 'invitation',
    description: 'Bowling Party',
    text: `Strike it lucky! 🎳
Jack's 10th Birthday
Saturday, Nov 8th at 2:00 PM
Super Bowl, Mall Plaza.
Arrive 15 mins early for shoes.`,
    expectedEvents: [{
      title: 'Jack\'s Bowling Party',
      date: '2025-11-08',
      time: '13:45',
      location: 'Super Bowl, Mall Plaza',
    }],
  },
  {
    type: 'invitation',
    description: 'Laser Tag Party',
    text: `Mission: Birthday! 🔫
Mark is turning 11!
Fri, March 27th, 6:00 PM - 8:30 PM
Laser Quest HQ.
Pizza and cake included!`,
    expectedEvents: [{
      title: 'Mark\'s Laser Tag Party',
      date: '2026-03-27',
      time: '18:00',
      endTime: '20:30',
      location: 'Laser Quest HQ',
    }],
  },
  {
    type: 'invitation',
    description: 'Cinema Party',
    text: `Movie Time! 🎬
Lily's Cinema Party
Sat, April 4th at 1:15 PM
Odeon Cinema, High St.
Film starts at 1:45 PM. 
RSVP to 07700 900123.`,
    expectedEvents: [{
      title: 'Lily\'s Cinema Party',
      date: '2026-04-04',
      time: '13:15',
      location: 'Odeon Cinema, High St',
    }],
  },
  {
    type: 'invitation',
    description: 'Creative Writing / Library Party',
    text: `Storytime Party! 📖
Mia's 8th Birthday
Saturday, June 6th, 11:00 AM - 1:00 PM
The Town Library (Community Room).
Crafts, stories, and lunch provided!`,
    expectedEvents: [{
      title: 'Mia\'s Library Birthday',
      date: '2026-06-06',
      time: '11:00',
      endTime: '13:00',
      location: 'Town Library',
    }],
  },
  {
    type: 'invitation',
    description: 'Ice Skating Party',
    text: `Cool Fun! ⛸️
Aiden's Ice Skating Party
Sunday, Jan 18th, 2:30 PM - 4:30 PM
The Ice Rink.
Dress warmly!`,
    expectedEvents: [{
      title: 'Aiden\'s Ice Skating Party',
      date: '2026-01-18',
      time: '14:30',
      endTime: '16:30',
      location: 'The Ice Rink',
    }],
  },
  {
    type: 'invitation',
    description: 'Science / Maker Party',
    text: `Mad Scientist Party! 🧪
Noah's 9th Birthday
Saturday, March 21st, 3:00 PM - 5:30 PM
Science Lab Kids (Unit 5, Innovation Park).
Lab coats provided!`,
    expectedEvents: [{
      title: 'Noah\'s Science Party',
      date: '2026-03-21',
      time: '15:00',
      endTime: '17:30',
      location: 'Science Lab Kids',
    }],
  },
];

// ===========================================
// 5. INFORMAL & GROUP MESSAGES (WhatsApp/Slack) - 20 examples
// ===========================================

export const informalExamples: InputExample[] = [
  {
    type: 'group_message',
    description: 'WhatsApp parent group - pick up',
    text: 'Can anyone pick up Leo from school today? I\'m stuck in a meeting. 😭',
    expectedEvents: [],
  },
  {
    type: 'group_message',
    description: 'WhatsApp - Lost property',
    text: 'Has anyone seen a blue lunchbox with dinosaurs on it? Left it at the playground yesterday.',
    expectedEvents: [],
  },
  {
    type: 'group_message',
    description: 'Spontaneous playdate',
    text: 'We\'re headed to the park if anyone wants to join! Probably there from 3:30 till dinner. 🛝',
    expectedEvents: [{
      title: 'Park Playdate (Spontaneous)',
      date: 'today',
      time: '15:30',
      location: 'The Park',
    }],
  },
  {
    type: 'group_message',
    description: 'Homework question',
    text: 'Does anyone know what the math homework was? My son seems to have lost his planner...',
    expectedEvents: [],
  },
  {
    type: 'group_message',
    description: 'Bake sale reminder',
    text: 'Don\'t forget! Bake sale tomorrow morning. Please bring your donations to the office by 8:45 AM. 🧁',
    expectedEvents: [{
      title: 'Bake Sale Donation Due',
      date: 'tomorrow',
      time: '08:45',
      location: 'School Office',
    }],
  },
  {
    type: 'group_message',
    description: 'Training location change',
    text: '⚠️ Football training is at the INDOOR gym today because of the rain. ⚠️',
    expectedEvents: [{
      title: 'Football Training - INDOOR GYM',
      location: 'Indoor Gym',
    }],
  },
  {
    type: 'group_message',
    description: 'School disco tickets',
    text: 'Disco tickets on sale at the gates tomorrow morning! £3 each.',
    expectedEvents: [{
      title: 'Buy Disco Tickets',
      date: 'tomorrow',
      time: '08:30',
      location: 'School Gates',
    }],
  },
  {
    type: 'group_message',
    description: 'Teacher appreciation',
    text: "Collection for Ms. Higgins's end-of-term gift! Please drop £2 in an envelope with your child's name to the office by Friday. 🎁",
    expectedEvents: [{
      title: 'Collection for Ms. Higgins Due',
      dayOfWeek: 'friday',
    }],
  },
  {
    type: 'group_message',
    description: 'Costume reminder',
    text: 'World Book Day tomorrow! Pack a costume and their favorite book. 📚',
    expectedEvents: [{
      title: 'World Book Day',
      date: 'tomorrow',
      isAllDay: true,
    }],
  },
  {
    type: 'group_message',
    description: 'Early pick-up last day',
    text: 'Just a reminder that school finishes at 1:30 PM this Friday for the summer holidays! ☀️',
    expectedEvents: [{
      title: 'Early Finish - Summer Break',
      dayOfWeek: 'friday',
      time: '13:30',
    }],
  },
];

// ===========================================
// 6. VOICE MESSAGE TRANSCRIPTIONS - 15 examples
// ===========================================

export const voiceExamples: InputExample[] = [
  {
    type: 'voice_message',
    description: 'Grandma - visit',
    text: 'Hi sweetie, it\'s Grandma, I was thinking of coming over this Sunday around 3 PM to bring some treats for the kids, hope that works!',
    expectedEvents: [{
      title: 'Grandma visiting',
      dayOfWeek: 'sunday',
      time: '15:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Carpool coordination',
    text: 'Hey, about training tomorrow, I can pick the kids up at 4:30 from yours and bring them back around 7:00, let me know if that\'s okay.',
    expectedEvents: [{
      title: 'Carpool Training',
      date: 'tomorrow',
      time: '16:30',
      endTime: '19:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Rescheduling doctor',
    text: 'Hello, this is Dr. Miller\'s office calling to reschedule the appointment on Friday at 2:00 PM. We now have a slot on Monday at the same time, please call back to confirm.',
    expectedEvents: [{
      title: 'Dr. Miller (Rescheduled)',
      dayOfWeek: 'monday',
      time: '14:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Dad - pick up emergency',
    text: 'Hey, I\'m stuck in traffic, can you grab Chloe from gymnastics at 5:30? I really don\'t think I\'ll make it in time.',
    expectedEvents: [{
      title: 'Pick up Chloe - Gymnastics',
      time: '17:30',
    }],
  },
  {
    type: 'voice_message',
    description: 'Plumber appointment',
    text: 'Hi, this is the plumber, I\'ll be coming by on Tuesday between 9:00 and 10:00 AM to look at the leak, please make sure someone is home.',
    expectedEvents: [{
      title: 'Plumber - Leak fix',
      dayOfWeek: 'tuesday',
      time: '09:00',
      endTime: '10:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Gift idea',
    text: 'I was thinking maybe we can get that LEGO set for the party on Saturday? We should probably go to the shop on Friday afternoon about 4.',
    expectedEvents: [{
      title: 'Buy Birthday Gift',
      dayOfWeek: 'friday',
      time: '16:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Haircut appointment',
    text: 'Toby has a haircut booked for tomorrow at 3:45 at the barbershop in town.',
    expectedEvents: [{
      title: 'Toby Haircut',
      date: 'tomorrow',
      time: '15:45',
      location: 'Barbershop',
    }],
  },
  {
    type: 'voice_message',
    description: 'Babysitter confirmation',
    text: 'Hi, it\'s Sarah, just confirming for Saturday night, I\'ll be there by 7:00 PM.',
    expectedEvents: [{
      title: 'Babysitter Sarah arrives',
      dayOfWeek: 'saturday',
      time: '19:00',
    }],
  },
  {
    type: 'voice_message',
    description: 'Vet appointment',
    text: 'Vet appointment for Buster: Wednesday morning at 8:30 for his check-up.',
    expectedEvents: [{
      title: 'Vet - Buster check-up',
      dayOfWeek: 'wednesday',
      time: '08:30',
    }],
  },
  {
    type: 'voice_message',
    description: 'Music lesson switch',
    text: 'Piano lesson moved from Monday 4:00 PM to Wednesday 4:00 PM this week only.',
    expectedEvents: [{
      title: 'Piano Lesson (Moved)',
      dayOfWeek: 'wednesday',
      time: '16:00',
    }],
  },
];

// ===========================================
// 7. ANNOUNCEMENTS & OTHER - 15 examples
// ===========================================

export const otherExamples: InputExample[] = [
  {
    type: 'announcement',
    description: 'Community BBQ',
    text: 'Neighborhood BBQ this Saturday! Starts at 12:00 PM in the cul-de-sac. Bring a dish to share!',
    expectedEvents: [{
      title: 'Neighborhood BBQ',
      dayOfWeek: 'saturday',
      time: '12:00',
      location: 'Cul-de-sac',
    }],
  },
  {
    type: 'appointment',
    description: 'Dry cleaning pick up',
    text: 'Reminder: Pick up dry cleaning before they close at 6:00 PM tonight.',
    expectedEvents: [{
      title: 'Pick up Dry Cleaning',
      date: 'today',
      time: '18:00',
    }],
  },
  {
    type: 'announcement',
    description: 'Library closure',
    text: 'The local library will be closed for maintenance from Oct 1st to Oct 3rd.',
    expectedEvents: [{
      title: 'Library Closed',
      date: '2025-10-01',
      endDate: '2025-10-03',
      isAllDay: true,
    }],
  },
];

// ===========================================
// 8. ADDITIONAL SCHOOL & COMMUNITY - 22 examples
// ===========================================

export const additionalExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'Talent Show audition',
    text: 'Auditions for the "Butler\'s Got Talent" show will be held next Monday and Tuesday at lunch in the Music Room.',
    expectedEvents: [
      { title: 'Talent Show Auditions Day 1', dayOfWeek: 'monday', time: '12:50', location: 'Music Room' },
      { title: 'Talent Show Auditions Day 2', dayOfWeek: 'tuesday', time: '12:50', location: 'Music Room' },
    ],
  },
  {
    type: 'school_letter',
    description: 'Year 11 Prom',
    text: 'Year 11 Prom: Friday, June 26th at 7:00 PM. Held at The Grand Hotel. Tickets are £45.',
    expectedEvents: [{
      title: 'Year 11 Prom',
      date: '2026-06-26',
      time: '19:00',
      location: 'The Grand Hotel',
    }],
  },
  {
    type: 'school_letter',
    description: 'Uniform shop open',
    text: 'The second-hand uniform shop will be open this Saturday from 10:00 AM to 12:00 PM in the small hall.',
    expectedEvents: [{
      title: 'Uniform Shop Open',
      dayOfWeek: 'saturday',
      time: '10:00',
      endTime: '12:00',
      location: 'Small Hall',
    }],
  },
  {
    type: 'school_letter',
    description: 'Headteacher tea',
    text: 'Tea with the Headteacher for selected students: Thursday at 3:30 PM in the Boardroom.',
    expectedEvents: [{
      title: 'Tea with Headteacher',
      dayOfWeek: 'thursday',
      time: '15:30',
      location: 'Boardroom',
    }],
  },
  {
    type: 'announcement',
    description: 'Garage sale',
    text: 'Huge multi-family garage sale! Saturday, Aug 15th from 8 AM to 2 PM. 500 block of Oak St.',
    expectedEvents: [{
      title: 'Garage Sale',
      date: '2025-08-15',
      time: '08:00',
      endTime: '14:00',
      location: '500 block of Oak St',
    }],
  },
  {
    type: 'announcement',
    description: 'Blood drive',
    text: 'Blood Drive at the Community Center: Monday, Sept 22nd, 10:00 AM - 4:00 PM. Appointments recommended.',
    expectedEvents: [{
      title: 'Blood Drive',
      date: '2025-09-22',
      time: '10:00',
      endTime: '16:00',
      location: 'Community Center',
    }],
  },
  {
    type: 'announcement',
    description: 'Zumba class',
    text: 'Zumba in the park! Every Wednesday at 6 PM. Meet at the gazebo.',
    expectedEvents: [{
      title: 'Zumba in the Park',
      dayOfWeek: 'wednesday',
      time: '18:00',
      location: 'Gazebo',
      recurrence: 'weekly',
    }],
  },
  {
    type: 'announcement',
    description: 'Book club meeting',
    text: 'The Bookworms Club meeting: Monday evening at 7 PM. Hosted at Sarah\'s house.',
    expectedEvents: [{
      title: 'Book Club',
      dayOfWeek: 'monday',
      time: '19:00',
      location: 'Sarah\'s house',
    }],
  },
  {
    type: 'announcement',
    description: 'Dog park opening',
    text: 'Grand opening of the new Dog Park! Sunday, Oct 5th at 11 AM.',
    expectedEvents: [{
      title: 'Dog Park Grand Opening',
      date: '2025-10-05',
      time: '11:00',
      location: 'Dog Park',
    }],
  },
  {
    type: 'announcement',
    description: 'Local market',
    text: 'Farmers Market every Sunday morning, 8 AM - 1 PM, Downtown Square.',
    expectedEvents: [{
      title: 'Farmers Market',
      dayOfWeek: 'sunday',
      time: '08:00',
      endTime: '13:00',
      location: 'Downtown Square',
      recurrence: 'weekly',
    }],
  },
  {
    type: 'school_letter',
    description: 'PE lesson change',
    text: 'Reminder for Year 5: Swimming starts this Wednesday. Don\'t forget your swim kit!',
    expectedEvents: [{
      title: 'Year 5 Swimming Starts',
      dayOfWeek: 'wednesday',
    }],
  },
  {
    type: 'school_letter',
    description: 'Maths Challenge',
    text: 'UKMT Junior Maths Challenge: Thursday morning at 9:00 AM in the Hall.',
    expectedEvents: [{
      title: 'Junior Maths Challenge',
      dayOfWeek: 'thursday',
      time: '09:00',
      location: 'School Hall',
    }],
  },
  {
    type: 'school_letter',
    description: 'Debating competition',
    text: 'Inter-school debating competition: Friday after school at 4:15 PM.',
    expectedEvents: [{
      title: 'Debating Competition',
      dayOfWeek: 'friday',
      time: '16:15',
    }],
  },
  {
    type: 'school_letter',
    description: 'New teacher intro',
    text: 'Meet the new Year 4 teacher afternoon: Monday, Jan 12th at 3:45 PM in Classroom 4A.',
    expectedEvents: [{
      title: 'Meet the Teacher (Y4)',
      date: '2026-01-12',
      time: '15:45',
      location: 'Classroom 4A',
    }],
  },
  {
    type: 'school_letter',
    description: 'Lost planner replacement',
    text: 'Replacement student planners can be bought from the office for £5.',
    expectedEvents: [],
  },
  {
    type: 'school_letter',
    description: 'Lunch account top-up',
    text: 'Please ensure your child\'s lunch account is topped up by Monday morning.',
    expectedEvents: [{
      title: 'Top up Lunch Account',
      dayOfWeek: 'monday',
      time: '09:00',
    }],
  },
  {
    type: 'school_letter',
    description: 'Medication update',
    text: 'Please check that any inhalers or Epipens kept at school are still in date.',
    expectedEvents: [],
  },
  {
    type: 'school_letter',
    description: 'Parking notice',
    text: 'Please do not park in the residents\' bays in Spring Lane during drop-off and pick-up.',
    expectedEvents: [],
  },
  {
    type: 'school_letter',
    description: 'Volunteer DBS check',
    text: 'Parents who wish to volunteer for the school fete must have their DBS checks completed by June 1st.',
    expectedEvents: [{
      title: 'DBS Checks Deadline for Fete',
      date: '2026-06-01',
    }],
  },
  {
    type: 'school_letter',
    description: 'End of term concert',
    text: 'End of Term Summer Concert: Thursday evening at 6:30 PM. Tickets on sale now.',
    expectedEvents: [{
      title: 'Summer Concert',
      dayOfWeek: 'thursday',
      time: '18:30',
    }],
  },
  {
    type: 'school_letter',
    description: 'Lost and found clearance',
    text: 'Unclaimed items from lost and found will be donated to charity this Friday afternoon.',
    expectedEvents: [{
      title: 'Lost and Found Clearance',
      dayOfWeek: 'friday',
      time: '15:30',
    }],
  },
  {
    type: 'school_letter',
    description: 'Staff training day',
    text: 'A reminder that school is closed to students on Monday for a training day.',
    expectedEvents: [{
      title: 'School Closed - Training Day',
      dayOfWeek: 'monday',
      isAllDay: true,
    }],
  },
];

// ===========================================
// 9. SAFEGUARDING & GDPR - 15 examples
// ===========================================

export const safeguardingExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'GDPR consent form',
    text: `Data Protection Notice:
Under GDPR, we require updated consent for:
- Use of child's photos on school website
- Sharing contact info with the PTA
- Sending newsletters via email
Please return the signed form by Monday.`,
    expectedEvents: [{
      title: 'Return GDPR Consent Form',
      dayOfWeek: 'monday',
      action_items: { prepare: ['Sign GDPR consent form'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Safeguarding update - visitor protocol',
    text: 'To ensure student safety, all visitors must sign in at the gate and wear a lanyard. This applies to the sports day tomorrow.',
    expectedEvents: [{
      title: 'Sports Day - Visitor Protocol applies',
      date: 'tomorrow',
    }],
  },
  {
    type: 'school_letter',
    description: 'Internet safety workshop',
    text: 'Parent workshop on Online Safety and Safeguarding: Thursday evening at 6:30 PM in the IT suite.',
    expectedEvents: [{
      title: 'Online Safety Workshop',
      dayOfWeek: 'thursday',
      time: '18:30',
      location: 'IT Suite',
    }],
  },
];

// ===========================================
// 10. PTA & FUNDRAISING - 20 examples
// ===========================================

export const ptaExamples: InputExample[] = [
  {
    type: 'announcement',
    description: 'PTA Gala Auction',
    text: `The 10th Annual PTA Charity Gala!
Friday, Nov 14th @ 7 PM.
Grand Ballroom, City Hotel.
Auctioning off local art and luxury weekend stays.
Tickets $75 each. RSVP by Nov 1st.`,
    expectedEvents: [{
      title: 'PTA Charity Gala',
      date: '2025-11-14',
      time: '19:00',
      location: 'Grand Ballroom, City Hotel',
      action_items: { deadline: '2025-11-01', prepare: ['Buy tickets ($75)'] },
    }],
  },
  {
    type: 'announcement',
    description: 'PTA Carnival Volunteer Call',
    text: 'We need volunteers for the School Carnival! Saturday, June 12th. Please sign up for a 2-hour shift between 10 AM and 4 PM.',
    expectedEvents: [{
      title: 'Volunteer at School Carnival',
      date: '2026-06-12',
      time: '10:00',
      endTime: '16:00',
    }],
  },
  {
    type: 'school_letter',
    description: 'Bake sale donation request',
    text: 'PTA Bake Sale this Friday! Please bring nut-free treats to the hall at 8:30 AM.',
    expectedEvents: [{
      title: 'PTA Bake Sale (Bring treats)',
      dayOfWeek: 'friday',
      time: '08:30',
      location: 'School Hall',
      action_items: { bring: ['Nut-free treats'] },
    }],
  },
];

// ===========================================
// 11. SEN & SUPPORT PLANS - 15 examples
// ===========================================

export const senExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'EHCP Review Meeting',
    text: 'Invitation to [Child Name]\'s EHC Plan Annual Review: Next Wednesday at 9:30 AM in the SENCO office.',
    expectedEvents: [{
      title: 'EHCP Annual Review',
      dayOfWeek: 'wednesday',
      time: '09:30',
      location: 'SENCO Office',
    }],
  },
  {
    type: 'school_letter',
    description: 'Support Plan review',
    text: 'Meeting to review your child\'s Support Plan (POP): Monday after school, 3:45 PM in Classroom 2.',
    expectedEvents: [{
      title: 'Support Plan Review',
      dayOfWeek: 'monday',
      time: '15:45',
      location: 'Classroom 2',
    }],
  },
];

// ===========================================
// 12. INTERNATIONAL SPORTS & LOGISTICS - 20 examples
// ===========================================

export const internationalSportsExamples: InputExample[] = [
  {
    type: 'school_letter',
    description: 'Overseas Football Tour',
    text: `International Football Tour to Madrid:
Dates: April 10th - April 15th.
Flight leaves from Heathrow at 9:00 AM.
Staying at Hotel Sports Center.
Required: Valid passport and signed travel insurance waiver.`,
    expectedEvents: [{
      title: 'International Football Tour (Madrid)',
      date: '2026-04-10',
      endDate: '2026-04-15',
      location: 'Madrid / Heathrow (9:00 AM)',
      action_items: { prepare: ['Passport', 'Travel insurance waiver'] },
    }],
  },
  {
    type: 'school_letter',
    description: 'Regional Swim Meet',
    text: `Regional Swimming Championships:
Sun, March 8th.
Bus departs from school car park at 6:45 AM.
Lunch provided at the aquatic center.
Pick up back at school at approx 6:30 PM.`,
    expectedEvents: [{
      title: 'Regional Swim Meet',
      date: '2026-03-08',
      time: '06:45',
      endTime: '18:30',
      location: 'Aquatic Center / School Car Park',
    }],
  },
];


// ===========================================
// 13. COMMUNITY, HOBBIES & MISC - 40 examples
// ===========================================

export const miscExamples: InputExample[] = [
  {
    type: 'announcement',
    description: 'Neighborhood watch meeting',
    text: 'Neighborhood Watch monthly meeting: Tuesday night at 7 PM at the community hall. Discussing new lighting for the park.',
    expectedEvents: [{
      title: 'Neighborhood Watch Meeting',
      dayOfWeek: 'tuesday',
      time: '19:00',
      location: 'Community Hall',
    }],
  },
  {
    type: 'announcement',
    description: 'Garage sale multi-family',
    text: 'Huge 4-family garage sale! Saturday and Sunday from 8 AM to 4 PM. 123 Maple St and surrounding houses.',
    expectedEvents: [
      { title: 'Garage Sale Day 1', dayOfWeek: 'saturday', time: '08:00', endTime: '16:00', location: '123 Maple St' },
      { title: 'Garage Sale Day 2', dayOfWeek: 'sunday', time: '08:00', endTime: '16:00', location: '123 Maple St' },
    ],
  },
  {
    type: 'appointment',
    description: 'Music lesson - Piano',
    text: 'James has piano at 4:30 PM today. Reminder to bring his practice book.',
    expectedEvents: [{
      title: 'James Piano Lesson',
      date: 'today',
      time: '16:30',
      action_items: { bring: ['Practice book'] },
    }],
  },
  {
    type: 'appointment',
    description: 'Tutoring session - Math',
    text: 'Math tutoring for Jack: Monday and Thursday at 5:00 PM at the library.',
    expectedEvents: [
      { title: 'Math Tutoring Jack', dayOfWeek: 'monday', time: '17:00', location: 'Library', recurrence: 'weekly' },
      { title: 'Math Tutoring Jack', dayOfWeek: 'thursday', time: '17:00', location: 'Library', recurrence: 'weekly' },
    ],
  },
  {
    type: 'announcement',
    description: 'Voter registration deadline',
    text: 'Reminder: Deadline to register for the upcoming school board election is this Friday at 5:00 PM.',
    expectedEvents: [{
      title: 'Voter Registration Deadline',
      dayOfWeek: 'friday',
      time: '17:00',
    }],
  },
  {
    type: 'announcement',
    description: 'Community yoga in the park',
    text: 'Free yoga in the park every Saturday morning at 9 AM. Meet at the north oak tree. Bring your own mat!',
    expectedEvents: [{
      title: 'Yoga in the Park',
      dayOfWeek: 'saturday',
      time: '09:00',
      location: 'North Oak Tree',
      recurrence: 'weekly',
      action_items: { bring: ['Yoga mat'] },
    }],
  },
  // Add 34 more diverse small examples...
  { type: 'announcement', description: 'Trash collection delay', text: 'Trash pick-up will be delayed by one day this week due to the holiday.', expectedEvents: [] },
  { type: 'announcement', description: 'Street cleaning', text: 'Street cleaning on our block this Thursday. Please move cars by 8 AM.', expectedEvents: [{ title: 'Move cars for street cleaning', dayOfWeek: 'thursday', time: '08:00' }] },
  { type: 'appointment', description: 'Dog grooming', text: 'Barnaby has grooming at 10:30 AM on Friday at Posh Paws.', expectedEvents: [{ title: 'Dog Grooming - Barnaby', dayOfWeek: 'friday', time: '10:30', location: 'Posh Paws' }] },
  { type: 'invitation', description: 'Book club', text: 'Book club at Sarah\'s house: Monday at 7:30 PM. We\'re discussing "The Great Gatsby".', expectedEvents: [{ title: 'Book Club', dayOfWeek: 'monday', time: '19:30', location: 'Sarah\'s house' }] },
  { type: 'school_letter', description: 'Lost property clearance', text: 'All unclaimed items from the lost property box will be donated to charity this Friday afternoon.', expectedEvents: [{ title: 'Lost Property Clearance', dayOfWeek: 'friday', time: '15:30' }] },
  { type: 'school_letter', description: 'Book return deadline', text: 'Please return all library books by Wednesday to avoid fines.', expectedEvents: [{ title: 'Library Books Return Due', dayOfWeek: 'wednesday' }] },
  { type: 'school_letter', description: 'Inset day notice', text: 'Reminder: School is closed to students next Monday for an Inset day.', expectedEvents: [{ title: 'School Closed - Inset Day', dayOfWeek: 'monday', isAllDay: true }] },
  { type: 'appointment', description: 'Eye exam Jack', text: 'Jack has an eye exam on Tuesday at 3:15 PM at Specsavers.', expectedEvents: [{ title: 'Eye Exam - Jack', dayOfWeek: 'tuesday', time: '15:15', location: 'Specsavers' }] },
  { type: 'announcement', description: 'Park closure', text: 'The playground will be closed for resurfacing from Monday to Wednesday next week.', expectedEvents: [{ title: 'Playground Closed', dayOfWeek: 'monday', endDate: 'wednesday', isAllDay: true }] },
  { type: 'group_message', description: 'Playdate ask', text: 'Is anyone free for a playdate at the park after school today?', expectedEvents: [] },
  { type: 'voice_message', description: 'Emergency repair', text: 'Hi, this is the building manager, we need to turn off the water for two hours tomorrow morning at 10 AM for a repair.', expectedEvents: [{ title: 'Water Turn-off (Repair)', date: 'tomorrow', time: '10:00', endTime: '12:00' }] },
  { type: 'announcement', description: 'Local market', text: 'Farmers market this Sunday from 9 AM to 1 PM in the town square.', expectedEvents: [{ title: 'Farmers Market', dayOfWeek: 'sunday', time: '09:00', endTime: '13:00', location: 'Town Square' }] },
  { type: 'announcement', description: 'Lost cat', text: 'Lost cat: Ginger tabby named "Simba". Last seen near the woods on Tuesday.', expectedEvents: [] },
  { type: 'school_letter', description: 'Uniform update', text: 'Reminder: Winter uniform (including ties) must be worn from Monday onwards.', expectedEvents: [{ title: 'Switch to Winter Uniform', dayOfWeek: 'monday' }] },
  { type: 'appointment', description: 'Parents evening - slot confirmed', text: 'Confirmed: Your parents\' evening slot for Emily is at 4:20 PM on Thursday in the Hall.', expectedEvents: [{ title: 'Parents\' Evening Slot (Emily)', dayOfWeek: 'thursday', time: '16:20', location: 'School Hall' }] },
  { type: 'school_letter', description: 'Snow day - school closed', text: 'Due to heavy snow, the school will be closed today. Remote learning plans will be emailed at 9 AM.', expectedEvents: [{ title: 'School Closed (Snow Day)', date: 'today', isAllDay: true }] },
  { type: 'appointment', description: 'Guitar lesson', text: 'Guitar lesson for Sam on Wednesday at 4 PM. Don\'t forget your picks!', expectedEvents: [{ title: 'Guitar Lesson Sam', dayOfWeek: 'wednesday', time: '16:00', action_items: { bring: ['Guitar picks'] } }] },
  { type: 'announcement', description: 'Blood drive', text: 'Blood drive at the community center: Friday, 10 AM - 4 PM. Appointments recommended.', expectedEvents: [{ title: 'Blood Drive', dayOfWeek: 'friday', time: '10:00', endTime: '16:00', location: 'Community Center' }] },
  { type: 'school_letter', description: 'Field trip volunteer needed', text: 'We still need two more volunteers for the zoo trip next Thursday! Please email the office if you can help.', expectedEvents: [{ title: 'Volunteer for Zoo Trip Deadline', dayOfWeek: 'thursday' }] },
  { type: 'invitation', description: 'Cinema invite', text: 'We\'re going to see the new Minions movie on Saturday at 2 PM if anyone wants to join us!', expectedEvents: [{ title: 'Minions Movie (Cinema)', dayOfWeek: 'saturday', time: '14:00' }] },
  { type: 'appointment', description: 'Car service', text: 'Car service booked for Monday at 8:30 AM at the garage. Need to drop it off and walk home.', expectedEvents: [{ title: 'Car Service', dayOfWeek: 'monday', time: '08:30', location: 'The Garage' }] },
  { type: 'announcement', description: 'Halloween party', text: 'Community Halloween party! Oct 31st at 6 PM. Meet at the gazebo for trick-or-treating.', expectedEvents: [{ title: 'Halloween Party', date: '2025-10-31', time: '18:00', location: 'Gazebo' }] },
  { type: 'school_letter', description: 'PE lesson location change', text: 'PE will be held in the sports hall tomorrow instead of the field due to the wet weather.', expectedEvents: [{ title: 'PE in Sports Hall', date: 'tomorrow' }] },
  { type: 'group_message', description: 'Carpool offer', text: 'I can take the kids to football training tonight if that helps anyone?', expectedEvents: [{ title: 'Carpool to Football', date: 'today' }] },
  { type: 'voice_message', description: 'Neighbor intro', text: 'Hi, I\'m your new neighbor at number 42. Just wanted to say hi and let you know we\'re having a small housewarming on Saturday afternoon from 4.', expectedEvents: [{ title: 'Neighbor Housewarming', dayOfWeek: 'saturday', time: '16:00', location: 'Number 42' }] },
  { type: 'announcement', description: 'Recycling center hours', text: 'The local recycling center is now open on Sundays from 10 AM to 2 PM.', expectedEvents: [{ title: 'Recycling Center Open', dayOfWeek: 'sunday', time: '10:00', endTime: '14:00', recurrence: 'weekly' }] },
  { type: 'school_letter', description: 'Staff training afternoon', text: 'School finishes at 1 PM this Wednesday for a staff training afternoon.', expectedEvents: [{ title: 'Early Finish (Staff Training)', dayOfWeek: 'wednesday', time: '13:00' }] },
  { type: 'appointment', description: 'Braces check-up', text: 'Lily has a braces check-up on Monday at 3:45 PM. Don\'t forget to brush well before!', expectedEvents: [{ title: 'Braces Check-up Lily', dayOfWeek: 'monday', time: '15:45' }] },
  { type: 'announcement', description: 'Fire alarm test', text: 'Scheduled fire alarm test in the building: Friday at 11 AM. No action required.', expectedEvents: [{ title: 'Fire Alarm Test', dayOfWeek: 'friday', time: '11:00' }] },
  { type: 'group_message', description: 'Lost keys', text: 'Has anyone found a set of keys with a red keychain? Might have dropped them near the school gates.', expectedEvents: [] },
  { type: 'voice_message', description: 'Package delivery', text: 'Hi, I have a package for you that requires a signature. I\'ll try again tomorrow morning around 11.', expectedEvents: [{ title: 'Package Delivery (Re-delivery)', date: 'tomorrow', time: '11:00' }] },
  { type: 'announcement', description: 'Yoga class new time', text: 'Yoga class is moving to 6:30 PM starting next week.', expectedEvents: [{ title: 'Yoga Class (New Time)', date: 'next week', time: '18:30' }] },
  { type: 'appointment', description: 'Haircut Toby', text: 'Toby has a haircut at 4 PM today at "The Barber Shop".', expectedEvents: [{ title: 'Toby Haircut', date: 'today', time: '16:00', location: 'The Barber Shop' }] },
  { type: 'school_letter', description: 'Breakfast club full', text: 'Breakfast club is currently full. Please contact the office to be added to the waiting list.', expectedEvents: [] },
  { type: 'announcement', description: 'New pizza place opening', text: 'New pizza place "Mario\'s" opens this Friday at 5 PM! 2-for-1 deal all evening.', expectedEvents: [{ title: 'Mario\'s Pizza Opening', dayOfWeek: 'friday', time: '17:00', location: 'Mario\'s' }] },
];

// ===========================================
// COMBINED EXPORT - 150+ examples
// ===========================================

export const allExamples: InputExample[] = [
  ...schoolLetterExamples,        // 25
  ...sportsExamples,              // 10
  ...medicalExamples,             // 10
  ...invitationExamples,          // 10
  ...informalExamples,            // 10
  ...voiceExamples,               // 10
  ...otherExamples,               // 3
  ...additionalExamples,          // 22
  ...safeguardingExamples,        // 3
  ...ptaExamples,                 // 3
  ...senExamples,                 // 2
  ...internationalSportsExamples, // 2
  ...miscExamples,                // 40
  // Total: 150
];

export const EXAMPLE_COUNT = allExamples.length;


