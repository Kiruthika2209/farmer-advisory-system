# Firebase Firestore Setup Guide

## Overview
This Farmer Advisory System now stores query history in Firebase Firestore. Follow these steps to set up Firebase for your project.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `farmer-advisory-system`
4. Accept the terms and click **"Create project"**
5. Wait for the project to be created

## Step 2: Enable Firestore Database

1. In Firebase Console, click on your project
2. Go to **Build** → **Firestore Database**
3. Click **"Create database"**
4. Select region (choose one closest to your location, e.g., `asia-south1` for India)
5. Choose **"Start in production mode"** (we'll set up security rules next)
6. Click **"Create"**

## Step 3: Set Up Firestore Security Rules

1. In Firestore Database, go to the **"Rules"** tab
2. Replace the content with the following rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own query history
    match /query_history/{document=**} {
      allow read, write: if request.auth != null && 
        request.resource.data.userId == request.auth.uid;
      // For demo/development: allow anonymous writes (remove this in production)
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the **⚙️ Settings** icon (top left)
2. Select **"Project settings"**
3. Go to the **"Your apps"** section
4. Under "Web apps", click the **"<>"** (Code) button, or create a new web app if needed
5. Copy the Firebase configuration object (it should look like this):

```javascript
{
  "apiKey": "YOUR_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
}
```

## Step 5: Configure Environment Variables

1. In the `frontend` folder, create a `.env` file (if it doesn't exist):

```bash
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID
```

2. Replace all `YOUR_*` values with the configuration from Step 4

## Step 6: Install Dependencies

```bash
cd frontend
npm install
```

This will install Firebase SDK.

## Step 7: Test the Setup

1. Start the backend:
```bash
cd backend
npm start
```

2. Start the frontend:
```bash
cd frontend
npm start
```

3. Login with any mobile number (demo OTP: 123456)
4. Ask a question in the chat
5. Go to **History** to see your saved queries
6. Check Firebase Console → Firestore Database → `query_history` collection to verify data is being stored

## Features Enabled

✅ **Query History Storage**: Every query and response is automatically saved to Firestore
✅ **Search History**: Search through past queries
✅ **Filter by Language**: Filter queries by Tamil/English
✅ **Statistics**: View total queries, language breakdown, image queries count
✅ **Delete History**: Remove individual query entries
✅ **Multi-User Support**: Each user's history is isolated (with security rules)

## Security Notes

- The current setup allows **anonymous writes** for demo purposes
- In production, implement proper authentication (Google Sign-In, Phone Auth, etc.)
- Replace the security rules with authentication-based rules:

```firestore
match /query_history/{document=**} {
  allow read, write: if request.auth != null && 
    request.resource.data.userId == request.auth.uid;
}
```

## Troubleshooting

### "Permission denied" errors
- Check if Firestore rules allow writes
- Verify Firebase config is correct in `.env`

### Firebase not found
- Run `npm install firebase` in frontend folder
- Restart the development server

### Data not appearing in history
- Check browser console for errors
- Verify userId is being passed to FarmerChat component
- Check Firebase Console for actual data in Firestore

## Environment Variables Example

Create a `.env` file in the `frontend` folder:

```
REACT_APP_FIREBASE_API_KEY=AIzaSyDemoKeyForTesting123456789
REACT_APP_FIREBASE_AUTH_DOMAIN=farmer-advisory-system-demo.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=farmer-advisory-system-demo
REACT_APP_FIREBASE_STORAGE_BUCKET=farmer-advisory-system-demo.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abcdef1234567890
```

For more help, visit [Firebase Documentation](https://firebase.google.com/docs/firestore)
