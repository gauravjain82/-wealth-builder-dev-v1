/**
 * Shared row-colouring vocabulary.
 *
 * Row background/border colour is how a list signals that a person has moved to
 * another list or flow (rescheduled, not interested, confirmed, …). It starts in
 * BPM but is deliberately domain-agnostic so Prospect Tracker, Associate Tracker
 * and any future list can adopt it without a rewrite.
 *
 * A rule set is just data: built-in "reserved" rules ship in `reserved.ts`, and
 * from Phase 7 the same shape is served from the backend so the business can add
 * its own. Nothing that consumes `resolveRowColors` needs to change when that
 * swap happens.
 */

/**
 * How a rule paints the row.
 *
 * - `fill`        — tints the whole row background.
 * - `border`      — outlines the whole row.
 * - `left-border` — a thick accent bar down the left edge only.
 *
 * `border` and `left-border` share the "border" channel, so at most one of them
 * applies to a row at a time (see {@link ResolvedRowColors}).
 */
export type RowColorStyle = 'fill' | 'border' | 'left-border';

/** The two independent channels a row can be painted on. */
export type RowColorChannel = 'fill' | 'border';

/**
 * One conditional colour rule.
 *
 * A rule fires when its `key` appears in the list of state keys a row reports as
 * active. Several rules can fire at once; {@link resolveRowColors} picks the
 * winner per channel by `priority`.
 */
export interface RowColorRule {
  /**
   * Stable identifier for the condition this rule paints, e.g.
   * `"bpm.guest.confirmed"`. Callers pass the keys that are true for a row.
   */
  key: string;
  /** Human-readable name, shown in the Phase 7 settings editor. */
  label: string;
  /** Colour as a 6-digit hex string including the leading `#`. */
  hex: string;
  /** How the colour is painted. */
  style: RowColorStyle;
  /**
   * Tie-break when several rules fire on the same channel. **Lower wins.**
   * Leave gaps (10, 20, 30…) so rules can be slotted in between later.
   */
  priority: number;
  /** Rules can be switched off without being deleted. */
  enabled: boolean;
  /**
   * True for built-in defaults. Reserved hexes may not be reused by
   * business-defined rules — see {@link isHexAvailable}.
   */
  reserved?: boolean;
  /** Optional note explaining when the rule fires, for the settings editor. */
  description?: string;
}

/**
 * The winning rule on each channel for one row.
 *
 * Both may be set at once — a confirmed guest who also booked an appointment
 * gets the yellow fill *and* the green outline, which is exactly what the BPM
 * brief asks for.
 */
export interface ResolvedRowColors {
  fill?: RowColorRule;
  border?: RowColorRule;
}
