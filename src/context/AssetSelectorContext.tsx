/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AssetSelectorContextType {
  isAssetSelectorOpen: boolean;
  setIsAssetSelectorOpen: (open: boolean) => void;
}

const AssetSelectorContext = createContext<AssetSelectorContextType | undefined>(undefined);

export const AssetSelectorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);

  return (
    <AssetSelectorContext.Provider value={{ isAssetSelectorOpen, setIsAssetSelectorOpen }}>
      {children}
    </AssetSelectorContext.Provider>
  );
};

export const useAssetSelector = (): AssetSelectorContextType => {
  const context = useContext(AssetSelectorContext);
  if (!context) {
    throw new Error('useAssetSelector must be used within an AssetSelectorProvider');
  }
  return context;
};
