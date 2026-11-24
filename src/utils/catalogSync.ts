import type { CampusEvent } from '../types/campus';

export function getMissingSampleEvents(
  existingEvents: Pick<CampusEvent, 'id'>[],
  sampleEvents: CampusEvent[],
): CampusEvent[] {
  const existingIds = new Set(existingEvents.map((e) => e.id));
  return sampleEvents.filter((sample) => !existingIds.has(sample.id));
}

export interface FirebaseCatalogResolution {
  events: CampusEvent[];
  isSamplePreview: boolean;
}

export function resolveFirebaseCatalogState(params: {
  firebaseEvents: CampusEvent[];
  firebaseLoading: boolean;
  firebaseError: string | null;
  sampleEvents: CampusEvent[];
}): FirebaseCatalogResolution {
  const { firebaseEvents, firebaseLoading, firebaseError, sampleEvents } = params;

  if (!firebaseLoading && !firebaseError && firebaseEvents.length === 0) {
    return {
      events: sampleEvents,
      isSamplePreview: true,
    };
  }

  return {
    events: firebaseEvents,
    isSamplePreview: false,
  };
}
