# Complete Setup & Installation Guide

## 📋 Table of Contents
1. [System Requirements](#system-requirements)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Firebase Configuration](#firebase-configuration)
5. [API Keys Setup](#api-keys-setup)
6. [Running the Application](#running-the-application)
7. [Testing the History Feature](#testing-the-history-feature)
8. [Troubleshooting](#troubleshooting)

---

## System Requirements

- **Node.js**: v14.0.0 or higher
- **npm**: v6.0.0 or higher (comes with Node.js)
- **Git**: For version control (optional)
- **Browser**: Chrome, Edge, or Firefox (latest versions recommended)
- **Internet Connection**: Required for AI API and Firebase

---

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

Create a `.env` file in the `backend` directory:

```bash
# Windows
copy nul .env

# macOS/Linux
touch .env
```

### Step 4: Configure Backend Environment

Edit `.env` and add the following:

```env
# Required for AI features
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENAI_API_KEY=your_openai_api_key_here (optional fallback)

# Server
PORT=5000
NODE_ENV=development

# Optional: OpenRouter specific settings
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=Farmer Advisory System
OPENROUTER_TIMEOUT_MS=55000
```

**Get API Keys:**
- [OpenRouter](https://openrouter.ai): Sign up and get free credits
- [OpenAI](https://openai.com): (Optional) for fallback

### Step 5: Start Backend Server

```bash
npm start
```

Expected output:
```
Server running on port 5000
```

✅ Backend is now running at `http://localhost:5000`

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

This will also install Firebase and other required packages.

### Step 3: Create Environment File

```bash
# Copy the example file
cp .env.example .env

# Or manually create
# Windows: copy nul .env
# macOS/Linux: touch .env
```

### Step 4: Configure Environment Variables

For now, edit `.env` with placeholder values:

```env
# These will be populated with Firebase credentials
REACT_APP_FIREBASE_API_KEY=demo_key
REACT_APP_FIREBASE_AUTH_DOMAIN=demo.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=demo-project
REACT_APP_FIREBASE_STORAGE_BUCKET=demo.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=demo123
REACT_APP_FIREBASE_APP_ID=demo:app:id
```

---

## Firebase Configuration

### Prerequisites
- Google account (free)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter name: `farmer-advisory-system`
4. Accept terms → Click **"Create project"**
5. Wait for project creation (takes ~2 minutes)

### Step 2: Create Firestore Database

1. In Firebase Console, click your project
2. Go to **Build** → **Firestore Database**
3. Click **"Create database"**
4. Select region closest to your location (e.g., `asia-south1` for India)
5. Start in **"Production mode"**
6. Click **"Create"**

### Step 3: Set Security Rules

1. In Firestore, go to **"Rules"** tab
2. Replace all content with:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /query_history/{document=**} {
      // Allow anonymous writes for development
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"**

### Step 4: Get Firebase Credentials

1. Click **⚙️ Settings** (top left) → **"Project settings"**
2. Go to **"Your apps"** section
3. Click **"</>"** (Web app) or create new web app
4. Copy the configuration object
5. It looks like this:

```javascript
{
  "apiKey": "AIzaSyXXXXXXXXXXXXXXXXXXXXXX",
  "authDomain": "farmer-advisory-system.firebaseapp.com",
  "projectId": "farmer-advisory-system",
  "storageBucket": "farmer-advisory-system.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef1234567890"
}
```

### Step 5: Update Frontend .env

Edit `frontend/.env` with your Firebase credentials:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXX
REACT_APP_FIREBASE_AUTH_DOMAIN=farmer-advisory-system.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=farmer-advisory-system
REACT_APP_FIREBASE_STORAGE_BUCKET=farmer-advisory-system.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
```

---

## API Keys Setup

### OpenRouter API Key (Required)

1. Go to [OpenRouter.ai](https://openrouter.ai)
2. Sign up with Google/GitHub
3. Go to **"Keys"** section
4. Create new API key
5. Copy and add to `backend/.env` as `OPENROUTER_API_KEY`

### OpenAI API Key (Optional)

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create account or sign in
3. Go to **API keys**
4. Create new key
5. Copy and add to `backend/.env` as `OPENAI_API_KEY`

---

## Running the Application

### Terminal 1: Start Backend

```bash
cd backend
npm start
```

Wait for message: `Server running on port 5000`

### Terminal 2: Start Frontend

```bash
cd frontend
npm start
```

Browser will open automatically at `http://localhost:3000`

---

## Testing the History Feature

### Step 1: Login

1. Enter any 10-digit mobile number (e.g., `9876543210`)
2. Click **"Get OTP"** (demo mode generates OTP automatically)
3. Enter OTP shown on screen
4. Click **"Login"**

### Step 2: Ask Questions

1. Type a farming question in Tamil or English
2. Click **"Ask"** or press Enter
3. AI responds with advice

### Step 3: View History

1. Click **"📋 History"** in sidebar
2. See all your previous queries
3. Click on any query to expand and see full details

### Step 4: Test Features

**Search:**
- Type keywords in search box
- Results filter in real-time

**Filter:**
- Select language filter (Tamil/English)
- Select "With Image" to see only photo queries

**Statistics:**
- View total queries count
- See breakdown by language
- Count of queries with images

**Delete:**
- Expand a query
- Click "Delete" button
- Confirm deletion

### Step 5: Verify Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click your project → Firestore Database
3. Look for `query_history` collection
4. See your saved queries in the database

---

## Project Structure After Setup

```
farmer-advisory-system/
├── backend/
│   ├── node_modules/
│   ├── .env                    ← Your API keys here
│   ├── package.json
│   ├── server.js
│   └── advisory.json
│
├── frontend/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.module.css
│   │   ├── History.jsx         ← History page
│   │   ├── History.module.css
│   │   ├── FarmerChat.jsx
│   │   ├── firebaseConfig.js   ← Firebase setup
│   │   ├── firebaseService.js  ← Firestore operations
│   │   └── ... (other files)
│   ├── .env                    ← Firebase credentials here
│   ├── .env.example
│   └── package.json
│
├── FIREBASE_SETUP.md
├── SETUP_GUIDE.md              ← This file
└── README.md
```

---

## Troubleshooting

### "Cannot find module 'firebase'"
```bash
cd frontend
npm install firebase
```

### "OPENROUTER_API_KEY is not set"
- Check `backend/.env` file exists
- Verify API key is correctly copied
- Restart backend server

### "Firebase credentials not found"
- Check `frontend/.env` file exists
- Verify all Firebase keys are correctly copied
- No quotes needed in .env file

### "Permission denied" in Firestore
- Check security rules are published
- Verify rules allow writes: `allow read, write: if true;`

### "History page is empty"
- Check if queries were actually made
- Check browser console (F12 → Console tab)
- Verify backend server is running
- Check Firebase connectivity

### "Voice/microphone not working"
- Allow microphone permission in browser
- Use Chrome or Edge (better support)
- Check internet connection

### "AI responses are very slow"
- Check internet connection
- Verify API keys are valid
- OpenRouter free tier might have rate limits

### Port 5000 already in use
```bash
# Find and stop process using port 5000
# On Windows:
netstat -ano | findstr :5000

# On macOS/Linux:
lsof -i :5000
```

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Example |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | ✅ Yes | `sk-or-...` |
| `PORT` | ❌ No | `5000` |
| `NODE_ENV` | ❌ No | `development` |

### Frontend (.env)

| Variable | Required | Example |
|----------|----------|---------|
| `REACT_APP_FIREBASE_API_KEY` | ✅ Yes | `AIzaSy...` |
| `REACT_APP_FIREBASE_PROJECT_ID` | ✅ Yes | `farmer-advisory` |
| Other Firebase vars | ✅ Yes | See Firebase Setup |

---

## Next Steps

1. ✅ Review [README.md](./README.md) for feature overview
2. ✅ Check [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for production Firebase setup
3. ✅ Customize the system for your use case
4. ✅ Deploy to production (see deployment guide)

---

## Support

For detailed information:
- [Firebase Setup Guide](./FIREBASE_SETUP.md)
- [Main README](./README.md)
- [Firebase Documentation](https://firebase.google.com/docs)

**Happy farming! 🚜**
