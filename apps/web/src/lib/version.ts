/**
 * Single source of truth for the dashboard's displayed version. Bump this
 * in sync with whatever release of the server + dashboard you're shipping.
 *
 * Used by the meta strip on /, the self-host landing at /selfhost, and the
 * footer on both. Not the same as the SDK or CLI npm versions, which live
 * in their respective package.json files.
 */

export const CURRENT_VERSION = "1.0";
