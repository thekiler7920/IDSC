import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLUEPRINT_CONSTRAINTS,
  canRegisterForEvent,
  computeLockHash,
  filterEvents,
  generateRegistrationNumber,
  getAvailableSeats,
  hasDuplicateRegistration,
  validateEventForm,
  validateRegistrationForm,
} from './validation';
import type { CampusEvent, EventRegistration } from '../types/campus';

const baseEvent: CampusEvent = {
  id: 'robotics-hackathon-2026',
  title: 'Autonomous Robotics Hackathon',
  category: 'Technical',
  date: '2026-12-05',
  time: '09:00 AM - 06:00 PM',
  venue: 'Engineering Innovation Atrium',
  description: 'Build autonomous navigation prototypes in 24 hours.',
  department: 'Robotics & Automation',
  deadline: '2026-12-03T23:59',
  deadlineMs: new Date('2026-12-03T23:59').getTime(),
  capacity: 60,
  registeredCount: 42,
  status: 'upcoming',
  visibility: 'public',
  imageKey: 'hackathon',
  organizerId: 'org-1',
  organizerName: 'IEEE Robotics Chapter',
  createdAtMs: 1795000000000,
  updatedAtMs: 1795000000000,
};

test('getAvailableSeats accurately computes remaining seats and never drops below 0', () => {
  assert.equal(getAvailableSeats({ capacity: 60, registeredCount: 42 }), 18);
  assert.equal(getAvailableSeats({ capacity: 30, registeredCount: 30 }), 0);
  assert.equal(getAvailableSeats({ capacity: 30, registeredCount: 35 }), 0);
});

test('canRegisterForEvent blocks completed, past deadline, and full capacity events', () => {
  const beforeDeadline = new Date('2026-11-25T10:00').getTime();
  const afterDeadline = new Date('2026-12-04T10:00').getTime();

  assert.equal(canRegisterForEvent(baseEvent, beforeDeadline).allowed, true);

  const completed = canRegisterForEvent({ ...baseEvent, status: 'completed' }, beforeDeadline);
  assert.equal(completed.allowed, false);
  assert.equal(completed.reason, 'completed');

  const pastDeadline = canRegisterForEvent(baseEvent, afterDeadline);
  assert.equal(pastDeadline.allowed, false);
  assert.equal(pastDeadline.reason, 'deadline_passed');

  const full = canRegisterForEvent({ ...baseEvent, registeredCount: 60 }, beforeDeadline);
  assert.equal(full.allowed, false);
  assert.equal(full.reason, 'seats_full');
});

test('validateRegistrationForm catches missing/invalid fields and accepts valid data', () => {
  const invalid = validateRegistrationForm({
    fullName: 'A',
    studentId: '12',
    department: '',
    year: '',
    email: 'not-an-email',
    phone: '123',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.studentId);
  assert.ok(invalid.errors.department);
  assert.ok(invalid.errors.year);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.phone);

  const valid = validateRegistrationForm({
    fullName: 'Aarav Sharma',
    studentId: 'ENG-2024-108',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    email: 'aarav.sharma@college.edu',
    phone: '+91 98765 43210',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('hasDuplicateRegistration blocks duplicate studentId or email for the same event only', () => {
  const existing: Pick<EventRegistration, 'eventId' | 'studentId' | 'email'>[] = [
    {
      eventId: 'robotics-hackathon-2026',
      studentId: 'ENG-2024-108',
      email: 'aarav@college.edu',
    },
  ];

  // Case-insensitive studentId duplicate on same event
  const dupId = hasDuplicateRegistration(existing, 'robotics-hackathon-2026', ' eng-2024-108 ', 'other@college.edu');
  assert.equal(dupId.duplicate, true);
  assert.equal(dupId.field, 'studentId');

  // Case-insensitive email duplicate on same event
  const dupEmail = hasDuplicateRegistration(existing, 'robotics-hackathon-2026', 'ENG-2024-999', 'AARAV@COLLEGE.EDU');
  assert.equal(dupEmail.duplicate, true);
  assert.equal(dupEmail.field, 'email');

  // Different event is allowed
  const otherEvent = hasDuplicateRegistration(existing, 'ros2-workshop', 'ENG-2024-108', 'aarav@college.edu');
  assert.equal(otherEvent.duplicate, false);
});

test('generateRegistrationNumber creates blueprint-compliant unique codes', () => {
  const code1 = generateRegistrationNumber('robotics-hackathon-2026', 1795494980000);
  const code2 = generateRegistrationNumber('ros2-workshop', 1795494980123);
  assert.match(code1, BLUEPRINT_CONSTRAINTS.registrationNumber.pattern);
  assert.match(code2, BLUEPRINT_CONSTRAINTS.registrationNumber.pattern);
  assert.notEqual(code1, code2);
});

test('computeLockHash generates consistent 32-hex lock IDs matching rules regex', async () => {
  const sidHash1 = await computeLockHash('sid', 'eng-2024-108');
  const sidHash2 = await computeLockHash('sid', ' ENG-2024-108 ');
  const emlHash = await computeLockHash('eml', 'Student@College.Edu');

  assert.equal(sidHash1, sidHash2);
  assert.match(sidHash1, /^sid_[a-f0-9]{32}$/);
  assert.match(emlHash, /^eml_[a-f0-9]{32}$/);
});

test('filterEvents filters by search, category, dateFilter, and specificDate', () => {
  const events: CampusEvent[] = [
    baseEvent,
    {
      ...baseEvent,
      id: 'ros2-workshop',
      title: 'ROS2 & Embedded Control Lab',
      category: 'Workshop',
      date: '2026-11-26',
      venue: 'Mechatronics Lab 204',
      status: 'upcoming',
    },
    {
      ...baseEvent,
      id: 'legacy-seminar',
      title: 'Compiler Design Colloquium',
      category: 'Seminar',
      date: '2026-11-10',
      venue: 'Auditorium B',
      status: 'completed',
    },
  ];

  const nowMs = new Date('2026-11-23T12:00:00').getTime();

  assert.equal(
    filterEvents(events, { searchQuery: 'ROS2', category: 'All', dateFilter: 'all', specificDate: '' }, nowMs).length,
    1,
  );
  assert.equal(
    filterEvents(events, { searchQuery: '', category: 'Workshop', dateFilter: 'all', specificDate: '' }, nowMs).length,
    1,
  );
  assert.equal(
    filterEvents(events, { searchQuery: '', category: 'All', dateFilter: 'completed', specificDate: '' }, nowMs).length,
    1,
  );
  assert.equal(
    filterEvents(events, { searchQuery: '', category: 'All', dateFilter: 'this_week', specificDate: '' }, nowMs).length,
    1,
  );
  assert.equal(
    filterEvents(events, { searchQuery: '', category: 'All', dateFilter: 'all', specificDate: '2026-12-05' }, nowMs).length,
    1,
  );
});

test('validateEventForm prevents reducing capacity below existing registeredCount', () => {
  const result = validateEventForm(
    {
      title: 'Embedded Firmware Sprint',
      category: 'Technical',
      date: '2026-12-12',
      time: '10:00 AM - 04:00 PM',
      venue: 'CS Block Lab 3',
      description: 'Hands-on bare-metal STM32 firmware competition for undergraduates.',
      department: 'Computer Science & Engineering',
      deadline: '2026-12-10T18:00',
      capacity: '15',
      status: 'upcoming',
      imageKey: 'robotics',
      organizerName: 'Embedded Systems Club',
    },
    20,
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.capacity);
});
