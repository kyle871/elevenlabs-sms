// Add this new route to your existing server.js
app.post('/incoming-sms', async (req, res) => {
    const incomingMsg = req.body.Body; // The text the customer sent
    const customerPhone = req.body.From; // The customer's phone number

    try {
        // 1. Send the text to ElevenLabs Agent API
        // You will need your Agent ID from the ElevenLabs dashboard
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${process.env.AGENT_ID}/text-chat`, {
            method: 'POST',
            headers: {
                'xi-api-key': process.env.XI_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: incomingMsg })
        });

        const data = await response.json();
        const aiReply = data.agent_response; // The AI's text response

        // 2. Reply back to the customer via Twilio
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body: aiReply,
            from: process.env.TWILIO_NUMBER,
            to: customerPhone
        });

        res.status(200).send('<Response></Response>'); // Tell Twilio we handled it
    } catch (error) {
        console.error("Error handling incoming SMS:", error);
        res.status(500).end();
    }
});
