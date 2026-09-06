import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  Mail, 
  CheckCircle, 
  Clock, 
  Send, 
  User, 
  X,
  Phone
} from 'lucide-react';
import { ContactMessage } from '../../types';

export interface AdminConciergeProps {
  messages: ContactMessage[];
  onUpdateMessageStatus: (id: string, status: 'unread' | 'read' | 'replied', notes?: string) => Promise<boolean>;
}

export const AdminConcierge: React.FC<AdminConciergeProps> = ({
  messages,
  onUpdateMessageStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyNotes, setReplyNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const handleOpenResolution = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setReplyNotes(msg.replyNotes || '');
    setUpdateError('');
  };

  const handleSaveResolution = async (newStatus: 'unread' | 'read' | 'replied') => {
    if (!selectedMessage) return;
    setIsUpdating(true);
    try {
      const success = await onUpdateMessageStatus(selectedMessage.id, newStatus, replyNotes);
      if (!success) {
        setUpdateError('The inquiry could not be saved. Nothing was marked as resolved.');
        return;
      }
      setSelectedMessage(null);
      setUpdateError('');
    } catch (err) {
      console.error('Error resolving inquiry:', err);
      setUpdateError('The inquiry could not be saved. Please retry.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.message?.toLowerCase().includes(q) ||
      ((m as any).subject && (m as any).subject.toLowerCase().includes(q)) ||
      m.topic?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="table-card-custom">
        {/* Header Controls */}
        <div className="table-header-control">
          <div className="table-search-box">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search concierge inquiries or patrons..."
              className="table-search-input"
            />
          </div>

          <div className="text-xs font-semibold text-stone-500">
            Total Inquiries: <strong>{messages.length}</strong> (
            <span className="text-amber-600 font-bold">
              {messages.filter(m => m.status === 'unread').length} unread
            </span>)
          </div>
        </div>

        {/* Table of Inquiries */}
        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>PATRON</th>
                <th>SUBJECT & MESSAGE</th>
                <th>CHANNEL & CONTACT</th>
                <th>RECEIVED</th>
                <th>STATUS</th>
                <th className="text-center">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-stone-400 text-xs">
                    No concierge inquiries recorded.
                  </td>
                </tr>
              ) : (
                filteredMessages.map(msg => (
                  <tr key={msg.id}>
                    <td>
                      <div className="table-user-cell">
                        <div className="table-user-avatar bg-stone-100 text-stone-800 flex items-center justify-center font-bold text-xs">
                          {msg.name?.slice(0, 2) || 'PT'}
                        </div>
                        <div>
                          <div className="table-user-name">{msg.name}</div>
                          <div className="table-user-sub">{msg.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="max-w-xs">
                      <div className="text-xs font-bold text-stone-900 truncate">
                        {(msg as any).subject || msg.topic || 'Bespoke Atelier Inquiry'}
                      </div>
                      <div className="text-xs text-stone-500 line-clamp-2">
                        {msg.message}
                      </div>
                    </td>

                    <td>
                      <div className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-stone-400" />
                        <span>Email Concierge</span>
                      </div>
                      {msg.phone && (
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{msg.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="text-xs text-stone-500 whitespace-nowrap">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Recent'}
                    </td>

                    <td>
                      <span className={`status-pill ${
                        msg.status === 'replied' ? 'status-paid' :
                        msg.status === 'read' ? 'status-blue' :
                        'status-processing'
                      }`}>
                        <span className="status-dot" />
                        <span className="capitalize">{msg.status}</span>
                      </span>
                    </td>

                    <td className="text-center">
                      <button
                        onClick={() => handleOpenResolution(msg)}
                        className="btn-saelyxe-primary !py-1.5 !px-3 text-xs"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Concierge Inquiry Resolution
                </h3>
                <p className="text-xs text-stone-500">
                  From: {selectedMessage.name} ({selectedMessage.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-800 space-y-1">
                <div className="font-bold text-stone-900">Inquiry Content:</div>
                <div className="leading-relaxed">{selectedMessage.message}</div>
              </div>

              <div>
                <label className="form-label-custom">Atelier Resolution Notes</label>
                <textarea
                  rows={3}
                  value={replyNotes}
                  onChange={e => setReplyNotes(e.target.value)}
                  placeholder="Record communication details, resolution status, or customer preferences..."
                  className="form-textarea-custom"
                />
              </div>

              {updateError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{updateError}</div>}

              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveResolution('read')}
                  disabled={isUpdating}
                  className="btn-table-action"
                >
                  Mark as Read
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveResolution('replied')}
                  disabled={isUpdating}
                  className="btn-saelyxe-primary"
                >
                  {isUpdating ? 'Saving...' : 'Mark as Replied / Resolved'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
