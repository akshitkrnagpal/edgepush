# Commercial license

edgepush is dual-licensed.

## The default: AGPL-3.0 (free)

The server (`apps/api`), the dashboard (`apps/web`), and the project root are
licensed under the **GNU Affero General Public License, version 3 only**. See
the [`LICENSE`](./LICENSE) file for the full text.

**What AGPL-3.0 means in practice:**

- You can run edgepush on your own infrastructure for free, forever.
- You can modify the source code for any purpose.
- You can distribute modified versions.
- You must publish the source of any modified version that you make available
  to users over a network (this is the "affero" clause, what separates AGPL
  from plain GPL).
- Any derivative work must also be licensed under AGPL-3.0.

**What AGPL-3.0 does NOT prevent:**

- It does not stop you from self-hosting edgepush to power your own apps.
- It does not stop you from reselling access to an AGPL-licensed instance -
  as long as you publish any modifications you make.

If AGPL-3.0 works for your use case, you do not need a commercial license.
Just deploy edgepush and go.

## The MIT-licensed parts

The following packages are published to npm under the **MIT license**:

- [`@edgepush/sdk`](./packages/sdk), server SDK for sending push notifications
- [`@edgepush/cli`](./packages/cli), command line interface
- [`@edgepush/shared`](./packages/shared), shared types consumed by the SDK

You can embed these in closed-source applications without AGPL obligations.
The MIT licensing is intentional and permanent, the SDK is meant to be
depended on from any project, proprietary or open.

## When do you need a commercial license?

You need a commercial license if **and only if** any of these apply:

1. You are building a commercial product that links against or bundles the
   edgepush server (`apps/api`) or dashboard (`apps/web`) source code in a way
   that would trigger AGPL's copyleft requirements, and you cannot release
   that product under AGPL-3.0.
2. Your organization has a policy that forbids AGPL-licensed dependencies in
   your production stack.
3. You want to run a hosted edgepush-as-a-service commercially without
   publishing the modifications you make to the server.

If you're just using the SDK/CLI to send push notifications from your own app
or backend, **you do not need a commercial license**. The SDK is MIT.

## Pricing and terms

Commercial licenses are negotiated per customer. There is no published
price sheet in v1.

To request a commercial license, email **hello@edgepush.dev** with:

- Your company name
- A one-paragraph description of how you plan to use edgepush
- Which specific AGPL obligation you're trying to avoid
- The scale you expect to operate at (roughly, users, events/month, apps)

I'll respond within 3 business days with next steps.

---

Copyright © 2026 Akshit Kr Nagpal. All rights reserved for the purpose of
enforcing the dual-license terms above. The AGPL-3.0 grant is otherwise
unconditional for anyone who complies with its terms.
