# Creato3 Project Deep Dive

## Important Note About This Repository Snapshot

This document explains the full Creato3 project, but one thing needs to be said clearly up front:

- The current `creato3/` folder in this checkout contains compiled artifacts, deployment helpers, and cache files.
- The original Solidity source files under `creato3/src/` and Foundry tests under `creato3/test/` are referenced by the repo docs, but they are not present in this snapshot.
- Because of that, the contract-level details below are reconstructed from:
  - compiled ABIs and bytecode artifacts in `creato3/out/`
  - Solidity cache metadata in `creato3/cache/solidity-files-cache.json`
  - deployment docs in `creato3/DEPLOY_PUBLIC.md`
  - frontend integration code in `creato3-frontend/`
  - the hackathon build guide in `creato3-frontend/src/content/creato3_full_hackathon_guide.html`

So this write-up is detailed and grounded, but wherever the original source is missing, I am being intentionally honest about what is direct evidence and what is inferred from artifacts and integration code.

## 1. What Creato3 Is

Creato3 is a creator monetization platform built around one simple business promise:

- creators publish subscription tiers
- fans subscribe on-chain
- creators keep 100% of subscription revenue
- AI helps creators choose pricing and packaging

The project is positioned as an alternative to platforms like Patreon or Substack, but with zero platform-fee treasury logic and a more direct creator-to-fan payment path.

In plain words, Creato3 is trying to make a blockchain membership platform feel like a normal consumer app instead of a protocol demo.

## 2. Core Product Idea

The product solves a familiar creator problem:

- centralized platforms take meaningful platform fees
- creators do not fully control identity, access, or monetization rails
- fans face onboarding friction when blockchain is introduced badly

Creato3's answer is:

- store creator identity and tier configuration on-chain
- let fans pay creators directly through a subscription contract
- route funds into a treasury contract that does not skim platform fees
- reduce blockchain friction using Initia-native UX tools

That last point is where Initia becomes more than just "the chain this app was deployed to." Initia is a major part of why the UX is workable.

## 3. The High-Level Architecture

Creato3 is really a multi-layer system, not just a set of contracts.

| Layer | What it does | Main evidence in repo |
| --- | --- | --- |
| Product/UI layer | creator dashboard, subscription flow, discover pages, architecture story, hackathon guide | `creato3-frontend/src/app/` |
| Initia UX layer | wallet connection, usernames, bridge modal, auto-sign, appchain-aware transaction flow | `@initia/interwovenkit-react`, `src/main.jsx` |
| Appchain execution layer | sends Initia `MsgCall` messages that execute EVM contracts | `src/utils/msgCall.js` |
| Smart contract layer | creator registration, tier logic, subscriptions, treasury accounting | `creato3/out/`, `creato3/cache/solidity-files-cache.json` |
| Sponsor/bootstrap layer | funds first-time appchain users so they can transact | `src/utils/accountBootstrap.js`, `src/api/accountBootstrap.js`, `api/_lib/bootstrap.js`, `dev/bootstrapAccountPlugin.js` |
| AI layer | pricing suggestions, revenue comparison, content strategy | `src/api/creatorAI.js` |
| Deployment layer | local appchain, public Initia MiniEVM deployment, Vercel frontend deploy | root `README.md`, `creato3/DEPLOY_PUBLIC.md`, `creato3-frontend/README.md`, `vercel.json` |

## 4. Monorepo Structure

At a practical level, the project is split like this:

- `my-initia-project/creato3`
  Contract build output, deployment script, cache, public deployment instructions.
- `my-initia-project/creato3-frontend`
  The actual React application that users interact with.
- `my-initia-project/.initia`
  Submission and local chain config files.
- `my-initia-project/initia`
  A local checkout of the Initia codebase.
- `my-initia-project/minievm`
  A local checkout of the MiniEVM codebase.

This tells us something important about how the team worked: they were not only building an app, they were working close to the Initia/MiniEVM stack itself and validating against the local appchain environment.

## 5. How the Project Is Built, Step by Step

The hackathon guide in the frontend content folder gives a very clear intended build sequence.

### Phase 1: Bring up the local appchain

The project starts with a local Initia appchain named `creato3-1`.

The guide expects:

- the rollup to be producing blocks
- the executor bot to be running
- the relayer to be healthy
- a `gas-station` account to exist and hold funds

This means Creato3 was designed first as a real appchain app, not only as a frontend that later got pointed at a random public chain.

### Phase 2: Build the smart contracts

The contract design is intentionally simple and split by responsibility:

- `CreatorProfile`
- `SubscriptionManager`
- `CreatorTreasury`

The guide explicitly describes this as a single-responsibility architecture:

- one contract for identity and tiers
- one contract for subscription lifecycle
- one contract for custody/accounting and zero-fee withdrawals

This is a good design choice because it keeps each contract easy to reason about and easier to test.

### Phase 3: Test the contracts with Foundry

From the artifact metadata and test artifact ABIs, the contract system was built as a Foundry project.

Evidence:

- contract sources were expected under `creato3/src`
- tests were expected under `creato3/test`
- cache metadata shows `paths.sources = "src"` and `paths.tests = "test"`
- test artifact names show 15 custom test cases

The cache/build metadata also shows:

- Solidity compiler `0.8.33`
- contract source version requirement `^0.8.20`
- `evmVersion = "prague"`
- optimizer disabled in the saved build profile

That last point matters: this snapshot looks hackathon-friendly and correctness-focused, not gas-optimized for a fully hardened production release.

### Phase 4: Build the frontend

The frontend stack is:

- React 19
- Vite
- React Router
- TanStack Query
- ethers v6
- viem
- wagmi
- Framer Motion
- TailwindCSS
- `@initia/interwovenkit-react`

This is a modern frontend stack, but the most important part is that the app is not using a plain MetaMask-style EVM flow. It is built around Initia's wallet and chain context.

### Phase 5: Add AI features

The AI layer is off-chain by design.

That is explicitly the right architectural decision here:

- the blockchain stores state and value movement
- AI generates advice and analytics
- AI is not used for consensus-critical logic

Current AI capabilities in code:

- smart pricing suggestions
- revenue comparisons
- content strategy ideas

The current implementation supports:

- `local` mode
- `mock` mode
- `lmstudio` mode
- Claude-powered mode through `/api/claude`

This is actually a good product decision. Putting AI fully off-chain keeps the chain deterministic and makes iteration much faster.

### Phase 6: Deploy locally, then optionally to public Initia infrastructure

There are two clear deployment modes in the repo:

- local chain deployment on `creato3-1`
- public MiniEVM deployment through `creato3/scripts/deploy_creato_public.sh`

For Vercel:

- only the frontend is deployed
- contracts must already be live on the target chain
- all URLs and addresses must point to the same chain
- SPA rewrites are handled by `creato3-frontend/vercel.json`

### Current documented network profiles in the repo

The repo currently shows three deployment contexts:

- local appchain development on `creato3-1`
- public frontend examples wired to `evm-1`
- a public deployment guide example using `minievm-2`

This is not necessarily a contradiction, but it does mean one operational rule must be followed very carefully:

- never mix RPCs, REST endpoints, indexers, fee denom values, and contract addresses across different chains

That is one of the most common failure modes in this kind of multi-environment appchain project.

## 6. The Smart Contract System in Detail

## 6.1 CreatorProfile

This contract is the creator identity and tier registry.

### Stored data

The compiled ABI and guide show two main structs:

- `Creator`
  - `wallet`
  - `initUsername`
  - `displayName`
  - `bio`
  - `category`
  - `active`
  - `createdAt`
- `CreatorTier`
  - `price`
  - `name`
  - `description`
  - `active`

Main storage mappings:

- `creators[address]`
- `tiers[address][uint8]`
- `tierCount[address]`

### Main functions

- `registerCreator(displayName, bio, category, initUsername)`
- `createTier(price, name, description)`
- `updateTier(tierId, price, name, description, active)`
- `getCreator(address)`
- `getTier(address, uint8)`
- `getActiveTiers(address)`
- `isRegistered(address)`

### Business rules

From revert strings, tests, and the guide:

- a creator can only register once
- an unregistered creator cannot create tiers
- `createTier` requires a price greater than zero
- `updateTier` requires a valid tier id
- `getActiveTiers` filters inactive tiers out of the public result set

### Events

- `CreatorRegistered`
- `TierCreated`
- `TierUpdated`

### What this means functionally

This contract acts as the public creator profile card for the ecosystem:

- who the creator is
- what their `.init` identity is
- what category they belong to
- which subscription tiers they currently offer

It is intentionally simple and readable. It does not try to do payment or access control itself. That responsibility is pushed to `SubscriptionManager`.

### Verified intended behaviors from tests

The test artifact names show these behaviors were explicitly tested:

- `testRegisterSucceedsWithCorrectData`
- `testDuplicateRegisterReverts`
- `testCreateTierStoresCorrectly`
- `testGetActiveTiersReturnsOnlyActive`
- `testUnregisteredCreatorCannotCreateTier`
- `testUpdateTierUpdatesData`

That is a healthy, focused contract test surface for an MVP.

## 6.2 SubscriptionManager

This contract is the billing and access layer.

### Stored data

Main struct:

- `Subscription`
  - `subscriber`
  - `creator`
  - `tierId`
  - `startTime`
  - `expiry`
  - `active`

Main state:

- `subscriptions[subscriber][creator]`
- immutable references to:
  - `profileContract`
  - `treasuryContract`

### Main functions

- `subscribe(address creator, uint8 tierId)` payable
- `renewSubscription(address creator)` payable
- `cancelSubscription(address creator)`
- `checkAccess(address subscriber, address creator, uint8 tierId)` view
- `getSubscription(address subscriber, address creator)` view

### Core billing rules

The contract behavior visible from artifacts and disassembly is:

- subscription requires the creator to be registered
- subscription requires the selected tier to be active
- payment must exactly match the tier price
- a new subscription stores:
  - subscriber
  - creator
  - tier id
  - start time
  - expiry = current time + 30 days
  - active = true
- after storing the subscription, it forwards the payment to treasury

### Renewal logic

The renewal logic is more thoughtful than a basic MVP:

- if the subscription is still active, renewal extends from the existing expiry
- if the subscription has already expired, renewal restarts from current time
- renewal still enforces exact payment
- renewal still forwards the payment to treasury

This avoids punishing users for renewing early.

### Cancellation logic

- cancellation sets `active = false`
- the guide explicitly says no refund is issued

This is a clear product policy decision rather than a technical limitation.

### Access logic

The guide and test surface indicate access is granted when:

- the subscription is active
- the stored tier is sufficient for the requested tier
- the expiry is in the future

This is useful because it allows higher tiers to imply access to lower-tier content.

### Events

- `Subscribed`
- `Renewed`
- `Cancelled`

### Verified intended behaviors from tests

The subscription test artifact names show:

- `testSubscribeSuccess`
- `testWrongPaymentReverts`
- `testCheckAccessTrue`
- `testExpiredReturnsFalse`
- `testRenewExtendsExpiry`
- `testCancelSetsActiveFalse`

That gives good confidence that the most important subscription lifecycle rules were covered.

## 6.3 CreatorTreasury

This contract is the funds accounting layer.

### Stored data

- `owner`
- `authorizedCaller`
- `balances[address]`
- `totalEarned[address]`

### Main functions

- constructor takes an owner
- `setAuthorizedCaller(address)`
- `receivePayment(address creator)` payable
- `withdraw()`
- `getBalance(address)`
- `getTotalEarned(address)`

### Core treasury rules

The treasury enforces strong separation of concerns:

- only one authorized caller can send creator payments into treasury
- that caller is expected to be the deployed `SubscriptionManager`
- the owner sets the authorized caller once after deployment

The bytecode and revert strings show these exact safety checks:

- only owner can set the authorized caller
- the authorized caller can only be set once
- only the authorized caller can call `receivePayment`
- `withdraw()` requires a positive balance
- failed withdrawals revert

### Zero-fee model

This is one of the most important business features in the whole project.

`withdraw()`:

- reads the creator's full balance
- sets the stored balance to zero
- transfers the full amount to the creator
- emits a withdrawal event

There is no platform percentage deduction in treasury.

That means "zero platform fee" is not just a marketing sentence in the UI. It is encoded in the money-handling contract design.

### Events

- `AuthorizedCallerSet`
- `PaymentReceived`
- `Withdrawal`

### Verified intended behaviors from tests

The treasury test artifact names show:

- `testReceivePaymentIncrementsBalance`
- `testUnauthorizedCallerReverts`
- `testWithdrawSendsFullAmountZeroFee`

That last test is especially important because it verifies the main business claim.

## 7. End-to-End User Flows

## 7.1 Creator onboarding

1. The creator connects through Initia wallet tooling.
2. The frontend resolves the Initia address and EVM address.
3. The creator chooses or pastes a `.init` username.
4. The frontend ABI-encodes `registerCreator(...)`.
5. `buildMsgCall()` wraps that calldata into `/minievm.evm.v1.MsgCall`.
6. `requestTxSync()` sends the transaction to the Initia appchain.
7. The profile becomes readable through `getCreator()`.

## 7.2 Launching a subscription tier

1. The creator opens the Launch flow.
2. AI can suggest pricing.
3. The creator either:
   - creates the first tier with `createTier`, or
   - updates an existing tier with `updateTier`
4. The tier becomes visible through `getActiveTiers`.

## 7.3 Fan subscription flow

1. A fan opens the creator page.
2. The frontend reads creator data from `CreatorProfile`.
3. The fan bridges funds if needed.
4. The app preflights account readiness and fee balance.
5. The fan subscribes using `subscribe(creator, tierId)` with exact payment.
6. `SubscriptionManager` records the subscription and forwards the value to treasury.
7. Access checks are then determined via `checkAccess`.

## 7.4 Creator withdrawal flow

1. Subscription value accumulates in `CreatorTreasury`.
2. The creator triggers `withdraw()`.
3. Full creator balance is transferred out.
4. Stored balance becomes zero.
5. `totalEarned` remains as an accounting/history view.

## 8. How Initia Helped Build This

This is the most important architectural section.

Creato3 is not just "deployed on Initia." It is designed around Initia-specific advantages.

## 8.1 MiniEVM let the team use Solidity without giving up appchain UX

Because the chain environment is MiniEVM-based:

- the contracts could be written in Solidity
- the team could use Foundry
- the frontend could use ethers/ABI encoding
- the deployment process could use `cast` and `forge`

If the team had to start in another VM model, much more of the stack would have needed to be rewritten.

## 8.2 InterwovenKit gave the app a polished chain-aware UX

InterwovenKit is deeply integrated into the frontend:

- wallet connection
- Initia address resolution
- EVM address access
- `.init` username support
- bridge modal
- auto-sign support
- chain-aware transaction submission

This is a huge part of why the app feels productized instead of hacky.

## 8.3 MsgCall gave the project a clean bridge between Initia wallet UX and EVM logic

One of the smartest design choices in the repo is the use of `buildMsgCall()`.

Instead of treating the app like a normal browser EVM dapp, the frontend:

- ABI-encodes EVM calldata
- wraps it in `/minievm.evm.v1.MsgCall`
- sends it through Initia transaction infrastructure

This is important because the app keeps:

- EVM contracts for business logic
- Initia-native wallet and chain UX for execution

That is exactly the kind of hybrid model Initia is good at.

## 8.4 Bridge support reduced onboarding pain

The Interwoven Bridge integration matters because fans often have assets on Initia L1 but not on the appchain.

Without bridge support, the subscription journey would be:

- connect wallet
- discover missing funds
- manually bridge
- wait
- return and try again

With Initia bridge integration, that becomes a guided product flow.

## 8.5 `.init` usernames made identity human-readable

The product is for creators, so identity matters a lot.

Initia usernames improve:

- creator branding
- trust
- discoverability
- UX clarity

Instead of showing only `0x...`, the app can show `priya.init` or another primary Initia name.

For a creator product, that is not a tiny UI detail. It changes how human the app feels.

## 8.6 Auto-signing made repeat interactions smoother

Subscriptions and creator actions are not one-off transactions. They are repeated product actions.

Auto-signing helps turn this from:

- click
- popup
- approve
- wait
- repeat

into something closer to a normal product experience.

That is a major UX advantage for subscription-style apps.

## 8.7 Sponsored bootstrap solved the "new account cannot transact yet" problem

One of the most practical Initia/appchain problems is that a brand-new user may not even exist on the appchain yet.

Creato3 addresses this with a bootstrap layer:

- detect missing appchain account
- ask a sponsor endpoint to seed the account
- retry the original user action

This is exactly the kind of operational problem real appchains face, and the repo handles it thoughtfully.

## 9. What the Frontend Is Actually Doing

The frontend is more than marketing pages.

It contains real product flows:

- landing page
- discover page
- architecture page
- create profile page
- launch subscription page
- creator public page
- subscribe page
- my subscriptions page
- profile page
- hackathon build guide page

Technically, the frontend does four different jobs:

### A. Read on-chain state

Using `viem` public client:

- creator profile lookup
- tier lookup
- subscription lookup
- log scanning for subscriber count
- EVM balance checks

### B. Write on-chain state

Using:

- `ethers.Interface` for calldata encoding
- `buildMsgCall()` for Initia message shaping
- `requestTxSync()` for appchain transaction submission

### C. Smooth onboarding

Using:

- bridge modal
- wallet connect
- username resolution
- account bootstrap
- deployment error screens for missing env configuration

### D. Add product value off-chain

Using:

- AI pricing and strategy tools
- local content previews
- local storage of creator launch config

## 10. Important Product Reality: Not Everything Is On-Chain

This project makes a smart separation between on-chain and off-chain responsibility.

On-chain:

- creator identity
- tier pricing
- subscription records
- treasury balances
- access logic

Off-chain:

- AI pricing and strategy
- content previews
- some launch config persistence
- parts of the creator content experience

A key implementation detail from the current frontend:

- `subscriptionStore.js` stores launch config in `localStorage`
- `contentStore.js` stores creator content in `localStorage`

That means the current version is best understood as:

- on-chain membership and payment logic
- off-chain demo-friendly content storage/UI layer

This is a reasonable hackathon architecture, but it is also one of the clearest areas for future production work.

## 11. Challenges Faced or Implied by the Repo

## 11.1 First-time account bootstrap

This is a real appchain problem, and the repo spends meaningful code on it.

Why it is hard:

- a wallet can exist conceptually
- but still not exist on the target appchain
- and therefore fail on sequence lookup or fee handling

Creato3 solves this with:

- preflight account checks
- retryable bootstrap logic
- sponsor routes for local and production use

## 11.2 Public-chain gas configuration

The docs repeatedly warn about this because it is easy to get wrong.

Local chain:

- can use zero gas price in development

Public chain:

- must use a non-zero gas price
- otherwise `requestTxSync` can fail with insufficient-fee errors

This is why `VITE_GAS_PRICE` is treated as a required production concern.

## 11.3 Keeping all chain endpoints consistent

The frontend depends on a full chain surface:

- EVM RPC
- Cosmos RPC
- REST API
- indexer
- fee denom
- contract addresses

The repo itself also documents both local-chain and public-chain examples, so environment drift is a realistic risk during deployment handoff.

If those point to different chains, the product breaks in confusing ways.

This is one of the biggest operational challenges in multi-endpoint appchain applications.

## 11.4 Remembering post-deploy treasury authorization

The deployment order matters:

1. `CreatorProfile`
2. `CreatorTreasury`
3. `SubscriptionManager`
4. `CreatorTreasury.setAuthorizedCaller(subscriptionAddress)`

If step 4 is skipped, subscriptions cannot forward value into treasury.

That is a small but critical systems-integration detail.

## 11.5 `.init` usernames only work cleanly when the name is primary

The repo docs are very explicit here:

- registering a username is not enough
- the user must set it as the primary name
- otherwise frontend resolution can still return `null`

This is a subtle UX challenge because users may think they completed setup when they did not.

## 11.6 Local bridge testing is imperfect

The guide notes that Interwoven's UI is built around registered chain IDs, so a local appchain may not fully appear in the modal during local testing.

That means the native feature is strong, but local-demo fidelity is not always identical to public network behavior.

## 11.7 Vercel monorepo deployment gotchas

The repo also documents a very practical frontend deployment issue:

- if Vercel root is wrong, the app can 404 even if code is correct
- because the deployable frontend lives under `creato3-frontend`
- and SPA rewrites must be read from that directory's `vercel.json`

This is not a blockchain issue, but it is a real delivery challenge.

## 11.8 Current repo snapshot is incomplete on the contract side

This is not necessarily a product challenge from original development, but it is a real repository challenge now.

Right now:

- the ABI artifacts exist
- the tests were compiled
- the docs reference `src/*.sol`
- but the actual source files are missing in this snapshot

For long-term maintainability, restoring `creato3/src/`, `creato3/test/`, and Foundry config should be a priority.

## 12. What Would Need Improvement for Production

Creato3 is strong as an MVP, but a production-grade version would likely need:

- proper persistent storage for premium content instead of browser localStorage
- a stronger indexing layer for discoverability and analytics
- clearer subscription renewal automation or reminders
- restored and versioned Solidity source in the repo
- optimizer-enabled contract builds for lower gas cost
- stronger treasury admin tooling
- better creator analytics beyond pricing suggestions
- stronger moderation/content governance policies

None of these invalidate the current architecture. They are natural next steps after a hackathon MVP.

## 13. How This Would Look on Other Blockchains

This is where the Initia comparison becomes very interesting.

### 13.1 If built on Ethereum mainnet

What would stay similar:

- the Solidity contracts could be reused with minor adjustments
- Foundry, ethers, and ABI tooling would still work

What would get worse:

- gas costs would be far less creator-friendly
- subscription actions would feel expensive
- first-time users would still need ETH
- bridge/onboarding/name support would be much more fragmented

Result:

- technically possible
- economically and UX-wise much worse for this exact use case

### 13.2 If built on a generic EVM L2 like Base, Arbitrum, or Optimism

What would stay similar:

- contracts and most EVM tooling
- frontend ABI encoding
- standard wallet patterns

What would change:

- the app would need separate solutions for:
  - usernames
  - bridge UX
  - auto-sign or smoother signing
  - account sponsorship or paymaster design

Compared with Initia:

- execution cost might still be acceptable
- but the "whole product experience" would be stitched together from multiple vendors or custom integrations

Result:

- easier than a full rewrite
- but less coherent than the current Initia-native setup

### 13.3 If built on Solana

What would improve:

- low fees
- strong consumer-app ecosystem patterns

What would become much harder:

- contracts would need a rewrite in Rust/Anchor
- Foundry/Solidity stack would be discarded
- frontend transaction model would change completely
- EVM ABI and MiniEVM assumptions disappear

Result:

- potentially strong performance
- much higher engineering cost and architecture rewrite

### 13.4 If built on a Cosmos chain without MiniEVM

What would improve:

- deep Cosmos-native flexibility
- easy alignment with Cosmos account and appchain patterns

What would become harder:

- Solidity contracts would need to be rewritten in CosmWasm or another VM model
- ethers/Foundry stack would not transfer directly
- EVM-oriented frontend logic would need major changes

Result:

- good chain-level control
- much weaker code reuse from this project's current stack

### 13.5 Why Initia is the best fit for this exact version

Initia gives this project a very unusual combination:

- appchain control
- MiniEVM contract compatibility
- Initia-native wallet and username UX
- bridge support
- auto-sign support

That combination is the real differentiator.

On many other chains, you could reproduce one or two of those strengths.
On Initia, this project gets all of them in a more coherent stack.

## 14. Fair Summary: What Initia Contributed vs What the Team Built

Initia contributed:

- appchain environment
- MiniEVM execution model
- Initia address and wallet UX
- InterwovenKit integration surface
- `.init` usernames
- bridge access
- auto-sign capability

The Creato3 team built:

- the actual creator monetization product logic
- the three-contract economic design
- the zero-platform-fee treasury model
- the creator onboarding flow
- the subscriber journey
- the AI-assisted pricing layer
- the sponsor/bootstrap strategy around first-time appchain users

That division is important because it shows the project is not just a wrapper around Initia features. It uses Initia well, but the product thinking and monetization logic are clearly original to Creato3.

## 15. Final Evaluation

Creato3 is best understood as a creator subscription appchain product with four strong architectural decisions:

1. Keep on-chain logic narrow and understandable.
2. Put real value movement and access rules on-chain.
3. Keep AI off-chain and product-focused.
4. Use Initia not only as infrastructure, but as a UX multiplier.

The strongest parts of the project are:

- the clear contract separation
- the honest zero-platform-fee treasury design
- the smart use of Initia-native UX features
- the handling of first-time appchain onboarding

The weakest current areas are:

- incomplete contract source presence in this repo snapshot
- localStorage-based content/demo persistence
- MVP-level production hardening

Even with those limitations, the architecture is strong. If the missing contract source tree is restored and the off-chain content layer is upgraded, Creato3 has the shape of a serious appchain-native creator product rather than just a short-lived demo.
