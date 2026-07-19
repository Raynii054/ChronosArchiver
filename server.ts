/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Gemini API Client on Server-Side
const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!ai) {
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined.");
      // We will lazily fail if the client actually attempts to make a request
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please set it in the Settings > Secrets panel.");
    }
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

const archivalWorkflowSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "A concise, descriptive archival title for this photograph"
    },
    quickValue: {
      type: Type.OBJECT,
      description: "Step 1 & 8: Quick Value Assessment",
      properties: {
        estimatedValueRange: { 
          type: Type.STRING,
          description: "string range, e.g. '$45 - $90'"
        },
        valuePotential: { 
          type: Type.STRING,
          description: "One of: High, Medium, Low"
        },
        rarityScore: { 
          type: Type.INTEGER,
          description: "Rarity rating from 1 to 10"
        },
        keyFactors: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Key historical value factors"
        },
        aiReasoning: { 
          type: Type.STRING,
          description: "Curator's description of value factors"
        }
      },
      required: ["estimatedValueRange", "valuePotential", "rarityScore", "keyFactors", "aiReasoning"]
    },
    formatId: {
      type: Type.OBJECT,
      description: "Step 2: Format Identification",
      properties: {
        predictedFormat: { 
          type: Type.STRING,
          description: "Cabinet Card, Daguerreotype, Ambrotype, Tintype, etc."
        },
        baseMaterial: { 
          type: Type.STRING,
          description: "Metal, Glass, Paper, or Other"
        },
        physicalAttributes: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Physical traits"
        },
        explanation: { 
          type: Type.STRING,
          description: "Why this format was predicted"
        }
      },
      required: ["predictedFormat", "baseMaterial", "physicalAttributes", "explanation"]
    },
    provenance: {
      type: Type.OBJECT,
      description: "Step 3: Provenance Details",
      properties: {
        studioName: { type: Type.STRING },
        studioAddress: { type: Type.STRING },
        handwrittenText: { type: Type.STRING },
        stampsAndMarkings: { type: Type.ARRAY, items: { type: Type.STRING } },
        provenanceClues: { type: Type.STRING }
      },
      required: ["studioName", "studioAddress", "handwrittenText", "stampsAndMarkings", "provenanceClues"]
    },
    dating: {
      type: Type.OBJECT,
      description: "Step 4: Dating Chronology",
      properties: {
        estimatedDecade: { type: Type.STRING },
        estimatedYearRange: { type: Type.STRING },
        confidenceLevel: { type: Type.STRING },
        fashionClues: { type: Type.ARRAY, items: { type: Type.STRING } },
        technologicalClues: { type: Type.ARRAY, items: { type: Type.STRING } },
        explanation: { type: Type.STRING }
      },
      required: ["estimatedDecade", "estimatedYearRange", "confidenceLevel", "fashionClues", "technologicalClues", "explanation"]
    },
    classification: {
      type: Type.OBJECT,
      description: "Step 5: Subject & Scene Classification",
      properties: {
        primaryCategory: { type: Type.STRING },
        scenicDescription: { type: Type.STRING },
        identifiedObjects: { type: Type.ARRAY, items: { type: Type.STRING } },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["primaryCategory", "scenicDescription", "identifiedObjects", "tags"]
    },
    research: {
      type: Type.OBJECT,
      description: "Step 6: Historical Research Directions",
      properties: {
        requiresDeeperResearch: { type: Type.BOOLEAN },
        photographerBio: { type: Type.STRING },
        historicalContext: { type: Type.STRING },
        suggestedDatabases: { type: Type.ARRAY, items: { type: Type.STRING } },
        researchLeads: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["requiresDeeperResearch", "photographerBio", "historicalContext", "suggestedDatabases", "researchLeads"]
    },
    inventory: {
      type: Type.OBJECT,
      description: "Step 7: Inventory & SKU",
      properties: {
        sku: { type: Type.STRING },
        conditionGrading: { type: Type.STRING },
        storageLocation: { type: Type.STRING },
        accessionNumber: { type: Type.STRING },
        notes: { type: Type.STRING }
      },
      required: ["sku", "conditionGrading", "storageLocation", "accessionNumber", "notes"]
    },
    listing: {
      type: Type.OBJECT,
      description: "Step 8 & 9: Listing & Pricing",
      properties: {
        suggestedPrice: { type: Type.NUMBER },
        priceJustification: { type: Type.STRING },
        listingTitle: { type: Type.STRING },
        listingDescription: { type: Type.STRING },
        suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["suggestedPrice", "priceJustification", "listingTitle", "listingDescription", "suggestedTags"]
    },
    status: {
      type: Type.OBJECT,
      description: "Step 9: Archival Registry Status",
      properties: {
        currentStatus: { type: Type.STRING, description: "One of: Archived, Listed for Sale, Sold, Donated, Exhibited" },
        archivalNotes: { type: Type.STRING },
        archivedAt: { type: Type.STRING, description: "ISO date YYYY-MM-DD" }
      },
      required: ["currentStatus", "archivalNotes", "archivedAt"]
    }
  },
  required: [
    "title",
    "quickValue",
    "formatId",
    "provenance",
    "dating",
    "classification",
    "research",
    "inventory",
    "listing",
    "status"
  ]
};

// Helper to retry Gemini API calls in case of temporary 503 / 429 errors
async function callGeminiWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      console.error(`Gemini API call failed (attempt ${attempt}/${maxRetries}):`, err);
      
      const errorMessage = (err.message || "").toUpperCase();
      const statusCode = err.status || err.statusCode || (err.code ? String(err.code) : "");
      
      const isTransient = 
        statusCode === "503" || 
        statusCode === "429" ||
        errorMessage.includes("503") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("DEMAND") || 
        errorMessage.includes("TEMPORARY") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("OVERLOADED") ||
        errorMessage.includes("LIMIT");
        
      if (!isTransient || attempt >= maxRetries) {
        throw err;
      }
      
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms due to transient model error...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Gemini API request failed after retry attempts.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 image uploads
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));

  // API Route: Analyze Front Side of Vintage Photo
  app.post("/api/analyze-front", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType." });
      }

      console.log("Analyzing front image, size:", Math.round(image.length / 1024), "KB");
      const client = getGeminiClient();

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: image,
        },
      };

      const systemInstruction = `You are a professional archivist, museum curator, and antique photograph valuation expert.
You are analyzing a historical photograph uploaded by a user.
Conduct a meticulous, visually detailed analysis to provide pre-filled records for our 9-step Archival & Valuation Workflow:
Step 1: Quick Value Assessment (rarity score, commercial potential, key value factors)
Step 2: Identify Format (predicted format e.g. Daguerreotype, Ambrotype, Tintype, Carte de Visite, Cabinet Card, Real Photo Postcard, Paper Print. List physical attributes and material)
Step 3: Read Back & Provenance (extract visible studio stamps, photographer marks, addresses, names)
Step 4: Date the Photo (estimate decade, year range, confidence, based on fashion/tech clues like hairstyles, attire, collar width, card edges)
Step 5: Subject Classification (primary category, scenic description, identified objects, search tags)
Step 6: Research Decision (is deep research required? list photographer bio details and recommended historical databases)
Step 7: Inventory & SKU (suggested inventory SKU format e.g. PHO-1890s-FALK-001, initial condition grading, location recommendation)
Step 8: Listing & Pricing (suggested commercial resale price, justification, listing title, and a professional descriptive sales write-up)

Return your response strictly in the JSON format matching the schema requested. Be as historically accurate, detailed, and specific as possible. If some details are not visible, infer or estimate based on visible historical styles (clothing, hair, borders) and clearly state your assumptions.`;

      const prompt = `Inspect this vintage photograph carefully. Focus on elements like card thickness, borders, clothing styles (bustles, necklines, sleeves, collars), hair and facial styles, and studio marks printed at the bottom. Fill in the following JSON schema:
      
      {
        "title": "A concise, descriptive archival title for this photograph",
        "quickValue": {
          "estimatedValueRange": "string range, e.g. '$45 - $90'",
          "valuePotential": "High" | "Medium" | "Low",
          "rarityScore": number (1-10),
          "keyFactors": ["list of strings"],
          "aiReasoning": "Curator's description of value factors"
        },
        "formatId": {
          "predictedFormat": "string e.g. 'Cabinet Card' or 'Tintype'",
          "baseMaterial": "Metal" | "Glass" | "Paper" | "Other",
          "physicalAttributes": ["list of strings"],
          "explanation": "Why you predicted this format"
        },
        "provenance": {
          "studioName": "string representing the photographer or studio name if visible, otherwise 'Unknown Photographer'",
          "studioAddress": "string representing the studio address or city if visible, otherwise 'Unknown Location'",
          "handwrittenText": "string representing any text written on the front if any",
          "stampsAndMarkings": ["list of studio logo text, logos, or embossed seals found on the front"],
          "provenanceClues": "Curator notes on the studio, photographer, or geographic markers"
        },
        "dating": {
          "estimatedDecade": "string e.g. '1890s'",
          "estimatedYearRange": "string e.g. '1892 - 1897'",
          "confidenceLevel": "High" | "Medium" | "Low",
          "fashionClues": ["list of clothing, dress, hair, collar, or hat clues"],
          "technologicalClues": ["list of technical indicators like tint/sepia, matte finish, silver mirroring"],
          "explanation": "Comprehensive dating analysis and justification"
        },
        "classification": {
          "primaryCategory": "string e.g. 'Portrait', 'Military', 'Occupational', 'Landscape', 'Post-Mortem'",
          "scenicDescription": "Detailed visual description of subjects and scenery",
          "identifiedObjects": ["list of key objects visible in photo"],
          "tags": ["list of searchable museum tags"]
        },
        "research": {
          "requiresDeeperResearch": boolean,
          "photographerBio": "Historical information about this specific studio or photographer if known, or typical profile of similar historical photographers",
          "historicalContext": "Historical backdrop of the era, styling, or subject types",
          "suggestedDatabases": ["list of databases e.g. 'Library of Congress', 'City Directories', 'FindAGrave'"],
          "researchLeads": ["list of action steps for further research"]
        },
        "inventory": {
          "sku": "string e.g. 'PHO-1890-FALK-01'",
          "conditionGrading": "Mint (M)" | "Fine (F)" | "Good (G)" | "Fair" | "Poor (P)",
          "storageLocation": "string recommended location e.g. 'Acid-Free Sleeve Box A'",
          "accessionNumber": "string e.g. 'ACC-1001'",
          "notes": "string initial archival notes"
        },
        "listing": {
          "suggestedPrice": number,
          "priceJustification": "Reasoning for the price valuation",
          "listingTitle": "A catchy yet professional e-commerce/catalog listing title",
          "listingDescription": "A professional sales and historical description suitable for listing this item on eBay, Etsy, or an auction catalog",
          "suggestedTags": ["list of commercial tags"]
        }
      }`;

      const response = await callGeminiWithRetry(() => client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          systemInstruction: systemInstruction + "\nCRITICAL: You must return valid JSON that conforms exactly to the requested schema. Ensure all double quotes inside string fields are strictly escaped with backslashes (e.g. \\\"Falk\\\") or replaced with single quotes to prevent JSON parsing issues.",
          responseMimeType: "application/json",
          responseSchema: archivalWorkflowSchema,
          temperature: 0.2, // Lower temperature for more factual archival output
        },
      }));

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("Analysis completed successfully.");
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);

    } catch (err: any) {
      console.error("Error analyzing photo front:", err);
      let clientMsg = err.message || "Failed to analyze photo front side.";
      const errMsgUpper = clientMsg.toUpperCase();
      if (clientMsg.includes("503") || errMsgUpper.includes("UNAVAILABLE") || errMsgUpper.includes("DEMAND") || errMsgUpper.includes("OVERLOADED")) {
        clientMsg = "The AI Archival Reasoner is currently experiencing high model demand. This is usually very temporary. Please wait a moment and try uploading your photograph again.";
      }
      res.status(500).json({ error: clientMsg });
    }
  });

  // API Route: Analyze Back Side of Vintage Photo to refine the steps
  app.post("/api/analyze-back", async (req, res) => {
    try {
      const { image, mimeType, currentRecordSteps } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({ error: "Missing image data or mimeType." });
      }

      console.log("Analyzing back image and merging data...");
      const client = getGeminiClient();

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: image,
        },
      };

      const systemInstruction = `You are a professional archivist and handwriting expert.
You are analyzing the back (reverse side) of an antique photograph.
The back of historical photos often contains handwriting, penciled name tags, US revenue tax stamps (which date to 1864-1866), studio logos, addresses, or advertisements.
You will extract all text (OCR), describe stamps/markings, and refine the existing record's details.

Return your response strictly in JSON matching the schema. Integrate what you see on the back with the previous data provided. If you find handwriting with names or dates, refine the title, provenance, dating, and listing description!`;

      const prompt = `OCR and inspect the back of this photograph. Under 'provenance', extract 'handwrittenText' and add any newly discovered 'stampsAndMarkings'. If the back reveals specific information like names, locations, photographer directories, or exact dates, refine the overall 'dating', 'title', and commercial listing.
      
      Previous steps data: ${JSON.stringify(currentRecordSteps || {})}
      
      Return a complete updated set of steps. Maintain the same schema:
      {
        "title": "Updated descriptive title reflecting back-side details if any",
        "quickValue": { ... },
        "formatId": { ... },
        "provenance": {
          "studioName": "Refined studio name if found",
          "studioAddress": "Refined studio address if found",
          "handwrittenText": "Exact transcription of any handwriting visible on the back",
          "stampsAndMarkings": ["Stamps or ads found on the back"],
          "provenanceClues": "Combined curator notes with back side clues"
        },
        "dating": {
          "estimatedDecade": "Refined decade if precise clues are on the back",
          "estimatedYearRange": "Refined range based on tax stamps or signatures",
          "confidenceLevel": "High" | "Medium" | "Low",
          "fashionClues": [ ... ],
          "technologicalClues": ["e.g. US Revenue Tax Stamp 1864-1866", "Ad layout styles"],
          "explanation": "Refined dating logic reflecting both sides of the photo"
        },
        "classification": { ... },
        "research": {
          "requiresDeeperResearch": boolean,
          "photographerBio": "...",
          "historicalContext": "...",
          "suggestedDatabases": [ ... ],
          "researchLeads": [ ... ]
        },
        "inventory": { ... },
        "listing": {
          "suggestedPrice": number,
          "priceJustification": "...",
          "listingTitle": "Refined listing title",
          "listingDescription": "Refined listing description incorporating handwriting, names, or new provenance details",
          "suggestedTags": [ ... ]
        }
      }`;

      const response = await callGeminiWithRetry(() => client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          systemInstruction: systemInstruction + "\nCRITICAL: You must return valid JSON that conforms exactly to the requested schema. Ensure all double quotes inside string fields are strictly escaped with backslashes (e.g. \\\"Falk\\\") or replaced with single quotes to prevent JSON parsing issues.",
          responseMimeType: "application/json",
          responseSchema: archivalWorkflowSchema,
          temperature: 0.2,
        },
      }));

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("Back side analysis completed.");
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);

    } catch (err: any) {
      console.error("Error analyzing photo back:", err);
      let clientMsg = err.message || "Failed to analyze photo back side.";
      const errMsgUpper = clientMsg.toUpperCase();
      if (clientMsg.includes("503") || errMsgUpper.includes("UNAVAILABLE") || errMsgUpper.includes("DEMAND") || errMsgUpper.includes("OVERLOADED")) {
        clientMsg = "The AI Archival Reasoner is currently experiencing high model demand. This is usually very temporary. Please wait a moment and try uploading your reverse side again.";
      }
      res.status(500).json({ error: clientMsg });
    }
  });

  // API Route: Quick Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", apiKeyConfigured: !!apiKey });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
