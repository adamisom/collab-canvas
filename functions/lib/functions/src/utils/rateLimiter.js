"use strict";
/**
 * Rate limiter utility for AI command quota management
 * Uses atomic increment to prevent race conditions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCommandQuota = checkCommandQuota;
exports.incrementCommandCount = incrementCommandCount;
const database_1 = require("firebase-admin/database");
const functions = __importStar(require("firebase-functions"));
const COMMAND_LIMIT = 1000;
/**
 * Check if user has exceeded their command quota
 * @param userId - Firebase auth user ID
 * @throws HttpsError if quota exceeded
 */
async function checkCommandQuota(userId) {
    const db = (0, database_1.getDatabase)();
    const userRef = db.ref(`users/${userId}`);
    try {
        const snapshot = await userRef.child("aiCommandCount").get();
        const currentCount = snapshot.val() || 0;
        if (currentCount >= COMMAND_LIMIT) {
            throw new functions.https.HttpsError("resource-exhausted", `AI command limit reached (${COMMAND_LIMIT} commands per user)`);
        }
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        console.error("Error checking command quota:", error);
        throw new functions.https.HttpsError("internal", "Failed to check command quota");
    }
}
/**
 * Atomically increment the user's command counter
 * Uses Firebase transaction to prevent race conditions
 * @param userId - Firebase auth user ID
 */
async function incrementCommandCount(userId) {
    const db = (0, database_1.getDatabase)();
    const userRef = db.ref(`users/${userId}/aiCommandCount`);
    try {
        // Use transaction for atomic increment
        await userRef.transaction((current) => {
            return (current || 0) + 1;
        });
    }
    catch (error) {
        console.error("Error incrementing command count:", error);
        // Don't throw - command already executed, just log the error
        // This prevents user from losing their command if increment fails
    }
}
//# sourceMappingURL=rateLimiter.js.map