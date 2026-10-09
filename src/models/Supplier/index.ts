import mongoose,{Schema} from "mongoose";
import { Supplier } from "./types/index.js";

const SupplierSchema: Schema<Supplier> = new Schema<Supplier>(
    {
        user_id: {type:mongoose.Types.ObjectId, ref:"User", required:true},
        supplier_name: {type:String, required:true},
        total_due: {type:Number, default:0}
    }
)

// Prevent concurrent OCR jobs from creating duplicate ledger accounts.
SupplierSchema.index({ user_id: 1, supplier_name: 1 }, { unique: true });

export const SupplierModel = mongoose.model<Supplier>("Supplier",SupplierSchema)
