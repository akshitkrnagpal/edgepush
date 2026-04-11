import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <main className="flex-1 font-sans">
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

      <article className="mx-auto max-w-[780px] px-6 py-16">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="text-accent">─&nbsp;</span> legal / terms
        </div>
        <h1 className="mb-2 font-mono text-[40px] font-extrabold leading-[1.02] tracking-[-0.03em] text-text">
          terms of service.
        </h1>
        <p className="mb-14 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
          last updated: 2026-04-10
        </p>

        <Section title="acceptance">
          By using the hosted edgepush service, you agree to these terms. If
          you do not agree, do not use the service.
        </Section>

        <Section title="the service">
          edgepush is an open source push notification relay. The hosted
          version is provided free of charge as a convenience for users who do
          not want to self-host. No SLA is offered.
        </Section>

        <Section title="your responsibilities">
          <ul className="list-none space-y-3">
            <Bullet>
              You are responsible for keeping your account credentials secure.
            </Bullet>
            <Bullet>
              You must not send spam, phishing, or any unsolicited or deceptive
              messages to end users.
            </Bullet>
            <Bullet>
              You must comply with Apple APNs and Google FCM terms of service
              when sending messages through their networks.
            </Bullet>
            <Bullet>
              You must not attempt to reverse-engineer, abuse, or overload the
              service.
            </Bullet>
            <Bullet>
              You are responsible for obtaining consent from end users before
              sending them push notifications where required by law.
            </Bullet>
          </ul>
        </Section>

        <Section title="open source">
          edgepush is MIT licensed. You may self-host, modify, and redistribute
          the code. The license and contribution rules are in the GitHub
          repository.
        </Section>

        <Section title="warranty disclaimer">
          edgepush is provided &quot;as is&quot; without warranty of any kind.
          We do not warrant that the service will be uninterrupted, error-free,
          or secure. You use the service at your own risk.
        </Section>

        <Section title="limitation of liability">
          To the maximum extent permitted by law, edgepush and its authors
          shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the service. This
          includes but is not limited to lost messages, lost data, and lost
          revenue.
        </Section>

        <Section title="termination">
          We may suspend or terminate your access at any time for any reason
          including, without limitation, abuse, spam, or violation of these
          terms.
        </Section>

        <Section title="changes">
          We may update these terms from time to time. Continued use of the
          service after changes constitutes acceptance of the new terms.
        </Section>

        <Section title="contact">
          Questions? Email{" "}
          <a
            href="mailto:contact@edgepush.dev"
            className="text-text underline decoration-accent underline-offset-4 hover:text-accent"
          >
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="text-accent">● </span>
      {children}
    </li>
  );
}
