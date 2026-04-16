import * as StellarSdk from "@stellar/stellar-sdk";
import { cacheGet, cacheSet, cacheDelete } from "./cache";

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID;
const RPC_URL = import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

// Support stellar-sdk v11 and v12+
const RpcServer =
  StellarSdk?.rpc?.Server ||
  StellarSdk?.SorobanRpc?.Server;

const assembleTransaction =
  StellarSdk?.rpc?.assembleTransaction ||
  StellarSdk?.SorobanRpc?.assembleTransaction;

const isSimulationError =
  StellarSdk?.rpc?.Api?.isSimulationError ||
  StellarSdk?.SorobanRpc?.Api?.isSimulationError ||
  ((sim) => !!sim.error);

const server = new RpcServer(RPC_URL, { allowHttp: false });

// Wait for the RPC node to reflect the new ledger state
const ledgerSettle = () => new Promise(r => setTimeout(r, 2000));

// ─── Read-only call ───────────────────────────────────────────────────────────
async function readContract(method, args = [], callerKey) {
  if (!callerKey) throw new Error("Wallet not connected");
  if (!CONTRACT_ID) throw new Error("Contract ID missing from .env");

  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(callerKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (isSimulationError(sim)) {
    throw new Error("Simulation error: " + JSON.stringify(sim.error));
  }
  return sim.result?.retval;
}

// ─── Write call ───────────────────────────────────────────────────────────────
async function writeContract(method, args, publicKey) {
  if (!publicKey) throw new Error("Wallet not connected");
  if (!CONTRACT_ID) throw new Error("Contract ID missing from .env");

  const freighterApi = await import("@stellar/freighter-api");
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  let account;
  try {
    account = await server.getAccount(publicKey);
  } catch (e) {
    throw new Error("Account not found on testnet. Fund it at https://friendbot.stellar.org?addr=" + publicKey);
  }

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (isSimulationError(sim)) {
    throw new Error("Simulation error: " + JSON.stringify(sim.error));
  }

  const preparedTx = assembleTransaction(tx, sim).build();
  const txXdr = preparedTx.toXDR();

  // Sign with Freighter
  let signedXdr;
  try {
    const result = await freighterApi.signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    signedXdr = result?.signedTxXdr ?? result;
  } catch {
    const result = await freighterApi.signTransaction(txXdr, "TESTNET");
    signedXdr = result?.signedTxXdr ?? result;
  }

  if (!signedXdr || typeof signedXdr !== "string") {
    throw new Error("Freighter did not return a signed transaction");
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  );

  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    throw new Error("Send failed: " + JSON.stringify(sendResult.errorResult));
  }

  // Poll until confirmed (max 30 seconds)
  let attempts = 0;
  while (attempts < 20) {
    const status = await server.getTransaction(sendResult.hash);
    if (status.status === "SUCCESS") return status;
    if (status.status === "FAILED") throw new Error("Transaction failed on-chain");
    await new Promise(r => setTimeout(r, 1500));
    attempts++;
  }
  throw new Error("Transaction timed out");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function registerUser(publicKey) {
  if (!publicKey) return;
  try {
    const addr = StellarSdk.Address.fromString(publicKey).toScVal();
    await writeContract("register_user", [addr], publicKey);
    cacheDelete(`balance:${publicKey}`);
  } catch (e) {
    // Contract error #1 = already registered — ignore silently.
    // The Soroban simulation surfaces this as "Error(Contract, #1)" in the
    // diagnostic log rather than a human-readable string, so we match on that.
    const isAlreadyRegistered =
      e.message?.includes("already registered") ||
      e.message?.includes("Error(Contract, #1)");
    if (!isAlreadyRegistered) {
      console.warn("registerUser:", e.message);
    }
  }
}

export async function getBalance(publicKey) {
  if (!publicKey) return 0;
  const cacheKey = `balance:${publicKey}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  try {
    const addr = StellarSdk.Address.fromString(publicKey).toScVal();
    const result = await readContract("get_balance", [addr], publicKey);
    const balance = Number(StellarSdk.scValToNative(result));
    cacheSet(cacheKey, balance, 20_000);
    return balance;
  } catch (e) {
    console.warn("getBalance failed:", e.message);
    return 0;
  }
}

export async function getOffers(publicKey) {
  if (!publicKey) return [];
  const cached = cacheGet("offers");
  if (cached !== null) return cached;

  try {
    const result = await readContract("get_offers", [], publicKey);
    const raw = StellarSdk.scValToNative(result);
    const offers = (Array.isArray(raw) ? raw : []).map(o => ({
      id: Number(o.id),
      provider: o.provider?.toString() ?? "",
      description: String(o.description ?? ""),
      hours: Number(o.hours),
    }));
    cacheSet("offers", offers, 15_000);
    return offers;
  } catch (e) {
    console.warn("getOffers failed:", e.message);
    return [];
  }
}

export async function offerService(publicKey, description, hours) {
  const addr = StellarSdk.Address.fromString(publicKey).toScVal();
  const desc = StellarSdk.nativeToScVal(description, { type: "string" });
  const hrs  = StellarSdk.nativeToScVal(Number(hours), { type: "u32" });
  await writeContract("offer_service", [addr, desc, hrs], publicKey);
  cacheDelete("offers");
  cacheDelete(`balance:${publicKey}`);
  await ledgerSettle(); // wait for RPC node to reflect new ledger state
}

export async function requestService(publicKey, offerId) {
  const addr = StellarSdk.Address.fromString(publicKey).toScVal();
  const id   = StellarSdk.nativeToScVal(Number(offerId), { type: "u32" });
  await writeContract("request_service", [addr, id], publicKey);
  cacheDelete(`balance:${publicKey}`);
  cacheDelete("offers");
  await ledgerSettle(); // wait for RPC node to reflect new ledger state
}