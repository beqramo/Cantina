'use client';

import { useState } from 'react';
import { Dish } from '@/types';
import { useVote } from '@/hooks/useVote';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { analytics } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';

interface VoteButtonsProps {
  dish: Dish;
}

export function VoteButtons({ dish }: VoteButtonsProps) {
  const { vote, hasVoted, isVoting } = useVote();
  const [localThumbsUp, setLocalThumbsUp] = useState(dish.thumbsUp);
  const [localThumbsDown, setLocalThumbsDown] = useState(dish.thumbsDown);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(() => {
    if (typeof window === 'undefined') return null;
    const voteKey = `cantina_vote_${dish.id}`;
    const vote = localStorage.getItem(voteKey);
    return vote === 'up' || vote === 'down' ? vote : null;
  });

  const handleVote = async (voteType: 'up' | 'down') => {
    const previousVote = userVote;
    const success = await vote(dish, voteType);

    if (success) {
      // Log the vote event to analytics
      if (analytics) {
        const action =
          previousVote === voteType
            ? 'remove_vote'
            : previousVote
            ? 'change_vote'
            : 'new_vote';
        logEvent(analytics, 'vote_dish', {
          dish_id: dish.id,
          dish_name: dish.name,
          vote_type: voteType,
          vote_action: action,
        });
      }

      // Handle vote changes
      if (previousVote === voteType) {
        // User clicked the same button - remove vote
        setUserVote(null);
        if (voteType === 'up') {
          setLocalThumbsUp((prev) => Math.max(0, prev - 1));
        } else {
          setLocalThumbsDown((prev) => Math.max(0, prev - 1));
        }
      } else if (previousVote === 'up' && voteType === 'down') {
        // Switching from up to down
        setUserVote('down');
        setLocalThumbsUp((prev) => Math.max(0, prev - 1));
        setLocalThumbsDown((prev) => prev + 1);
      } else if (previousVote === 'down' && voteType === 'up') {
        // Switching from down to up
        setUserVote('up');
        setLocalThumbsUp((prev) => prev + 1);
        setLocalThumbsDown((prev) => Math.max(0, prev - 1));
      } else {
        // New vote
        setUserVote(voteType);
        if (voteType === 'up') {
          setLocalThumbsUp((prev) => prev + 1);
        } else {
          setLocalThumbsDown((prev) => prev + 1);
        }
      }
    }
  };

  return (
    <div className='flex items-center gap-4 mt-4'>
      <Button
        variant={userVote === 'up' ? 'default' : 'outline'}
        size='sm'
        onClick={() => handleVote('up')}
        disabled={isVoting}>
        <ThumbsUp className='h-4 w-4 mr-1' />
        {localThumbsUp}
      </Button>
      <Button
        variant={userVote === 'down' ? 'destructive' : 'outline'}
        size='sm'
        onClick={() => handleVote('down')}
        disabled={isVoting}>
        <ThumbsDown className='h-4 w-4 mr-1' />
        {localThumbsDown}
      </Button>
    </div>
  );
}
