import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth middleware - Full auth header:', authHeader);
    
    if (!authHeader) {
      console.log('Auth middleware - No authorization header');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Handle both "Bearer token" and just "token" formats
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    } else {
      token = authHeader; // Use as-is if no Bearer prefix
    }
    
    console.log('Auth middleware - Extracted token:', token ? `${token.substring(0, 20)}...` : 'none');
    
    if (!token) {
      console.log('Auth middleware - No token found after extraction');
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Auth middleware - Token decoded successfully:', {
        userId: decoded.userId,
        email: decoded.email,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      console.log('Auth middleware - JWT verification failed:', jwtError.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.userId);
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('Auth middleware - User found:', {
      id: user._id,
      email: user.email,
      name: user.name
    });

    // Attach user to request
    req.user = user;
    console.log('Auth middleware - Authentication successful, proceeding to next middleware');
    next();
  } catch (error) {
    console.error('Auth middleware - Unexpected error:', error);
    res.status(500).json({ error: 'Authentication error: ' + error.message });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      let token;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = authHeader;
      }
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          const user = await User.findById(decoded.userId);
          if (user) {
            req.user = user;
          }
        } catch (error) {
          console.log('Optional auth - Token invalid, continuing without auth');
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next(); // Continue without authentication
  }
};