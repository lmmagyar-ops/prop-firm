import { ClobClient } from "@polymarket/clob-client";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const args = process.argv.slice(2);
const privateKey = args[0] || process.env.PRIVATE_KEY;

if (!privateKey) {
    console.error("❌ Usage: npx tsx src/scripts/generate-clob-keys.ts <YOUR_PRIVATE_KEY>");
    process.exit(1);
}

async function generate() {
    const privateKey = process.env.CLOB_PRIVATE_KEY;

    if (!privateKey) {
        console.error("❌ CLOB_PRIVATE_KEY not found in environment variables");
        process.exit(1);
    }

    console.log("🔐 Deriving CLOB Keys from Private Key...");

    try {
        const wallet = new ethers.Wallet(privateKey);
        const chainId = 137; // Polygon Mainnet

        console.log(`👤 Wallet Address: ${wallet.address}`);

        // Monkey-patch for Ethers v6 compatibility with ClobClient
        // ClobClient tries to call _signTypedData (v5) but v6 only has signTypedData
        // @ts-ignore
        wallet._signTypedData = wallet.signTypedData;

        // Initialize CLOB Client (L1 Auth)
        const client = new ClobClient("https://clob.polymarket.com", chainId, wallet);

        // Step 1: Ensure Proxy is Derived/Initialized (Fixes 400 Bad Request for new wallets)
        console.log("🛠️  Ensuring Proxy Account is initialized...");
        try {
            const proxy = await client.deriveProxy();
            console.log(`✅ Proxy Address: ${proxy}`);
        } catch (proxyError) {
            console.log("⚠️  Proxy derivation info:", (proxyError as any).message);
            // Verify if it's just already existing or actual error, usually safe to proceed if it exists
        }

        // Step 2: Derive L2 API Keys
        console.log("🔑 Creating/Fetching API Keys...");
        const creds = await client.createOrDeriveApiKey();

        // Debug: Log the full response
        console.log("\n🔍 Full Response Object:", JSON.stringify(creds, null, 2));

        console.log("\n✅ SUCCESS! Here are your API Keys:");
        console.log("----------------------------------------");
        console.log(`CLOB_API_KEY=${creds.apiKey || creds.key || 'undefined'}`);
        console.log(`CLOB_API_SECRET=${creds.secret}`);
        console.log(`CLOB_API_PASSPHRASE=${creds.passphrase}`);
        console.log("----------------------------------------");
        console.log("👉 Add these to your .env file.");

    } catch (error: any) {
        console.error("❌ Failed to derive keys:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

generate();
