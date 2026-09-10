import React, { useEffect, useMemo, useState } from 'react';
import { Search, Mail, X, Phone } from 'lucide-react';
import { ContactMessage } from '../../types';

export interface AdminConciergeProps {
  messages: ContactMessage[];
  onUpdateMessageStatus: (id: string, status: 'unread' | 'read' | 'replied', notes?: string) => Promise<boolean>;
}

export const AdminConcierge: React.FC<AdminConciergeProps> = ({ messages, onUpdateMessageStatus }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const closeModal = () => {
    if (isUpdating) return;
    setSelectedMessage(null);
    setReplyNotes('');
    setUpdateError('');
  };

  useEffect(() => {
    if (!selectedMessage) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isUpdating) closeModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedMessage, isUpdating]);

  const handleOpenResolution = (message: ContactMessage) => {
    setSelectedMessage(message);
    setReplyNotes(message.replyNotes || '');
    setUpdateError('');
  };

  const handleSaveResolution = async (newStatus: 'unread' | 'read' | 'replied') => {
    if (!selectedMessage || isUpdating) return;
    setIsUpdating(true);
    setUpdateError('');
    try {
      const success = await onUpdateMessageStatus(selectedMessage.id, newStatus, replyNotes.trim());
      if (!success) {
        setUpdateError('The inquiry could not be saved. Nothing was marked as resolved.');
        return;
      }
      setSelectedMessage(null);
      setReplyNotes('');
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'The inquiry could not be saved. Please retry.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredMessages = useMemo(() => messages.filter(message => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return message.name?.toLowerCase().includes(query) ||
      message.email?.toLowerCase().includes(query) ||
      message.message?.toLowerCase().includes(query) ||
      ((message as any).subject && String((message as any).subject).toLowerCase().includes(query)) ||
      message.topic?.toLowerCase().includes(query);
  }), [messages, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="table-card-custom">
        <div className="table-header-control">
          <div className="table-search-box"><Search className="w-4 h-4 text-stone-400" /><input type="text" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search concierge inquiries or patrons..." className="table-search-input" /></div>
          <div className="text-xs font-semibold text-stone-500">Total Inquiries: <strong>{messages.length}</strong> (<span className="text-amber-600 font-bold">{messages.filter(message => message.status === 'unread').length} unread</span>)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead><tr><th>PATRON</th><th>SUBJECT & MESSAGE</th><th>CHANNEL & CONTACT</th><th>RECEIVED</th><th>STATUS</th><th className="text-center">ACTION</th></tr></thead>
            <tbody>
              {filteredMessages.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-stone-400 text-xs">No concierge inquiries recorded.</td></tr> : filteredMessages.map(message => (
                <tr key={message.id}>
                  <td><div className="table-user-cell"><div className="table-user-avatar bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs">{message.name?.slice(0, 2) || 'PT'}</div><div><div className="table-user-name">{message.name}</div><div className="table-user-sub">{message.email}</div></div></div></td>
                  <td className="max-w-xs"><div className="text-xs font-bold text-stone-900 truncate">{(message as any).subject || message.topic || 'Customer Support Inquiry'}</div><div className="text-xs text-stone-500 line-clamp-2">{message.message}</div></td>
                  <td><div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-stone-400" /><span>Email Concierge</span></div>{message.phone && <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5"><Phone className="w-3 h-3 text-stone-400" /><span>{message.phone}</span></div>}</td>
                  <td className="text-xs text-stone-500 whitespace-nowrap">{message.createdAt ? new Date(message.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}</td>
                  <td><span className={`status-pill ${message.status === 'replied' ? 'status-paid' : message.status === 'read' ? 'status-blue' : 'status-processing'}`}><span className="status-dot" /><span className="capitalize">{message.status}</span></span></td>
                  <td className="text-center"><button type="button" onClick={() => handleOpenResolution(message)} className="btn-saelyxe-primary !py-1.5 !px-3 text-xs">Resolve</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}>
          <div role="dialog" aria-modal="true" className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200" onMouseDown={event => event.stopPropagation()}>
            <div className="p-5 border-b border-stone-100 flex items-center justify-between gap-4"><div><h3 className="text-base font-extrabold text-stone-900">Concierge Inquiry Resolution</h3><p className="text-xs text-stone-500">From: {selectedMessage.name} ({selectedMessage.email})</p></div><button type="button" disabled={isUpdating} onClick={closeModal} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg disabled:opacity-40" aria-label="Close inquiry"><X className="w-5 h-5" /></button></div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-800 space-y-1"><div className="font-bold text-stone-900">Inquiry Content:</div><div className="leading-relaxed whitespace-pre-wrap break-words">{selectedMessage.message}</div></div>
              <div><label className="form-label-custom">Resolution Notes</label><textarea rows={3} value={replyNotes} onChange={event => setReplyNotes(event.target.value)} placeholder="Record communication details, resolution status, or customer preferences..." className="form-textarea-custom" disabled={isUpdating} /></div>
              {updateError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{updateError}</div>}
              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2"><button type="button" onClick={() => void handleSaveResolution('read')} disabled={isUpdating} className="btn-table-action">{isUpdating ? 'Saving...' : 'Mark as Read'}</button><button type="button" onClick={() => void handleSaveResolution('replied')} disabled={isUpdating} className="btn-saelyxe-primary">{isUpdating ? 'Saving...' : 'Mark as Replied / Resolved'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
