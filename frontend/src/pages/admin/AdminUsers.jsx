import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', type: '', verified: '' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.adminListUsers({ ...filters, q: filters.q?.trim() || undefined });
      setUsers(res.users || []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedAdmin = localStorage.getItem('adminUser');
    if (!storedAdmin) {
      navigate('/admin/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Admin Users</h1>
          <button onClick={load} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Refresh</button>
        </div>

        <div className="bg-white shadow rounded p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={filters.q} onChange={e=>setFilters(f=>({...f,q:e.target.value}))} placeholder="Search name/email/farm" className="border rounded px-3 py-2" />
            <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))} className="border rounded px-3 py-2">
              <option value="">All types</option>
              <option value="customer">Customer</option>
              <option value="farmer">Farmer</option>
              <option value="admin">Admin</option>
            </select>
            <select value={filters.verified} onChange={e=>setFilters(f=>({...f,verified:e.target.value}))} className="border rounded px-3 py-2">
              <option value="">Any verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
            <button onClick={load} className="px-4 py-2 bg-gray-800 text-white rounded">Apply</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700">{error}</div>}
        {loading && <div className="text-gray-600">Loading users…</div>}

        {!loading && !error && (
          <div className="bg-white shadow rounded overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Verified</th>
                  <th className="text-left px-4 py-2">KYC</th>
                  <th className="text-left px-4 py-2">Farmer Status</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {(users || []).map((u)=> (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-2">{u.name || '—'}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2 capitalize">{u.type}</td>
                    <td className="px-4 py-2">{u.isVerified ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{u.kycStatus || '—'}</td>
                    <td className="px-4 py-2">{u.farmerStatus || '—'}</td>
                    <td className="px-4 py-2">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
                {(!users || users.length === 0) && (
                  <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={7}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
