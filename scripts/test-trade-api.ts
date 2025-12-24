// Test script to debug trade execution
import * as dotenv from "dotenv";
dotenv.config();

async function testTrade() {
    try {
        console.log("🧪 Testing trade execution...\n");

        const response = await fetch("http://localhost:3000/api/trade/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: "demo-user",
                marketId: "32666",
                outcome: "YES",
                amount: 100
            })
        });

        const data = await response.json();

        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.success) {
            console.log("\n✅ Trade successful!");
            console.log("Position:", data.position);
        } else {
            console.log("\n❌ Trade failed!");
            console.log("Error:", data.error);
        }

    } catch (error) {
        console.error("❌ Request failed:", error);
    }
}

testTrade();
