import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Lock, 
  Shield, 
  X, 
  AlertTriangle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { AdminStaff } from '../../types';

export interface AdminStaffProps {
  staffList: AdminStaff[];
  isSuperAdmin: boolean;
  onAddStaff: (staff: Omit<AdminStaff, 'id' | 'createdAt' | 'status'>) => Promise<boolean>;
  onDeleteStaff: (id: string, name: string) => void;
}

export const AdminStaffView: React.FC<AdminStaffProps> = ({
  staffList,
  isSuperAdmin,
  onAddStaff,
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
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username.trim() || !form.name.trim() || !form.email.trim()) {
      setFormError('Name, username, and email are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const success = await onAddStaff({
        username: form.username.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role
      });

      if (success) {
        setIsModalOpen(false);
        setForm({
          username: '',
          name: '',
          email: '',
          role: 'admin'
        });
      } else {
        setFormError('Failed to add staff profile.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error creating staff profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Overview Banner Card */}
      <div className="admin-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Role-Based Access Control (RBAC) Architecture</span>
          </h3>
          <p className="text-xs text-stone-500 max-w-2xl mt-1">
            This section is an internal staff directory. Listed roles are informational only; Firebase authentication claims and protected administrator records control actual admin access.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-saelyxe-lime text-xs whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            <span>ADD STAFF PROFILE</span>
          </button>
        )}
      </div>

      {/* Staff Table */}
      <div className="table-card-custom">
        <div className="table-header-control">
          <div>
            <h4 className="text-sm font-bold text-stone-900">Active Atelier Personnel</h4>
            <p className="text-xs text-stone-500">Internal directory records; this table does not create Firebase login credentials</p>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            <strong>{staffList.length}</strong> Registered Operators
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-custom">
            <thead>
              <tr>
                <th>OPERATOR NAME</th>
                <th>USERNAME / ID</th>
                <th>CONTACT EMAIL</th>
                <th>LISTED ROLE</th>
                <th>STATUS</th>
                <th>PROVISIONED</th>
                {isSuperAdmin && <th className="text-center">ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => {
                const isSuper = staff.role === 'super_admin';

                return (
                  <tr key={staff.id}>
                    <td>
                      <div className="table-user-cell">
                        <div className={`table-user-avatar flex items-center justify-center font-bold text-xs ${
                          isSuper ? 'bg-[#051C12] text-[#B4F105]' : 'bg-stone-100 text-stone-800'
                        }`}>
                          {staff.name?.slice(0, 2) || staff.username?.slice(0, 2)}
                        </div>
                        <div>
                          <div className="table-user-name">{staff.name}</div>
                          <div className="table-user-sub">
                            {isSuper ? 'Director Level' : 'Operations Staff'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="font-mono text-xs font-semibold text-stone-800">
                      @{staff.username}
                    </td>

                    <td className="text-xs text-stone-600">
                      {staff.email}
                    </td>

                    <td>
                      <span className={`status-pill ${
                        isSuper ? 'status-super-admin' : 'status-processing'
                      }`}>
                        <span className="status-dot" />
                        <span>{isSuper ? 'SUPER ADMIN' : 'ATELIER ADMIN'}</span>
                      </span>
                    </td>

                    <td>
                      <span className="status-pill status-paid">
                        <span className="status-dot" />
                        <span className="capitalize">{staff.status || 'Active'}</span>
                      </span>
                    </td>

                    <td className="text-xs text-stone-500 whitespace-nowrap">
                      {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Atelier Launch'}
                    </td>

                    {isSuperAdmin && (
                      <td className="text-center whitespace-nowrap">
                        <button
                          onClick={() => onDeleteStaff(staff.id, staff.name || staff.displayName || staff.username)}
                          className="btn-table-action text-rose-600! hover:bg-rose-50! py-1! px-2.5! text-xs"
                          title="Remove directory profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Profile</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Operator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  Add Staff Directory Profile
                </h3>
                <p className="text-xs text-stone-500">
                  Record a staff directory profile. Authentication access is managed separately through Firebase administrator controls.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="form-label-custom">Operator Full Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Kasun Fernando"
                  className="form-input-custom"
                />
              </div>

              <div>
                <label className="form-label-custom">Directory Username / ID</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. kasun_atelier"
                  className="form-input-custom font-mono"
                />
              </div>

              <div>
                <label className="form-label-custom">Official Email Address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="name@saelyxe.com"
                  className="form-input-custom"
                />
              </div>

              <div>
                <label className="form-label-custom">Listed Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as any })}
                  className="form-input-custom font-semibold"
                >
                  <option value="admin">Atelier Admin (Directory Label)</option>
                  <option value="super_admin">Super Admin (Directory Label)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-table-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-saelyxe-primary"
                >
                  {isSubmitting ? 'Adding...' : 'Add Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
