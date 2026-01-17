import express from 'express';
import twilio from 'twilio';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize the Twilio client using your environment variables
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- DEBUG SECTION ---
console.log("Checking Credentials...");
console.log("AGENT_ID found:", process.env.AGENT_ID ? "YES" : "NO");
console.log("XI_API_KEY found:", process.env.XI_API_KEY ? "YES" : "NO");
console.log("TWILIO_NUMBER found:", process.env.TWILIO_NUMBER ? "YES" : "NO");

// ROUTE 1: Triggered by ElevenLabs Agent (Sending a text)
app.post('/elevenlabs-sms', async (req, res) => {
    const { phone_number, message } = req.body;
    try {
        await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_NUMBER,
            to: phone_number
        });
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error("Tool Error:", error.message);
        res.status(500).json({ status: 'error' });
    }
});

// ROUTE 2: Triggered by Twilio (Receiving a text)
app.post('/incoming-sms', async (req, res) => {
    const incomingMsg = req.body.Body;
    const customerPhone = req.body.From;

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.AGENT_ID}/text-chat`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: incomingMsg })
        });

        const data = await response.json();
        const aiReply = data.agent_response;

        await twilioClient.messages.create({
            body: aiReply,
            from: process.env.TWILIO_NUMBER,
            to: customerPhone
        });

        res.status(200).send('<Response></Response>'); 
    } catch (error) {
        console.error("Inbound Error:", error);
        res.status(500).end();
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
