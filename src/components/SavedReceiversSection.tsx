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
      className="web3-glass-card rounded-2xl sm:rounded-3xl border border-white/80 p-3.5 sm:p-7 shadow-xl shadow-purple-500/5 space-y-5 sm:space-y-6 relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500" />

      {/* 1. Header & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-black text-[#101B5C]">Saved Receivers</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold uppercase border ${
                  isLimitReached
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}
              >
                {receivers.length}/{maxLimit} Receivers Saved
              </span>
            </div>
            <p className="text-xs text-[#5367A5] font-medium mt-0.5">
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
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-500 hover:via-purple-500 hover:to-pink-400 active:scale-95 text-white shadow-purple-500/20 border border-white/20'
            }`}
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Add New Receiver</span>
          </button>
        </div>
      </div>

      {/* 2. Active Receiver Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-300 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                Active Receiver
              </span>
              <span className="text-xs text-[#5367A5] font-medium">
                Auto-populated in Send & Receive QR
              </span>
            </div>

            {activeReceiver ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-sm font-black text-[#101B5C]">
                  {activeReceiver.telegramUsername}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {activeReceiver.address}
                </span>
              </div>
            ) : (
              <p className="text-sm font-semibold text-amber-700 pt-1">
                No active receiver selected. Click &quot;Select&quot; on any receiver below.
              </p>
            )}
          </div>

          {activeReceiver && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(activeReceiver.address, 'active')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-[#101B5C] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copiedId === 'active' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#5367A5]" />
                    <span>Copy Address</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveReceiverId(null)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[#5367A5] hover:text-[#101B5C] text-xs font-bold transition cursor-pointer"
                title="Deselect active receiver"
              >
                Deselect
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#5367A5] font-semibold bg-white/90 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                <Send className="w-3.5 h-3.5 text-blue-600" />
                <span>Ready for Pay System</span>
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Add / Edit Receiver Form Modal / Inline Box */}
      {isFormOpen && (
        <div className="bg-white border-2 border-purple-300 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#D6E0F5] pb-3">
            <h3 className="text-base font-bold text-[#101B5C] flex items-center gap-2">
              {editingReceiverId ? (
                <>
                  <Edit2 className="w-4 h-4 text-purple-600" />
                  <span>Edit Saved Receiver</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Add New Receiver</span>
                </>
              )}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 rounded-lg text-[#5367A5] hover:text-[#101B5C] hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Field 1: Wallet Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#101B5C]">
                Wallet Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value.trim())}
                placeholder="0x... Enter EVM receiver address"
                required
                className="w-full bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 shadow-xs"
              />
              <p className="text-[11px] text-[#5367A5] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Must be a valid 42-character 0x EVM hex address.
              </p>
            </div>

            {/* Field 2: Telegram Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#101B5C]">
                Telegram Username <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formTelegram}
                  onChange={(e) => setFormTelegram(e.target.value)}
                  placeholder="@telegram_username"
                  required
                  className="w-full bg-[#F8FAFF] border border-[#D6E0F5] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-sans text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/20 shadow-xs"
                />
              </div>
              <p className="text-[11px] text-[#5367A5] font-medium">
                Telegram contact or handle for this receiver account.
              </p>
            </div>

            {/* Error Display */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#5367A5] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition cursor-pointer"
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
          <Search className="w-4 h-4 text-[#8A9BC7] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Telegram username or 0x address..."
            className="w-full bg-white border border-[#D6E0F5] rounded-xl pl-9 pr-4 py-2 text-xs text-[#101B5C] placeholder:text-[#8A9BC7] focus:outline-none focus:border-purple-500 shadow-2xs"
          />
        </div>
      )}

      {/* 5. Receiver List */}
      <div className="space-y-3">
        {filteredReceivers.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-[#F8FAFF] border border-[#D6E0F5]">
            <Users className="w-8 h-8 text-[#8A9BC7] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#101B5C]">
              {searchQuery ? 'No receivers match your search query.' : 'No saved receivers yet.'}
            </p>
            <p className="text-xs text-[#5367A5] mt-1">
              Click &quot;+ Add New Receiver&quot; to save a merchant payout address.
            </p>
          </div>
        ) : (
          filteredReceivers.map((receiver) => {
            const isActive = activeReceiverId === receiver.id;

            return (
              <div
                key={receiver.id}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border-emerald-500 shadow-md shadow-emerald-500/15 ring-2 ring-emerald-500/30'
                    : 'bg-white border-slate-300 hover:border-purple-400 hover:bg-purple-50/10 shadow-xs'
                }`}
              >
                {/* Left: Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Favorite Star */}
                    <button
                      type="button"
                      onClick={() => toggleFavorite(receiver.id)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        receiver.isFavorite
                          ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-2xs'
                          : 'border-slate-300 bg-slate-50 text-slate-400 hover:text-slate-700 hover:border-slate-400'
                      }`}
                      title={receiver.isFavorite ? 'Unfavorite' : 'Mark as Favorite'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          receiver.isFavorite ? 'fill-amber-400 text-amber-600 stroke-[2.5]' : 'fill-none stroke-[2]'
                        }`}
                      />
                    </button>

                    {/* Telegram Username */}
                    <span className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                      <span className="text-purple-700 font-black">Telegram:</span>
                      <span className="text-slate-950 font-black">{receiver.telegramUsername}</span>
                    </span>

                    {/* Active Status Badge */}
                    {isActive && (
                      <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border-2 border-emerald-400 shadow-2xs">
                        Active Receiver
                      </span>
                    )}

                    {receiver.isFavorite && !isActive && (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300">
                        ★ Favorite
                      </span>
                    )}
                  </div>

                  {/* Wallet Address */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs font-mono font-bold text-slate-950 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 truncate max-w-full sm:max-w-md">
                      {receiver.address}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(receiver.address, receiver.id)}
                      className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-950 hover:border-slate-400 transition cursor-pointer shadow-2xs"
                      title="Copy Address"
                    >
                      {copiedId === receiver.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                    </button>

                    <a
                      href={`https://polygonscan.com/address/${receiver.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-400 transition cursor-pointer shadow-2xs"
                      title="View on Polygonscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
                    </a>
                  </div>
                </div>

                {/* Right: Actions (Select / Deselect, Edit, Delete) */}
                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                  {/* Select / Toggle Active Button */}
                  <button
                    type="button"
                    onClick={() => setActiveReceiverId(isActive ? null : receiver.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25'
                        : 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-slate-950 border-2 border-slate-300 hover:border-purple-500 hover:text-purple-700 shadow-xs'
                    }`}
                    title={isActive ? 'Click to deselect' : 'Click to set as Active Receiver'}
                  >
                    {isActive ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
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
                    className="p-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 hover:text-purple-900 border-2 border-slate-300 hover:border-purple-500 transition cursor-pointer shadow-xs"
                    title="Edit Receiver"
                  >
                    <Edit2 className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setReceiverToDelete(receiver)}
                    className="p-2.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-800 border-2 border-slate-300 hover:border-rose-500 transition cursor-pointer shadow-xs"
                    title="Delete Receiver"
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Custom In-App Delete Confirmation Modal */}
      {receiverToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="web3-glass-card border border-white/90 bg-white/95 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#101B5C]">Delete Receiver</h3>
                <p className="text-xs text-[#5367A5]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFF] border border-[#D6E0F5] space-y-1">
              <p className="text-xs text-[#5367A5]">
                Telegram: <span className="text-[#101B5C] font-bold">{receiverToDelete.telegramUsername}</span>
              </p>
              <p className="text-xs font-mono text-[#5367A5] break-all">
                {receiverToDelete.address}
              </p>
            </div>

            <p className="text-xs text-[#5367A5] font-medium">
              Are you sure you want to permanently delete this receiver? If this was the active receiver, the active selection will also be cleared.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReceiverToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#5367A5] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold transition shadow-lg shadow-rose-500/20 cursor-pointer"
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
