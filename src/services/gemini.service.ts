import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';

// The API key is injected by the environment. Do not modify this.
// This tells TypeScript that the `process` object is available globally.
declare const process: {
  env: {
    API_KEY: string;
  };
};

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // IMPORTANT: The API key is provided by the execution environment.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  
  async generateTextStream(prompt: string, systemInstruction: string): Promise<AsyncGenerator<GenerateContentResponse>> {
    try {
        return this.ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
        },
        });
    } catch (error) {
        throw new Error(this._handleApiError(error, 'text'));
    }
  }

  async generateWithSearch(prompt: string): Promise<{ text: string; sources: { title: string; uri: string }[] }> {
    try {
      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      const text = result.text;
      const groundingMetadata = result.candidates?.[0]?.groundingMetadata;
      
      const sources: { title: string; uri: string }[] = groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter((web: any) => web && web.uri && web.title) || [];
      
      const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

      return { text, sources: uniqueSources };
    } catch (error) {
       throw new Error(this._handleApiError(error, 'search'));
    }
  }
  
  async generateImages(prompt: string, aspectRatio: string, numberOfImages: number): Promise<string[]> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: numberOfImages,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
      }
      throw new Error('No images were generated.');
    } catch (error: unknown) {
      throw new Error(this._handleApiError(error, 'image'));
    }
  }

  async generateVideos(prompt: string, aspectRatio: string, numberOfVideos: number, onProgress: (message: string) => void, image?: { imageBytes: string, mimeType: string }): Promise<string[]> {
     try {
       onProgress(`Starting generation for ${numberOfVideos} video(s)...`);

       const generationPayload: {
          model: string;
          prompt: string;
          image?: { imageBytes: string, mimeType: string };
          config: { numberOfVideos: number, aspectRatio: string };
        } = {
         model: 'veo-2.0-generate-001',
         prompt,
         config: {
           numberOfVideos: numberOfVideos,
           aspectRatio: aspectRatio,
         }
       };

       if (image) {
         generationPayload.image = image;
       }

       let operation = await this.ai.models.generateVideos(generationPayload);

       onProgress('Your video(s) are being processed. This can take a few minutes...');
       while (!operation.done) {
         await new Promise(resolve => setTimeout(resolve, 10000));
         onProgress('Checking status... Still working on it.');
         operation = await this.ai.operations.getVideosOperation({operation: operation});
       }

       onProgress('Video generation complete! Fetching video data...');
       const generatedVideos = operation.response?.generatedVideos;
       if (!generatedVideos || generatedVideos.length === 0) {
         throw new Error('Video generation finished, but no videos were provided.');
       }

       const downloadLinks = generatedVideos.map(v => v.video?.uri).filter((uri): uri is string => !!uri);

       if (downloadLinks.length === 0) {
         throw new Error('Video generation finished, but no download links were provided.');
       }
       
       onProgress(`Fetching ${downloadLinks.length} video(s)...`);
       const videoBlobs = await Promise.all(
         downloadLinks.map(async (link) => {
           const response = await fetch(`${link}&key=${process.env.API_KEY}`);
           if (!response.ok) {
               throw new Error(`Failed to fetch video: ${response.statusText}`);
           }
           return response.blob();
         })
       );
       onProgress('Videos ready!');
       return videoBlobs.map(blob => URL.createObjectURL(blob));

     } catch (error: unknown) {
       throw new Error(this._handleApiError(error, 'video'));
     }
  }

  private _handleApiError(error: unknown, context: 'text' | 'image' | 'video' | 'search'): string {
    // Structured logging for better debugging
    console.error(`[Gemini Service Error] Context: ${context}`, {
      timestamp: new Date().toISOString(),
      originalError: error,
    });

    let userFriendlyMessage = `An unexpected error occurred during ${context} generation. Please try again later.`;

    // Handle network errors
    if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
      return 'Network error. Please check your internet connection and try again.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const apiError = error as { message: string };
      const errorMessage = apiError.message.toLowerCase();

      // More specific checks based on error message content from the Gemini API
      if (errorMessage.includes('api key not valid')) {
        userFriendlyMessage = 'The configured API key is invalid. Please contact the application administrator.';
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        userFriendlyMessage = "You've exceeded your current API quota. Please check your plan and billing details or try again later.";
      } else if (errorMessage.includes('safety')) {
        userFriendlyMessage = `The request was blocked due to safety concerns. Please adjust your prompt and try again.`;
      } else if (errorMessage.includes('400') || errorMessage.includes('invalid argument')) {
        userFriendlyMessage = `There was an issue with the request (e.g., an invalid parameter). Please review your input and try again.`;
      } else if (errorMessage.includes('500') || errorMessage.includes('internal')) {
        userFriendlyMessage = 'The AI service is currently experiencing internal issues. Please try again in a few moments.';
      } else if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
        userFriendlyMessage = 'The AI service is temporarily unavailable. Please try again later.';
      } else {
         // Fallback to a cleaner version of the original message if it's somewhat readable
         const nestedMessageMatch = apiError.message.match(/\[\w+ \w+\] (.*)/);
         if (nestedMessageMatch && nestedMessageMatch[1]) {
            userFriendlyMessage = nestedMessageMatch[1];
         } else if (!/\[.*\]/.test(apiError.message)) { // Avoid showing cryptic internal codes like "[GoogleGenerativeAI Error]"
            userFriendlyMessage = apiError.message;
         }
      }
    }

    // Log the final user-facing message for easier debugging correlation
    console.log(`[Gemini Service] User-facing error for ${context}: "${userFriendlyMessage}"`);
    
    return userFriendlyMessage;
  }
}