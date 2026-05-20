import fs from "fs";
import { PaymentModel } from "../../models/Payment/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { NextFunction, Request, Response } from "express";
import { getFileViewUrl, uploadFileToS3 } from "../../utils/AWS_S3.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { InvoiceModel } from "../../models/Invoice/index.js";
import { SupplierModel } from "../../models/Supplier/index.js";

export const SavePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { supplier_id, method, invoice_ids } = req.body;
        const proof_image = req.file
        const user_id = req.user?._id;

        if (!user_id) {
            throw new ApiError(404, "User Not Found Or Not Loged In");
        }

        let parsedInvoiceIds = invoice_ids;
        if (typeof invoice_ids === 'string') {
            try {
                parsedInvoiceIds = JSON.parse(invoice_ids);
            } catch (e) {
                // Handle simple comma-separated string if simple array
                parsedInvoiceIds = invoice_ids.split(',');
            }
        }
        if (!supplier_id || !method || !parsedInvoiceIds) {
            throw new ApiError(400, "All Payment Details (Supplier, Method, Invoices) are Required");
        }

        const invoicesForPayment = await InvoiceModel.find({
            _id: { $in: parsedInvoiceIds },
            supplier_id,
            status: { $ne: "paid" }
        });

        if (!invoicesForPayment.length) {
            throw new ApiError(400, "No valid invoices found for given supplier and invoice_ids");
        }

        const numericAmount = invoicesForPayment.reduce(
            (sum, inv) => sum + Number(inv.total_amount || 0),
            0
        );

        if (!proof_image || !proof_image.originalname || !proof_image.mimetype) {
            throw new ApiError(400, "No valid file uploaded");
        }

        let secureFileName = "";
        if (proof_image) {
            secureFileName = `users/${user_id}/payments/${Date.now()}_${proof_image.originalname}`;
            const fileBuffer = fs.readFileSync(proof_image.path);

            // Upload to S3
            await uploadFileToS3(fileBuffer, secureFileName, proof_image.mimetype);

            // Cleanup local file
            fs.unlinkSync(proof_image.path);
        }

        const paymentDate = new Date();

        const payment = PaymentModel.create({
            user_id,
            supplier_id,
            amount: numericAmount,
            date: paymentDate,
            method,
            proof_image_url: secureFileName,
            invoice_ids: parsedInvoiceIds
        })

        await InvoiceModel.updateMany(
            {
                _id: { $in: parsedInvoiceIds },
                supplier_id,
                status: { $ne: "paid" }
            },
            {
                $set: {
                    status: "paid",
                    payment_id: (await payment)._id
                }
            }
        );

        if (numericAmount) {
            await SupplierModel.updateOne(
                { _id: supplier_id },
                { $inc: { total_due: -numericAmount } }
            );
        }

        return res
            .status(200)
            .json(new ApiResponse({
                user_id,
                supplier_id,
                amount: numericAmount,
                paymentDate,
                method,
                secureFileName,
                parsedInvoiceIds
            }, "Payment Added Successfully"))

    }
    catch (error) {
        next(error);
    }
}

export const GetPaymentsData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user?._id;

        const payment = await PaymentModel.find({ user_id });

        return res
            .status(200)
            .json(new ApiResponse({ payment }, "Data Fetched Successfully"))
    }
    catch (error) {
        next(error);
    }
}

export const GetSinglePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const payment = await PaymentModel.findById(id);
        const invoices = await InvoiceModel.find({ payment_id: id }).populate("supplier_id");

        return res
            .status(200)
            .json(new ApiResponse({ payment, invoices }, "Payment and Invoice Data Fetched Successfully"))
    }
    catch (error) {
        next(error);
    }
}

export const GetPaymentById = async(req:Request, res:Response, next:NextFunction) => {
    try{
        const {payment_id} = req.params;
        const payment = await PaymentModel.findById(payment_id);
        if(!payment){
            throw new ApiError(404, "Payment Not Found");
        }
        let fileUrl: string | null = null;

        if (payment.proof_image_url) {
            fileUrl = await getFileViewUrl(payment.proof_image_url.toString());
        }

        const invoices = await InvoiceModel.find({_id:{$in:payment.invoice_ids}});
        return res
        .status(200)
        .json(new ApiResponse({fileUrl, payment, invoices}, "Payment Fetched Successfully"))
    }
    catch(error){
        next(error);
    }
}
