import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold">
          edgepush
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-semibold mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-12">
          Last updated: April 10, 2026
        </p>

        <Section title="Overview">
          edgepush is an open source push notification service. This policy
          explains what data we collect when you use the hosted version, how
          it is stored, and your rights regarding that data. If you self-host
          edgepush, this policy does not apply - your data stays in your own
          Cloudflare account.
        </Section>

        <Section title="What we collect">
          <ul>
            <li>
              <strong>Account information:</strong> email address, name, and
              password hash (if you sign up with email), or basic profile
              details from your OAuth provider (Google, GitHub).
            </li>
            <li>
              <strong>App metadata:</strong> names, package identifiers, and
              creation timestamps for the apps you register.
            </li>
            <li>
              <strong>Push credentials:</strong> APNs .p8 keys and FCM service
              account JSONs you upload. Encrypted at rest with AES-GCM using
              a key we never expose via the API.
            </li>
            <li>
              <strong>Push message metadata:</strong> device tokens, titles,
              bodies, timestamps, and delivery status. Retained for 30 days.
            </li>
            <li>
              <strong>API key hashes:</strong> we store a SHA-256 hash of each
              API key, never the raw value. Raw keys are shown once at
              creation and cannot be recovered.
            </li>
          </ul>
        </Section>

        <Section title="What we do not collect">
          <ul>
            <li>Contents of end-user devices or app data.</li>
            <li>Advertising identifiers.</li>
            <li>
              Behavioral analytics beyond what is necessary to operate the
              service.
            </li>
          </ul>
        </Section>

        <Section title="How data is stored">
          All data is stored on Cloudflare infrastructure (D1, KV, Queues,
          R2). Credentials are encrypted before they are written to D1.
          Push message metadata is kept for 30 days, then automatically
          deleted.
        </Section>

        <Section title="Third parties">
          edgepush forwards push messages to Apple Push Notification Service
          (APNs) and Firebase Cloud Messaging (FCM) using the credentials
          you supply. Apple and Google are independent data controllers for
          their own services.
        </Section>

        <Section title="Your rights">
          You can delete your account and all associated data at any time
          from the dashboard. You can request an export of your data by
          emailing contact@edgepush.dev. If you are in the EU, UK, or California,
          you have additional rights under GDPR and CCPA including access,
          correction, deletion, and portability.
        </Section>

        <Section title="Changes">
          We may update this policy from time to time. Material changes will
          be announced in the dashboard and on this page.
        </Section>

        <Section title="Contact">
          Questions? Email{" "}
          <a href="mailto:contact@edgepush.dev" className="underline">
            contact@edgepush.dev
          </a>
          .
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-zinc-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
