import {GoogleGenAI} from '@google/genai';
import readline from 'readline';

// Create readline interface for conversation
const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

async function main() {
   const ai = new GoogleGenAI({ apiKey: "your_api_key_here" });

   console.log("🤖 Welcome to AI Conversation! Type 'quit' to exit.");
   console.log("💬 Start chatting with the AI...\n");

   while (true) {
      try {
         // Get user input
         const userInput = await new Promise((resolve) => {
            rl.question('👤 You: ', resolve);
         });

         // Check if user wants to quit
         if (userInput.toLowerCase() === 'quit' || userInput.toLowerCase() === 'exit') {
            console.log("👋 Goodbye!");
            rl.close();
            break;
         }

         if (!userInput.trim()) {
            console.log("🤖 AI: Please say something!");
            continue;
         }

         console.log("🤖 AI: Thinking...");

         // Generate AI response with audio
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: userInput }] }],
            config: {
               responseModalities: ['AUDIO'],
               speechConfig: {
                  voiceConfig: {
                     prebuiltVoiceConfig: { voiceName: 'Kore' },
                  },
               },
            },
         });

         const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
         
         if (data) {
            // Convert base64 audio to buffer
            const audioBuffer = Buffer.from(data, 'base64');
            
            // Create audio blob and play it (simulated)
            console.log("🔊 Playing AI response...");
            
            // For now, we'll just indicate that audio would play
            // In a real web environment, you would create an Audio object and play it
            console.log("🎵 [Audio would play here in a web environment]");
            
            // You could also save it temporarily and play it if needed
            // const tempFileName = `temp_${Date.now()}.wav`;
            // await saveWaveFile(tempFileName, audioBuffer);
            // console.log(`Audio saved temporarily as ${tempFileName}`);
            
         } else {
            console.log("❌ No audio generated");
         }

         console.log(""); // Empty line for spacing

      } catch (error) {
         console.error("❌ Error:", error.message);
         console.log(""); // Empty line for spacing
      }
   }
}

// Keep the saveWaveFile function in case you need it later
async function saveWaveFile(
   filename,
   pcmData,
   channels = 1,
   rate = 24000,
   sampleWidth = 2,
) {
   return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filename, {
            channels,
            sampleRate: rate,
            bitDepth: sampleWidth * 8,
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      writer.write(pcmData);
      writer.end();
   });
}

await main();
