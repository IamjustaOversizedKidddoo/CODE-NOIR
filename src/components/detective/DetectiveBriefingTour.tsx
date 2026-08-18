'use client';

import React from 'react';
import { DetectiveTourGuide, ReplayDetectiveGuideButton } from './DetectiveTourGuide';

export function DetectiveBriefingTour() {
  return <DetectiveTourGuide />;
}

export function ReplayGuideButton({ className = '' }: { className?: string }) {
  return <ReplayDetectiveGuideButton className={className} />;
}
