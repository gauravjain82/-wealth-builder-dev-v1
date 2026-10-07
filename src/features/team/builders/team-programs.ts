/**
 * Team programs — the Builders and Producers pages share every screen (tracker,
 * results/activity leaderboards, Daily Six) and differ only in which associate
 * tracker flag selects their people and which leaderboard endpoints rank them.
 *
 * A person can be in both programs: the flags are independent. Paces,
 * enrollment and Daily Six submissions belong to the person, so both programs
 * use the same `/builders/` endpoints for those.
 */

/** Associate-tracker column variant used by a program's Tracker tab. */
export type TeamProgramColumnVariant = 'builders' | 'producers';

export interface TeamProgram {
  /** Singular display name, e.g. "Builder". */
  label: string;
  /** Plural display name, also the page title, e.g. "Builders". */
  pluralLabel: string;
  /** Associate tracker boolean that marks a member of this program. */
  trackerFlag: 'is_key_player' | 'is_producer';
  /** Path segment under `/api/tracker/` that serves this program's leaderboards. */
  leaderboardSegment: 'builders' | 'producers';
  columnVariant: TeamProgramColumnVariant;
  /** Persisted table layout id for the Tracker tab. */
  tableId: string;
}

export const BUILDER_PROGRAM: TeamProgram = {
  label: 'Builder',
  pluralLabel: 'Builders',
  trackerFlag: 'is_key_player',
  leaderboardSegment: 'builders',
  columnVariant: 'builders',
  tableId: 'builders-tracker',
};

export const PRODUCER_PROGRAM: TeamProgram = {
  label: 'Producer',
  pluralLabel: 'Producers',
  trackerFlag: 'is_producer',
  leaderboardSegment: 'producers',
  columnVariant: 'producers',
  tableId: 'producers-tracker',
};
