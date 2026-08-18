'use client';

import React from 'react';

export function NoirBackgroundOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none"
    >
      {/* LAYER 1: Ambient Vignette & City Silhouette Shadow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#F5F1E8] via-[#F5F1E8]/90 to-black/20" />
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[60%] lg:w-[50%] bg-gradient-to-l from-[#171717]/15 via-[#171717]/5 to-transparent mix-blend-multiply" />

      {/* LAYER 2: Subtle Rain Effect */}
      <div className="absolute inset-0 opacity-25 dark-rain-container pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#171717_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
      </div>

      {/* LAYER 3: Comic Halftone Dot Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(#171717_1.2px,transparent_1.2px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

      {/* LAYER 4: NOIR DETECTIVE CHARACTER (Right Side) */}
      <div className="absolute right-0 bottom-0 top-12 w-full sm:w-[80%] md:w-[45%] lg:w-[40%] xl:w-[36%] flex items-end justify-end pointer-events-none z-0">
        <div className="relative w-full h-full max-h-[850px] flex items-end justify-end overflow-hidden">
          {/* Character Silhouette Image with Rim Lighting & Smooth Fade Edge */}
          {/* eslint-disable-next-html-element-for-jsx-pragmas */}
          <img
            src="/noir_detective_bg.png"
            alt=""
            loading="eager"
            className="w-full h-auto max-h-full object-contain object-bottom opacity-50 sm:opacity-70 md:opacity-85 lg:opacity-95 filter drop-shadow-[0_10px_25px_rgba(0,0,0,0.4)] transition-all duration-700 transform translate-x-4 sm:translate-x-0"
            style={{
              maskImage: 'linear-gradient(to top, black 80%, transparent 100%), linear-gradient(to left, black 80%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%), linear-gradient(to left, black 85%, transparent 100%)',
            }}
          />
          {/* Shadow vignette around character bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#F5F1E8] via-transparent to-transparent opacity-80" />
        </div>
      </div>

      {/* LAYER 5: Evidence Lines & Tactical Grid Accents */}
      <div className="absolute top-1/4 right-[38%] hidden xl:block opacity-20 pointer-events-none font-mono text-[10px] text-[#171717] tracking-widest uppercase">
        <div className="border-l-2 border-[#171717] pl-2 space-y-1">
          <div>// SECTOR_04</div>
          <div>EVIDENCE_VAULT_ACTIVE</div>
          <div>SUBJECT: UNKNOWN_REPOSITORIES</div>
        </div>
      </div>
    </div>
  );
}
