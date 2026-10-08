import mongoose, {Schema, Model} from "mongoose";
import {Invoice} from "./types/index.js";

const InvoiceSchema: Schema<Invoice> = new Schema<Invoice>(
    {
        user_id: {type :mongoose.Types.ObjectId, ref:"User", required:true},
        // These are populated by the OCR worker, then confirmed by the user.
        supplier_id: {type:mongoose.Types.ObjectId, ref:"Supplier"},
        merchant: {type:String},
        invoice_number: {type:String},
        invoice_date: {type:Date},
        total_amount: {type:Number},
        image_url: {type:String, required:true},
        status: {
            type:String,
            enum:["PROCESSING","NEEDS_REVIEW","VERIFIED","FAILED","pending","unpaid","paid","overdue"],
            default:"PROCESSING",
            required:true,
        },
        payment_id: {type:mongoose.Types.ObjectId, ref:"Payment", default:null},
        ledger_applied: {type:Boolean, default:false},
        processing_error: {type:String},
        extracted_at: {type:Date},
    },
    {timestamps:true}
)

export const InvoiceModel: Model<Invoice> = mongoose.model<Invoice>("Invoice", InvoiceSchema);
