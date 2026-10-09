import { ApiError } from "../../utils/ApiError.js";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import { getFileViewUrl, uploadFileToS3 } from "../../utils/AWS_S3.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { SupplierModel } from "../../models/Supplier/index.js";
import { InvoiceModel } from "../../models/Invoice/index.js";
import { PaymentModel } from "../../models/Payment/index.js";
import { getInvoiceQueue } from "../../queues/invoice.queue.js";
import mongoose from "mongoose";

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

        const fileBuffer = await fs.promises.readFile(file.path);
        await uploadFileToS3(fileBuffer, secureFileName, file.mimetype);

        // A signed URL lets the worker retrieve a private S3 object without
        // exposing AWS credentials. It lasts long enough for a queued burst.
        const s3Url = await getFileViewUrl(secureFileName, 60 * 60 * 24 * 7);
        const invoice = await InvoiceModel.create({
            user_id: userId,
            image_url: secureFileName,
            status: "PROCESSING",
        });

        try {
            await getInvoiceQueue().add(
                "extract-invoice",
                { invoiceId: invoice._id.toString(), s3Url, mimeType: file.mimetype },
                { jobId: invoice._id.toString() },
            );
        } catch (queueError) {
            await InvoiceModel.findByIdAndUpdate(invoice._id, {
                $set: { status: "FAILED", processing_error: "Unable to queue invoice for processing" },
            });
            throw queueError;
        }

        await fs.promises.unlink(file.path);

        return res
        .status(202)
        .json(new ApiResponse(
            { invoiceId: invoice._id, status: "PROCESSING" },
            "Invoice accepted for processing",
            202,
        ));
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
            status:'unpaid',
            merchant: supplier_name,
            ledger_applied: true,
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

/**
 * Human-in-the-loop approval. Supplier balances are intentionally updated
 * here, rather than by OCR, so only user-confirmed amounts reach the ledger.
 */
export const verifyInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId) throw new ApiError(401, "User not found");
        if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid invoice id");

        const invoice = await InvoiceModel.findOne({ _id: id, user_id: userId });
        if (!invoice) throw new ApiError(404, "Invoice not found");
        if (invoice.status !== "NEEDS_REVIEW") {
            throw new ApiError(409, "Only invoices awaiting review can be verified");
        }

        const merchantInput = req.body.merchant ?? req.body.supplier_name ?? invoice.merchant;
        const merchant = typeof merchantInput === "string" ? merchantInput.trim() : "";
        const totalInput = req.body.total ?? req.body.total_amount ?? invoice.total_amount;
        const totalAmount = Number(totalInput);
        const dateInput = req.body.date ?? req.body.invoice_date ?? invoice.invoice_date;
        const invoiceDate = new Date(dateInput);

        if (!merchant || !Number.isFinite(totalAmount) || totalAmount < 0 || Number.isNaN(invoiceDate.getTime())) {
            throw new ApiError(400, "merchant, total, and date must contain valid final values");
        }

        const invoiceNumberInput = req.body.invoice_number ?? invoice.invoice_number;
        if (invoiceNumberInput !== undefined && typeof invoiceNumberInput !== "string") {
            throw new ApiError(400, "invoice_number must be a string");
        }

        const supplier = await SupplierModel.findOneAndUpdate(
            { user_id: userId, supplier_name: merchant },
            { $setOnInsert: { user_id: userId, supplier_name: merchant } },
            { new: true, upsert: true, setDefaultsOnInsert: true },
        );

        const wasLedgerApplied = Boolean(invoice.ledger_applied);
        const previousSupplierId = invoice.supplier_id?.toString();
        const previousAmount = Number(invoice.total_amount || 0);

        invoice.set({
            supplier_id: supplier._id,
            merchant,
            invoice_number: typeof invoiceNumberInput === "string" ? invoiceNumberInput.trim() || undefined : undefined,
            invoice_date: invoiceDate,
            total_amount: totalAmount,
            status: "VERIFIED",
            ledger_applied: true,
            processing_error: undefined,
        });
        await invoice.save();

        if (!wasLedgerApplied) {
            await SupplierModel.updateOne({ _id: supplier._id }, { $inc: { total_due: totalAmount } });
        } else if (previousSupplierId === supplier._id.toString()) {
            const difference = totalAmount - previousAmount;
            if (difference) {
                await SupplierModel.updateOne({ _id: supplier._id }, { $inc: { total_due: difference } });
            }
        } else {
            if (previousSupplierId) {
                await SupplierModel.updateOne({ _id: previousSupplierId }, { $inc: { total_due: -previousAmount } });
            }
            await SupplierModel.updateOne({ _id: supplier._id }, { $inc: { total_due: totalAmount } });
        }

        return res.status(200).json(new ApiResponse(invoice, "Invoice verified and ledger updated"));
    } catch (error) {
        next(error);
    }
};

export const getOutstandingAndPaidAmount = async(req:Request, res:Response, next:NextFunction) => {
    try{
        const user_id = req.user?._id;

        if(!user_id) {
            throw new ApiError(404,"User Not Found");
        }

        // The review client asks for /invoices?status=NEEDS_REVIEW. Keep the
        // existing summary response intact when no status is supplied.
        const requestedStatus = typeof req.query.status === "string" ? req.query.status.trim() : "";
        if (requestedStatus) {
            const invoices = await InvoiceModel.find({ user_id, status: requestedStatus })
                .sort({ createdAt: 1 });
            const invoicesWithFileUrls = await Promise.all(invoices.map(async (invoice) => ({
                ...invoice.toObject(),
                // image_url remains the internal S3 key; clients only receive
                // the short-lived signed URL required to render it.
                fileUrl: await getFileViewUrl(invoice.image_url),
            })));

            return res.status(200).json(new ApiResponse(invoicesWithFileUrls, "Invoices fetched"));
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
