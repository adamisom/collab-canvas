/**
 * Firebase Cloud Functions for AI Canvas Agent
 * Main entry point for the processAICommand callable function
 */

import * as functions from "firebase-functions";
import {defineString} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {generateText} from "ai";
import {createOpenAI} from "@ai-sdk/openai";
import {tools} from "./tools";
import {buildSystemPrompt} from "./utils/systemPrompt";
import {checkCommandQuota, incrementCommandCount} from "./utils/rateLimiter";
import {
  ProcessAICommandRequest,
  ProcessAICommandResponse,
  AICommandParameters,
} from "@shared/types";

// Initialize Firebase Admin
initializeApp();

// Define OpenAI API key as an environment parameter for Functions v2
const openaiApiKey = defineString("OPENAI_API_KEY");

/**
 * Callable Cloud Function to process AI commands
 * Receives user message and context, calls OpenAI, returns structured commands
 */
export const processAICommand = functions.https.onCall(
  {secrets: [openaiApiKey]},
  async (request): Promise<ProcessAICommandResponse> => {
    // Enforce authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to use AI commands"
      );
    }

    const userId = request.auth.uid;
    const data = request.data as ProcessAICommandRequest;
    const {userMessage, canvasState, viewportInfo, selectedShape} = data;

    // Validate request
    if (!userMessage || typeof userMessage !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "userMessage is required and must be a string"
      );
    }

    try {
      // Check usage quota
      await checkCommandQuota(userId);

      // Check canvas limits
      if (canvasState.rectangles.length >= 1000) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Canvas has too many rectangles (limit: 1000)"
        );
      }

      // Get OpenAI API key from environment variable (Functions v2)
      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        console.error("OpenAI API key not configured");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "AI service not configured"
        );
      }

      // Build system prompt with context
      const systemPrompt = buildSystemPrompt(
        canvasState,
        viewportInfo,
        selectedShape
      );

      // Create OpenAI provider with API key
      const openai = createOpenAI({
        apiKey: apiKey,
      });

      // Call OpenAI with 6 second timeout
      const result = await Promise.race([
        generateText({
          model: openai("gpt-4o"),
          messages: [{role: "user", content: userMessage}],
          tools,
          system: systemPrompt,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI request timeout")), 6000)
        ),
      ]);

      // Atomically increment command count (after successful AI call)
      await incrementCommandCount(userId);

      // Extract tool calls from result
      const toolCalls = result.toolCalls || [];
      
      // Return structured commands and optional message
      const response: ProcessAICommandResponse = {
        commands: toolCalls.map((call) => ({
          tool: call.toolName,
          parameters: ('args' in call ? call.args : {}) as AICommandParameters,
        })),
        message: result.text || undefined,
      };

      return response;
    } catch (error: unknown) {
      // Type guard for errors with message property
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle timeout
      if (errorMessage === "AI request timeout") {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "AI service temporarily unavailable. Please try again."
        );
      }

      // Handle OpenAI API errors
      if (errorMessage.includes("API key")) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "AI service configuration error"
        );
      }

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Log unexpected errors
      console.error("Error processing AI command:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred processing your command"
      );
    }
  }
);
