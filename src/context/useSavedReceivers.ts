import { useContext } from 'react';
import { SavedReceiversContext } from './savedReceiversDef';
import type { SavedReceiversContextType } from '@/types/receivers';

export function useSavedReceivers(): SavedReceiversContextType {
  const context = useContext(SavedReceiversContext);
  if (!context) {
    throw new Error('useSavedReceivers must be used within a SavedReceiversProvider');
  }
  return context;
}
