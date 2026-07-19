/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { PhotoRecord } from "../types";
import { Printer, X, Download, ShieldCheck } from "lucide-react";

interface CertificateProps {
  record: PhotoRecord;
  onClose: () => void;
}

export default function Certificate({ record, onClose }: CertificateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const steps = record.steps;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-4 border-[#2C2C2C] text-[#2C2C2C] rounded-none max-w-4xl w-full shadow-none flex flex-col max-h-[90vh]">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b-2 border-[#2C2C2C] px-6 py-4 bg-[#F4F1EA] rounded-none shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#2C2C2C]" />
            <h2 className="font-serif text-base font-black text-[#2C2C2C] uppercase tracking-wider">Archival Certificate & Appraisal</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 shadow-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Catalog Tag</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#F4F1EA] rounded-none text-[#2C2C2C] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display */}
        <div className="overflow-y-auto p-8 bg-[#FDFCF8]" id="printable-certificate" ref={printRef}>
          
          {/* Main Certificate Frame */}
          <div className="border-4 double border-[#2C2C2C] p-6 md:p-10 relative bg-white shadow-none rounded-none">
            
            {/* Corner Ornamental Accents */}
            <div className="absolute top-2 left-2 text-[#2C2C2C] font-serif text-xl">✦</div>
            <div className="absolute top-2 right-2 text-[#2C2C2C] font-serif text-xl">✦</div>
            <div className="absolute bottom-2 left-2 text-[#2C2C2C] font-serif text-xl">✦</div>
            <div className="absolute bottom-2 right-2 text-[#2C2C2C] font-serif text-xl">✦</div>

            {/* Vintage Header */}
            <div className="text-center mb-8 border-b-2 border-[#2C2C2C] pb-6">
              <span className="font-mono text-xs tracking-[0.2em] text-[#2C2C2C]/80 font-black uppercase block mb-1.5">
                Official Curator Report
              </span>
              <h1 className="font-serif text-2xl md:text-4xl font-black tracking-tight text-[#2C2C2C] uppercase">
                Certificate of Archival Analysis
              </h1>
              <p className="font-serif italic text-neutral-700 mt-2 text-sm md:text-base">
                An expert-verified valuation, format identification, and dating analysis for historical photo archives.
              </p>
              
              <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-xs font-mono text-[#2C2C2C] font-bold uppercase tracking-wider">
                <div>
                  <span className="text-neutral-500">SKU:</span>{" "}
                  <span className="text-[#2C2C2C] font-black">{steps.inventory.sku || "UNASSIGNED"}</span>
                </div>
                <div>•</div>
                <div>
                  <span className="text-neutral-500">ACCESSION NO:</span>{" "}
                  <span className="text-[#2C2C2C] font-black">{steps.inventory.accessionNumber || "N/A"}</span>
                </div>
                <div>•</div>
                <div>
                  <span className="text-neutral-500">DATE RECORDED:</span>{" "}
                  <span className="text-[#2C2C2C] font-black">{new Date(record.dateCreated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-8 text-[#2C2C2C]">
              
              {/* Photo Preview & Key Identification details */}
              <div className="md:col-span-4 flex flex-col items-center">
                <div className="p-2.5 bg-white border-2 border-[#2C2C2C] shadow-none rounded-none rotate-[-1deg] max-w-[200px] w-full">
                  <img
                    src={record.frontImage}
                    alt={record.title}
                    className="w-full h-auto object-cover rounded-none grayscale-[30%] border border-neutral-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mt-2 text-center">
                    <p className="font-serif text-[11px] text-[#2C2C2C] font-bold italic truncate">{record.title}</p>
                  </div>
                </div>

                {record.backImage && (
                  <div className="mt-4 p-1.5 bg-white border-2 border-[#2C2C2C] shadow-none rounded-none rotate-[1deg] max-w-[140px] w-full opacity-100">
                    <img
                      src={record.backImage}
                      alt="Back Side Preview"
                      className="w-full h-auto object-cover rounded-none grayscale border border-neutral-100"
                      referrerPolicy="no-referrer"
                    />
                    <div className="mt-1 text-center">
                      <p className="font-mono text-[9px] text-[#2C2C2C] uppercase tracking-widest font-black">Reverse Side</p>
                    </div>
                  </div>
                )}

                {/* Manila Tag Replica */}
                <div className="mt-6 w-full max-w-[220px] bg-[#F4F1EA] border-2 border-[#2C2C2C] rounded-none p-4 flex flex-col items-center relative shadow-none text-[#2C2C2C] font-serif">
                  {/* String Hole */}
                  <div className="w-4 h-4 rounded-full bg-white border-2 border-[#2C2C2C] flex items-center justify-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#2C2C2C]"></div>
                  </div>
                  <div className="text-[10px] font-mono tracking-[0.15em] text-[#2C2C2C] uppercase font-black mb-1">
                    Museum Label / Hang Tag
                  </div>
                  <div className="w-full border-t border-[#2C2C2C]/30 my-1"></div>
                  
                  <div className="text-center font-black text-xs tracking-wider py-1 text-[#2C2C2C] uppercase">
                    PROVENANCE • RESEARCH • VALUE
                  </div>
                  <div className="w-full border-t border-[#2C2C2C]/30 my-1"></div>
                  
                  <div className="w-full text-[11px] space-y-1.5 mt-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#2C2C2C]/70 font-bold">ERA:</span>
                      <span className="font-black">{steps.dating.estimatedDecade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#2C2C2C]/70 font-bold">FORMAT:</span>
                      <span className="font-black truncate max-w-[100px]">{steps.formatId.predictedFormat}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#2C2C2C]/70 font-bold">COND:</span>
                      <span className="font-black">{steps.inventory.conditionGrading}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#2C2C2C]/70 font-bold">VAL:</span>
                      <span className="font-black text-[#2C2C2C]">{steps.quickValue.estimatedValueRange}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meticulous Technical Details */}
              <div className="md:col-span-8 space-y-6">
                
                {/* Step 1 & 8: Value Assessment */}
                <div>
                  <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5 flex justify-between">
                    <span>I. Rarity & Commercial Appraisal</span>
                    <span className="font-mono text-xs text-[#2C2C2C]">Value Potential: {steps.quickValue.valuePotential}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="bg-[#F4F1EA] p-2.5 border-2 border-[#2C2C2C] rounded-none text-center">
                      <span className="font-mono text-[9px] text-[#2C2C2C]/80 block uppercase font-bold tracking-wider">Est. Market Value</span>
                      <span className="font-serif text-lg font-black text-[#2C2C2C]">{steps.quickValue.estimatedValueRange}</span>
                    </div>
                    <div className="bg-[#F4F1EA] p-2.5 border-2 border-[#2C2C2C] rounded-none text-center">
                      <span className="font-mono text-[9px] text-[#2C2C2C]/80 block uppercase font-bold tracking-wider">Rarity Rank</span>
                      <span className="font-serif text-lg font-black text-[#2C2C2C]">{steps.quickValue.rarityScore} / 10</span>
                    </div>
                    <div className="bg-[#F4F1EA] p-2.5 border-2 border-[#2C2C2C] rounded-none text-center">
                      <span className="font-mono text-[9px] text-[#2C2C2C]/80 block uppercase font-bold tracking-wider">Condition</span>
                      <span className="font-serif text-base font-black text-[#2C2C2C]">{steps.inventory.conditionGrading}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-800 mt-3 leading-relaxed">
                    <strong className="font-black uppercase tracking-wider text-[10px] text-[#2C2C2C] block mb-0.5">Value Justification:</strong> {steps.listing.priceJustification || steps.quickValue.aiReasoning}
                  </p>
                </div>

                {/* Step 2 & 3: Format & Provenance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5">
                      II. Physical Format & Medium
                    </h3>
                    <div className="mt-2.5 space-y-1">
                      <p className="text-xs font-bold text-[#2C2C2C]">
                        Format: <span className="font-normal text-neutral-700">{steps.formatId.predictedFormat}</span>
                      </p>
                      <p className="text-xs font-bold text-[#2C2C2C]">
                        Base Medium: <span className="font-normal text-neutral-700">{steps.formatId.baseMaterial}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {steps.formatId.physicalAttributes.map((attr, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-[#2C2C2C] rounded-none text-[10px] text-[#2C2C2C] font-mono font-bold">
                            {attr}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5">
                      III. Maker & Origin (Provenance)
                    </h3>
                    <div className="mt-2.5 space-y-1.5 text-xs">
                      <p className="font-bold text-[#2C2C2C]">
                        Studio / Photographer: <span className="font-normal text-neutral-700">{steps.provenance.studioName || "Unknown"}</span>
                      </p>
                      <p className="font-bold text-[#2C2C2C]">
                        Location: <span className="font-normal text-neutral-700">{steps.provenance.studioAddress || "Unknown Address"}</span>
                      </p>
                      {steps.provenance.handwrittenText && (
                        <p className="font-bold text-[#2C2C2C] italic bg-[#F4F1EA] p-2 border-2 border-[#2C2C2C] rounded-none mt-1 leading-relaxed">
                          Handwriting: <span className="font-normal text-neutral-700">"{steps.provenance.handwrittenText}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 4: Dating Chronology */}
                <div>
                  <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5">
                    IV. Chronology & Date Estimation
                  </h3>
                  <div className="mt-2.5 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <p className="font-bold text-[#2C2C2C]">
                      Estimated Decade: <span className="font-mono font-black text-[#2C2C2C]">{steps.dating.estimatedDecade}</span>
                    </p>
                    <p className="font-bold text-[#2C2C2C] col-span-2">
                      Calculated Range: <span className="font-mono font-black text-[#2C2C2C]">{steps.dating.estimatedYearRange}</span> (Confidence: {steps.dating.confidenceLevel})
                    </p>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F4F1EA] p-3 rounded-none border-2 border-[#2C2C2C]">
                    <div>
                      <span className="font-mono text-[9px] text-[#2C2C2C] block uppercase font-black tracking-wider">Fashion Clues</span>
                      <ul className="list-disc list-inside text-[10px] text-neutral-700 mt-1 space-y-0.5">
                        {steps.dating.fashionClues.slice(0, 3).map((clue, i) => (
                          <li key={i} className="truncate">{clue}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-mono text-[9px] text-[#2C2C2C] block uppercase font-black tracking-wider">Chemical & Technical Indicators</span>
                      <ul className="list-disc list-inside text-[10px] text-neutral-700 mt-1 space-y-0.5">
                        {steps.dating.technologicalClues.slice(0, 3).map((clue, i) => (
                          <li key={i} className="truncate">{clue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-700 mt-3 leading-relaxed">{steps.dating.explanation}</p>
                </div>

                {/* Step 5: Subject & Scene Classification */}
                <div>
                  <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5">
                    V. Subject Analysis & Classification
                  </h3>
                  <div className="mt-2.5 text-xs space-y-1">
                    <p className="font-bold text-[#2C2C2C]">
                      Primary Subject: <span className="font-normal text-neutral-700">{steps.classification.primaryCategory}</span>
                    </p>
                    <p className="text-neutral-700 leading-relaxed text-[11px] mt-1">{steps.classification.scenicDescription}</p>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {steps.classification.tags.slice(0, 6).map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border border-[#2C2C2C] rounded-none text-[#2C2C2C] text-[10px] font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 6: Research Actions */}
                <div>
                  <h3 className="font-serif font-black text-[#2C2C2C] text-sm tracking-wide uppercase border-b-2 border-[#2C2C2C] pb-1.5">
                    VI. Historical Research Directions
                  </h3>
                  <div className="mt-2.5 text-xs space-y-1">
                    <p className="text-neutral-700 text-[11px] leading-relaxed">{steps.research.photographerBio || steps.research.historicalContext}</p>
                    <div className="mt-3">
                      <span className="font-bold text-[10px] text-[#2C2C2C] block uppercase font-mono tracking-wider">Recommended Archives for Lookup:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {steps.research.suggestedDatabases.map((db, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-[#2C2C2C] rounded-none text-[#2C2C2C] text-[10px] font-mono font-bold">
                            {db}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Legal Footnote & Authenticity Seals */}
            <div className="border-t-2 border-[#2C2C2C] pt-6 mt-8 flex flex-col md:flex-row justify-between items-center text-xs font-serif text-neutral-600 gap-6">
              <div className="text-center md:text-left max-w-md">
                <p className="italic">
                  "This appraisal is generated utilizing state-of-the-art vision reasoning models based on historical database records, photography mediums, studio directories, and apparel fashion benchmarks."
                </p>
                <p className="text-[10px] font-mono mt-2 text-neutral-500 font-bold">
                  Authentication Token: {record.id.substring(0, 8).toUpperCase()}-{steps.inventory.sku || "TEMP"}
                </p>
              </div>

              {/* Signature Block */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="font-serif italic text-[#2C2C2C] text-lg select-none border-b border-[#2C2C2C] pb-0.5 px-4 font-black" style={{ fontFamily: "cursive, Georgia" }}>
                    Gemini Vision 3.5
                  </div>
                  <span className="text-[10px] font-mono tracking-wider uppercase block mt-1 text-[#2C2C2C]/70 font-bold">AI Archivist Signature</span>
                </div>
                
                <div className="text-center">
                  <div className="font-serif text-[#2C2C2C] text-lg border-b border-[#2C2C2C] pb-0.5 px-4 font-black select-none">
                    Curator
                  </div>
                  <span className="text-[10px] font-mono tracking-wider uppercase block mt-1 text-[#2C2C2C]/70 font-bold">User Sign-off</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t-2 border-[#2C2C2C] px-6 py-4 bg-[#F4F1EA] flex justify-end gap-3 rounded-none shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-[#2C2C2C] bg-white hover:bg-[#F4F1EA] text-[#2C2C2C] font-black uppercase tracking-widest text-xs transition duration-150 rounded-none cursor-pointer"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
