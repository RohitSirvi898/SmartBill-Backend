import { ApiError } from "../../utils/ApiError.js";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { getFileViewUrl, uploadFileToS3 } from "../../utils/AWS_S3.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { extractedInvoiceData } from "../../utils/gemini.js";
import { SupplierModel } from "../../models/Supplier/index.js";
import { InvoiceModel } from "../../models/Invoice/index.js";
import { PaymentModel } from "../../models/Payment/index.js";

export const createInvoice = async (req: Request, res: Response, next: NextFunction) =>{
    try{
        const userId=req.user?._id;
        const file=req.file;

        if(!userId){
            throw new ApiError(401, "User not found");
        }

        if (!file || !file.originalname || !file.mimetype) {
            throw new ApiError(400, "No valid file uploaded");
        }

        const secureFileName = `users/${userId}/invoices/${Date.now()}_${file.originalname}`;

        const fileBuffer = fs.readFileSync(file.path) ;
        const [, extractedData] = await Promise.all([
            uploadFileToS3(fileBuffer, secureFileName, file.mimetype),
            extractedInvoiceData(fileBuffer,file.mimetype)
        ]);

        const fileUrl = await getFileViewUrl(secureFileName);

        fs.unlinkSync(file.path);

        return res
        .status(200)
        .json(new ApiResponse({fileUrl, secureFileName, extractedData}, "Invoice processed successfully"));
    }
    catch (error){

        if(req.file && fs.existsSync(req.file.path)){
            fs.unlinkSync(req.file.path);
        }
        next(error);
    }
}

export const saveInvoiceData = async(req:Request, res:Response, next:NextFunction) => {
    try{
        //take data from req
        //store it in mongo db

        const {supplier_name,invoice_number,invoice_date,total_amount,invoice_url} = req.body;
        const userId=req.user?._id;

        if(!supplier_name || !invoice_number || !invoice_date || !total_amount || !invoice_url){
            throw new ApiError(400,"All Details are required!!");
        }

        const amount = Number(total_amount);

        if (Number.isNaN(amount)) {
            throw new ApiError(400, "Total amount must be a valid number");
        }

        let supplier = await SupplierModel.findOne({user_id:userId,supplier_name});

        if(!supplier){
            supplier = await SupplierModel.create({user_id:userId,supplier_name});
        }

        const Invoice = await InvoiceModel.create({
            user_id:userId,
            supplier_id:supplier._id,
            invoice_number,
            invoice_date,
            total_amount: amount,
            image_url:invoice_url,
            status:'unpaid'
        })

        await SupplierModel.updateOne(
            { _id: supplier._id },
            { $inc: { total_due: amount } }
        );

        return res
        .status(201)
        .json(new ApiResponse(Invoice,"Invoice Saved Successfully",201));
    }
    catch(error){
        next(error);
    }
}

export const getOutstandingAndPaidAmount = async(req:Request, res:Response, next:NextFunction) => {
    try{
        const user_id = req.user?._id;

        if(!user_id) {
            throw new ApiError(404,"User Not Found");
        }

        const invoicesdata = await InvoiceModel.find({user_id:user_id}).sort({ invoice_date: -1 });

        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const paymentsThisMonth = await PaymentModel.find({
            user_id: user_id,
            date: { $gte: startOfMonth }
        });

        const amountPaidThisMonth = paymentsThisMonth.reduce((sum, payment) => sum + (Number)(payment.amount), 0);

        const totalOutstandingAmount = invoicesdata.reduce((sum, invoice) => {
            if (invoice.status !== 'paid') {
                return sum + (Number)(invoice.total_amount || 0);
            }
            return sum;
        }, 0);

        if (!invoicesdata || invoicesdata.length === 0) {
            return res.status(200).json(new ApiResponse({
                totalOutstandingAmount,
                amountPaidThisMonth
            }, "No invoices found"));
        }

        return res.status(200).json(new ApiResponse({
            totalOutstandingAmount,
            amountPaidThisMonth
        }, "Data Fetched"));
    }
    catch(error){
        next(error);
    }
}


export const getSupplierInvoice = async(req:Request, res:Response, next:NextFunction) => {
    try{
        const {supplier_id} = req.params;

        if(!supplier_id.trim()){
            throw new ApiError(400, "Supplier ID is required");
        }

        const SupplierInvoice = await InvoiceModel.find({supplier_id:supplier_id});

        return res
        .status(200)
        .json(new ApiResponse(SupplierInvoice,"Data Fetched"));
    }
    catch(error){
        next(error);
    }
}

export const getInvoice = async(req:Request, res:Response, next:NextFunction) => {
    try{
        const { invoice_id } = req.params;
        if(!invoice_id.trim()){
            throw new ApiError(400,"Invoice Id is Required");
        }

        const invoicedata = await InvoiceModel.findById(invoice_id);

        if(!invoicedata){
            throw new ApiError(404,"Invalid invoice id");
        }

        const fileUrl = await getFileViewUrl(invoicedata.image_url);

        return res
        .status(200)
        .json(new ApiResponse({fileUrl,invoicedata},"Data Fetched"));
    }
    catch(error){
        next(error);
    }
}
