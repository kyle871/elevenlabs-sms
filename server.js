import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.json());

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

app.post("/send-sms", async (req, res) => {
  const { phoneNumber, message } = req.body;

  await client.messages.create({
    body: message,
    from: process.env.TWILIO_NUMBER,
    to: phoneNumber
  });

  res.json({ success: true });
});

app.listen(3000, () => console.log("Server running"));
