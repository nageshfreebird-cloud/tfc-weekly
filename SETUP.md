# 🔥 Firebase Setup Guide — Teach for Change Weekly Review

## Step 1: Create Firebase Project
1. Go to 👉 https://console.firebase.google.com
2. Click **"Add project"**
3. Name it: `teachforchange-weekly`
4. Disable Google Analytics (not needed) → Click **"Create project"**

---

## Step 2: Create Firestore Database
1. In your project, click **"Firestore Database"** in the left menu
2. Click **"Create database"**
3. Choose **"Start in test mode"** → Click **"Next"**
4. Select a region (e.g., `asia-south1` for India) → Click **"Done"**

---

## Step 3: Register Web App & Get Config
1. In project home, click the **Web icon** ( </> )
2. App nickname: `weekly-review` → Click **"Register app"**
3. You will see a `firebaseConfig` object. Copy it:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

4. Paste these values into `js/firebase-config.js` (replace the placeholder values)

---

## Step 4: Update firebase-config.js
Open `js/firebase-config.js` and replace:
```js
apiKey:            "YOUR_API_KEY",      ← paste your value
authDomain:        "YOUR_PROJECT_ID...", ← paste your value
projectId:         "YOUR_PROJECT_ID",   ← paste your value
storageBucket:     "...",               ← paste your value
messagingSenderId: "...",               ← paste your value
appId:             "..."               ← paste your value
```

---

## Step 5: Deploy to Netlify (Free Hosting)
1. Go to 👉 https://www.netlify.com → Sign up free
2. Click **"Add new site"** → **"Deploy manually"**
3. Drag and drop the entire `teachforchange-weekly` folder
4. Your site goes live at: `https://your-site-name.netlify.app`
5. Share this link with your team on WhatsApp!

---

## Default Login Credentials
| Field    | Value     |
|----------|-----------|
| User ID  | `admin`   |
| Password | `tfc@2014`|

> ⚠️ These defaults ALWAYS work as fallback even if admin changes credentials.

---

## Monday Morning Workflow
```
1. Admin logs in → Settings → Set meeting day → Save
2. Admin → Dashboard → Toggle Submissions: OPEN
3. Share app link on WhatsApp with team
4. Team opens app → Team Member → Select name → Submit form
5. Admin watches dashboard fill up live
6. Admin → Edit Summary → review/edit → Finalize
7. Admin → Print Report → Print / Save PDF
8. Meeting starts! 🎉
9. After meeting → Toggle Submissions: CLOSED
```

---

## Support
Built for: Teach for Change NGO
Version: 2.0 | August 2026
