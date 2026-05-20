# Multi-Device Login Implementation Guide

## Overview
This guide explains the new multi-device login system that allows users to stay logged in on multiple devices simultaneously without being automatically logged out when they log in on a new device.

## Key Changes

### 1. **User Model Changes**
- **Old Structure**: Single `refreshToken` and `refreshTokenExpires` fields
- **New Structure**: `deviceSessions` array containing multiple device sessions

Each device session includes:
```typescript
{
  deviceId: string;           // Unique identifier for the device
  deviceName?: string;        // Optional friendly name (e.g., "iPhone 12", "Chrome on Desktop")
  refreshToken: string;       // Hashed refresh token for this device
  refreshTokenExpires: Date;  // Expiry date for this device's session
  createdAt: Date;           // When the session was created
  lastUsedAt: Date;          // When this device last made an API request
}
```

### 2. **API Endpoints**

#### **Login (OTP Verification)**
- **Endpoint**: `POST /api/user/verify`
- **Required Fields**:
  ```json
  {
    "phone": "+1234567890",
    "code": "123456",
    "deviceId": "uuid-or-unique-device-id",
    "deviceName": "iPhone 12 Pro"  // Optional
  }
  ```
- **Response**:
  ```json
  {
    "status": 200,
    "data": {
      "user": { /* user object */ },
      "newUser": false,
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    },
    "message": "OTP verified and User created successfully"
  }
  ```

#### **Refresh Access Token**
- **Endpoint**: `POST /api/user/refresh-token`
- **Required Fields**:
  ```json
  {
    "phone_number": "+1234567890",
    "refreshToken": "refresh-token-from-login",
    "deviceId": "same-device-id-as-login"
  }
  ```
- **Response**:
  ```json
  {
    "status": 200,
    "data": {
      "accessToken": "new-jwt-token"
    },
    "message": "Access token refreshed successfully"
  }
  ```

#### **Logout from Current Device**
- **Endpoint**: `POST /api/user/logout-device`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Body**:
  ```json
  {
    "deviceId": "device-id-to-logout"
  }
  ```
- **Response**:
  ```json
  {
    "status": 200,
    "data": {},
    "message": "Logged out from device successfully"
  }
  ```

#### **Get All Active Sessions**
- **Endpoint**: `GET /api/user/active-sessions`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "status": 200,
    "data": {
      "sessions": [
        {
          "deviceId": "uuid-1",
          "deviceName": "iPhone 12 Pro",
          "createdAt": "2026-05-16T10:00:00Z",
          "lastUsedAt": "2026-05-16T11:30:00Z",
          "expiresAt": "2026-07-15T10:00:00Z"
        }
      ]
    },
    "message": "Active sessions retrieved successfully"
  }
  ```

#### **Logout from All Devices**
- **Endpoint**: `POST /api/user/logout-all`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "status": 200,
    "data": {},
    "message": "Logged out from all devices successfully"
  }
  ```

## How It Works

### Login Flow
1. User enters phone number → `POST /send` sends OTP
2. User enters OTP and provides **unique deviceId** → `POST /verify`
3. Server creates a new device session (doesn't replace existing ones)
4. Returns `accessToken` (valid for short duration) and `refreshToken`
5. User can now log in on another device with a different `deviceId`

### Token Refresh Flow
1. When `accessToken` expires, client calls `POST /refresh-token`
2. Server finds the device session matching the `deviceId`
3. Verifies the `refreshToken` against stored hash
4. Issues a new `accessToken` (same device remains authenticated)

### Device Tracking
- **lastUsedAt** is automatically updated whenever a user makes an API request
- Each device has independent session expiry
- Expired sessions are automatically cleaned up

## Implementation for Frontend

### Required Changes for Client Applications

#### 1. Generate Device ID
```javascript
// Generate once and store persistently
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = 'uuid-' + Date.now() + '-' + Math.random();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}
```

#### 2. Update Login Request
```javascript
const response = await fetch('/api/user/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: userPhone,
    code: otpCode,
    deviceId: getOrCreateDeviceId(),
    deviceName: 'My iPhone' // Optional
  })
});

const { data } = await response.json();
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

#### 3. Update Token Refresh Logic
```javascript
async function refreshToken() {
  const response = await fetch('/api/user/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone_number: userPhone,
      refreshToken: localStorage.getItem('refreshToken'),
      deviceId: getOrCreateDeviceId()
    })
  });

  if (response.ok) {
    const { data } = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
  }
}
```

## Benefits

✅ **No Forced Logout**: New login on different device doesn't logout other devices
✅ **Session Management**: Users can see all active devices
✅ **Device Control**: Users can logout from specific devices
✅ **Security**: Each device maintains independent session
✅ **Activity Tracking**: Know when each device was last used
✅ **Automatic Cleanup**: Expired sessions are automatically removed

## Migration Notes

⚠️ **Breaking Change**: Existing refresh tokens will not work
- All users will need to log in again after this update
- Run database migration if needed

### Database Migration
If using MongoDB, no migration script needed as the schema change is handled by Mongoose.

## Security Considerations

1. **Device ID Storage**: Store device ID securely (not easily copyable)
2. **Refresh Token**: Keep refresh token secure (httpOnly cookies or secure storage)
3. **Device Name**: Avoid storing sensitive information in device names
4. **Session Expiry**: Adjust `REFRESH_TOKEN_EXPIRY_DAYS` in environment variables as needed

## Troubleshooting

### "Device ID is required"
- Client must send `deviceId` in login request
- Implement persistent device ID storage on client

### "Invalid device or expired session"
- Device session has expired (check `REFRESH_TOKEN_EXPIRY_DAYS`)
- Device was logged out manually
- User needs to log in again

### "Invalid refresh token"
- Refresh token doesn't match stored hash
- Device session was cleared
- Invalid `deviceId` provided
