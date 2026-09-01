export interface SavedReceiver {
  id: string;
  address: string;
  telegramUsername: string;
  isFavorite: boolean;
  createdAt: number;
}

export interface SavedReceiversContextType {
  receivers: SavedReceiver[];
  activeReceiverId: string | null;
  activeReceiver: SavedReceiver | null;
  addReceiver: (address: string, telegramUsername: string) => { success: boolean; error?: string };
  updateReceiver: (id: string, address: string, telegramUsername: string) => { success: boolean; error?: string };
  deleteReceiver: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setActiveReceiverId: (id: string | null) => void;
  maxLimit: number;
}
