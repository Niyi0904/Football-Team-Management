# Firebase Setup Guide

## Installation

The Firebase dependency needs to be added to your project:

```bash
npm install firebase
```

## Configuration

1. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a new project" or select an existing one
   - Enable Authentication (sign in method: Email/Password)
   - Create a Firestore database in production mode

2. Get your Firebase config:
   - Go to Project Settings (gear icon) > Your apps
   - Select or create a web app
   - Copy the Firebase config values

3. Create a `.env.local` file in the root directory:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## Firestore Database Setup

Create a `user_roles` collection with the following structure:

```
Collection: user_roles
Document ID: <user_uid>
Fields:
  - role: "admin" | "user" | other roles
```

## Files Created

- `lib/firebase.ts` - Firebase initialization
- `lib/firestore.ts` - Firestore database operations
- `app/hooks/useAuth.ts` - Updated authentication hook (converted from Supabase)

## Usage

The `useAuth()` hook provides:
- `user` - Firebase User object or null
- `isAdmin` - Boolean indicating if user is an admin
- `loading` - Boolean indicating if auth is still loading
- `signIn(email, password)` - Sign in with email and password
- `signUp(email, password, displayName)` - Create new user account
- `signOut()` - Sign out the current user
