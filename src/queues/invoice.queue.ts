import "dotenv/config";
import { Queue, type ConnectionOptions } from "bullmq";

export const INVOICE_QUEUE_NAME = "invoice-processing";

/**
 * The limit is deliberately defined next to the queue contract and applied by
 * every worker for this queue. BullMQ enforces Worker.limiters globally for a
 * queue, including when more workers are started.
 */
export const INVOICE_QUEUE_RATE_LIMIT = {
    max: 15,
    duration: 60_000,
} as const;

export interface InvoiceJobData {
    invoiceId: string;
    /** A short-lived, signed GET URL for the S3 object. */
    s3Url: string;
    mimeType?: string;
}

const createRedisConnection = (): ConnectionOptions => {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
        const url = new URL(redisUrl);
        return {
            host: url.hostname,
            port: Number(url.port || 6379),
            username: url.username || undefined,
            password: url.password || undefined,
            tls: url.protocol === "rediss:" ? {} : undefined,
            // BullMQ workers must wait indefinitely for Redis to recover.
            maxRetriesPerRequest: null,
            // The API should not open a Redis socket merely because its route
            // module has been imported. `add()` establishes it on first use.
            lazyConnect: true,
        };
    }

    return {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        lazyConnect: true,
    };
};

export const redisConnection = createRedisConnection();

let invoiceQueue: Queue<InvoiceJobData> | undefined;

/**
 * Queue construction is deferred until an upload arrives. This lets modules
 * such as health checks and route-only tests start without requiring Redis.
 */
export const getInvoiceQueue = (): Queue<InvoiceJobData> => {
    if (!invoiceQueue) {
        invoiceQueue = new Queue<InvoiceJobData>(INVOICE_QUEUE_NAME, {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5_000,
                },
                removeOnComplete: 500,
                removeOnFail: 1_000,
            },
        });
    }

    return invoiceQueue;
};
