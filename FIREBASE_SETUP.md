# Firebase Setup Guide for OrganAIze

This guide will help you set up Firebase for user authentication and Firestore database storage.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "organaize-app")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following providers:
   - **Email/Password**: Click "Enable" and save
   - **Google**: Click "Enable", add your authorized domain, and save

## Step 3: Set up Firestore Database

1. In your Firebase project, go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (you can add security rules later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 4: Get Firebase Configuration

1. In your Firebase project, click the gear icon next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon (</>) to add a web app
5. Enter an app nickname (e.g., "OrganAIze Web")
6. Click "Register app"
7. Copy the configuration object

## Step 5: Environment Variables

Create a `.env.local` file in your project root and add your Firebase configuration:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Upstash Redis (for production)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

## Step 6: Firestore Security Rules (Optional but Recommended)

In your Firestore Database, go to the "Rules" tab and add these security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Users can access their own tips
      match /tips/{tipId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Users can access their own folders
      match /folders/{folderId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Step 7: Deploy Configuration

For production deployment (Vercel, Netlify, etc.), add these environment variables to your deployment platform:

1. Go to your deployment platform's dashboard
2. Find the environment variables section
3. Add all the Firebase configuration variables from your `.env.local` file
4. Redeploy your application

## Data Structure

The Firestore database will have the following structure:

```
users/
  {userId}/
    tips/
      {tipId}/
        - content
        - url
        - title
        - folder
        - createdAt
        - ... (other tip fields)
    folders/
      {folderId}/
        - name
        - description
        - color
        - createdAt
        - updatedAt
```

## Features Enabled

With this setup, OrganAIze will have:

- ✅ **User Authentication**: Email/password and Google sign-in
- ✅ **User-specific Data**: Each user sees only their own tips and folders
- ✅ **Real-time Updates**: Changes sync across devices instantly
- ✅ **Secure Storage**: Data is protected by Firebase security rules
- ✅ **Demo Mode**: Unauthenticated users can still try the app
- ✅ **Persistent Storage**: User data is saved permanently in the cloud

## Migration from Current Storage

The app will automatically handle the transition:
- New users will start with Firestore
- Existing data can be migrated manually if needed
- Demo mode continues to work for unauthenticated users 