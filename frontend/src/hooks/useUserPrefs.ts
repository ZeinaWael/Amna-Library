import { useSyncExternalStore } from 'react';
import {
  type Locale,
  type Theme,
  addToShelf,
  dismissContinueReading,
  getDismissedContinueReading,
  getLocale,
  getShelf,
  getTheme,
  isInShelf,
  removeFromShelf,
  setLocale,
  setTheme,
  subscribe,
} from '../lib/userPrefs';

type Snapshot = {
  shelf: string[];
  locale: Locale;
  theme: Theme;
  dismissedContinueReading: string[];
};

function rebuild(): Snapshot {
  return {
    shelf: getShelf(),
    locale: getLocale(),
    theme: getTheme(),
    dismissedContinueReading: getDismissedContinueReading(),
  };
}

let snapshotRef: Snapshot =
  typeof window === 'undefined'
    ? { shelf: [], locale: 'en', theme: 'system', dismissedContinueReading: [] }
    : rebuild();

// Refresh the cached snapshot whenever any underlying pref changes. Must be
// registered BEFORE any React subscribers so that, by the time React's
// listener runs, snapshotRef already points at the new data.
if (typeof window !== 'undefined') {
  subscribe(() => {
    snapshotRef = rebuild();
  });
}

const SERVER_SNAPSHOT: Snapshot = {
  shelf: [],
  locale: 'en',
  theme: 'system',
  dismissedContinueReading: [],
};

const getClientSnapshot = (): Snapshot => snapshotRef;
const getServerSnapshot = (): Snapshot => SERVER_SNAPSHOT;

export function useUserPrefs() {
  const snap = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  return {
    shelf: snap.shelf,
    locale: snap.locale,
    theme: snap.theme,
    dismissedContinueReading: snap.dismissedContinueReading,
    addToShelf,
    removeFromShelf,
    isInShelf,
    setLocale,
    setTheme,
    dismissContinueReading,
  };
}
