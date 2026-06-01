import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Trash2, Music2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Playlist } from "../../data";
import { isUrlOrData } from "../../utils/spotifyHelpers";
import {
  unfollowPlaylist,
  createPlaylist,
  uploadPlaylistCoverImage,
  addTracksToPlaylist,
  updatePlaylistDetails,
} from "../../utils/spotifyApi";

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "edit" | "create";
  playlist?: Playlist;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  currentUserId?: string;
  trackUrisToAdd?: string[];
}

export default function EditPlaylistModal({
  isOpen,
  onClose,
  mode,
  playlist,
  setPlaylists,
  currentUserId,
  trackUrisToAdd = [],
}: EditPlaylistModalProps) {
  const basePlaylist: Playlist = playlist ?? {
    id: "new",
    name: "",
    desc: "",
    tracks: 0,
    cover: "bg-gradient-to-br from-slate-700 to-zinc-900",
    owner: "yours",
  };

  const [name, setName] = useState(basePlaylist.name);
  const [desc, setDesc] = useState(basePlaylist.desc);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when playlist changes or modal opens
  useEffect(() => {
    setName(mode === "create" ? "" : basePlaylist.name);
    setDesc(mode === "create" ? "" : basePlaylist.desc);
    setImagePreview(null);
  }, [basePlaylist.name, basePlaylist.desc, isOpen, mode]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      toast.error("Spotify only supports JPEG images for playlist covers.");
      return;
    }

    if (file.size > 256 * 1024) {
      toast.error("Image size must be less than 256 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePlaylist = async () => {
    if (!basePlaylist.id || basePlaylist.id === "new") return;
    const confirmed = window.confirm(`Are you sure you want to delete "${basePlaylist.name}"? This will remove it from your library.`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await unfollowPlaylist(basePlaylist.id);
      setPlaylists(prev => prev.filter(p => String(p.id) !== String(basePlaylist.id)));
      toast.success("Playlist deleted successfully!");
      onClose();
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error("Failed to delete playlist.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Playlist name cannot be empty.");
      return;
    }

    const trimmedDesc = desc.trim();

    setIsSaving(true);
    try {
      if (mode === "create") {
        const created = await createPlaylist({
          name: name.trim(),
          description: trimmedDesc,
          public: false,
          collaborative: false,
        });

        if (imagePreview) {
          const base64Data = imagePreview.split(",")[1];
          await uploadPlaylistCoverImage(created.id, base64Data);
        }

        if (trackUrisToAdd.length > 0) {
          await addTracksToPlaylist(created.id, trackUrisToAdd);
        }

        const createdPlaylist: Playlist = {
          id: created.id,
          name: created.name || name.trim(),
          desc: trimmedDesc,
          tracks: trackUrisToAdd.length,
          cover: imagePreview || created.images?.[0]?.url || basePlaylist.cover,
          owner: "yours",
          dateCreated: new Date().toISOString(),
        };

        // Cache the creation date in localStorage
        try {
          const stored = localStorage.getItem("spotify-playlist-creation-dates");
          const dateMap = stored ? JSON.parse(stored) : {};
          dateMap[String(created.id)] = createdPlaylist.dateCreated;
          localStorage.setItem("spotify-playlist-creation-dates", JSON.stringify(dateMap));
        } catch (e) {
          console.warn("Failed to cache playlist creation date", e);
        }

        setPlaylists(prev => [createdPlaylist, ...prev.filter(p => String(p.id) !== String(createdPlaylist.id))]);
        toast.success("Playlist created successfully!");
      } else {
        // 1. Update playlist details
        await updatePlaylistDetails(basePlaylist.id, {
          name: name.trim(),
          description: trimmedDesc,
        });

        // 2. Upload cover image if changed
        let newCover = basePlaylist.cover;
        if (imagePreview) {
          const base64Data = imagePreview.split(",")[1];
          await uploadPlaylistCoverImage(basePlaylist.id, base64Data);
          newCover = imagePreview;
        }

        // 3. Update parent state
        setPlaylists((prev) =>
          prev.map((p) =>
            String(p.id) === String(basePlaylist.id)
              ? { ...p, name: name.trim(), desc: trimmedDesc, cover: newCover }
              : p
          )
        );

        toast.success("Playlist updated successfully!");
      }
      onClose();
    } catch (error) {
      console.error(mode === "create" ? "Error creating playlist:" : "Error updating playlist details:", error);
      toast.error(mode === "create" ? "Failed to create playlist." : "Failed to update playlist details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* Modal Card */}
      <div
        className="bg-[#282828] border border-[#383838] w-full max-w-[520px] rounded-lg shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#383838]">
          <h2 className="text-[18px] font-bold">{mode === "create" ? "Create playlist" : "Edit details"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Image Section */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 bg-[#181818] border border-[#383838] rounded-md overflow-hidden relative group cursor-pointer flex items-center justify-center shadow-lg"
              >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : isUrlOrData(basePlaylist.cover) ? (
                  <img src={basePlaylist.cover} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className={`w-full h-full ${basePlaylist.cover} flex items-center justify-center`}>
                    <Music2 size={40} className="text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-xs font-semibold text-white">
                  <Camera size={20} />
                  <span>Choose photo</span>
                </div>
              </div>
              <input
                type="file"
                id="edit-playlist-cover-input"
                name="playlistCover"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg,image/jpg"
                className="hidden"
              />
              <span className="text-[10px] text-[#B3B3B3] text-center max-w-[150px]">
                JPEG up to 256KB
              </span>
            </div>

            {/* Inputs Section */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-playlist-name" className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
                  Name
                </label>
                <input
                  type="text"
                  id="edit-playlist-name"
                  name="playlistName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Add a name"
                  required
                  className="w-full bg-[#3e3e3e] border border-transparent focus:border-[#535353] focus:bg-[#4a4a4a] text-sm rounded px-3 py-2 outline-none text-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-playlist-desc" className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
                  Description
                </label>
                <textarea
                  id="edit-playlist-desc"
                  name="playlistDesc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Add an optional description"
                  rows={4}
                  className="w-full bg-[#3e3e3e] border border-transparent focus:border-[#535353] focus:bg-[#4a4a4a] text-sm rounded px-3 py-2 outline-none text-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#B3B3B3] mt-2 leading-normal">
            By proceeding, you agree to give Spotify access to the image you upload. Please make sure you have the right to upload the image.
          </p>

          {/* Footer Actions */}
          <div className="flex justify-end items-center gap-3 mt-4 border-t border-[#383838] pt-4">
            {mode === "edit" && (
              <button
                type="button"
                onClick={handleDeletePlaylist}
                disabled={isSaving}
                className="mr-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete Playlist</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 rounded-full text-sm font-bold text-white hover:scale-105 transition-transform cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-white hover:bg-neutral-100 text-black px-8 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {mode === "create" ? "Creating..." : "Saving..."}
                </>
              ) : (
                mode === "create" ? "Create" : "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
