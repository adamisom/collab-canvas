"use strict";
/**
 * Firebase Cloud Functions for AI Canvas Agent
 * Main entry point for the processAICommand callable function
 * Updated: Made shapeId optional in modification tools to fix parameter extraction
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
exports.processAICommand = void 0;
const functions = __importStar(require("firebase-functions"));
const params_1 = require("firebase-functions/params");
const app_1 = require("firebase-admin/app");
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const tools_1 = require("./tools");
const systemPrompt_1 = require("./utils/systemPrompt");
const rateLimiter_1 = require("./utils/rateLimiter");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
// Define OpenAI API key as a secret for Functions v2
const openaiApiKey = (0, params_1.defineSecret)("OPENAI_API_KEY");
/**
 * Callable Cloud Function to process AI commands
 * Receives user message and context, calls OpenAI, returns structured commands
 */
exports.processAICommand = functions.https.onCall({ secrets: [openaiApiKey] }, async (request) => {
    // Enforce authentication
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to use AI commands");
    }
    const userId = request.auth.uid;
    const data = request.data;
    const { userMessage, canvasState, viewportInfo, selectedShape } = data;
    // Validate request
    if (!userMessage || typeof userMessage !== "string") {
        throw new functions.https.HttpsError("invalid-argument", "userMessage is required and must be a string");
    }
    try {
        // Check usage quota
        await (0, rateLimiter_1.checkCommandQuota)(userId);
        // Check canvas limits
        if (canvasState.rectangles.length >= 1000) {
            throw new functions.https.HttpsError("failed-precondition", "Canvas has too many rectangles (limit: 1000)");
        }
        // Get OpenAI API key from environment variable (Functions v2)
        const apiKey = openaiApiKey.value();
        if (!apiKey) {
            console.error("OpenAI API key not configured");
            throw new functions.https.HttpsError("failed-precondition", "AI service not configured");
        }
        // Build system prompt with context
        const systemPrompt = (0, systemPrompt_1.buildSystemPrompt)(canvasState, viewportInfo, selectedShape);
        // Create OpenAI provider with API key
        const openai = (0, openai_1.createOpenAI)({
            apiKey: apiKey,
        });
        // Call OpenAI with 6 second timeout
        const result = await Promise.race([
            (0, ai_1.generateText)({
                model: openai("gpt-4o"),
                messages: [{ role: "user", content: userMessage }],
                tools: tools_1.tools,
                system: systemPrompt,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("AI request timeout")), 6000)),
        ]);
        // Atomically increment command count (after successful AI call)
        await (0, rateLimiter_1.incrementCommandCount)(userId);
        // Extract tool calls from result
        const toolCalls = result.toolCalls || [];
        // Log what OpenAI returned for debugging
        console.log("🔍 OpenAI returned tool calls:", JSON.stringify(toolCalls, null, 2));
        // Return structured commands and optional message
        const response = {
            commands: toolCalls.map((call) => {
                // The AI SDK can use either 'args' (for valid typed calls) or 'input' (for dynamic/invalid calls)
                // We need to check both properties
                let params = {};
                if ('args' in call && call.args) {
                    params = call.args;
                }
                else if ('input' in call && call.input) {
                    params = call.input;
                }
                console.log(`📦 Extracting params for ${call.toolName}:`, JSON.stringify(params));
                return {
                    tool: call.toolName,
                    parameters: params,
                };
            }),
            message: result.text || undefined,
        };
        console.log("📤 Sending to client:", JSON.stringify(response, null, 2));
        return response;
    }
    catch (error) {
        // Type guard for errors with message property
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Handle timeout
        if (errorMessage === "AI request timeout") {
            throw new functions.https.HttpsError("deadline-exceeded", "AI service temporarily unavailable. Please try again.");
        }
        // Handle OpenAI API errors
        if (errorMessage.includes("API key")) {
            throw new functions.https.HttpsError("failed-precondition", "AI service configuration error");
        }
        // Re-throw HttpsError as-is
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Log unexpected errors
        console.error("Error processing AI command:", error);
        throw new functions.https.HttpsError("internal", "An error occurred processing your command");
    }
});
//# sourceMappingURL=index.js.map