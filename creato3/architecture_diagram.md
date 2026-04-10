# Creato3 Architecture

## System Diagram

```mermaid
flowchart TB
  Creator["Creator"]
  Fan["Fan"]

  subgraph Frontend["Creato3 Frontend"]
    Landing["Landing + Discover"]
    Profile["Create Profile"]
    Launch["Launch + AI Pricing"]
    Subscribe["Subscribe + Tx Proof"]
    Hub["Profile Hub + Earnings"]
  end

  subgraph InitiaUX["Initia UX Layer"]
    Interwoven["InterwovenKit"]
    Bridge["Interwoven Bridge"]
    Names[".init usernames"]
    AutoSign["Auto-sign + account bootstrap"]
  end

  subgraph Backend["Backend + AI"]
    API["Express API"]
    Groq["Groq pricing + content plan"]
    MCP["MCP server"]
    Agents["Creator + content agents"]
  end

  subgraph Chain["Initia Appchain / MiniEVM"]
    ProfileContract["CreatorProfile"]
    SubscriptionContract["SubscriptionManager"]
    TreasuryContract["CreatorTreasury"]
  end

  Creator --> Landing
  Creator --> Profile
  Creator --> Launch
  Fan --> Landing
  Fan --> Subscribe
  Landing --> Interwoven
  Profile --> Interwoven
  Launch --> Interwoven
  Subscribe --> Interwoven
  Hub --> Interwoven
  Launch --> API
  API --> Groq
  MCP --> API
  Agents --> API
  Interwoven --> Bridge
  Interwoven --> Names
  Interwoven --> AutoSign
  Interwoven --> ProfileContract
  Interwoven --> SubscriptionContract
  SubscriptionContract --> TreasuryContract
```

## Reading Guide

1. `CreateProfilePage` creates creator identity on-chain through `CreatorProfile`.
2. `LaunchPage` combines uploads, audience size, links, and AI pricing, then writes the tier on-chain.
3. `CreatorPage` reads on-chain profile/tier state and local launch metadata.
4. `SubscribePage` sends the subscription transaction and now surfaces a verification hash for the demo.
5. `ProfilePage` acts as the creator/fan hub for history, receipts, and treasury-related proof.

## Verification Story

- Profile creation returns a transaction hash.
- Launching or updating a tier returns a transaction hash.
- Subscription payment returns a transaction hash.
- When `VITE_TX_EXPLORER_BASE_URL` is configured, the UI can deep-link those proofs to Initia scan.
