// User preferences and state persistence

export interface UserPreferences {
  // Library preferences
  libraryView: "yours" | "all" | "followed";
  playlistSortKey: "none" | "name" | "tracks";
  playlistSortDir: "asc" | "desc";
  playlistGroupKey: "none" | "size";
  playlistViewSize: "large" | "medium" | "small";
  playlistOrder: string[]; // Array of playlist IDs in custom order
  
  // Workspace preferences
  workspaceSortKey: string | null;
  workspaceSortDir: "asc" | "desc";
  workspaceGroupBy: "artist" | "album" | "genre" | "releaseYear" | "none";
  workspaceColumnOrder: string[];
  workspaceVisibleColumns: string[];
  workspaceSearch: string;
  workspaceTrackOrders: Record<string, string[]>;
  
  // Dashboard preferences
  hoveredPlaylist: string | number | null;
  
  // API Reference preferences
  apiOpenSection: string;
  apiExpandedEndpoint: string | null;
  
  // Search preferences
  searchQuery: string;
  searchFilter: "all" | "tracks" | "artists" | "playlists" | "albums";
  
  // UI preferences
  sidebarCollapsed: boolean;
  currentPage: "dashboard" | "workspace" | "api" | "search" | "libraries";

  // Feature flags
  enableDeprecatedApis: boolean; // Audio-features & artist-genre enrichment (deprecated Spotify endpoints)
  selectedPlaylistId: string | number | null;
}

const STORAGE_KEY = "spotify-manager-preferences";

// Default preferences
const defaultPreferences: UserPreferences = {
  libraryView: "yours",
  playlistSortKey: "none",
  playlistSortDir: "asc",
  playlistGroupKey: "none",
  playlistViewSize: "medium",
  playlistOrder: [],
  
  workspaceSortKey: null,
  workspaceSortDir: "asc",
  workspaceGroupBy: "none",
  workspaceColumnOrder: ["title", "artist", "album", "genre", "releaseYear", "dateAdded", "bpm", "energy", "popularity", "danceability", "valence", "acousticness", "instrumentalness", "speechiness", "liveness", "loudness", "duration"],
  workspaceVisibleColumns: ["title", "artist", "album", "genre", "releaseYear", "dateAdded", "bpm", "energy", "popularity", "danceability", "valence", "acousticness", "instrumentalness", "speechiness", "liveness", "loudness", "duration"],
  workspaceSearch: "",
  workspaceTrackOrders: {},
  
  hoveredPlaylist: null,
  
  apiOpenSection: "Player & Playback",
  apiExpandedEndpoint: null,
  
  searchQuery: "",
  searchFilter: "all",
  
  sidebarCollapsed: false,
  currentPage: "dashboard",

  // Feature flags — deprecated endpoints off by default for safety
  enableDeprecatedApis: false,
  selectedPlaylistId: null,
};

// Load preferences from localStorage
export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle new preferences added in updates
      const merged = { ...defaultPreferences, ...parsed };

      // Migration: Ensure all default columns are present in workspaceColumnOrder and workspaceVisibleColumns
      let migrated = false;
      const defaultOrder = defaultPreferences.workspaceColumnOrder;
      const currentOrder = [...(merged.workspaceColumnOrder || [])];
      const missingColumns = defaultOrder.filter(col => !currentOrder.includes(col));

      if (missingColumns.length > 0) {
        const durationIndex = currentOrder.indexOf("duration");
        if (durationIndex !== -1) {
          currentOrder.splice(durationIndex, 0, ...missingColumns);
        } else {
          currentOrder.push(...missingColumns);
        }
        merged.workspaceColumnOrder = currentOrder;
        migrated = true;
      }

      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }

      return merged;
    }
  } catch (error) {
    console.warn("Failed to load user preferences:", error);
  }
  return { ...defaultPreferences };
}

// Save preferences to localStorage
export function savePreferences(preferences: Partial<UserPreferences>): void {
  try {
    const current = loadPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("Failed to save user preferences:", error);
  }
}

// Update a single preference
export function updatePreference<K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void {
  savePreferences({ [key]: value });
}

// Clear all preferences (reset to defaults)
export function clearPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to clear user preferences:", error);
  }
}

// Export specific preference updaters for convenience
export const PreferenceUpdaters = {
  setLibraryView: (view: UserPreferences["libraryView"]) => 
    updatePreference("libraryView", view),
  
  setPlaylistOrder: (order: string[]) => 
    updatePreference("playlistOrder", order),
  
  setPlaylistSort: (key: UserPreferences["playlistSortKey"], dir: UserPreferences["playlistSortDir"]) => 
    savePreferences({ playlistSortKey: key, playlistSortDir: dir }),
  
  setPlaylistGroup: (key: UserPreferences["playlistGroupKey"]) => 
    updatePreference("playlistGroupKey", key),
  
  setPlaylistViewSize: (size: UserPreferences["playlistViewSize"]) => 
    updatePreference("playlistViewSize", size),
  
  setWorkspaceSort: (key: string | null, dir: UserPreferences["workspaceSortDir"]) => 
    savePreferences({ workspaceSortKey: key, workspaceSortDir: dir }),
  
  setWorkspaceGroupBy: (groupBy: UserPreferences["workspaceGroupBy"]) => 
    updatePreference("workspaceGroupBy", groupBy),
  
  setWorkspaceColumns: (order: string[], visible: string[]) => 
    savePreferences({ workspaceColumnOrder: order, workspaceVisibleColumns: visible }),

  setWorkspaceTrackOrder: (playlistId: string | number, order: string[]) =>
    savePreferences({
      workspaceTrackOrders: {
        ...loadPreferences().workspaceTrackOrders,
        [String(playlistId)]: order,
      },
    }),
  
  setSidebarCollapsed: (collapsed: boolean) => 
    updatePreference("sidebarCollapsed", collapsed),
  
  setCurrentPage: (page: UserPreferences["currentPage"]) => 
    updatePreference("currentPage", page),
  
  setApiSection: (section: string) =>
    updatePreference("apiOpenSection", section),

  setEnableDeprecatedApis: (enabled: boolean) =>
    updatePreference("enableDeprecatedApis", enabled),
  
  setSelectedPlaylistId: (id: string | number | null) =>
    updatePreference("selectedPlaylistId", id),
};
