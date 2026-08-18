'use client';

import React from 'react';

export function NoirBackgroundOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none"
    >
      {/* LAYER 01: Dark Atmospheric Base & Ambient Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F5F1E8] via-[#F5F1E8]/90 to-[#171717]/30" />
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] lg:w-[50%] bg-gradient-to-l from-[#171717]/25 via-[#171717]/10 to-transparent mix-blend-multiply" />

      {/* LAYER 02: City Silhouette & Faint Web Geometry */}
      <div className="absolute right-0 bottom-0 top-0 w-full md:w-[50%] opacity-15 pointer-events-none overflow-hidden">
        {/* Subtle Web Structural Lines */}
        <svg className="absolute top-10 right-10 w-96 h-96 text-[#171717] opacity-20" viewBox="0 0 200 200" fill="none">
          <path d="M100 0 V200 M0 100 H200 M29 29 L171 171 M29 171 L171 29" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
          <polygon points="100,20 180,100 100,180 20,100" stroke="currentColor" strokeWidth="0.5" fill="none" />
          <polygon points="100,50 150,100 100,150 50,100" stroke="currentColor" strokeWidth="0.5" fill="none" />
          <polygon points="100,75 125,100 100,125 75,100" stroke="currentColor" strokeWidth="0.5" fill="none" />
        </svg>
      </div>

      {/* LAYER 03: Atmospheric Fog & Rain */}
      <div className="absolute inset-0 opacity-20 pointer-events-none motion-reduce:hidden">
        {/* Animated Rain Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(23,23,23,0.15)_50%,transparent_100%)] [background-size:2px_40px] animate-[pulse_3s_ease-in-out_infinite]" />
      </div>
      {/* Comic Halftone Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#171717_1.2px,transparent_1.2px)] [background-size:20px_20px] opacity-[0.05] pointer-events-none" />

      {/* LAYER 04: SPIDER-MAN NOIR INSPIRED DETECTIVE CHARACTER (Right Side) */}
      <div className="absolute right-0 bottom-0 top-8 w-full sm:w-[75%] md:w-[48%] lg:w-[42%] xl:w-[38%] flex items-end justify-end pointer-events-none z-0">
        <div className="relative w-full h-full max-h-[880px] flex items-end justify-end overflow-hidden">
          {/* Main Graphic Novel Detective Illustration */}
          {/* eslint-disable-next-html-element-for-jsx-pragmas */}
          <img
            src="/noir_vigilante_detective_bg.png"
            alt=""
            loading="eager"
            className="w-full h-auto max-h-full object-contain object-bottom opacity-40 sm:opacity-65 md:opacity-85 lg:opacity-95 filter drop-shadow-[0_12px_30px_rgba(0,0,0,0.5)] transition-all duration-700 transform translate-x-6 sm:translate-x-0"
            style={{
              maskImage: 'linear-gradient(to top, black 80%, transparent 100%), linear-gradient(to left, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 80%, transparent 100%), linear-gradient(to left, black 80%, transparent 100%)',
            }}
          />
          {/* Soft Bottom Atmosphere Fade */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F5F1E8] via-[#F5F1E8]/70 to-transparent opacity-90" />
        </div>
      </div>

      {/* LAYER 05: Subtle Evidence Markings & Crosshairs */}
      <div className="absolute top-1/3 right-[42%] hidden xl:block opacity-25 pointer-events-none font-mono text-[10px] text-[#171717] tracking-widest uppercase">
        <div className="border-l-2 border-[#171717] pl-2.5 space-y-1">
          <div>// SECTOR_04</div>
          <div>EVIDENCE_LOCKER: ACTIVE</div>
          <div>SILHOUETTE_DETECTION: NOIR_VIGILANTE</div>
        </div>
      </div>
    </div>
  );
}
