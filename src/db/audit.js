import { query } from './sqlite.js';

/**
 * Logs an activity to the audit_logs table.
 * 
 * @param {number|null} userId - The ID of the user performing the action (null if system or unauthenticated)
 * @param {string} action - A short string describing the action (e.g., 'login', 'create_user', 'update_blog')
 * @param {string|object} details - Additional details about the action. Will be stringified if it's an object.
 * @param {string} ipAddress - The IP address of the requester (if available)
 */
export async function logActivity(userId, action, details = '', ipAddress = '') {
  try {
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    
    await query.run(
      'INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
      [userId || null, action, detailsStr, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
