import { ArrowRight, Calendar, MapPin, Ticket, User } from 'lucide-react';
import type { DataMode, EventRegistration } from '../types/campus';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/validation';

interface MyRegistrationsProps {
  registrations: EventRegistration[];
  dataMode: DataMode;
  loading: boolean;
  onExploreEvents: () => void;
  onOpenEvent: (eventId: string) => void;
}

export function MyRegistrations({
  registrations,
  dataMode,
  loading,
  onExploreEvents,
  onOpenEvent,
}: MyRegistrationsProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">My Registrations</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {dataMode === 'firebase'
              ? 'Verified registrations saved to your Firebase student account.'
              : 'Demo registrations stored locally in your browser session.'}
          </p>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
          Total Passes:{' '}
          <span className="font-bold text-slate-900 dark:text-slate-100">{registrations.length}</span>
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Loading registrations">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse space-y-3"
            >
              <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/70 rounded" />
            </div>
          ))}
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Ticket className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No event registrations yet</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
            Browse technical competitions, robotics workshops, and engineering seminars to reserve
            your seat and receive a confirmation number.
          </p>
          <button
            type="button"
            onClick={onExploreEvents}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
          >
            <span>Explore Campus Events</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {registrations.map((reg) => (
            <article
              key={reg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {reg.eventCategory}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded tabular-nums">
                    {reg.registrationNumber}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{reg.eventTitle}</h2>

                <dl className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                    <dd className="tabular-nums">
                      {formatDisplayDate(reg.eventDate)} · {reg.eventTime}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                    <dd>{reg.eventVenue}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                    <dd>
                      {reg.fullName} · <span className="font-mono">{reg.studentId}</span> ·{' '}
                      {reg.year}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                  Registered {formatDisplayDateTime(reg.registeredAtMs)}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenEvent(reg.eventId)}
                  className="inline-flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 whitespace-nowrap"
                >
                  <span>View Event</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
