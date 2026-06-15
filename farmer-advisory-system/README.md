# Farmer Advisory System

An AI-powered advisory system for smallholder farmers in India, providing crop disease diagnosis, pest management, and farming guidance in English and Tamil.

## ✨ Features

### Core Features
- **Voice Input Support**: Ask questions using voice in English or Tamil
- **Plant Disease Diagnosis**: Upload photos of affected plants for AI analysis
- **Multi-Language Support**: English and Tamil interface and responses
- **Natural Language Replies**: AI responds in the language of your question
- **Climate Information**: Real-time weather data integration

### Query History (NEW! 🎉)
- **Automatic History Storage**: All queries and responses saved to Firebase Firestore
- **Search & Filter**: Find past queries by keywords or language
- **Statistics Dashboard**: View your query statistics (total, by language, with images)
- **Easy Management**: Delete individual history entries
- **Multi-User Support**: Each user's history is isolated and secure

## 🏗️ Project Structure

```
farmer-advisory-system/
├── frontend/                    # React.js UI
│   ├── src/
│   │   ├── App.js              # Main app with routing & sidebar
│   │   ├── App.module.css       # App styling & layout
│   │   ├── FarmerChat.jsx       # Chat interface
│   │   ├── History.jsx          # Query history page (NEW)
│   │   ├── History.module.css   # History styling (NEW)
│   │   ├── Login_page.jsx       # Authentication page
│   │   ├── firebaseConfig.js    # Firebase setup (NEW)
│   │   ├── firebaseService.js   # Firestore operations (NEW)
│   │   ├── useFarmerSpeech.js   # Voice & TTS functionality
│   │   ├── voiceRecord.js       # Audio recording
│   │   ├── imageUtils.js        # Image compression
│   │   └── ...
│   ├── package.json
│   └── .env.example             # Environment variables template (NEW)
│
├── backend/                     # Node.js/Express API
│   ├── server.js               # Main server
│   ├── package.json
│   ├── .env                    # Backend configuration
│   ├── advisory.json           # Local advisory data
│   └── ...
│
├── FIREBASE_SETUP.md           # Firebase setup guide (NEW)
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Firebase account (for history feature)

### 1. Backend Setup

```bash
cd backend
npm install
# Create .env file with your API keys
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Copy .env.example to .env and add Firebase credentials
cp .env.example .env
# Edit .env and add your Firebase project details

npm start
```

### 3. Firebase Configuration (Optional but Recommended)

For query history feature, you need to set up Firebase Firestore:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Firestore database
3. Add your Firebase credentials to `frontend/.env`
4. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions

## 📝 Usage

1. **Login**: Enter a 10-digit mobile number and OTP (demo mode: any number works with OTP "123456")
2. **Ask a Question**: 
   - Type your farming question
   - Or use the microphone for voice input
   - Or attach a plant photo for disease diagnosis
3. **Get Advice**: AI responds in English or Tamil
4. **Listen to Advice**: Click "Listen to answer" to hear responses read aloud
5. **View History**: Click "History" in the sidebar to see all past queries

## 🔧 Configuration

### Environment Variables (.env)

```env
# Firebase (optional for history feature)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Backend (.env)

```env
OPENROUTER_API_KEY=your_openrouter_key
OPENAI_API_KEY=your_openai_key (optional fallback)
PORT=5000
```

## 🎯 Key Features Explained

### Voice Input
- Real-time speech-to-text in English and Tamil
- Automatic language detection
- Fallback to server-side transcription if needed

### Plant Disease Diagnosis
- Upload plant photos
- AI vision models analyze and identify diseases
- Provides treatment recommendations

### Natural Text-to-Speech
- Tamil: Uses VoiceRSS API for clear pronunciation
- English: Browser-based synthesis
- Respects language preferences

### Query History
- **Automatic Saving**: Every query is automatically saved
- **Smart Search**: Search across all your past queries
- **Filter Options**: By language, with images, by date
- **Statistics**: Dashboard showing usage patterns
- **Privacy**: Firestore security rules ensure data isolation

## 📊 History Features

- **Search**: Find queries by keywords in question or response
- **Filter by Language**: View only Tamil or English queries
- **Filter by Type**: See all queries or only those with images
- **Statistics Dashboard**:
  - Total number of queries
  - Breakdown by language
  - Count of queries with images
- **Delete History**: Remove specific entries
- **Expandable Details**: View full question, response, and metadata

## 🔐 Security

- User data is isolated by userId
- Firestore security rules enforce data access control
- Passwords/OTPs handled securely
- No sensitive data stored in localStorage

## 🛠️ Tech Stack

### Frontend
- **React.js** 19.x - UI library
- **Firebase** 10.x - Firestore database & real-time features
- **Web Speech API** - Voice input/output
- **HTML5 Audio** - Voice playback

### Backend
- **Node.js** - Runtime
- **Express.js** - Server framework
- **OpenRouter API** - AI model access (LLMs and Vision models)
- **OpenAI API** - Fallback

### Database
- **Firebase Firestore** - NoSQL database for query history

## 🎨 UI Highlights

- **Responsive Design**: Works on mobile, tablet, and desktop
- **Tamil Support**: Full Tamil language interface
- **Dark/Light**: Adaptive to system preferences
- **Sidebar Navigation**: Easy navigation between Chat and History
- **Real-time Updates**: Live status updates during processing

## 📱 Supported Languages

- ✅ English
- ✅ Tamil (தமிழ்)
- 🔜 More languages can be added

## 🐛 Troubleshooting

### History not saving
- Check if Firebase credentials are in `.env`
- Verify Firestore database is created and rules allow writes
- Check browser console for errors

### Voice not working
- Ensure microphone permission is granted in browser
- Use Chrome or Edge (best support)
- Check if using HTTPS (required for some features)

### AI responses are slow
- Check internet connection
- Verify OpenRouter/OpenAI API keys are valid
- Model service might be rate-limited

## 📚 Documentation

- [Firebase Setup Guide](./FIREBASE_SETUP.md) - Detailed Firestore configuration
- [Backend API Documentation](./backend/README.md) - API endpoints
- [Frontend Components](./frontend/README.md) - React components

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

This project is open source and available under the MIT License.

## 📞 Support

For issues and questions:
1. Check the [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) guide
2. Review component documentation in source files
3. Check browser console for error messages

## 🎓 Learning Resources

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [React Documentation](https://react.dev)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Express.js Guide](https://expressjs.com)

---

Built with ❤️ for Indian farmers | Version 1.0.0
