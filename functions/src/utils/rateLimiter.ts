/**
 * Rate limiter utility for AI command quota management
 * Uses atomic increment to prevent race conditions
 */

import {getDatabase} from "firebase-admin/database";
import * as functions from "firebase-functions";

const COMMAND_LIMIT = 1000;

/**
 * Check if user has exceeded their command quota
 * @param userId - Firebase auth user ID
 * @throws HttpsError if quota exceeded
 */
export async function checkCommandQuota(userId: string): Promise<void> {
  const db = getDatabase();
  const userRef = db.ref(`users/${userId}`);

  try {
    const snapshot = await userRef.child("aiCommandCount").get();
    const currentCount = snapshot.val() || 0;

    if (currentCount >= COMMAND_LIMIT) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `AI command limit reached (${COMMAND_LIMIT} commands per user)`
      );
    }
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error("Error checking command quota:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to check command quota"
    );
  }
}

/**
 * Atomically increment the user's command counter
 * Uses Firebase transaction to prevent race conditions
 * @param userId - Firebase auth user ID
 */
export async function incrementCommandCount(userId: string): Promise<void> {
  const db = getDatabase();
  const userRef = db.ref(`users/${userId}/aiCommandCount`);

  try {
    // Use transaction for atomic increment
    await userRef.transaction((current) => {
      return (current || 0) + 1;
    });
  } catch (error) {
    console.error("Error incrementing command count:", error);
    // Don't throw - command already executed, just log the error
    // This prevents user from losing their command if increment fails
  }
}

