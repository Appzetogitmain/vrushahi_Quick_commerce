import mongoose, { Schema, Document } from "mongoose";

export interface IBackgroundLock extends Document {
    key: string;
    lockedAt: Date;
    expiresAt: Date;
}

const BackgroundLockSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    lockedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true },
});

export default mongoose.model<IBackgroundLock>("BackgroundLock", BackgroundLockSchema);
