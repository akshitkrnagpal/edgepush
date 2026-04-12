import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free hosted tier (10K events/mo), Pro at $29/mo (50K events/mo), or self-host with unlimited everything. No seat fees, no per-message pricing.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
