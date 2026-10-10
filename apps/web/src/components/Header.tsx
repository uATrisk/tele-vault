import React, { useRef } from 'react';
import {
  Shield,
  Search,
  Upload,
  FolderUp,
  Settings,
  Lock,
  Star,
  Trash2,
  Image,
  Video,
  Download,
  RotateCcw,
  X
} from 'lucide-react';
import { UploadQueueItem } from '../upload/uploader';

export type FilterType = 'all' | 'photos' | 'videos' | 'favorites' | 'trash';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: FilterType;
  onFilterChange: (f: FilterType) => void;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onBulkFavorite: () => void;
  onBulkTrash: () => void;
  onBulkRestore: () => void;
  onBulkDeleteForever: () => void;
  onBulkDownloadZip: () => void;
  uploadQueue: UploadQueueItem[];
  onOpenUploadQueue: () => void;
  onOpenSettings: () => void;
  onLock: () => void;
  onFilesSelected: (files: FileList | File[]) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  selectedIds,
  onClearSelection,
  onBulkFavorite,
  onBulkTrash,
  onBulkRestore,
  onBulkDeleteForever,
  onBulkDownloadZip,
  uploadQueue,
  onOpenUploadQueue,
  onOpenSettings,
  onLock,
  onFilesSelected
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const activeUploadsCount = uploadQueue.filter(
    (q) => q.status === 'uploading' || q.status === 'queued'
  ).length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Brand & Search */}
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">TeleVault</span>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files by name..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Center: Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none py-1">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'photos'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Image className="w-3.5 h-3.5" /> Photos
          </button>
          <button
            onClick={() => onFilterChange('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'videos'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> Videos
          </button>
          <button
            onClick={() => onFilterChange('favorites')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'favorites'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" /> Favorites
          </button>
          <button
            onClick={() => onFilterChange('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeFilter === 'trash'
                ? 'bg-red-700 text-white'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" /> Trash
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileChange}
            multiple
            {...({ webkitdirectory: '', directory: '' } as any)}
            className="hidden"
          />

          {/* Upload Buttons */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Upload Files"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl text-xs transition border border-gray-800 cursor-pointer"
            title="Upload Folder"
          >
            <FolderUp className="w-4 h-4" />
          </button>

          {/* Active upload status pill */}
          {activeUploadsCount > 0 && (
            <button
              onClick={onOpenUploadQueue}
              className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <span>{activeUploadsCount} uploading</span>
            </button>
          )}

          {/* Settings & Lock */}
          <button
            onClick={onOpenSettings}
            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition border border-gray-800 cursor-pointer"
            title="Vault Settings & Diagnostics"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLock}
            className="p-2 bg-gray-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl transition border border-gray-800 cursor-pointer"
            title="Lock Vault Now"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SELECTION BAR (Floats when items are checked) */}
      {selectedIds.size > 0 && (
        <div className="mt-3 py-2 px-4 bg-emerald-950/80 border border-emerald-800/80 rounded-2xl flex items-center justify-between shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <button
              onClick={onClearSelection}
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-emerald-300">
              {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeFilter !== 'trash' ? (
              <>
                <button
                  onClick={onBulkFavorite}
                  className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-amber-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5" /> Favorite
                </button>
                <button
                  onClick={onBulkDownloadZip}
                  className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download ZIP
                </button>
                <button
                  onClick={onBulkTrash}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Trash
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onBulkRestore}
                  className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
                <button
                  onClick={onBulkDeleteForever}
                  className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
