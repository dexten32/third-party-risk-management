/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { getAuthHeader } from '../../utils/auth';
import { API_BASE_URL } from '../../utils/api';
import ModalPortal from '../../components/ModalPortal';
import { Trash2, CheckCircle, XCircle } from 'lucide-react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const POLL_INTERVAL_MS = 30*60*1000; // 30 minutes

const CompanyUserApproval = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModalFor, setShowModalFor] = useState(null);
  const [confirmText, setConfirmText] = useState('');

    const fetchUsers = async () => {
      console.log('Fetching users...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/company/users?fresh=true`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
          const result = await res.json();
          console.log('Fetched users:', result.data);
        if (Array.isArray(result.data)) {
          setAllUsers(result.data);
        } else {
          console.warn('Unexpected data format:', result.data);
          setAllUsers([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const interval = setInterval(() => {
      fetchUsers();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleDeleteClick = (userId) => {
    setShowModalFor(userId);
    setConfirmText('');
  };

  const confirmDelete = async () => {
    const res = await fetch(`${API_BASE_URL}/api/company/delete-user/${showModalFor}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (res.ok) {
      setAllUsers((prev) => prev.filter((u) => u.id !== showModalFor));
    }
    setShowModalFor(null);
    setConfirmText('');
  };

  const handleAction = async (userId, action) => {
    const endpoint = `${API_BASE_URL}/api/company/${action}/${userId}`;
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
        setAllUsers((prev) => prev.filter((u) => u.id !== userId));
        await fetchUsers();
      } else {
        console.error(`Failed to ${action} user. Status:`, res.status);
      }
    } catch (err) {
      console.error(`Error while trying to ${action} user:`, err);
    }
  };

  const pendingUsers = allUsers.filter((u) => u.verificationStatus === 'PENDING');
  const approvedUsers = allUsers.filter((u) => u.verificationStatus === 'APPROVED');

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-2xl font-semibold">User Approval Panel</h2>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Pending Users Section */}
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

          {/* Approved Users Section */}
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

      {/* Delete Confirmation Modal */}
          {showModalFor && (
              <DeleteConfirmationModal onCancel={() => setShowModalFor(null)}
                onConfirm={confirmDelete} />
            )}
    </div>
  );
};

const UserCard = ({ user, handleAction, handleDeleteClick }) => {
  return (
    <div className="bg-white shadow-md rounded-xl p-4 mb-4 border hover:shadow-lg transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        {/* Left side: user info */}
        <div className="text-left">
          <p className="font-semibold text-lg">{user.name}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-sm text-gray-400">Role: {user.role}</p>
        </div>

        {/* Right side: buttons */}
        <div className="flex flex-wrap justify-start sm:justify-end gap-2">
          {/* Show Approve/Reject if user is NOT approved */}
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

          {/* Show Delete only if user IS approved */}
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
