import mongoose, {Schema, Model} from "mongoose";
import {Invoice} from "./types/index.js";

const InvoiceSchema: Schema<Invoice> = new Schema<Invoice>(
    {
        user_id: {type :mongoose.Types.ObjectId, ref:"User", required:true},
        filename: {type:String, required:true},
        storage_path: {type:String, required:true},
        status: {type:String, enum:['pending','processed','failed'], default:'pending'},
        uploaded_at: {type:Date, default:Date.now},
        processed_at: {type:Date},
        extracted_data: {
            company_name: {type:String},
            invoice_number: {type:String},
            date: {type:String},
            total_amount: {type:String}
        }
    },
    {timestamps:true}
)

export const InvoiceModel: Model<Invoice> = mongoose.model<Invoice>("Invoice", InvoiceSchema);