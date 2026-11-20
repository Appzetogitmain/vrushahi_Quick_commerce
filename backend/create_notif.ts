import mongoose from 'mongoose';
import Notification from './src/models/Notification';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  await Notification.create({
    recipientType: 'Customer', // Or 'All'
    title: 'Welcome to Vrumarket!',
    message: 'This is a test notification from Postman setup.',
    type: 'Info',
    isRead: false,
    priority: 'Medium'
  });
  console.log('Notification Created!');
  process.exit(0);
}).catch(console.error);
