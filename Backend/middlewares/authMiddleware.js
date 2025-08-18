// middleware/auth.middleware.js

import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  const authHeader = req.headers.authorization;

  // if (!authHeader?.startsWith('Bearer ')) {
  //   return res.status(401).json({ error: 'Unauthorized - Token missing' });
  // }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  } 

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        name: true,
        clientId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;


    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};


export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Forbidden - Access denied' });
    }

    next();
  };
};

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;// user contains payload
    next();
  });
}
export default authMiddleware;
