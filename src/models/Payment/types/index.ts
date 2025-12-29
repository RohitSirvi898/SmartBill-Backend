export interface Payment {
    user_id:Object;
    supplier_id:Object;
    amount:Number;
    date:Date;
    method:"Cash"|"UPI"|"Cheque"|"NetBanking";
    proof_image_url: String;
    invoice_ids:Object[];
}