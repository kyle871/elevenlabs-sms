import express from 'express';
import twilio from 'twilio';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.post('/incoming-sms', async (req, res) => {
    const customerMsg = req.body.Body;
    const customerPhone = req.body.From;
    console.log(`Inbound from ${customerPhone}: "${customerMsg}"`);

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.AGENT_ID}/text-chat`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                text: customerMsg,
                conversation_config_override: {
                    conversation: {
                        text_only: true
                    }
                }
            })
        });

        const data = await response.json();
        
        // --- CRITICAL DEBUG LINE ---
        console.log("RAW ELEVENLABS RESPONSE:", JSON.stringify(data));

        // Attempting to find the reply in multiple common fields
        const aiReply = data.agent_response || data.message || (data.transcript && data.transcript[0]?.message);
        
        console.log(`Extracted AI Reply: "${aiReply}"`);

        if (!aiReply || aiReply === "undefined") {
            // This will help us see if it's an API error like "Unauthorized"
            console.error("AI reply failed. Check RAW ELEVENLABS RESPONSE above.");
            return res.status(200).send('<Response></Response>'); 
        }

        await twilioClient.messages.create({
            body: aiReply,
            from: process.env.TWILIO_NUMBER,
            to: customerPhone
        });

        res.status(200).send('<Response></Response>'); 
    } catch (error) {
        console.error("Inbound Error logic:", error.message);
        res.status(500).end();
    }
});

// Outbound tool endpoint (keep this as is)
app.post('/elevenlabs-sms', async (req, res) => {
    const { phone_number, message } = req.body;
    try {
        await twilioClient.messages.create({ body: message, from: process.env.TWILIO_NUMBER, to: phone_number });
        res.status(200).json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
