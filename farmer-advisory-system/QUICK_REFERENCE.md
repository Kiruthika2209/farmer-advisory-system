# Quick Reference Card

## 🚀 Quick Start Commands

```bash
# Terminal 1: Backend
cd backend && npm install && npm start

# Terminal 2: Frontend  
cd frontend && npm install && npm start
```

## 📁 Key Files

### Frontend - New Components
- `src/History.jsx` - History page component
- `src/History.module.css` - History styling
- `src/firebaseConfig.js` - Firebase initialization
- `src/firebaseService.js` - Firestore operations
- `.env` - Environment variables (create from .env.example)

### Frontend - Modified Components
- `src/App.js` - Added routing & sidebar
- `src/App.module.css` - Sidebar styling
- `src/FarmerChat.jsx` - Added Firestore save
- `package.json` - Added firebase dependency

### Configuration
- `FIREBASE_SETUP.md` - Firebase setup instructions
- `SETUP_GUIDE.md` - Complete installation guide
- `README.md` - Project overview
- `.env.example` - Environment variables template

---

## 🔑 Environment Variables

### Backend (.env)
```env
OPENROUTER_API_KEY=sk-or-...
PORT=5000
```

### Frontend (.env)
```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef
```

---

## 📊 Data Flow

```
User Input (Chat)
    ↓
FarmerChat Component
    ↓
Backend API (port 5000)
    ↓
OpenRouter AI API
    ↓
Response returned to Frontend
    ↓
Display in Chat + Save to Firestore
    ↓
User can view in History page
```

---

## 🗄️ Firestore Collection Structure

```
query_history/
  ├── docId1
  │   ├── userId: "user_123"
  │   ├── question: "How to treat..."
  │   ├── reply: "Here's the advice..."
  │   ├── language: "ta" or "en"
  │   ├── replyLanguage: "ta" or "en"
  │   ├── inputType: "text", "image", "voice", "text+image"
  │   ├── hasImage: true/false
  │   ├── timestamp: 2024-01-15T10:30:00Z
  │   ├── model: "gemini-2.0-flash"
  │   └── source: "openrouter"
  │
  ├── docId2
  │   └── ...
```

---

## 🔐 Security Rules

```firestore
# For development:
allow read, write: if true;

# For production:
allow read, write: if request.auth != null && 
  request.resource.data.userId == request.auth.uid;
```

---

## 🎯 Component API

### History Component Props
```jsx
<History 
  userId="user_123"        // Required: unique user identifier
  lang="en"                // Optional: "en" or "ta"
/>
```

### FarmerChat Component Props
```jsx
<FarmerChat 
  lang="en"                // Optional: "en" or "ta"
  userId="user_123"        // Optional: saves to Firestore if provided
/>
```

### Firestore Service Functions
```javascript
// Save a query
saveQueryHistory(userId, {
  question, reply, language, replyLanguage, 
  inputType, hasImage, model, source
})

// Get all queries for user
getQueryHistory(userId, limit = 100)

// Search queries
searchQueryHistory(userId, searchTerm)

// Delete a query
deleteHistoryEntry(historyId)

// Get statistics
getQueryStats(userId)
```

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module 'firebase'" | `npm install firebase` |
| CORS errors | Restart backend server |
| History not saving | Check userId is being passed |
| "Permission denied" Firestore | Update security rules |
| Slow responses | Check internet connection |
| Voice not working | Allow microphone permission |

---

## 📱 Testing Checklist

- [ ] Backend runs on port 5000
- [ ] Frontend runs on port 3000
- [ ] Can login (OTP: 123456)
- [ ] Can ask questions
- [ ] Can listen to answers
- [ ] History page loads
- [ ] Can search history
- [ ] Can filter history
- [ ] Statistics display
- [ ] Can delete entries
- [ ] Data appears in Firestore

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:5000 |
| Firebase Console | https://console.firebase.google.com |
| OpenRouter | https://openrouter.ai |

---

## 📊 Feature Summary

### History Features
- ✅ Automatic query storage
- ✅ Search by keywords
- ✅ Filter by language
- ✅ Filter by input type
- ✅ Statistics dashboard
- ✅ Delete entries
- ✅ Multi-user isolation

### Language Support
- ✅ English (browser TTS)
- ✅ Tamil (VoiceRSS API)
- ✅ Language detection
- ✅ UI in both languages

### Input Methods
- ✅ Text input
- ✅ Voice input
- ✅ Image upload
- ✅ Combined inputs

---

## 📚 Documentation Links

- [Firebase Setup](./FIREBASE_SETUP.md)
- [Installation Guide](./SETUP_GUIDE.md)
- [Main README](./README.md)
- [Firebase Docs](https://firebase.google.com/docs/firestore)
- [React Docs](https://react.dev)

---

## 💡 Tips

1. Use `npm start` to run both services in parallel
2. Check console (F12) for helpful error messages
3. Use Firebase Console to verify data is saving
4. Test with different languages and input methods
5. Monitor network tab to debug API calls

---

**Last Updated**: May 24, 2026 | Version: 1.0.0
