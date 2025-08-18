import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ user }) => {
  if (!user) return <Navigate to="/login" />;
  return <Outlet context={{ user }} />;
};

export default PrivateRoute;
