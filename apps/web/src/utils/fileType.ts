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
      color: 'text-[#444746] dark:text-[#C4C7C5]',
      label: 'Folder',
      previewable: false
    };
  }

  const lowerMime = (mime || '').toLowerCase();
  const lowerName = (name || '').toLowerCase();

  const isImageExt = /\.(png|jpe?g|gif|webp|bmp|svg|heic|ico|tiff)$/i.test(lowerName);
  if (lowerMime.startsWith('image/') || isImageExt) {
    return {
      category: 'image',
      icon: 'image',
      color: 'text-[#EA4335] dark:text-[#F28B82]',
      label: 'Image',
      previewable: true
    };
  }

  const isVideoExt = /\.(mp4|webm|mkv|mov|avi|wmv|flv|m4v)$/i.test(lowerName);
  if (lowerMime.startsWith('video/') || isVideoExt) {
    return {
      category: 'video',
      icon: 'video',
      color: 'text-[#EA4335] dark:text-[#F28B82]',
      label: 'Video',
      previewable: true
    };
  }

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return {
      category: 'pdf',
      icon: 'pdf',
      color: 'text-[#EA4335] dark:text-[#F28B82]',
      label: 'PDF',
      previewable: false
    };
  }

  const isAudioExt = /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/i.test(lowerName);
  if (lowerMime.startsWith('audio/') || isAudioExt) {
    return {
      category: 'audio',
      icon: 'audio',
      color: 'text-[#9334E6] dark:text-[#D7AEFB]',
      label: 'Audio',
      previewable: false
    };
  }

  if (
    lowerMime.includes('zip') ||
    lowerMime.includes('tar') ||
    lowerMime.includes('compressed') ||
    /\.(zip|tar|gz|rar|7z|bz2|xz)$/i.test(lowerName)
  ) {
    return {
      category: 'archive',
      icon: 'archive',
      color: 'text-[#F29900] dark:text-[#FDD663]',
      label: 'Archive',
      previewable: false
    };
  }

  if (
    lowerMime.includes('spreadsheet') ||
    lowerMime.includes('excel') ||
    /\.(xls|xlsx|csv|tsv)$/i.test(lowerName)
  ) {
    return {
      category: 'doc',
      icon: 'doc',
      color: 'text-[#0F9D58] dark:text-[#81C995]',
      label: 'Spreadsheet',
      previewable: false
    };
  }

  if (
    lowerMime.includes('text/') ||
    lowerMime.includes('word') ||
    lowerMime.includes('document') ||
    lowerMime.includes('presentation') ||
    lowerMime.includes('powerpoint') ||
    /\.(txt|md|doc|docx|ppt|pptx|rtf|json|xml|html)$/i.test(lowerName)
  ) {
    return {
      category: 'doc',
      icon: 'doc',
      color: 'text-[#1A73E8] dark:text-[#8AB4F8]',
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
