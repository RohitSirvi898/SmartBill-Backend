import "dotenv/config";
import { Worker } from "bullmq";
import connectDB from "../db/index.js";
import { InvoiceModel } from "../models/Invoice/index.js";
import { SupplierModel } from "../models/Supplier/index.js";
import { notificationService } from "../services/notification.service.js";
import {
    INVOICE_QUEUE_NAME,
    INVOICE_QUEUE_RATE_LIMIT,
    type InvoiceJobData,
    redisConnection,
} from "../queues/invoice.queue.js";
import { extractedInvoiceData } from "../utils/gemini.js";
import { UserModel } from "../models/User/index.js";

const valueAsString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

const valueAsAmount = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const valueAsDate = (value: unknown): Date | undefined => {
    const dateString = valueAsString(value);
    if (!dateString) return undefined;

    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? undefined : date;
};

const processInvoice = async (job: { data: InvoiceJobData }) => {
    const { invoiceId, s3Url, mimeType } = job.data;
    const invoice = await InvoiceModel.findById(invoiceId);

    if (!invoice) {
        throw new Error(`Invoice ${invoiceId} was not found`);
    }

    // A retry can encounter a job that a user has already verified.
    if (invoice.status !== "PROCESSING") {
        return;
    }

    const imageResponse = await fetch(s3Url);
    if (!imageResponse.ok) {
        throw new Error(`Unable to fetch invoice image from S3 (HTTP ${imageResponse.status})`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const responseMimeType = imageResponse.headers.get("content-type")?.split(";")[0];
    const extractedData = await extractedInvoiceData(imageBuffer, responseMimeType || mimeType || "image/jpeg");

    const merchant = valueAsString(extractedData.supplier_name) || "Unknown merchant";
    const supplier = await SupplierModel.findOneAndUpdate(
        { user_id: invoice.user_id, supplier_name: merchant },
        { $setOnInsert: { user_id: invoice.user_id, supplier_name: merchant } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    invoice.set({
        supplier_id: supplier._id,
        merchant,
        invoice_number: valueAsString(extractedData.invoice_number),
        invoice_date: valueAsDate(extractedData.invoice_date),
        total_amount: valueAsAmount(extractedData.total_amount),
        status: "NEEDS_REVIEW",
        processing_error: undefined,
        extracted_at: new Date(),
    });
    await invoice.save();

    const user = await UserModel.findById(invoice.user_id).select("fcmToken");
    if (user?.fcmToken) {
        await notificationService.sendInvoiceReadyNotification(user.fcmToken, merchant);
    }
};

const startWorker = async () => {
    await connectDB();

    const worker = new Worker<InvoiceJobData>(INVOICE_QUEUE_NAME, processInvoice, {
        connection: redisConnection,
        concurrency: Number(process.env.INVOICE_WORKER_CONCURRENCY || 2),
        // This is the Gemini protection point: no more than 15 OCR jobs are
        // started across all workers for this queue in a rolling 60 seconds.
        limiter: INVOICE_QUEUE_RATE_LIMIT,
    });

    worker.on("completed", (job) => {
        console.log(`Invoice job ${job.id} completed`);
    });

    worker.on("failed", async (job, error) => {
        console.error(`Invoice job ${job?.id} failed:`, error.message);
        if (!job || job.attemptsMade < (job.opts.attempts || 1)) return;

        await InvoiceModel.findByIdAndUpdate(job.data.invoiceId, {
            $set: {
                status: "FAILED",
                processing_error: error.message.slice(0, 1_000),
            },
        });
    });

    const shutdown = async () => {
        await worker.close();
        process.exit(0);
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
};

startWorker().catch((error) => {
    console.error("Invoice worker failed to start:", error);
    process.exit(1);
});
