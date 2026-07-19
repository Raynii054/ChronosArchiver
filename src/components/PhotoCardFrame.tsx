/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, MouseEvent } from "react";
import { FlipHorizontal, Search, RotateCw, Upload, FileText, CheckCircle2 } from "lucide-react";
import { resizeImageAndToBase64 } from "../utils/image";
import ThreeDCardViewer from "./ThreeDCardViewer";

interface PhotoCardFrameProps {
  frontImage: string;
  backImage?: string;
  title: string;
  formatName?: string;
  onUploadBack?: (base64: string, fileType: string) => void;
  isAnalyzingBack?: boolean;
}

export default function PhotoCardFrame({
  frontImage,
  backImage,
  title,
  formatName = "Cabinet Card",
  onUploadBack,
  isAnalyzingBack = false,
}: PhotoCardFrameProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ x: 0, y: 0, bgX: 0, bgY: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [is3DOpen, setIs3DOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle magnifying lens interaction
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !containerRef.current) return;

    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    // Mouse coordinates relative to the image itself
    let x = e.clientX - left;
    let y = e.clientY - top;

    // Bounds checking
    if (x < 0 || y < 0 || x > width || y > height) {
      setShowMagnifier(false);
      return;
    }

    // Coordinates relative to the overall container (for placing the lens)
    const lensX = e.clientX - containerRect.left;
    const lensY = e.clientY - containerRect.top;

    // Background percentage coordinates for the zoom effect
    const bgX = (x / width) * 100;
    const bgY = (y / height) * 100;

    setMagnifierPos({ x: lensX, y: lensY, bgX, bgY });
  };

  const handleMouseEnter = () => {
    // Only magnify the front side
    if (!isFlipped) {
      setShowMagnifier(true);
    }
  };

  const handleMouseLeave = () => {
    setShowMagnifier(false);
  };

  // Drag and drop for back side photo upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file || !onUploadBack) return;
    resizeImageAndToBase64(file, 1000)
      .then(({ base64, mimeType }) => {
        onUploadBack(base64, mimeType);
      })
      .catch((err) => {
        console.error("Failed to process and resize back photo:", err);
        // Fallback to reading file directly as base64 in case resizing fails
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const base64Str = event.target.result.toString().split(",")[1];
            onUploadBack(base64Str, file.type);
          }
        };
        reader.readAsDataURL(file);
      });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      
      {/* Interactive Photo Mount Container */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-[340px] aspect-[4/6] [perspective:1000px] select-none group"
      >
        {/* Card Frame holding inner flip panel */}
        <div 
          className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          
          {/* FRONT SIDE (Cabinet Card Mount) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-[#F4F1EA] border-[12px] border-[#2C2C2C] shadow-none rounded-none p-4 flex flex-col justify-between items-center ring-2 ring-[#2C2C2C]">
            {/* Inner Bold Border */}
            <div className="w-full h-full border-2 border-[#2C2C2C] p-2.5 flex flex-col justify-between items-center relative bg-[#FDFCF8] shadow-none">
              
              {/* Photo Area */}
              <div 
                className="relative w-full flex-grow overflow-hidden bg-white border border-[#2C2C2C]/30 cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  ref={imageRef}
                  src={frontImage}
                  alt={title}
                  className="w-full h-full object-contain grayscale-[15%] brightness-95 sepia-[5%] transition-all"
                  referrerPolicy="no-referrer"
                />

                {/* Corner mounts (vintage photographic look) */}
                <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#2C2C2C]/50"></div>
                <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#2C2C2C]/50"></div>
                <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#2C2C2C]/50"></div>
                <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#2C2C2C]/50"></div>
              </div>

              {/* Studio Mark / Title Panel (Bottom rail) */}
              <div className="w-full text-center mt-3 pt-1.5 border-t border-[#2C2C2C]/20">
                <span className="font-serif text-[#2C2C2C] font-black uppercase text-xs tracking-widest block leading-none">
                  {formatName || "ARCHIVAL ARCHIVE"}
                </span>
                <span className="font-sans text-[9px] text-[#2C2C2C]/70 uppercase tracking-widest font-bold block mt-0.5">
                  Museum Registry • Double Weight Board
                </span>
              </div>
            </div>
          </div>

          {/* BACK SIDE (Reverse Side Mount) */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-[#F4F1EA] border-[12px] border-[#2C2C2C] shadow-none rounded-none p-4 flex flex-col justify-between items-center ring-2 ring-[#2C2C2C]">
            {/* Inner Board */}
            <div className="w-full h-full border-2 border-[#2C2C2C] p-3 flex flex-col justify-between items-center relative bg-[#FDFCF8] shadow-none">
              
              {backImage ? (
                /* Back image preview */
                <div className="w-full flex-grow overflow-hidden bg-white border border-[#2C2C2C]/30 relative">
                  <img
                    src={backImage}
                    alt="Back side handwriting & stamps"
                    className="w-full h-full object-contain grayscale opacity-90 sepia-[20%]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
                </div>
              ) : (
                /* Drag and drop uploader for back side */
                <div 
                  className={`w-full flex-grow border-2 border-dashed rounded-none flex flex-col items-center justify-center p-4 text-center transition-colors ${
                    dragActive 
                      ? "border-[#2C2C2C] bg-[#F4F1EA]" 
                      : "border-[#2C2C2C]/30 hover:border-[#2C2C2C]/50 bg-transparent"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    id="back-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isAnalyzingBack}
                  />

                  {isAnalyzingBack ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#2C2C2C] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-serif font-bold text-[#2C2C2C] animate-pulse">Reading Inscriptions...</p>
                    </div>
                  ) : (
                    <label 
                      htmlFor="back-photo-input"
                      className="cursor-pointer flex flex-col items-center justify-center h-full w-full"
                    >
                      <Upload className="w-8 h-8 text-[#2C2C2C]/55 mb-2 group-hover:scale-105 transition" />
                      <h4 className="font-serif font-black text-xs text-[#2C2C2C] uppercase tracking-wider">Inspect Reverse Side</h4>
                      <p className="text-[10px] text-neutral-600 mt-1 max-w-[180px] leading-relaxed">
                        Upload photo of the back to OCR handwritten notes or studio stamps.
                      </p>
                      <span className="mt-3 px-3 py-1.5 bg-[#2C2C2C] hover:bg-neutral-800 rounded-none font-sans text-[9px] text-[#FDFCF8] font-bold uppercase tracking-widest transition duration-150">
                        Select Image
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Bottom markings of reverse board */}
              <div className="w-full text-center mt-3 pt-1.5 border-t border-[#2C2C2C]/20">
                <span className="font-serif text-[#2C2C2C] font-black uppercase text-[11px] tracking-widest block leading-none">
                  {backImage ? "REVERSE INSCRIPTIONS" : "SIDE B (REVERSE)"}
                </span>
                <span className="font-sans text-[8px] text-[#2C2C2C]/70 uppercase tracking-widest block mt-1 font-bold">
                  {backImage ? "Handwritten Clues Loaded" : "Awaiting Provenance Stamp"}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* BRASS MAGNIFYING LENS LITE (Absolute positioned overlay on front image) */}
        {showMagnifier && !isFlipped && (
          <div
            className="absolute rounded-none pointer-events-none border-[3px] border-[#2C2C2C] shadow-none z-20 flex items-center justify-center"
            style={{
              width: "120px",
              height: "120px",
              left: `${magnifierPos.x - 60}px`,
              top: `${magnifierPos.y - 60}px`,
              backgroundImage: `url(${frontImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${imageRef.current ? imageRef.current.width * 2.2 : 0}px ${
                imageRef.current ? imageRef.current.height * 2.2 : 0
              }px`,
              backgroundPosition: `${magnifierPos.bgX}% ${magnifierPos.bgY}%`,
              boxShadow: "inset 0 0 8px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)",
            }}
          >
            {/* Brass Ring Inner Glow */}
            <div className="absolute inset-0 rounded-none border border-[#2C2C2C]/30"></div>
            
            {/* Small Handle */}
            <div 
              className="absolute w-3 h-10 bg-[#2C2C2C] border border-[#2C2C2C] rounded-none shadow-none"
              style={{
                transform: "rotate(45deg) translate(50px, 50px)",
                transformOrigin: "center center",
              }}
            >
              <div className="w-full h-2 bg-neutral-300 rounded-none"></div>
            </div>
          </div>
        )}

      </div>

      {/* Control Buttons underneath photo mount */}
      <div className="flex items-center gap-2 mt-4">
        {(backImage || onUploadBack) && (
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 cursor-pointer shadow-none"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>{isFlipped ? "Show Face (Front)" : "Flip to Reverse / Upload Back"}</span>
          </button>
        )}

        {backImage && (
          <button
            onClick={() => setIs3DOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2C2C2C] hover:bg-neutral-800 text-[#FDFCF8] border-2 border-[#2C2C2C] rounded-none text-xs font-bold uppercase tracking-widest transition duration-150 cursor-pointer shadow-none relative overflow-hidden group/btn"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-500 group-hover/btn:rotate-180 transition-transform duration-500" />
            <span className="text-amber-500">View in 3D Mode</span>
            <span className="absolute right-0 top-0 h-1.5 w-1.5 bg-amber-500"></span>
          </button>
        )}
        
        {!isFlipped && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#2C2C2C] font-black uppercase tracking-wider">
            <Search className="w-3.5 h-3.5 text-[#2C2C2C]" />
            <span>Hover to magnify card weave</span>
          </div>
        )}

        {isFlipped && !backImage && (
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-bold uppercase tracking-wider animate-pulse">
            <FileText className="w-3.5 h-3.5" />
            <span>Side-B uploader active</span>
          </div>
        )}
      </div>

      {is3DOpen && backImage && (
        <ThreeDCardViewer
          frontImage={frontImage}
          backImage={backImage}
          title={title}
          formatName={formatName}
          onClose={() => setIs3DOpen(false)}
        />
      )}

    </div>
  );
}
