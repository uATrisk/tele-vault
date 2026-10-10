import { IconName } from '../components/ui/Icon';

export type FileCategory =
  | 'folder'
  | 'image'
  | 'video'
  | 'pdf'
  | 'doc'
  | 'audio'
  | 'archive'
  | 'generic';

export interface FileTypeMeta {
  category: FileCategory;
  icon: IconName;
  color: string;
  label: string;
  previewable: boolean;
}

export function getFileTypeMeta(mime: string, kind?: string, name?: string): FileTypeMeta {
  if (kind === 'folder') {
    return {
      category: 'folder',
      icon: 'folder',
      color: 'text-[#5F6368] dark:text-[#9AA0A6]',
      label: 'Folder',
      previewable: false
    };
  }

  const lowerMime = (mime || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  if (lowerMime.startsWith('image/')) {
    return {
      category: 'image',
      icon: 'image',
      color: 'text-[#D93025] dark:text-[#F28B82]',
      label: 'Image',
      previewable: true
    };
  }

  if (lowerMime.startsWith('video/')) {
    return {
      category: 'video',
      icon: 'video',
      color: 'text-[#D93025] dark:text-[#F28B82]',
      label: 'Video',
      previewable: true
    };
  }

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return {
      category: 'pdf',
      icon: 'pdf',
      color: 'text-[#D93025] dark:text-[#F28B82]',
      label: 'PDF',
      previewable: false
    };
  }

  if (lowerMime.startsWith('audio/')) {
    return {
      category: 'audio',
      icon: 'audio',
      color: 'text-[#5F6368] dark:text-[#9AA0A6]',
      label: 'Audio',
      previewable: false
    };
  }

  if (
    lowerMime.includes('zip') ||
    lowerMime.includes('tar') ||
    lowerMime.includes('compressed') ||
    lowerName.endsWith('.zip') ||
    lowerName.endsWith('.tar') ||
    lowerName.endsWith('.gz')
  ) {
    return {
      category: 'archive',
      icon: 'archive',
      color: 'text-[#5F6368] dark:text-[#9AA0A6]',
      label: 'Archive',
      previewable: false
    };
  }

  if (
    lowerMime.includes('text/') ||
    lowerMime.includes('word') ||
    lowerMime.includes('document') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md')
  ) {
    return {
      category: 'doc',
      icon: 'doc',
      color: 'text-[#4285F4] dark:text-[#8AB4F8]',
      label: 'Document',
      previewable: false
    };
  }

  return {
    category: 'generic',
    icon: 'file',
    color: 'text-[#5F6368] dark:text-[#9AA0A6]',
    label: 'File',
    previewable: false
  };
}
