import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Stethoscope,
  Heart,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react';

const Login = ({ onSuccess, redirectPath }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
      
      const result = await login(values.email, values.password, values.role);
      
      if (!result.success) {
        setLoginError(result.error);
        setIsLoading(false);
      } else if (onSuccess) {
        onSuccess();
      }
    },
  });

  const handleDemoLogin = (role, email) => {
    formik.setValues({
      email: email,
      password: 'demo123',
      role: role
    });
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-3 rounded-full">
            <Heart className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('login.title')}
        </h2>
        <p className="text-gray-600 text-sm mt-2">
          {t('login.subtitle')}
        </p>
      </div>

      {/* Demo Login Buttons */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3 text-center">
          Try demo login:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleDemoLogin('patient', 'patient@demo.com')}
            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            Patient Demo
          </button>
          <button
            onClick={() => handleDemoLogin('doctor', 'doctor@demo.com')}
            className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
          >
            Doctor Demo
          </button>
        </div>
      </div>

      {loginError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <span className="text-red-700 text-sm">{loginError}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={formik.handleSubmit}>
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('login.loginAs')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => formik.setFieldValue('role', 'patient')}
              className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                formik.values.role === 'patient'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <User className={`h-6 w-6 mb-2 ${
                formik.values.role === 'patient' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <span className={`font-medium text-sm ${
                formik.values.role === 'patient' ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {t('login.patient')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => formik.setFieldValue('role', 'doctor')}
              className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center transition-all ${
                formik.values.role === 'doctor'
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <Stethoscope className={`h-6 w-6 mb-2 ${
                formik.values.role === 'doctor' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <span className={`font-medium text-sm ${
                formik.values.role === 'doctor' ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {t('login.doctor')}
              </span>
            </button>
          </div>
          {formik.touched.role && formik.errors.role && (
            <p className="mt-2 text-sm text-red-600">{formik.errors.role}</p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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
              className={`pl-10 block w-full px-4 py-3 border ${
                formik.touched.email && formik.errors.email
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
              placeholder="user@example.com"
            />
          </div>
          {formik.touched.email && formik.errors.email && (
            <p className="mt-2 text-sm text-red-600">{formik.errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex justify-between items-center mb-2">
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
              className={`pl-10 pr-10 block w-full px-4 py-3 border ${
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
            <p className="mt-2 text-sm text-red-600">{formik.errors.password}</p>
          )}
        </div>

        {/* Remember Me & Terms */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              {t('login.rememberMe')}
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
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
          <div className="flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-600 mr-2" />
            <p className="text-xs text-blue-800">
              {t('login.governmentVerified')}
            </p>
          </div>
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

      {/* Quick Links */}
      <div className="mt-6 pt-6 border-t border-gray-200">
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

      {/* Security Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900">Secure Login</p>
            <p className="text-xs text-gray-600 mt-1">
              Your data is protected with 256-bit encryption and never shared with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;