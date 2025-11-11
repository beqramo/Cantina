'use client';

import { useState, useEffect } from 'react';
import {
  getPendingDishRequests,
  approveDishRequest,
  rejectDishRequest,
} from '@/lib/firestore';
import { DishRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function ApprovalList() {
  const [requests, setRequests] = useState<DishRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('Admin');
  const tSearch = useTranslations('Search');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const pending = await getPendingDishRequests();
      setRequests(pending);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveDishRequest(id);
      loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Are you sure you want to reject this request?')) {
      try {
        await rejectDishRequest(id);
        loadRequests();
      } catch (error) {
        console.error('Error rejecting request:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className='h-32' />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className='text-center py-8 text-muted-foreground'>
        {tSearch('noResults')}
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {requests.map((request) => (
        <Card key={request.id}>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle>{request.name}</CardTitle>
                {request.nickname && (
                  <p className='text-sm text-muted-foreground mt-1'>
                    {t('requestedBy') || 'Requested by'}: {request.nickname}
                  </p>
                )}
                {request.category && (
                  <Badge variant='secondary' className='mt-2'>
                    {request.category}
                  </Badge>
                )}
                {request.tags && request.tags.length > 0 && (
                  <div className='flex flex-wrap gap-1 mt-2'>
                    {request.tags.map((tag) => (
                      <Badge key={tag} variant='outline' className='text-xs'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Badge variant='outline'>{request.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {request.imageUrl && (
              <div className='relative w-full h-48 mb-4 rounded-md overflow-hidden'>
                <Image
                  src={request.imageUrl}
                  alt={request.name}
                  fill
                  className='object-cover'
                />
              </div>
            )}
            <div className='flex gap-2'>
              <Button
                onClick={() => handleApprove(request.id)}
                className='flex-1'>
                <Check className='h-4 w-4 mr-2' />
                {t('approve')}
              </Button>
              <Button
                variant='destructive'
                onClick={() => handleReject(request.id)}
                className='flex-1'>
                <X className='h-4 w-4 mr-2' />
                {t('reject')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
