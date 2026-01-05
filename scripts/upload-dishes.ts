/**
 * Upload Dishes Script
 *
 * This script uploads dishes from dishes.json to Firebase Firestore.
 * It reads the JSON file, validates data, and creates dish documents in the database.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/upload-dishes.ts
 *
 * Or with npm script:
 *   npm run upload-dishes
 *
 * Environment variables required:
 *   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY
 *   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Types for the imported dish data
interface ImportedDish {
  postId: string;
  title: string;
  comments: string[];
  nickname: string;
  downloadedFilename: string;
  postUrl: string;
  uploadDate: string; // DD/MM/YYYY format
}

// Storage folder where the images are located
// Change this if your images are in a different folder
const STORAGE_IMAGE_FOLDER = 'dish-images';

// Initialize Firebase Admin
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing required environment variables:');
    if (!projectId) console.error('  - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!clientEmail) console.error('  - FIREBASE_CLIENT_EMAIL');
    if (!privateKey) console.error('  - FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  console.log(`Initializing Firebase Admin for project: ${projectId}`);

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
  });
}

// Helper function to normalize strings for search (remove accents, lowercase)
function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .trim();
}

// Generate comprehensive search tokens for efficient querying
function generateSearchTokens(name: string): string[] {
  const tokens = new Set<string>();

  // Normalize the full name
  const normalized = normalizeSearchTerm(name);

  // Add the full normalized name
  if (normalized.length > 0) {
    tokens.add(normalized);
  }

  // Split into words and add each word
  const words = normalized.split(/\s+/).filter((word) => word.length > 0);

  words.forEach((word) => {
    if (word.length > 0) {
      tokens.add(word);

      // Add word prefixes (for partial matching)
      const minPrefix = word.length <= 4 ? 2 : 3;
      for (let i = minPrefix; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }

      // Add word suffixes (for matching end of words)
      if (word.length > 3) {
        for (let i = 1; i <= Math.min(3, word.length - 2); i++) {
          tokens.add(word.substring(i));
        }
      }
    }
  });

  // Add bigrams (pairs of consecutive words)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    tokens.add(bigram);
    for (let j = 3; j <= bigram.length; j++) {
      tokens.add(bigram.substring(0, j));
    }
  }

  // Add trigrams (three consecutive words) if available
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    tokens.add(trigram);
  }

  // Add combined word prefixes (first letters of each word)
  if (words.length >= 2) {
    const initials = words.map((w) => w[0]).join('');
    if (initials.length >= 2) {
      tokens.add(initials);
    }
  }

  // Add word combinations without common connectors
  const connectors = new Set([
    'de',
    'com',
    'e',
    'ao',
    'a',
    'à',
    'do',
    'da',
    'dos',
    'das',
    'em',
    'no',
    'na',
  ]);
  const significantWords = words.filter(
    (w) => !connectors.has(w) && w.length > 1,
  );

  // Add each significant word prefix
  significantWords.forEach((word) => {
    for (let i = 2; i <= word.length; i++) {
      tokens.add(word.substring(0, i));
    }
  });

  // Add combinations of significant words
  if (significantWords.length >= 2) {
    for (let i = 0; i < significantWords.length; i++) {
      for (let j = i + 1; j < significantWords.length; j++) {
        tokens.add(`${significantWords[i]} ${significantWords[j]}`);
      }
    }
  }

  // Add original words (before normalization) in lowercase for exact matches with accents
  const originalWords = name
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  originalWords.forEach((word) => {
    if (word.length > 0) {
      tokens.add(word);
      for (let i = 2; i <= word.length; i++) {
        tokens.add(word.substring(0, i));
      }
    }
  });

  // Add the original name lowercase
  const originalLower = name.toLowerCase().trim();
  if (originalLower.length > 0 && originalLower !== normalized) {
    tokens.add(originalLower);
  }

  return Array.from(tokens);
}

// Parse date from DD/MM/YYYY format
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Construct Firebase Storage URL from filename
function getStorageUrl(
  filename: string,
  storageBucket: string,
  folder: string = STORAGE_IMAGE_FOLDER,
): string {
  // Encode the file path for URL
  const encodedPath = encodeURIComponent(`${folder}/${filename}`);
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
}

// Check if a dish with the same postId already exists
async function findExistingDishByPostId(
  db: admin.firestore.Firestore,
  postId: string,
): Promise<string | null> {
  const snapshot = await db
    .collection('dishes')
    .where('sourcePostId', '==', postId)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }
  return null;
}

// Check if a dish with the same name already exists
async function findExistingDishByName(
  db: admin.firestore.Firestore,
  name: string,
): Promise<string | null> {
  // Normalize the name for comparison
  const normalizedName = normalizeSearchTerm(name);

  const snapshot = await db.collection('dishes').get();

  for (const doc of snapshot.docs) {
    const dishName = doc.data().name;
    if (normalizeSearchTerm(dishName) === normalizedName) {
      return doc.id;
    }
  }
  return null;
}

// Validate imported dish data
function validateDish(dish: ImportedDish, index: number): string[] {
  const errors: string[] = [];

  if (!dish.postId) {
    errors.push(`Dish ${index}: Missing postId`);
  }
  if (!dish.title || dish.title.trim().length === 0) {
    errors.push(`Dish ${index}: Missing or empty title`);
  }
  if (!dish.downloadedFilename || dish.downloadedFilename.trim().length === 0) {
    errors.push(`Dish ${index}: Missing downloadedFilename`);
  }
  if (!dish.uploadDate) {
    errors.push(`Dish ${index}: Missing uploadDate`);
  } else {
    // Validate date format
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dish.uploadDate)) {
      errors.push(
        `Dish ${index}: Invalid uploadDate format (expected DD/MM/YYYY)`,
      );
    }
  }

  return errors;
}

// Main upload function
async function uploadDishes() {
  console.log('='.repeat(60));
  console.log('Cantina Dish Upload Script');
  console.log('='.repeat(60));
  console.log('');

  // Initialize Firebase
  const app = initializeFirebaseAdmin();
  const db = admin.firestore(app);
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'your-bucket.appspot.com';

  console.log(`Storage bucket: ${storageBucket}`);
  console.log(`Image folder: ${STORAGE_IMAGE_FOLDER}`);
  console.log('');

  // Read dishes.json
  const dishesPath = path.join(__dirname, '..', 'dishes.json');
  console.log(`Reading dishes from: ${dishesPath}`);

  if (!fs.existsSync(dishesPath)) {
    console.error('Error: dishes.json not found!');
    process.exit(1);
  }

  const dishesData: ImportedDish[] = JSON.parse(
    fs.readFileSync(dishesPath, 'utf-8'),
  );
  console.log(`Found ${dishesData.length} dishes to process`);
  console.log('');

  // Validate all dishes first
  console.log('Validating dishes...');
  const allErrors: string[] = [];
  dishesData.forEach((dish, index) => {
    const errors = validateDish(dish, index);
    allErrors.push(...errors);
  });

  if (allErrors.length > 0) {
    console.error('Validation errors found:');
    allErrors.forEach((error) => console.error(`  - ${error}`));
    console.error('');
    console.error('Please fix the errors and try again.');
    process.exit(1);
  }
  console.log('All dishes validated successfully!');
  console.log('');

  // Process dishes
  const stats = {
    created: 0,
    skipped: 0,
    errors: 0,
  };

  const now = admin.firestore.Timestamp.now();

  console.log('Starting upload...');
  console.log('-'.repeat(60));

  for (let i = 0; i < dishesData.length; i++) {
    const dish = dishesData[i];
    const progress = `[${i + 1}/${dishesData.length}]`;

    try {
      // Check for existing dish by postId first
      const existingByPostId = await findExistingDishByPostId(db, dish.postId);
      if (existingByPostId) {
        console.log(
          `${progress} SKIPPED (postId exists): "${dish.title}" - existing ID: ${existingByPostId}`,
        );
        stats.skipped++;
        continue;
      }

      // Check for existing dish by name
      const existingByName = await findExistingDishByName(db, dish.title);
      if (existingByName) {
        console.log(
          `${progress} SKIPPED (name exists): "${dish.title}" - existing ID: ${existingByName}`,
        );
        stats.skipped++;
        continue;
      }

      // Construct image URL
      const imageUrl = getStorageUrl(
        dish.downloadedFilename,
        storageBucket,
        STORAGE_IMAGE_FOLDER,
      );

      // Generate search tokens
      const nameTokens = generateSearchTokens(dish.title);

      // Parse the original upload date
      const originalDate = parseDate(dish.uploadDate);

      // Create dish document
      const dishDoc: Record<string, unknown> = {
        // Standard dish fields
        name: dish.title.trim(),
        nameTokens,
        imageUrl,
        images: [imageUrl],
        category: null, // Uncategorized - will be set when added to menu
        tags: [], // Empty tags - can be set later
        status: 'approved', // Auto-approved since these are from curated source
        thumbsUp: 0,
        thumbsDown: 0,
        createdAt: now,
        updatedAt: now,

        // Source/metadata fields (not displayed to users but useful for records)
        sourcePostId: dish.postId, // Original Instagram post ID
        sourceUrl: dish.postUrl, // Original Instagram URL
        sourceNickname: dish.nickname, // Original poster (@comidasdoipb)
        sourceComments: dish.comments, // Original comments from Instagram
        sourceUploadDate: admin.firestore.Timestamp.fromDate(originalDate), // Original upload date
        importedAt: now, // When this was imported
      };

      // Add to Firestore
      const docRef = await db.collection('dishes').add(dishDoc);
      console.log(`${progress} CREATED: "${dish.title}" - ID: ${docRef.id}`);
      stats.created++;
    } catch (error) {
      console.error(
        `${progress} ERROR: "${dish.title}" - ${
          error instanceof Error ? error.message : error
        }`,
      );
      stats.errors++;
    }

    // Add a small delay to avoid rate limiting
    if (i > 0 && i % 50 === 0) {
      console.log('  (Pausing briefly to avoid rate limiting...)');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('');
  console.log('-'.repeat(60));
  console.log('Upload Complete!');
  console.log('');
  console.log('Summary:');
  console.log(`  Created: ${stats.created}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Total: ${dishesData.length}`);
  console.log('');

  if (stats.errors > 0) {
    console.log(
      'Note: Some dishes had errors. Please review the log above and fix any issues.',
    );
  }

  if (stats.created > 0) {
    console.log(
      'Tip: The dishes are created with category=null (uncategorized).',
    );
    console.log(
      '     When you add them to a menu, their category will be set automatically.',
    );
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

// Run the script
uploadDishes().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});





