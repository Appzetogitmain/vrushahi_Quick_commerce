import mongoose, { Schema, Document } from 'mongoose';

export interface IHeaderCategory extends Document {
    name: string;
    slug: string;
    iconLibrary: string;
    iconName: string;
    theme: string;
    relatedCategory?: string;
    order: number;
    status: 'Published' | 'Unpublished';
    createdAt: Date;
    updatedAt: Date;
}

const HeaderCategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        iconLibrary: { type: String, required: true },
        iconName: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        theme: { type: String, default: 'all' },
        relatedCategory: { type: String, required: false },
        order: { type: Number, default: 0 },
        status: { type: String, enum: ['Published', 'Unpublished'], default: 'Published' },
    },
    { timestamps: true }
);

export default mongoose.model<IHeaderCategory>('HeaderCategory', HeaderCategorySchema);
