import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

const SITE_URL = "https://edgepush.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "edgepush. Open source push notifications at the edge",
    template: "%s, edgepush",
  },
  description:
    "Open source push notifications for iOS and Android. One API on Cloudflare Workers, BYO APNs + FCM credentials, encrypted at rest. Free hosted tier or self-host on your own account.",
  keywords: [
    "push notifications",
    "APNs",
    "FCM",
    "Expo Push alternative",
    "open source",
    "Cloudflare Workers",
    "iOS",
    "Android",
    "edge computing",
  ],
  authors: [
    { name: "Akshit Kr Nagpal", url: "https://github.com/akshitkrnagpal" },
  ],
  creator: "Akshit Kr Nagpal",
  publisher: "edgepush",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "edgepush",
    title: "edgepush. Open source push notifications at the edge",
    description:
      "One API for iOS + Android push. BYO credentials, encrypted in D1, deployed on Cloudflare Workers.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "edgepush. Open source push notifications at the edge",
    description:
      "One API for iOS + Android push. BYO credentials, encrypted in D1, deployed on Cloudflare Workers.",
    creator: "@akshit_io",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "edgepush",
  description:
    "Open source alternative to Expo Push Notification Service, built on Cloudflare Workers.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://www.gnu.org/licenses/agpl-3.0.html",
  author: {
    "@type": "Person",
    name: "Akshit Kr Nagpal",
    url: "https://github.com/akshitkrnagpal",
  },
  softwareVersion: "1.0.0",
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        {children}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Script
          id="posthog"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageviewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('phc_u5hnXDiUxZvi6frBkniMJhZyuR3u7yfjzziV7RBD7Zf9',{api_host:'https://us.i.posthog.com',person_profiles:'identified_only'})`,
          }}
        />
      </body>
    </html>
  );
}
