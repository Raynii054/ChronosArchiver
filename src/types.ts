/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuickValueAssessment {
  estimatedValueRange: string; // e.g., "$50 - $120"
  valuePotential: "High" | "Medium" | "Low";
  rarityScore: number; // 1 to 10
  keyFactors: string[];
  aiReasoning: string;
}

export interface FormatIdentification {
  predictedFormat: string; // e.g., "Cabinet Card", "Daguerreotype", "Tintype", "Ambrotype", "Carte de Visite"
  baseMaterial: "Metal" | "Glass" | "Paper" | "Other";
  physicalAttributes: string[];
  explanation: string;
}

export interface ReadBackProvenance {
  studioName: string;
  studioAddress: string;
  handwrittenText: string;
  stampsAndMarkings: string[];
  provenanceClues: string;
}

export interface DateAnalysis {
  estimatedDecade: string; // e.g., "1880s"
  estimatedYearRange: string; // e.g., "1882 - 1886"
  confidenceLevel: "High" | "Medium" | "Low";
  fashionClues: string[];
  technologicalClues: string[];
  explanation: string;
}

export interface SubjectClassification {
  primaryCategory: string; // e.g., "Portrait", "Military", "Occupational", "Post-Mortem", "Landscape"
  scenicDescription: string;
  identifiedObjects: string[];
  tags: string[];
}

export interface ResearchDecision {
  requiresDeeperResearch: boolean;
  photographerBio: string;
  historicalContext: string;
  suggestedDatabases: string[]; // e.g., "Library of Congress", "FindAGrave", "City Directories"
  researchLeads: string[];
}

export interface InventorySku {
  sku: string;
  conditionGrading: "Mint (M)" | "Fine (F)" | "Good (G)" | "Fair" | "Poor (P)";
  storageLocation: string; // e.g., "Box A, Folder B"
  accessionNumber: string;
  notes: string;
}

export interface ListingPricing {
  suggestedPrice: number;
  priceJustification: string;
  listingTitle: string;
  listingDescription: string;
  suggestedTags: string[];
}

export interface ArchivalStatus {
  currentStatus: "Archived" | "Listed for Sale" | "Sold" | "Donated" | "Exhibited";
  archivalNotes: string;
  archivedAt: string;
}

export interface PhotoRecordSteps {
  quickValue: QuickValueAssessment;
  formatId: FormatIdentification;
  provenance: ReadBackProvenance;
  dating: DateAnalysis;
  classification: SubjectClassification;
  research: ResearchDecision;
  inventory: InventorySku;
  listing: ListingPricing;
  status: ArchivalStatus;
}

export interface PhotoRecord {
  id: string;
  title: string;
  frontImage: string; // base64 representation
  backImage?: string;  // base64 representation of the reverse side (optional)
  dateCreated: string;
  steps: PhotoRecordSteps;
  currentStepIndex: number; // Keep track of progress in the 9-step wizard
}

export interface BatchQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  progress: number;
  resultRecord?: PhotoRecord;
}
