import express from 'express';
import twilio from 'twilio';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- STARTUP DEBUG LOGS ---
console.log("--- Initializing Server ---");
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "YES" : "NO");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "YES" : "NO");
console.log("TWILIO_NUMBER:", process.env.TWILIO_NUMBER ? "YES" : "NO");
console.log("AGENT_ID:", process.env.AGENT_ID ? "YES" : "NO");
console.log("XI_API_KEY:", process.env.XI_API_KEY ? "YES" : "NO");

// 1. OUTBOUND: Triggered by the ElevenLabs Agent Tool (AI initiates a text)
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

// 2. INBOUND: Triggered by Twilio when you text your Twilio number
app.post('/incoming-sms', async (req, res) => {
    const customerMsg = req.body.Body;
    const customerPhone = req.body.From;
    console.log(`Inbound from ${customerPhone}: "${customerMsg}"`);

    try {
        // Step A: Send to ElevenLabs with the "text_only" override
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.AGENT_ID}/text-chat`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                text: customerMsg,
                // CRITICAL: Forces ElevenLabs to return a text response in agent_response
                conversation_config_override: {
                    conversation: {
                        text_only: true
                    }
                }
            })
        });

        const data = await response.json();
        
        // Extract the reply from the specific ElevenLabs field
        const aiReply = data.agent_response; 
        console.log(`AI Brain Reply: "${aiReply}"`);

        // Step B: Safety check to prevent Twilio "Empty Body" error
        if (!aiReply || aiReply === "undefined") {
            console.error("Error: ElevenLabs returned an empty response. Verify Security tab overrides are ON.");
            return res.status(200).send('<Response></Response>'); 
        }

        // Step C: Send the AI's response back to your phone
        await twilioClient.messages.create({
            body: aiReply,
            from: process.env.TWILIO_NUMBER,
            to: customerPhone
        });

        console.log("Inbound Reply Sent Successfully!");
        res.status(200).send('<Response></Response>'); 
    } catch (error) {
        console.error("Inbound Error logic:", error.message);
        res.status(500).end();
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
