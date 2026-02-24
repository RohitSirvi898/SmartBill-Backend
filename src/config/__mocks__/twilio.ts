import { jest } from '@jest/globals';

export const mockCreateVerification = jest.fn<any>();
export const mockCreateVerificationCheck = jest.fn<any>();

const client = {
    verify: {
        v2: {
            services: jest.fn().mockReturnValue({
                verifications: {
                    create: mockCreateVerification
                },
                verificationChecks: {
                    create: mockCreateVerificationCheck
                }
            })
        }
    }
};

// Attach mocks to client for easy access in tests
(client as any).mockCreateVerification = mockCreateVerification;
(client as any).mockCreateVerificationCheck = mockCreateVerificationCheck;

export default client;
