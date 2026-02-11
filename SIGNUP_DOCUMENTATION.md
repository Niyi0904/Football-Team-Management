# Sign Up & Authentication Flow

## Overview

The sign up process uses Firebase Authentication with Firestore database integration. When a user creates an account, they are:
1. Registered in Firebase Authentication
2. A user document is created in Firestore
3. A default user role is assigned

## Components

### Authentication Hook: `useAuth()`
Located in: [app/hooks/useAuth.ts](app/hooks/useAuth.ts)

Provides authentication state and methods:
- `user` - Firebase User object or null
- `isAdmin` - Boolean indicating admin status  
- `loading` - Boolean indicating auth state is loading
- `signIn(email, password)` - Sign in with email/password
- `signUp(email, password, displayName)` - Create new account
- `signOut()` - Sign out the current user

```typescript
const { user, isAdmin, loading, signIn, signUp, signOut } = useAuth();
```

### Sign Up Form Component
Located in: [components/SignUpForm.tsx](components/SignUpForm.tsx)

Complete sign up form with validation and error handling:
- Email validation
- Password confirmation
- Display name requirement
- Firebase error messages
- Automatic redirect to dashboard

```typescript
<SignUpForm 
  onSuccess={() => console.log('signed up!')}
  onSwitchToLogin={() => setIsLogin(true)}
/>
```

### Sign In Form Component
Located in: [components/SignInForm.tsx](components/SignInForm.tsx)

Sign in form with validation and error handling:
- Email/password validation
- Firebase error messages
- Automatic redirect to dashboard

```typescript
<SignInForm 
  onSuccess={() => console.log('logged in!')}
  onSwitchToSignUp={() => setIsLogin(false)}
/>
```

### Protected Route Component
Located in: [components/ProtectedRoute.tsx](components/ProtectedRoute.tsx)

Wrapper to protect authenticated routes:
- Automatically redirects to auth page if not logged in
- Shows loading skeleton while checking auth state

```typescript
export default function ProtectedPage() {
  return (
    <ProtectedRoute>
      <YourContent />
    </ProtectedRoute>
  );
}
```

## Firestore Collections

### `users` Collection
Stores user profile information:
```
users/{userId}
├── email: string
├── displayName: string
└── createdAt: timestamp
```

### `user_roles` Collection
Stores user role information:
```
user_roles/{userId}
├── role: "admin" | "user"
└── createdAt: timestamp
```

## Firestore Helper Functions
Located in: [lib/firestore.ts](lib/firestore.ts)

- `createUserDocument(userId, email, displayName)` - Create user in Firestore on signup
- `getUserRole(userId)` - Get user's role
- `isUserAdmin(userId)` - Check if user is admin

## Sign Up Flow

```
User fills form
    ↓
Form validates input
    ↓
createUserWithEmailAndPassword() - Firebase Auth
    ↓
updateProfile() - Set display name
    ↓
createUserDocument() - Create Firestore entries
    ↓
Redirect to dashboard
```

## Error Handling

The forms include Firebase-specific error messages:
- `auth/email-already-in-use` → "This email is already registered"
- `auth/weak-password` → "Password should be at least 6 characters"
- `auth/invalid-email` → "Invalid email address"
- `auth/too-many-requests` → "Too many login attempts. Please try again later."

## Auth Page
Located in: [app/auth/page.tsx](app/auth/page.tsx)

Main authentication page that toggles between sign in and sign up forms.

## Using Protected Routes

To protect a route, wrap your page content:

```typescript
// app/dashboard/page.tsx
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

## Environment Setup

Ensure `.env.local` has Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Next Steps

1. Set up Firebase project credentials in `.env.local`
2. Create Firestore collections as described above
3. Wrap protected pages with `<ProtectedRoute>`
4. Users can now sign up and log in via the auth page
