import mongoose from 'mongoose';
import Admin from '../models/Admin';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const a = await Admin.findOne({email: 'dsudhir005@yahoo.com'}).select('+password');
  console.log('Old Hash:', a?.password);
  if (a) {
    a.password = 'NewPass@123';
    console.log('Is modified:', a.isModified('password'));
    await a.save();
    console.log('Saved');
    const b = await Admin.findOne({email: 'dsudhir005@yahoo.com'}).select('+password');
    console.log('New Hash:', b?.password);
    
    // revert
    b!.password = 'Admin@123';
    await b!.save();
    console.log('Reverted');
  }
  process.exit(0);
});
