# Lorcana Mobile App - Setup Guide

## Overview
Mobile app for capturing and syncing Lorcana card data to the admin dashboard.

## Tech Stack
- React Native (Expo)
- TypeScript
- Expo Camera for image capture
- Tesseract.js for OCR
- Async Storage for offline queue
- Expo Notifications for push alerts

## Features
- 📸 Camera scanning with OCR
- 🖼️ Screenshot import from gallery
- ✍️ Manual data entry form
- 📡 Sync to API endpoint
- 💾 Offline mode with queued uploads
- 🔔 Push notifications

---

## Quick Start

### 1. Install Expo CLI
\`\`\`bash
npm install -g expo-cli
\`\`\`

### 2. Create New Expo Project
\`\`\`bash
npx create-expo-app@latest lorcana-mobile --template blank-typescript
cd lorcana-mobile
\`\`\`

### 3. Install Dependencies
\`\`\`bash
# Core dependencies
npm install expo-camera expo-image-picker expo-notifications @react-native-async-storage/async-storage axios react-native-paper

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context

# Forms
npm install react-hook-form zod @hookform/resolvers

# OCR (optional - can be implemented server-side)
npm install tesseract.js
\`\`\`

### 4. Configuration

Create `.env` file:
\`\`\`env
API_BASE_URL=https://your-lorcana-store.com
API_KEY=your_mobile_api_key_here
\`\`\`

---

## File Structure

\`\`\`
lorcana-mobile/
├── App.tsx
├── app.json
├── package.json
├── .env
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── ManualEntryScreen.tsx
│   │   ├── PreviewScreen.tsx
│   │   └── HistoryScreen.tsx
│   ├── components/
│   │   ├── CardForm.tsx
│   │   ├── ImagePreview.tsx
│   │   └── SubmissionCard.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── camera.ts
│   │   ├── storage.ts
│   │   └── ocr.ts
│   ├── types/
│   │   └── card.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   └── theme/
│       └── colors.ts
└── assets/
\`\`\`

---

## Core Components

### 1. Camera Screen (`src/screens/CameraScreen.tsx`)
\`\`\`typescript
import { useState } from 'react'
import { Camera, CameraType } from 'expo-camera'
import { Button, View, TouchableOpacity } from 'react-native'

export function CameraScreen({ navigation }) {
  const [type, setType] = useState(CameraType.back)
  const [camera, setCamera] = useState(null)

  const takePicture = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync()
      // Process with OCR
      navigation.navigate('Preview', { image: photo.uri })
    }
  }

  return (
    <Camera ref={setCamera} type={type} style={{ flex: 1 }}>
      <TouchableOpacity onPress={takePicture}>
        {/* Capture button UI */}
      </TouchableOpacity>
    </Camera>
  )
}
\`\`\`

### 2. API Service (`src/services/api.ts`)
\`\`\`typescript
import axios from 'axios'
import { API_BASE_URL, API_KEY } from '@env'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  }
})

export async function submitCardData(cardData, images) {
  const response = await api.post('/api/staging', {
    card: cardData,
    images,
    source: 'mobile',
    deviceInfo: 'iOS/Android',
    ocrConfidence: 0.85
  })
  return response.data
}

export async function getSubmissionStatus(submissionId) {
  const response = await api.get(\`/api/staging?id=\${submissionId}\`)
  return response.data
}
\`\`\`

### 3. Offline Queue (`src/services/storage.ts`)
\`\`\`typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = '@lorcana_queue'

export async function addToQueue(submission) {
  const queue = await getQueue()
  queue.push({
    ...submission,
    id: Date.now().toString(),
    timestamp: new Date().toISOString()
  })
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function getQueue() {
  const data = await AsyncStorage.getItem(QUEUE_KEY)
  return data ? JSON.parse(data) : []
}

export async function syncQueue() {
  const queue = await getQueue()
  const synced = []

  for (const item of queue) {
    try {
      await submitCardData(item.card, item.images)
      synced.push(item.id)
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  // Remove synced items
  const remaining = queue.filter(item => !synced.includes(item.id))
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
}
\`\`\`

### 4. Card Form (`src/components/CardForm.tsx`)
\`\`\`typescript
import { useForm } from 'react-hook-form'
import { TextInput, Button } from 'react-native-paper'

export function CardForm({ initialData, onSubmit }) {
  const { control, handleSubmit } = useForm({
    defaultValues: initialData
  })

  return (
    <View>
      <TextInput
        label="Card Name"
        {...control.register('name')}
      />
      <TextInput
        label="Set"
        {...control.register('set')}
      />
      {/* More fields... */}
      <Button onPress={handleSubmit(onSubmit)}>
        Submit
      </Button>
    </View>
  )
}
\`\`\`

---

## Usage Flow

1. **Capture**: User takes photo of card
2. **OCR**: Extract text data from image
3. **Preview**: Show extracted data, allow editing
4. **Submit**: Send to API endpoint
5. **Offline**: Queue if no connection
6. **Sync**: Auto-sync when connection restored

---

## Push Notifications Setup

\`\`\`typescript
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status === 'granted') {
    const token = await Notifications.getExpoPushTokenAsync()
    // Send token to backend
    return token
  }
}

// Handle incoming notifications
Notifications.addNotificationReceivedListener(notification => {
  console.log('New card needs review!', notification)
})
\`\`\`

---

## Environment Variables

Required in `.env`:
\`\`\`
API_BASE_URL=https://your-lorcana-store.com
API_KEY=your_secret_api_key
\`\`\`

---

## Running the App

\`\`\`bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Build for production
eas build --platform ios
eas build --platform android
\`\`\`

---

## Testing

\`\`\`bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
\`\`\`

---

## Deployment

### Using Expo EAS
\`\`\`bash
# Install EAS CLI
npm install -g eas-cli

# Configure project
eas build:configure

# Build for stores
eas build --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
\`\`\`

---

## Next Steps

1. ✅ Setup Expo project
2. ✅ Implement camera & gallery picker
3. ✅ Create card data form
4. ✅ Add OCR integration
5. ✅ Implement offline queue
6. ✅ Setup push notifications
7. ✅ Build and deploy

---

## Troubleshooting

### Camera not working
- Check permissions in app.json
- Request permissions at runtime

### API connection fails
- Verify API_KEY in .env
- Check CORS settings on backend
- Test with Postman first

### OCR accuracy low
- Improve image quality
- Use better lighting
- Consider server-side OCR (Google Vision API)

---

## Support

For issues, contact: support@lorcana-store.com

