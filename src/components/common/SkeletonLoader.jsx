/**
 * ============================================================================
 * SkeletonLoader.jsx — Skeleton Loading Placeholders
 * 
 * Non-blocking skeleton loaders for various UI components.
 * Shows placeholder content while data is being fetched.
 * ============================================================================
 */

import React from 'react';

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-5 space-y-3 animate-pulse ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 pl-13">
        <div className="h-3 bg-slate-100 rounded" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonLine({ width = 'w-full', height = 'h-3' }) {
  return <div className={`${width} ${height} bg-slate-200 rounded animate-pulse`} />;
}

export function SkeletonGrid({ cols = 2, count = 4 }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
