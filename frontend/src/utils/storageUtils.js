/**
 * Updates stored user credentials with new user data
 * @param {Object} updatedUserData - The updated user data
 */
export const updateStoredCredentials = (updatedUserData) => {
  // Check both localStorage and sessionStorage for existing data
  const localUser = localStorage.getItem("user");
  const sessionUser = sessionStorage.getItem("user");
  
  if (localUser) {
    const currentUser = JSON.parse(localUser);
    const updatedUser = { ...currentUser, ...updatedUserData };
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }
  
  if (sessionUser) {
    const currentUser = JSON.parse(sessionUser);
    const updatedUser = { ...currentUser, ...updatedUserData };
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  }
};

/**
 * Gets the current stored user data
 * @returns {Object|null} The stored user object or null if not found
 */
export const getStoredUser = () => {
  const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
  return user;
};