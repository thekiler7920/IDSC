import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_EVENTS } from '../data/sampleEvents';
import { getMissingSampleEvents, resolveFirebaseCatalogState } from './catalogSync';

test('getMissingSampleEvents returns only sample events not already present by id', () => {
  const existing = [
    { id: SAMPLE_EVENTS[0].id },
    { id: SAMPLE_EVENTS[2].id },
    { id: 'custom-organizer-event-1' },
  ];

  const missing = getMissingSampleEvents(existing, SAMPLE_EVENTS);
  assert.equal(missing.length, SAMPLE_EVENTS.length - 2);
  assert.equal(
    missing.some((e) => e.id === SAMPLE_EVENTS[0].id || e.id === SAMPLE_EVENTS[2].id),
    false,
  );
  assert.equal(
    missing.some((e) => e.id === SAMPLE_EVENTS[1].id),
    true,
  );
});

test('getMissingSampleEvents returns empty array when all sample events exist', () => {
  const missing = getMissingSampleEvents(SAMPLE_EVENTS, SAMPLE_EVENTS);
  assert.equal(missing.length, 0);
});

test('resolveFirebaseCatalogState shows sample preview only when loaded without errors and empty', () => {
  const loadingState = resolveFirebaseCatalogState({
    firebaseEvents: [],
    firebaseLoading: true,
    firebaseError: null,
    sampleEvents: SAMPLE_EVENTS,
  });
  assert.equal(loadingState.isSamplePreview, false);
  assert.equal(loadingState.events.length, 0);

  const errorState = resolveFirebaseCatalogState({
    firebaseEvents: [],
    firebaseLoading: false,
    firebaseError: 'Permission denied',
    sampleEvents: SAMPLE_EVENTS,
  });
  assert.equal(errorState.isSamplePreview, false);
  assert.equal(errorState.events.length, 0);

  const emptyLoadedState = resolveFirebaseCatalogState({
    firebaseEvents: [],
    firebaseLoading: false,
    firebaseError: null,
    sampleEvents: SAMPLE_EVENTS,
  });
  assert.equal(emptyLoadedState.isSamplePreview, true);
  assert.equal(emptyLoadedState.events.length, SAMPLE_EVENTS.length);

  const populatedState = resolveFirebaseCatalogState({
    firebaseEvents: [SAMPLE_EVENTS[0]],
    firebaseLoading: false,
    firebaseError: null,
    sampleEvents: SAMPLE_EVENTS,
  });
  assert.equal(populatedState.isSamplePreview, false);
  assert.equal(populatedState.events.length, 1);
});
