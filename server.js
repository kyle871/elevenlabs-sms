const express = require('express');
const twilio = require('twilio');
const app = express();

// This line allows the server to read the JSON data sent by ElevenLabs
app.use(express.json());

app.post('/elevenlabs-sms', async (req, res) => {
    // These names must match the "Properties" you set in ElevenLabs
    const { phone_number, message } = req.body;
    
    // This pulls your secrets from the Render Environment tab
    const client = new twilio(
        process.env.TWILIO_ACCOUNT_SID, 
        process.env.TWILIO_AUTH_TOKEN
    );

    try {
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_NUMBER,
            to: phone_number
        });
        console.log(`Success: Message sent to ${phone_number}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error(`Error: ${error.message}`);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Render uses port 10000 by default for free services
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
