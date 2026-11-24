import { Database, Lock, ShieldCheck, Terminal } from 'lucide-react';
import { BOOTSTRAPPED_ADMIN_EMAIL } from '../firebase/config';

interface SetupGuideProps {
  isFirebaseConfigured: boolean;
  isSignedIn: boolean;
  isOrganizer: boolean;
}

export function SetupGuide({
  isFirebaseConfigured,
  isSignedIn,
  isOrganizer,
}: SetupGuideProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
          Architecture &amp; Firebase Setup Guide
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Reference overview for running CampusConnect locally, explaining Firestore transactions,
          and demonstrating role-protected security rules.
        </p>
      </div>

      {/* Current Runtime Status */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Environment Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Firebase Configuration</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {isFirebaseConfigured ? 'Provisioned (firebase-applet-config.json)' : 'Not Configured'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Authentication Session</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {isSignedIn ? 'Signed In (Firebase Live Mode)' : 'Unauthenticated (Demo Mode Active)'}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/70 rounded-lg p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Organizer Role Access</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {isSignedIn
                ? isOrganizer
                  ? 'Verified Organizer'
                  : 'Student Role Only'
                : 'Available in Demo Mode'}
            </p>
          </div>
        </div>
      </section>

      {/* Security & Persistence Architecture */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Database className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Atomic Seat Count &amp; Duplicate Locks
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            In Firebase Mode, student registrations execute inside a Firestore{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              runTransaction
            </code>{' '}
            that simultaneously checks event status, deadline, and remaining capacity, creates two
            SHA-256 uniqueness lock documents (
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">sid_*</code> and{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">eml_*</code>),
            and increments{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              registeredCount
            </code>{' '}
            by exactly <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">1</code>.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Role-Based Access Control (RBAC)
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              firestore.rules
            </code>{' '}
            enforces strict separation between Students and Organizers. Only verified organizers in{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              /organizers/&#123;uid&#125;
            </code>{' '}
            or the bootstrapped admin ({BOOTSTRAPPED_ADMIN_EMAIL}) can create, edit, or mark events
            completed, or read full participant rosters containing student emails and phone numbers.
          </p>
        </div>
      </section>

      {/* Running & Presentation Checklist */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
          <Terminal className="w-5 h-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <h2 className="text-base font-bold">How to Run &amp; Present Locally</h2>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>
            Install dependencies with{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              npm install
            </code>
            .
          </li>
          <li>
            Start the development server on port 3000 with{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              npm run dev
            </code>
            .
          </li>
          <li>
            Run unit tests for validation, filtering, and duplicate checks using{' '}
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded">
              npx tsx --test src/utils/validation.test.ts
            </code>
            .
          </li>
          <li>
            Explore immediately in <strong>Demo Mode</strong> (12 sample events stored locally) or
            sign in / register an account on the opening <strong>Sign In</strong> screen for live
            Firestore persistence.
          </li>
          <li>
            To enable <strong>Email/Password registration</strong> in Firebase Console: open{' '}
            <strong>Authentication → Sign-in method → Add new provider → Email/Password</strong>{' '}
            and toggle <strong>Enable</strong> (Google Sign-In works immediately).
          </li>
        </ol>

        <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
          <Lock className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Note on Firebase Mode:</strong> Real user accounts, email verification checks,
            server-enforced concurrency transactions, and cloud persistence require signing in with
            a verified Google or Email/Password account against the provisioned Firebase project and
            deployed{' '}
            <code className="font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
              firestore.rules
            </code>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
