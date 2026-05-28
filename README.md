
  # Spotify

  This is a local code bundle for a Spotify manager UI. The original design can be found at https://www.figma.com/design/qKGu9nZLMn1BHdAW3Ojisp/Spotify.

  ## Requirements

  - Node.js (recommended >= 18)
  - A package manager: `pnpm` is preferred for this workspace (a `pnpm-workspace.yaml` is included), but `npm` or `yarn` also work.

  ## Running the app

  Install dependencies:

  ```bash
  pnpm install
  # or
  npm install
  ```

  Start the dev server:

  ```bash
  pnpm run dev
  # or
  npm run dev
  ```

  Open the app in your browser (usually at `http://localhost:5173` or `http://127.0.0.1:5173`).

  ## Quick Dev Tip

  While the app is running you can programmatically navigate to the compiled "All Songs" virtual playlist by opening your browser devtools console and running:

  ```js
  window.goToAllSongs()
  ```

  This helper is attached to `window` during development to make it faster to jump to the combined "All Songs" view.

  ## Notes

  - The project contains several virtual/compiled playlists (e.g. `liked`, `all_my`, `all_followed`, `all_songs`). Use the UI or the dev helper above to navigate between them.
  - If you need a keyboard shortcut or UI button to jump to a view instead of using the console, open an issue or request and I can add it.
  