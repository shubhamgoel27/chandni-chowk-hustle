// ---------------------------------------------------------------------------
// Global Leaderboard – Supabase REST API (zero dependencies)
// ---------------------------------------------------------------------------
// Table schema (run once in Supabase SQL Editor):
//
//   create table leaderboard (
//     id bigint generated always as identity primary key,
//     name text not null check (char_length(name) between 1 and 20),
//     score int not null check (score >= 0),
//     created_at timestamptz default now()
//   );
//
//   -- Public read, anon insert, no update/delete
//   alter table leaderboard enable row level security;
//   create policy "Anyone can read"  on leaderboard for select using (true);
//   create policy "Anyone can insert" on leaderboard for insert with check (true);
//
//   -- Index for fast top-N queries
//   create index idx_leaderboard_score on leaderboard (score desc);
// ---------------------------------------------------------------------------

const Leaderboard = (() => {
  // ── Config ────────────────────────────────────────────────────────────
  // TODO: Replace with your Supabase project values
  const SUPABASE_URL = 'https://<YOUR_PROJECT>.supabase.co';
  const SUPABASE_ANON_KEY = '<YOUR_ANON_KEY>';
  const TABLE = 'leaderboard';
  const TOP_N = 10;
  const TIMEOUT_MS = 4000;

  const LOCAL_KEY = 'cch_scores_v2';

  const isConfigured = () =>
    !SUPABASE_URL.includes('<YOUR_PROJECT>') &&
    !SUPABASE_ANON_KEY.includes('<YOUR_ANON_KEY>');

  // ── Helpers ───────────────────────────────────────────────────────────

  function headers() {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    };
  }

  function withTimeout(promise) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      ),
    ]);
  }

  // ── Local storage (unchanged logic, keeps working offline) ────────────

  function getLocal() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveLocal(name, score) {
    let scores = getLocal();
    const now = new Date();
    const dup = scores.find(
      (s) =>
        s.name === name &&
        s.score === score &&
        now - new Date(s.date) < 5000
    );
    if (dup) return scores;

    scores.push({ name, score, date: now.toISOString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, TOP_N);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(scores));
    return scores;
  }

  // ── Remote (Supabase REST) ────────────────────────────────────────────

  async function fetchTop() {
    if (!isConfigured()) return null;
    try {
      const url =
        `${SUPABASE_URL}/rest/v1/${TABLE}` +
        `?select=name,score` +
        `&order=score.desc` +
        `&limit=${TOP_N}`;
      const res = await withTimeout(fetch(url, { headers: headers() }));
      if (!res.ok) throw new Error(res.statusText);
      return await res.json();
    } catch (e) {
      console.warn('[leaderboard] fetch failed:', e.message);
      return null;
    }
  }

  async function submitRemote(name, score) {
    if (!isConfigured()) return false;
    try {
      const url = `${SUPABASE_URL}/rest/v1/${TABLE}`;
      const res = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ name, score }),
        })
      );
      return res.ok;
    } catch (e) {
      console.warn('[leaderboard] submit failed:', e.message);
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    /**
     * Submit a score. Always saves locally; tries remote in background.
     * Returns the local scores immediately for instant UI update.
     */
    submit(name, score) {
      const localScores = saveLocal(name, score);
      submitRemote(name, score); // fire-and-forget
      return localScores;
    },

    /** Get local top scores (sync, instant). */
    getLocalScores() {
      return getLocal();
    },

    /** Get global top scores (async, may fail → returns null). */
    async getGlobalScores() {
      return fetchTop();
    },

    /** Whether remote backend is configured. */
    get isOnline() {
      return isConfigured();
    },
  };
})();

// Allow import in Node/test environments while keeping browser global intact
if (typeof module !== 'undefined' && module.exports) module.exports = Leaderboard;
