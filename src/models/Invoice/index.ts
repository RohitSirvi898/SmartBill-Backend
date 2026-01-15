import mongoose, {Schema, Model} from "mongoose";
import {Invoice} from "./types/index.js";

const InvoiceSchema: Schema<Invoice> = new Schema<Invoice>(
    {
        user_id: {type :mongoose.Types.ObjectId, ref:"User", required:true},
        supplier_id: {type:mongoose.Types.ObjectId, ref:"Supplier",required:true},
        invoice_number: {type:String, required:true},
        invoice_date: {type:Date, required:true},
        total_amount: {type:Number, required:true},
        image_url: {type:String, required:true},
        status: {type:String, enum:["pending","unpaid","paid","overdue"]},
        payment_id: {type:mongoose.Types.ObjectId, ref:"Payment", default:null}
    },
    {timestamps:true}
)

export const InvoiceModel: Model<Invoice> = mongoose.model<Invoice>("Invoice", InvoiceSchema);