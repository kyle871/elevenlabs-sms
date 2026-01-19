import express from 'express';
import twilio from 'twilio';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Twilio client using environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- STARTUP DEBUG LOGS ---
console.log("--- Initializing Server ---");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "YES" : "NO");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "YES" : "NO");
console.log("TWILIO_NUMBER:", process.env.TWILIO_NUMBER ? "YES" : "NO");
console.log("AGENT_ID:", process.env.AGENT_ID ? "YES" : "NO");
console.log("XI_API_KEY:", process.env.XI_API_KEY ? "YES" : "NO");

// 1. OUTBOUND: Triggered by the ElevenLabs Agent Tool (AI starts the text)
app.post('/elevenlabs-sms', async (req, res) => {
    const { phone_number, message } = req.body;
    console.log(`Outbound Request: Sending to ${phone_number}`);

    try {
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_NUMBER,
            to: phone_number
        });
        console.log("Outbound Success!");
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error("Outbound Error:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// 2. INBOUND: Triggered by Twilio when a customer texts your number
app.post('/incoming-sms', async (req, res) => {
    const customerMsg = req.body.Body;
    const customerPhone = req.body.From;
    console.log(`Inbound Message from ${customerPhone}: "${customerMsg}"`);

    try {
        // Step A: Send the text to the ElevenLabs Agent Brain
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.AGENT_ID}/text-chat`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: customerMsg })
        });

        const data = await response.json();
        
        // FIX: Specifically access 'agent_response' field from ElevenLabs
        const aiReply = data.agent_response; 
        console.log(`AI Brain Reply: "${aiReply}"`);

        // Step B: Safety check to prevent Twilio from crashing on empty/undefined body
        if (!aiReply || aiReply === "undefined") {
            console.error("Error: ElevenLabs returned an empty or undefined response.");
            return res.status(200).send('<Response></Response>'); 
        }

        // Step C: Text the AI's reply back to the customer via Twilio
        await twilioClient.messages.create({
            body: aiReply,
            from: process.env.TWILIO_NUMBER,
            to: customerPhone
        });

        console.log("Inbound Reply Sent Successfully!");
        res.status(200).send('<Response></Response>'); 
    } catch (error) {
