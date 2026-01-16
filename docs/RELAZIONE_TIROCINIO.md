# Sezione 7 (Aggiornata) — Implementazione Frontend “riga per riga” (Hooks) + Flussi EOA/SmartWallet

> Questa sezione va incollata nel README/Relazione (dove avevamo il capitolo 7).  
> Qui uso ancora `MD_START` / `MD_END` quando devo includere codice o snippet.

---

## 7. Implementazione Frontend (React + Wagmi + Ethers) — Analisi puntuale dei hooks

Nel frontend, la logica Web3 è stata volutamente spostata in **custom hooks** per ottenere:
- componenti UI più puliti (presentational),
- logica riusabile tra sezioni (swap, wallets, history),
- re-inizializzazione automatica su cambio account/chain,
- gestione coerente di errori, loading state e refresh.

I due hooks chiave per la dApp sono:
- `frontend/src/hooks/useSwap.js`
- `frontend/src/hooks/useWalletFactory.js`

---

# 7.1 Hook `useSwap.js` — Swap ETH ⇄ USDC con wallet attivo (EOA o SmartWallet)

## 7.1.1 Responsabilità del hook
`useSwap(activeWalletAddress)` ha 5 responsabilità principali:

1) Inizializzare provider/signer/contracts in modo **chain-aware** (tramite addresses per chainId)  
2) Calcolare bilanci ETH/USDC della **wallet attiva** (EOA o SmartWallet)  
3) Recuperare:
   - **rate** (1 ETH → USDC) via `swap.quoteBuyUsdc(1 ETH)`
   - **prezzo** ETH/USD via `PriceConsumerV3` (feed wrapper)  
4) Eseguire swap in due modalità:
   - **EOA:** chiamate dirette a `EthUsdcSwap`
   - **SmartWallet:** chiamate a funzioni del contratto SmartWallet (che internamente chiama lo swap)  
5) Gestire UI state:
   - `loading`, `txPending`, `error`
   - refresh periodico (polling ogni 10s)

Questo hook è pensato per essere consumato da `SwapSection.jsx` e da UI che necessita di rate/bilanci.

---

## 7.1.2 Scelte tecniche chiave (spiegazione “da tirocinio”)

### A) “Active wallet” = EOA oppure SmartWallet
Il hook supporta la selezione di un indirizzo “attivo” esterno:
- se `activeWalletAddress` è passato → il hook lo usa come wallet attiva
- altrimenti usa l’EOA connessa (`useAccount()`)

MD_START
const activeAddress = activeWalletAddress || eoaAddress;

const isSmartWallet =
  !!activeAddress &&
  !!eoaAddress &&
  activeAddress.toLowerCase() !== eoaAddress.toLowerCase();
MD_END

**Impatto pratico:**
- l’utente può scegliere se operare:
  - con la propria EOA (swap diretto),
  - con uno SmartWallet creato dalla factory (swap mediato dal contratto wallet).

Questa è una feature tipica Web3: “account abstraction light” (senza AA completa), ma già utile per dimostrazione accademica.

---

### B) Addresses chain-aware e controllo config
Gli indirizzi sono letti usando `getAddresses(chainId)` (mapping multi-chain generato dal deploy script).

MD_START
const addresses = useMemo(() => {
  if (!chainId) return null;
  try { return getAddresses(chainId); } catch { return null; }
}, [chainId]);
MD_END

Viene calcolato `missingConfig` che blocca l’inizializzazione se:
- wallet non connesso,
- chainId non supportato,
- indirizzi mancanti o invalidi.

MD_START
const required = [
  ["EthUsdcSwap", addresses.EthUsdcSwap],
  ["USDCMock", addresses.USDCMock],
  ["PriceConsumerV3", addresses.PriceConsumerV3],
];

const missing = required.filter(([, v]) => !isAddr(v));
MD_END

**Perché è importante (accademico):**
- evita errori runtime quando si cambia rete,
- rende la UI robusta (“unsupported network” esplicito),
- separa chiaramente “config missing” da “tx failure”.

---

### C) Init senza richiedere permessi (NO eth_requestAccounts)
L’inizializzazione usa `ethers.BrowserProvider(window.ethereum)` e `getSigner()`, ma non forza una richiesta accounts: è demandata al flusso di connessione wagmi/web3modal.

MD_START
const _provider = new ethers.BrowserProvider(window.ethereum);
const _signer = await _provider.getSigner();
MD_END

**Motivo:**
- riduce attrito UI,
- evita richieste duplicate,
- best practice: lasciare al wallet connector (wagmi/Web3Modal) il compito di “connect”.

---

## 7.1.3 Inizializzazione contratti (provider vs signer)
Nel hook, i contratti vengono istanziati in modo coerente col tipo di operazione:

- `USDCMock` e `EthUsdcSwap` con **signer** (per transazioni: approve + swap)
- `PriceConsumerV3` con **provider** (read-only)

MD_START
const usdcContract = new ethers.Contract(addresses.USDCMock, USDCMockArtifact.abi, _signer);
const swapContract = new ethers.Contract(addresses.EthUsdcSwap, EthUsdcSwapArtifact.abi, _signer);
const consumer = new ethers.Contract(addresses.PriceConsumerV3, PriceConsumerABI.abi, _provider);
MD_END

**Nota tecnica:**
- anche `consumer` potrebbe usare signer, ma non serve: è solo lettura e così si riducono dipendenze.

---

## 7.1.4 Refresh periodico: bilanci + rate + prezzo
Il refresh è implementato come `useCallback` e chiamato:
- una volta all’avvio,
- poi ogni `REFRESH_MS` (= 10s).

MD_START
useEffect(() => {
  refresh();
  const id = setInterval(refresh, REFRESH_MS);
  return () => clearInterval(id);
}, [provider, activeAddress, usdc, swap, priceConsumer, refresh]);
MD_END

### A) Bilanci
Vengono letti in parallelo:
- `provider.getBalance(activeAddress)`
- `usdc.balanceOf(activeAddress)`

MD_START
const [ethBal, usdcBalRaw] = await Promise.all([
  provider.getBalance(activeAddress),
  usdc.balanceOf(activeAddress),
]);
MD_END

> Nota: qui `ethBal` e `usdcBalRaw` sono BigInt (ethers v6).

### B) Rate (1 ETH → USDC)
Per mostrare un rate coerente e privo di floating error:
- `oneEth = parseEther("1")`
- `rateUsdc = swap.quoteBuyUsdc(oneEth)`
- poi conversione `formatUnits(rateUsdc, 6)` per UI.

MD_START
const oneEth = ethers.parseEther("1");
const rateUsdc = await swap.quoteBuyUsdc(oneEth);
setEthToUsdcRate(Number(ethers.formatUnits(rateUsdc, USDC_DECIMALS)));
MD_END

### C) Prezzo ETH/USD via PriceConsumerV3
Il prezzo è letto da:
- `getDecimals()`
- `getLatestPrice()`

Poi convertito in stringa con `formatUnits(latestBig, dec)` per evitare overflow.

MD_START
const dec = Number(await priceConsumer.getDecimals());
const latest = await priceConsumer.getLatestPrice();
const latestBig = typeof latest === "bigint" ? latest : BigInt(latest);

if (latestBig > 0n) {
  const asStr = ethers.formatUnits(latestBig, dec);
  const asNum = Number(asStr);
  setEthUsdPrice(Number.isFinite(asNum) ? asNum : null);
} else {
  setEthUsdPrice(null);
}
MD_END

**Perché così (motivazione):**
- Chainlink price può essere grande e in `int256`, il parsing “robusto” evita edge-case.
- `formatUnits` + `Number()` è ok per UI (non per calcoli critici on-chain).  
  I calcoli di output minOut avvengono su BigInt con quote on-chain.

---

## 7.1.5 Azioni: buyUsdc (ETH → USDC)
La funzione `buyUsdc(ethAmount)` implementa due percorsi.

### A) Slippage in bps (1%)
Lo slippage è calcolato su BigInt usando `applySlippageBps`:

MD_START
const SLIPPAGE_BPS = 100n; // 1%

function applySlippageBps(amount, bps) {
  return (amount * (10000n - bps)) / 10000n;
}
MD_END

Flusso:
1) parse input ETH → wei
2) quote buy
3) calcolo `minUsdcOut`
4) esegui swap (EOA o SmartWallet)

MD_START
const ethWei = ethers.parseEther(String(ethAmount));
const quotedUsdc = await swap.quoteBuyUsdc(ethWei);
const minUsdcOut = applySlippageBps(quotedUsdc, SLIPPAGE_BPS);
MD_END

### B) Percorso SmartWallet
Se la wallet attiva non coincide con EOA → chiama `SmartWallet.swapEthToUsdc`:

MD_START
const wallet = getSmartWallet();
const tx = await wallet.swapEthToUsdc(ethWei, minUsdcOut);
const receipt = await tx.wait();
MD_END

**Cosa succede on-chain:**
- la tx è inviata dall’EOA owner verso il contratto wallet
- il wallet verifica `onlyOwner`
- il wallet verifica quote e minOut
- il wallet chiama lo swap passando `value`

### C) Percorso EOA (swap diretto)
Se la wallet attiva è l’EOA:
- chiama direttamente `swap.buyUsdc(eoaAddress, { value })`

MD_START
const tx = await swap.buyUsdc(eoaAddress, { value: ethWei });
const receipt = await tx.wait();
MD_END

**Nota:**
- recipient = `eoaAddress`, così l’output USDC viene trasferito direttamente all’utente.

---

## 7.1.6 Azioni: sellUsdc (USDC → ETH)
Anche `sellUsdc(usdcAmount)` ha due percorsi.

### A) Quote e minEthOut
MD_START
const amount = ethers.parseUnits(String(usdcAmount), USDC_DECIMALS);
const quotedEth = await swap.quoteSellUsdc(amount);
const minEthOut = applySlippageBps(quotedEth, SLIPPAGE_BPS);
MD_END

### B) Percorso SmartWallet
Il wallet fa approve e sell internamente (come da smart contract):

MD_START
const wallet = getSmartWallet();
const tx = await wallet.swapUsdcToEth(amount, minEthOut);
const receipt = await tx.wait();
MD_END

### C) Percorso EOA
Per l’EOA serve:
1) approve USDC allo swap
2) chiamata sell
3) recipient = eoaAddress

MD_START
const approveTx = await usdc.approve(await swap.getAddress(), amount);
await approveTx.wait();

const sellTx = await swap.sellUsdc(eoaAddress, amount);
const receipt = await sellTx.wait();
MD_END

**Motivazione (concetto fondamentale Web3):**
- `sellUsdc` usa `transferFrom(msg.sender, ...)`
- quindi l’EOA deve approvare lo swap prima di vendere.

---

## 7.1.7 Output del hook (contratto “UI API”)
Il hook ritorna:
- stato (loading/pending/error),
- chainId/config,
- wallet attiva + flag isSmartWallet,
- bilanci e rate,
- funzioni buy/sell/refresh.

Questo design rende i componenti UI quasi “stateless” e focalizzati sul rendering.

---

## 7.1.8 Note critiche e miglioramenti futuri (puntuali)
1) **PriceConsumerV3 vs Swap.getEthUsdPrice1e8()**  
   Nel backend lo swap espone `getEthUsdPrice1e8()`. Il hook invece legge dal PriceConsumer.  
   Miglioramento: usare una sola fonte (consiglio: usare `swap.getEthUsdPrice1e8()` perché è già quello usato dalla navbar e vive nello stesso contratto che fa quote).

2) **Controllo input utente**  
   `parseEther(String(ethAmount))` fallisce se l’input è vuoto o non numerico.  
   Miglioramento: validazione lato UI (stringa > 0, regex numerica) prima di chiamare `buyUsdc/sellUsdc`.

3) **Polling ogni 10s**  
   È ok per demo; miglioramento: event-driven (ascoltare eventi `BoughtUSDC/SoldUSDC` e refresh su event).

---

# 7.2 Hook `useWalletFactory.js` — Creazione e gestione SmartWallet per utente

## 7.2.1 Responsabilità del hook
`useWalletFactory(account)` gestisce:

1) init contract `WalletFactory` (provider/signer) con reinit su cambio chain o account  
2) fetch lista wallet dell’utente (da `getUserWallets`)  
3) fetch bilanci ETH dei wallet listati  
4) creare un nuovo wallet (`createWallet`) e loggare la tx in `useLocalTxHistory`  
5) listener eventi `WalletCreated` per aggiornare la UI in tempo reale  
6) polling bilanci ogni 10s senza “layout flashing”

---

## 7.2.2 Init “chain-aware” con reinit controllata
L’hook crea:
- `providerRef`, `signerRef`, `contractRef`, `chainIdRef`
per evitare re-init inutili e per mantenere oggetti stabili tra render.

MD_START
const mustReinit =
  !providerRef.current ||
  !signerRef.current ||
  !contractRef.current ||
  signerRef.current.address !== signerAddress ||
  chainIdRef.current !== currentChainId;
MD_END

> Nota: `signerRef.current.address` in ethers v6 non è sempre valorizzato come proprietà.  
> È più robusto confrontare `await signerRef.current.getAddress()` con `signerAddress`.  
> (Consiglio miglioramento per evitare bug sporadici.)

L’indirizzo della factory è preso da `getAddresses(currentChainId)`.

MD_START
const addrs = getAddresses(currentChainId);
const factoryAddress = addrs?.WalletFactory;

if (!factoryAddress) {
  throw new Error(`Missing WalletFactory address for chainId=${currentChainId}`);
}
MD_END

Quando reinizializza, resetta anche lo stato UI (`wallets`, `balances`) perché cambiare rete significa cambiare “mondo on-chain”.

---

## 7.2.3 Fetch wallets e balances
### A) fetchWallets()
- chiama `contract.getUserWallets(account)`
- salva `wallets` nello state

MD_START
const list = await contract.getUserWallets(account);
setWallets(list);
MD_END

### B) fetchBalances(list)
Itera i wallet e legge `provider.getBalance(addr)` per ciascuno.

MD_START
for (const addr of list) {
  const balWei = await provider.getBalance(addr);
  updated[addr] = Number(ethers.formatEther(balWei));
}
MD_END

**Nota didattica:**
- È volutamente semplice (solo ETH).  
  Estensione futura: anche USDC balance via contract token.

---

## 7.2.4 Creazione wallet + tx history
`createWallet()` fa:

1) `ensureContract()`
2) legge chainId corrente (per log e addresses)
3) invia tx `contract.createWallet()`
4) salva su local history una entry “pending_wallet_creation”
5) attende mining
6) refresh wallets e balances
7) salva entry “wallet_created”

MD_START
const tx = await contract.createWallet();

addTx({
  hash: tx.hash,
  from: account,
  to: factoryAddress,
  amount: 0,
  timestamp: new Date().toISOString(),
  status: "pending_wallet_creation",
  type: "WALLET_CREATE",
});

await tx.wait();

const list = await fetchWallets();
await fetchBalances(list);

addTx({
  hash: tx.hash,
  from: factoryAddress,
  to: list[list.length - 1] || "unknown_wallet",
  amount: 0,
  timestamp: new Date().toISOString(),
  status: "wallet_created",
  type: "WALLET_CREATE",
});
MD_END

**Motivo “da tirocinio”:**
- La tx history locale evita dipendenze da indexer esterni.
- Mostra una pratica reale: loggare “pending” e poi “confirmed”.

---

## 7.2.5 Refresh bilanci periodico senza rifetch lista
La lista wallets viene mantenuta in un ref `walletsRef` per usarla nel timer.

MD_START
balanceTimerRef.current = setInterval(async () => {
  await fetchBalances(walletsRef.current);
}, 10000);
MD_END

Questo evita:
- fetchWallets ripetuto,
- ricalcolo della lista ad ogni polling,
- “flash” UI.

---

## 7.2.6 Listener evento WalletCreated (anti-duplicazione)
Il listener è “keyed” su chainId + account per evitare listener doppi.

MD_START
const key = `${currentChainId}:${account.toLowerCase()}`;
if (listenerKeyRef.current === key) return;
listenerKeyRef.current = key;

contract.on("WalletCreated", handler);
MD_END

Il handler:
- verifica che `user` dell’evento sia l’account corrente
- logga una entry in tx history
- chiama `refresh()`

MD_START
if (String(user).toLowerCase() !== account.toLowerCase()) return;
await refresh();
MD_END

**Nota:**
- la history usa un hash “fake” per evento: `event-<chainId>-<slice wallet>`  
  è ok per UI, ma in un upgrade si può usare:
  - blockNumber + txHash dall’evento (se recuperato), o
  - un id UUID.

---

## 7.2.7 Note critiche e miglioramenti futuri (puntuali)
1) **Import addresses:** qui usi `getAddresses` da `../config`, mentre `useSwap` usa `../abi/addressesByChain`.  
   Miglioramento: uniformare (una sola source-of-truth) per evitare mismatch tra hook.

2) **Confronto signer address:** usare `await signerRef.current.getAddress()`.

3) **Event listener cleanup:** corretto con `off()`. Ottimo.

4) **Bilanci only ETH:** estendere a USDC con `USDCMock.balanceOf(wallet)` se utile alla UI.

---

# 7.3 Flussi completi (End-to-End) — EOA vs SmartWallet (da mettere in relazione)

## 7.3.1 Creazione SmartWallet
1) UI (`WalletList.jsx`) chiama `createWallet()` (hook factory)  
2) `WalletFactory.createWallet()` deploya `SmartWallet(owner=eoa, swap, usdc)`  
3) evento `WalletCreated(owner, wallet)`  
4) frontend:
   - aggiorna tx history (pending → confirmed)
   - aggiorna lista wallet e bilanci
   - listener evento esegue refresh automatico

## 7.3.2 Swap ETH → USDC (EOA)
1) UI seleziona active wallet = EOA  
2) `useSwap.buyUsdc(ethAmount)` calcola quote e minOut  
3) `EthUsdcSwap.buyUsdc(recipient=eoa, value=ethWei)`  
4) USDC trasferito a EOA  
5) refresh bilanci + rate

## 7.3.3 Swap ETH → USDC (SmartWallet)
1) UI seleziona active wallet = uno SmartWallet  
2) `useSwap.buyUsdc()` chiama `SmartWallet.swapEthToUsdc(ethWei, minUsdcOut)`  
3) SmartWallet verifica owner, quote e saldo ETH  
4) SmartWallet chiama `EthUsdcSwap.buyUsdc(recipient=wallet, value=ethWei)`  
5) USDC trasferito al wallet  
6) refresh bilanci del wallet attivo

## 7.3.4 Swap USDC → ETH (EOA)
1) UI seleziona EOA  
2) `useSwap.sellUsdc(usdcAmount)` calcola quote e minOut  
3) `USDC.approve(swap, amount)`  
4) `EthUsdcSwap.sellUsdc(recipient=eoa, amountUsdc)`  
5) ETH trasferito a EOA  
6) refresh

## 7.3.5 Swap USDC → ETH (SmartWallet)
1) UI seleziona SmartWallet  
2) `useSwap.sellUsdc()` chiama `SmartWallet.swapUsdcToEth(amount, minEthOut)`  
3) SmartWallet fa approve verso swap  
4) `EthUsdcSwap.sellUsdc(recipient=wallet, amountUsdc)`  
5) ETH torna al wallet  
6) refresh

---

# 7.4 Collegamento ai file (tracciabilità)
- Hook swap: `frontend/src/hooks/useSwap.js`
- Hook factory: `frontend/src/hooks/useWalletFactory.js`
- ABI: `frontend/src/abi/*.json`
- Addresses mapping: `frontend/src/abi/addresses.json` + `addresses.<chainId>.json`
- UI swap: `frontend/src/components/actions/SwapSection.jsx`
- UI wallet list: `frontend/src/components/actions/WalletList.jsx`
- Tx history: `frontend/src/hooks/useLocalTxHistory.js` + `TransactionHistory.jsx`

---

## Per chiudere il README “10/10”
Se mi incolli (anche velocemente) questi 2 file:
- `frontend/src/hooks/useLocalTxHistory.js`
- `frontend/src/components/actions/SwapSection.jsx`
ti scrivo:
1) sezione 7.5 “Transaction History” perfetta con schema, migrazioni e UI  
2) sezione 7.6 “UI/UX & Responsive decisions” (navbar popover, mobile constraints) con motivazioni da tirocinio

