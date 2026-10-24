'use client';

import { useParams } from 'next/navigation';
import { Estimator } from '@/components/Estimator';

export default function EstimatePage() {
  const { id } = useParams<{ id: string }>();
  return <Estimator projectId={id} />;
}
