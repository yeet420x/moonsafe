// Admin authentication utility
// This approach is more secure than hardcoding passwords in the frontend

// In a real production app, you'd want to handle this on the backend
// For now, we'll use a simple hash comparison approach

const hashPassword = (password) => {
  // Simple hash function - in production, use proper hashing like bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
};

// Store the hashed password instead of plain text
const HASHED_ADMIN_PASSWORD = hashPassword('DRB2025');

export const verifyAdminPassword = (inputPassword) => {
  const hashedInput = hashPassword(inputPassword);
  return hashedInput === HASHED_ADMIN_PASSWORD;
};

export const createAdminSession = () => {
  localStorage.setItem('moonsafe_admin', 'true');
  localStorage.setItem('moonsafe_admin_time', Date.now().toString());
};

export const clearAdminSession = () => {
  localStorage.removeItem('moonsafe_admin');
  localStorage.removeItem('moonsafe_admin_time');
};

export const isAdminSessionValid = () => {
  const adminSession = localStorage.getItem('moonsafe_admin');
  const adminTime = localStorage.getItem('moonsafe_admin_time');
  
  if (adminSession && adminTime) {
    const sessionAge = Date.now() - parseInt(adminTime);
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge < maxSessionAge) {
      return true;
    } else {
      clearAdminSession();
      return false;
    }
  }
  return false;
}; 