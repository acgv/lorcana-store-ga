# Deployment Guide - Lorcana Ecosystem

Complete guide for deploying all components of the Lorcana TCG ecosystem.

---

## 🌐 Web Store & Admin Dashboard Deployment

### Option 1: Vercel (Recommended)

#### 1. Prepare for Deployment
\`\`\`bash
# Build locally to test
npm run build

# If successful, proceed to deployment
\`\`\`

#### 2. Deploy to Vercel
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
\`\`\`

#### 3. Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all variables from `env.example.txt`:
   - `MOBILE_API_KEY`
   - `ADMIN_API_KEY`
   - `DATABASE_URL`
   - etc.

#### 4. Custom Domain
1. Vercel Dashboard → Domains
2. Add your domain: `lorcana-store.com`
3. Update DNS records as instructed

---

### Option 2: Self-Hosted (Docker)

#### 1. Create Dockerfile
\`\`\`dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3002
CMD ["node", "server.js"]
\`\`\`

#### 2. Build and Run
\`\`\`bash
# Build image
docker build -t lorcana-store .

# Run container
docker run -p 3002:3002 \
  -e MOBILE_API_KEY=xxx \
  -e ADMIN_API_KEY=xxx \
  lorcana-store
\`\`\`

#### 3. Docker Compose
\`\`\`yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3002:3002"
    environment:
      - MOBILE_API_KEY=${MOBILE_API_KEY}
      - ADMIN_API_KEY=${ADMIN_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    restart: always
\`\`\`

---

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

#### 1. Create Project
1. Go to https://supabase.com
2. Create new project
3. Copy Project URL and anon key

#### 2. Create Tables
Run in Supabase SQL Editor:

\`\`\`sql
-- Cards table
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image TEXT,
  set TEXT,
  rarity TEXT NOT NULL,
  type TEXT NOT NULL,
  number INTEGER,
  card_number TEXT,
  price DECIMAL(10,2),
  foil_price DECIMAL(10,2),
  description TEXT,
  version TEXT DEFAULT 'normal',
  language TEXT DEFAULT 'en',
  status TEXT DEFAULT 'approved',
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by TEXT
);

-- Submissions table
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  card_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_by TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  images TEXT[],
  metadata JSONB
);

-- Activity logs table
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB
);

-- Create indexes
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_type ON cards(type);
CREATE INDEX idx_cards_set ON cards(set);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_logs_timestamp ON activity_logs(timestamp DESC);
\`\`\`

#### 3. Enable Row Level Security (RLS)
\`\`\`sql
-- Enable RLS
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for approved cards
CREATE POLICY "Public read approved cards" ON cards
  FOR SELECT USING (status = 'approved');

-- Admin full access (requires auth)
CREATE POLICY "Admin full access" ON cards
  FOR ALL USING (auth.role() = 'authenticated');
\`\`\`

#### 4. Setup Storage Bucket
\`\`\`sql
-- Create bucket for card images
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-images', 'card-images', true);

-- Storage policy
CREATE POLICY "Public read card images" ON storage.objects
  FOR SELECT USING (bucket_id = 'card-images');

CREATE POLICY "Authenticated upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'card-images' 
    AND auth.role() = 'authenticated'
  );
\`\`\`

#### 5. Connect to Next.js
\`\`\`bash
npm install @supabase/supabase-js
\`\`\`

\`\`\`typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.DATABASE_KEY!
)
\`\`\`

---

### Option 2: Firebase

#### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Create new project
3. Enable Firestore

#### 2. Firestore Rules
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cards - public read, admin write
    match /cards/{cardId} {
      allow read: if resource.data.status == 'approved';
      allow write: if request.auth.token.admin == true;
    }
    
    // Submissions - admin only
    match /submissions/{submissionId} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
\`\`\`

#### 3. Connect to Next.js
\`\`\`bash
npm install firebase firebase-admin
\`\`\`

\`\`\`typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
\`\`\`

---

## 📱 Mobile App Deployment

### iOS App Store

#### 1. Setup EAS Build
\`\`\`bash
npm install -g eas-cli
cd lorcana-mobile
eas login
eas build:configure
\`\`\`

#### 2. Configure app.json
\`\`\`json
{
  "expo": {
    "name": "Lorcana Card Scanner",
    "slug": "lorcana-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.lorcana",
      "buildNumber": "1"
    },
    "plugins": [
      "expo-camera",
      "expo-image-picker"
    ]
  }
}
\`\`\`

#### 3. Build
\`\`\`bash
# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
\`\`\`

---

### Android Play Store

#### 1. Configure Android
\`\`\`json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.lorcana",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
\`\`\`

#### 2. Build and Submit
\`\`\`bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
\`\`\`

---

## 🔐 Authentication Setup

### Firebase Auth (Recommended)

#### 1. Enable Authentication
1. Firebase Console → Authentication
2. Enable Email/Password
3. Enable Google Sign-in (optional)

#### 2. Setup Admin Claims
\`\`\`javascript
// Firebase Functions
const functions = require('firebase-functions')
const admin = require('firebase-admin')

exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  // Set admin custom claim
  await admin.auth().setCustomUserClaims(data.uid, { admin: true })
  return { message: 'Admin claim set' }
})
\`\`\`

#### 3. Integrate with Next.js
\`\`\`bash
npm install next-auth @next-auth/firebase-adapter
\`\`\`

---

## 📊 Monitoring & Analytics

### Vercel Analytics
Already included via `@vercel/analytics`

### Google Analytics
\`\`\`typescript
// app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_ID!} />
      </body>
    </html>
  )
}
\`\`\`

### Sentry (Error Tracking)
\`\`\`bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
\`\`\`

---

## 🚀 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

\`\`\`yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
\`\`\`

---

## 🔍 Health Checks

### API Health Endpoint
\`\`\`typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  })
}
\`\`\`

---

## 📈 Performance Optimization

### Image Optimization
- Use Next.js Image component
- Compress card images
- Implement lazy loading

### Caching
- Enable Vercel Edge Caching
- Use SWR for client-side caching
- Implement Redis for API caching

### CDN
- Vercel automatically provides CDN
- Use CloudFlare for additional layer

---

## 🐛 Troubleshooting

### Build Fails
\`\`\`bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
\`\`\`

### API 500 Errors
- Check environment variables
- Review Vercel logs
- Test endpoints locally

### Mobile App Won't Connect
- Update API_BASE_URL to production URL
- Check CORS configuration
- Verify API keys

---

## 📋 Pre-Launch Checklist

- [ ] Environment variables configured
- [ ] Database tables created
- [ ] Storage buckets setup
- [ ] Authentication configured
- [ ] API endpoints tested
- [ ] Mobile app built and submitted
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Analytics setup
- [ ] Error tracking enabled
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit done

---

## 🆘 Support

For deployment issues:
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Expo: https://docs.expo.dev

---

**Good luck with your launch! 🚀**

