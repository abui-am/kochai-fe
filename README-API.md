# Fitness Knowledge Base API Client

This document describes the comprehensive API client implementation that matches the OpenAPI specification for the Fitness Knowledge Base system.

## Overview

The `app/services/fitness-api.ts` file provides a complete TypeScript client for the Fitness Knowledge Base API, implementing all endpoints defined in the OpenAPI specification.

## Available Functions

### Authentication

- `loginUser(credentials: LoginCredentials)` - User login
- `registerUser(userData: UserRegistration)` - User registration
- `setAuthToken(token: string)` - Store authentication token
- `getAuthToken()` - Retrieve stored token
- `removeAuthToken()` - Clear stored token

### Protected User Routes

- `fetchCurrentUser()` - Get current user info
- `fetchUserProfile()` - Get user profile with preferences
- `updateUserProfile(profileData: UserProfileUpdate)` - Update profile
- `updateUserPreferences(preferences: UserPreferences)` - Update preferences
- `fetchUserStats()` - Get user statistics

### Knowledge Base

- `queryKnowledgeBase(body: QueryRequest)` - Query the PaperQA knowledge base
- `fetchSystemStatus()` - Get system status
- `fetchDocuments()` - Get document count
- `fetchHealth()` - Health check endpoint

## Usage Examples

### Basic Query

```typescript
import { queryKnowledgeBase, setAuthToken } from "~/services/fitness-api";

// Set authentication token
setAuthToken("your-jwt-token-here");

// Query the knowledge base
const response = await queryKnowledgeBase({
  question: "What are the benefits of compound exercises?",
});

console.log(response.answer);
console.log(response.sources); // Scientific paper citations
```

### User Authentication

```typescript
import { loginUser, registerUser } from "~/services/fitness-api";

// Register new user
const registration = await registerUser({
  email: "user@example.com",
  name: "John Doe",
  password: "securepassword123",
  preferences: {
    fitness_goals: ["muscle_gain", "strength"],
    experience_level: "intermediate",
  },
});

// Login
const login = await loginUser({
  email: "user@example.com",
  password: "securepassword123",
});

// Store token for future requests
setAuthToken(login.access_token);
```

### User Profile Management

```typescript
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserPreferences,
} from "~/services/fitness-api";

// Get current profile
const profile = await fetchUserProfile();

// Update profile
const updatedProfile = await updateUserProfile({
  bio: "Fitness enthusiast and gym regular",
  location: "Jakarta, Indonesia",
});

// Update preferences
const updatedPrefs = await updateUserPreferences({
  fitness_goals: ["muscle_gain", "weight_loss"],
  workout_frequency: "4_times_per_week",
});
```

## Type Safety

All functions are fully typed according to the OpenAPI specification:

```typescript
import type {
  QueryResponse,
  User,
  UserPreferences,
  SystemStatus,
  LoginResponse,
} from "~/services/fitness-api";
```

## Error Handling

The API client includes comprehensive error handling:

```typescript
import { ApiError } from "~/services/fitness-api";

try {
  const response = await queryKnowledgeBase({ question: "..." });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}:`, error.body);
  }
}
```

## Configuration

The API base URL is configured via the `VITE_API_BASE_URL` environment variable. If not set, it defaults to `http://localhost:8000` for development.

## Authentication

Protected endpoints automatically include the JWT token from localStorage. Make sure to call `setAuthToken()` after successful login/registration.

The implementation provides complete coverage of the OpenAPI specification while maintaining backward compatibility with existing code.
