/**
 * Single source of truth for the API server's displayed version.
 * Bump this in sync with whatever release of the server + dashboard
 * you're shipping. Read by the root `GET /` JSON response.
 *
 * Not the same as the SDK or CLI npm versions, which live in their
 * respective package.json files.
 */

export const SERVER_VERSION = "0.2";
