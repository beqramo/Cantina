'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { Dish } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

export function useVote() {
  const [isVoting, setIsVoting] = useState(false);

  const vote = async (
    dish: Dish,
    voteType: 'up' | 'down',
  ): Promise<boolean> => {
    if (typeof window === 'undefined' || !db) return false;

    const voteKey = `${STORAGE_KEYS.VOTE_PREFIX}${dish.id}`;
    const previousVote = localStorage.getItem(voteKey) as 'up' | 'down' | null;

    setIsVoting(true);
    try {
      const dishRef = doc(db, 'dishes', dish.id);

      await runTransaction(db, async (transaction) => {
        const dishDoc = await transaction.get(dishRef);
        if (!dishDoc.exists()) {
          throw new Error('Dish does not exist!');
        }

        // If user is changing their vote
        if (previousVote === 'up' && voteType === 'down') {
          // Remove up vote, add down vote
          transaction.update(dishRef, {
            thumbsUp: increment(-1),
            thumbsDown: increment(1),
          });
        } else if (previousVote === 'down' && voteType === 'up') {
          // Remove down vote, add up vote
          transaction.update(dishRef, {
            thumbsUp: increment(1),
            thumbsDown: increment(-1),
          });
        } else if (previousVote === voteType) {
          // User clicked the same button - remove vote
          if (voteType === 'up') {
            transaction.update(dishRef, {
              thumbsUp: increment(-1),
            });
          } else {
            transaction.update(dishRef, {
              thumbsDown: increment(-1),
            });
          }
        } else {
          // New vote
          if (voteType === 'up') {
            transaction.update(dishRef, {
              thumbsUp: increment(1),
            });
          } else {
            transaction.update(dishRef, {
              thumbsDown: increment(1),
            });
          }
        }
      });

      // Update localStorage
      if (previousVote === voteType) {
        // Vote was removed - clear localStorage
        localStorage.removeItem(voteKey);
      } else {
        // New vote or changed vote - update localStorage
        localStorage.setItem(voteKey, voteType);
      }
      setIsVoting(false);
      return true;
    } catch (error) {
      console.error('Error voting:', error);
      setIsVoting(false);
      return false;
    }
  };

  const hasVoted = (dishId: string): boolean => {
    if (typeof window === 'undefined') return false;
    const voteKey = `${STORAGE_KEYS.VOTE_PREFIX}${dishId}`;
    return !!localStorage.getItem(voteKey);
  };

  return { vote, hasVoted, isVoting };
}
