import { ApiError } from "../../utils/ApiError.js";
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { SupplierModel } from "@models/Supplier/index.js";
import { InvoiceModel } from "@models/Invoice/index.js";
import mongoose from "mongoose";

export const getSuppliersSummary = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user_id = req.user?._id;

        if (!user_id) {
            throw new ApiError(401, "User not found");
        }

        const summary = await SupplierModel.aggregate([
            { $match: { user_id: mongoose.Types.ObjectId.createFromHexString(String(user_id)) } },
            {
                $lookup: {
                    from: InvoiceModel.collection.name,
                    localField: "_id",
                    foreignField: "supplier_id",
                    as: "invoices",
                },
            },
            {
                $project: {
                    _id: 1,
                    supplier_name: 1,
                    total_due: 1,
                    invoice_count: { $size: "$invoices" },
                    unpaid_bills: {
                        $size: {
                            $filter: {
                                input: "$invoices",
                                as: "invoice",
                                cond: {
                                    $in: ["$$invoice.status", ["unpaid", "pending", "overdue"]],
                                },
                            },
                        },
                    },
                    last_bill_date: {
                        $max: "$invoices.invoice_date",
                    },
                },
            },
            { $sort: { supplier_name: 1 } },
        ]);

        if (!summary || summary.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse([], "No suppliers found"));
        }

        return res
            .status(200)
            .json(new ApiResponse(summary, "Suppliers summary fetched"));
    } catch (error) {
        next(error);
    }
};
