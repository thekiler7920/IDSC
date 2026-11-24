import { useEffect, useState } from 'react';
import { AlertCircle, Download, Search, Users, X } from 'lucide-react';
import type { CampusEvent, EventRegistration } from '../types/campus';
import { formatDisplayDateTime, getAvailableSeats } from '../utils/validation';

interface ParticipantListModalProps {
  event: CampusEvent;
  participants: EventRegistration[];
  loading: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

export function ParticipantListModal({
  event,
  participants,
  loading,
  errorMessage,
  onClose,
}: ParticipantListModalProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const filtered = participants.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.registrationNumber, p.fullName, p.studentId, p.department, p.email, p.year]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const handleDownloadCsv = () => {
    const headers = [
      'Registration Number',
      'Full Name',
      'Student ID',
      'Department',
      'Year',
      'Email',
      'Phone',
      'Registered At',
    ];
    const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = participants.map((p) => [
      escapeCsv(p.registrationNumber),
      escapeCsv(p.fullName),
      escapeCsv(p.studentId),
      escapeCsv(p.department),
      escapeCsv(p.year),
      escapeCsv(p.email),
      escapeCsv(p.phone),
      escapeCsv(formatDisplayDateTime(p.registeredAtMs)),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.id}-participants.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="participant-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="participant-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Participant Roster — {event.title}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 tabular-nums">
              {event.registeredCount} registered · {getAvailableSeats(event)} seats available (of{' '}
              {event.capacity} total)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close participant list"
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="roster-search" className="sr-only">
              Search participants
            </label>
            <input
              id="roster-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by registration number, student ID, name, or department..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-700 dark:focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={participants.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download CSV</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {errorMessage ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-lg p-4 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          ) : loading ? (
            <div className="space-y-2.5" aria-label="Loading participant roster">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-11 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-9 h-9 text-slate-400 dark:text-slate-500 mx-auto mb-2.5" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {participants.length === 0
                  ? 'No registered participants yet'
                  : 'No participants match your search'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {participants.length === 0
                  ? 'Student registrations for this event will appear here with unique confirmation numbers.'
                  : 'Try clearing the search query above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-2.5 pr-4">Reg. Number</th>
                    <th className="py-2.5 pr-4">Student Name</th>
                    <th className="py-2.5 pr-4">Student ID</th>
                    <th className="py-2.5 pr-4">Department &amp; Year</th>
                    <th className="py-2.5 pr-4">Contact</th>
                    <th className="py-2.5 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 pr-4 font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                        {p.registrationNumber}
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {p.fullName}
                      </td>
                      <td className="py-3 pr-4 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {p.studentId}
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        <div>{p.department}</div>
                        <div className="text-slate-400 dark:text-slate-500">{p.year}</div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                        <div>{p.email}</div>
                        <div className="font-mono text-slate-400 dark:text-slate-500 tabular-nums">{p.phone}</div>
                      </td>
                      <td className="py-3 text-right text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {formatDisplayDateTime(p.registeredAtMs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
