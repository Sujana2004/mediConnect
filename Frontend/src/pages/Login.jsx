import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Stethoscope,
  Heart,
  AlertCircle
} from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object({
    email: Yup.string()
      .email(t('login.emailInvalid'))
      .required(t('login.emailRequired')),
    password: Yup.string()
      .min(6, t('login.passwordMin'))
      .required(t('login.passwordRequired')),
    role: Yup.string()
      .oneOf(['patient', 'doctor'], t('login.roleInvalid'))
      .required(t('login.roleRequired')),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      role: 'patient',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setLoginError('');
      // Require prior registration: check stored user data
      try {
        const stored = JSON.parse(localStorage.getItem('mediconnect_user') || 'null');
        if (!stored || stored.email !== values.email || stored.role !== values.role) {
          setLoginError(t('login.registerFirst') || 'No account found. Please create an account first.');
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // if parsing fails, prompt registration
        setLoginError(t('login.registerFirst') || 'No account found. Please create an account first.');
        setIsLoading(false);
        return;
      }

      const result = await login(values.email, values.password, values.role);

      if (!result.success) {
        setLoginError(result.error);
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Heart className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {t('login.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{loginError}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={formik.handleSubmit}>
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => formik.setFieldValue('role', 'patient')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                  formik.values.role === 'patient'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <User className={`h-8 w-8 mb-2 ${
                  formik.values.role === 'patient' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  formik.values.role === 'patient' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {t('login.patient')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => formik.setFieldValue('role', 'doctor')}
                className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                  formik.values.role === 'doctor'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <Stethoscope className={`h-8 w-8 mb-2 ${
                  formik.values.role === 'doctor' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  formik.values.role === 'doctor' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {t('login.doctor')}
                </span>
              </button>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('login.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className={`pl-10 block w-full px-3 py-3 border ${
                    formik.touched.email && formik.errors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                  placeholder="user@example.com"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('login.password')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  className={`pl-10 pr-10 block w-full px-3 py-3 border ${
                    formik.touched.password && formik.errors.password
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  )}
                </button>
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('login.signingIn')}
                  </div>
                ) : (
                  t('login.signIn')
                )}
              </button>
            </div>

            {/* Government Badge */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs text-blue-800">
                {t('login.governmentVerified')}
              </p>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {t('login.createAccount')}
              </Link>
            </p>
          </div>

          {/* Quick Access Links */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <Link
                to="/emergency"
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                {t('login.emergencyAccess')}
              </Link>
              <Link
                to="/doctors"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('login.findDoctor')}
              </Link>
            </div>
          </div>
        </div>

        {/* Info Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">
              {t('login.verifiedDoctors')}
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">
              {t('login.secureData')}
            </p>
          </div>
          <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-600 font-medium">
              {t('login.freeService')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;