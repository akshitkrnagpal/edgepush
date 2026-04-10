import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-semibold mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-12">
          Last updated: April 10, 2026
        </p>

        <Section title="Acceptance">
          By using the hosted edgepush service, you agree to these terms. If
          you do not agree, do not use the service.
        </Section>

        <Section title="The service">
          edgepush is an open source push notification relay. The hosted
          version is provided free of charge as a convenience for users who
          do not want to self-host. No SLA is offered.
        </Section>

        <Section title="Your responsibilities">
          <ul>
            <li>
              You are responsible for keeping your account credentials
              secure.
            </li>
            <li>
              You must not send spam, phishing, or any unsolicited or
              deceptive messages to end users.
            </li>
            <li>
              You must comply with Apple APNs and Google FCM terms of
              service when sending messages through their networks.
            </li>
            <li>
              You must not attempt to reverse-engineer, abuse, or overload
              the service.
            </li>
            <li>
              You are responsible for obtaining consent from end users
              before sending them push notifications where required by law.
            </li>
          </ul>
        </Section>

        <Section title="Open source">
          edgepush is MIT licensed. You may self-host, modify, and
          redistribute the code. The license and contribution rules are in
          the GitHub repository.
        </Section>

        <Section title="Warranty disclaimer">
          edgepush is provided &quot;as is&quot; without warranty of any kind.
          We do not warrant that the service will be uninterrupted,
          error-free, or secure. You use the service at your own risk.
        </Section>

        <Section title="Limitation of liability">
          To the maximum extent permitted by law, edgepush and its authors
          shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the service. This
          includes but is not limited to lost messages, lost data, and lost
          revenue.
        </Section>

        <Section title="Termination">
          We may suspend or terminate your access at any time for any
          reason including, without limitation, abuse, spam, or violation
          of these terms.
        </Section>

        <Section title="Changes">
          We may update these terms from time to time. Continued use of the
          service after changes constitutes acceptance of the new terms.
        </Section>

        <Section title="Contact">
          Questions? Email{" "}
          <a href="mailto:hello@akshit.io" className="underline">
            hello@akshit.io
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
