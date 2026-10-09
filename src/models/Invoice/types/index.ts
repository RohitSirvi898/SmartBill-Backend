export interface Invoice {
    user_id:object;
    supplier_id?:object;
    merchant?: string;
    invoice_number?:string;
    invoice_date?:Date;
    total_amount?:number;
    image_url:string;
    status:"PROCESSING"|"NEEDS_REVIEW"|"VERIFIED"|"FAILED"|"pending"|"unpaid"|"paid"|"overdue";
    payment_id?:object | null;
    ledger_applied?: boolean;
    processing_error?: string;
    extracted_at?: Date;
}
