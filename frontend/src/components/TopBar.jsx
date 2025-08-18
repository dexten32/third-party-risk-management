/* eslint-disable no-unused-vars */
import { logoutUser } from "../utils/auth";
import { LogOut } from "lucide-react";

export default function TopBar({ user }) {
  return (
    <header className="h-16 bg-white shadow-sm z-10 px-6 flex items-center justify-between border-b border-gray-200">
      <h1 className="text-2xl font-bold text-gray-800">
        Risk Management Dashboard
      </h1>
      <div className="flex items-center gap-4">
        {user?.role && (
          <span className="text-sm font-bold text-gray-600">{user.role}</span>
        )}
        <button
          onClick={logoutUser}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-500 border border-red-500 rounded hover:border-red-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
