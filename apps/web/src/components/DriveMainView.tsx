import React, { useState, useEffect } from 'react';
import { ItemManifest } from '@televault/crypto';
import { DriveBreadcrumbRow } from './DriveBreadcrumbRow';
import { DriveSelectionToolbar } from './DriveSelectionToolbar';
import { DriveFilterChips, FilterCategory, FilterModified } from './DriveFilterChips';
import { DriveFolderCard } from './DriveFolderCard';
import { DriveFileCard } from './DriveFileCard';
import { DriveListView, SortField, SortOrder } from './DriveListView';
import { DriveEmptyState } from './DriveEmptyState';
import { NavRoute } from './DriveSidebar';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';
import { UploadQueueItem } from '../upload/uploader';
import { getFileTypeMeta } from '../utils/fileType';

interface DriveMainViewProps {
  currentRoute: NavRoute;
  currentFolder: ItemManifest | null;
  breadcrumbs: ItemManifest[];
  folders: ItemManifest[];
  files: ItemManifest[];
  allItems: ItemManifest[];
  uploadQueue?: UploadQueueItem[];
  onCancelUpload?: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onNavigateFolder: (folderId: string | null) => void;
  onOpenFile: (item: ItemManifest) => void;
  onDownloadItem: (item: ItemManifest) => void;
  onBulkDownloadZip: () => void;
  onRenameItem: (item: ItemManifest) => void;
  onMoveItems: (items: ItemManifest[]) => void;
  onToggleStarItems: (items: ItemManifest[]) => void;
  onTrashItems: (items: ItemManifest[]) => void;
  onRestoreItems: (items: ItemManifest[]) => void;
  onDeleteForeverItems: (items: ItemManifest[]) => void;
  onEmptyTrash: () => void;
  thumbKey: CryptoKey | null;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
  onOpenNewFolderDialog: () => void;
  onTriggerFileUpload: () => void;
  onTriggerFolderUpload: () => void;
  onDropFilesToUpload: (files: FileList | File[]) => void;
  onDropMoveToFolder: (sourceFolderId: string, itemIds: string[]) => void;
  categoryFilter: FilterCategory;
  onCategoryFilterChange: (cat: FilterCategory) => void;
  modifiedFilter: FilterModified;
  onModifiedFilterChange: (mod: FilterModified) => void;
  searchQuery: string;
}

const DriveUploadingCard: React.FC<{
  item: UploadQueueItem;
  onCancel?: () => void;
}> = ({ item, onCancel }) => {
  const meta = getFileTypeMeta(item.file.type, 'file', item.file.name);
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item.file.type.startsWith('image/')) {
      const url = URL.createObjectURL(item.file);
      setLocalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [item.file]);

  return (
    <div className="relative flex flex-col p-3 rounded-2xl bg-[#F0F4F9]/90 dark:bg-[#1E1F20]/90 border border-accent/40 shadow-sm animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* 1. Header */}
      <div className="flex items-center justify-between h-7 mb-2 gap-1.5 min-w-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
          <Icon name={meta.icon} size={18} className={`${meta.color} shrink-0`} />
          <span className="text-[13px] font-medium truncate tracking-tight text-text-primary" title={item.name}>
            {item.name}
          </span>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel upload"
            className="p-1 rounded-full text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors shrink-0"
            title="Cancel upload"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      {/* 2. Main Canvas */}
      <div className="relative w-full aspect-[16/10] bg-[#F8FAFD] dark:bg-[#131314] rounded-xl overflow-hidden flex items-center justify-center border border-black/[0.06] dark:border-white/[0.06]">
        {localUrl ? (
          <img src={localUrl} alt={item.name} className="w-full h-full object-cover filter brightness-[0.7] blur-[1px]" />
        ) : (
          <div className="flex flex-col items-center justify-center p-3 w-full h-full opacity-40">
            <Icon name={meta.icon} size={28} className={meta.color} />
          </div>
        )}

        {/* Floating Glassmorphic Progress Badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[2px] text-white p-2 text-center">
          <div className="w-9 h-9 relative flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="3.5"
                strokeDasharray={87.96}
                strokeDashoffset={87.96 - (87.96 * Math.max(5, item.progress)) / 100}
                className="transition-all duration-150 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-bold tracking-tight">{item.progress}%</span>
          </div>

          <span className="text-[11px] font-medium tracking-tight text-white/95 drop-shadow-sm flex items-center gap-1">
            {item.subStatus === 'encrypting' ? (
              <>
                <Icon name="lock" size={11} className="animate-spin text-blue-300" />
                Encrypting...
              </>
            ) : item.subStatus === 'finalizing' ? (
              'Finalizing...'
            ) : (
              'Uploading...'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export const DriveMainView: React.FC<DriveMainViewProps> = ({
  currentRoute,
  currentFolder,
  breadcrumbs,
  folders,
  files,
  allItems,
  uploadQueue,
  onCancelUpload,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onNavigateFolder,
  onOpenFile,
  onDownloadItem,
  onBulkDownloadZip,
  onRenameItem,
  onMoveItems,
  onToggleStarItems,
  onTrashItems,
  onRestoreItems,
  onDeleteForeverItems,
  onEmptyTrash,
  thumbKey,
  isDetailsOpen,
  onToggleDetails,
  onOpenNewFolderDialog,
  onTriggerFileUpload,
  onTriggerFolderUpload,
  onDropFilesToUpload,
  onDropMoveToFolder,
  categoryFilter,
  onCategoryFilterChange,
  modifiedFilter,
  onModifiedFilterChange,
  searchQuery
}) => {
  const [isGridView, setIsGridView] = useState<boolean>(() => {
    const saved = localStorage.getItem('tv_view_mode');
    return saved ? saved === 'grid' : true;
  });
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem('tv_sort_field') as SortField;
    return saved || 'name';
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem('tv_sort_order') as SortOrder;
    return saved || 'asc';
  });
  const [isDragOverOverlay, setIsDragOverOverlay] = useState(false);

  const handleToggleViewMode = (grid: boolean) => {
    setIsGridView(grid);
    localStorage.setItem('tv_view_mode', grid ? 'grid' : 'list');
  };

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(nextOrder);
      localStorage.setItem('tv_sort_order', nextOrder);
    } else {
      setSortField(field);
      setSortOrder('asc');
      localStorage.setItem('tv_sort_field', field);
      localStorage.setItem('tv_sort_order', 'asc');
    }
  };

  // Sort items according to sortField and sortOrder
  const sortComparator = (a: ItemManifest, b: ItemManifest) => {
    let cmp = 0;
    if (sortField === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortField === 'modified') {
      cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    } else if (sortField === 'size') {
      cmp = a.size - b.size;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  };

  const sortedFolders = [...folders].sort(sortComparator);
  const sortedFiles = [...files].sort(sortComparator);
  const totalItemsCount = folders.length + files.length;
  const activeFolderUploads = (uploadQueue || []).filter(
    (u) =>
      (u.parentId ?? null) === (currentFolder?.id ?? null) &&
      u.status !== 'done' &&
      u.status !== 'skipped'
  );
  const hasContent = totalItemsCount > 0 || activeFolderUploads.length > 0;
  const selectedCount = selectedIds.size;
  const selectedItems = allItems.filter((i) => selectedIds.has(i.id));

  // Determine empty state type
  const getEmptyType = () => {
    if (searchQuery.trim()) return 'search';
    if (currentRoute === 'starred') return 'starred';
    if (currentRoute === 'trash') return 'trash';
    if (currentRoute === 'recent') return 'recent';
    if (currentFolder) return 'folder';
    return 'drive';
  };

  return (
    <div
      className="relative flex-1 flex flex-col h-full bg-white dark:bg-[#131314] rounded-panel overflow-hidden border border-divider/30 shadow-[0_1px_3px_0_rgba(60,64,67,0.08),0_4px_12px_2px_rgba(60,64,67,0.05)]"
      onDragOver={(e) => {
        // Only trigger drop overlay if dragging external OS files
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDragOverOverlay(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverOverlay(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverOverlay(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFilesToUpload(e.dataTransfer.files);
        }
      }}
    >
      {/* 1. Header Toolbar (Selection Mode vs Title Row) */}
      {selectedCount > 0 ? (
        <DriveSelectionToolbar
          selectedCount={selectedCount}
          onClearSelection={onClearSelection}
          onDownload={onBulkDownloadZip}
          onMoveTo={() => onMoveItems(selectedItems)}
          isStarred={selectedItems.length > 0 && selectedItems.every((i) => i.starred || i.favorite)}
          onToggleStar={() => onToggleStarItems(selectedItems)}
          onTrash={() => onTrashItems(selectedItems)}
          onRestore={() => onRestoreItems(selectedItems)}
          onDeleteForever={() => onDeleteForeverItems(selectedItems)}
          isTrashView={currentRoute === 'trash'}
          onRename={selectedCount === 1 ? () => onRenameItem(selectedItems[0]) : undefined}
          onOpenDetails={onToggleDetails}
        />
      ) : currentRoute === 'drive' ? (
        <DriveBreadcrumbRow
          breadcrumbs={breadcrumbs}
          currentFolder={currentFolder}
          onNavigate={onNavigateFolder}
          isGridView={isGridView}
          onToggleViewMode={handleToggleViewMode}
          isDetailsOpen={isDetailsOpen}
          onToggleDetails={onToggleDetails}
          onNewFolder={onOpenNewFolderDialog}
          onUploadFile={onTriggerFileUpload}
          onUploadFolder={onTriggerFolderUpload}
          onDownloadFolder={currentFolder ? onBulkDownloadZip : undefined}
          onRenameFolder={currentFolder ? () => onRenameItem(currentFolder) : undefined}
          onTrashFolder={currentFolder ? () => onTrashItems([currentFolder]) : undefined}
        />
      ) : (
        <div className="flex items-center justify-between h-12 px-4 border-b border-divider/30 shrink-0">
          <h2 className="text-lg font-medium text-text-primary capitalize">
            {searchQuery.trim() ? `Search results for "${searchQuery}"` : currentRoute}
          </h2>
          <div className="flex items-center gap-1">
            <div className="flex items-center p-0.5 rounded-full bg-card border border-divider/30">
              <button
                type="button"
                aria-label="List view"
                onClick={() => handleToggleViewMode(false)}
                className={`p-1.5 rounded-full ${
                  !isGridView ? 'bg-surface text-accent shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon name="list_view" size={18} />
              </button>
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => handleToggleViewMode(true)}
                className={`p-1.5 rounded-full ${
                  isGridView ? 'bg-surface text-accent shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon name="grid_view" size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Filter Chips Row */}
      <DriveFilterChips
        categoryFilter={categoryFilter}
        onCategoryFilterChange={onCategoryFilterChange}
        modifiedFilter={modifiedFilter}
        onModifiedFilterChange={onModifiedFilterChange}
      />

      {/* 3. Trash View Banner */}
      {currentRoute === 'trash' && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-card border-b border-divider/40 text-xs text-text-secondary shrink-0">
          <span>Items in trash will be deleted forever after 30 days.</span>
          {totalItemsCount > 0 && (
            <Button size="sm" variant="text" onClick={onEmptyTrash} className="text-danger">
              Empty trash
            </Button>
          )}
        </div>
      )}

      {/* 4. Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-7">
        {!hasContent ? (
          <DriveEmptyState
            type={getEmptyType()}
            searchQuery={searchQuery}
            onUpload={onTriggerFileUpload}
          />
        ) : isGridView ? (
          <div className="space-y-7">
            {/* Folders Section */}
            {sortedFolders.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary tracking-tight">Folders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {sortedFolders.map((folder) => (
                    <DriveFolderCard
                      key={folder.id}
                      folder={folder}
                      isSelected={selectedIds.has(folder.id)}
                      onSelect={(e) => onToggleSelect(folder.id, e)}
                      onOpen={() => onNavigateFolder(folder.id)}
                      onRename={() => onRenameItem(folder)}
                      onMoveTo={() => onMoveItems([folder])}
                      onTrash={() => onTrashItems([folder])}
                      onToggleStar={() => onToggleStarItems([folder])}
                      onDropMove={(droppedIds) => onDropMoveToFolder(folder.id, droppedIds)}
                      isTrashView={currentRoute === 'trash'}
                      onRestore={() => onRestoreItems([folder])}
                      onDeleteForever={() => onDeleteForeverItems([folder])}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Files Section */}
            {(sortedFiles.length > 0 || activeFolderUploads.length > 0) && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary tracking-tight">Files</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
                  {/* Optimistic In-Grid Uploading Cards */}
                  {activeFolderUploads.map((item) => (
                    <DriveUploadingCard
                      key={item.id}
                      item={item}
                      onCancel={onCancelUpload ? () => onCancelUpload(item.id) : undefined}
                    />
                  ))}
                  {sortedFiles.map((file) => (
                    <DriveFileCard
                      key={file.id}
                      item={file}
                      thumbKey={thumbKey}
                      isSelected={selectedIds.has(file.id)}
                      onSelect={(e) => onToggleSelect(file.id, e)}
                      onOpen={() => onOpenFile(file)}
                      onDownload={() => onDownloadItem(file)}
                      onRename={() => onRenameItem(file)}
                      onMoveTo={() => onMoveItems([file])}
                      onTrash={() => onTrashItems([file])}
                      onToggleStar={() => onToggleStarItems([file])}
                      onOpenDetails={onToggleDetails}
                      isTrashView={currentRoute === 'trash'}
                      onRestore={() => onRestoreItems([file])}
                      onDeleteForever={() => onDeleteForeverItems([file])}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* List View */
          <DriveListView
            items={[...sortedFolders, ...sortedFiles]}
            uploadingItems={activeFolderUploads}
            onCancelUpload={onCancelUpload}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onClearSelection={onClearSelection}
            onOpenItem={(item) => (item.kind === 'folder' ? onNavigateFolder(item.id) : onOpenFile(item))}
            onDownload={onDownloadItem}
            onRename={onRenameItem}
            onToggleStar={(item) => onToggleStarItems([item])}
            onTrash={(item) => onTrashItems([item])}
            isTrashView={currentRoute === 'trash'}
            onRestoreItem={(item) => onRestoreItems([item])}
            onDeleteForeverItem={(item) => onDeleteForeverItems([item])}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        )}
      </div>

      {/* 5. Drag-and-Drop Full-Panel Overlay */}
      {isDragOverOverlay && (
        <div className="absolute inset-3 sm:inset-5 z-40 bg-[#E8F0FE]/95 dark:bg-[#1A2733]/95 border-2 border-dashed border-[#1A73E8] dark:border-[#8AB4F8] rounded-3xl flex flex-col items-center justify-center p-8 backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-surface/90 dark:bg-[#1E1F20]/90 shadow-xl border border-[#1A73E8]/20 flex items-center justify-center text-[#1A73E8] dark:text-[#8AB4F8] mb-4 animate-bounce">
            <Icon name="upload" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-text-primary text-center">
            Drop files to upload to{' '}
            <strong className="text-[#1A73E8] dark:text-[#8AB4F8]">
              {currentFolder ? currentFolder.name : 'My Drive'}
            </strong>
          </h3>
          <p className="text-xs text-text-secondary mt-1.5 text-center">
            Files will be encrypted with client-side AES-256-GCM before reaching Telegram
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A73E8]/10 text-[#1A73E8] dark:text-[#8AB4F8] text-xs font-medium">
            <Icon name="shield" size={14} />
            Zero-knowledge encrypted cloud storage
          </div>
        </div>
      )}
    </div>
  );
};
