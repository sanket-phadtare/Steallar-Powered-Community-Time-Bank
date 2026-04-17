# 🕐 Community Time Bank — Stellar dApp

> Exchange skills and services using TIME tokens on the Stellar blockchain.  
> Every hour of service is equal — a plumber's hour is worth the same as a tutor's.

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](#running-tests)
[![Network](https://img.shields.io/badge/network-Stellar%20Testnet-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-gray)](#license)

---

## 🔴 Live Demo

**https://steallar-powered-community-time-ban.vercel.app/**

> Connect a Freighter wallet funded on Stellar Testnet to interact with the live contract.

---

## 📹 Demo Video

**https://youtu.be/XobjonWbvcU**

Covers: wallet connection → joining the bank → listing a service → booking → confirming completion.

---

## ✨ What It Does

The Community Time Bank lets neighbours exchange services without money. Instead, they use **TIME tokens** — 1 token = 1 hour of any service. No one's time is worth more than anyone else's.

| Action | Description |
|---|---|
| **Join** | New members receive 5 TIME tokens to bootstrap participation |
| **List a service** | Offer a skill (cooking, tutoring, repairs) for 1–8 TIME tokens |
| **Book a service** | Tokens are locked in escrow on-chain until completion |
| **Confirm completion** | Requester confirms delivery; tokens are released to provider |

---

## 🖼️ Screenshots

### Test output — 11 tests passing
<img width="1252" height="413" alt="9" src="https://github.com/user-attachments/assets/281ff898-9e5e-4a4f-940e-c12d968c2388" />

### Contract Deployment
<img width="1905" height="317" alt="1" src="https://github.com/user-attachments/assets/cb44b1a7-88bc-4d47-8ba6-6bdda9696549" />

### Working of Community Time Bank D-App
<img width="1918" height="962" alt="2" src="https://github.com/user-attachments/assets/b574f6d5-ba29-4b12-a659-e2533b00a4a3" />
<img width="1918" height="965" alt="3" src="https://github.com/user-attachments/assets/cf2b0b37-243e-4e04-8396-20ace21766cd" />
<img width="1918" height="962" alt="4" src="https://github.com/user-attachments/assets/55481a8d-4184-49d7-a07d-d14ca639b49b" />
<img width="1918" height="876" alt="5" src="https://github.com/user-attachments/assets/132fdf06-8f8b-48d6-9618-e1f1b566e63f" />
<img width="1918" height="966" alt="6" src="https://github.com/user-attachments/assets/abbf07d8-b5cf-4557-87fa-9dacf6d3e6bc" />
<img width="1918" height="876" alt="7" src="https://github.com/user-attachments/assets/a9297b9e-974a-4e51-b74f-fd5e6381d787" />

### Contract Invoke
<img width="1918" height="963" alt="8" src="https://github.com/user-attachments/assets/c3c04924-f9a5-4ae0-8e7f-7a2e19d4d4da" />





---

## 🏗️ Architecture

```
orange-belt/
└── community-timebank/
    ├── public/                        # Static assets
    ├── src/
    │   ├── assets/                    # Images, icons
    │   ├── components/
    │   │   ├── BalanceBadge.jsx       # Displays user TIME token balance
    │   │   ├── OfferForm.jsx          # Form to list a new service
    │   │   ├── ServiceBoard.jsx       # Active service listings grid
    │   │   └── WalletConnect.jsx      # Freighter wallet connect UI
    │   ├── context/
    │   │   └── WalletContext.jsx      # Global wallet state via React Context
    │   ├── hooks/
    │   │   └── useWallet.js           # Freighter wallet hook
    │   ├── tests/
    │   │   ├── balance.test.js        # 3 token balance tests
    │   │   ├── cache.test.js          # 5 cache utility tests
    │   │   ├── setup.js               # Vitest setup (jsdom + localStorage reset)
    │   │   └── wallet.test.js         # 3 wallet connection tests
    │   ├── utils/
    │   │   ├── cache.js               # localStorage cache with TTL + SWR helper
    │   │   └── contract.js            # Stellar SDK contract client
    │   ├── App.css
    │   ├── App.jsx                    # Root component & routing
    │   ├── index.css
    │   └── main.jsx                   # React entry point
    ├── screenshots/                   # Test output & UI screenshots for README
    ├── time-bank-contract/            # Soroban smart contract (Rust)
    ├── .env                           # VITE_CONTRACT_ID (not committed)
    ├── .gitignore
    ├── contract-redeploy-steps.txt    # Steps to redeploy contract to Testnet
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    └── vite.config.js
```

### Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Rust · Soroban SDK 21 |
| Blockchain | Stellar Testnet |
| Frontend | React 18 · Vite · Tailwind CSS |
| Wallet | Freighter (browser extension) |
| Testing | Vitest |
| Deployment | Vercel |

---

## ⚙️ Local Setup

### Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/stellar-cli) (`cargo install stellar-cli`)
- [Node.js](https://nodejs.org/) v18+
- [Freighter wallet](https://freighter.app/) browser extension

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/community-time-bank.git
cd community-time-bank
```

---

### 2. Build & deploy the contract

```bash
cd contract

# Add the WASM compilation target (first time only)
rustup target add wasm32-unknown-unknown

# Build
stellar contract build

# Deploy to Testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/time_bank.wasm \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet

# Copy the printed contract ID — you'll need it in step 4
```

---

### 3. Run contract tests

```bash
cd contract
cargo test
```

Expected output:

```
running 6 tests
test tests::test_join_gives_initial_balance      ... ok
test tests::test_cannot_join_twice               ... ok
test tests::test_list_service_increments_id      ... ok
test tests::test_book_and_confirm_transfers_tokens ... ok
test tests::test_cannot_book_without_enough_tokens ... ok
test tests::test_cannot_book_own_service         ... ok

test result: ok. 6 passed; 0 failed
```

---

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_CONTRACT_ID=CD7JCFN73ATG3Z6GBWCAHUG7CMPGMDDIAMD2QKY3TFXJKKGF6GNR4T7Q
```

---

### 5. Install dependencies & run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### 6. Run frontend tests

```bash
npm test
```

Expected output:

```
 RUN  v4.1.4 D:/Sanket/Stellar/orange-belt/community-timebank

 ✓ src/tests/wallet.test.js  (3 tests) 4ms
 ✓ src/tests/balance.test.js (3 tests) 4ms
 ✓ src/tests/cache.test.js   (5 tests) 108ms

 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  05:47:57
   Duration  2.33s (transform 119ms, setup 537ms, import 98ms, tests 116ms, environment 5.43s)
```

---

## 🧪 Test Coverage

### Contract tests (`cargo test`) — 6 tests

| Test | What it verifies |
|---|---|
| `test_join_gives_initial_balance` | New member receives exactly 5 TIME tokens |
| `test_cannot_join_twice` | Duplicate join panics with correct message |
| `test_list_service_increments_id` | Service IDs auto-increment correctly |
| `test_book_and_confirm_transfers_tokens` | Full escrow flow produces correct balances |
| `test_cannot_book_without_enough_tokens` | Underfunded booking is rejected |
| `test_cannot_book_own_service` | Self-booking is rejected |

### Frontend tests (`npm test`) — 11 tests across 3 files

**`wallet.test.js`** — 3 tests covering:
- Wallet connects successfully via Freighter
- Disconnected state resets address to null
- Error state set when Freighter is not installed

**`balance.test.js`** — 3 tests covering:
- Balance returns correct value from cache on hit
- Balance fetches fresh value on cache miss
- Balance returns 0 for a non-member address

**`cache.test.js`** — 5 tests covering:
- Store and retrieve a value within TTL
- Expired entries return `null`
- Missing keys return `null`
- `invalidate` removes a specific key
- `clear` removes all `tb_` prefixed keys only

---

## 🔑 Key Implementation Details

### Loading states
Every on-chain write (join, list, book, confirm) shows a spinner and disables the button while the transaction confirms. The `Spinner` component is reused across all interactive elements.

### Caching
Contract reads use a two-layer cache:

```
getActiveServices()  →  cache.get('active_services')
                         └─ HIT:  return immediately, revalidate in background (SWR)
                         └─ MISS: fetch from RPC, populate cache, call onUpdate()
```

TTLs: balances = 20 s · service listings = 30 s. Cache is invalidated on every write that would change the data (booking, listing, confirming).

### Escrow flow
Tokens leave the requester's balance at booking time and only reach the provider after `confirm_completion` is called. The contract never holds tokens itself — the balance map is the source of truth.

---

## 🌐 Deployment

The frontend is deployed to Vercel automatically on push to `main`.

```bash
# Manual deploy
npm run build
vercel --prod
```

Set `VITE_CONTRACT_ID` as an environment variable in your Vercel project settings.

---

## 📝 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_CONTRACT_ID` | Deployed Soroban contract address | Yes |

Copy `.env.example` to `.env` for local development.

---



---

## 🛣️ Future Improvements

- [ ] Dispute resolution — third-party arbitration for contested bookings
- [ ] Service categories and search/filter
- [ ] Reputation scores based on completed bookings
- [ ] Mobile-responsive PWA with push notifications
- [ ] Multi-session bookings (recurring services)

---

## 📄 License

MIT © 2025 — built for the Stellar Journey to Mastery Orange Belt challenge.
