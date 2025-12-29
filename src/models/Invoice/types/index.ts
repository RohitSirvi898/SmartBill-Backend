export interface Invoice {
    user_id:object;
    supplier_id:object;
    invoice_number:string;
    invoice_date:Date;
    total_amouunt:Number;
    image_url:string;
    status:"pending"|"unpaid"|"paid"|"overdue";
    payment_id:object | null;
}