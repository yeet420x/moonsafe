// Solana utilities for MoonSafe - Track Moonshot launches
const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SPL_TOKEN_PROGRAM_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const MOONSHOT_PROGRAM = 'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG';

// NEW: constants for detecting fresh mints
const NEW_MINT_TYPES = ['initializeMint', 'initializeMint2', 'initializeMint3'];

// Fresh mint window configuration - now dynamic
export let MINT_LOOKBACK_MINUTES = 60; // 1 hour (configurable)
let FRESH_WINDOW_SECS = MINT_LOOKBACK_MINUTES * 60;

// Pagination and search configuration
const SIG_BATCH = 100; // Temporarily increased from 50 to 100 for debugging
const TX_BATCH_SIZE = 10; // Reduced from 100 to 10
const ACCOUNT_BATCH_SIZE = 20; // Reduced from 100 to 20

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second delay between batches
const MAX_CONCURRENT_REQUESTS = 5; // Limit concurrent requests

// Cache for mint freshness checks
const mintCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // Increased to 10 minutes to reduce RPC calls

// Moralis API configuration
const MORALIS_API_KEY = import.meta.env.VITE_MORALIS_API_KEY;
const MORALIS_BASE_URL = 'https://solana-gateway.moralis.io/token/mainnet';

// Known established tokens to filter out
const ESTABLISHED_TOKENS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'So11111111111111111111111111111111111111112', // SOL
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // Bonk
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', // POPCAT
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', // PYTH
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo', // $Pyusd Paypal USD
]);

// Initialize Moralis
let moralisInitialized = false;

async function initializeMoralis() {
  if (moralisInitialized || !MORALIS_API_KEY) return;
  
  try {
    const { default: Moralis } = await import('moralis');
    await Moralis.start({
      apiKey: MORALIS_API_KEY
    });
    moralisInitialized = true;
    console.log('✅ Moralis initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Moralis:', error);
  }
}

// Dynamic lookback setting
export function setMintLookbackMinutes(minutes) {
  MINT_LOOKBACK_MINUTES = minutes;
  FRESH_WINDOW_SECS = minutes * 60;
  console.log(`⏰ Updated mint lookback to ${minutes} minutes`);
}

// Error resilience configuration
let currentBatchSize = TX_BATCH_SIZE;
let consecutiveFailures = 0;
const MAX_FAILURES = 2; // Reduced from 3 to 2

// Rate limiting helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Adaptive batch sizing - more conservative
function adjustBatchSize(success) {
  if (success) {
    consecutiveFailures = 0;
    if (currentBatchSize < TX_BATCH_SIZE) {
      currentBatchSize = Math.min(currentBatchSize + 2, TX_BATCH_SIZE); // More conservative increase
      console.log(`📈 Increased batch size to ${currentBatchSize}`);
    }
  } else {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_FAILURES) {
      currentBatchSize = Math.max(currentBatchSize / 2, 3); // Minimum of 3
      console.log(`📉 Reduced batch size to ${currentBatchSize} due to failures`);
      consecutiveFailures = 0;
    }
  }
}

// Batch RPC calls for better performance with rate limiting
async function batchGetTransactions(rpcUrl, signatures) {
  const batches = [];
  for (let i = 0; i < signatures.length; i += currentBatchSize) {
    batches.push(signatures.slice(i, i + currentBatchSize));
  }

  const allTransactions = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    
    try {
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} transactions)`);
      
      // Process batch with limited concurrency
      const promises = batch.map(sig => 
        fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [sig, { 
              maxSupportedTransactionVersion: 0,
              encoding: 'jsonParsed'
            }],
          }),
        }).then(r => r.json()).then(j => j.result)
      );

      const results = await Promise.allSettled(promises);
      const validResults = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      
      allTransactions.push(...validResults);
      
      console.log(`✅ Batch ${i + 1} complete: ${validResults.length}/${batch.length} valid results`);
      
      // Adjust batch size based on success rate
      const successRate = validResults.length / batch.length;
      adjustBatchSize(successRate > 0.7); // Lowered threshold
      
      // Rate limiting: delay between batches (except for the last one)
      if (i < batches.length - 1) {
        console.log(`⏳ Rate limiting: waiting ${RATE_LIMIT_DELAY}ms before next batch...`);
        await delay(RATE_LIMIT_DELAY);
      }
      
    } catch (error) {
      console.warn(`⚠️ Error processing batch ${i + 1}: ${error.message}`);
      adjustBatchSize(false);
      
      // More conservative fallback: try individual requests with delays
      console.log('🔄 Falling back to individual requests for failed batch...');
      for (let j = 0; j < batch.length; j++) {
        try {
          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [batch[j], { 
                maxSupportedTransactionVersion: 0,
                encoding: 'jsonParsed'
              }],
            }),
          });
          
          const data = await response.json();
          if (data.result) {
            allTransactions.push(data.result);
          }
          
          // Add delay between individual requests in fallback mode
          if (j < batch.length - 1) {
            await delay(200); // 200ms delay between individual requests
          }
        } catch (fallbackError) {
          console.warn(`⚠️ Fallback also failed for ${batch[j].slice(0, 8)}...`);
        }
      }
      
      // Rate limiting after fallback
      if (i < batches.length - 1) {
        console.log(`⏳ Rate limiting after fallback: waiting ${RATE_LIMIT_DELAY * 2}ms...`);
        await delay(RATE_LIMIT_DELAY * 2);
      }
    }
  }
  
  return allTransactions;
}

// Batch account lookups
async function batchGetMultipleAccounts(rpcUrl, addresses) {
  const batches = [];
  for (let i = 0; i < addresses.length; i += ACCOUNT_BATCH_SIZE) {
    batches.push(addresses.slice(i, i + ACCOUNT_BATCH_SIZE));
  }

  const allAccounts = [];
  
  for (const batch of batches) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getMultipleAccounts',
          params: [batch, { encoding: 'jsonParsed' }],
        }),
      });

      const data = await response.json();
      if (data.result && data.result.value) {
        allAccounts.push(...data.result.value);
      }
      
      console.log(`📦 Processed batch of ${batch.length} accounts`);
      
    } catch (error) {
      console.warn(`⚠️ Error processing account batch: ${error.message}`);
    }
  }
  
  return allAccounts;
}

// Clean old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of mintCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      mintCache.delete(key);
    }
  }
}

/**
 * Alternative approach: Find any token program activity and filter for fresh mints
 */
async function getQuickTokenActivity(rpcUrl) {
  const tokens = [];
  const now = Math.floor(Date.now() / 1000);
  
  console.log('🔍 Alternative approach: Scanning for any token program activity (conservative)...');
  
  // Get recent signatures for both token programs - much smaller limits
  const [legacySigs, token2022Sigs] = await Promise.all([
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [SPL_TOKEN_PROGRAM, { limit: 25 }] // Reduced from 100 to 25
      }),
    }).then(r => r.json()).then(j => j.result || []),
    
    fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [SPL_TOKEN_PROGRAM_2022, { limit: 25 }] // Reduced from 100 to 25
      }),
    }).then(r => r.json()).then(j => j.result || [])
  ]);
  
  const allSigs = [...legacySigs, ...token2022Sigs];
  console.log(`📋 Found ${allSigs.length} total token program signatures`);
  
  // Filter for recent transactions
  const recentSigs = allSigs.filter(sig => 
    sig.blockTime && (now - sig.blockTime) <= FRESH_WINDOW_SECS
  );
  
  console.log(`⏰ Filtered to ${recentSigs.length} recent signatures`);
  
  // Process recent transactions - much smaller limit
  for (const sig of recentSigs.slice(0, 10)) { // Reduced from 20 to 10
    try {
      console.log(`🔍 Processing signature: ${sig.signature.slice(0, 8)}...`);
      
      const txRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [sig.signature, { 
            maxSupportedTransactionVersion: 0,
            encoding: 'jsonParsed'
          }],
        }),
      });
      
      const txData = await txRes.json();
      if (!txData.result) continue;
      
      // Look for any accounts that might be new mints
      const accountKeys = txData.result.transaction.message.accountKeys.map(k => k.toString());
      const instructions = txData.result.transaction.message.instructions;
      
      // Find accounts that are used in token program instructions
      const tokenProgramAccounts = new Set();
      
      for (const ix of instructions) {
        const pid = accountKeys[ix.programIdIndex];
        if (pid === SPL_TOKEN_PROGRAM || pid === SPL_TOKEN_PROGRAM_2022) {
          // Add all accounts used in this instruction
          for (const accountIndex of ix.accounts) {
            tokenProgramAccounts.add(accountKeys[accountIndex]);
          }
        }
      }
      
      console.log(`🔍 Found ${tokenProgramAccounts.size} accounts used in token program instructions`);
      
      // Check each account to see if it's a fresh mint
      for (const account of tokenProgramAccounts) {
        if (ESTABLISHED_TOKENS.has(account)) continue;
        
        // Use transaction blockTime directly instead of extra RPC call
        if (sig.blockTime < now - FRESH_WINDOW_SECS) {
          console.log(`⏰ Skip – account ${account.slice(0, 8)}... from old transaction`);
          continue;
        }
        
        console.log(`🎯 Found fresh mint: ${account} from transaction at ${new Date(sig.blockTime * 1000).toLocaleTimeString()}`);
        
        const tokenInfo = await getTokenMetadata(account, sig.blockTime, true);
        if (tokenInfo) {
          tokenInfo.isMoonshotLaunch = false;
          tokenInfo.programType = 'Token Activity';
          tokens.push(tokenInfo);
          console.log(`✅ Added fresh token: ${tokenInfo.name}`);
        }
        
        if (tokens.length >= 8) { // Reduced from 10 to 8
          console.log('✅ Reached token limit');
          return tokens;
        }
      }
      
      // Rate limiting between transactions
      await delay(500); // 500ms delay between transactions
      
    } catch (error) {
      console.warn(`⚠️ Error processing signature: ${error.message}`);
      continue;
    }
  }
  
  console.log(`📊 Found ${tokens.length} fresh tokens from activity scan`);
  return tokens;
}

export async function getLatestMoonshotTokens() {
  const rpcUrl = import.meta.env.VITE_QUICKNODE_RPC_URL;
  
  if (!rpcUrl) {
    console.error('❌ QuickNode RPC URL not found in environment variables');
    return [];
  }
  
  console.log(' Starting optimized QuickNode token tracking for fresh mints...');
  
  let allTokens = [];
  
  try {
    // Method 1: Quick recent mints check (find fresh initializeMint instructions)
    console.log('📡 Quick recent mints check (finding fresh initializeMint instructions)...');
    const recentMints = await getQuickRecentMints(rpcUrl);
    
    if (recentMints.length > 0) {
      console.log('✅ Found fresh token mints:', recentMints.length);
      allTokens.push(...recentMints);
    }
    
    // Method 2: Alternative approach - scan token program activity
    console.log('📡 Alternative approach: scanning token program activity...');
    const activityTokens = await getQuickTokenActivity(rpcUrl);
    
    if (activityTokens.length > 0) {
      console.log('✅ Found fresh tokens from activity scan:', activityTokens.length);
      allTokens.push(...activityTokens);
    }
    
    // Method 3: Quick Moonshot program check (fallback)
    console.log('📡 Quick Moonshot program check (finding interacting tokens)...');
    const moonshotTokens = await getQuickMoonshotCheck(rpcUrl);
    
    if (moonshotTokens.length > 0) {
      console.log('✅ Found fresh tokens from Moonshot program:', moonshotTokens.length);
      allTokens.push(...moonshotTokens);
    }
    
    // Deduplicate tokens by address
    const uniqueTokens = Array.from(
      new Map(allTokens.map(tok => [tok.address, tok])).values()
    );
    
    console.log(`📊 Deduplicated ${allTokens.length} total tokens to ${uniqueTokens.length} unique tokens`);
    
    if (uniqueTokens.length > 0) {
      return uniqueTokens;
    }
    
    console.log('⚠️ No recent fresh mints or Moonshot interactions found');
    return [];
    
  } catch (error) {
    console.error('❌ Error fetching token data:', error);
    
    // Final fallback: return mock data with error indicator
    const mockTokens = getMockMoonshotTokens();
    mockTokens.forEach(token => {
      token.errorFallback = true;
      token.status = '⚠️ RPC ERROR';
    });
    
    return mockTokens;
  }
}

async function getQuickMoonshotCheck(rpcUrl) {
  try {
    console.log('🔍 Finding fresh mints created in Moonshot program transactions (conservative)...');
    
    // Get recent signatures for Moonshot program - much smaller limit
    const signaturesRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          MOONSHOT_PROGRAM,
          { limit: 5 } // Reduced from 10 to 5
        ],
      }),
    });
    
    const signaturesData = await signaturesRes.json();
    if (!signaturesData.result || signaturesData.result.length === 0) {
      console.log('📭 No recent Moonshot program activity');
      return [];
    }
    
    console.log('🎯 Found', signaturesData.result.length, 'recent Moonshot transactions');
    
    const tokens = new Map(); // Use Map to avoid duplicates
    const now = Math.floor(Date.now() / 1000);
    
    // Process recent Moonshot transactions
    for (const sig of signaturesData.result) {
      try {
        // Only check recent transactions (last 24 hours)
        if (now - sig.blockTime > 86400) {
          console.log('⏰ Skipping old Moonshot transaction');
          continue;
        }
        
        console.log('🔍 Processing Moonshot transaction:', sig.signature.slice(0, 8) + '...');
        
        // Get transaction details with timeout
        const txRes = await Promise.race([
          fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'getTransaction',
              params: [sig.signature, { 
                maxSupportedTransactionVersion: 0,
                encoding: 'jsonParsed'
              }],
            }),
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), 3000)) // Reduced timeout
        ]);
        
        const txData = await txRes.json();
        if (!txData.result) continue;
        
        // Only look for fresh mints created in this transaction
        const rawMints = findNewMints(txData.result);
        
        for (const mintAddr of rawMints) {
          // Use transaction blockTime directly instead of extra RPC call
          if (sig.blockTime < now - FRESH_WINDOW_SECS) {
            console.log(`⏰ Skip – mint ${mintAddr.slice(0, 8)}... from old transaction`);
            continue;
          }
          
          // Get full token metadata
          const tokenInfo = await getTokenMetadata(mintAddr, sig.blockTime, true);
          if (tokenInfo && !ESTABLISHED_TOKENS.has(mintAddr)) {
            if (!tokens.has(mintAddr)) {
              tokenInfo.isMoonshotLaunch = true;
              tokenInfo.interactionType = 'Moonshot Program';
              tokens.set(mintAddr, tokenInfo);
              console.log('✅ Found fresh mint in Moonshot transaction:', tokenInfo.name);
            }
          }
          
          // Stop after processing a few transactions to avoid overwhelming
          if (tokens.size >= 5) { // Reduced from 8 to 5
            console.log('✅ Found enough fresh mints, stopping scan');
            break;
          }
        }
        
        if (tokens.size >= 5) break;
        
        // Rate limiting between Moonshot transactions
        await delay(1000); // 1 second delay between transactions
        
      } catch (error) {
        console.warn('⚠️ Error processing Moonshot transaction:', error.message);
        continue;
      }
    }
    
    const tokenArray = Array.from(tokens.values());
    console.log(`📊 Found ${tokenArray.length} unique fresh mints created in Moonshot transactions`);
    return tokenArray;
    
  } catch (error) {
    console.error('❌ Error in getQuickMoonshotCheck:', error);
    return [];
  }
}

async function getQuickRecentMints(rpcUrl) {
  try {
    console.log('🔍 Fetching last-24h initializeMint instructions from both SPL Token and Token-2022 programs...');
    
    // Scan both token program IDs
    const recentLegacy = await getQuickRecentMintsForProgram(rpcUrl, SPL_TOKEN_PROGRAM);
    const recent2022 = await getQuickRecentMintsForProgram(rpcUrl, SPL_TOKEN_PROGRAM_2022);
    const recentMints = [...recentLegacy, ...recent2022];
    
    console.log(`📊 Found ${recentMints.length} total fresh mints (${recentLegacy.length} SPL Token + ${recent2022.length} Token-2022)`);
    return recentMints;
    
  } catch (error) {
    console.error('❌ Error in getQuickRecentMints:', error);
    return [];
  }
}

async function extractTokenFromMoonshotTransaction(tx, blockTime) {
  try {
    const rpcUrl = import.meta.env.VITE_QUICKNODE_RPC_URL;
    
    // Look for token creation instructions in Moonshot transactions
    if (!tx.transaction || !tx.transaction.message || !tx.transaction.message.instructions) {
      return null;
    }
    
    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;
    
    // First, verify this transaction involves the Moonshot program
    const hasMoonshotProgram = accountKeys.some(key => key === MOONSHOT_PROGRAM);
    if (!hasMoonshotProgram) {
      return null;
    }
    
    console.log('🔍 Found Moonshot program transaction, analyzing instructions...');
    
    // Look for Moonshot program instructions that might create tokens
    for (const instruction of instructions) {
      if (accountKeys[instruction.programIdIndex] === MOONSHOT_PROGRAM) {
        console.log('🎯 Found Moonshot program instruction');
        
        // Get the accounts involved in this Moonshot instruction
        const accounts = instruction.accounts.map(index => accountKeys[index]);
        console.log('📋 Moonshot instruction accounts:', accounts.length);
        
        // Look for potential token mint accounts in the Moonshot instruction
        for (const account of accounts) {
          try {
            // Check if this account might be a token mint
            const accountInfoRes = await Promise.race([
              fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'getAccountInfo',
                  params: [account, { encoding: 'base64' }],
                }),
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Account timeout')), 3000))
            ]);
            
            const accountInfo = await accountInfoRes.json();
            if (accountInfo.result && accountInfo.result.value) {
              console.log('🔍 Checking account:', account.slice(0, 8) + '...');
              
              // This might be a token mint, get its metadata
              const tokenInfo = await getTokenMetadata(account, blockTime);
              if (tokenInfo) {
                console.log('✅ Found token from Moonshot instruction:', tokenInfo.name);
                // Mark this as a Moonshot launch
                tokenInfo.isMoonshotLaunch = true;
                return tokenInfo;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    // Also check for SPL token program instructions that might be part of Moonshot launches
    for (const instruction of instructions) {
      if (accountKeys[instruction.programIdIndex] === SPL_TOKEN_PROGRAM) {
        console.log('🎯 Found SPL token program instruction in Moonshot transaction');
        
        const accounts = instruction.accounts.map(index => accountKeys[index]);
        
        // Look for mint accounts (new tokens) - check only first few
        for (const account of accounts.slice(0, 3)) { // Limit to first 3 accounts
          try {
            // Quick check if this might be a token mint with timeout
            const accountInfoRes = await Promise.race([
              fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'getAccountInfo',
                  params: [account, { encoding: 'base64' }],
                }),
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Account timeout')), 3000))
            ]);
            
            const accountInfo = await accountInfoRes.json();
            if (accountInfo.result && accountInfo.result.value) {
              console.log('🔍 Checking SPL account:', account.slice(0, 8) + '...');
              
              // This might be a token mint, get its metadata
              const tokenInfo = await getTokenMetadata(account, blockTime);
              if (tokenInfo) {
                console.log('✅ Found token from SPL instruction in Moonshot transaction:', tokenInfo.name);
                // Mark this as a Moonshot launch
                tokenInfo.isMoonshotLaunch = true;
                return tokenInfo;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    console.log('❌ No token found in Moonshot transaction');
    return null;
  } catch (error) {
    console.error('❌ Error extracting token from Moonshot transaction:', error);
    return null;
  }
}

async function extractTokenFromTransaction(tx, blockTime) {
  try {
    const rpcUrl = import.meta.env.VITE_QUICKNODE_RPC_URL;
    
    // Look for token creation instructions
    if (!tx.transaction || !tx.transaction.message || !tx.transaction.message.instructions) {
      return null;
    }
    
    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;
    
    for (const instruction of instructions) {
      // Check if this is a token program instruction
      if (accountKeys[instruction.programIdIndex] === SPL_TOKEN_PROGRAM) {
        const accounts = instruction.accounts.map(index => accountKeys[index]);
        
        // Look for mint accounts - check only first few
        for (const account of accounts.slice(0, 3)) { // Limit to first 3 accounts
          try {
            // Quick check if this might be a token mint with timeout
            const accountInfoRes = await Promise.race([
              fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'getAccountInfo',
                  params: [account, { encoding: 'base64' }],
                }),
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Account timeout')), 3000))
            ]);
            
            const accountInfo = await accountInfoRes.json();
            if (accountInfo.result && accountInfo.result.value) {
              // This might be a token mint, get its metadata
              const tokenInfo = await getTokenMetadata(account, blockTime);
              if (tokenInfo) {
                return tokenInfo;
              }
            }
          } catch (error) {
            continue;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error extracting token info:', error);
    return null;
  }
}

function isMoonshotLaunch(tokenInfo) {
  // Filter out established tokens
  if (ESTABLISHED_TOKENS.has(tokenInfo.address)) {
    return false;
  }
  
  // Check if it's a recent launch (within last 6 hours for Moonshot)
  const now = Math.floor(Date.now() / 1000);
  if (now - tokenInfo.timestamp > 21600) {
    return false;
  }
  
  // Check for Moonshot launch characteristics
  const supply = parseFloat(tokenInfo.supply.replace(/,/g, ''));
  
  // Moonshot tokens typically have:
  // - High supply (millions or more)
  // - Low holder count initially
  // - Recent creation time
  
  if (supply < 100000) {
    return false;
  }
  
  if (tokenInfo.holders > 1000) {
    return false;
  }
  
  return true;
}

function isRecentLaunch(tokenInfo) {
  if (!tokenInfo || !tokenInfo.timestamp) {
    return false;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600; // 1 hour ago
  
  // Check if token was created in the past hour
  if (tokenInfo.timestamp < oneHourAgo) {
    console.log(`⏰ Token ${tokenInfo.name} is too old (${Math.floor((now - tokenInfo.timestamp) / 60)} minutes ago)`);
    return false;
  }
  
  // Filter out established tokens
  if (ESTABLISHED_TOKENS.has(tokenInfo.address)) {
    console.log(`🚫 Filtering out established token: ${tokenInfo.name}`);
    return false;
  }
  
  // Basic validation
  if (!tokenInfo.name || !tokenInfo.symbol || !tokenInfo.address) {
    console.log(`❌ Token missing required fields: ${tokenInfo.name || 'unknown'}`);
    return false;
  }
  
  // REMOVED: Over-aggressive supply filter that was hiding fresh meme tokens
  // Fresh tokens can have any supply, including very low or very high
  
  console.log(`✅ Token ${tokenInfo.name} passed recent launch checks`);
  return true;
}

async function getTokenMetadata(mintAddress, blockTime, allowZeroSupply = false) {
  try {
    console.log(`🔍 Getting metadata for mint: ${mintAddress.slice(0, 8)}...`);
    
    // Get token account info
    const rpcUrl = import.meta.env.VITE_QUICKNODE_RPC_URL;
    const accountRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [mintAddress, { encoding: 'jsonParsed' }],
      }),
    });

    const accountData = await accountRes.json();
    if (!accountData.result?.value) {
      console.log(`❌ No account data for mint ${mintAddress.slice(0, 8)}...`);
      return null;
    }

    const mintInfo = accountData.result.value.data.parsed.info;
    const rawSupply = parseInt(mintInfo.supply);
    const decimals = mintInfo.decimals;

    // Calculate actual supply by accounting for decimals
    const actualSupply = rawSupply / Math.pow(10, decimals);

    // Skip tokens with zero supply unless explicitly allowed
    if (actualSupply === 0 && !allowZeroSupply) {
      console.log(`⏩ Skip – zero supply token ${mintAddress.slice(0, 8)}...`);
      return null;
    }

    // Format supply for display
    const formattedSupply = actualSupply.toLocaleString();
    
    console.log(`📊 Token supply: ${formattedSupply} (raw: ${rawSupply}, decimals: ${decimals})`);
    
    // Try to get real token metadata from Moralis first
    let tokenName, tokenSymbol;
    const moralisData = await getMoralisTokenMetadata(mintAddress);
    
    if (moralisData) {
      tokenName = moralisData.name;
      tokenSymbol = moralisData.symbol;
      console.log(`✅ Using real token metadata: ${tokenName} (${tokenSymbol})`);
    } else {
      // Fallback to generated names
      tokenName = generateTokenName(mintAddress);
      tokenSymbol = generateTokenSymbol(mintAddress);
      console.log(`⚠️ Using generated token metadata: ${tokenName} (${tokenSymbol})`);
    }
    
    // Get token price and calculate FDV
    const priceData = await getTokenPrice(mintAddress);
    const usdPrice = priceData?.usdPrice;
    const fdv = calculateFDV(usdPrice, formattedSupply);
    
    // Calculate time ago
    const timeAgo = getTimeAgo(blockTime);
    const status = getStatus(blockTime);

    const tokenInfo = {
      address: mintAddress,
      name: tokenName,
      symbol: tokenSymbol,
      supply: formattedSupply,
      holders: Math.floor(Math.random() * 1000) + 50, // Mock data for now
      marketCap: formatFDV(fdv), // Use FDV as market cap for now
      price: formatPrice(usdPrice),
      fdv: formatFDV(fdv),
      usdPrice: usdPrice, // Raw price for calculations
      timestamp: blockTime,
      launchTime: timeAgo,
      status,
      isMoonshotLaunch: false,
      programType: 'Unknown'
    };

    console.log(`✅ Created token info: ${tokenName} (${tokenSymbol}) - Price: ${tokenInfo.price}, FDV: ${tokenInfo.fdv}`);
    return tokenInfo;

  } catch (error) {
    console.error(`❌ Error getting metadata for ${mintAddress.slice(0, 8)}...:`, error);
    return null;
  }
}

function generateTokenName(address) {
  const memeNames = [
    'SafeMoon', 'DogeElon', 'PepeInu', 'WojakCoin', 'ChadToken', 'BasedApe', 
    'RocketMoon', 'LamboCoin', 'MoonSafe', 'ElonDoge', 'CatInu', 'DogMoon',
    'SafeDoge', 'MoonPepe', 'InuSafe', 'ApeMoon', 'ChadMoon', 'BasedInu',
    'MoonToken', 'SafeInu', 'DogeMoon', 'PepeSafe', 'WojakMoon', 'ChadInu',
    'NewToken', 'LaunchToken', 'FreshToken', 'HotToken', 'TrendingToken'
  ];
  
  // Use last 4 characters of address to pick a name
  const lastChars = address.slice(-4);
  const index = parseInt(lastChars, 16) % memeNames.length;
  return memeNames[index];
}

function generateTokenSymbol(address) {
  const memeSymbols = [
    'SAFEMOON', 'DOGEELON', 'PEPEINU', 'WOJAK', 'CHAD', 'BASED', 
    'ROCKET', 'LAMBO', 'MOONSAFE', 'ELONDOGE', 'CATINU', 'DOGMOON',
    'SAFEDOGE', 'MOONPEPE', 'INUSAFE', 'APEMOON', 'CHADMOON', 'BASEDINU',
    'MOON', 'SAFEINU', 'DOGEMOON', 'PEPESAFE', 'WOJAKMOON', 'CHADINU',
    'NEW', 'LAUNCH', 'FRESH', 'HOT', 'TREND'
  ];
  
  // Use last 4 characters of address to pick a symbol
  const lastChars = address.slice(-4);
  const index = parseInt(lastChars, 16) % memeSymbols.length;
  return memeSymbols[index];
}

function getTimeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

function getStatus(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 300) return "🔥 HOT";
  if (diff < 1800) return "🚀 LAUNCHING";
  if (diff < 3600) return "📈 PUMPING";
  return "💎 DIAMOND HANDS";
}

/**
 * Detect newly created accounts that might be token mints
 */
function findNewlyCreatedAccounts(tx) {
  const newAccounts = [];
  if (!tx || !tx.meta) return newAccounts;

  console.log('🔍 Scanning for newly created accounts...');

  // Check which accounts were created in this transaction
  const accountKeys = tx.transaction.message.accountKeys.map(k => k.toString());
  const preBalances = tx.meta.preBalances || [];
  const postBalances = tx.meta.postBalances || [];
  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  // Look for accounts that appear in postTokenBalances but not preTokenBalances
  const preTokenAccounts = new Set(preTokenBalances.map(b => b.accountIndex));
  const postTokenAccounts = new Set(postTokenBalances.map(b => b.accountIndex));

  for (const postToken of postTokenBalances) {
    if (!preTokenAccounts.has(postToken.accountIndex)) {
      const accountAddress = accountKeys[postToken.accountIndex];
      console.log(`🆕 Found newly created token account: ${accountAddress}`);
      
      // Check if this account has a mint (token account)
      if (postToken.mint) {
        console.log(`🎯 Token account ${accountAddress} holds mint: ${postToken.mint}`);
        newAccounts.push(postToken.mint);
      }
    }
  }

  // Also check for accounts with balance changes that might be new mints
  for (let i = 0; i < accountKeys.length; i++) {
    const preBalance = preBalances[i] || 0;
    const postBalance = postBalances[i] || 0;
    
    // If an account went from 0 to having a balance, it might be newly created
    if (preBalance === 0 && postBalance > 0) {
      const accountAddress = accountKeys[i];
      console.log(`💰 Account ${accountAddress} went from 0 to ${postBalance} lamports`);
      
      // Check if this account is used in token program instructions
      const isUsedInTokenProgram = tx.transaction.message.instructions.some(ix => {
        const pid = accountKeys[ix.programIdIndex];
        return (pid === SPL_TOKEN_PROGRAM || pid === SPL_TOKEN_PROGRAM_2022) && 
               ix.accounts.includes(i);
      });
      
      if (isUsedInTokenProgram) {
        console.log(`🎯 Account ${accountAddress} is used in token program - potential new mint`);
        newAccounts.push(accountAddress);
      }
    }
  }

  console.log(`📊 Found ${newAccounts.length} potential newly created accounts`);
  return [...new Set(newAccounts)];
}

function findNewMints(tx) {
  const mints = [];
  if (!tx) return mints;

  console.log('🔍 Scanning transaction for initializeMint instructions...');

  // combine top-level + inner instructions
  const top = tx.transaction.message.instructions;
  const inner = (tx.meta?.innerInstructions || []).flatMap((ii) => ii.instructions);
  const allIx = [...top, ...inner];

  console.log(`📋 Found ${top.length} top-level instructions and ${inner.length} inner instructions`);

  const keys = tx.transaction.message.accountKeys.map((k) => k.toString());

  // Enhanced mint detection - look for more instruction types
  const MINT_INSTRUCTION_TYPES = [
    'initializeMint', 'initializeMint2', 'initializeMint3',
    'createMint', 'createMint2', 'createMint3',
    'mintTo', 'mintTo2', 'mintTo3'
  ];

  for (let i = 0; i < allIx.length; i++) {
    const ix = allIx[i];
    const pid = keys[ix.programIdIndex] || ix.programId;
    
    // Debug: Log every instruction's program ID and type
    console.log(`→ instruction #${i}: programId = ${pid}, type = ${ix.parsed?.type || 'N/A'}`);
    
    // Check if this is a token program instruction
    if (pid !== SPL_TOKEN_PROGRAM && pid !== SPL_TOKEN_PROGRAM_2022) {
      continue;
    }

    console.log(`🔍 Checking instruction from ${pid === SPL_TOKEN_PROGRAM ? 'SPL Token' : 'Token-2022'} program`);

    // Check parsed instructions first
    if (ix.parsed) {
      console.log(`📝 Parsed instruction type: ${ix.parsed.type}`);
      
      if (MINT_INSTRUCTION_TYPES.includes(ix.parsed.type)) {
        console.log(`🎉 Found ${ix.parsed.type} instruction!`);
        
        // Extract mint address from parsed info
        const mintAddr = ix.parsed.info?.mint || ix.parsed.info?.destination || keys[ix.accounts[0]];
        if (mintAddr) {
          console.log(`✅ Found new mint from parsed: ${mintAddr}`);
          mints.push(mintAddr);
        }
      }
    } else {
      // Fallback: check raw instruction data for known patterns
      console.log(`🔍 No parsed data, checking raw instruction...`);
      
      if (ix.data) {
        // Look for mint addresses in account keys that might be new mints
        // For initializeMint, the mint address is typically the first account
        if (ix.accounts && ix.accounts.length > 0) {
          const potentialMint = keys[ix.accounts[0]];
          console.log(`🔍 Potential mint from account 0: ${potentialMint}`);
          
          // Additional validation: check if this account appears to be a mint
          // by looking at its usage in the transaction
          const accountUsage = allIx.filter(instruction => 
            instruction.accounts && instruction.accounts.includes(ix.accounts[0])
          ).length;
          
          console.log(`📊 Account ${potentialMint.slice(0, 8)}... used in ${accountUsage} instructions`);
          
          // If this account is used in multiple token program instructions, it's likely a mint
          if (accountUsage >= 2) {
            console.log(`✅ Likely new mint based on usage pattern: ${potentialMint}`);
            mints.push(potentialMint);
          }
        }
      }
    }
  }
  
  // Also check for newly created accounts that might be mints
  const newlyCreated = findNewlyCreatedAccounts(tx);
  mints.push(...newlyCreated);
  
  const uniqueMints = [...new Set(mints)]; // uniquify
  console.log(`📊 Found ${uniqueMints.length} unique new mints in transaction`);
  
  if (uniqueMints.length === 0) {
    console.log('🔍 Debug: No mints found. Let\'s check what instructions we have:');
    for (let i = 0; i < Math.min(allIx.length, 5); i++) {
      const ix = allIx[i];
      const pid = keys[ix.programIdIndex] || ix.programId;
      console.log(`  Instruction ${i}: Program ${pid.slice(0, 8)}..., Parsed: ${ix.parsed?.type || 'N/A'}`);
    }
  }
  
  return uniqueMints;
}

// Fallback function for when RPC calls fail
export function getMockMoonshotTokens() {
  return [
    {
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      name: "SafeMoon 2.0",
      symbol: "SAFEMOON2",
      supply: "1,000,000,000",
      holders: 1247,
      marketCap: "$2.1M",
      timestamp: Math.floor(Date.now() / 1000) - 120,
      launchTime: "2 minutes ago",
      status: "🔥 HOT",
      isMoonshotLaunch: true
    },
    {
      address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
      name: "DogeElonInu",
      symbol: "DOGEELON",
      supply: "500,000,000",
      holders: 567,
      marketCap: "$890K",
      timestamp: Math.floor(Date.now() / 1000) - 300,
      launchTime: "5 minutes ago",
      status: "🚀 LAUNCHING",
      isMoonshotLaunch: true
    },
    {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "USDC Rug",
      symbol: "USDC",
      supply: "1,000,000",
      holders: 892,
      marketCap: "$1.5M",
      timestamp: Math.floor(Date.now() / 1000) - 600,
      launchTime: "10 minutes ago",
      status: "📈 PUMPING",
      isMoonshotLaunch: false
    }
  ];
}

/**
 * Get token price from Moralis API using direct fetch
 */
async function getTokenPrice(mintAddress) {
  try {
    if (!MORALIS_API_KEY) {
      console.log('⚠️ Moralis API key not found, skipping price fetch');
      return null;
    }

    console.log(`💰 Fetching price for token: ${mintAddress.slice(0, 8)}...`);
    
    const response = await fetch(`${MORALIS_BASE_URL}/${mintAddress}/price`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    });

    if (!response.ok) {
      console.log(`❌ Moralis API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const priceData = await response.json();
    console.log(`📊 Price data for ${mintAddress.slice(0, 8)}...:`, priceData);

    if (priceData && priceData.usdPrice) {
      const usdPrice = parseFloat(priceData.usdPrice);
      console.log(`✅ Got price: $${usdPrice} for ${mintAddress.slice(0, 8)}...`);
      return {
        usdPrice,
        nativePrice: priceData.nativePrice,
        exchangeName: priceData.exchangeName
      };
    } else {
      console.log(`❌ No price data available for ${mintAddress.slice(0, 8)}...`);
      return null;
    }

  } catch (error) {
    console.error(`❌ Error fetching price for ${mintAddress.slice(0, 8)}...:`, error.message);
    return null;
  }
}

/**
 * Calculate FDV (Fully Diluted Valuation) from price and supply
 */
function calculateFDV(usdPrice, supply) {
  if (!usdPrice || !supply) return null;
  
  // Convert supply string to number (remove commas and parse)
  const supplyNumber = parseFloat(supply.replace(/,/g, ''));
  const fdv = usdPrice * supplyNumber;
  
  return fdv;
}

/**
 * Format price and FDV for display
 */
function formatPrice(price) {
  if (!price) return 'N/A';
  if (price < 0.000001) return `$${price.toExponential(4)}`;
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  if (price < 1000000) return `$${(price / 1000).toFixed(2)}K`;
  return `$${(price / 1000000).toFixed(2)}M`;
}

function formatFDV(fdv) {
  if (!fdv) return 'N/A';
  if (fdv < 1000) return `$${fdv.toFixed(2)}`;
  if (fdv < 1000000) return `$${(fdv / 1000).toFixed(2)}K`;
  if (fdv < 1000000000) return `$${(fdv / 1000000).toFixed(2)}M`;
  return `$${(fdv / 1000000000).toFixed(2)}B`;
}

/**
 * Get token metadata from Moralis API using direct fetch
 */
async function getMoralisTokenMetadata(mintAddress) {
  try {
    if (!MORALIS_API_KEY) {
      console.log('⚠️ Moralis API key not found, using generated names');
      return null;
    }

    console.log(`🔍 Fetching token metadata from Moralis for: ${mintAddress.slice(0, 8)}...`);
    
    const response = await fetch(`${MORALIS_BASE_URL}/${mintAddress}/metadata`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-Key': MORALIS_API_KEY
      },
    });

    if (!response.ok) {
      console.log(`❌ Moralis API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('📋 Moralis response:', data);

    // Check if we got valid metadata
    if (data && data.name && data.symbol) {
      console.log(`✅ Got token metadata: ${data.name} (${data.symbol})`);
      return {
        name: data.name,
        symbol: data.symbol,
        standard: data.standard || 'SPL'
      };
    } else {
      console.log('❌ Invalid token metadata from Moralis');
      return null;
    }

  } catch (error) {
    console.error('❌ Error fetching Moralis metadata:', error);
    return null;
  }
}

/**
 * Get recent mints from a specific token program with proper pagination and batching
 */
async function getQuickRecentMintsForProgram(rpcUrl, programId) {
  const tokens = [];
  const now = Math.floor(Date.now() / 1000);
  let before = null; // pagination cursor

  console.log(`🔍 Scanning ${programId === SPL_TOKEN_PROGRAM ? 'SPL Token' : 'Token-2022'} program with conservative batching...`);

  // Clean old cache entries
  cleanCache();

  // Limit to 4 pages maximum to avoid overwhelming RPC (increased for debugging)
  let pageCount = 0;
  const MAX_PAGES = 4; // Temporarily increased from 2 to 4 for debugging

  while (pageCount < MAX_PAGES) {
    pageCount++;
    console.log(`📄 Processing page ${pageCount}/${MAX_PAGES}`);
    
    const sigRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignaturesForAddress',
        params: [
          programId,
          { limit: SIG_BATCH, before }
        ],
      }),
    }).then(r => r.json());

    const sigs = sigRes.result || [];
    if (!sigs.length) {
      console.log('📭 No more signatures found');
      break;
    }

    console.log(`📋 Processing batch of ${sigs.length} signatures`);

    // Filter for recent signatures first
    const recentSigs = sigs.filter(s => s.blockTime && (now - s.blockTime) <= FRESH_WINDOW_SECS);
    if (recentSigs.length === 0) {
      console.log(`⏰ Crossed time window, stopping pagination`);
      return tokens;
    }

    console.log(`⏰ Found ${recentSigs.length} recent signatures in this batch`);

    // Limit to first 20 recent signatures to be conservative
    const limitedSigs = recentSigs.slice(0, 20);
    console.log(`🎯 Processing limited set of ${limitedSigs.length} signatures`);

    // Batch get all transactions
    const signatures = limitedSigs.map(s => s.signature);
    const transactions = await batchGetTransactions(rpcUrl, signatures);
    
    console.log(`📦 Retrieved ${transactions.length} transactions from batch`);

    // Process transactions in parallel
    const mintPromises = [];
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const sig = limitedSigs[i];
      
      if (!tx || !sig) continue;

      const rawMints = findNewMints(tx);
      // **only** keep those created in our window:
      const newMints = rawMints.filter(m => sig.blockTime >= now - FRESH_WINDOW_SECS);
      
      for (const mintAddr of newMints) {
        mintPromises.push(processMint(mintAddr, sig.blockTime, rpcUrl, programId));
      }
    }

    // Process all mints in parallel
    const results = await Promise.allSettled(mintPromises);
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      
      if (result.status === 'fulfilled' && result.value) {
        tokens.push(result.value);
        console.log(`✅ Added fresh mint: ${result.value.name}`);
        
        if (tokens.length >= 15) { // Reduced from 25 to 15
          console.log('✅ Reached token limit, stopping scan');
          return tokens;
        }
      }
    }

    before = sigs[sigs.length - 1].signature; // next page
    console.log(`📄 Moving to next page, before: ${before.slice(0, 8)}...`);
    
    // Rate limiting between pages
    if (pageCount < MAX_PAGES) {
      console.log(`⏳ Rate limiting: waiting ${RATE_LIMIT_DELAY * 2}ms before next page...`);
      await delay(RATE_LIMIT_DELAY * 2);
    }
  }
  
  return tokens;
}

// Helper function to process a single mint - simplified without extra RPC calls
async function processMint(mint, blockTime, rpcUrl, programId) {
  if (ESTABLISHED_TOKENS.has(mint)) {
    console.log(`🚫 Skip – established token ${mint.slice(0, 8)}...`);
    return null;
  }

  // We already filtered by blockTime, so no extra RPC needed
  console.log(`🎯 Processing mint ${mint.slice(0, 8)}... created at ${new Date(blockTime * 1000).toLocaleTimeString()}`);

  const meta = await getTokenMetadata(mint, blockTime, true);
  if (meta) {
    meta.isMoonshotLaunch = false;
    meta.programType = programId === SPL_TOKEN_PROGRAM ? 'SPL Token' : 'Token-2022';
    return meta;
  }
  
  return null;
} 