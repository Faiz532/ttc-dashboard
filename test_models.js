require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Hacky way to list models since the SDK might not expose it easily in this version
// OR use curl in the next step. But let's try to just test a few well known ones 
// and print more descriptive feedback.

const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-latest",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-1.0-pro"
];

async function testAll() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    for (const m of modelsToTest) {
        console.log(`\nTesting ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("Test");
            console.log(`✅ SUCCESS: ${m} is available!`);
            process.exit(0); // Found one!
        } catch (e) {
            console.log(`❌ Failed ${m}: ${e.message.split('[')[0]}`); // Shorten error
        }
    }
}

testAll();
