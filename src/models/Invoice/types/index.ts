
interface Extracted_data{
    company_name?: string;
    invoice_number?: string;
    date?: string;
    total_amount?: string;
}
export interface Invoice {
    user_id: object;
    filename: string;
    storage_path: string;
    status: 'pending' | 'processed' | 'failed';
    uploaded_at: Date;
    processed_at?: Date;
    extracted_data?: Extracted_data;
}