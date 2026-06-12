import { X } from 'lucide-react';

export interface ColoredTag {
  label: string;
  color: string;
}

export const TAG_PALETTE = [
  '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#64748B', '#0F172A',
];

export const SUGGESTED_TAGS: ColoredTag[] = [
  { label: 'VIP', color: '#EAB308' },
  { label: 'Repeat', color: '#3B82F6' },
  { label: 'Corporate', color: '#0F172A' },
  { label: 'New', color: '#22C55E' },
  { label: 'On Hold', color: '#64748B' },
];

/** Normalize legacy string[] tags to ColoredTag[] */
export function normalizeTags(tagsV2: any, legacyTags: any): ColoredTag[] {
  if (Array.isArray(tagsV2) && tagsV2.length > 0) {
    return tagsV2
      .filter((t: any) => t && typeof t === 'object' && t.label)
      .map((t: any) => ({ label: String(t.label), color: t.color || '#3B82F6' }));
  }
  if (Array.isArray(legacyTags) && legacyTags.length > 0) {
    return legacyTags
      .filter((t: any) => typeof t === 'string' && t.trim())
      .map((t: string) => ({ label: t, color: '#3B82F6' }));
  }
  return [];
}

interface TagBadgeProps {
  tag: ColoredTag;
  size?: 'xs' | 'sm';
  onRemove?: () => void;
}

export function TagBadge({ tag, size = 'sm', onRemove }: TagBadgeProps) {
  const sizing = size === 'xs'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizing}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        borderColor: `${tag.color}40`,
      }}
    >
      {tag.label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:opacity-70">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
