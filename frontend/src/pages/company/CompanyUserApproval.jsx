/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { getAuthHeader } from '../../utils/auth';
import { API_BASE_URL } from '../../utils/api';
import { cacheGet, cacheSet } from '../../utils/cacheManager';
import ModalPortal from '../../components/ModalPortal';
import { Trash2, CheckCircle, XCircle, Plus } from 'lucide-react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';


const USERS_CACHE_KEY = 'company-all-users';

const CompanyUserApproval = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalFor, setShowModalFor] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  // NEW STATE for Add Admin modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const fetchUsers = async () => {
    console.log('Fetching users...');
    try {
      const cached = cacheGet(USERS_CACHE_KEY);
      const headers = getAuthHeader();
      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      const res = await fetch(`${API_BASE_URL}/company/users`, { headers });

      if (res.status === 304 && cached) {
        console.log('Using cached data (304 Not Modified).');
        setAllUsers(cached.value);
      } else if (res.ok) {
        const result = await res.json();
        console.log('Fetched fresh users:', result.data);
        const usersArray = Array.isArray(result.data) ? result.data : [];
        const etag = res.headers.get('etag');

        setAllUsers(usersArray);
        cacheSet(USERS_CACHE_KEY, usersArray, etag);
      } else {
        console.warn('Unexpected response status:', res.status);
        setAllUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteClick = (userId) => {
    setShowModalFor(userId);
    setConfirmText('');
  };

  const confirmDelete = async () => {
    const res = await fetch(`${API_BASE_URL}/company/delete-user/${showModalFor}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (res.ok) {
      await fetchUsers();
    }
    setShowModalFor(null);
    setConfirmText('');
  };

  const handleAction = async (userId, action) => {
    const endpoint = `${API_BASE_URL}/company/${action}/${userId}`;
    const headers = {
      ...getAuthHeader(),
      'Content-Type': 'application/json',
    };

    let options = { method: '', headers };

    switch (action) {
      case 'approve':
        options.method = 'PATCH';
        options.body = JSON.stringify({ action: 'approve' });
        break;
      case 'reject':
      case 'delete':
        options.method = 'DELETE';
        break;
      default:
        console.error('Invalid action:', action);
        return;
    }

    try {
      const res = await fetch(endpoint, options);
      if (res.ok) {
        await fetchUsers();
      } else {
        console.error(`Failed to ${action} user. Status:`, res.status);
      }
    } catch (err) {
      console.error(`Error while trying to ${action} user:`, err);
    }
  };

  const handleAddAdminSubmit = async (e) => {
    e.preventDefault();
    try {
      const headers = {
        ...getAuthHeader(),
        'Content-Type': 'application/json',
      };
      console.log(headers);
      const res = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: 'COMPANY',
          clientId: null
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Admin created successfully!');
        setShowAddAdminModal(false);
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        await fetchUsers();
      } else {
        alert(data.error || 'Failed to create admin');
      }
    } catch (err) {
      console.error('Error creating admin:', err);
      alert('Something went wrong');
    }
  };

  const pendingUsers = allUsers.filter((u) => u.verificationStatus === 'PENDING');
  const approvedUsers = allUsers.filter((u) => u.verificationStatus === 'APPROVED');

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">User Approval Panel</h2>
        <button
          onClick={() => setShowAddAdminModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 border-blue-600 text-blue-600 rounded-md hover:border-blue-700 transition"
        >
          <Plus size={18} /> Add Admin
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div>
            <h3 className="text-xl font-semibold mb-3">Pending Users</h3>
            {pendingUsers.length === 0 ? (
              <p className="text-gray-500">No pending users.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {pendingUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    handleAction={handleAction}
                    handleDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 mt-6">Approved Users</h3>
            {approvedUsers.length === 0 ? (
              <p className="text-gray-500">No approved users.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {approvedUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    handleAction={handleAction}
                    handleDeleteClick={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showModalFor && (
        <DeleteConfirmationModal
          onCancel={() => setShowModalFor(null)}
          onConfirm={confirmDelete}
        />
      )}

      {showAddAdminModal && (
        <ModalPortal>
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h2 className="text-xl font-semibold mb-4">Add New Admin</h2>
              <form onSubmit={handleAddAdminSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  className="w-full p-2 border rounded bg-white border-gray-600"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  className="w-full p-2 border rounded bg-white border-gray-600"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="w-full p-2 border rounded bg-white border-gray-600"
                />
                {/* Fixed role field */}
                <input
                  type="text"
                  value="COMPANY"
                  disabled
                  className="w-full p-2 border rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddAdminModal(false)}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-100 border-blue-600 text-blue-600 rounded hover:border-blue-700"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

const UserCard = ({ user, handleAction, handleDeleteClick }) => {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 mb-4 border hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="text-left">
          <p className="font-semibold text-lg">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-sm text-gray-400">Role: {user.role}</p>
        </div>

        <div className="flex flex-wrap justify-start sm:justify-end gap-2">
          {user.verificationStatus === "PENDING" && (
            <>
              <button
                onClick={() => handleAction(user.id, 'approve')}
                className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200 transition"
              >
                <CheckCircle size={16} />
                Approve
              </button>

              <button
                onClick={() => handleAction(user.id, 'reject')}
                className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-md hover:bg-yellow-200 transition"
              >
                <XCircle size={16} />
                Reject
              </button>
            </>
          )}

          {user.verificationStatus === "APPROVED" && (
            <button
              onClick={() => handleDeleteClick(user.id)}
              className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-md hover:border-red-700 transition"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyUserApproval;
