'use client';

import { DishTag } from '@/types';
import { DISH_TAGS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useTranslateData } from '@/hooks/useTranslateData';

interface TagFilterProps {
  selectedTags: DishTag[];
  onTagsChange: (tags: DishTag[]) => void;
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const { translateTag } = useTranslateData();

  const toggleTag = (tag: DishTag) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <div className='flex flex-wrap gap-2'>
      {DISH_TAGS.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        return (
          <Button
            key={tag}
            type='button'
            variant={isSelected ? 'default' : 'outline'}
            size='sm'
            onClick={() => toggleTag(tag)}
            className={`text-sm transition-all ${
              isSelected
                ? 'bg-primary text-primary-foreground shadow-sm font-medium border border-primary'
                : 'bg-transparent border-0 text-muted-foreground hover:bg-accent/50'
            }`}>
            {translateTag(tag)}
          </Button>
        );
      })}
    </div>
  );
}
