import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColoredTag, TAG_PALETTE, SUGGESTED_TAGS, TagBadge } from './TagBadge';

interface TagInputProps {
  tags: ColoredTag[];
  onChange: (tags: ColoredTag[]) => void;
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('');
  const [color, setColor] = useState(TAG_PALETTE[4]); // default blue
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    }
    if (paletteOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [paletteOpen]);

  function add(label: string, c: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (tags.some(t => t.label.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...tags, { label: trimmed, color: c }]);
  }

  function remove(label: string) {
    onChange(tags.filter(t => t.label !== label));
  }

  function addCustom() {
    add(input, color);
    setInput('');
  }

  const unusedSuggestions = SUGGESTED_TAGS.filter(
    s => !tags.some(t => t.label.toLowerCase() === s.label.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <TagBadge key={tag.label} tag={tag} onRemove={() => remove(tag.label)} />
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center">
        <div className="relative" ref={paletteRef}>
          <button
            type="button"
            onClick={() => setPaletteOpen(o => !o)}
            className="h-8 w-8 rounded-full border-2 border-border shrink-0"
            style={{ backgroundColor: color }}
            aria-label="Pilih warna tag"
          />
          {paletteOpen && (
            <div className="absolute z-30 top-10 left-0 bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-3 gap-1.5 w-32">
              {TAG_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setPaletteOpen(false); }}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Tag baru + Enter"
          className="h-8 text-sm flex-1"
        />
        <Button size="sm" type="button" variant="outline" onClick={addCustom} className="h-8 px-2">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {tags.length === 0 && unusedSuggestions.length > 0 && (
        <div className="pt-1">
          <p className="text-[11px] text-muted-foreground mb-1.5">Cadangan:</p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => add(s.label, s.color)}
                className="hover:opacity-80"
              >
                <TagBadge tag={s} size="xs" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
