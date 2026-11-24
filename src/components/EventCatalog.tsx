import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  RotateCcw,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import type {
  CampusEvent,
  DateFilterOption,
  EventCategory,
  EventFilterState,
} from '../types/campus';
import {
  canRegisterForEvent,
  EVENT_CATEGORIES,
  formatDisplayDate,
  formatDisplayDateTime,
  getAvailableSeats,
} from '../utils/validation';
import { EventImage } from './EventImage';

interface EventCatalogProps {
  events: CampusEvent[];
  filteredEvents: CampusEvent[];
  filters: EventFilterState;
  onChangeFilters: (next: EventFilterState) => void;
  onSelectEvent: (eventId: string) => void;
  loading: boolean;
  errorMessage: string | null;
  registeredEventIds: Set<string>;
  isSamplePreview?: boolean;
  onSwitchToDemoMode?: () => void;
}

const DATE_FILTER_OPTIONS: { value: DateFilterOption; label: string }[] = [
  { value: 'all', label: 'All Dates' },
  { value: 'upcoming', label: 'Upcoming Only' },
  { value: 'this_week', label: 'Next 7 Days' },
  { value: 'completed', label: 'Completed' },
];

export function EventCatalog({
  events,
  filteredEvents,
  filters,
  onChangeFilters,
  onSelectEvent,
  loading,
  errorMessage,
  registeredEventIds,
  isSamplePreview = false,
  onSwitchToDemoMode,
}: EventCatalogProps) {
  const hasActiveFilters =
    filters.searchQuery.trim() !== '' ||
    filters.category !== 'All' ||
    filters.dateFilter !== 'all' ||
    filters.specificDate !== '';

  const resetFilters = () => {
    onChangeFilters({
      searchQuery: '',
      category: 'All',
      dateFilter: 'all',
      specificDate: '',
    });
  };

  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;
  const totalOpenSeats = events
    .filter((e) => e.status === 'upcoming')
    .reduce((sum, e) => sum + getAvailableSeats(e), 0);

  return (
    <div className="space-y-8">
      {/* Editorial Hero Split */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400 tracking-wide">
                Engineering College Activity Portal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
                Discover technical events, lab workshops, and campus activities
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Browse department-hosted hackathons, embedded systems workshops, engineering seminars,
                and cultural showcases. Register online to receive your verified confirmation number
                and track real-time seat availability.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{events.length}</span>{' '}
                Campus Events
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                /
              </span>
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{upcomingCount}</span>{' '}
                Open &amp; Upcoming
              </div>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                /
              </span>
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{totalOpenSeats}</span>{' '}
                Available Seats
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-full bg-slate-900">
            <EventImage
              imageKey="hackathon"
              alt="Engineering students collaborating around laptops and circuit prototypes in the college atrium"
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* Search and Filtering Toolbar */}
      <section
        aria-label="Filter campus events"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 transition-colors"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-5">
            <label htmlFor="event-search" className="sr-only">
              Search events by name, venue, department, or topic
            </label>
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="event-search"
                type="search"
                value={filters.searchQuery}
                onChange={(e) =>
                  onChangeFilters({ ...filters, searchQuery: e.target.value })
                }
                placeholder="Search by event name, venue, or department..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors"
              />
            </div>
          </div>

          {/* Date Range Select */}
          <div className="md:col-span-3">
            <label htmlFor="event-date-filter" className="sr-only">
              Filter by schedule status
            </label>
            <select
              id="event-date-filter"
              value={filters.dateFilter}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  dateFilter: e.target.value as DateFilterOption,
                })
              }
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800"
            >
              {DATE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date Picker */}
          <div className="md:col-span-3">
            <label htmlFor="event-specific-date" className="sr-only">
              Filter by exact date
            </label>
            <input
              id="event-specific-date"
              type="date"
              value={filters.specificDate}
              onChange={(e) =>
                onChangeFilters({ ...filters, specificDate: e.target.value })
              }
              aria-label="Filter by exact event date"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Clear Filters */}
          <div className="md:col-span-1 flex items-stretch">
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              title="Reset filters"
              aria-label="Reset all event filters"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="md:hidden">Reset</span>
            </button>
          </div>
        </div>

        {/* Category Segmented Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
          >
            {(['All', ...EVENT_CATEGORIES] as const).map((cat) => {
              const active = filters.category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    onChangeFilters({
                      ...filters,
                      category: cat as EventCategory | 'All',
                    })
                  }
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredEvents.length}</span>{' '}
            of {events.length} events
          </p>
        </div>
      </section>

      {/* Sample Preview Notice (Signed-in student while live DB is empty) */}
      {isSamplePreview && !loading && !errorMessage && (
        <div
          role="status"
          className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-950 dark:text-blue-100"
        >
          <div className="flex items-start gap-3 text-sm">
            <Info className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">Showing Sample Events (Preview Mode)</p>
              <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5 leading-relaxed">
                No live events have been published to Firestore by an organizer yet. You can browse
                all {events.length} sample events here, or switch to Demo Mode to test interactive
                event registration locally.
              </p>
            </div>
          </div>
          {onSwitchToDemoMode && (
            <button
              type="button"
              onClick={onSwitchToDemoMode}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Switch to Demo Mode
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 rounded-xl p-4 flex items-start gap-3 text-red-800 dark:text-red-300"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold">Unable to load campus events</p>
            <p className="text-red-700 dark:text-red-300 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          aria-label="Loading events"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-12 w-full bg-slate-100 dark:bg-slate-800/70 rounded" />
                <div className="h-9 w-full bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEvents.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No matching events found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Try clearing your search query, category filter, or date filter to view all scheduled campus activities.'
              : 'There are currently no events published in this workspace.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Event Cards Grid */}
      {!loading && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const seatsLeft = getAvailableSeats(event);
            const eligibility = canRegisterForEvent(event);
            const isRegistered = registeredEventIds.has(event.id);

            return (
              <article
                key={event.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <EventImage
                    imageKey={event.imageKey}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    {/* Unboxed metadata with typographic separators (zero pills) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{event.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{event.department}</span>
                    </div>

                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {event.title}
                    </h2>

                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>

                    {/* Structured schedule, venue & deadline details */}
                    <dl className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Date and Time</dt>
                        <dd className="tabular-nums">
                          {formatDisplayDate(event.date)} · {event.time}
                        </dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                        <dt className="sr-only">Venue</dt>
                        <dd className="truncate">{event.venue}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
                        <dt className="text-slate-500 dark:text-slate-400">Deadline:</dt>
                        <dd className="tabular-nums">{formatDisplayDateTime(event.deadline)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        <span>
                          {seatsLeft} / {event.capacity} seats left
                        </span>
                      </div>

                      {isRegistered ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Registered
                        </span>
                      ) : event.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Completed
                        </span>
                      ) : !eligibility.allowed ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          {eligibility.reason === 'seats_full' ? 'Seats Full' : 'Deadline Passed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          Open
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectEvent(event.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap bg-slate-900 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400"
                    >
                      <span>
                        {isRegistered
                          ? 'View Registration Pass'
                          : eligibility.allowed
                            ? 'View Details & Register'
                            : 'View Event Details'}
                      </span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
