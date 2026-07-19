/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Database, 
  DollarSign, 
  FileText, 
  Calendar, 
  Tag, 
  SearchCode, 
  Clipboard, 
  ShoppingBag, 
  Archive,
  Upload,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  SlidersHorizontal,
  Clock
} from "lucide-react";
import { PhotoRecord, PhotoRecordSteps, BatchQueueItem } from "./types";
import PhotoCardFrame from "./components/PhotoCardFrame";
import Certificate from "./components/Certificate";
import { getAllRecords, saveAllRecordsToDB } from "./utils/db";
import { resizeImageAndToBase64 } from "./utils/image";

// Elegant Unsplash URL representing a real vintage cabinet card of a gentleman with a mustache (Falk Style, c. 1890)
const SAMPLE_IMAGE_URL = "https://images.unsplash.com/photo-1580130281326-95bc17d50309?q=80&w=800";

const INITIAL_STEPS_STATE: PhotoRecordSteps = {
  quickValue: {
    estimatedValueRange: "$40 - $75",
    valuePotential: "Medium",
    rarityScore: 5,
    keyFactors: ["Original Falk Cabinet Card", "Clear studio embossing", "Subject in fine attire"],
    aiReasoning: "Standard late-Victorian portrait printed by Falk Studios, San Francisco. Highly collectible geographic studio marks enhance market value, though the subject is unidentified."
  },
  formatId: {
    predictedFormat: "Cabinet Card",
    baseMaterial: "Paper",
    physicalAttributes: ["Thick cardboard mount", "Scalloped edges", "Gold gilt border"],
    explanation: "The heavy cardboard stock, dimensions matching 4.25\" x 6.5\", and characteristic gold foil borders are classic features of Cabinet Card prints of the late 19th century."
  },
  provenance: {
    studioName: "Falk Studio",
    studioAddress: "349 Market St, San Francisco, CA",
    handwrittenText: "Grandfather Edward, 1894",
    stampsAndMarkings: ["Falk Studio Embossed Gold Mark", "349 Market Street address stamp"],
    provenanceClues: "Falk operated one of San Francisco's premier photographic studios in the late 19th century. The address of 349 Market St is associated with his 1890-1896 operations."
  },
  dating: {
    estimatedDecade: "1890s",
    estimatedYearRange: "1892 - 1895",
    confidenceLevel: "High",
    fashionClues: ["High stand-up collar", "Full handlebar mustache", "Three-piece formal wool suit"],
    technologicalClues: ["Sepia silver-gelatin printing", "Heavy cream board mounting"],
    explanation: "Dating is heavily supported by the gentleman's high, stiff shirt collar and broad mustache, popular in the early 1890s, and the photographic studio's operational dates at this address."
  },
  classification: {
    primaryCategory: "Portrait",
    scenicDescription: "A formal studio portrait of a mature gentleman seated in a carved wooden studio chair. He is looking slightly off-camera with a serious demeanor, wearing a formal wool suit.",
    identifiedObjects: ["Carved studio chair", "Pocket watch chain", "Gentleman's tie pin"],
    tags: ["Gentleman", "San Francisco", "Victorian Fashion", "Handlebar Mustache", "1890s Suit"]
  },
  research: {
    requiresDeeperResearch: true,
    photographerBio: "H.J. Falk was an influential West Coast photographer known for staging portraits of theatrical stars and prominent citizens. He established multiple studios in San Francisco.",
    historicalContext: "The Gilded Era in San Francisco was marked by explosive commercial growth, leading to a boom in middle-class formal portraiture.",
    suggestedDatabases: ["San Francisco City Directories (1890-1898)", "Library of Congress Photo Archive", "FindAGrave California Index"],
    researchLeads: ["Cross-reference city directories for H.J. Falk studio relocation dates", "Search local cemetery records for 'Edward' matching estimated age in 1894"]
  },
  inventory: {
    sku: "PHO-1894-FALK-001",
    conditionGrading: "Good (G)",
    storageLocation: "Acid-Free Portfolio Box 3",
    accessionNumber: "ACC-1894-012",
    notes: "Minor silver mirroring around the dark edge corners, otherwise excellent contrast and preservation."
  },
  listing: {
    suggestedPrice: 55.00,
    priceJustification: "Standard collectible pricing for West Coast studios, bolstered by regional appeal and identified subject name 'Edward'.",
    listingTitle: "Antique 1894 Cabinet Card Portrait by Falk, San Francisco - Gentleman Edward",
    listingDescription: "Offering a highly preserved original late-Victorian Cabinet Card photograph featuring a handsome gentleman identified as 'Edward'. Captured by the renowned Falk Studio, located at 349 Market St, San Francisco, circa 1894. The photo showcases exceptional photographic contrast, scalloped edges, and gold gilt detailing. Ideal for historians, collectors of California Memorabilia, or Victorian fashion enthusiasts.",
    suggestedTags: ["Cabinet Card", "Falk San Francisco", "Antique Portrait 1894", "California History"]
  },
  status: {
    currentStatus: "Archived",
    archivalNotes: "Entered into public historical archive ledger.",
    archivedAt: "2026-07-09"
  }
};

export default function App() {
  const [records, setRecords] = useState<PhotoRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<PhotoRecord | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingBack, setIsAnalyzingBack] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [selectedCertificateRecord, setSelectedCertificateRecord] = useState<PhotoRecord | null>(null);

  // Collection Browsing and Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [filterFormat, setFilterFormat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  // Batch Queue State
  const [batchQueue, setBatchQueue] = useState<BatchQueueItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [currentlyProcessingId, setCurrentlyProcessingId] = useState<string | null>(null);
  const [activeIngestionMode, setActiveIngestionMode] = useState<"single" | "batch">("single");
  const [batchDragActive, setBatchDragActive] = useState(false);

  // Queue Manager: triggers next item when processing finishes
  useEffect(() => {
    if (!isBatchProcessing) return;
    if (currentlyProcessingId) return; // Already analyzing something

    // Find first queued item
    const nextItem = batchQueue.find(item => item.status === "queued");
    if (nextItem) {
      setCurrentlyProcessingId(nextItem.id);
    } else {
      // Nothing left in queue to process
      setIsBatchProcessing(false);
    }
  }, [isBatchProcessing, batchQueue, currentlyProcessingId]);

  // Active Item Processor: runs the actual API call for currentlyProcessingId
  useEffect(() => {
    if (!currentlyProcessingId) return;

    const item = batchQueue.find(q => q.id === currentlyProcessingId);
    if (!item || item.status !== "queued") {
      setCurrentlyProcessingId(null);
      return;
    }

    let isSubscribed = true;

    const processItem = async () => {
      // Set status to processing
      setBatchQueue(prev => prev.map(q => q.id === currentlyProcessingId ? { ...q, status: "processing", progress: 15 } : q));

      try {
        if (!isSubscribed) return;
        const { base64, mimeType } = await resizeImageAndToBase64(item.file, 1000);
        
        if (!isSubscribed) return;
        setBatchQueue(prev => prev.map(q => q.id === currentlyProcessingId ? { ...q, progress: 45 } : q));

        const response = await fetch("/api/analyze-front", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to analyze photo front side.");
        }

        if (!isSubscribed) return;
        setBatchQueue(prev => prev.map(q => q.id === currentlyProcessingId ? { ...q, progress: 75 } : q));

        const stepsResult: PhotoRecordSteps = await response.json();

        const safeSteps: PhotoRecordSteps = {
          quickValue: stepsResult.quickValue || {
            estimatedValueRange: "$20 - $50",
            valuePotential: "Medium",
            rarityScore: 3,
            keyFactors: ["Inferred vintage photo"],
            aiReasoning: "Initial automatic evaluation."
          },
          formatId: stepsResult.formatId || {
            predictedFormat: "Paper Print",
            baseMaterial: "Paper",
            physicalAttributes: [],
            explanation: "Analyzed automatic format."
          },
          provenance: stepsResult.provenance || {
            studioName: "Unknown Photographer",
            studioAddress: "Unknown Location",
            handwrittenText: "",
            stampsAndMarkings: [],
            provenanceClues: ""
          },
          dating: stepsResult.dating || {
            estimatedDecade: "Unknown",
            estimatedYearRange: "Unknown",
            confidenceLevel: "Low",
            fashionClues: [],
            technologicalClues: [],
            explanation: ""
          },
          classification: stepsResult.classification || {
            primaryCategory: "Portrait",
            scenicDescription: "",
            identifiedObjects: [],
            tags: []
          },
          research: stepsResult.research || {
            requiresDeeperResearch: false,
            photographerBio: "",
            historicalContext: "",
            suggestedDatabases: [],
            researchLeads: []
          },
          inventory: stepsResult.inventory || {
            sku: "",
            conditionGrading: "Good (G)",
            storageLocation: "General Storage",
            accessionNumber: "",
            notes: ""
          },
          listing: stepsResult.listing || {
            suggestedPrice: 20,
            priceJustification: "",
            listingTitle: item.file.name.split(".")[0],
            listingDescription: "",
            suggestedTags: []
          },
          status: stepsResult.status || {
            currentStatus: "Archived",
            archivalNotes: "Initially analyzed and added to the workbook ledger.",
            archivedAt: new Date().toISOString().split("T")[0]
          }
        };

        if (safeSteps.status && !safeSteps.status.currentStatus) {
          safeSteps.status.currentStatus = "Archived";
        }
        if (safeSteps.status && !safeSteps.status.archivedAt) {
          safeSteps.status.archivedAt = new Date().toISOString().split("T")[0];
        }
        if (safeSteps.status && !safeSteps.status.archivalNotes) {
          safeSteps.status.archivalNotes = "Initially analyzed and added to the workbook ledger.";
        }

        const newRecord: PhotoRecord = {
          id: "rec-" + (Date.now() + Math.floor(Math.random() * 1000)),
          title: safeSteps.listing.listingTitle || item.file.name.split(".")[0],
          frontImage: `data:${mimeType};base64,${base64}`,
          dateCreated: new Date().toISOString(),
          steps: safeSteps,
          currentStepIndex: 0
        };

        if (isSubscribed) {
          // Prepend to catalog records
          setRecords(prev => {
            const updated = [newRecord, ...prev];
            saveAllRecordsToDB(updated).catch(err => console.error("DB Save failed:", err));
            return updated;
          });

          // Mark completed
          setBatchQueue(prev => prev.map(q => q.id === currentlyProcessingId ? { ...q, status: "completed", progress: 100, resultRecord: newRecord } : q));
          setCurrentlyProcessingId(null);
        }

      } catch (err: any) {
        console.error("Batch processing error:", err);
        if (isSubscribed) {
          setBatchQueue(prev => prev.map(q => q.id === currentlyProcessingId ? { ...q, status: "failed", error: err.message || "Failed during vision analysis" } : q));
          setCurrentlyProcessingId(null);
        }
      }
    };

    processItem();

    return () => {
      isSubscribed = false;
    };
  }, [currentlyProcessingId]);

  const handleAddFilesToQueue = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newItems: BatchQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      newItems.push({
        id: "queue-" + Date.now() + "-" + i + "-" + Math.floor(Math.random() * 1000),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        progress: 0
      });
    }

    if (newItems.length > 0) {
      setBatchQueue(prev => [...prev, ...newItems]);
      // Auto-start processing if not already started
      setIsBatchProcessing(true);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setBatchQueue(prev => {
      const item = prev.find(q => q.id === id);
      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter(q => q.id !== id);
    });
    if (currentlyProcessingId === id) {
      setCurrentlyProcessingId(null);
    }
  };

  const handleClearQueue = () => {
    batchQueue.forEach(item => {
      URL.revokeObjectURL(item.previewUrl);
    });
    setBatchQueue([]);
    setIsBatchProcessing(false);
    setCurrentlyProcessingId(null);
  };

  // Computed dynamic filters for format and status dropdowns
  const uniqueFormats = Array.from(new Set(records.map(r => r.steps.formatId.predictedFormat).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(records.map(r => r.steps.status.currentStatus).filter(Boolean)));

  // Filtered and Sorted Records
  const filteredAndSortedRecords = records
    .filter((rec) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const titleMatch = rec.title.toLowerCase().includes(query);
        const skuMatch = (rec.steps.inventory.sku || "").toLowerCase().includes(query);
        const formatMatch = rec.steps.formatId.predictedFormat.toLowerCase().includes(query);
        const decadeMatch = rec.steps.dating.estimatedDecade.toLowerCase().includes(query);
        const tagMatch = rec.steps.classification.tags.some(t => t.toLowerCase().includes(query));
        if (!titleMatch && !skuMatch && !formatMatch && !decadeMatch && !tagMatch) {
          return false;
        }
      }

      // Format filter
      if (filterFormat !== "all") {
        if (rec.steps.formatId.predictedFormat !== filterFormat) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== "all") {
        if (rec.steps.status.currentStatus !== filterStatus) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
      }
      if (sortBy === "decade-asc") {
        const yearA = parseInt(a.steps.dating.estimatedDecade.replace(/\D/g, "")) || 0;
        const yearB = parseInt(b.steps.dating.estimatedDecade.replace(/\D/g, "")) || 0;
        return yearA - yearB;
      }
      if (sortBy === "decade-desc") {
        const yearA = parseInt(a.steps.dating.estimatedDecade.replace(/\D/g, "")) || 0;
        const yearB = parseInt(b.steps.dating.estimatedDecade.replace(/\D/g, "")) || 0;
        return yearB - yearA; // Descending
      }
      if (sortBy === "value-desc") {
        const priceA = a.steps.listing.suggestedPrice || parseFloat(a.steps.quickValue.estimatedValueRange.replace(/[^0-9.]/g, "")) || 0;
        const priceB = b.steps.listing.suggestedPrice || parseFloat(b.steps.quickValue.estimatedValueRange.replace(/[^0-9.]/g, "")) || 0;
        return priceB - priceA;
      }
      if (sortBy === "rarity-desc") {
        const rarityA = a.steps.quickValue.rarityScore || 0;
        const rarityB = b.steps.quickValue.rarityScore || 0;
        return rarityB - rarityA;
      }
      return 0;
    });

  // Check health and load archives on mount
  useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(data => {
        setApiOnline(data.status === "ok");
      })
      .catch(() => {
        setApiOnline(false);
      });

    // Load from IndexedDB
    getAllRecords().then((dbRecords) => {
      if (dbRecords && dbRecords.length > 0) {
        setRecords(dbRecords);
      } else {
        // Fallback to localStorage if IndexedDB is empty
        const saved = localStorage.getItem("archivist_photo_records");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.length > 0) {
              setRecords(parsed);
              // Migrate to IndexedDB
              saveAllRecordsToDB(parsed).then(() => {
                // Clear localStorage once migrated successfully to prevent future quota issues
                localStorage.removeItem("archivist_photo_records");
              }).catch((err) => console.error("Migration to IndexedDB failed:", err));
            }
          } catch (err) {
            console.error("Failed to load records from localStorage", err);
          }
        }
      }
    }).catch((err) => {
      console.error("IndexedDB error, falling back to localStorage:", err);
      const saved = localStorage.getItem("archivist_photo_records");
      if (saved) {
        try {
          setRecords(JSON.parse(saved));
        } catch (e) {
          console.error("LocalStorage fallback load failed:", e);
        }
      }
    });
  }, []);

  // Save to IndexedDB with fallback
  const saveRecords = (newRecords: PhotoRecord[]) => {
    setRecords(newRecords);
    saveAllRecordsToDB(newRecords).catch((err) => {
      console.error("Failed to save to IndexedDB, falling back to localStorage:", err);
      try {
        localStorage.setItem("archivist_photo_records", JSON.stringify(newRecords));
      } catch (e) {
        console.error("LocalStorage save failed (quota probably exceeded):", e);
      }
    });
  };

  // Process Front Image Upload
  const handleUploadFront = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset the input value so that selecting the same file again triggers onChange
    e.target.value = "";

    setIsAnalyzing(true);
    setApiError(null);

    try {
      const { base64, mimeType } = await resizeImageAndToBase64(file, 1000);

      // Call Express server-side API to invoke Gemini
      const response = await fetch("/api/analyze-front", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze photo front side.");
      }

      const stepsResult: PhotoRecordSteps = await response.json();

      const safeSteps: PhotoRecordSteps = {
        quickValue: stepsResult.quickValue || {
          estimatedValueRange: "$20 - $50",
          valuePotential: "Medium",
          rarityScore: 3,
          keyFactors: ["Inferred vintage photo"],
          aiReasoning: "Initial automatic evaluation."
        },
        formatId: stepsResult.formatId || {
          predictedFormat: "Paper Print",
          baseMaterial: "Paper",
          physicalAttributes: [],
          explanation: "Analyzed automatic format."
        },
        provenance: stepsResult.provenance || {
          studioName: "Unknown Photographer",
          studioAddress: "Unknown Location",
          handwrittenText: "",
          stampsAndMarkings: [],
          provenanceClues: ""
        },
        dating: stepsResult.dating || {
          estimatedDecade: "Unknown",
          estimatedYearRange: "Unknown",
          confidenceLevel: "Low",
          fashionClues: [],
          technologicalClues: [],
          explanation: ""
        },
        classification: stepsResult.classification || {
          primaryCategory: "Portrait",
          scenicDescription: "",
          identifiedObjects: [],
          tags: []
        },
        research: stepsResult.research || {
          requiresDeeperResearch: false,
          photographerBio: "",
          historicalContext: "",
          suggestedDatabases: [],
          researchLeads: []
        },
        inventory: stepsResult.inventory || {
          sku: "",
          conditionGrading: "Good (G)",
          storageLocation: "General Storage",
          accessionNumber: "",
          notes: ""
        },
        listing: stepsResult.listing || {
          suggestedPrice: 20,
          priceJustification: "",
          listingTitle: file.name.split(".")[0],
          listingDescription: "",
          suggestedTags: []
        },
        status: stepsResult.status || {
          currentStatus: "Archived",
          archivalNotes: "Initially analyzed and added to the workbook ledger.",
          archivedAt: new Date().toISOString().split("T")[0]
        }
      };

      if (safeSteps.status && !safeSteps.status.currentStatus) {
        safeSteps.status.currentStatus = "Archived";
      }
      if (safeSteps.status && !safeSteps.status.archivedAt) {
        safeSteps.status.archivedAt = new Date().toISOString().split("T")[0];
      }
      if (safeSteps.status && !safeSteps.status.archivalNotes) {
        safeSteps.status.archivalNotes = "Initially analyzed and added to the workbook ledger.";
      }

      const newRecord: PhotoRecord = {
        id: "rec-" + Date.now(),
        title: safeSteps.listing.listingTitle || file.name.split(".")[0],
        frontImage: `data:${mimeType};base64,${base64}`,
        dateCreated: new Date().toISOString(),
        steps: safeSteps,
        currentStepIndex: 0
      };

      setCurrentRecord(newRecord);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "An unexpected error occurred while analyzing the photograph.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process Back Side Inscription Image Upload
  const handleUploadBack = async (base64: string, fileType: string) => {
    if (!currentRecord) return;

    setIsAnalyzingBack(true);
    setApiError(null);

    try {
      const response = await fetch("/api/analyze-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: fileType,
          currentRecordSteps: currentRecord.steps,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze photo back side.");
      }

      const updatedSteps: PhotoRecordSteps = await response.json();

      const safeSteps: PhotoRecordSteps = {
        quickValue: updatedSteps.quickValue || currentRecord.steps.quickValue,
        formatId: updatedSteps.formatId || currentRecord.steps.formatId,
        provenance: updatedSteps.provenance || currentRecord.steps.provenance,
        dating: updatedSteps.dating || currentRecord.steps.dating,
        classification: updatedSteps.classification || currentRecord.steps.classification,
        research: updatedSteps.research || currentRecord.steps.research,
        inventory: updatedSteps.inventory || currentRecord.steps.inventory,
        listing: updatedSteps.listing || currentRecord.steps.listing,
        status: updatedSteps.status || currentRecord.steps.status || {
          currentStatus: "Archived",
          archivalNotes: "Initially analyzed and added to the workbook ledger.",
          archivedAt: new Date().toISOString().split("T")[0]
        }
      };

      if (safeSteps.status && !safeSteps.status.currentStatus) {
        safeSteps.status.currentStatus = "Archived";
      }

      const updatedRecord: PhotoRecord = {
        ...currentRecord,
        backImage: `data:${fileType};base64,${base64}`,
        steps: safeSteps,
        // Automatically advance or stay on Read Back / Provenance (index 2)
        currentStepIndex: 2
      };

      setCurrentRecord(updatedRecord);
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || "Failed to analyze or extract inscriptions from back side.");
    } finally {
      setIsAnalyzingBack(false);
    }
  };

  // Load Built-in Sample Photo for immediate testing
  const handleLoadSample = () => {
    setIsAnalyzing(true);
    setApiError(null);

    // Simulate loading with a small timeout
    setTimeout(() => {
      const sampleRecord: PhotoRecord = {
        id: "rec-sample",
        title: "Gentleman 'Edward' Studio Portrait, San Francisco",
        frontImage: SAMPLE_IMAGE_URL,
        dateCreated: new Date().toISOString(),
        steps: JSON.parse(JSON.stringify(INITIAL_STEPS_STATE)),
        currentStepIndex: 0
      };

      setCurrentRecord(sampleRecord);
      setIsAnalyzing(false);
    }, 800);
  };

  // Save/Update the active record in the catalog ledger
  const handleSaveToCatalog = (showCertificate = true) => {
    if (!currentRecord) return;

    const existingIndex = records.findIndex(r => r.id === currentRecord.id);
    let updatedRecords = [...records];

    if (existingIndex >= 0) {
      updatedRecords[existingIndex] = currentRecord;
    } else {
      updatedRecords.unshift(currentRecord);
    }

    saveRecords(updatedRecords);
    
    // Set feedback indicator
    setJustSavedId(currentRecord.id);
    setTimeout(() => {
      setJustSavedId(null);
    }, 3000);

    // Open the Certificate viewer as confirmation if requested
    if (showCertificate) {
      setSelectedCertificateRecord(currentRecord);
      setCurrentRecord(null);
    }
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this archival record?")) {
      const filtered = records.filter(r => r.id !== id);
      saveRecords(filtered);
      if (currentRecord?.id === id) {
        setCurrentRecord(null);
      }
    }
  };

  const handleSelectRecord = (record: PhotoRecord) => {
    setCurrentRecord(JSON.parse(JSON.stringify(record))); // Deep copy
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Navigate through the 9 steps
  const nextStep = () => {
    if (currentRecord && currentRecord.currentStepIndex < 8) {
      setCurrentRecord({
        ...currentRecord,
        currentStepIndex: currentRecord.currentStepIndex + 1
      });
    }
  };

  const prevStep = () => {
    if (currentRecord && currentRecord.currentStepIndex > 0) {
      setCurrentRecord({
        ...currentRecord,
        currentStepIndex: currentRecord.currentStepIndex - 1
      });
    }
  };

  // State Updates for Step Fields
  const updateStepField = (stepKey: keyof PhotoRecordSteps, fieldKey: string, value: any) => {
    if (!currentRecord) return;
    const updatedSteps = {
      ...currentRecord.steps,
      [stepKey]: {
        ...currentRecord.steps[stepKey],
        [fieldKey]: value
      }
    };
    setCurrentRecord({
      ...currentRecord,
      steps: updatedSteps
    });
  };

  // Auto-Generate a formal SKU
  const handleAutoGenerateSku = () => {
    if (!currentRecord) return;
    const decade = currentRecord.steps.dating.estimatedDecade.replace(/\D/g, "") || "1890";
    const studio = currentRecord.steps.provenance.studioName.trim().toUpperCase().substring(0, 4) || "STUD";
    const rand = Math.floor(100 + Math.random() * 900);
    const generatedSku = `PHO-${decade}-${studio}-${rand}`;
    updateStepField("inventory", "sku", generatedSku);
  };

  // Auto-Generate a formal Accession Code
  const handleAutoGenerateAccession = () => {
    if (!currentRecord) return;
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const generatedAccession = `ACC-${year}-${rand}`;
    updateStepField("inventory", "accessionNumber", generatedAccession);
  };

  // Define the 9 pipeline steps
  const PIPELINE_STEPS = [
    { name: "Value Assessment", icon: DollarSign, key: "quickValue" },
    { name: "Format Identification", icon: FileText, key: "formatId" },
    { name: "Provenance & Back", icon: BookOpenIcon, key: "provenance" },
    { name: "Chronology/Dating", icon: Calendar, key: "dating" },
    { name: "Subject Classification", icon: Tag, key: "classification" },
    { name: "Historical Research", icon: SearchCode, key: "research" },
    { name: "Inventory Ledger", icon: Clipboard, key: "inventory" },
    { name: "Pricing & Description", icon: ShoppingBag, key: "listing" },
    { name: "Archive Registry", icon: Archive, key: "status" },
  ];

  function BookOpenIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2C2C2C] font-sans selection:bg-[#2C2C2C]/10 selection:text-[#2C2C2C] pb-12">
      
      {/* Upper Registry Board (Header) */}
      <header className="border-b-4 border-[#2C2C2C] bg-[#FDFCF8] py-4 px-6 sticky top-0 z-30 shadow-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-[#2C2C2C] border-2 border-[#2C2C2C] text-[#FDFCF8] rounded-none shadow-none">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-black italic tracking-tight text-[#2C2C2C] uppercase">
                  ChronosArchiver
                </h1>
                <span className="text-[9px] bg-[#2C2C2C] text-[#FDFCF8] border border-[#2C2C2C] px-1.5 py-0.5 font-mono uppercase font-black tracking-widest rounded-none">
                  V1.1
                </span>
              </div>
              <p className="text-xs uppercase tracking-widest font-bold text-[#2C2C2C]/70">Vintage & Antique Photograph Archiving Ledger</p>
            </div>
          </div>

          {/* Status & Diagnostic Box */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#2C2C2C]/60 font-mono uppercase tracking-wider font-bold text-[10px]">Archive Registry:</span>
              {apiOnline === null ? (
                <span className="flex h-2.5 w-2.5 rounded-none bg-[#2C2C2C]/40 animate-pulse"></span>
              ) : apiOnline ? (
                <span className="flex items-center gap-1.5 bg-[#2C2C2C]/5 border-2 border-[#2C2C2C] text-[#2C2C2C] px-2.5 py-1 rounded-none text-[10px] font-mono uppercase font-bold tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-none bg-emerald-600 inline-block"></span>
                  Gemini Online
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-rose-50 border-2 border-rose-500 text-rose-700 px-2.5 py-1 rounded-none text-[10px] font-mono uppercase font-bold tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-none bg-rose-600 inline-block animate-pulse"></span>
                  Gemini Offline
                </span>
              )}
            </div>

            {currentRecord && (
              <button
                onClick={() => setCurrentRecord(null)}
                className="text-xs text-[#2C2C2C] hover:bg-[#2C2C2C] hover:text-[#FDFCF8] border-2 border-[#2C2C2C] px-3.5 py-1.5 font-sans font-bold uppercase tracking-wider rounded-none transition duration-150"
              >
                Close Active Workspace
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Primary Workspace Area */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {apiError && (
          <div className="mb-6 p-5 bg-rose-50 border-2 border-rose-600 rounded-none text-rose-900 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-xs text-rose-800">Archival Ingestion Error</p>
              <p className="text-xs text-rose-700 mt-1 font-medium">{apiError}</p>
            </div>
          </div>
        )}

        {/* 1. LANDING/INGESTION VIEW (Shown when no active photograph is loaded) */}
        {!currentRecord && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Upload Card */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white border-4 border-[#2C2C2C] p-8 rounded-none shadow-none flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Subtle vintage grid watermark background */}
                <div className="absolute inset-0 bg-[radial-gradient(#2c2c2c_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none"></div>

                <div className="w-16 h-16 bg-[#2C2C2C] text-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none flex items-center justify-center mb-4 shadow-none">
                  <Camera className="w-8 h-8" />
                </div>

                <h2 className="font-serif text-3xl font-black italic tracking-tight text-[#2C2C2C]">
                  Ingest Historical Photograph
                </h2>
                <p className="text-sm text-[#2C2C2C]/85 max-w-md mt-2 font-serif leading-relaxed">
                  Drop a physical scan, cabinet card, or old family portrait here. Gemini will analyze chemical mediums, attire fashion benchmarks, and studio marks to auto-generate the 9-step registry report.
                </p>

                {/* Mode Selector Tabs */}
                <div className="flex border-2 border-[#2C2C2C] w-full max-w-sm my-5 rounded-none overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveIngestionMode("single")}
                    className={`flex-1 py-2 px-4 text-xs font-mono uppercase font-black tracking-widest transition-all ${
                      activeIngestionMode === "single"
                        ? "bg-[#2C2C2C] text-[#FDFCF8]"
                        : "bg-white text-[#2C2C2C] hover:bg-[#FDFCF8]"
                    }`}
                  >
                    Single Ingest
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIngestionMode("batch")}
                    className={`flex-1 py-2 px-4 text-xs font-mono uppercase font-black tracking-widest transition-all relative flex items-center justify-center gap-1.5 ${
                      activeIngestionMode === "batch"
                        ? "bg-[#2C2C2C] text-[#FDFCF8]"
                        : "bg-white text-[#2C2C2C] hover:bg-[#FDFCF8]"
                    }`}
                  >
                    <span>Batch Queue</span>
                    {batchQueue.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-[#2C2C2C] text-[9px] font-mono font-black">
                        {batchQueue.length}
                      </span>
                    )}
                  </button>
                </div>

                {activeIngestionMode === "single" ? (
                  <>
                    <div className="w-full max-w-sm">
                      <label className="border-2 border-dashed border-[#2C2C2C]/50 hover:border-[#2C2C2C] hover:bg-[#FDFCF8] rounded-none p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadFront}
                          className="hidden"
                          disabled={isAnalyzing}
                        />
                        
                        {isAnalyzing ? (
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="w-8 h-8 text-[#2C2C2C] animate-spin" />
                            <p className="text-sm text-[#2C2C2C] font-serif font-black italic animate-pulse">Running Vision Appraisal...</p>
                            <p className="text-[10px] text-[#2C2C2C]/60 uppercase tracking-widest font-mono font-bold">Comparing fashion directories (1850-1920)</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors mb-2" />
                            <span className="text-sm font-bold uppercase tracking-wider text-[#2C2C2C]">Select front photo file</span>
                            <span className="text-[10px] text-[#2C2C2C]/60 mt-1 font-mono">JPEG, PNG up to 15MB</span>
                            <span className="mt-4 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] rounded-none text-xs font-bold uppercase tracking-widest shadow-none">
                              Choose File
                            </span>
                          </>
                        )}
                      </label>
                    </div>

                    <div className="flex items-center gap-3 w-full max-w-sm my-5">
                      <div className="h-[2px] bg-[#2C2C2C] flex-grow"></div>
                      <span className="text-[10px] font-mono uppercase text-[#2C2C2C] tracking-widest font-black">OR</span>
                      <div className="h-[2px] bg-[#2C2C2C] flex-grow"></div>
                    </div>

                    <button
                      onClick={handleLoadSample}
                      disabled={isAnalyzing}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#F4F1EA] text-[#2C2C2C] border-2 border-[#2C2C2C] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 shadow-none cursor-pointer w-full max-w-sm"
                    >
                      <Sparkles className="w-4 h-4 text-[#2C2C2C]" />
                      <span>Load Sample Photo (Falk Studio, 1894)</span>
                    </button>
                  </>
                ) : (
                  // BATCH INGESTION VIEW
                  <div className="w-full space-y-6">
                    {/* Batch Dropzone */}
                    <div className="w-full">
                      <label 
                        className={`border-2 border-dashed rounded-none p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          batchDragActive 
                            ? "border-[#2C2C2C] bg-[#F4F1EA]" 
                            : "border-[#2C2C2C]/40 hover:border-[#2C2C2C] hover:bg-[#FDFCF8]"
                        }`}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setBatchDragActive(true); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setBatchDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setBatchDragActive(false); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBatchDragActive(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleAddFilesToQueue(e.dataTransfer.files);
                          }
                        }}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleAddFilesToQueue(e.target.files)}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center">
                          <Upload className="w-10 h-10 text-[#2C2C2C]/40 hover:text-[#2C2C2C] transition-colors mb-2" />
                          <span className="text-sm font-serif font-black italic text-[#2C2C2C]">
                            Drag & Drop Multiple Historical Photographs
                          </span>
                          <span className="text-xs text-[#2C2C2C]/70 mt-2 max-w-sm">
                            Select or drop multiple cabinet cards or vintage photos to queue them for sequential artificial intelligence analysis.
                          </span>
                          <span className="mt-4 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] rounded-none text-xs font-bold uppercase tracking-widest font-mono">
                            Add Multiple Files
                          </span>
                        </div>
                      </label>
                    </div>

                    {batchQueue.length > 0 && (
                      <div className="w-full text-left bg-[#FDFCF8] border-2 border-[#2C2C2C] p-4">
                        {/* Queue Summary & Global Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#2C2C2C]/20 pb-3 mb-4">
                          <div>
                            <p className="text-xs font-mono uppercase font-black text-[#2C2C2C] tracking-wider">
                              Sequential Appraisal Progress
                            </p>
                            <p className="text-xs text-[#2C2C2C]/80 mt-0.5">
                              {batchQueue.filter(q => q.status === "completed").length} / {batchQueue.length} analyzed successfully
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {isBatchProcessing ? (
                              <button
                                type="button"
                                onClick={() => setIsBatchProcessing(false)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2C2C2C] text-[#FDFCF8] border border-[#2C2C2C] hover:bg-neutral-800 transition text-[10px] uppercase font-mono font-bold"
                              >
                                <span className="h-2 w-2 bg-amber-500 animate-pulse"></span>
                                Pause Queue
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (batchQueue.some(q => q.status === "queued")) {
                                    setIsBatchProcessing(true);
                                  } else {
                                    alert("All items processed or failed. Add more queued items or clear the list.");
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2C2C2C] text-[#FDFCF8] border border-[#2C2C2C] hover:bg-neutral-800 transition text-[10px] uppercase font-mono font-bold"
                              >
                                <span className="h-2 w-2 bg-emerald-500"></span>
                                Process Queue
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleClearQueue}
                              className="px-3 py-1.5 bg-white text-[#2C2C2C] border-2 border-[#2C2C2C] hover:bg-[#F4F1EA] transition text-[10px] uppercase font-mono font-bold"
                            >
                              Reset Queue
                            </button>
                          </div>
                        </div>

                        {/* Scrolling Queue List */}
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                          {batchQueue.map((item) => {
                            const isCurrent = currentlyProcessingId === item.id;
                            return (
                              <div 
                                key={item.id} 
                                className={`p-3 border-2 rounded-none transition-all flex items-center justify-between gap-4 ${
                                  isCurrent 
                                    ? "bg-amber-50/50 border-amber-600 ring-1 ring-amber-600" 
                                    : item.status === "completed"
                                    ? "bg-emerald-50/30 border-emerald-600/50"
                                    : item.status === "failed"
                                    ? "bg-rose-50/30 border-rose-600/50"
                                    : "bg-white border-[#2C2C2C]/20"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Thumbnail */}
                                  <div className="w-12 h-16 bg-[#F4F1EA] border border-[#2C2C2C] shrink-0 overflow-hidden relative">
                                    <img 
                                      src={item.previewUrl} 
                                      alt={item.file.name} 
                                      className="w-full h-full object-cover"
                                    />
                                    {isCurrent && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-serif font-black truncate text-[#2C2C2C]">
                                      {item.file.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-[#2C2C2C]/60">
                                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>

                                    {/* Item Progress Bar */}
                                    {isCurrent && (
                                      <div className="w-full bg-amber-100 h-1.5 rounded-none mt-1.5 overflow-hidden border border-amber-600/30">
                                        <div 
                                          className="bg-amber-600 h-full transition-all duration-300"
                                          style={{ width: `${item.progress}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Actions / Status Badges */}
                                <div className="shrink-0 flex items-center gap-2">
                                  {item.status === "completed" && (
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-500 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider">
                                        Analyzed
                                      </span>
                                      {item.resultRecord && (
                                        <button
                                          type="button"
                                          onClick={() => handleSelectRecord(item.resultRecord!)}
                                          className="px-2 py-1 bg-[#2C2C2C] text-[#FDFCF8] text-[9px] font-mono uppercase font-black tracking-widest hover:bg-neutral-800"
                                        >
                                          Open Workspace
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {item.status === "failed" && (
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-500 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider">
                                        Failed
                                      </span>
                                      <span className="text-[8px] text-rose-600 max-w-[120px] truncate block font-mono" title={item.error}>
                                        {item.error}
                                      </span>
                                    </div>
                                  )}

                                  {item.status === "queued" && (
                                    <span className="px-2 py-0.5 bg-neutral-100 text-neutral-800 border border-neutral-400 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider">
                                      Queued
                                    </span>
                                  )}

                                  {item.status === "processing" && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-500 rounded-none text-[9px] font-mono font-bold uppercase tracking-wider animate-pulse">
                                      Processing
                                    </span>
                                  )}

                                  {/* Delete/Remove button if not actively processing this specific one */}
                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveQueueItem(item.id)}
                                      className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-300 text-neutral-400 hover:text-rose-600 transition"
                                      title="Remove from queue"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Workflow visual list */}
              <div className="bg-white border-2 border-[#2C2C2C] rounded-none p-6">
                <h3 className="font-serif text-lg font-black italic text-[#2C2C2C] mb-4 flex items-center gap-2 border-b-2 border-[#2C2C2C] pb-2 uppercase">
                  <Database className="w-5 h-5" />
                  <span>The 9-Step Appraisal & Archiving Protocol</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {PIPELINE_STEPS.map((step, idx) => (
                    <div key={idx} className="p-3.5 bg-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none relative flex flex-col gap-1.5 hover:bg-[#F4F1EA] transition duration-150">
                      <span className="absolute top-2 right-3 font-mono text-xs text-[#2C2C2C]/50 font-bold">#{idx+1}</span>
                      <div className="w-8 h-8 rounded-none bg-[#2C2C2C] text-[#FDFCF8] border border-[#2C2C2C] flex items-center justify-center shrink-0">
                        <step.icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-serif font-bold text-[#2C2C2C] leading-tight block mt-1 uppercase">
                        {step.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Right Instructions / Curator Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border-4 border-[#2C2C2C] rounded-none p-6 text-[#2C2C2C] font-serif relative">
                <div className="absolute top-4 right-4 w-12 h-12 rounded-none border-2 border-[#2C2C2C]/10 opacity-30 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-black italic border-b-2 border-[#2C2C2C] pb-2 text-[#2C2C2C] uppercase">
                  Curator's Directives
                </h3>
                
                <div className="space-y-4 text-sm mt-4 leading-relaxed">
                  <p>
                    Each photograph cataloged in this registry undergoes a sequential forensic review. While the digital scan provides visual attributes, physical dimensions and paper materials must be supplemented by the archivist's input.
                  </p>
                  
                  <div className="bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none p-4 space-y-2 text-xs font-sans text-[#2C2C2C]">
                    <p className="font-bold font-serif text-[#2C2C2C] uppercase tracking-wide">Chronological Reference Clues:</p>
                    <ul className="list-disc list-inside space-y-1.5 font-medium">
                      <li><strong>Daguerreotypes (1839-1860):</strong> Copper plates, shiny mirror finish, fits in a protective case.</li>
                      <li><strong>Ambrotypes (1854-1865):</strong> On clear/dark glass backing, fits in a case.</li>
                      <li><strong>Tintypes (1856-1930s):</strong> Iron plates, rustic, metal is attracted to magnets.</li>
                      <li><strong>Carte de Visite (1859-1889):</strong> Small paper prints, 2.5" x 4" cardstock.</li>
                      <li><strong>Cabinet Cards (1866-1903):</strong> Larger paper prints, 4.25" x 6.5" cardstock.</li>
                    </ul>
                  </div>

                  <p className="italic text-xs text-[#2C2C2C]/80 border-l-2 border-[#2C2C2C] pl-3 py-1">
                    "Historical preservation is the bridge connecting individual memories to our collective culture."
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 2. ACTIVE REGISTRY WORKSPACE (A photo has been loaded into memory) */}
        {currentRecord && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Hand: Digital Photo Viewer Lightbox (Holds 1/3 grid) */}
            <div className="lg:col-span-4 lg:sticky lg:top-[100px] space-y-6">
              
              <div className="bg-white border-4 border-[#2C2C2C] p-6 rounded-none shadow-none relative text-[#2C2C2C]">
                
                <div className="flex items-center justify-between border-b-2 border-[#2C2C2C] pb-3 mb-5">
                  <h3 className="font-serif text-xs uppercase tracking-[0.2em] font-black text-[#2C2C2C]">
                    Active Registry Plate
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-mono bg-[#2C2C2C] px-2 py-0.5 rounded-none text-[#FDFCF8] font-bold tracking-widest">
                    <span>ID: {currentRecord.id.substring(0,8).toUpperCase()}</span>
                  </div>
                </div>

                <PhotoCardFrame
                  frontImage={currentRecord.frontImage}
                  backImage={currentRecord.backImage}
                  title={currentRecord.title}
                  formatName={currentRecord.steps.formatId.predictedFormat}
                  onUploadBack={handleUploadBack}
                  isAnalyzingBack={isAnalyzingBack}
                />

                <div className="mt-6 pt-4 border-t-2 border-[#2C2C2C] space-y-3">
                  <p className="text-xs text-[#2C2C2C]/90 font-serif">
                    <span className="font-bold uppercase tracking-wider text-[10px] font-sans mr-1">Name:</span> {currentRecord.title}
                  </p>
                  <p className="text-xs text-[#2C2C2C]/90">
                    <span className="font-bold uppercase tracking-wider text-[10px] font-sans mr-1">SKU:</span>{" "}
                    <span className="font-mono text-[#2C2C2C] bg-[#F4F1EA] px-1.5 py-0.5 border border-[#2C2C2C]/20 font-bold">{currentRecord.steps.inventory.sku || "PENDING"}</span>
                  </p>
                  <p className="text-xs text-[#2C2C2C]/90">
                    <span className="font-bold uppercase tracking-wider text-[10px] font-sans mr-1">Archived:</span>{" "}
                    <span className="font-mono">{new Date(currentRecord.dateCreated).toLocaleDateString()}</span>
                  </p>
                  
                  <div className="pt-2 border-t border-[#2C2C2C]/10 flex flex-col gap-2">
                    <button
                      onClick={() => handleSaveToCatalog(false)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 cursor-pointer ${
                        justSavedId === currentRecord.id
                          ? "bg-emerald-800 border-emerald-800 text-[#FDFCF8]"
                          : "bg-[#2C2C2C] hover:bg-neutral-800 border-[#2C2C2C] text-[#FDFCF8]"
                      }`}
                    >
                      <Archive className="w-4 h-4" />
                      <span>
                        {justSavedId === currentRecord.id
                          ? "Saved Successfully!"
                          : records.some((r) => r.id === currentRecord.id)
                          ? "Update Collection Record"
                          : "Save to Collection"}
                      </span>
                    </button>
                    {records.some((r) => r.id === currentRecord.id) && justSavedId !== currentRecord.id && (
                      <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase tracking-widest text-center">
                        ✓ Linked in Collection Ledger
                      </span>
                    )}
                  </div>
                </div>

              </div>

              {/* Refine / OCR back notification if not uploaded */}
              {!currentRecord.backImage && (
                <div className="p-5 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-[#2C2C2C] text-xs font-serif leading-relaxed">
                  <p className="font-black text-[#2C2C2C] uppercase font-sans text-[10px] tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[#2C2C2C]"></span>
                    Protip: Scan Side B
                  </p>
                  Upload the reverse side of this photo in the uploader inside the card back! The AI will automatically extract cursive script, stamps, or logos to refine the year range and provenance.
                </div>
              )}

            </div>

            {/* Right Hand: Interactive 9-Step Workspace Panel (Holds 2/3 grid) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Stepper Pipeline Progress Bar */}
              <div className="bg-white border-4 border-[#2C2C2C] p-4 rounded-none shadow-none overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-[760px] justify-between relative">
                  
                  {PIPELINE_STEPS.map((step, idx) => {
                    const isActive = currentRecord.currentStepIndex === idx;
                    const isCompleted = currentRecord.currentStepIndex > idx;
                    const StepIcon = step.icon;

                    return (
                      <button
                        key={idx}
                        onClick={() => setCurrentRecord({ ...currentRecord, currentStepIndex: idx })}
                        className="flex flex-col items-center gap-2 transition-all text-center focus:outline-none flex-grow shrink-0 w-16 relative group"
                      >
                        <div className={`w-8 h-8 rounded-none border-2 flex items-center justify-center transition-all ${
                          isActive 
                            ? "bg-[#2C2C2C] border-[#2C2C2C] text-[#FDFCF8] shadow-none" 
                            : isCompleted 
                              ? "bg-[#F4F1EA] border-[#2C2C2C] text-[#2C2C2C]" 
                              : "bg-white border-[#2C2C2C]/35 text-[#2C2C2C]/50 group-hover:border-[#2C2C2C]"
                        }`}>
                          <StepIcon className="w-4 h-4" />
                        </div>
                        
                        <span className={`text-[9px] font-sans tracking-wider uppercase block leading-none font-bold ${
                          isActive ? "text-[#2C2C2C]" : "text-[#2C2C2C]/40 group-hover:text-[#2C2C2C]"
                        }`}>
                          Step {idx + 1}
                        </span>
                      </button>
                    );
                  })}

                </div>
              </div>

              {/* Active Step Workspace Card */}
              <div className="bg-white border-4 border-[#2C2C2C] rounded-none p-6 shadow-none relative min-h-[460px] flex flex-col justify-between text-[#2C2C2C]">
                
                {/* Active Step Content */}
                <div>
                  
                  {/* Step Title & Description */}
                  <div className="flex items-start justify-between gap-4 border-b-2 border-[#2C2C2C] pb-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#2C2C2C] font-black tracking-widest">
                          STEP 0{currentRecord.currentStepIndex + 1} OF 09
                        </span>
                        <span className="text-[#2C2C2C]/30">•</span>
                        <span className="text-xs uppercase font-black tracking-widest text-[#2C2C2C]/60">
                          {PIPELINE_STEPS[currentRecord.currentStepIndex].name}
                        </span>
                      </div>
                      <h2 className="font-serif text-xl md:text-2xl font-black italic tracking-tight text-[#2C2C2C] mt-1 uppercase">
                        {PIPELINE_STEPS[currentRecord.currentStepIndex].name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2C2C2C] border border-[#2C2C2C] text-[#FDFCF8] text-[9px] font-mono font-black uppercase tracking-widest rounded-none">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Appraised</span>
                    </div>
                  </div>

                  {/* STEP CONTENT SWITCHBOARD */}
                  {currentRecord.currentStepIndex === 0 && (
                    /* STEP 1: Quick Value Assessment */
                    <div className="space-y-4">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Examine the photo to identify immediate rare traits, notable makers, historical characters, or condition flags. Assign a visual rarity level and preliminary value potential.
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Est. Value Range
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.quickValue.estimatedValueRange}
                            onChange={(e) => updateStepField("quickValue", "estimatedValueRange", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Value Potential
                          </label>
                          <select
                            value={currentRecord.steps.quickValue.valuePotential}
                            onChange={(e) => updateStepField("quickValue", "valuePotential", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="High">High (Rare/Historical)</option>
                            <option value="Medium">Medium (Collectible)</option>
                            <option value="Low">Low (Common)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Rarity Score (1 - 10): {currentRecord.steps.quickValue.rarityScore}
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={currentRecord.steps.quickValue.rarityScore}
                            onChange={(e) => updateStepField("quickValue", "rarityScore", parseInt(e.target.value))}
                            className="w-full h-2 bg-[#2C2C2C]/20 rounded-none appearance-none cursor-pointer accent-[#2C2C2C] mt-3"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Key Value Factors
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {currentRecord.steps.quickValue.keyFactors.map((factor, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                              <span>{factor}</span>
                              <button 
                                onClick={() => {
                                  const filtered = currentRecord.steps.quickValue.keyFactors.filter((_, idx) => idx !== i);
                                  updateStepField("quickValue", "keyFactors", filtered);
                                }}
                                className="hover:text-rose-600 font-bold font-sans ml-1 text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const newFactor = prompt("Enter custom key value factor:");
                              if (newFactor) {
                                updateStepField("quickValue", "keyFactors", [...currentRecord.steps.quickValue.keyFactors, newFactor]);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Factor</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Value Assessment & Rationale
                        </label>
                        <textarea
                          rows={4}
                          value={currentRecord.steps.quickValue.aiReasoning}
                          onChange={(e) => updateStepField("quickValue", "aiReasoning", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 1 && (
                    /* STEP 2: Format Identification */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Identify the physical substrate. Does the image reflect like a mirror? (Daguerreotype). Is it on glass? (Ambrotype). Is it on dark metal attracted to a magnet? (Tintype). Or is it card stock? (CDV or Cabinet Card).
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Predicted Format
                          </label>
                          <select
                            value={currentRecord.steps.formatId.predictedFormat}
                            onChange={(e) => updateStepField("formatId", "predictedFormat", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="Cabinet Card">Cabinet Card (4.25" x 6.5" Cardstock)</option>
                            <option value="Carte de Visite">Carte de Visite (CDV - 2.5" x 4" Cardstock)</option>
                            <option value="Tintype">Tintype (Iron/Metal plate, attracted to magnet)</option>
                            <option value="Daguerreotype">Daguerreotype (Silvered copper plate, mirror-like)</option>
                            <option value="Ambrotype">Ambrotype (Collodion glass plate negative over dark backing)</option>
                            <option value="Real Photo Postcard">Real Photo Postcard (RPPC - Postcard back)</option>
                            <option value="Paper Print / Albumen">Paper Print / Albumen (Thin paper print)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Base Material Substrate
                          </label>
                          <select
                            value={currentRecord.steps.formatId.baseMaterial}
                            onChange={(e) => updateStepField("formatId", "baseMaterial", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="Paper">Paper (Mounted or Loose)</option>
                            <option value="Metal">Metal (Iron or Silvered Copper)</option>
                            <option value="Glass">Glass (Wet Plate/Dry Plate)</option>
                            <option value="Other">Other / Synthetics</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Visible Physical Attributes
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {currentRecord.steps.formatId.physicalAttributes.map((attr, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                              <span>{attr}</span>
                              <button 
                                onClick={() => {
                                  const filtered = currentRecord.steps.formatId.physicalAttributes.filter((_, idx) => idx !== i);
                                  updateStepField("formatId", "physicalAttributes", filtered);
                                }}
                                className="hover:text-rose-600 font-bold font-sans ml-1 text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const newAttr = prompt("Enter custom physical trait:");
                              if (newAttr) {
                                updateStepField("formatId", "physicalAttributes", [...currentRecord.steps.formatId.physicalAttributes, newAttr]);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Attribute</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Format Reasoning Explanation
                        </label>
                        <textarea
                          rows={4}
                          value={currentRecord.steps.formatId.explanation}
                          onChange={(e) => updateStepField("formatId", "explanation", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 2 && (
                    /* STEP 3: Read Back & Provenance */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Document stamps, handwritten notes, family markings, or tax stamps. OCR handwriting by uploading Side-B inside the left-side frame.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Studio / Photographer Name
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.provenance.studioName}
                            onChange={(e) => updateStepField("provenance", "studioName", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Studio Address or City
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.provenance.studioAddress}
                            onChange={(e) => updateStepField("provenance", "studioAddress", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Extracted Handwriting (OCR)
                        </label>
                        <input
                          type="text"
                          value={currentRecord.steps.provenance.handwrittenText}
                          onChange={(e) => updateStepField("provenance", "handwrittenText", e.target.value)}
                          placeholder="No handwriting recorded yet. Upload the back side to auto-extract."
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif italic"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Provenance Stamps & Advertiser Marks
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {currentRecord.steps.provenance.stampsAndMarkings.map((mark, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                              <span>{mark}</span>
                              <button 
                                onClick={() => {
                                  const filtered = currentRecord.steps.provenance.stampsAndMarkings.filter((_, idx) => idx !== i);
                                  updateStepField("provenance", "stampsAndMarkings", filtered);
                                }}
                                className="hover:text-rose-600 font-bold font-sans ml-1 text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const newMark = prompt("Enter stamp inscription:");
                              if (newMark) {
                                updateStepField("provenance", "stampsAndMarkings", [...currentRecord.steps.provenance.stampsAndMarkings, newMark]);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Stamp</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Curator's Provenance Synthesis
                        </label>
                        <textarea
                          rows={3}
                          value={currentRecord.steps.provenance.provenanceClues}
                          onChange={(e) => updateStepField("provenance", "provenanceClues", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 3 && (
                    /* STEP 4: Date the Photo */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Correlate the photographer's address directory history with clothing styles (necklines, collars, hairstyles, corsets) and technical paper structures to locate the precise year range.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Estimated Decade
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.dating.estimatedDecade}
                            onChange={(e) => updateStepField("dating", "estimatedDecade", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Estimated Year Range
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.dating.estimatedYearRange}
                            onChange={(e) => updateStepField("dating", "estimatedYearRange", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Dating Confidence
                          </label>
                          <select
                            value={currentRecord.steps.dating.confidenceLevel}
                            onChange={(e) => updateStepField("dating", "confidenceLevel", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="High">High Confidence (Provenanced)</option>
                            <option value="Medium">Medium Confidence (Benchmarked)</option>
                            <option value="Low">Low Confidence (Estimated)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Fashion & Apparel Clues
                          </label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {currentRecord.steps.dating.fashionClues.map((clue, i) => (
                              <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                                <span className="truncate max-w-[150px]">{clue}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = currentRecord.steps.dating.fashionClues.filter((_, idx) => idx !== i);
                                    updateStepField("dating", "fashionClues", filtered);
                                  }}
                                  className="hover:text-rose-600 font-bold font-sans text-[10px]"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => {
                                const newClue = prompt("Enter fashion clue (e.g. mutton-chop sleeves):");
                                if (newClue) {
                                  updateStepField("dating", "fashionClues", [...currentRecord.steps.dating.fashionClues, newClue]);
                                }
                              }}
                              className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Chemical & Technical Indicators
                          </label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {currentRecord.steps.dating.technologicalClues.map((clue, i) => (
                              <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                                <span className="truncate max-w-[150px]">{clue}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = currentRecord.steps.dating.technologicalClues.filter((_, idx) => idx !== i);
                                    updateStepField("dating", "technologicalClues", filtered);
                                  }}
                                  className="hover:text-rose-600 font-bold font-sans text-[10px]"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => {
                                const newClue = prompt("Enter chemical indicator (e.g. Albumen gloss):");
                                if (newClue) {
                                  updateStepField("dating", "technologicalClues", [...currentRecord.steps.dating.technologicalClues, newClue]);
                                }
                              }}
                              className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Forensic Dating Explanation
                        </label>
                        <textarea
                          rows={3}
                          value={currentRecord.steps.dating.explanation}
                          onChange={(e) => updateStepField("dating", "explanation", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 4 && (
                    /* STEP 5: Subject Classification */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Classify the primary theme of the image (e.g. Wedding portrait, Occupation/Trade attire, Military uniform, Post-Mortem/Mourning, Landscape/Architectural). Describe details and objects cataloged.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Subject Category
                          </label>
                          <select
                            value={currentRecord.steps.classification.primaryCategory}
                            onChange={(e) => updateStepField("classification", "primaryCategory", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="Portrait">Studio Portrait (Sole or Family)</option>
                            <option value="Military">Military (Uniforms/Weapons)</option>
                            <option value="Occupational">Occupational / Tradesman (Holding tools)</option>
                            <option value="Landscape">Landscape & Architecture</option>
                            <option value="Event">Event / Celebration (Parades, Weddings)</option>
                            <option value="Mourning / Post-Mortem">Mourning & Post-Mortem</option>
                            <option value="Domestic">Domestic / Candid Home Scene</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Identified Objects
                          </label>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {currentRecord.steps.classification.identifiedObjects.map((obj, i) => (
                              <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                                <span className="truncate max-w-[150px]">{obj}</span>
                                <button 
                                  onClick={() => {
                                    const filtered = currentRecord.steps.classification.identifiedObjects.filter((_, idx) => idx !== i);
                                    updateStepField("classification", "identifiedObjects", filtered);
                                  }}
                                  className="hover:text-rose-600 font-bold font-sans text-[10px]"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => {
                                const newObj = prompt("Enter object name (e.g. cane, book):");
                                if (newObj) {
                                  updateStepField("classification", "identifiedObjects", [...currentRecord.steps.classification.identifiedObjects, newObj]);
                                }
                              }}
                              className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Scenic Description
                        </label>
                        <textarea
                          rows={3}
                          value={currentRecord.steps.classification.scenicDescription}
                          onChange={(e) => updateStepField("classification", "scenicDescription", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Searchable Historical Tags
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {currentRecord.steps.classification.tags.map((tag, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                              <span>#{tag}</span>
                              <button 
                                onClick={() => {
                                  const filtered = currentRecord.steps.classification.tags.filter((_, idx) => idx !== i);
                                  updateStepField("classification", "tags", filtered);
                                }}
                                className="hover:text-rose-600 font-bold font-sans text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const newTag = prompt("Enter tag name (without #):");
                              if (newTag) {
                                updateStepField("classification", "tags", [...currentRecord.steps.classification.tags, newTag]);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 5 && (
                    /* STEP 6: Research Decision */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Flag this record for deeper external research if names, dates, or highly unique visual items (historical logos, military insignias) require searching specialized genealogical or local archives.
                      </div>

                      <div className="flex items-center gap-3 bg-white p-4 border-2 border-[#2C2C2C] rounded-none">
                        <input
                          type="checkbox"
                          id="deeper-research-chk"
                          checked={currentRecord.steps.research.requiresDeeperResearch}
                          onChange={(e) => updateStepField("research", "requiresDeeperResearch", e.target.checked)}
                          className="w-5 h-5 rounded-none border-2 border-[#2C2C2C] text-[#2C2C2C] bg-white focus:ring-0 cursor-pointer"
                        />
                        <label htmlFor="deeper-research-chk" className="text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.12em] cursor-pointer selection:bg-transparent">
                          Requires Deeper Curator Research Investigation
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Photographer / Studio Biography Bio
                          </label>
                          <textarea
                            rows={4}
                            value={currentRecord.steps.research.photographerBio}
                            onChange={(e) => updateStepField("research", "photographerBio", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Historical Backstory Era Context
                          </label>
                          <textarea
                            rows={4}
                            value={currentRecord.steps.research.historicalContext}
                            onChange={(e) => updateStepField("research", "historicalContext", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Recommended Research Leads
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {currentRecord.steps.research.researchLeads.map((lead, i) => (
                            <span key={i} className="px-2.5 py-1 bg-[#F4F1EA] border border-[#2C2C2C]/50 text-[#2C2C2C] rounded-none text-xs flex items-center gap-1 font-semibold">
                              <span className="truncate max-w-[200px]">{lead}</span>
                              <button 
                                onClick={() => {
                                  const filtered = currentRecord.steps.research.researchLeads.filter((_, idx) => idx !== i);
                                  updateStepField("research", "researchLeads", filtered);
                                }}
                                className="hover:text-rose-600 font-bold font-sans text-[10px]"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              const newLead = prompt("Enter research action step:");
                              if (newLead) {
                                updateStepField("research", "researchLeads", [...currentRecord.steps.research.researchLeads, newLead]);
                              }
                            }}
                            className="px-2.5 py-1 bg-white border-2 border-dashed border-[#2C2C2C]/50 text-[#2C2C2C] hover:bg-[#F4F1EA] text-xs rounded-none flex items-center gap-1 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 6 && (
                    /* STEP 7: Inventory & SKU */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Assign physical metadata parameters for internal portfolio filing. Select appropriate acid-free safe storage and generate unique SKU codes.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5 flex justify-between items-center">
                            <span>Catalog Inventory SKU</span>
                            <button
                              onClick={handleAutoGenerateSku}
                              className="text-[9px] font-sans font-bold bg-[#2C2C2C] hover:bg-neutral-800 text-white px-2.5 py-1 rounded-none shadow-none uppercase tracking-wider transition cursor-pointer"
                            >
                              Auto-Generate
                            </button>
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.inventory.sku}
                            onChange={(e) => updateStepField("inventory", "sku", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5 flex justify-between items-center">
                            <span>Accession Registration Code</span>
                            <button
                              onClick={handleAutoGenerateAccession}
                              className="text-[9px] font-sans font-bold bg-[#2C2C2C] hover:bg-neutral-800 text-white px-2.5 py-1 rounded-none shadow-none uppercase tracking-wider transition cursor-pointer"
                            >
                              Auto-Generate
                            </button>
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.inventory.accessionNumber}
                            onChange={(e) => updateStepField("inventory", "accessionNumber", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Physical Condition Grading
                          </label>
                          <select
                            value={currentRecord.steps.inventory.conditionGrading}
                            onChange={(e) => updateStepField("inventory", "conditionGrading", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="Mint (M)">Mint (M) - Perfect Preservation</option>
                            <option value="Fine (F)">Fine (F) - Minimal Age Wear</option>
                            <option value="Good (G)">Good (G) - Visible Sepia, Mild Scratches</option>
                            <option value="Fair">Fair - Fading, Edge Damage, Mirroring</option>
                            <option value="Poor (P)">Poor (P) - Heavy Stains, Cracks, Torn Mount</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Acid-Free Storage Location
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.inventory.storageLocation}
                            onChange={(e) => updateStepField("inventory", "storageLocation", e.target.value)}
                            placeholder="e.g. Acid-Free Sleeve Portfolio Box A"
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Curator's Inventory Log Notes
                        </label>
                        <textarea
                          rows={3}
                          value={currentRecord.steps.inventory.notes}
                          onChange={(e) => updateStepField("inventory", "notes", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 7 && (
                    /* STEP 8: Listing & Pricing */
                    <div className="space-y-4 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Prepare e-commerce listing text if planning to sell. Formulate retail valuations, prices, and catalog titles incorporating historical context.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Suggested Valuation Price ($)
                          </label>
                          <input
                            type="number"
                            value={currentRecord.steps.listing.suggestedPrice}
                            onChange={(e) => updateStepField("listing", "suggestedPrice", parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Sales / Catalog Listing Title
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.listing.listingTitle}
                            onChange={(e) => updateStepField("listing", "listingTitle", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Appraisal Price Justification
                        </label>
                        <input
                          type="text"
                          value={currentRecord.steps.listing.priceJustification}
                          onChange={(e) => updateStepField("listing", "priceJustification", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Professional Sales & Historical Write-up
                        </label>
                        <textarea
                          rows={5}
                          value={currentRecord.steps.listing.listingDescription}
                          onChange={(e) => updateStepField("listing", "listingDescription", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {currentRecord.currentStepIndex === 8 && (
                    /* STEP 9: Sold / Archived */
                    <div className="space-y-6 text-[#2C2C2C]">
                      <div className="p-4 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none text-xs font-serif leading-relaxed text-[#2C2C2C]">
                        <strong>Protocol Directive:</strong> Finish the catalog protocol. Commit the finalized report to the Archive Ledger. Renders our vintage letterpress printable tag certificates.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Archival Status State
                          </label>
                          <select
                            value={currentRecord.steps.status.currentStatus}
                            onChange={(e) => updateStepField("status", "currentStatus", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif font-bold"
                          >
                            <option value="Archived">Archived (In-portfolio)</option>
                            <option value="Listed for Sale">Listed for Sale (Deaccessioned)</option>
                            <option value="Sold">Sold / Transferred</option>
                            <option value="Donated">Donated to Historical Society</option>
                            <option value="Exhibited">Exhibited (Active Display)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                            Archivist Sign-off Date
                          </label>
                          <input
                            type="text"
                            value={currentRecord.steps.status.archivedAt}
                            onChange={(e) => updateStepField("status", "archivedAt", e.target.value)}
                            className="w-full bg-white border-2 border-[#2C2C2C] rounded-none px-3.5 py-2 text-sm text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#2C2C2C] uppercase tracking-[0.15em] mb-1.5">
                          Concluding Archival Comments
                        </label>
                        <textarea
                          rows={3}
                          value={currentRecord.steps.status.archivalNotes}
                          onChange={(e) => updateStepField("status", "archivalNotes", e.target.value)}
                          className="w-full bg-white border-2 border-[#2C2C2C] rounded-none p-3 text-xs text-[#2C2C2C] focus:outline-none focus:bg-[#FDFCF8] font-serif leading-relaxed"
                        />
                      </div>

                      {/* Call to Actions */}
                      <div className="flex flex-col sm:flex-row gap-4 p-5 bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none items-center justify-between">
                        <div className="text-center sm:text-left">
                          <h4 className="font-serif font-black text-sm text-[#2C2C2C] uppercase tracking-wider">Save Archival Registry & Appraisal</h4>
                          <p className="text-[10px] text-zinc-600 mt-1">Saves to local browser ledger database and triggers certificate display.</p>
                        </div>

                        <button
                          onClick={handleSaveToCatalog}
                          className="flex items-center gap-2 px-6 py-3 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none text-xs font-bold uppercase tracking-widest transition shadow-none cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                          <span>Commit to Ledger</span>
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Wizard Navigation Controls */}
                <div className="flex items-center justify-between border-t-2 border-[#2C2C2C] pt-6 mt-8">
                  <button
                    onClick={prevStep}
                    disabled={currentRecord.currentStepIndex === 0}
                    className={`flex items-center gap-1.5 px-5 py-2.5 border-2 rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 ${
                      currentRecord.currentStepIndex === 0
                        ? "border-neutral-200 text-neutral-400 bg-neutral-50 cursor-not-allowed"
                        : "border-[#2C2C2C] hover:bg-[#F4F1EA] text-[#2C2C2C] bg-white cursor-pointer"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="text-xs font-mono text-[#2C2C2C] font-black uppercase tracking-wider">
                    {currentRecord.currentStepIndex + 1} / 9 Steps Complete
                  </div>

                  {currentRecord.currentStepIndex < 8 ? (
                    <button
                      onClick={nextStep}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2C2C2C] hover:bg-neutral-800 border-2 border-[#2C2C2C] text-[#FDFCF8] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 cursor-pointer"
                    >
                      <span>Next Step</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSaveToCatalog}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-[#2C2C2C] hover:bg-neutral-800 border-2 border-[#2C2C2C] text-[#FDFCF8] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 cursor-pointer animate-pulse"
                    >
                      <span>Complete Registry</span>
                      <Archive className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* 3. ARCHIVED LEDGER CATALOG LISTING (Always shown underneath, like an active database) */}
        <div className="mt-16 border-t-2 border-[#2C2C2C] pt-10">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 text-[#2C2C2C]">
            <div>
              <h2 className="font-serif text-2xl font-black tracking-tight text-[#2C2C2C] uppercase flex items-center gap-2">
                <Database className="w-6 h-6 text-[#2C2C2C]" />
                <span>Archived Photo Ledger Catalog</span>
              </h2>
              <p className="text-xs text-neutral-600 mt-1">A historical index of verified, appraised, and dated family photographs.</p>
            </div>

            {records.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-mono bg-white border-2 border-[#2C2C2C] px-3.5 py-1.5 rounded-none text-[#2C2C2C] font-black uppercase tracking-wider">
                  Total Collection: <span className="font-black text-lg ml-1">{records.length}</span>
                </div>
                {filteredAndSortedRecords.length !== records.length && (
                  <div className="text-xs font-mono bg-[#F4F1EA] border-2 border-[#2C2C2C]/30 px-3.5 py-1.5 rounded-none text-[#2C2C2C] font-bold uppercase tracking-wider">
                    Found: <span className="font-black text-base ml-1">{filteredAndSortedRecords.length}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {records.length === 0 ? (
            <div className="border-2 border-dashed border-[#2C2C2C] rounded-none p-12 text-center bg-white">
              <Database className="w-10 h-10 text-[#2C2C2C] mx-auto mb-3" />
              <h3 className="font-serif font-black text-sm text-[#2C2C2C] uppercase tracking-widest">Ledger Empty</h3>
              <p className="text-xs text-neutral-600 max-w-sm mx-auto mt-2 leading-relaxed">
                You have not cataloged any photographic plates yet. Ingest an antique photo above to build your private museum ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Filter Controls Bar */}
              <div className="bg-[#F4F1EA]/50 border-2 border-[#2C2C2C] p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative flex-grow max-w-2xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2C2C2C]/50">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, SKU, era, medium, format, or tags..."
                    className="w-full bg-white border-2 border-[#2C2C2C] rounded-none pl-10 pr-10 py-2 text-xs font-serif text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-[#2C2C2C]/60 hover:text-[#2C2C2C]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter and sorting elements */}
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Sort dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-black text-[#2C2C2C]/60">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-white border-2 border-[#2C2C2C] rounded-none px-2.5 py-1.5 text-[11px] font-sans font-bold text-[#2C2C2C] focus:outline-none"
                    >
                      <option value="date-desc">Date Ingested (Newest)</option>
                      <option value="date-asc">Date Ingested (Oldest)</option>
                      <option value="decade-asc">Era (Earliest First)</option>
                      <option value="decade-desc">Era (Latest First)</option>
                      <option value="value-desc">Appraised Value (Highest)</option>
                      <option value="rarity-desc">Rarity Rating (Highest)</option>
                    </select>
                  </div>

                  {/* Format Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-black text-[#2C2C2C]/60">Format:</span>
                    <select
                      value={filterFormat}
                      onChange={(e) => setFilterFormat(e.target.value)}
                      className="bg-white border-2 border-[#2C2C2C] rounded-none px-2.5 py-1.5 text-[11px] font-sans font-bold text-[#2C2C2C] focus:outline-none"
                    >
                      <option value="all">All Formats</option>
                      {uniqueFormats.map((fmt) => (
                        <option key={fmt} value={fmt}>
                          {fmt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase font-black text-[#2C2C2C]/60">Status:</span>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-white border-2 border-[#2C2C2C] rounded-none px-2.5 py-1.5 text-[11px] font-sans font-bold text-[#2C2C2C] focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      {uniqueStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Views */}
                  <div className="flex border-2 border-[#2C2C2C] rounded-none overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 cursor-pointer ${
                        viewMode === "grid" ? "bg-[#2C2C2C] text-white" : "bg-white text-[#2C2C2C] hover:bg-[#F4F1EA]"
                      }`}
                      title="Gallery Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("table")}
                      className={`p-1.5 cursor-pointer ${
                        viewMode === "table" ? "bg-[#2C2C2C] text-white" : "bg-white text-[#2C2C2C] hover:bg-[#F4F1EA]"
                      }`}
                      title="Registry Ledger View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>

              {/* No results placeholder */}
              {filteredAndSortedRecords.length === 0 ? (
                <div className="border-2 border-dashed border-[#2C2C2C]/40 rounded-none p-12 text-center bg-white">
                  <Database className="w-8 h-8 text-[#2C2C2C]/40 mx-auto mb-2" />
                  <h3 className="font-serif font-bold text-sm text-[#2C2C2C] uppercase tracking-wider">No matching plates found</h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Try broadening your search or clearing active filters to view your saved photo collection.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterFormat("all");
                      setFilterStatus("all");
                    }}
                    className="mt-4 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] rounded-none text-xs font-bold uppercase tracking-widest cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                
                /* MUSEUM GRID GALLERY VIEW */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredAndSortedRecords.map((rec) => {
                    const isCurrentlyActive = currentRecord?.id === rec.id;
                    return (
                      <div
                        key={rec.id}
                        onClick={() => handleSelectRecord(rec)}
                        className={`group bg-white border-2 flex flex-col justify-between rounded-none overflow-hidden hover:shadow-md transition-all duration-200 cursor-pointer ${
                          isCurrentlyActive ? "border-[#2C2C2C] ring-2 ring-[#2C2C2C]" : "border-[#2C2C2C]/50 hover:border-[#2C2C2C]"
                        }`}
                      >
                        {/* Image Frame Container */}
                        <div className="relative aspect-[4/3] bg-[#F4F1EA] border-b border-[#2C2C2C]/20 overflow-hidden flex items-center justify-center">
                          <img
                            src={rec.frontImage}
                            alt={rec.title}
                            referrerPolicy="no-referrer"
                            className="object-contain w-full h-full p-2 filter sepia-[15%] transition-transform duration-300 group-hover:scale-102"
                          />
                          <div className="absolute top-2 left-2 bg-[#2C2C2C] text-[#FDFCF8] px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase rounded-none">
                            {rec.steps.inventory.sku || "UNASSIGNED"}
                          </div>
                          
                          {/* Value Tag Badge overlay bottom-right */}
                          <div className="absolute bottom-2 right-2 bg-white/95 border border-[#2C2C2C] text-[#2C2C2C] px-2 py-0.5 text-[10px] font-serif font-black shadow-sm">
                            {rec.steps.quickValue.estimatedValueRange}
                          </div>
                        </div>

                        {/* Text and Metadata */}
                        <div className="p-4 flex-grow flex flex-col justify-between gap-4">
                          <div className="space-y-1.5">
                            <h3 className="font-serif font-black italic text-sm text-[#2C2C2C] leading-tight line-clamp-2">
                              {rec.title}
                            </h3>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[9px] bg-[#F4F1EA] border border-[#2C2C2C]/30 px-1.5 py-0.5 font-sans font-bold uppercase text-[#2C2C2C]/80">
                                {rec.steps.formatId.predictedFormat}
                              </span>
                              <span className="text-[9px] bg-[#2C2C2C]/5 border border-[#2C2C2C]/20 px-1.5 py-0.5 font-mono font-bold text-[#2C2C2C]">
                                {rec.steps.dating.estimatedDecade}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2.5 border-t border-[#2C2C2C]/10 flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-1 text-[#2C2C2C]/60 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(rec.dateCreated).toLocaleDateString()}</span>
                            </div>
                            <span className="font-sans font-bold uppercase tracking-wider text-[9px] text-[#2C2C2C]/80 bg-[#F4F1EA] px-1.5 py-0.5 border border-[#2C2C2C]/20">
                              {rec.steps.status.currentStatus}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons footer drawer inside card */}
                        <div className="bg-[#F4F1EA]/35 border-t border-[#2C2C2C]/25 px-4 py-2 flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectRecord(rec)}
                            className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#2C2C2C] hover:underline"
                          >
                            Revisit Workspace
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedCertificateRecord(rec)}
                              className="p-1 hover:text-[#2C2C2C] text-[#2C2C2C]/60 transition cursor-pointer"
                              title="Print Certificate Tag"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteRecord(rec.id, e)}
                              className="p-1 hover:text-rose-600 text-[#2C2C2C]/60 transition cursor-pointer"
                              title="Delete Plate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                
                /* REGISTRY LEDGER TABLE VIEW */
                <div className="bg-white border-2 border-[#2C2C2C] rounded-none overflow-hidden shadow-none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4F1EA] border-b-2 border-[#2C2C2C] text-[#2C2C2C] uppercase font-mono text-[10px] tracking-widest font-black">
                          <th className="py-3 px-4 font-black">Plate SKU</th>
                          <th className="py-3 px-4 font-black">Accession Name</th>
                          <th className="py-3 px-4 font-black">Substrate Type</th>
                          <th className="py-3 px-4 font-black">Est. Chronology</th>
                          <th className="py-3 px-4 font-black">Appraised Value</th>
                          <th className="py-3 px-4 font-black">Archival Status</th>
                          <th className="py-3 px-4 text-right font-black">Certificate & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2C2C2C]/20">
                        {filteredAndSortedRecords.map((rec) => (
                          <tr 
                            key={rec.id}
                            onClick={() => handleSelectRecord(rec)}
                            className={`hover:bg-[#F4F1EA]/50 cursor-pointer transition text-[#2C2C2C] ${
                              currentRecord?.id === rec.id ? "bg-[#F4F1EA]" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold">
                              {rec.steps.inventory.sku || "UNASSIGNED"}
                            </td>
                            <td className="py-3.5 px-4 font-serif font-black truncate max-w-[200px]">
                              {rec.title}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-white border border-[#2C2C2C] rounded-none text-[#2C2C2C] font-mono text-[10px] font-bold">
                                {rec.steps.formatId.predictedFormat}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono">
                              {rec.steps.dating.estimatedDecade}
                            </td>
                            <td className="py-3.5 px-4 font-serif font-black">
                              {rec.steps.quickValue.estimatedValueRange}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-none text-[10px] font-bold bg-[#F4F1EA] text-[#2C2C2C] border border-[#2C2C2C]/50">
                                {rec.steps.status.currentStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedCertificateRecord(rec)}
                                  className="flex items-center gap-1 px-3 py-1 bg-[#2C2C2C] hover:bg-neutral-800 text-white rounded-none text-[10px] font-bold tracking-widest uppercase transition duration-150 cursor-pointer"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>View Tag</span>
                                </button>
                                <button
                                  onClick={(e) => handleDeleteRecord(rec.id, e)}
                                  className="p-1 hover:text-rose-600 text-[#2C2C2C] transition cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* 4. MODAL COMPONENT: Letterpress Certificate & Appraisal (Modal overlay) */}
      {selectedCertificateRecord && (
        <Certificate
          record={selectedCertificateRecord}
          onClose={() => setSelectedCertificateRecord(null)}
        />
      )}

      {/* Upper Registry Board Footer */}
      <footer className="border-t-2 border-[#2C2C2C] bg-[#F4F1EA] py-10 px-6 mt-20 text-center text-neutral-600 text-xs">
        <div className="max-w-7xl mx-auto space-y-2 font-mono">
          <p className="font-bold uppercase tracking-wider text-[#2C2C2C]">© 2026 CHRONOSARCHIVER REGISTRY OFFICE.</p>
          <p className="text-[10px]">THE 9-STEP APPRAISAL FORMULA IS MODELLED FROM HISTORICAL STANDARDS OF PROFESSIONAL PHYSICAL PHOTOGRAPH PRESERVATION.</p>
        </div>
      </footer>

    </div>
  );
}
