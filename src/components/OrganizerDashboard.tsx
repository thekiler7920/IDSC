import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  CampusEvent,
  DataMode,
  EventFormInput,
  EventRegistration,
} from '../types/campus';
import {
  formatDisplayDate,
  formatDisplayDateTime,
  getAvailableSeats,
} from '../utils/validation';
import { EventFormModal } from './EventFormModal';
import { ParticipantListModal } from './ParticipantListModal';

interface OrganizerDashboardProps {
  events: CampusEvent[];
  dataMode: DataMode;
  isSignedIn: boolean;
  isAuthorizedOrganizer: boolean;
  organizerDisplayName: string;
  onCreateEvent: (input: EventFormInput) => Promise<void>;
  onUpdateEvent: (event: CampusEvent, input: EventFormInput) => Promise<void>;
  onToggleCompleted: (event: CampusEvent) => Promise<void>;
  onLoadParticipants: (event: CampusEvent) => Promise<EventRegistration[]>;
  onSeedSampleEvents: () => Promise<number | void>;
  onResetDemoData: () => void;
  onSwitchToDemoMode: () => void;
  missingSampleCount?: number;
}

export function OrganizerDashboard({
  events,
  dataMode,
  isSignedIn,
  isAuthorizedOrganizer,
  organizerDisplayName,
  onCreateEvent,
  onUpdateEvent,
  onToggleCompleted,
  onLoadParticipants,
  onSeedSampleEvents,
  onResetDemoData,
  onSwitchToDemoMode,
  missingSampleCount = 0,
}: OrganizerDashboardProps) {
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    event: CampusEvent | null;
  }>({ open: false, mode: 'create', event: null });

  const [participantModal, setParticipantModal] = useState<{
    event: CampusEvent | null;
    participants: EventRegistration[];
    loading: boolean;
    error: string | null;
  }>({ event: null, participants: [], loading: false, error: null });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Role gate in Firebase Mode
  if (dataMode === 'firebase' && isSignedIn && !isAuthorizedOrganizer) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Organizer Access Restricted</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Your signed-in Firebase account has <strong>Student</strong> permissions. Creating events,
          modifying capacities, and viewing participant PII rosters are protected by Firestore
          security rules and restricted to verified Organizers.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onSwitchToDemoMode}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
          >
            Explore Organizer Dashboard in Demo Mode
          </button>
        </div>
      </div>
    );
  }

  const totalEvents = events.length;
  const upcomingEvents = events.filter((e) => e.status === 'upcoming').length;
  const totalRegistered = events.reduce((sum, e) => sum + e.registeredCount, 0);
  const totalAvailableSeats = events
    .filter((e) => e.status === 'upcoming')
    .reduce((sum, e) => sum + getAvailableSeats(e), 0);

  const handleOpenParticipants = async (event: CampusEvent) => {
    setParticipantModal({ event, participants: [], loading: true, error: null });
    try {
      const list = await onLoadParticipants(event);
      setParticipantModal({ event, participants: list, loading: false, error: null });
    } catch (err) {
      setParticipantModal({
        event,
        participants: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Unable to load participants.',
      });
    }
  };

  const handleToggleStatus = async (event: CampusEvent) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await onToggleCompleted(event);
      setActionSuccess(
        event.status === 'completed'
          ? `"${event.title}" reopened for registrations.`
          : `"${event.title}" marked as completed.`,
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update event status.');
    }
  };

  const handleSeed = async () => {
    setActionError(null);
    setActionSuccess(null);
    setSeeding(true);
    try {
      const added = await onSeedSampleEvents();
      setActionSuccess(
        typeof added === 'number' && added > 0
          ? `Added ${added} missing sample ${added === 1 ? 'event' : 'events'} to Firestore.`
          : 'All sample engineering college events are already synced in Firestore.',
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to initialize sample events.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Organizer Dashboard</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Manage event capacities, deadlines, completion statuses, and student participant rosters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {dataMode === 'demo' ? (
            <button
              type="button"
              onClick={() => {
                onResetDemoData();
                setActionSuccess('Demo sample events and registrations restored.');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset Demo Data</span>
            </button>
          ) : (
            (events.length === 0 || missingSampleCount > 0) && (
              <button
                type="button"
                onClick={handleSeed}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {seeding
                    ? 'Syncing...'
                    : events.length === 0
                      ? 'Seed Sample Events'
                      : `Sync ${missingSampleCount} Missing Sample ${missingSampleCount === 1 ? 'Event' : 'Events'}`}
                </span>
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => setFormModal({ open: true, mode: 'create', event: null })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-xl p-4 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div
          role="status"
          className="flex items-start gap-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/70 text-emerald-800 dark:text-emerald-200 rounded-xl p-4 text-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <section aria-label="Organizer summary metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Events</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{totalEvents}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Active</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{upcomingEvents}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Participants</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{totalRegistered}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Seats Remaining</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1 tabular-nums">
            {totalAvailableSeats}
          </p>
        </div>
      </section>

      {/* Events Management Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">No events created yet</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Create your first campus event or seed sample events to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  <th className="py-3.5 px-4 whitespace-nowrap">Event &amp; Category</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Schedule &amp; Deadline</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Venue</th>
                  <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Seats (Reg / Cap)</th>
                  <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Available</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {events.map((event) => {
                  const available = getAvailableSeats(event);
                  const isCompleted = event.status === 'completed';

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{event.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {event.category} · {event.department}
                        </div>
                      </td>

                      <td className="py-4 px-3.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                          {formatDisplayDate(event.date)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 tabular-nums flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          Due {formatDisplayDateTime(event.deadline)}
                        </div>
                      </td>

                      <td className="py-4 px-3.5 text-xs text-slate-600 dark:text-slate-300 max-w-[230px]">
                        <span className="line-clamp-2">{event.venue}</span>
                      </td>

                      <td className="py-4 px-3.5 text-right font-mono text-xs text-slate-800 dark:text-slate-200 tabular-nums whitespace-nowrap">
                        {event.registeredCount} / {event.capacity}
                      </td>

                      <td className="py-4 px-3.5 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                        <span className={available === 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                          {available}
                        </span>
                      </td>

                      <td className="py-4 px-3.5 whitespace-nowrap text-xs">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                            Upcoming
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenParticipants(event)}
                            aria-label={`View participants for ${event.title}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Users className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Participants</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setFormModal({ open: true, mode: 'edit', event })
                            }
                            aria-label={`Edit ${event.title}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(event)}
                            aria-label={
                              isCompleted
                                ? `Reopen ${event.title}`
                                : `Mark ${event.title} as completed`
                            }
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              isCompleted
                                ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                                : 'text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {isCompleted ? 'Reopen' : 'Mark Completed'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit Event Modal */}
      {formModal.open && (
        <EventFormModal
          mode={formModal.mode}
          initialEvent={formModal.event}
          defaultOrganizerName={organizerDisplayName}
          onClose={() => setFormModal({ open: false, mode: 'create', event: null })}
          onSave={async (input) => {
            setActionError(null);
            setActionSuccess(null);
            if (formModal.mode === 'create') {
              await onCreateEvent(input);
              setActionSuccess(`Published "${input.title.trim()}".`);
            } else if (formModal.event) {
              await onUpdateEvent(formModal.event, input);
              setActionSuccess(`Updated "${input.title.trim()}".`);
            }
          }}
        />
      )}

      {/* Participant List Modal */}
      {participantModal.event && (
        <ParticipantListModal
          event={participantModal.event}
          participants={participantModal.participants}
          loading={participantModal.loading}
          errorMessage={participantModal.error}
          onClose={() =>
            setParticipantModal({
              event: null,
              participants: [],
              loading: false,
              error: null,
            })
          }
        />
      )}
    </div>
  );
}
