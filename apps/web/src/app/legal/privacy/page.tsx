import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 font-sans">
      <LegalNav />

      <article className="mx-auto max-w-[780px] px-6 py-16">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> legal / privacy
        </div>
        <h1 className="mb-2 font-mono text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-text">
          privacy policy.
        </h1>
        <p className="mb-14 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          last updated: 2026-04-10
        </p>

        <Section title="overview">
          edgepush is an open source push notification service. This policy
          explains what data we collect when you use the hosted version, how it
          is stored, and your rights regarding that data. If you self-host
          edgepush, this policy does not apply, your data stays in your own
          Cloudflare account.
        </Section>

        <Section title="what we collect">
          <ul className="list-none space-y-3">
            <LegalBullet label="account information">
              name and GitHub profile details you authorize during sign in. We
              do not store passwords.
            </LegalBullet>
            <LegalBullet label="app metadata">
              names, package identifiers, and creation timestamps for the apps
              you register.
            </LegalBullet>
            <LegalBullet label="push credentials">
              APNs .p8 keys and FCM service account JSONs you upload. Encrypted
              at rest with AES-GCM using a key we never expose via the API.
            </LegalBullet>
            <LegalBullet label="push message metadata">
              device tokens, titles, bodies, timestamps, and delivery status.
              Retained for 30 days.
            </LegalBullet>
            <LegalBullet label="api key hashes">
              we store a SHA-256 hash of each API key, never the raw value. Raw
              keys are shown once at creation and cannot be recovered.
            </LegalBullet>
          </ul>
        </Section>

        <Section title="what we do not collect">
          <ul className="list-none space-y-3">
            <LegalBullet>contents of end-user devices or app data</LegalBullet>
            <LegalBullet>advertising identifiers</LegalBullet>
            <LegalBullet>
              behavioral analytics beyond what is necessary to operate the
              service
            </LegalBullet>
          </ul>
        </Section>

        <Section title="how data is stored">
          All data is stored on Cloudflare infrastructure (D1, KV, Queues, R2).
          Credentials are encrypted before they are written to D1. Push message
          metadata is kept for 30 days, then automatically deleted.
        </Section>

        <Section title="third parties">
          edgepush forwards push messages to Apple Push Notification Service
          (APNs) and Firebase Cloud Messaging (FCM) using the credentials you
          supply. Apple and Google are independent data controllers for their
          own services.
        </Section>

        <Section title="your rights">
          You can delete your account and all associated data at any time from
          the dashboard. You can request an export of your data by emailing{" "}
          <LegalLink href="mailto:contact@edgepush.dev">
            contact@edgepush.dev
          </LegalLink>
          . If you are in the EU, UK, or California, you have additional
          rights under GDPR and CCPA including access, correction, deletion,
          and portability.
        </Section>

        <Section title="changes">
          We may update this policy from time to time. Material changes will be
          announced in the dashboard and on this page.
        </Section>

        <Section title="contact">
          Questions? Email{" "}
          <LegalLink href="mailto:contact@edgepush.dev">
            contact@edgepush.dev
          </LegalLink>
          .
        </Section>
      </article>
    </main>
  );
}

function LegalNav() {
  return (
    <nav className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-rule px-6 py-5">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-mono text-[15px] font-bold text-text"
      >
        <span className="relative flex h-[22px] w-[22px] items-center justify-center border border-accent font-mono text-[11px] font-extrabold text-accent">
          ep
        </span>
        edgepush
      </Link>
      <div className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.1em]">
        <Link
          href="/sign-in"
          className="rounded-none border border-rule-strong px-4 py-2 font-semibold text-text hover:border-text"
        >
          sign_in
        </Link>
      </div>
    </nav>
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
    <section className="mb-12">
      <h2 className="mb-4 font-mono text-[18px] font-bold uppercase tracking-[0.04em] text-text">
        <span className="text-accent">├&nbsp;</span>
        {title}
      </h2>
      <div className="space-y-4 font-sans text-[15px] leading-[1.65] text-muted-strong">
        {children}
      </div>
    </section>
  );
}

function LegalBullet({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span className="text-accent">● </span>
      {label && (
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-text">
          {label}
          {": "}
        </span>
      )}
      {children}
    </li>
  );
}

function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
    >
      {children}
    </a>
  );
}
