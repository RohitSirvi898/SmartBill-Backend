import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log full error for debugging
    console.error('Error caught by errorHandler:', err);
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(
            new ApiResponse(null, err.message, err.statusCode)
        );
    }

    // For unexpected errors, return a generic message but log stack
    const msg = err?.message || 'Internal Server Error';
    return res.status(500).json(
        new ApiResponse(null, msg, 500)
    );
};