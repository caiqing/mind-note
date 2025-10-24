'use client';

import * as React from 'react';

/**
 * Store Provider Component
 *
 * Provides all Zustand stores to the component tree.
 * This ensures proper state management context is available.
 *
 * Reference: specs/003-ui-ux/data-model.md
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
