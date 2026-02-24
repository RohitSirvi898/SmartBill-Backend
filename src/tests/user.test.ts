import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

// Import the mock implementation directly
import * as TwilioMock from '../config/__mocks__/twilio.js'; // Use .js extension for resolution if TS configured

// Mock the module using the imported mock
jest.unstable_mockModule('../config/twilio.js', () => TwilioMock);

// Import app dynamically
const { default: app } = await import('../app.js');
const { UserModel } = await import('../models/User/index.js'); // Import directly to avoid any alias issues

describe('User API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default mock implementations
        // Note: We access the spies from the imported mock object directly
        // We need to use "as any" because TypeScript might not see named exports if using .js extension? 
        // Actually, TwilioMock contains the exports from validation of that file.
        // But since we are importing .js, and the file is .ts, it depends on config.
        (TwilioMock as any).mockCreateVerification.mockResolvedValue({ status: 'pending', sid: 'test_sid' });
        (TwilioMock as any).mockCreateVerificationCheck.mockResolvedValue({ status: 'approved', valid: true });
    });

    describe('POST /api/v1/users/send', () => {
        it('should send OTP successfully', async () => {
            const res = await request(app)
                .post('/api/v1/users/send')
                .set('Content-Type', 'application/json')
                .send({ phone: '1234567890' });

            expect(res.status).toBe(200);
            expect(res.body.data).toBe('OTP sent successfully');
            expect((TwilioMock as any).mockCreateVerification).toHaveBeenCalledWith({
                to: '+911234567890',
                channel: 'sms'
            });
        });

        it('should return 400 if phone number is missing', async () => {
            const res = await request(app)
                .post('/api/v1/users/send')
                .send({});

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/users/verify', () => {
        it('should verify OTP and create user if not exists', async () => {
            const res = await request(app)
                .post('/api/v1/users/verify')
                .send({ phone: '1234567890', code: '123456' });

            expect(res.status).toBe(200);
            expect(res.body.message).toBe('OTP verified and User created successfully');
            expect((TwilioMock as any).mockCreateVerificationCheck).toHaveBeenCalledWith({
                to: '1234567890',
                code: '123456'
            });

            // Verify user in DB
            const user = await UserModel.findOne({ phone: '1234567890' });
            // Since we mocked Twilio, the user should be created.
            expect(user).toBeTruthy();
        });

        it('should return 400 for invalid OTP', async () => {
            (TwilioMock as any).mockCreateVerificationCheck.mockResolvedValue({ status: 'pending', valid: false });

            const res = await request(app)
                .post('/api/v1/users/verify')
                .send({ phone: '1234567890', code: '000000' });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/v1/users/update', () => {
        it('should update user profile authenticated', async () => {
            // First create a user explicitly for this test
            // Note: DB is cleared via setup.ts
            const user = await UserModel.create({
                phone: '1234567890',
                user_name: 'Old Name'
            });

            // We need a valid token. Since we mock Twilio, verifyJWT uses jwt.verify.
            // We need to generate a real JWT using the secret.
            // User model generateAccessToken uses env var.
            const token = user.generateAccessToken();

            const res = await request(app)
                .put('/api/v1/users/update')
                .set('Authorization', `Bearer ${token}`)
                .send({ user_name: 'New Name', business_name: 'My Business' });

            expect(res.status).toBe(200);
            const updatedUser = await UserModel.findById(user._id);
            expect(updatedUser?.user_name).toBe('New Name');
            expect(updatedUser?.business_name).toBe('My Business');
        });

        it('should return 401 if unauthenticated', async () => {
            const res = await request(app)
                .put('/api/v1/users/update')
                .send({ user_name: 'New Name' });

            expect(res.status).toBe(401);
        });
    });
});
