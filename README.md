# 🎓 UniHelp Frontend

<p align="center">
  <h3 align="center">Campus Super App for University Students</h3>

  <p align="center">
    A modern React Native application that brings campus communication, marketplace, notes, events, messaging, and student collaboration into one unified platform.
  </p>
</p>

---

## 🚀 Live Demo

**Web App:** https://unihelp-frontend-iota.vercel.app

> Mobile application built with React Native (Expo) and deployed as a web version using Vercel.

---

# ✨ Features

### 👥 Authentication
- Email & Password Login
- Google Sign In
- Secure Authentication
- Persistent Sessions

### 🏠 Home Feed
- Community Posts
- Trending Discussions
- Quick Campus Actions
- Category Filters
- Like & Comment System
- Save Posts

### 📝 Notes Sharing
- Upload Study Notes
- Browse Notes
- Download Resources
- Organized Categories

### 🛍 Marketplace
- Buy & Sell Items
- Product Listings
- Reserve Products
- Contact Seller
- Saved Listings

### 📅 Events
- Campus Events
- Event Creation
- Upcoming Events
- Calendar View

### 📊 Polls
- Create Polls
- Vote
- Live Results

### 💬 Messaging
- One-to-One Chat
- Conversation Search
- Real-Time Updates

### 🔎 Lost & Found
- Report Lost Items
- Found Item Listings

### 👤 Profile
- Edit Profile
- Saved Posts
- Published Posts
- Dark Mode
- Notification Settings

### 🎨 UI/UX
- Premium Modern Design
- Responsive Layout
- Dark Mode
- Smooth Animations
- Mobile-first Experience

---

# 🛠 Tech Stack

## Frontend

- React Native
- Expo
- React Navigation
- Expo Router
- Context API
- Async Storage

## Backend

- Node.js
- Express.js

## Database

- Firebase Firestore

## Authentication

- Firebase Authentication

## Storage

- Firebase Storage

## Deployment

- Vercel
- Render

---

# 🏗 Architecture

```text
                React Native (Expo)
                        │
                        ▼
               React Navigation
                        │
                        ▼
                 Context API
                        │
      ┌─────────────────┼─────────────────┐
      ▼                 ▼                 ▼
 Firebase Auth     Express API     Firebase Storage
      │                 │                 │
      └─────────────────┼─────────────────┘
                        ▼
                Firebase Firestore
```

---

# 📂 Project Structure

```text
src/
│
├── components/
├── screens/
├── navigation/
├── context/
├── hooks/
├── constants/
├── utils/
└── services/

assets/
public/

App.js
package.json
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/utkarsh0885/unihelp-frontend.git
```

Move into project

```bash
cd unihelp-frontend
```

Install dependencies

```bash
npm install
```

Start Expo

```bash
npx expo start
```

Run Web

```bash
npx expo start --web
```

---

# 🔑 Environment Variables

Create a `.env` file in the project root.

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_BACKEND_URL=
```

---

# 📱 Core Modules

- Authentication
- Home Feed
- Notes
- Marketplace
- Events
- Polls
- Lost & Found
- Messaging
- Notifications
- Profile
- Saved Posts
- Dark Mode

---

# 🚀 Performance Highlights

- Modular Architecture
- Reusable Components
- Context-based State Management
- Responsive UI
- Optimized Rendering
- Firebase Integration
- Secure Authentication
- Production Deployment

---

# 🔮 Future Enhancements

- AI Campus Assistant
- AI Notes Summarization
- Push Notifications
- Campus Clubs
- Video Calling
- Group Chats
- Attendance Tracker
- Placement Portal
- Campus Map
- AI Search

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Developer

**Utkarsh Thakur**

- GitHub: https://github.com/utkarsh0885
- Email: utkarshthakur0701@gmail.com

---

## ⭐ If you found this project helpful, please consider giving it a Star.
