import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapFirebaseAuthError,
  shouldAutoEnterDemoMode,
  validateRegisterForm,
  validateSignInForm,
} from './authValidation';

test('validateSignInForm rejects empty and malformed credentials', () => {
  const empty = validateSignInForm('', '');
  assert.equal(empty.valid, false);
  assert.ok(empty.errors.email);
  assert.ok(empty.errors.password);

  const shortPass = validateSignInForm('aarav@college.edu', '123');
  assert.equal(shortPass.valid, false);
  assert.ok(shortPass.errors.password);

  const valid = validateSignInForm('aarav@college.edu', 'campus2026');
  assert.equal(valid.valid, true);
});

test('validateRegisterForm enforces name, email, password length, and confirmation match', () => {
  const mismatch = validateRegisterForm({
    fullName: 'Aarav Sharma',
    email: 'aarav@college.edu',
    password: 'password1',
    confirmPassword: 'password2',
  });
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.errors.confirmPassword ?? '', /do not match/i);

  const shortName = validateRegisterForm({
    fullName: 'A',
    email: 'invalid-email',
    password: '123',
    confirmPassword: '123',
  });
  assert.equal(shortName.valid, false);
  assert.ok(shortName.errors.fullName);
  assert.ok(shortName.errors.email);
  assert.ok(shortName.errors.password);

  const ok = validateRegisterForm({
    fullName: 'Aarav Sharma',
    email: 'aarav@college.edu',
    password: 'campusPassword9',
    confirmPassword: 'campusPassword9',
  });
  assert.equal(ok.valid, true);
});

test('mapFirebaseAuthError identifies disabled Email/Password provider and credential errors', () => {
  const disabled = mapFirebaseAuthError({
    code: 'auth/operation-not-allowed',
    message: 'Firebase: Error (auth/operation-not-allowed).',
  });
  assert.equal(disabled.isProviderDisabled, true);
  assert.match(disabled.message, /Sign-in method/i);

  const duplicate = mapFirebaseAuthError({
    code: 'auth/email-already-in-use',
    message: 'Firebase: Error (auth/email-already-in-use).',
  });
  assert.equal(duplicate.isProviderDisabled, false);
  assert.match(duplicate.message, /already exists/i);

  const badCreds = mapFirebaseAuthError({
    code: 'auth/invalid-credential',
    message: 'Firebase: Error (auth/invalid-credential).',
  });
  assert.match(badCreds.message, /Incorrect email or password/i);
});

test('shouldAutoEnterDemoMode checks autostart and demo query parameters', () => {
  assert.equal(shouldAutoEnterDemoMode(''), false);
  assert.equal(shouldAutoEnterDemoMode('?tab=events'), false);
  assert.equal(shouldAutoEnterDemoMode('?autostart=1'), true);
  assert.equal(shouldAutoEnterDemoMode('?demo=1'), true);
});
