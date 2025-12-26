import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Calendar,
  CreditCard,
  AlertCircle,
  Stethoscope,
  Heart
} from 'lucide-react';

const Register = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validationSchema = Yup.object({
    name: Yup.string()
      .min(2, t('register.nameMin'))
      .required(t('register.nameRequired')),
    email: Yup.string()
      .email(t('register.emailInvalid'))
      .required(t('register.emailRequired')),
    phone: Yup.string()
      .matches(/^[0-9]{10}$/, t('register.phoneInvalid'))
      .required(t('register.phoneRequired')),
    address: Yup.string()
      .min(10, t('register.addressMin'))
      .required(t('register.addressRequired')),
    dateOfBirth: Yup.date()
      .max(new Date(), t('register.dobInvalid'))
      .required(t('register.dobRequired')),
    password: Yup.string()
      .min(8, t('register.passwordMin'))
      .matches(/[A-Z]/, t('register.passwordUppercase'))
      .matches(/[0-9]/, t('register.passwordNumber'))
      .matches(/[!@#$%^&*]/, t('register.passwordSpecial'))
      .required(t('register.passwordRequired')),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password'), null], t('register.passwordMatch'))
      .required(t('register.confirmPasswordRequired')),
    role: Yup.string()
      .oneOf(['patient', 'doctor'], t('register.roleInvalid'))
      .required(t('register.roleRequired')),
    aadhaarNumber: Yup.string().when('role', (role, schema) => {
      return role === 'patient'
        ? schema.matches(/^[0-9]{12}$/, t('register.aadhaarInvalid')).required(t('register.aadhaarRequired'))
        : schema;
    }),
    licenseNumber: Yup.string().when('role', (role, schema) => {
      return role === 'doctor'
        ? schema.min(6, t('register.licenseMin')).required(t('register.licenseRequired'))
        : schema;
    }),
    specialization: Yup.string().when('role', (role, schema) => {
      return role === 'doctor'
        ? schema.required(t('register.specializationRequired'))
        : schema;
    }),
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
      role: 'patient',
      aadhaarNumber: '',
      licenseNumber: '',
      specialization: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setRegistrationError('');

      const userData = {
        ...values,
        // Remove confirmPassword from submission
        confirmPassword: undefined
      };

      const result = await register(userData);

      if (!result.success) {
        setRegistrationError(result.error);
        setIsLoading(false);
      }
    },
  });

  const specializations = [
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Pediatrician',
    'Gynecologist',
    'Orthopedic',
    'Psychiatrist',
    'Dentist',
    'Ayurveda',
    'Homeopathy',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="bg-blue-600 p-3 rounded-full">
              <Heart className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {t('register.title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('register.subtitle')}
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
          {/* Role Selection */}
          <div className="p-6 bg-blue-50 border-b">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('register.selectRole')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  formik.setFieldValue('role', 'patient');
                  formik.setFieldValue('licenseNumber', '');
                  formik.setFieldValue('specialization', '');
                }}
                className={`p-6 rounded-lg border-2 flex flex-col items-center transition-all ${
                  formik.values.role === 'patient'
                    ? 'border-blue-500 bg-white shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                }`}
              >
                <User className={`h-12 w-12 mb-3 ${
                  formik.values.role === 'patient' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  formik.values.role === 'patient' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {t('register.patient')}
                </h3>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  {t('register.patientDesc')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  formik.setFieldValue('role', 'doctor');
                  formik.setFieldValue('aadhaarNumber', '');
                }}
                className={`p-6 rounded-lg border-2 flex flex-col items-center transition-all ${
                  formik.values.role === 'doctor'
                    ? 'border-blue-500 bg-white shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-white'
                }`}
              >
                <Stethoscope className={`h-12 w-12 mb-3 ${
                  formik.values.role === 'doctor' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <h3 className={`text-lg font-semibold ${
                  formik.values.role === 'doctor' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {t('register.doctor')}
                </h3>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  {t('register.doctorDesc')}
                </p>
              </button>
            </div>
          </div>

          {/* Registration Form */}
          <div className="p-6">
            {registrationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{registrationError}</span>
              </div>
            )}

            <form onSubmit={formik.handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.fullName')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.name}
                      className={`pl-10 block w-full px-3 py-2 border ${
                        formik.touched.name && formik.errors.name
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="John Doe"
                    />
                  </div>
                  {formik.touched.name && formik.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.email')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.email}
                      className={`pl-10 block w-full px-3 py-2 border ${
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

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.phone')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.phone}
                      className={`pl-10 block w-full px-3 py-2 border ${
                        formik.touched.phone && formik.errors.phone
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="9876543210"
                    />
                  </div>
                  {formik.touched.phone && formik.errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.phone}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.dob')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.dateOfBirth}
                      className={`pl-10 block w-full px-3 py-2 border ${
                        formik.touched.dateOfBirth && formik.errors.dateOfBirth
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                    />
                  </div>
                  {formik.touched.dateOfBirth && formik.errors.dateOfBirth && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.dateOfBirth}</p>
                  )}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.address')}
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.address}
                      className={`pl-10 block w-full px-3 py-2 border ${
                        formik.touched.address && formik.errors.address
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="Full address with pincode"
                    />
                  </div>
                  {formik.touched.address && formik.errors.address && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.address}</p>
                  )}
                </div>

                {/* Role-specific fields */}
                {formik.values.role === 'patient' ? (
                  <div className="md:col-span-2">
                    <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('register.aadhaar')}
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CreditCard className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="aadhaarNumber"
                        name="aadhaarNumber"
                        type="text"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.aadhaarNumber}
                        className={`pl-10 block w-full px-3 py-2 border ${
                          formik.touched.aadhaarNumber && formik.errors.aadhaarNumber
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                        placeholder="12-digit Aadhaar number"
                      />
                    </div>
                    {formik.touched.aadhaarNumber && formik.errors.aadhaarNumber && (
                      <p className="mt-1 text-sm text-red-600">{formik.errors.aadhaarNumber}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {t('register.aadhaarPrivacy')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('register.medicalLicense')}
                      </label>
                      <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                          </div>
                        <input
                          id="licenseNumber"
                          name="licenseNumber"
                          type="text"
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          value={formik.values.licenseNumber}
                          className={`pl-10 block w-full px-3 py-2 border ${
                            formik.touched.licenseNumber && formik.errors.licenseNumber
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                          placeholder="MCI-XXXXX"
                        />
                      </div>
                      {formik.touched.licenseNumber && formik.errors.licenseNumber && (
                        <p className="mt-1 text-sm text-red-600">{formik.errors.licenseNumber}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('register.specialization')}
                      </label>
                      <select
                        id="specialization"
                        name="specialization"
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        value={formik.values.specialization}
                        className={`block w-full px-3 py-2 border ${
                          formik.touched.specialization && formik.errors.specialization
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      >
                        <option value="">{t('register.selectSpecialization')}</option>
                        {specializations.map((spec) => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                      {formik.touched.specialization && formik.errors.specialization && (
                        <p className="mt-1 text-sm text-red-600">{formik.errors.specialization}</p>
                      )}
                    </div>
                  </>
                )}

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.password}
                      className={`pl-10 pr-10 block w-full px-3 py-2 border ${
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

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('register.confirmPassword')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.confirmPassword}
                      className={`pl-10 pr-10 block w-full px-3 py-2 border ${
                        formik.touched.confirmPassword && formik.errors.confirmPassword
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                      } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                      )}
                    </button>
                  </div>
                  {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  {t('register.agreeTerms')}{' '}
                  <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                    {t('register.terms')}
                  </Link>{' '}
                  {t('register.and')}{' '}
                  <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                    {t('register.privacy')}
                  </Link>
                </label>
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
                      {t('register.creatingAccount')}
                    </div>
                  ) : (
                    t('register.createAccount')
                  )}
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {t('register.alreadyHaveAccount')}{' '}
                  <Link
                    to="/login"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    {t('register.signIn')}
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Government Verification Info */}
          <div className="px-6 py-4 bg-blue-50 border-t">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-blue-800">
                {t('register.governmentVerified')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;