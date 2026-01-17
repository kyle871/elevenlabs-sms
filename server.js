import express from 'express';
import twilio from 'twilio';

const app = express();

// Required to read the JSON data sent by ElevenLabs
app.use(express.json());

app.post('/elevenlabs-sms', async (req, res) => {
    const { phone_number, message } = req.body;
    
    // Pulls secrets from your Render Environment tab
    const client = twilio(
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
