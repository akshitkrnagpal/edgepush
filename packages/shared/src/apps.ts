/**
 * An "app" is a tenant's application identity. Each app has:
 * - a bundle id (package name) used as the APNs topic / FCM identifier
 * - an API key used by the app's backend to call edgepush
 * - APNs credentials (.p8 key + key id + team id)
 * - FCM credentials (service account JSON)
 *
 * API keys are formatted as `<package_name>|<random_secret>` so they
 * self-identify in logs without needing a separate lookup.
 */

export interface App {
  id: string;
  userId: string;
  /** Display name shown in the dashboard. */
  name: string;
  /** Bundle id / package name (e.g. io.akshit.relay or com.example.app). */
  packageName: string;
  createdAt: number;
}

export interface ApnsCredentials {
  keyId: string;
  teamId: string;
  /** Bundle id (topic). Must match the app's APNs topic. */
  bundleId: string;
  /** .p8 key file content. Stored encrypted at rest. */
  privateKey: string;
  /** Whether to use the production APNs endpoint or sandbox. */
  production: boolean;
}

export interface FcmCredentials {
  projectId: string;
  /** Firebase service account JSON. Stored encrypted at rest. */
  serviceAccountJson: string;
}

export function splitApiKey(
  apiKey: string,
): { packageName: string; secret: string } | null {
  const idx = apiKey.indexOf("|");
  if (idx <= 0) return null;
  const packageName = apiKey.slice(0, idx);
  const secret = apiKey.slice(idx + 1);
  if (!packageName || !secret) return null;
  return { packageName, secret };
}
