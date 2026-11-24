import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type {
  CampusEvent,
  EventCategory,
  EventFormInput,
  EventImageKey,
  EventStatus,
} from '../types/campus';
import {
  ENGINEERING_DEPARTMENTS,
  EVENT_CATEGORIES,
  IMAGE_KEY_MAP,
  validateEventForm,
} from '../utils/validation';

interface EventFormModalProps {
  mode: 'create' | 'edit';
  initialEvent: CampusEvent | null;
  defaultOrganizerName: string;
  onClose: () => void;
  onSave: (input: EventFormInput) => Promise<void>;
}

function getDefaultFormState(
  event: CampusEvent | null,
  defaultOrganizerName: string,
): EventFormInput {
  if (event) {
    return {
      title: event.title,
      category: event.category,
      date: event.date,
      time: event.time,
      venue: event.venue,
      description: event.description,
      department: event.department,
      deadline: event.deadline.slice(0, 16),
      capacity: String(event.capacity),
      status: event.status,
      imageKey: event.imageKey,
      organizerName: event.organizerName,
    };
  }
  return {
    title: '',
    category: 'Technical',
    date: '2026-12-18',
    time: '10:00 AM - 04:00 PM',
    venue: '',
    description: '',
    department: ENGINEERING_DEPARTMENTS[0],
    deadline: '2026-12-16T23:59',
    capacity: '60',
    status: 'upcoming',
    imageKey: 'hackathon',
    organizerName: defaultOrganizerName || 'Student Technical Council',
  };
}

export function EventFormModal({
  mode,
  initialEvent,
  defaultOrganizerName,
  onClose,
  onSave,
}: EventFormModalProps) {
  const [form, setForm] = useState<EventFormInput>(() =>
    getDefaultFormState(initialEvent, defaultOrganizerName),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleChange = (field: keyof EventFormInput, value: string) => {
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

    const validation = validateEventForm(form, initialEvent?.registeredCount ?? 0);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl my-8 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="event-form-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {mode === 'create' ? 'Create Campus Event' : 'Edit Event Details'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close event form"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-lg p-3 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div>
            <label htmlFor="evt-title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Event Name <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="evt-title"
              type="text"
              required
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Embedded Linux & Edge Telemetry Sprint"
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                fieldErrors.title ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {fieldErrors.title && (
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="evt-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <select
                id="evt-category"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value as EventCategory)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="evt-department" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hosting Department / Club <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-department"
                type="text"
                list="engineering-departments-list"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.department ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              <datalist id="engineering-departments-list">
                {ENGINEERING_DEPARTMENTS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {fieldErrors.department && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.department}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="evt-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Date <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.date ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.date && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.date}</p>
              )}
            </div>

            <div>
              <label htmlFor="evt-time" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Time Window <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-time"
                type="text"
                required
                value={form.time}
                onChange={(e) => handleChange('time', e.target.value)}
                placeholder="10:00 AM - 04:00 PM"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.time ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.time && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.time}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="evt-venue" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Campus Venue <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-venue"
                type="text"
                required
                value={form.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                placeholder="e.g., Robotics Lab 204, Block C"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.venue ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.venue && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.venue}</p>
              )}
            </div>

            <div>
              <label htmlFor="evt-organizer-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Organizer / Club Name <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-organizer-name"
                type="text"
                required
                value={form.organizerName}
                onChange={(e) => handleChange('organizerName', e.target.value)}
                placeholder="e.g., IEEE Robotics Chapter"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.organizerName ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.organizerName && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.organizerName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="evt-deadline" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registration Deadline <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-deadline"
                type="datetime-local"
                required
                value={form.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.deadline ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.deadline && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.deadline}</p>
              )}
            </div>

            <div>
              <label htmlFor="evt-capacity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Seat Capacity <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="evt-capacity"
                type="number"
                min={Math.max(1, initialEvent?.registeredCount ?? 1)}
                max={5000}
                required
                value={form.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                className={`w-full px-3.5 py-2 text-sm tabular-nums rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                  fieldErrors.capacity ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {fieldErrors.capacity && (
                <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.capacity}</p>
              )}
            </div>

            <div>
              <label htmlFor="evt-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Event Status
              </label>
              <select
                id="evt-status"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value as EventStatus)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
              >
                <option value="upcoming">Upcoming (Open)</option>
                <option value="completed">Completed (Closed)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="evt-image-key" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cover Theme
            </label>
            <select
              id="evt-image-key"
              value={form.imageKey}
              onChange={(e) => handleChange('imageKey', e.target.value as EventImageKey)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
            >
              {(Object.keys(IMAGE_KEY_MAP) as EventImageKey[]).map((key) => (
                <option key={key} value={key}>
                  {IMAGE_KEY_MAP[key].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="evt-description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Requirements <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <textarea
              id="evt-description"
              rows={4}
              required
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe the agenda, prerequisites, hardware/software requirements, and team rules..."
              className={`w-full px-3.5 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 ${
                fieldErrors.description ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-slate-700'
              }`}
            />
            {fieldErrors.description && (
              <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors.description}</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 rounded-lg transition-colors"
            >
              {saving
                ? 'Saving...'
                : mode === 'create'
                  ? 'Publish Event'
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
