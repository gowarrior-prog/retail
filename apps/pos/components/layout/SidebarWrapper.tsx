'use client';

import { useEffect } from 'react';
import { discoverLocalServer } from '@/lib/api';

export default function SidebarWrapper() {
  useEffect(() => {
    discoverLocalServer().catch(() => {});
  }, []);

  return null;
}
