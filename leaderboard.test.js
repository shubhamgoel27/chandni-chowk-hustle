import { describe, it, expect, beforeEach, vi } from 'vitest';

// jsdom provides localStorage and fetch globals
// We load the module fresh per-suite via dynamic import to reset IIFE state,
// but since the IIFE captures config at load time, we just require it once.
const Leaderboard = require('./leaderboard.js');

const LOCAL_KEY = 'cch_scores_v2';

beforeEach(() => {
  localStorage.clear();
});

// ─── Local storage behaviour ────────────────────────────────────────────────

describe('Leaderboard.submit (local storage)', () => {
  it('saves a score and returns it', () => {
    const scores = Leaderboard.submit('Raju', 500);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ name: 'Raju', score: 500 });
  });

  it('persists to localStorage under the correct key', () => {
    Leaderboard.submit('Priya', 300);
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY));
    expect(raw).toHaveLength(1);
    expect(raw[0].name).toBe('Priya');
  });

  it('sorts scores descending', () => {
    Leaderboard.submit('A', 100);
    Leaderboard.submit('B', 500);
    Leaderboard.submit('C', 250);
    const scores = Leaderboard.getLocalScores();
    expect(scores.map((s) => s.score)).toEqual([500, 250, 100]);
  });

  it('keeps only top 10 scores', () => {
    for (let i = 1; i <= 12; i++) {
      Leaderboard.submit(`Player${i}`, i * 100);
    }
    const scores = Leaderboard.getLocalScores();
    expect(scores).toHaveLength(10);
    // Lowest should be 300 (players 1 and 2 evicted)
    expect(scores[scores.length - 1].score).toBe(300);
  });

  it('deduplicates same name+score within 5 seconds', () => {
    Leaderboard.submit('Raju', 500);
    Leaderboard.submit('Raju', 500); // duplicate
    const scores = Leaderboard.getLocalScores();
    expect(scores).toHaveLength(1);
  });

  it('allows same name with different scores', () => {
    Leaderboard.submit('Raju', 500);
    Leaderboard.submit('Raju', 600);
    const scores = Leaderboard.getLocalScores();
    expect(scores).toHaveLength(2);
  });
});

// ─── getLocalScores ─────────────────────────────────────────────────────────

describe('Leaderboard.getLocalScores', () => {
  it('returns empty array when nothing saved', () => {
    expect(Leaderboard.getLocalScores()).toEqual([]);
  });

  it('returns saved scores', () => {
    Leaderboard.submit('A', 100);
    Leaderboard.submit('B', 200);
    expect(Leaderboard.getLocalScores()).toHaveLength(2);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(LOCAL_KEY, 'not-json!!!');
    expect(Leaderboard.getLocalScores()).toEqual([]);
  });
});

// ─── Remote / configuration ─────────────────────────────────────────────────

describe('Leaderboard.isOnline', () => {
  it('returns false when placeholder credentials are present', () => {
    // The default leaderboard.js has <YOUR_PROJECT> placeholders
    expect(Leaderboard.isOnline).toBe(false);
  });
});

describe('Leaderboard.getGlobalScores', () => {
  it('returns null when Supabase is not configured', async () => {
    const result = await Leaderboard.getGlobalScores();
    expect(result).toBeNull();
  });
});

describe('Leaderboard.submit (remote path when unconfigured)', () => {
  it('does not call fetch when Supabase is not configured', () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    Leaderboard.submit('Test', 100);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('still saves locally even when remote is unconfigured', () => {
    Leaderboard.submit('Offline', 999);
    const scores = Leaderboard.getLocalScores();
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ name: 'Offline', score: 999 });
  });
});

// ─── Score data shape ───────────────────────────────────────────────────────

describe('Score entry shape', () => {
  it('contains name, score, and ISO date string', () => {
    Leaderboard.submit('Raju', 500);
    const entry = Leaderboard.getLocalScores()[0];
    expect(entry).toHaveProperty('name', 'Raju');
    expect(entry).toHaveProperty('score', 500);
    expect(entry).toHaveProperty('date');
    // Verify it's a valid ISO date
    expect(new Date(entry.date).toISOString()).toBe(entry.date);
  });
});
