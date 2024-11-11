'use client'

import { useRouter, useSearchParams, usePathname, useParams, useSelectedLayoutSegments, useSelectedLayoutSegment } from 'next/navigation'

export default function Page(){

  console.log('useSearchParams',useSearchParams());
  console.log('usePathname',usePathname());
  console.log('useParams',useParams());
  console.log('useSelectedLayoutSegments',useSelectedLayoutSegments());
  console.log('useSelectedLayoutSegment',useSelectedLayoutSegment());

  return 1
}