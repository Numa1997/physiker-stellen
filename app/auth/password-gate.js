// The login gate. Nothing is fetched until this resolves.
//
// This is real access control, not a JavaScript prompt. The page cannot
// "let you past" on its own: without a session the API itself returns no
// rows, so reading the source or calling the endpoint directly gets you
// nothing. Sign-ups are disabled in the Supabase dashboard, so the single
// user is the only way in.

import { supabase, currentSession } from '../data/supabase-client.js';

/**
 * Renders the login form into `mount` and resolves once a session exists.
 * Returns immediately when this browser already holds a valid session.
 */
export async function requireSession(mount) {
  const existing = await currentSession();
  if (existing) return existing;

  return new Promise((resolve) => {
    mount.innerHTML = '';
    mount.append(buildForm(resolve));
  });
}

function buildForm(resolve) {
  const wrap = document.createElement('div');
  wrap.className = 'gate';
  wrap.innerHTML = `
    <form class="gate__card" novalidate>
      <p class="gate__kicker">Job dossier · Numa · BSc Physics, Leipzig</p>
      <h1 class="gate__title">Physiker Stellen</h1>
      <label class="gate__label" for="gate-email">Email</label>
      <input class="gate__input" id="gate-email" type="email"
             autocomplete="username" required>
      <label class="gate__label" for="gate-pw">Password</label>
      <input class="gate__input" id="gate-pw" type="password"
             autocomplete="current-password" required>
      <button class="gate__btn" type="submit">Sign in</button>
      <p class="gate__error" role="alert" hidden></p>
    </form>`;

  const form = wrap.querySelector('form');
  const email = wrap.querySelector('#gate-email');
  const pw = wrap.querySelector('#gate-pw');
  const btn = wrap.querySelector('.gate__btn');
  const err = wrap.querySelector('.gate__error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value.trim(),
      password: pw.value,
    });

    if (error) {
      // Deliberately vague: never reveal whether the address exists.
      err.textContent = 'Wrong email or password.';
      err.hidden = false;
      btn.disabled = false;
      btn.textContent = 'Sign in';
      pw.select();
      return;
    }
    resolve(data.session);
  });

  queueMicrotask(() => email.focus());
  return wrap;
}

/** Signs out and reloads, dropping every trace of the session. */
export async function signOut() {
  await supabase.auth.signOut();
  location.reload();
}
