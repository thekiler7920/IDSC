import type {
  AcademicYear,
  CampusEvent,
  EventCategory,
  EventFilterState,
  EventFormInput,
  EventImageKey,
  EventRegistration,
  RegistrationFormInput,
} from '../types/campus';

export const EVENT_CATEGORIES: EventCategory[] = [
  'Technical',
  'Workshop',
  'Seminar',
  'Extracurricular',
];

export const ACADEMIC_YEARS: AcademicYear[] = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
];

export const ENGINEERING_DEPARTMENTS: string[] = [
  'Computer Science & Engineering',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Robotics & Automation',
];

export const IMAGE_KEY_MAP: Record<EventImageKey, { src: string; label: string }> = {
  hackathon: {
    src: '/src/assets/images/campus_hackathon_banner_1795494988253.jpg',
    label: 'Engineering Atrium & Hackathon',
  },
  robotics: {
    src: '/src/assets/images/event_robotics_workshop_1795494989810.jpg',
    label: 'Robotics & Hardware Lab',
  },
  seminar: {
    src: '/src/assets/images/event_ai_seminar_1795494989871.jpg',
    label: 'Engineering Lecture Amphitheater',
  },
  cultural: {
    src: '/src/assets/images/event_cultural_showcase_1795494989644.jpg',
    label: 'Campus Plaza & Amphitheater',
  },
};

// Constants synchronized verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_CONSTRAINTS = {
  id: { min: 1, max: 128, pattern: /^[a-zA-Z0-9_\-]+$/ },
  eventTitle: { min: 3, max: 120 },
  eventDate: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
  eventTime: { min: 3, max: 40 },
  venue: { min: 2, max: 100 },
  description: { min: 10, max: 1500 },
  department: { min: 2, max: 80 },
  capacity: { min: 1, max: 5000 },
  organizerName: { min: 2, max: 80 },
  fullName: { min: 2, max: 80 },
  studentId: { min: 4, max: 24, pattern: /^[a-zA-Z0-9\-]{4,24}$/ },
  regDepartment: { min: 2, max: 60 },
  email: { min: 5, max: 120, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { min: 7, max: 20, pattern: /^[0-9+\-\s()]{7,20}$/ },
  registrationNumber: { pattern: /^CC-[0-9]{4}-[A-Z0-9]{4,8}$/ },
} as const;

export function getAvailableSeats(event: Pick<CampusEvent, 'capacity' | 'registeredCount'>): number {
  return Math.max(0, event.capacity - event.registeredCount);
}

export interface EligibilityResult {
  allowed: boolean;
  reason?: 'completed' | 'deadline_passed' | 'seats_full';
  message?: string;
}

export function canRegisterForEvent(
  event: Pick<CampusEvent, 'status' | 'deadlineMs' | 'capacity' | 'registeredCount'>,
  nowMs: number = Date.now(),
): EligibilityResult {
  if (event.status === 'completed') {
    return {
      allowed: false,
      reason: 'completed',
      message: 'This event has been marked as completed. Registration is closed.',
    };
  }
  if (nowMs >= event.deadlineMs) {
    return {
      allowed: false,
      reason: 'deadline_passed',
      message: 'The registration deadline for this event has passed.',
    };
  }
  if (event.registeredCount >= event.capacity) {
    return {
      allowed: false,
      reason: 'seats_full',
      message: 'All seats for this event are filled.',
    };
  }
  return { allowed: true };
}

export function normalizeStudentId(studentId: string): string {
  return studentId.trim().toUpperCase();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Computes a deterministic 32-char lowercase hex hash for lock IDs
 * matching ^sid_[a-f0-9]{32}$ or ^eml_[a-f0-9]{32}$.
 * Uses Web Crypto SHA-256 when available and a deterministic FNV-1a 128-bit fallback.
 */
export async function computeLockHash(prefix: 'sid' | 'eml', rawValue: string): Promise<string> {
  const normalized = prefix === 'sid' ? normalizeStudentId(rawValue) : normalizeEmail(rawValue);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoded = new TextEncoder().encode(normalized);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
    return `${prefix}_${hex}`;
  }
  return `${prefix}_${deterministicHex32(normalized)}`;
}

export function deterministicHex32(input: string): string {
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  return seeds
    .map((seed, idx) => {
      let hash = seed >>> 0;
      for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i) + idx * 17;
        hash = Math.imul(hash, 0x01000193) >>> 0;
      }
      return hash.toString(16).padStart(8, '0');
    })
    .join('');
}

export function generateRegistrationNumber(eventId: string, nowMs: number = Date.now()): string {
  const year = new Date(nowMs).getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seed = 0;
  for (let i = 0; i < eventId.length; i++) {
    seed = (seed * 31 + eventId.charCodeAt(i)) >>> 0;
  }
  const timePart = ((nowMs >>> 0) ^ seed) >>> 0;
  let randomPart = '';
  let value = timePart;
  for (let i = 0; i < 6; i++) {
    const rand = Math.floor(Math.random() * alphabet.length);
    const mixed = ((value + rand) >>> 0) % alphabet.length;
    randomPart += alphabet[mixed];
    value = (Math.floor(value / alphabet.length) + i * 7 + rand) >>> 0;
  }
  return `CC-${year}-${randomPart}`;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateRegistrationForm(input: RegistrationFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const fullName = input.fullName.trim();
  if (!fullName) {
    errors.fullName = 'Full name is required.';
  } else if (
    fullName.length < BLUEPRINT_CONSTRAINTS.fullName.min ||
    fullName.length > BLUEPRINT_CONSTRAINTS.fullName.max
  ) {
    errors.fullName = `Full name must be between ${BLUEPRINT_CONSTRAINTS.fullName.min} and ${BLUEPRINT_CONSTRAINTS.fullName.max} characters.`;
  }

  const studentId = input.studentId.trim();
  if (!studentId) {
    errors.studentId = 'Student ID is required.';
  } else if (!BLUEPRINT_CONSTRAINTS.studentId.pattern.test(studentId)) {
    errors.studentId = 'Student ID must be 4-24 characters using letters, numbers, or hyphens (e.g., ENG-2024-042).';
  }

  const department = input.department.trim();
  if (!department) {
    errors.department = 'Please select or enter your department.';
  } else if (
    department.length < BLUEPRINT_CONSTRAINTS.regDepartment.min ||
    department.length > BLUEPRINT_CONSTRAINTS.regDepartment.max
  ) {
    errors.department = `Department must be between ${BLUEPRINT_CONSTRAINTS.regDepartment.min} and ${BLUEPRINT_CONSTRAINTS.regDepartment.max} characters.`;
  }

  if (!input.year || !ACADEMIC_YEARS.includes(input.year as AcademicYear)) {
    errors.year = 'Please select your academic year.';
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = 'College email address is required.';
  } else if (
    email.length > BLUEPRINT_CONSTRAINTS.email.max ||
    !BLUEPRINT_CONSTRAINTS.email.pattern.test(email)
  ) {
    errors.email = 'Enter a valid email address (e.g., student@college.edu).';
  }

  const phone = input.phone.trim();
  const digitsOnly = phone.replace(/\D/g, '');
  if (!phone) {
    errors.phone = 'Phone number is required.';
  } else if (!BLUEPRINT_CONSTRAINTS.phone.pattern.test(phone) || digitsOnly.length < 7) {
    errors.phone = 'Enter a valid phone number (7-20 digits/symbols).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateEventForm(
  input: EventFormInput,
  existingRegisteredCount: number = 0,
): ValidationResult {
  const errors: Record<string, string> = {};

  const title = input.title.trim();
  if (!title) {
    errors.title = 'Event name is required.';
  } else if (
    title.length < BLUEPRINT_CONSTRAINTS.eventTitle.min ||
    title.length > BLUEPRINT_CONSTRAINTS.eventTitle.max
  ) {
    errors.title = `Event name must be ${BLUEPRINT_CONSTRAINTS.eventTitle.min}-${BLUEPRINT_CONSTRAINTS.eventTitle.max} characters.`;
  }

  if (!EVENT_CATEGORIES.includes(input.category)) {
    errors.category = 'Select a valid event category.';
  }

  if (!input.date || !BLUEPRINT_CONSTRAINTS.eventDate.pattern.test(input.date)) {
    errors.date = 'Select a valid event date (YYYY-MM-DD).';
  }

  const time = input.time.trim();
  if (!time) {
    errors.time = 'Event time is required.';
  } else if (
    time.length < BLUEPRINT_CONSTRAINTS.eventTime.min ||
    time.length > BLUEPRINT_CONSTRAINTS.eventTime.max
  ) {
    errors.time = `Event time must be ${BLUEPRINT_CONSTRAINTS.eventTime.min}-${BLUEPRINT_CONSTRAINTS.eventTime.max} characters.`;
  }

  const venue = input.venue.trim();
  if (!venue) {
    errors.venue = 'Venue is required.';
  } else if (
    venue.length < BLUEPRINT_CONSTRAINTS.venue.min ||
    venue.length > BLUEPRINT_CONSTRAINTS.venue.max
  ) {
    errors.venue = `Venue must be ${BLUEPRINT_CONSTRAINTS.venue.min}-${BLUEPRINT_CONSTRAINTS.venue.max} characters.`;
  }

  const department = input.department.trim();
  if (!department || department.length < BLUEPRINT_CONSTRAINTS.department.min) {
    errors.department = 'Hosting department or club is required.';
  }

  const organizerName = input.organizerName.trim();
  if (!organizerName || organizerName.length < BLUEPRINT_CONSTRAINTS.organizerName.min) {
    errors.organizerName = 'Organizer display name is required.';
  }

  const description = input.description.trim();
  if (!description) {
    errors.description = 'Event description is required.';
  } else if (
    description.length < BLUEPRINT_CONSTRAINTS.description.min ||
    description.length > BLUEPRINT_CONSTRAINTS.description.max
  ) {
    errors.description = `Description must be ${BLUEPRINT_CONSTRAINTS.description.min}-${BLUEPRINT_CONSTRAINTS.description.max} characters.`;
  }

  const deadlineMs = input.deadline ? new Date(input.deadline).getTime() : NaN;
  if (!input.deadline || Number.isNaN(deadlineMs) || deadlineMs <= 0) {
    errors.deadline = 'Select a valid registration deadline date and time.';
  }

  const capacityNum = Number(input.capacity);
  if (!input.capacity || !Number.isInteger(capacityNum)) {
    errors.capacity = 'Seat capacity must be a whole number.';
  } else if (
    capacityNum < BLUEPRINT_CONSTRAINTS.capacity.min ||
    capacityNum > BLUEPRINT_CONSTRAINTS.capacity.max
  ) {
    errors.capacity = `Seat capacity must be between ${BLUEPRINT_CONSTRAINTS.capacity.min} and ${BLUEPRINT_CONSTRAINTS.capacity.max}.`;
  } else if (capacityNum < existingRegisteredCount) {
    errors.capacity = `Capacity cannot be lower than the ${existingRegisteredCount} already registered participants.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function hasDuplicateRegistration(
  existingRegistrations: Pick<EventRegistration, 'eventId' | 'studentId' | 'email'>[],
  eventId: string,
  studentId: string,
  email: string,
): { duplicate: boolean; field?: 'studentId' | 'email'; message?: string } {
  const normId = normalizeStudentId(studentId);
  const normEmail = normalizeEmail(email);

  for (const reg of existingRegistrations) {
    if (reg.eventId !== eventId) continue;
    if (normalizeStudentId(reg.studentId) === normId) {
      return {
        duplicate: true,
        field: 'studentId',
        message: `Student ID ${normId} is already registered for this event.`,
      };
    }
    if (normalizeEmail(reg.email) === normEmail) {
      return {
        duplicate: true,
        field: 'email',
        message: `Email ${normEmail} is already registered for this event.`,
      };
    }
  }
  return { duplicate: false };
}

export function filterEvents(
  events: CampusEvent[],
  filters: EventFilterState,
  nowMs: number = Date.now(),
): CampusEvent[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const todayStr = new Date(nowMs).toISOString().slice(0, 10);
  const sevenDaysLaterStr = new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return events.filter((event) => {
    if (filters.category !== 'All' && event.category !== filters.category) {
      return false;
    }

    if (filters.specificDate && event.date !== filters.specificDate) {
      return false;
    }

    if (filters.dateFilter === 'upcoming' && event.status !== 'upcoming') {
      return false;
    }
    if (filters.dateFilter === 'completed' && event.status !== 'completed') {
      return false;
    }
    if (
      filters.dateFilter === 'this_week' &&
      (event.status !== 'upcoming' || event.date < todayStr || event.date > sevenDaysLaterStr)
    ) {
      return false;
    }

    if (query) {
      const haystack = [
        event.title,
        event.category,
        event.venue,
        event.department,
        event.description,
        event.organizerName,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function formatDisplayDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(isoOrMs: string | number): string {
  const ms = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  if (Number.isNaN(ms)) return String(isoOrMs);
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function slugifyEventId(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || 'event'}-${suffix}`;
}
