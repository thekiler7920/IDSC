import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import {
  DEMO_ORGANIZER_UID,
  DEMO_STUDENT_UID,
  SAMPLE_DEMO_REGISTRATIONS,
  SAMPLE_EVENTS,
} from '../data/sampleEvents';
import type {
  AcademicYear,
  CampusEvent,
  EventFormInput,
  EventRegistration,
  RegistrationFormInput,
} from '../types/campus';
import {
  canRegisterForEvent,
  computeLockHash,
  generateRegistrationNumber,
  hasDuplicateRegistration,
  normalizeEmail,
  normalizeStudentId,
  slugifyEventId,
  validateEventForm,
  validateRegistrationForm,
} from '../utils/validation';
import { getMissingSampleEvents } from '../utils/catalogSync';

const DEMO_STORAGE_KEY = 'campusconnect_demo_store_v2';

interface DemoStoreState {
  events: CampusEvent[];
  registrations: EventRegistration[];
}

function timestampToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapFirestoreEvent(id: string, data: Record<string, unknown>): CampusEvent {
  return {
    id,
    title: String(data.title ?? ''),
    category: (data.category as CampusEvent['category']) ?? 'Technical',
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    venue: String(data.venue ?? ''),
    description: String(data.description ?? ''),
    department: String(data.department ?? ''),
    deadline: String(data.deadline ?? ''),
    deadlineMs: Number(data.deadlineMs ?? 0),
    capacity: Number(data.capacity ?? 0),
    registeredCount: Number(data.registeredCount ?? 0),
    status: (data.status as CampusEvent['status']) ?? 'upcoming',
    visibility: 'public',
    imageKey: (data.imageKey as CampusEvent['imageKey']) ?? 'hackathon',
    organizerId: String(data.organizerId ?? ''),
    organizerName: String(data.organizerName ?? ''),
    createdAtMs: timestampToMs(data.createdAt),
    updatedAtMs: timestampToMs(data.updatedAt),
  };
}

function mapFirestoreRegistration(id: string, data: Record<string, unknown>): EventRegistration {
  return {
    id,
    registrationNumber: String(data.registrationNumber ?? ''),
    eventId: String(data.eventId ?? ''),
    eventTitle: String(data.eventTitle ?? ''),
    eventCategory: (data.eventCategory as EventRegistration['eventCategory']) ?? 'Technical',
    eventDate: String(data.eventDate ?? ''),
    eventTime: String(data.eventTime ?? ''),
    eventVenue: String(data.eventVenue ?? ''),
    userId: String(data.userId ?? ''),
    eventOrganizerId: String(data.eventOrganizerId ?? ''),
    fullName: String(data.fullName ?? ''),
    studentId: String(data.studentId ?? ''),
    department: String(data.department ?? ''),
    year: (data.year as AcademicYear) ?? '1st Year',
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    studentIdHash: String(data.studentIdHash ?? ''),
    emailHash: String(data.emailHash ?? ''),
    registeredAtMs: timestampToMs(data.registeredAt),
  };
}

// --- Demo Mode Persistence (localStorage) ---

export function loadDemoStore(): DemoStoreState {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoStoreState;
      if (Array.isArray(parsed.events) && Array.isArray(parsed.registrations)) {
        return parsed;
      }
    }
  } catch {
    // Fall back to fresh seed
  }
  const fresh: DemoStoreState = {
    events: SAMPLE_EVENTS.map((e) => ({ ...e })),
    registrations: SAMPLE_DEMO_REGISTRATIONS.map((r) => ({ ...r })),
  };
  saveDemoStore(fresh);
  return fresh;
}

export function saveDemoStore(store: DemoStoreState): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetDemoStore(): DemoStoreState {
  const fresh: DemoStoreState = {
    events: SAMPLE_EVENTS.map((e) => ({ ...e })),
    registrations: SAMPLE_DEMO_REGISTRATIONS.map((r) => ({ ...r })),
  };
  saveDemoStore(fresh);
  return fresh;
}

export async function registerInDemoMode(
  eventId: string,
  input: RegistrationFormInput,
): Promise<{ registration: EventRegistration; updatedEvents: CampusEvent[]; updatedRegistrations: EventRegistration[] }> {
  const validation = validateRegistrationForm(input);
  if (!validation.valid) {
    const firstErr = Object.values(validation.errors)[0] || 'Please fix the highlighted form errors.';
    throw new Error(firstErr);
  }

  const store = loadDemoStore();
  const eventIndex = store.events.findIndex((e) => e.id === eventId);
  if (eventIndex === -1) {
    throw new Error('Selected event was not found.');
  }

  const targetEvent = store.events[eventIndex];
  const eligibility = canRegisterForEvent(targetEvent, Date.now());
  if (!eligibility.allowed) {
    throw new Error(eligibility.message || 'Registration is closed for this event.');
  }

  const dup = hasDuplicateRegistration(store.registrations, eventId, input.studentId, input.email);
  if (dup.duplicate) {
    throw new Error(dup.message || 'Duplicate registration detected.');
  }

  const nowMs = Date.now();
  const sidHash = await computeLockHash('sid', input.studentId);
  const emlHash = await computeLockHash('eml', input.email);
  const registration: EventRegistration = {
    id: `demo-reg-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    registrationNumber: generateRegistrationNumber(eventId, nowMs),
    eventId: targetEvent.id,
    eventTitle: targetEvent.title,
    eventCategory: targetEvent.category,
    eventDate: targetEvent.date,
    eventTime: targetEvent.time,
    eventVenue: targetEvent.venue,
    userId: DEMO_STUDENT_UID,
    eventOrganizerId: targetEvent.organizerId,
    fullName: input.fullName.trim(),
    studentId: normalizeStudentId(input.studentId),
    department: input.department.trim(),
    year: input.year as AcademicYear,
    email: normalizeEmail(input.email),
    phone: input.phone.trim(),
    studentIdHash: sidHash,
    emailHash: emlHash,
    registeredAtMs: nowMs,
  };

  const updatedEvent: CampusEvent = {
    ...targetEvent,
    registeredCount: targetEvent.registeredCount + 1,
    updatedAtMs: nowMs,
  };

  const updatedEvents = [...store.events];
  updatedEvents[eventIndex] = updatedEvent;
  const updatedRegistrations = [registration, ...store.registrations];

  saveDemoStore({ events: updatedEvents, registrations: updatedRegistrations });
  return { registration, updatedEvents, updatedRegistrations };
}

export function createEventInDemoMode(input: EventFormInput): {
  created: CampusEvent;
  updatedEvents: CampusEvent[];
} {
  const validation = validateEventForm(input, 0);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Invalid event details.');
  }
  const store = loadDemoStore();
  const nowMs = Date.now();
  const created: CampusEvent = {
    id: slugifyEventId(input.title),
    title: input.title.trim(),
    category: input.category,
    date: input.date,
    time: input.time.trim(),
    venue: input.venue.trim(),
    description: input.description.trim(),
    department: input.department.trim(),
    deadline: input.deadline,
    deadlineMs: Math.floor(new Date(input.deadline).getTime()),
    capacity: Number(input.capacity),
    registeredCount: 0,
    status: input.status,
    visibility: 'public',
    imageKey: input.imageKey,
    organizerId: DEMO_ORGANIZER_UID,
    organizerName: input.organizerName.trim(),
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
  const updatedEvents = [created, ...store.events];
  saveDemoStore({ events: updatedEvents, registrations: store.registrations });
  return { created, updatedEvents };
}

export function updateEventInDemoMode(
  eventId: string,
  input: EventFormInput,
): CampusEvent[] {
  const store = loadDemoStore();
  const idx = store.events.findIndex((e) => e.id === eventId);
  if (idx === -1) throw new Error('Event not found.');
  const existing = store.events[idx];

  const validation = validateEventForm(input, existing.registeredCount);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Invalid event details.');
  }

  const nowMs = Date.now();
  const updated: CampusEvent = {
    ...existing,
    title: input.title.trim(),
    category: input.category,
    date: input.date,
    time: input.time.trim(),
    venue: input.venue.trim(),
    description: input.description.trim(),
    department: input.department.trim(),
    deadline: input.deadline,
    deadlineMs: Math.floor(new Date(input.deadline).getTime()),
    capacity: Number(input.capacity),
    status: input.status,
    imageKey: input.imageKey,
    organizerName: input.organizerName.trim(),
    updatedAtMs: nowMs,
  };

  const updatedEvents = [...store.events];
  updatedEvents[idx] = updated;
  saveDemoStore({ events: updatedEvents, registrations: store.registrations });
  return updatedEvents;
}

export function toggleEventCompletedInDemoMode(eventId: string): CampusEvent[] {
  const store = loadDemoStore();
  const idx = store.events.findIndex((e) => e.id === eventId);
  if (idx === -1) throw new Error('Event not found.');
  const existing = store.events[idx];
  const nextStatus = existing.status === 'completed' ? 'upcoming' : 'completed';
  const updatedEvents = [...store.events];
  updatedEvents[idx] = { ...existing, status: nextStatus, updatedAtMs: Date.now() };
  saveDemoStore({ events: updatedEvents, registrations: store.registrations });
  return updatedEvents;
}

// --- Firebase Live Persistence ---

export async function syncUserProfileAndCheckOrganizer(user: User): Promise<boolean> {
  if (!db) return false;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        displayName: (user.displayName || user.email || 'Campus User').slice(0, 80),
        email: (user.email || '').slice(0, 120),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }

  if (user.emailVerified && user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  try {
    const orgSnap = await getDoc(doc(db, 'organizers', user.uid));
    return orgSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `organizers/${user.uid}`);
  }
}

export function subscribeToFirebaseEvents(
  onUpdate: (events: CampusEvent[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  if (!db) {
    return () => {};
  }
  const eventsQuery = query(collection(db, 'events'), where('visibility', '==', 'public'));
  return onSnapshot(
    eventsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapFirestoreEvent(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => a.date.localeCompare(b.date));
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'events');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    },
  );
}

export function subscribeToFirebaseMyRegistrations(
  uid: string,
  onUpdate: (registrations: EventRegistration[]) => void,
  onError: (err: Error) => void,
): Unsubscribe {
  if (!db) {
    return () => {};
  }
  const regPath = `users/${uid}/registrations`;
  const regQuery = query(collection(db, 'users', uid, 'registrations'), where('userId', '==', uid));
  return onSnapshot(
    regQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => mapFirestoreRegistration(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.registeredAtMs - a.registeredAtMs);
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, regPath);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    },
  );
}

export async function signInWithEmailInFirebase(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase Authentication is not configured.');
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function registerWithEmailInFirebase(
  fullName: string,
  email: string,
  password: string,
): Promise<{ user: User; verificationSent: boolean }> {
  if (!auth) throw new Error('Firebase Authentication is not configured.');
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(cred.user, { displayName: fullName.trim() });
  let verificationSent = false;
  try {
    await sendEmailVerification(cred.user);
    verificationSent = true;
  } catch {
    verificationSent = false;
  }
  return { user: cred.user, verificationSent };
}

export async function resendVerificationEmailInFirebase(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function reloadFirebaseUser(user: User): Promise<User | null> {
  await reload(user);
  return auth?.currentUser ?? user;
}

export async function registerInFirebase(
  user: User,
  eventId: string,
  input: RegistrationFormInput,
): Promise<EventRegistration> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  if (!user.emailVerified) {
    throw new Error('Please verify your email address or sign in with Google to register.');
  }

  const validation = validateRegistrationForm(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Invalid registration fields.');
  }

  const normSid = normalizeStudentId(input.studentId);
  const normEmail = normalizeEmail(input.email);
  const studentIdHash = await computeLockHash('sid', normSid);
  const emailHash = await computeLockHash('eml', normEmail);

  const eventRef = doc(db, 'events', eventId);
  const regRef = doc(db, 'events', eventId, 'registrations', user.uid);
  const sidLockRef = doc(db, 'events', eventId, 'locks', studentIdHash);
  const emlLockRef = doc(db, 'events', eventId, 'locks', emailHash);
  const userMirrorRef = doc(db, 'users', user.uid, 'registrations', eventId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('This event no longer exists.');
      }

      const eventData = mapFirestoreEvent(eventSnap.id, eventSnap.data() as Record<string, unknown>);
      const eligibility = canRegisterForEvent(eventData, Date.now());
      if (!eligibility.allowed) {
        throw new Error(eligibility.message || 'Registration is closed.');
      }

      const existingUserReg = await tx.get(regRef);
      if (existingUserReg.exists()) {
        throw new Error('Your account is already registered for this event.');
      }

      const existingSidLock = await tx.get(sidLockRef);
      if (existingSidLock.exists()) {
        throw new Error(`Student ID ${normSid} is already registered for this event.`);
      }

      const existingEmlLock = await tx.get(emlLockRef);
      if (existingEmlLock.exists()) {
        throw new Error(`Email ${normEmail} is already registered for this event.`);
      }

      const nowMs = Date.now();
      const registrationNumber = generateRegistrationNumber(eventId, nowMs);

      const payload = {
        registrationNumber,
        eventId: eventData.id,
        eventTitle: eventData.title,
        eventCategory: eventData.category,
        eventDate: eventData.date,
        eventTime: eventData.time,
        eventVenue: eventData.venue,
        userId: user.uid,
        eventOrganizerId: eventData.organizerId,
        fullName: input.fullName.trim(),
        studentId: normSid,
        department: input.department.trim(),
        year: input.year as AcademicYear,
        email: normEmail,
        phone: input.phone.trim(),
        studentIdHash,
        emailHash,
        registeredAt: serverTimestamp(),
      };

      tx.set(regRef, payload);
      tx.set(userMirrorRef, payload);
      tx.set(sidLockRef, {
        uid: user.uid,
        eventId: eventData.id,
        lockType: 'studentId',
        createdAt: serverTimestamp(),
      });
      tx.set(emlLockRef, {
        uid: user.uid,
        eventId: eventData.id,
        lockType: 'email',
        createdAt: serverTimestamp(),
      });
      tx.update(eventRef, {
        registeredCount: eventData.registeredCount + 1,
        updatedAt: serverTimestamp(),
      });

      return {
        id: user.uid,
        ...payload,
        registeredAtMs: nowMs,
      } satisfies EventRegistration;
    });

    return result;
  } catch (error) {
    // Preserve clean user-facing validation/duplicate errors thrown inside the transaction
    if (
      error instanceof Error &&
      (error.message.includes('already registered') ||
        error.message.includes('seats') ||
        error.message.includes('deadline') ||
        error.message.includes('completed') ||
        error.message.includes('no longer exists'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `events/${eventId}/registrations/${user.uid}`);
  }
}

export async function createEventInFirebase(user: User, input: EventFormInput): Promise<void> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  const validation = validateEventForm(input, 0);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Invalid event details.');
  }

  const eventId = slugifyEventId(input.title);
  const path = `events/${eventId}`;
  try {
    await setDoc(doc(db, 'events', eventId), {
      id: eventId,
      title: input.title.trim(),
      category: input.category,
      date: input.date,
      time: input.time.trim(),
      venue: input.venue.trim(),
      description: input.description.trim(),
      department: input.department.trim(),
      deadline: input.deadline,
      deadlineMs: Math.floor(new Date(input.deadline).getTime()),
      capacity: Number(input.capacity),
      registeredCount: 0,
      status: input.status,
      visibility: 'public',
      imageKey: input.imageKey,
      organizerId: user.uid,
      organizerName: input.organizerName.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEventInFirebase(
  event: CampusEvent,
  input: EventFormInput,
): Promise<void> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  const validation = validateEventForm(input, event.registeredCount);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Invalid event details.');
  }

  const path = `events/${event.id}`;
  try {
    await updateDoc(doc(db, 'events', event.id), {
      title: input.title.trim(),
      category: input.category,
      date: input.date,
      time: input.time.trim(),
      venue: input.venue.trim(),
      description: input.description.trim(),
      department: input.department.trim(),
      deadline: input.deadline,
      deadlineMs: Math.floor(new Date(input.deadline).getTime()),
      capacity: Number(input.capacity),
      status: input.status,
      imageKey: input.imageKey,
      organizerName: input.organizerName.trim(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleEventCompletedInFirebase(event: CampusEvent): Promise<void> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  const nextStatus = event.status === 'completed' ? 'upcoming' : 'completed';
  const path = `events/${event.id}`;
  try {
    await updateDoc(doc(db, 'events', event.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventInFirebase(eventId: string): Promise<void> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

export async function fetchEventParticipantsInFirebase(
  eventId: string,
  user: User,
): Promise<EventRegistration[]> {
  if (!db) return [];
  const path = `events/${eventId}/registrations`;
  const isAdmin =
    user.emailVerified &&
    user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();
  try {
    const regCol = collection(db, 'events', eventId, 'registrations');
    const q = isAdmin ? regCol : query(regCol, where('eventOrganizerId', '==', user.uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapFirestoreRegistration(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.registeredAtMs - a.registeredAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function seedSampleEventsToFirebase(user: User): Promise<number> {
  if (!db) throw new Error('Firebase Firestore is not configured.');
  try {
    const existingSnap = await getDocs(
      query(collection(db, 'events'), where('visibility', '==', 'public')),
    );
    const existingEvents = existingSnap.docs.map((d) => ({ id: d.id }));
    const missingSamples = getMissingSampleEvents(existingEvents, SAMPLE_EVENTS);

    if (missingSamples.length === 0) {
      return 0;
    }

    const batch = writeBatch(db);
    for (const sample of missingSamples) {
      const ref = doc(db, 'events', sample.id);
      batch.set(ref, {
        id: sample.id,
        title: sample.title,
        category: sample.category,
        date: sample.date,
        time: sample.time,
        venue: sample.venue,
        description: sample.description,
        department: sample.department,
        deadline: sample.deadline,
        deadlineMs: Math.floor(sample.deadlineMs),
        capacity: sample.capacity,
        registeredCount: 0, // Must start at 0 per create security invariant
        status: sample.status,
        visibility: 'public',
        imageKey: sample.imageKey,
        organizerId: user.uid,
        organizerName: sample.organizerName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return missingSamples.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'events');
  }
}
