import express from 'express';
import twilio from 'twilio';

const app = express();
app.use(express.json());

// --- DEBUG SECTION ---
console.log("Checking Environment Variables...");
console.log("TWILIO_ACCOUNT_SID found:", process.env.TWILIO_ACCOUNT_SID ? "YES (Starts with " + process.env.TWILIO_ACCOUNT_SID.substring(0, 4) + ")" : "NO");
console.log("TWILIO_AUTH_TOKEN found:", process.env.TWILIO_AUTH_TOKEN ? "YES" : "NO");
console.log("TWILIO_NUMBER found:", process.env.TWILIO_NUMBER ? "YES" : "NO");
// ---------------------

app.post('/elevenlabs-sms', async (req, res) => {
    const { phone_number, message } = req.body;
    
    try {
        // This is where the "username is required" error happens if SID is missing
        const client = twilio(
            process.env.TWILIO_ACCOUNT_SID, 
            process.env.TWILIO_AUTH_TOKEN
        );

        await client.messages.create({
            body: message,
            from: process.env.TWILIO_NUMBER,
            to: phone_number
        });
        
        console.log(`Success: Sent to ${phone_number}`);
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error("Twilio Error:", error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
