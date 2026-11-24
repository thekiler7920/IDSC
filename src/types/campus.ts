export type EventCategory = 'Technical' | 'Workshop' | 'Seminar' | 'Extracurricular';

export type EventStatus = 'upcoming' | 'completed';

export type EventImageKey = 'hackathon' | 'robotics' | 'seminar' | 'cultural';

export type AcademicYear = '1st Year' | '2nd Year' | '3rd Year' | '4th Year';

export type UserRole = 'student' | 'organizer';

export type DataMode = 'firebase' | 'demo';

export type DateFilterOption = 'all' | 'upcoming' | 'this_week' | 'completed';

export interface CampusEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  description: string;
  department: string;
  deadline: string; // YYYY-MM-DDTHH:mm
  deadlineMs: number;
  capacity: number;
  registeredCount: number;
  status: EventStatus;
  visibility: 'public';
  imageKey: EventImageKey;
  organizerId: string;
  organizerName: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface EventRegistration {
  id: string;
  registrationNumber: string;
  eventId: string;
  eventTitle: string;
  eventCategory: EventCategory;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  userId: string;
  eventOrganizerId: string;
  fullName: string;
  studentId: string;
  department: string;
  year: AcademicYear;
  email: string;
  phone: string;
  studentIdHash: string;
  emailHash: string;
  registeredAtMs: number;
}

export interface RegistrationFormInput {
  fullName: string;
  studentId: string;
  department: string;
  year: AcademicYear | '';
  email: string;
  phone: string;
}

export interface EventFormInput {
  title: string;
  category: EventCategory;
  date: string;
  time: string;
  venue: string;
  description: string;
  department: string;
  deadline: string;
  capacity: string;
  status: EventStatus;
  imageKey: EventImageKey;
  organizerName: string;
}

export interface EventFilterState {
  searchQuery: string;
  category: EventCategory | 'All';
  dateFilter: DateFilterOption;
  specificDate: string;
}
