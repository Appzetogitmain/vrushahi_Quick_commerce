// @ts-nocheck
import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../services/jwtService';
import Customer from '../models/Customer';

export type AuthUserType = 'Admin' | 'Seller' | 'Customer' | 'Delivery';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// edndgvoercnewrecc

/**
 * Authenticate user by verifying JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = verifyToken(token);
      req.user = decoded;

      // Invalidate deleted customer accounts securely
      if (decoded.userType === 'Customer') {
        const customer = await Customer.findById(decoded.userId).select('status');
        if (!customer || customer.status === 'Deleted') {
          res.status(401).json({
            success: false,
            message: 'Your account has been deleted or deactivated',
          });
          return;
        }
      }

      // Invalidate deleted seller accounts securely
      if (decoded.userType === 'Seller') {
        const Seller = (await import('../models/Seller')).default;
        const seller = await Seller.findById(decoded.userId).select('_id status');
        if (!seller || seller.status === 'Deleted') {
          res.status(401).json({
            success: false,
            message: 'Your seller account has been deleted',
          });
          return;
        }
      }

      next();
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token',
      });
      return;
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message,
    });
    return;
  }
};

/**
 * Authorize user by checking role (for Admin users)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or '),
      });
      return;
    }

    next();
  };
};

/**
 * Require specific user type(s)
 */
export const requireUserType = (...userTypes: AuthUserType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!userTypes.includes(req.user.userType)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Required user type: ' + userTypes.join(' or '),
      });
      return;
    }

    next();
  };
};

