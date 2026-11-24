import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AlertCircle, Cloud, Info, Layers, Loader2 } from 'lucide-react';
import { AuthLandingPage } from './components/AuthLandingPage';
import { EventCatalog } from './components/EventCatalog';
import { EventDetailsPage } from './components/EventDetailsPage';
import { MyRegistrations } from './components/MyRegistrations';
import { Navbar, type ActiveTab } from './components/Navbar';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { SetupGuide } from './components/SetupGuide';
import { DEMO_STUDENT_UID, SAMPLE_EVENTS } from './data/sampleEvents';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  testFirestoreConnection,
} from './firebase/config';
import {
  createEventInDemoMode,
  createEventInFirebase,
  fetchEventParticipantsInFirebase,
  loadDemoStore,
  registerInDemoMode,
  registerInFirebase,
  registerWithEmailInFirebase,
  reloadFirebaseUser,
  resendVerificationEmailInFirebase,
  resetDemoStore,
  seedSampleEventsToFirebase,
  signInWithEmailInFirebase,
  subscribeToFirebaseEvents,
  subscribeToFirebaseMyRegistrations,
  syncUserProfileAndCheckOrganizer,
  toggleEventCompletedInDemoMode,
  toggleEventCompletedInFirebase,
  updateEventInDemoMode,
  updateEventInFirebase,
} from './services/campusService';
import type {
  CampusEvent,
  DataMode,
  EventFilterState,
  EventFormInput,
  EventRegistration,
  RegistrationFormInput,
} from './types/campus';
import { mapFirebaseAuthError, shouldAutoEnterDemoMode } from './utils/authValidation';
import { getMissingSampleEvents, resolveFirebaseCatalogState } from './utils/catalogSync';
import { filterEvents } from './utils/validation';
import {
  applyThemeToDocument,
  getBrowserStorage,
  getNextTheme,
  persistTheme,
  resolveInitialTheme,
  type ThemeMode,
} from './utils/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('events');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    resolveInitialTheme(getBrowserStorage()),
  );

  // Auth & mode state (opens on Sign In / Register landing page unless ?autostart=1)
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!isFirebaseConfigured);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirebaseOrganizer, setIsFirebaseOrganizer] = useState<boolean>(false);
  const [enteredDemoMode, setEnteredDemoMode] = useState<boolean>(() =>
    typeof window !== 'undefined' ? shouldAutoEnterDemoMode(window.location.search) : false,
  );
  const [forceDemoOverride, setForceDemoOverride] = useState<boolean>(false);

  // Data state
  const [demoStore, setDemoStore] = useState(() => loadDemoStore());
  const [firebaseEvents, setFirebaseEvents] = useState<CampusEvent[]>([]);
  const [firebaseMyRegs, setFirebaseMyRegs] = useState<EventRegistration[]>([]);
  const [firebaseLoading, setFirebaseLoading] = useState<boolean>(false);
  const [hasLoadedFirebaseEvents, setHasLoadedFirebaseEvents] = useState<boolean>(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const autoSeededUidRef = useRef<string | null>(null);

  // Event filters
  const [filters, setFilters] = useState<EventFilterState>({
    searchQuery: '',
    category: 'All',
    dateFilter: 'all',
    specificDate: '',
  });

  const isVerifiedSignedInUser = Boolean(user && user.emailVerified);
  const dataMode: DataMode =
    isFirebaseConfigured && isVerifiedSignedInUser && !forceDemoOverride ? 'firebase' : 'demo';

  // Apply and persist theme preference
  useEffect(() => {
    applyThemeToDocument(theme);
    persistTheme(theme, getBrowserStorage());
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => getNextTheme(prev));
  };

  // Run connection check and auth listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setAuthReady(true);
      return;
    }

    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthError(null);
      if (nextUser && nextUser.emailVerified) {
        setForceDemoOverride(false);
        setEnteredDemoMode(true);
        try {
          const isOrg = await syncUserProfileAndCheckOrganizer(nextUser);
          setIsFirebaseOrganizer(isOrg);
        } catch (err) {
          setIsFirebaseOrganizer(false);
          setFirebaseError(
            err instanceof Error ? err.message : 'Unable to verify Firebase user profile.',
          );
        }
      } else {
        setIsFirebaseOrganizer(false);
        setFirebaseEvents([]);
        setFirebaseMyRegs([]);
        setHasLoadedFirebaseEvents(false);
        autoSeededUidRef.current = null;
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore listeners ONLY when verified and authenticated in Firebase mode
  useEffect(() => {
    if (!authReady || dataMode !== 'firebase' || !user || !user.emailVerified) {
      return;
    }

    setFirebaseLoading(true);
    setHasLoadedFirebaseEvents(false);
    setFirebaseError(null);

    const unsubEvents = subscribeToFirebaseEvents(
      (items) => {
        setFirebaseEvents(items);
        setFirebaseLoading(false);
        setHasLoadedFirebaseEvents(true);
      },
      (err) => {
        setFirebaseError(err.message);
        setFirebaseLoading(false);
        setHasLoadedFirebaseEvents(true);
      },
    );

    const unsubRegs = subscribeToFirebaseMyRegistrations(
      user.uid,
      (regs) => {
        setFirebaseMyRegs(regs);
      },
      (err) => {
        setFirebaseError(err.message);
      },
    );

    return () => {
      unsubEvents();
      unsubRegs();
    };
  }, [authReady, dataMode, user]);

  // Auto-seed any missing sample events into Firestore when a verified Organizer signs in
  useEffect(() => {
    if (
      !authReady ||
      dataMode !== 'firebase' ||
      !user ||
      !user.emailVerified ||
      !isFirebaseOrganizer
    ) {
      return;
    }
    if (autoSeededUidRef.current === user.uid) {
      return;
    }
    autoSeededUidRef.current = user.uid;
    void seedSampleEventsToFirebase(user).catch((err) => {
      console.error('Auto-seeding missing sample events failed:', err);
    });
  }, [authReady, dataMode, isFirebaseOrganizer, user]);

  const firebaseCatalog = useMemo(
    () =>
      resolveFirebaseCatalogState({
        firebaseEvents,
        firebaseLoading: firebaseLoading || !hasLoadedFirebaseEvents,
        firebaseError,
        sampleEvents: SAMPLE_EVENTS,
      }),
    [firebaseEvents, firebaseLoading, hasLoadedFirebaseEvents, firebaseError],
  );

  const activeEvents = dataMode === 'firebase' ? firebaseCatalog.events : demoStore.events;
  const isSamplePreview = dataMode === 'firebase' && firebaseCatalog.isSamplePreview;
  const missingSampleCount = useMemo(
    () =>
      dataMode === 'firebase' && hasLoadedFirebaseEvents
        ? getMissingSampleEvents(firebaseEvents, SAMPLE_EVENTS).length
        : 0,
    [dataMode, hasLoadedFirebaseEvents, firebaseEvents],
  );
  const activeMyRegistrations = useMemo(() => {
    if (dataMode === 'firebase') return firebaseMyRegs;
    return demoStore.registrations.filter((r) => r.userId === DEMO_STUDENT_UID);
  }, [dataMode, firebaseMyRegs, demoStore.registrations]);

  const filteredEvents = useMemo(
    () => filterEvents(activeEvents, filters),
    [activeEvents, filters],
  );

  const registeredEventIds = useMemo(
    () => new Set(activeMyRegistrations.map((r) => r.eventId)),
    [activeMyRegistrations],
  );

  const selectedEvent = useMemo(
    () => activeEvents.find((e) => e.id === selectedEventId) ?? null,
    [activeEvents, selectedEventId],
  );

  const existingUserRegForSelected = useMemo(() => {
    if (!selectedEvent) return null;
    return activeMyRegistrations.find((r) => r.eventId === selectedEvent.id) ?? null;
  }, [selectedEvent, activeMyRegistrations]);

  const handleSignInWithGoogle = async () => {
    if (!auth) return;
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setForceDemoOverride(false);
      setEnteredDemoMode(true);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const signedInUser = await signInWithEmailInFirebase(email, password);
      setUser(signedInUser);
      setForceDemoOverride(false);
      if (signedInUser.emailVerified) {
        setEnteredDemoMode(true);
        const isOrg = await syncUserProfileAndCheckOrganizer(signedInUser);
        setIsFirebaseOrganizer(isOrg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterWithEmail = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ verificationSent: boolean }> => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await registerWithEmailInFirebase(fullName, email, password);
      setUser(res.user);
      setForceDemoOverride(false);
      return { verificationSent: res.verificationSent };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    await resendVerificationEmailInFirebase(user);
  };

  const handleRefreshVerification = async (): Promise<boolean> => {
    if (!user) return false;
    const reloaded = await reloadFirebaseUser(user);
    if (reloaded && reloaded.emailVerified) {
      setUser(reloaded);
      setForceDemoOverride(false);
      setEnteredDemoMode(true);
      const isOrg = await syncUserProfileAndCheckOrganizer(reloaded);
      setIsFirebaseOrganizer(isOrg);
      return true;
    }
    return false;
  };

  const handleSignOut = async () => {
    setAuthError(null);
    if (auth && user) {
      await signOut(auth);
    }
    setUser(null);
    setForceDemoOverride(false);
    setEnteredDemoMode(false);
    setHasLoadedFirebaseEvents(false);
    autoSeededUidRef.current = null;
    setSelectedEventId(null);
    setActiveTab('events');
  };

  const handleOpenAuthPage = () => {
    setAuthError(null);
    setEnteredDemoMode(false);
    setForceDemoOverride(false);
  };

  const handleContinueInDemoMode = () => {
    setAuthError(null);
    setForceDemoOverride(true);
    setEnteredDemoMode(true);
  };

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedEventId(null);
  };

  const handleSubmitRegistration = async (
    eventId: string,
    input: RegistrationFormInput,
  ): Promise<EventRegistration> => {
    if (dataMode === 'firebase' && user) {
      return await registerInFirebase(user, eventId, input);
    }
    const res = await registerInDemoMode(eventId, input);
    setDemoStore({ events: res.updatedEvents, registrations: res.updatedRegistrations });
    return res.registration;
  };

  const handleCreateEvent = async (input: EventFormInput) => {
    if (dataMode === 'firebase' && user) {
      await createEventInFirebase(user, input);
      return;
    }
    const res = createEventInDemoMode(input);
    setDemoStore((prev) => ({ ...prev, events: res.updatedEvents }));
  };

  const handleUpdateEvent = async (event: CampusEvent, input: EventFormInput) => {
    if (dataMode === 'firebase') {
      await updateEventInFirebase(event, input);
      return;
    }
    const updatedEvents = updateEventInDemoMode(event.id, input);
    setDemoStore((prev) => ({ ...prev, events: updatedEvents }));
  };

  const handleToggleCompleted = async (event: CampusEvent) => {
    if (dataMode === 'firebase') {
      await toggleEventCompletedInFirebase(event);
      return;
    }
    const updatedEvents = toggleEventCompletedInDemoMode(event.id);
    setDemoStore((prev) => ({ ...prev, events: updatedEvents }));
  };

  const handleLoadParticipants = async (event: CampusEvent): Promise<EventRegistration[]> => {
    if (dataMode === 'firebase' && user) {
      return await fetchEventParticipantsInFirebase(event.id, user);
    }
    return demoStore.registrations.filter((r) => r.eventId === event.id);
  };

  const handleSeedSampleEvents = async (): Promise<number> => {
    if (dataMode === 'firebase' && user) {
      return await seedSampleEventsToFirebase(user);
    }
    return 0;
  };

  const handleResetDemoData = () => {
    const fresh = resetDemoStore();
    setDemoStore(fresh);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <Loader2 className="w-7 h-7 animate-spin text-blue-700 dark:text-blue-400" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading CampusConnect...
        </p>
      </div>
    );
  }

  const showAuthLanding =
    (!user && !enteredDemoMode) || (Boolean(user && !user.emailVerified) && !enteredDemoMode);

  if (showAuthLanding) {
    return (
      <AuthLandingPage
        isFirebaseConfigured={isFirebaseConfigured}
        authLoading={authLoading}
        externalAuthError={authError}
        pendingVerificationUser={user && !user.emailVerified ? user : null}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSignInWithEmail={handleSignInWithEmail}
        onRegisterWithEmail={handleRegisterWithEmail}
        onSignInWithGoogle={handleSignInWithGoogle}
        onResendVerification={handleResendVerification}
        onRefreshVerification={handleRefreshVerification}
        onSignOut={handleSignOut}
        onContinueInDemoMode={handleContinueInDemoMode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        user={isVerifiedSignedInUser ? user : null}
        authLoading={authLoading}
        isFirebaseConfigured={isFirebaseConfigured}
        onSignIn={handleOpenAuthPage}
        onSignOut={handleSignOut}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Workspace Mode & Role Strip (kept cleanly below top bar) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            {dataMode === 'firebase' && user ? (
              <>
                <Cloud className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">Firebase Live Mode</strong> · Signed in as{' '}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {user.displayName || user.email}
                  </span>{' '}
                  ({isFirebaseOrganizer ? 'Organizer' : 'Student'})
                </span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-slate-900 dark:text-slate-100">Demo Mode (Sample Data)</strong> · Exploring
                  locally in browser.{' '}
                  {isFirebaseConfigured &&
                    (isVerifiedSignedInUser
                      ? 'Switch back to your Firebase account anytime.'
                      : 'Sign in or register an account for live Firestore persistence.')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isVerifiedSignedInUser && forceDemoOverride && (
              <button
                type="button"
                onClick={() => setForceDemoOverride(false)}
                className="px-2.5 py-1 font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline underline-offset-2 whitespace-nowrap"
              >
                Return to Firebase Live Mode
              </button>
            )}

            <div
              role="group"
              aria-label="Workspace role view"
              className="inline-flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-md"
            >
              <button
                type="button"
                onClick={() => handleNavigate(activeTab === 'registrations' ? 'registrations' : 'events')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'events' || activeTab === 'registrations'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Student View
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('organizer')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'organizer'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Organizer View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {authError && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/70 text-red-800 dark:text-red-300 rounded-xl p-4 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{authError}</span>
          </div>
        )}

        {activeTab === 'events' && selectedEvent ? (
          <EventDetailsPage
            key={selectedEvent.id}
            event={selectedEvent}
            dataMode={dataMode}
            existingUserRegistration={existingUserRegForSelected}
            onBack={() => setSelectedEventId(null)}
            onGoToMyRegistrations={() => handleNavigate('registrations')}
            onSubmitRegistration={handleSubmitRegistration}
            defaultEmail={user?.email ?? ''}
            defaultName={user?.displayName ?? ''}
            isSamplePreview={isSamplePreview}
            onSwitchToDemoMode={handleContinueInDemoMode}
          />
        ) : activeTab === 'events' ? (
          <EventCatalog
            events={activeEvents}
            filteredEvents={filteredEvents}
            filters={filters}
            onChangeFilters={setFilters}
            onSelectEvent={(id) => {
              setSelectedEventId(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            loading={dataMode === 'firebase' && (firebaseLoading || !hasLoadedFirebaseEvents)}
            errorMessage={dataMode === 'firebase' ? firebaseError : null}
            registeredEventIds={registeredEventIds}
            isSamplePreview={isSamplePreview}
            onSwitchToDemoMode={handleContinueInDemoMode}
          />
        ) : activeTab === 'registrations' ? (
          <MyRegistrations
            registrations={activeMyRegistrations}
            dataMode={dataMode}
            loading={dataMode === 'firebase' && firebaseLoading}
            onExploreEvents={() => handleNavigate('events')}
            onOpenEvent={(eventId) => {
              setActiveTab('events');
              setSelectedEventId(eventId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : activeTab === 'organizer' ? (
          <OrganizerDashboard
            events={dataMode === 'firebase' ? firebaseEvents : demoStore.events}
            dataMode={dataMode}
            isSignedIn={isVerifiedSignedInUser}
            isAuthorizedOrganizer={isFirebaseOrganizer}
            organizerDisplayName={user?.displayName || 'Engineering Student Council'}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onToggleCompleted={handleToggleCompleted}
            onLoadParticipants={handleLoadParticipants}
            onSeedSampleEvents={handleSeedSampleEvents}
            onResetDemoData={handleResetDemoData}
            onSwitchToDemoMode={handleContinueInDemoMode}
            missingSampleCount={missingSampleCount}
          />
        ) : (
          <SetupGuide
            isFirebaseConfigured={isFirebaseConfigured}
            isSignedIn={isVerifiedSignedInUser}
            isOrganizer={isFirebaseOrganizer}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>CampusConnect · Engineering Student Activity &amp; Event Management Portal</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleNavigate('events')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Event Catalog
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('registrations')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              My Registrations
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('guide')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              Setup &amp; Rules
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
