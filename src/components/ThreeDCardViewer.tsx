/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  RotateCcw, 
  FlipHorizontal, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  X, 
  Move,
  Layout,
  BookOpen
} from "lucide-react";

interface ThreeDCardViewerProps {
  frontImage: string;
  backImage: string;
  title: string;
  formatName?: string;
  onClose: () => void;
}

export default function ThreeDCardViewer({
  frontImage,
  backImage,
  title,
  formatName = "Cabinet Card",
  onClose
}: ThreeDCardViewerProps) {
  const [rotation, setRotation] = useState({ x: 15, y: -30 });
  const [zoom, setZoom] = useState(1.0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef({ x: 0, y: 0 });
  const rotationStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate || isDragging) return;
    const interval = setInterval(() => {
      setRotation(prev => ({
        ...prev,
        y: (prev.y + 0.3) % 360
      }));
    }, 16);
    return () => clearInterval(interval);
  }, [autoRotate, isDragging]);

  // Handle Drag / Rotation mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    dragStart.current = { x: e.clientX, y: e.clientY };
    rotationStart.current = { ...rotation };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    setRotation({
      x: Math.min(Math.max(rotationStart.current.x - deltaY * 0.45, -75), 75), // Cap vertical tilt
      y: rotationStart.current.y + deltaX * 0.45
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setAutoRotate(false);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      rotationStart.current = { ...rotation };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - dragStart.current.x;
    const deltaY = e.touches[0].clientY - dragStart.current.y;
    
    setRotation({
      x: Math.min(Math.max(rotationStart.current.x - deltaY * 0.45, -75), 75),
      y: rotationStart.current.y + deltaX * 0.45
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Keyboard controls for accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setAutoRotate(false);
        setRotation(prev => ({ ...prev, y: prev.y - 10 }));
      } else if (e.key === "ArrowRight") {
        setAutoRotate(false);
        setRotation(prev => ({ ...prev, y: prev.y + 10 }));
      } else if (e.key === "ArrowUp") {
        setAutoRotate(false);
        setRotation(prev => ({ ...prev, x: Math.min(prev.x + 10, 75) }));
      } else if (e.key === "ArrowDown") {
        setAutoRotate(false);
        setRotation(prev => ({ ...prev, x: Math.max(prev.x - 10, -75) }));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Compute realistic dynamic drop shadow coordinates based on rotation
  const radY = (rotation.y * Math.PI) / 180;
  const radX = (rotation.x * Math.PI) / 180;
  const shadowX = -Math.sin(radY) * 20 * zoom;
  const shadowY = (Math.cos(radX) * 15 + 8) * zoom;
  const shadowBlur = (25 + Math.abs(Math.sin(radY)) * 10) * zoom;
  const shadowOpacity = 0.35 - Math.abs(rotation.x) / 300;

  // View presets
  const applyPreset = (preset: "front" | "back" | "isometric") => {
    setAutoRotate(false);
    if (preset === "front") {
      setRotation({ x: 0, y: 0 });
    } else if (preset === "back") {
      setRotation({ x: 0, y: 180 });
    } else if (preset === "isometric") {
      setRotation({ x: 15, y: -35 });
    }
  };

  return (
    <div className="fixed inset-0 bg-[#141414]/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none select-none-touch">
      
      {/* HEADER SECTION */}
      <div className="w-full flex items-center justify-between border-b border-[#FDFCF8]/10 pb-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FDFCF8]/60 font-bold">
            Interactive 3D Inspection Chamber
          </span>
          <h2 className="text-sm font-serif font-black italic text-[#FDFCF8] uppercase mt-0.5 max-w-[280px] md:max-w-md truncate">
            {title}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="hidden md:inline px-2 py-0.5 bg-[#FDFCF8]/10 text-[#FDFCF8]/80 text-[9px] font-mono uppercase tracking-wider border border-[#FDFCF8]/10">
            Format: {formatName}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#FDFCF8]/10 text-[#FDFCF8]/70 hover:text-[#FDFCF8] border border-[#FDFCF8]/10 hover:border-[#FDFCF8]/30 transition duration-150 rounded-none cursor-pointer"
            title="Exit 3D Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 3D CANVAS STAGE */}
      <div 
        ref={containerRef}
        className="flex-grow w-full flex items-center justify-center relative cursor-grab active:cursor-grabbing py-8"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Helper Drag Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[10px] font-mono text-[#FDFCF8]/50 uppercase tracking-widest bg-black/40 px-3 py-1.5 border border-white/5 pointer-events-none">
          <Move className="w-3.5 h-3.5 animate-pulse" />
          <span>Left-Click & Drag to Rotate Card</span>
        </div>

        {/* Outer Perspective Wrapper */}
        <div 
          className="relative w-full max-w-[290px] md:max-w-[340px] aspect-[4/6]"
          style={{ perspective: "1500px" }}
        >
          {/* Main Card Pivot Box */}
          <div 
            className="relative w-full h-full [transform-style:preserve-3d] transition-transform"
            style={{
              transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(${zoom}, ${zoom}, ${zoom})`,
              transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
            }}
          >
            
            {/* Real shadow backing layer (renders flat behind card to cast accurate volumetric shadows) */}
            <div 
              className="absolute inset-[12px] bg-black pointer-events-none transition-all duration-75"
              style={{
                transform: `translate3d(${shadowX}px, ${shadowY}px, -15px)`,
                filter: `blur(${shadowBlur}px)`,
                opacity: shadowOpacity,
              }}
            ></div>

            {/* 3D Card Board sandwich (Simulating thickness using layered panels) */}
            
            {/* FRONT SIDE */}
            <div 
              className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-[#F4F1EA] border-[12px] border-[#2C2C2C] p-4 flex flex-col justify-between items-center ring-2 ring-[#2C2C2C] shadow-none"
              style={{ transform: "translate3d(0, 0, 1.5px)" }}
            >
              <div className="w-full h-full border-2 border-[#2C2C2C] p-2.5 flex flex-col justify-between items-center relative bg-[#FDFCF8] shadow-none">
                {/* Vintage Image Frame */}
                <div className="relative w-full flex-grow overflow-hidden bg-white border border-[#2C2C2C]/30">
                  <img
                    src={frontImage}
                    alt={title}
                    className="w-full h-full object-contain grayscale-[15%] brightness-95 sepia-[5%]"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Photo Corner Mounting Brackets */}
                  <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t border-l border-[#2C2C2C]/50"></div>
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t border-r border-[#2C2C2C]/50"></div>
                  <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b border-l border-[#2C2C2C]/50"></div>
                  <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b border-r border-[#2C2C2C]/50"></div>

                  {/* Sweep sheen light highlight */}
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.25] bg-gradient-to-tr from-transparent via-white to-transparent"
                    style={{
                      background: `linear-gradient(${135 - rotation.y * 0.6}deg, rgba(255,255,255,0) 25%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 75%)`,
                    }}
                  />
                </div>

                {/* Lower Gold Studio Markings */}
                <div className="w-full text-center mt-3 pt-1.5 border-t border-[#2C2C2C]/20 shrink-0">
                  <span className="font-serif text-[#2C2C2C] font-black uppercase text-xs tracking-[0.2em] block leading-none">
                    {formatName}
                  </span>
                  <span className="font-sans text-[8px] text-[#2C2C2C]/65 uppercase tracking-widest font-black block mt-1.5">
                    Photographic Registry Ledger
                  </span>
                </div>
              </div>
            </div>

            {/* CARD THICKNESS SLICES (Renders the rim borders of the board to make it look truly 3D) */}
            <div className="absolute inset-0 bg-[#1c1c1c] [transform-style:preserve-3d]" style={{ transform: "translate3d(0, 0, 0)" }}>
              {/* Left Edge */}
              <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-[#222] [transform:rotateY(-90deg)_translateZ(1.5px)] origin-left"></div>
              {/* Right Edge */}
              <div className="absolute top-0 bottom-0 right-0 w-[3px] bg-[#222] [transform:rotateY(90deg)_translateZ(1.5px)] origin-right"></div>
              {/* Top Edge */}
              <div className="absolute left-0 right-0 top-0 h-[3px] bg-[#222] [transform:rotateX(90deg)_translateZ(1.5px)] origin-top"></div>
              {/* Bottom Edge */}
              <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#222] [transform:rotateX(-90deg)_translateZ(1.5px)] origin-bottom"></div>
            </div>

            {/* BACK SIDE (Reverse) */}
            <div 
              className="absolute inset-0 w-full h-full [backface-visibility:hidden] bg-[#F4F1EA] border-[12px] border-[#2C2C2C] p-4 flex flex-col justify-between items-center ring-2 ring-[#2C2C2C] shadow-none"
              style={{ transform: "rotateY(180deg) translate3d(0, 0, 1.5px)" }}
            >
              <div className="w-full h-full border-2 border-[#2C2C2C] p-3 flex flex-col justify-between items-center relative bg-[#FDFCF8] shadow-none">
                {/* Back Side Image holding original pencil markings and stamps */}
                <div className="relative w-full flex-grow overflow-hidden bg-white border border-[#2C2C2C]/30">
                  <img
                    src={backImage}
                    alt={`${title} - Reverse Side`}
                    className="w-full h-full object-contain grayscale opacity-95 sepia-[15%]"
                    draggable={false}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>

                  {/* Dynamic Back side sheen light reflection */}
                  <div 
                    className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.22]"
                    style={{
                      background: `linear-gradient(${135 + rotation.y * 0.6}deg, rgba(255,255,255,0) 25%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 75%)`,
                    }}
                  />
                </div>

                {/* Bottom reverse board inscription ledger details */}
                <div className="w-full text-center mt-3 pt-1.5 border-t border-[#2C2C2C]/20 shrink-0">
                  <span className="font-serif text-[#2C2C2C] font-black uppercase text-[11px] tracking-widest block leading-none">
                    REVERSE INSCRIPTIONS
                  </span>
                  <span className="font-sans text-[8px] text-[#2C2C2C]/70 uppercase tracking-widest block mt-1 font-bold">
                    Historical Metadata Decoded
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DASHBOARD CONTROLS PANEL */}
      <div className="w-full max-w-2xl mx-auto bg-[#1C1C1C] border border-[#FDFCF8]/10 p-4 md:p-5 space-y-4 shrink-0">
        
        {/* Preset Options & Playback Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Quick Rotation Angle Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase text-[#FDFCF8]/50 tracking-wider mr-1.5 hidden sm:inline">
              Camera Presets:
            </span>
            <button
              onClick={() => applyPreset("front")}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#FDFCF8] text-[9px] font-mono uppercase font-bold border border-white/5 tracking-wider transition"
            >
              Front Face (0°)
            </button>
            <button
              onClick={() => applyPreset("isometric")}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#FDFCF8] text-[9px] font-mono uppercase font-bold border border-white/5 tracking-wider transition"
            >
              Tilt Angle (45°)
            </button>
            <button
              onClick={() => applyPreset("back")}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[#FDFCF8] text-[9px] font-mono uppercase font-bold border border-white/5 tracking-wider transition"
            >
              Reverse Face (180°)
            </button>
          </div>

          {/* Toggle Auto Rotate */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono uppercase font-black tracking-widest transition border ${
                autoRotate 
                  ? "bg-amber-500 text-[#1C1C1C] border-amber-500 hover:bg-amber-400"
                  : "bg-neutral-800 text-[#FDFCF8]/70 border-white/5 hover:bg-neutral-700"
              }`}
            >
              {autoRotate ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Pause Rotation</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>Auto Spin</span>
                </>
              )}
            </button>
            
            <button
              onClick={() => {
                applyPreset("isometric");
                setZoom(1.0);
              }}
              className="p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-white/5 text-[#FDFCF8]/80 hover:text-[#FDFCF8] transition"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Zoom Scale Sliders & Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#FDFCF8]/10 pt-3">
          
          {/* Zoom Slide */}
          <div className="flex items-center gap-3">
            <Minimize2 className="w-3.5 h-3.5 text-[#FDFCF8]/50" />
            <div className="flex-grow flex items-center gap-2">
              <span className="text-[9px] font-mono text-[#FDFCF8]/50 uppercase shrink-0">Scale</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-grow h-1 bg-neutral-800 rounded-none appearance-none cursor-pointer accent-amber-500"
              />
              <span className="text-[9px] font-mono text-amber-400 font-bold w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>
            <Maximize2 className="w-3.5 h-3.5 text-[#FDFCF8]/50" />
          </div>

          {/* Precision Telemetry Info */}
          <div className="flex items-center justify-between font-mono text-[9px] text-[#FDFCF8]/40 border-l-0 md:border-l border-[#FDFCF8]/10 pl-0 md:pl-4">
            <div className="flex items-center gap-3">
              <span>ANGLE_X: <strong className="text-emerald-400 font-bold">{Math.round(rotation.x)}°</strong></span>
              <span>ANGLE_Y: <strong className="text-emerald-400 font-bold">{Math.round(rotation.y)}°</strong></span>
            </div>
            <span className="text-[#FDFCF8]/30">STYLUS_TILT: ENABLED</span>
          </div>

        </div>

      </div>

    </div>
  );
}
