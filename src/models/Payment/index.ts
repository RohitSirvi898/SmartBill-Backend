import mongoose, { Schema } from "mongoose";
import { userInfo } from "os";
import { Payment } from "./types/index.js";

const PaymentSchema:Schema<Payment> = new Schema<Payment>(
    {
        user_id: {type:mongoose.Types.ObjectId, ref:"User", required:true},
        supplier_id: {type:mongoose.Types.ObjectId, ref:"Supplier", required:true},
        amount: {type:Number, required:true},
        date: {type:Date, required:true},
        method: {type:String, enum:["Cash","UPI","Cheque","NetBanking"], required:true},
        proof_image_url: {type:String},
        invoice_ids: [{type:mongoose.Types.ObjectId, ref:"Invoice", required:true}]
    }
)

export const PaymentModel = mongoose.model<Payment>("Payment",PaymentSchema);