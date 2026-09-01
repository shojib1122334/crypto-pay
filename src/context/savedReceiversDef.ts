import { createContext } from 'react';
import type { SavedReceiversContextType } from '@/types/receivers';

export const SavedReceiversContext = createContext<SavedReceiversContextType | undefined>(undefined);
