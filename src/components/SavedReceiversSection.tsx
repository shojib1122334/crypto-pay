import React, { useState } from 'react';
import {
  Users,
  Plus,
  Star,
  Check,
  Edit2,
  Trash2,
  Copy,
  Send,
  QrCode,
  ShieldCheck,
  AlertCircle,
  X,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useSavedReceivers } from '@/context/useSavedReceivers';
import type { SavedReceiver } from '@/types/receivers';

export const SavedReceiversSection: React.FC = () => {
  const {
    receivers,
    activeReceiverId,
    activeReceiver,
    addReceiver,
    updateReceiver,
    deleteReceiver,
    toggleFavorite,
    setActiveReceiverId,
    maxLimit,
  } = useSavedReceivers();

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReceiverId, setEditingReceiverId] = useState<string | null>(null);
  const [formAddress, setFormAddress] = useState('');
  const [formTelegram, setFormTelegram] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion Modal State (Custom In-App Modal, NO window.confirm)
  const [receiverToDelete, setReceiverToDelete] = useState<SavedReceiver | null>(null);

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Handle open Add Form
  const handleOpenAddForm = () => {
    if (receivers.length >= maxLimit) {
      setFormError(`Limit reached: ${maxLimit}/${maxLimit} Receivers Saved. Delete one to add another.`);
      return;
    }
    setEditingReceiverId(null);
    setFormAddress('');
    setFormTelegram('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle open Edit Form
  const handleOpenEditForm = (receiver: SavedReceiver) => {
    setEditingReceiverId(receiver.id);
    setFormAddress(receiver.address);
    setFormTelegram(receiver.telegramUsername);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingReceiverId) {
      const result = updateReceiver(editingReceiverId, formAddress, formTelegram);
      if (!result.success) {
        setFormError(result.error || 'Failed to update receiver.');
        return;
      }
    } else {
      const result = addReceiver(formAddress, formTelegram);
      if (!result.success) {
        setFormError(result.error || 'Failed to save receiver.');
        return;
      }
    }

    // Close form on success
    setIsFormOpen(false);
    setEditingReceiverId(null);
    setFormAddress('');
    setFormTelegram('');
    setFormError(null);
  };

  // Handle Copy Address
  const handleCopy = (address: string, id: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Confirm Delete
  const handleConfirmDelete = () => {
    if (receiverToDelete) {
      deleteReceiver(receiverToDelete.id);
      setReceiverToDelete(null);
    }
  };

  // Filter and sort receivers (Favorites first, then created date)
  const filteredReceivers = receivers
    .filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.address.toLowerCase().includes(q) ||
        r.telegramUsername.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.isFavorite === b.isFavorite) {
        return b.createdAt - a.createdAt;
      }
      return a.isFavorite ? -1 : 1;
    });

  const isLimitReached = receivers.length >= maxLimit;

  return (
    <div
      id="saved-receivers-management"
      className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6"
    >
      {/* 1. Header & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-950/60 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6] flex-shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-white">Saved Receivers</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                  isLimitReached
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                }`}
              >
                {receivers.length}/{maxLimit} Receivers Saved
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select an Active Receiver to auto-populate Send Crypto & Receive QR
            </p>
          </div>
        </div>

        {/* Add Receiver Button */}
        <div>
          <button
            type="button"
            onClick={handleOpenAddForm}
            disabled={isLimitReached}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition cursor-pointer ${
              isLimitReached
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                : 'bg-[#3B82F6] hover:bg-blue-600 active:scale-95 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Receiver</span>
          </button>
        </div>
      </div>

      {/* 2. Active Receiver Banner */}
      <div className="bg-zinc-900/80 border border-[#00E676]/40 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(0,230,118,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                Active Receiver
              </span>
              <span className="text-xs text-zinc-400">
                Auto-populated in Send & Receive QR
              </span>
            </div>

            {activeReceiver ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm font-bold text-white">
                  {activeReceiver.telegramUsername}
                </span>
                <span className="text-xs font-mono text-[#00E676] bg-black/40 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {activeReceiver.address}
                </span>
              </div>
            ) : (
              <p className="text-sm font-medium text-amber-400 pt-1">
                No active receiver selected. Click &quot;Select&quot; on any receiver below.
              </p>
            )}
          </div>

          {activeReceiver && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeReceiver.address, 'active')}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedId === 'active' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00E676]" />
                    <span className="text-[#00E676]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Address</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveReceiverId(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                title="Deselect active receiver"
              >
                Deselect
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                <Send className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span>Ready for Pay System</span>
                <QrCode className="w-3.5 h-3.5 text-[#00E676]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Add / Edit Receiver Form Modal / Inline Box */}
      {isFormOpen && (
        <div className="bg-zinc-900 border border-[#3B82F6]/60 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {editingReceiverId ? (
                <>
                  <Edit2 className="w-4 h-4 text-[#3B82F6]" />
                  <span>Edit Saved Receiver</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#3B82F6]" />
                  <span>Add New Receiver</span>
                </>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Field 1: Wallet Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">
                Wallet Address <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value.trim())}
                placeholder="0x... Enter EVM receiver address"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] shadow-inner"
              />
              <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00E676]" />
                Must be a valid 42-character 0x EVM hex address.
              </p>
            </div>

            {/* Field 2: Telegram Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-300">
                Telegram Username <span className="text-[#EF4444]">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formTelegram}
                  onChange={(e) => setFormTelegram(e.target.value)}
                  placeholder="@telegram_username"
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-sans text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] shadow-inner"
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                Telegram contact or handle for this receiver account.
              </p>
            </div>

            {/* Error Display */}
            {formError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-[#EF4444]/60 text-[#EF4444] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {editingReceiverId ? 'Update Receiver' : 'Save Receiver'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Search Filter (if multiple receivers exist) */}
      {receivers.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Telegram username or 0x address..."
            className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#3B82F6]"
          />
        </div>
      )}

      {/* 5. Receiver List */}
      <div className="space-y-3">
        {filteredReceivers.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-850">
            <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">
              {searchQuery ? 'No receivers match your search query.' : 'No saved receivers yet.'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Click &quot;+ Add New Receiver&quot; to save a merchant payout address.
            </p>
          </div>
        ) : (
          filteredReceivers.map((receiver) => {
            const isActive = activeReceiverId === receiver.id;

            return (
              <div
                key={receiver.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-zinc-900 border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.12)] ring-1 ring-[#00E676]/40'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/90'
                }`}
              >
                {/* Left: Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Favorite Star */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(receiver.id)}
                      className={`p-1 rounded-lg transition cursor-pointer ${
                        receiver.isFavorite
                          ? 'text-[#FACC15] hover:text-amber-300'
                          : 'text-zinc-600 hover:text-zinc-400'
                      }`}
                      title={receiver.isFavorite ? 'Unfavorite' : 'Mark as Favorite'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          receiver.isFavorite ? 'fill-[#FACC15]' : 'fill-none'
                        }`}
                      />
                    </button>

                    {/* Telegram Username */}
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="text-[#3B82F6]">Telegram:</span>
                      <span>{receiver.telegramUsername}</span>
                    </span>

                    {/* Active Status Badge */}
                    {isActive && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                        Active Receiver
                      </span>
                    )}

                    {receiver.isFavorite && !isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/40 text-[#FACC15] border border-[#FACC15]/30">
                        ★ Favorite
                      </span>
                    )}
                  </div>

                  {/* Wallet Address */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs font-mono text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 truncate max-w-full sm:max-w-md">
                      {receiver.address}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(receiver.address, receiver.id)}
                      className="p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedId === receiver.id ? (
                        <Check className="w-3.5 h-3.5 text-[#00E676]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <a
                      href={`https://polygonscan.com/address/${receiver.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-zinc-400 hover:text-[#3B82F6] transition"
                      title="View on Polygonscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Right: Actions (Select / Deselect, Edit, Delete) */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  {/* Select / Toggle Active Button */}
                  <button
                    type="button"
                    onClick={() => setActiveReceiverId(isActive ? null : receiver.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-[#00E676] text-zinc-950 shadow-[0_0_12px_rgba(0,230,118,0.25)] hover:bg-[#00c864]'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    }`}
                    title={isActive ? 'Click to deselect' : 'Click to set as Active Receiver'}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Active (Selected)</span>
                      </>
                    ) : (
                      <span>Select</span>
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditForm(receiver)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer"
                    title="Edit Receiver"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button (Opens React In-App Confirmation Modal) */}
                  <button
                    type="button"
                    onClick={() => setReceiverToDelete(receiver)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-red-950/70 text-zinc-400 hover:text-[#EF4444] border border-zinc-700 hover:border-[#EF4444]/40 transition cursor-pointer"
                    title="Delete Receiver"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Custom In-App Delete Confirmation Modal (Bypasses sandboxed iframe alert blocks) */}
      {receiverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/70 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Receiver</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <p className="text-xs text-zinc-400">
                Telegram: <span className="text-white font-bold">{receiverToDelete.telegramUsername}</span>
              </p>
              <p className="text-xs font-mono text-zinc-300 break-all">
                {receiverToDelete.address}
              </p>
            </div>

            <p className="text-xs text-zinc-400">
              Are you sure you want to permanently delete this receiver? If this was the active receiver, the active selection will also be cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceiverToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-600 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SavedReceiversSection;
