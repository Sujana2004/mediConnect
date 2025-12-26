export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  ADMIN: 'admin'
};

export const hasRole = (user, requiredRole) => {
  return user?.role === requiredRole;
};

export const hasAnyRole = (user, roles) => {
  return roles.includes(user?.role);
};

export const isPatient = (user) => {
  return user?.role === ROLES.PATIENT;
};

export const isDoctor = (user) => {
  return user?.role === ROLES.DOCTOR;
};

export const isAdmin = (user) => {
  return user?.role === ROLES.ADMIN;
};