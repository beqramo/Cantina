# Firebase Security Rules Deployment Guide

This project includes Firebase Security Rules for Firestore and Storage. Follow these steps to deploy them to your Firebase project.

## Prerequisites

1. Install Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init
   ```
   - Select Firestore and Storage when prompted
   - Choose your Firebase project

## Deploying Firestore Rules

1. Deploy Firestore rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

   Or if you have a specific project:

   ```bash
   firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

## Deploying Storage Rules

1. Deploy Storage rules:

   ```bash
   firebase deploy --only storage
   ```

   Or if you have a specific project:

   ```bash
   firebase deploy --only storage --project YOUR_PROJECT_ID
   ```

## Deploying Both Rules

To deploy both Firestore and Storage rules at once:

```bash
firebase deploy --only firestore:rules,storage
```

## Rules Overview

### Firestore Rules (`firestore.rules`)

- **dishes**: Readable by everyone, writable only by admins
- **dishRequests**: Anyone can create, authenticated users can read their own, admins can approve/reject
- **menus**: Readable by everyone (for daily menu display), creatable/updatable/deletable only by authenticated admins
- **admins**: Readable only by admins, no direct writes (use Admin SDK)
- **votes**: Users can create/read/update/delete their own votes

### Storage Rules (`storage.rules`)

- **dish-images/**: Readable by everyone, writable by authenticated users (5MB max, images only)
- **request-images/**: Readable/writable by authenticated users (5MB max, images only)
- **All other paths**: Denied by default

## Setting Up Admin Users

Admin users must be added through the Firebase Admin SDK. They are stored in the `admins` collection with the document ID being the user's UID.

Example (using Firebase Admin SDK):

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

// Add an admin user
await admin.firestore().collection('admins').doc('USER_UID_HERE').set({
  email: 'admin@example.com',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

## Testing Rules

You can test your rules locally using the Firebase Emulator Suite:

```bash
firebase emulators:start
```

Then use the Firebase Rules Testing tool or write custom tests.

## Important Notes

1. **Admin Collection**: The `admins` collection must exist and contain admin user documents before the rules will work correctly.

2. **Image Size Limits**: Storage rules enforce a 5MB limit. The client-side compression should reduce images further.

3. **Security**: These rules prevent unauthorized access but always validate data on the server side as well.

4. **Testing**: Always test rules thoroughly before deploying to production.
