import { useState, useMemo } from 'react';
import { FileText, UserCheck, ListChecks, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserRole } from '../utils/auth';

const navConfig = {
  COMPANY: [
    { label: 'Summary', icon: <FileText size={18} />, path: '/company/summary' },
    { label: 'User Approval', icon: <UserCheck size={18} />, path: '/company/approval' },
    { label: 'Questionnaire', icon: <ListChecks size={18} />, path: '/company/questionnaire' },
  ],
  CLIENT: [
    { label: 'Summary', icon: <FileText size={18} />, path: '/client/summary' },
    { label: 'Questionnaire', icon: <ListChecks size={18} />, path: '/client/questionnaire' },
  ],
  VENDOR: [
    { label: 'Summary', icon: <FileText size={18} />, path: '/vendor/summary' },
    { label: 'Questionnaire', icon: <ListChecks size={18} />, path: '/vendor/questionnaire' },
  ],
};

export default function LeftSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole();
  
  const navItems = useMemo(() => navConfig[role] || [], [role]);

  const isActive = (path) => location.pathname === path;

  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen`}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b flex justify-between items-center">
        {!collapsed && <span className="text-lg font-semibold">Menu</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 bg-gray-100 hover:bg-gray-400 rounded"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
              isActive(item.path)
                ? 'bg-blue-100 text-blue-800 font-medium'
                : 'hover:bg-gray-100 text-gray-700'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.label : ''}
          >
            {item.icon}
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </div>
        ))}
      </nav>
    </aside>
  );
}
