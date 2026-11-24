import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Ticket,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  AcademicYear,
  CampusEvent,
  DataMode,
  EventRegistration,
  RegistrationFormInput,
} from '../types/campus';
import {
  ACADEMIC_YEARS,
  canRegisterForEvent,
  ENGINEERING_DEPARTMENTS,
  formatDisplayDate,
  formatDisplayDateTime,
  getAvailableSeats,
  validateRegistrationForm,
} from '../utils/validation';
import { EventImage } from './EventImage';

interface EventDetailsPageProps {
  event: CampusEvent;
  dataMode: DataMode;
  existingUserRegistration: EventRegistration | null;
  onBack: () => void;
  onGoToMyRegistrations: () => void;
  onSubmitRegistration: (
    eventId: string,
    input: RegistrationFormInput,
  ) => Promise<EventRegistration>;
  defaultEmail?: string;
  defaultName?: string;
  isSamplePreview?: boolean;
  onSwitchToDemoMode?: () => void;
}

export function EventDetailsPage({
  event,
  dataMode,
  existingUserRegistration,
  onBack,
  onGoToMyRegistrations,
  onSubmitRegistration,
  defaultEmail = '',
  defaultName = '',
  isSamplePreview = false,
  onSwitchToDemoMode,
}: EventDetailsPageProps) {
  const [form, setForm] = useState<RegistrationFormInput>({
    fullName: defaultName,
    studentId: '',
    department: ENGINEERING_DEPARTMENTS[0],
    year: '',
    email: defaultEmail,
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedRegistration, setConfirmedRegistration] =
    useState<EventRegistration | null>(existingUserRegistration);
  const [showDemoAnotherForm, setShowDemoAnotherForm] = useState(false);

  const seatsLeft = getAvailableSeats(event);
  const occupiedPercent = Math.min(
    100,
    Math.round((event.registeredCount / Math.max(1, event.capacity)) * 100),
  );
  const eligibility = canRegisterForEvent(event);

  const activeConfirmation =
    showDemoAnotherForm ? null : confirmedRegistration ?? existingUserRegistration;

  const handleFieldChange = (field: keyof RegistrationFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateRegistrationForm(form);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const saved = await onSubmitRegistration(event.id, form);
      setConfirmedRegistration(saved);
      setShowDemoAnotherForm(false);
      setFieldErrors({});
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Could not complete registration. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400 rounded"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Event Catalog</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Event Information */}
        <article className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <EventImage
              imageKey={event.imageKey}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-blue-700 dark:text-blue-400">{event.category}</span>
                <span aria-hidden="true">·</span>
                <span>{event.department}</span>
                <span aria-hidden="true">·</span>
                <span>Hosted by {event.organizerName}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 text-balance">
                {event.title}
              </h1>
            </div>

            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>

            {/* Key Event Details Grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4 space-y-1">
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  Date &amp; Time
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDisplayDate(event.date)}
                </dd>
                <dd className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">{event.time}</dd>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4 space-y-1">
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                  Campus Venue
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100">{event.venue}</dd>
                <dd className="text-xs text-slate-600 dark:text-slate-300">{event.department}</dd>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4 space-y-1">
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  Registration Deadline
                </dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {formatDisplayDateTime(event.deadline)}
                </dd>
                <dd className="text-xs text-slate-600 dark:text-slate-300">
                  {eligibility.reason === 'deadline_passed'
                    ? 'Deadline closed'
                    : event.status === 'completed'
                      ? 'Event completed'
                      : 'Registrations currently accepted'}
                </dd>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4 space-y-2">
                <dt className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    Seat Availability
                  </span>
                  <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                    {event.registeredCount} / {event.capacity}
                  </span>
                </dt>
                <dd>
                  <div
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={event.registeredCount}
                    aria-valuemin={0}
                    aria-valuemax={event.capacity}
                    aria-label="Registered seats"
                  >
                    <div
                      className={`h-full transition-all ${
                        seatsLeft === 0 ? 'bg-red-600 dark:bg-red-500' : 'bg-blue-700 dark:bg-blue-500'
                      }`}
                      style={{ width: `${occupiedPercent}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1.5 tabular-nums">
                    {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} remaining
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </article>

        {/* Right Column: Registration Form / Confirmation / Blocked State */}
        <aside className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 space-y-6">
          {activeConfirmation ? (
            <div className="space-y-5" data-testid="registration-confirmation">
              <div className="flex items-start gap-3 text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/70 rounded-lg p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold text-emerald-900 dark:text-emerald-100">Registration Confirmed</p>
                  <p className="text-emerald-800 dark:text-emerald-200 mt-0.5">
                    Your seat has been reserved and recorded. Present your registration number at
                    the venue check-in desk.
                  </p>
                </div>
              </div>

              <div className="bg-slate-900 dark:bg-slate-950 dark:border dark:border-slate-700 text-white rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                    Unique Registration Number
                  </span>
                  <span>{dataMode === 'firebase' ? 'Verified Pass' : 'Demo Pass'}</span>
                </div>
                <p
                  data-testid="confirmation-number"
                  className="text-2xl font-mono font-semibold tracking-wider text-white tabular-nums"
                >
                  {activeConfirmation.registrationNumber}
                </p>
                <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-400">Participant</p>
                    <p className="font-medium text-white truncate">{activeConfirmation.fullName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Student ID</p>
                    <p className="font-mono text-white">{activeConfirmation.studentId}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Department</p>
                    <p className="text-slate-200 truncate">{activeConfirmation.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Academic Year</p>
                    <p className="text-slate-200">{activeConfirmation.year}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onGoToMyRegistrations}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
                >
                  <UserCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Go to My Registrations</span>
                </button>

                {dataMode === 'demo' && eligibility.allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDemoAnotherForm(true);
                      setSubmitError(null);
                    }}
                    className="w-full px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Register Another Student or Test Duplicate Check
                  </button>
                )}
              </div>
            </div>
          ) : !eligibility.allowed ? (
            <div className="space-y-4" data-testid="registration-blocked">
              <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg p-4">
                <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold">
                    {eligibility.reason === 'completed'
                      ? 'Event Completed'
                      : eligibility.reason === 'seats_full'
                        ? 'Seats Full'
                        : 'Registration Deadline Passed'}
                  </p>
                  <p className="mt-1 text-amber-800 dark:text-amber-200">{eligibility.message}</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4">
                <div className="flex justify-between">
                  <span>Event Status</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{event.status}</span>
                </div>
                <div className="flex justify-between">
                  <span>Seat Capacity</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {event.registeredCount} / {event.capacity} filled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Deadline</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatDisplayDateTime(event.deadline)}
                  </span>
                </div>
              </div>
            </div>
          ) : isSamplePreview ? (
            <div className="space-y-4" data-testid="registration-preview-notice">
              <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 text-blue-950 dark:text-blue-100 rounded-lg p-4">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-bold">Sample Preview Only</p>
                  <p className="mt-1 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    This event is shown from the built-in sample catalog because an organizer has
                    not signed in to publish live events to Firestore yet. Live registrations unlock
                    automatically once published, or you can test registration in Demo Mode.
                  </p>
                </div>
              </div>

              {onSwitchToDemoMode && (
                <button
                  type="button"
                  onClick={onSwitchToDemoMode}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
                >
                  <span>Switch to Demo Mode to Register</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student Registration</h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Complete all fields below. Duplicate Student IDs or emails are blocked for the
                  same event.
                </p>
              </div>

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-lg p-3.5 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label htmlFor="reg-full-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="reg-full-name"
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  placeholder="e.g., Priya Deshpande"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                    fieldErrors.fullName ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {fieldErrors.fullName && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.fullName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-student-id" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student ID <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <input
                    id="reg-student-id"
                    type="text"
                    required
                    value={form.studentId}
                    onChange={(e) => handleFieldChange('studentId', e.target.value)}
                    placeholder="ENG-2024-042"
                    className={`w-full px-3.5 py-2.5 text-sm font-mono rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                      fieldErrors.studentId ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  />
                  {fieldErrors.studentId && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.studentId}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-year" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Year <span className="text-red-600 dark:text-red-400">*</span>
                  </label>
                  <select
                    id="reg-year"
                    required
                    value={form.year}
                    onChange={(e) =>
                      handleFieldChange('year', e.target.value as AcademicYear | '')
                    }
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                      fieldErrors.year ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <option value="">Select Year</option>
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.year && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.year}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="reg-department" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Engineering Department <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2
                    className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <select
                    id="reg-department"
                    required
                    value={form.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    className={`w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                      fieldErrors.department ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {ENGINEERING_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldErrors.department && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.department}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College Email Address <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="student@college.edu"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                    fieldErrors.email ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                    fieldErrors.phone ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                {fieldErrors.phone && (
                  <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.phone}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
              >
                {submitting ? 'Confirming Seat...' : 'Confirm Event Registration'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
