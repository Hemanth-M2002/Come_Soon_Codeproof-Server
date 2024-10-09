const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;  // Fallback port

// Middleware
app.use(cors());
app.use(express.json());  // Use express.json() for JSON requests

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// Email schema
const emailSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true }
});

const Subscriber = mongoose.model('Subscriber', emailSchema);

// Nodemailer setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', // Gmail SMTP server
    port: 587, // Gmail SMTP port
    secure: false, // Use TLS
    auth: {
        user: process.env.EMAIL, // Your email address
        pass: process.env.EMAIL_PASS // Your app password
    }
});

// API route for subscribing
app.post('/api/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Save email to database
        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        // Send confirmation email
        const mailOptions = {
            from: `Your Store <${process.env.EMAIL}>`,
            to: email,
            subject: 'Subscription Confirmation',
            text: 'Thank you for subscribing to our online store. You will receive $15 credit for your next purchase!'
        };

        // Sending the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent:', info.response);

        // Schedule the follow-up email
        const followUpDelay = 60000; // 10 sec delay (in milliseconds)
        setTimeout(() => {
            const followUpMailOptions = {
                from: `Your Store <${process.env.EMAIL}>`,
                to: email,
                subject: 'Website Live Notification',
                text: 'Good news! The website is now live and ready for use. Visit it here: [https:google.com].'
            };

            transporter.sendMail(followUpMailOptions, (error, info) => {
                if (error) {
                    console.log('Error occurred while sending the follow-up email:', error.message);
                } else {
                    console.log('Follow-up email sent successfully:', info.response);
                }
            });
        }, followUpDelay);

        return res.status(200).json({ message: 'Subscription successful, confirmation email sent.' });

    } catch (error) {
        if (error.code === 11000) {  // Duplicate key error (email already exists)
            return res.status(400).json({ error: 'This email is already subscribed.' });
        }
        console.error('Error during subscription:', error);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.message);
    if (!err.statusCode) err.statusCode = 500;
    res.status(err.statusCode).send(err.message);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});