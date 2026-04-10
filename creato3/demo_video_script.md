# Creato3 Demo Video Script

## Recommended Format

- Ideal duration: 3.5 to 4.5 minutes
- Style: calm, confident, product-first
- Goal: explain the problem, show why Creato3 matters, show why Initia is the right chain, prove the core flow works on testnet, and end with a clear MVP target and mainnet path

## One-Line Opening Hook

Patreon takes 10%. Substack takes 10%. Creato3 takes zero, and we are building that future on Initia.

## Full Demo Script

## 0:00 - 0:25 | Opening: What Creato3 Is

### What to show

- Creato3 landing page
- the main headline
- maybe one creator dashboard preview

### Voiceover

Creato3 is an AI-powered creator monetization platform built for one clear outcome: creators should be able to launch paid communities, accept on-chain subscriptions, and keep 100% of their revenue.

Today, millions of creators are forced to give away a percentage of their earnings to centralized platforms. Creato3 changes that. We combine creator identity, subscription payments, and zero-platform-fee withdrawals into one clean experience.

So this is not just another blockchain app. This is a creator product first, and the blockchain works underneath it.

## 0:25 - 0:55 | Why Creato3 Matters

### What to show

- pricing or revenue comparison section
- AI pricing UI
- maybe a slide with Patreon/Substack comparison

### Voiceover

The problem is simple. Creators already do the hard work of building an audience, but when it is time to monetize, they lose a meaningful cut to the platform.

Creato3 is designed to remove that platform tax. A creator launches a profile, defines a tier, and gets paid directly. On top of that, our AI layer helps creators choose smarter pricing, estimate revenue, and structure their paid offering before they go live.

## 0:55 - 1:25 | Why Initia

### What to show

- Architecture page
- custom chain references
- maybe the chain name `creato3-1`

### Voiceover

Now the question is: why build this on Initia?

Because Creato3 needed more than just smart contracts. It needed a full product-grade appchain experience.

Initia gave us the exact stack we needed:

- MiniEVM, so we could build our core logic in Solidity
- appchain-level control, so the product could feel purpose-built
- InterwovenKit, so wallet connection, usernames, bridge UX, and transaction flow feel native instead of stitched together

That combination made Initia the right home for Creato3.

## 1:25 - 2:10 | How Initia Features Are Used and Where

### What to show

- `CreateProfilePage`
- `SubscribePage`
- header with `.init` username
- bridge modal
- auto-sign toggle

### Voiceover

Initia is used in very visible ways across the product.

First, Initia Usernames. Instead of reducing creators to a raw wallet address, Creato3 displays human-readable `.init` identity. That makes creator profiles feel personal and trustworthy.

Second, Interwoven Bridge. If a subscriber has funds on Initia L1 but not yet on the appchain, they can bridge directly from the flow. That removes a huge onboarding barrier.

Third, auto-signing. In the subscription flow, the user can enable auto-sign so the app feels more like a smooth consumer membership product and less like a wallet-popup ritual.

And underneath all of this, our frontend uses Initia transaction flow to send MiniEVM `MsgCall` transactions to the Creato3 appchain, so we keep Initia-native UX while executing EVM contract logic.

## 2:10 - 3:10 | Main Product Flow

### What to show

- creator profile creation
- launch page
- AI pricing suggestion
- creator page
- subscribe page
- treasury or withdrawal proof

### Voiceover

Let me show the main flow.

The creator starts by connecting a wallet and creating a profile. Their identity, category, bio, and `.init` username are stored on-chain through the `CreatorProfile` contract.

Next, the creator launches a paid tier. We can use AI to suggest a strong subscription price based on niche and expected audience size, and then that tier is written on-chain.

Then a fan opens the creator page. If the fan needs funds on the appchain, they can use the Interwoven Bridge flow. Once funded, they subscribe through the `SubscriptionManager` contract.

At that point, the subscription is recorded on-chain, access becomes verifiable, and the payment is forwarded into `CreatorTreasury`.

And this is the most important business moment: when the creator withdraws, they receive the full amount. No platform fee. No percentage cut. That zero-fee policy is enforced by the treasury logic itself.

## 3:10 - 3:50 | Challenges We Faced While Building

### What to show

- architecture page
- maybe quick screenshots of debug docs or env config
- account bootstrap or chain setup visuals

### Voiceover

Building Creato3 was exciting, but it was not trivial.

One challenge was first-time user onboarding. A brand-new wallet may not yet exist properly on the appchain, so we built an account bootstrap flow to help users complete their first transaction smoothly.

Another challenge was public-chain fee handling. Local development can tolerate zero-gas assumptions, but public deployment needs correct gas price configuration, correct fee denom configuration, and chain-consistent RPC, REST, indexer, and contract addresses.

We also had UX-specific challenges like making sure `.init` usernames resolve correctly and making bridge and auto-sign flows feel natural inside the product.

So the challenge was not only writing contracts. It was making the full appchain experience feel simple for normal users.

## 3:50 - 4:35 | Hackathon MVP Day Target

### What to show

- roadmap slide
- testnet deployment details
- checklist slide

### Voiceover

Our target by Hackathon MVP Day is very clear:

Creato3 must be fully working on Initia testnet, end to end.

That means:

- all three contracts are deployed and verified on testnet
- creator registration works
- tier launch works
- AI pricing is visible and useful
- bridge flow is working
- auto-sign is working
- fan subscription works
- treasury withdrawal proves the zero-fee model

By that day, the app should not be a prototype in pieces. It should be a complete testnet product journey.

The reason that matters is simple: if we win, we do not want to restart from scratch. We want to move from a complete, tested Initia testnet MVP into production hardening and then shift to mainnet with confidence.

## 4:35 - 4:55 | Closing

### What to show

- landing page
- creator page
- final brand shot

### Voiceover

Creato3 is our vision for creator monetization with direct ownership, zero platform fees, and smoother user experience through Initia.

We are building the MVP on testnet today so that tomorrow, after winning, we are ready to take it to mainnet.

Creato3 on Initia: built for creators, built for ownership, and built to feel simple.

## Shorter 2-Minute Judge Version

If you need a faster version, use this.

### 0:00 - 0:20

Patreon takes 10%. Substack takes 10%. Creato3 takes zero. We built Creato3 on Initia so creators can launch paid communities and keep 100% of subscription revenue.

### 0:20 - 0:45

Creato3 combines three things: on-chain creator identity, on-chain subscriptions, and AI-assisted pricing. A creator creates a profile, launches a tier, and fans subscribe directly.

### 0:45 - 1:10

Initia is the right chain for us because we needed MiniEVM for Solidity contracts, but also InterwovenKit for real product UX. We use `.init` usernames, Interwoven Bridge, and auto-signing directly in the app.

### 1:10 - 1:35

Here is the main flow: creator profile creation, AI tier pricing, fan bridge if needed, subscription on-chain, and then treasury withdrawal with zero platform fee.

### 1:35 - 1:50

The hardest challenges were onboarding first-time appchain users, correct public-chain fee configuration, and making all of the chain interactions feel simple.

### 1:50 - 2:00

Our MVP goal is to be fully ready on Initia testnet by Hackathon Demo Day, so after winning we can harden the product and move to mainnet instead of rebuilding it.

## Suggested Final Slide Text

Creato3 MVP Target on Initia Testnet

- Complete creator-to-fan subscription journey
- All 3 Initia native features visible and working
- Zero-fee treasury proof
- Testnet complete by MVP day
- Mainnet transition after hardening

## Extra Delivery Tips

- Do not begin by saying "this is a blockchain project." Begin with the creator pain point.
- Keep the word "zero" repeated throughout the demo: zero platform fee, zero friction, zero unnecessary complexity.
- When you introduce Initia, position it as the product-enabling layer, not only the infrastructure layer.
- When you show challenges, speak confidently. Challenges make the build feel real and serious.
- When you mention MVP Day, make it sound like a shipping milestone, not a hopeful deadline.
