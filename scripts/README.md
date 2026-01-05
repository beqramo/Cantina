# Scripts

This folder contains utility scripts for managing the Cantina application.

## upload-dishes.ts

Uploads dishes from `dishes.json` to Firebase Firestore.

### Prerequisites

1. **Environment Variables**: Make sure your `.env.local` file contains:

   ```
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   ```

2. **Images in Firebase Storage**: The images referenced in `dishes.json` must already be uploaded to Firebase Storage. By default, the script expects them in the `instagram-imports/` folder.

   To change the folder, edit the `STORAGE_IMAGE_FOLDER` constant in `upload-dishes.ts`:

   ```typescript
   const STORAGE_IMAGE_FOLDER = 'instagram-imports'; // Change this
   ```

3. **Deploy Firestore Rules**: Before running the script, deploy the updated Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Usage

```bash
npm run upload-dishes
```

Or directly with ts-node:

```bash
npx ts-node --project tsconfig.scripts.json scripts/upload-dishes.ts
```

### What the Script Does

1. **Reads** `dishes.json` from the project root
2. **Validates** each dish entry for required fields
3. **Checks for duplicates** by:
   - Original post ID (`sourcePostId`)
   - Dish name (case-insensitive, accent-insensitive)
4. **Creates** dish documents in Firestore with:
   - Standard fields: name, imageUrl, images, tags, status, thumbsUp, thumbsDown, etc.
   - Search tokens for efficient querying
   - Source metadata: sourcePostId, sourceUrl, sourceNickname, sourceComments, sourceUploadDate
5. **Skips** dishes that already exist (no duplicates created)

### Dish Fields Created

| Field              | Value             | Description                            |
| ------------------ | ----------------- | -------------------------------------- |
| `name`             | From `title`      | Dish name                              |
| `nameTokens`       | Generated         | Search tokens for queries              |
| `imageUrl`         | Constructed       | Firebase Storage URL                   |
| `images`           | Array             | Array containing the image URL         |
| `category`         | `null`            | Uncategorized (set when added to menu) |
| `tags`             | `[]`              | Empty (can be set later)               |
| `status`           | `'approved'`      | Auto-approved                          |
| `thumbsUp`         | `0`               | Initial vote count                     |
| `thumbsDown`       | `0`               | Initial vote count                     |
| `sourcePostId`     | From `postId`     | Original Instagram post ID             |
| `sourceUrl`        | From `postUrl`    | Original Instagram URL                 |
| `sourceNickname`   | From `nickname`   | Original poster username               |
| `sourceComments`   | From `comments`   | Original comments                      |
| `sourceUploadDate` | From `uploadDate` | Original upload date                   |
| `importedAt`       | Current time      | When the import occurred               |

### Uploading Images to Firebase Storage

Before running this script, you need to upload the images to Firebase Storage. You can:

1. **Manual Upload**: Use the Firebase Console to upload images to the `instagram-imports/` folder

2. **gsutil**: Use Google Cloud SDK:

   ```bash
   gsutil -m cp -r ./images/* gs://your-bucket.appspot.com/instagram-imports/
   ```

3. **Firebase CLI**: Or use a custom script with Firebase Admin SDK

### Troubleshooting

**"Missing required environment variables"**

- Check that your `.env.local` file exists and has all required variables

**Images not loading after import**

- Verify the images are uploaded to the correct folder in Firebase Storage
- Check the `STORAGE_IMAGE_FOLDER` constant matches your folder name
- Verify Firebase Storage rules allow read access

**Duplicate dishes being skipped**

- This is expected behavior to prevent duplicates
- To re-import a dish, delete it from Firestore first

**Rate limiting**

- The script automatically pauses every 50 dishes
- For very large imports, you may need to run in batches





