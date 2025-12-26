export const getToken = () => {
  return localStorage.getItem('mediconnect_token');
};

export const setToken = (token) => {
  localStorage.setItem('mediconnect_token', token);
};

export const removeToken = () => {
  localStorage.removeItem('mediconnect_token');
};

export const getUserRole = () => {
  return localStorage.getItem('mediconnect_role');
};

export const setUserRole = (role) => {
  localStorage.setItem('mediconnect_role', role);
};

export const removeUserRole = () => {
  localStorage.removeItem('mediconnect_role');
};

export const getUserData = () => {
  const data = localStorage.getItem('mediconnect_user');
  return data ? JSON.parse(data) : null;
};

export const setUserData = (user) => {
  localStorage.setItem('mediconnect_user', JSON.stringify(user));
};

export const removeUserData = () => {
  localStorage.removeItem('mediconnect_user');
};

export const clearStorage = () => {
  removeToken();
  removeUserRole();
  removeUserData();
};