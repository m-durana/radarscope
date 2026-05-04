// ATC command verb catalogue. Verbs and short forms ported from openscope
// (MIT, Copyright (c) 2014 Jon Ross), see ATTRIBUTIONS.md.
//
// Source: openscope/documentation/commands.md and aircraft-commands.md
//
// This module is data only — no parser. A consumer (game mode, ATC sim,
// CLI) supplies its own tokenizer and binds tokens to a CommandVerb.

/** Canonical verb names. Categories follow openscope's grouping. */
export type CommandVerb =
  // Departure
  | 'clearedAsFiled'
  | 'climbViaSid'
  | 'takeoff'
  | 'taxi'
  | 'wait'
  // Arrival
  | 'expect'
  | 'descendViaStar'
  | 'ils'
  // Routing
  | 'hold'
  | 'exitHold'
  | 'direct'
  | 'route'
  | 'reroute'
  | 'sid'
  | 'star'
  // Basic control
  | 'altitude'
  | 'climb'
  | 'descend'
  | 'flyPresentHeading'
  | 'heading'
  | 'speed'
  // Conditional
  | 'cross'
  // Queries (read-only, scope-side)
  | 'sayAltitude'
  | 'sayAssignedAltitude'
  | 'sayHeading'
  | 'sayAssignedHeading'
  | 'sayIndicatedAirspeed'
  | 'sayAssignedSpeed'
  // Misc / system
  | 'squawk'
  | 'airport'
  | 'pause'
  | 'timewarp'
  | 'tutorial';

/** All accepted spellings/abbreviations for a verb. First entry is the
 *  canonical long form; remaining are accepted short forms. */
export const VERB_ALIASES: Record<CommandVerb, readonly string[]> = {
  clearedAsFiled: ['cleared as filed', 'caf'],
  climbViaSid: ['climb via sid', 'cvs'],
  takeoff: ['takeoff', 'to', 'cto', '/'],
  taxi: ['taxi'],
  wait: ['wait', 'w'],

  expect: ['expect', 'e'],
  descendViaStar: ['descend via star', 'dvs'],
  ils: ['ils', 'i', '*'],

  hold: ['hold'],
  exitHold: ['exithold', 'xh', 'cancelhold', 'continue', 'nohold'],
  direct: ['direct', 'pd', 'dct'],
  route: ['route'],
  reroute: ['reroute', 'rr'],
  sid: ['sid'],
  star: ['star'],

  altitude: ['altitude', 'a'],
  climb: ['climb', 'c'],
  descend: ['descend', 'd'],
  flyPresentHeading: ['fly present heading', 'fph'],
  heading: ['heading', 'turn', 'h', 't', 'fh'],
  speed: ['speed', 'slow', 'sp', '+', '-'],

  cross: ['cross', 'cr', 'x'],

  sayAltitude: ['sa'],
  sayAssignedAltitude: ['saa'],
  sayHeading: ['sh'],
  sayAssignedHeading: ['sah'],
  sayIndicatedAirspeed: ['si'],
  sayAssignedSpeed: ['sas'],

  squawk: ['squawk', 'sq'],
  airport: ['airport'],
  pause: ['pause'],
  timewarp: ['timewarp', 'tw'],
  tutorial: ['tutorial'],
};

/** Direction modifier on heading commands ('l' / 'r'). When omitted the
 *  shortest turn is taken. */
export type TurnDirection = 'left' | 'right';

/** Modifier for climb/descend ('expedite' / 'ex'). */
export const EXPEDITE_TOKENS = ['expedite', 'ex'] as const;

/** Build a flat lookup table: token → canonical verb. Tokens are
 *  case-insensitive — callers should lowercase before lookup. */
export function buildVerbLookup(): Map<string, CommandVerb> {
  const m = new Map<string, CommandVerb>();
  for (const [verb, aliases] of Object.entries(VERB_ALIASES) as [CommandVerb, readonly string[]][]) {
    for (const a of aliases) m.set(a.toLowerCase(), verb);
  }
  return m;
}

/** Notes on argument shapes — kept here as documentation, not enforced.
 *  - altitude/climb/descend: hundreds of feet ("30" → 3,000 ft)
 *  - heading: 3-digit magnetic, optional l/r prefix
 *  - speed: KIAS, optional +/- to nudge from current
 *  - cross: <fix> a<altitudeHundreds>|s<speedKias>
 *  - squawk: 4 octal digits (each 0–7)
 *  - timewarp: 0 = pause, 1/2/5/50 = playback rate
 */
