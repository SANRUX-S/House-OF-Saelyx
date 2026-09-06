import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  X,
  Trash2,
  CheckCircle2,
  Mail,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { AdminStaff } from '../../types';

export interface AdminStaffProps {
  staffList: AdminStaff[];
  isSuperAdmin: boolean;
  onAddStaff: (staff: Omit<AdminStaff, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  onActivateStaff: (id: string) => Promise<{ success: boolean; error?: string }>;
  onUpdateStaffRole: (id: string, role: 'admin' | 'super_admin') => Promise<{ success: boolean; error?: string }>;
  onDeleteStaff: (id: string, name: string) => void;
}

export const AdminStaffView: React.FC<AdminStaffProps> = ({
  staffList,
  isSuperAdmin,
  onAddStaff,
  onActivateStaff,
  onUpdateStaffRole,
  onDeleteStaff
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'admin' as 'admin' | 'super_admin'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.username.trim() || !form.name.trim() || !form.email.trim()) {
      setFormError('Name, username, and email are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const success = await onAddStaff({
        username: form.username.trim().toLowerCase(),
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role
      });
      if (!success) {
        setFormError('Invitation failed. Confirm the email is valid, Resend is configured, and this account is not already active.');
        return;
      }
      setIsModalOpen(false);
      setForm({ username: '', name: '', email: '', role: 'admin' });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Error creating administrator invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activate = async (staff: AdminStaff) => {
    setActionId(staff.id);
    setActionError('');
    const result = await onActivateStaff(staff.id);
    setActionId('');
    if (!result.success) setActionError(result.error || 'Activation failed.');
  };

  const changeRole = async (staff: AdminStaff, role: 'admin' | 'super_admin') => {
    if (role === staff.role) return;
    setActionId(staff.id);
    setActionError('');
    const result = await onUpdateStaffRole(staff.id, role);
    setActionId('');
    if (!result.success) setActionError(result.error || 'Role update failed.');
  };

  const statusClass = (status: AdminStaff['status']) => {
    if (status === 'active') return 'status-paid';
    if (status === 'invited') return 'status-processing';
    return 'status-failed';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="admin-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Firebase Administrator Access</span>
          </h3>
          <p className="text-xs text-stone-500 max-w-3xl mt-1">
            Invitations create or link a Firebase Auth user, send verification/password setup by email, and remain inactive until a Super Admin activates the verified account. Revocation clears SAELYXE admin claims and revokes refresh tokens.
          </p>
        </div>

        {isSuperAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="btn-saelyxe-lime text-xs whitespace-nowrap">
            <UserPlus className="w-4 h-4" />
            <span>INVITE ADMINISTRATOR</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      <div className="table-card-custom">
        <div className="table-header-control">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Administrator Accounts</h4>
            <p className="text-xs text-stone-500">Firebase-linked access records. Directory role alone never grants access.</p>
          </div>
          <span className="text-xs font-semibold text-stone-500"><strong>{staffList.length}</strong> records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>OPERATOR</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>CREATED</th>
                {isSuperAdmin && <th className="text-center">ACCESS ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-xs text-stone-400">No provisioned staff accounts.</td></tr>
              ) : staffList.map(staff => (
                <tr key={staff.id}>
                  <td>
                    <div className="table-user-cell">
                      <div className="table-user-avatar flex items-center justify-center font-bold text-xs bg-stone-100 text-stone-800">
                        {(staff.name || staff.username || 'AD').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="table-user-name">{staff.name || staff.displayName || staff.username}</div>
                        <div className="table-user-sub">@{staff.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-xs text-stone-700">{staff.email}</div>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-400">
                      <Mail className="h-3 w-3" />
                      {staff.emailVerified ? 'Verified' : 'Verification required'}
                    </div>
                  </td>
                  <td>
                    {isSuperAdmin ? (
                      <select
                        value={staff.role}
                        disabled={actionId === staff.id || staff.status === 'revoked'}
                        onChange={event => void changeRole(staff, event.target.value as 'admin' | 'super_admin')}
                        className="form-input-custom !py-1.5 !text-xs min-w-36"
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    ) : (
                      <span className="text-xs font-semibold text-stone-700">{staff.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(staff.status)}`}>
                      <span className="status-dot" />
                      <span className="capitalize">{staff.status}</span>
                    </span>
                  </td>
                  <td className="text-xs text-stone-500 whitespace-nowrap">
                    {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : '—'}
                  </td>
                  {isSuperAdmin && (
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        {staff.status === 'invited' && (
                          <button
                            type="button"
                            disabled={actionId === staff.id}
                            onClick={() => void activate(staff)}
                            className="btn-table-action text-emerald-700! hover:bg-emerald-50!"
                            title="Activate after Firebase email verification"
                          >
                            {actionId === staff.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Activate
                          </button>
                        )}
                        {staff.status !== 'revoked' && (
                          <button
                            type="button"
                            disabled={actionId === staff.id}
                            onClick={() => onDeleteStaff(staff.id, staff.name || staff.displayName || staff.username)}
                            className="btn-table-action text-rose-600! hover:bg-rose-50!"
                            title="Revoke SAELYXE administrator access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">Invite Firebase Administrator</h3>
                <p className="text-xs text-stone-500">The invite does not become active until email verification and Super Admin activation.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{formError}</div>}
              <div>
                <label className="form-label-custom">Operator Full Name</label>
                <input type="text" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Kasun Fernando" className="form-input-custom" />
              </div>
              <div>
                <label className="form-label-custom">Username / Internal ID</label>
                <input type="text" required pattern="[A-Za-z0-9._-]{3,60}" value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} placeholder="e.g. kasun_atelier" className="form-input-custom font-mono" />
              </div>
              <div>
                <label className="form-label-custom">Official Email Address</label>
                <input type="email" required value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="name@saelyxe.com" className="form-input-custom" />
              </div>
              <div>
                <label className="form-label-custom">Requested Access Role</label>
                <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value as 'admin' | 'super_admin' })} className="form-input-custom font-semibold">
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] leading-relaxed text-amber-800">
                Super Admin access can change staff roles and revoke other administrators. Grant it only when required.
              </div>
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-table-action">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-saelyxe-primary">
                  {isSubmitting ? 'Sending Invitation...' : 'Send Secure Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
