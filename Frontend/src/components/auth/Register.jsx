// src/components/auth/Register.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  AlertCircle,
  Stethoscope,
  Heart,
  Shield,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Phone,
  Building,
  GraduationCap,
  Clock,
  IndianRupee,
} from 'lucide-react';

const Register = ({ onSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { registerPatient, registerDoctor, user, isAuthenticated } = useAuth();

  // Get role from navigation state (set in RoleSelectScreen)
  const selectedRole = location.state?.role || 'patient';

  const [registrationError, setRegistrationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Get pending phone from localStorage (set during OTP verification)
  const pendingPhone = localStorage.getItem('mediconnect_pending_phone') || '';

  // Redirect if no pending phone (user didn't go through OTP)
  useEffect(() => {
    if (!pendingPhone) {
      navigate('/login', { replace: true });
    }
  }, [pendingPhone, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const homePath = user.role === 'doctor' ? '/doctor/home' : '/patient/home';
      navigate(homePath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Patient validation schema
  const patientValidationSchema = Yup.object({
    full_name: Yup.string()
      .min(2, t('register.nameMin', 'Name must be at least 2 characters'))
      .required(t('register.nameRequired', 'Full name is required')),
    email: Yup.string()
      .email(t('register.emailInvalid', 'Please enter a valid email'))
      .optional(),
    date_of_birth: Yup.date()
      .max(new Date(), t('register.dobInvalid', 'Date of birth cannot be in the future'))
      .required(t('register.dobRequired', 'Date of birth is required')),
    gender: Yup.string()
      .oneOf(['male', 'female', 'other'], t('register.genderInvalid', 'Please select a valid gender'))
      .required(t('register.genderRequired', 'Gender is required')),
    address: Yup.string()
      .min(10, t('register.addressMin', 'Address must be at least 10 characters'))
      .optional(),
    district: Yup.string()
      .optional(),
    state: Yup.string()
      .optional(),
    pincode: Yup.string()
      .matches(/^[0-9]{6}$/, t('register.pincodeInvalid', 'Enter a valid 6-digit pincode'))
      .optional(),
    emergency_contact_name: Yup.string()
      .optional(),
    emergency_contact_phone: Yup.string()
      .matches(/^[6-9][0-9]{9}$/, t('register.phoneInvalid', 'Enter a valid 10-digit mobile number'))
      .optional(),
    blood_group: Yup.string()
      .optional(),
    aadhaar_number: Yup.string()
      .matches(/^[0-9]{12}$/, t('register.aadhaarInvalid', 'Enter a valid 12-digit Aadhaar number'))
      .optional(),
  });

  // Doctor validation schema
  const doctorValidationSchema = Yup.object({
    full_name: Yup.string()
      .min(2, t('register.nameMin', 'Name must be at least 2 characters'))
      .required(t('register.nameRequired', 'Full name is required')),
    email: Yup.string()
      .email(t('register.emailInvalid', 'Please enter a valid email'))
      .required(t('register.emailRequired', 'Email is required for doctors')),
    date_of_birth: Yup.date()
      .max(new Date(), t('register.dobInvalid', 'Date of birth cannot be in the future'))
      .required(t('register.dobRequired', 'Date of birth is required')),
    gender: Yup.string()
      .oneOf(['male', 'female', 'other'], t('register.genderInvalid', 'Please select a valid gender'))
      .required(t('register.genderRequired', 'Gender is required')),
    license_number: Yup.string()
      .min(5, t('register.licenseMin', 'License number must be at least 5 characters'))
      .required(t('register.licenseRequired', 'Medical license number is required')),
    specialization: Yup.string()
      .required(t('register.specializationRequired', 'Specialization is required')),
    qualification: Yup.string()
      .required(t('register.qualificationRequired', 'Qualification is required')),
    experience_years: Yup.number()
      .min(0, t('register.experienceMin', 'Experience cannot be negative'))
      .max(60, t('register.experienceMax', 'Please enter a valid experience'))
      .required(t('register.experienceRequired', 'Years of experience is required')),
    consultation_fee: Yup.number()
      .min(0, t('register.feeMin', 'Fee cannot be negative'))
      .required(t('register.feeRequired', 'Consultation fee is required')),
    hospital_name: Yup.string()
      .optional(),
    hospital_address: Yup.string()
      .optional(),
    district: Yup.string()
      .optional(),
    state: Yup.string()
      .optional(),
    bio: Yup.string()
      .max(500, t('register.bioMax', 'Bio cannot exceed 500 characters'))
      .optional(),
  });

  // Patient initial values
  const patientInitialValues = {
    full_name: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: '',
    district: '',
    state: '',
    pincode: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_group: '',
    aadhaar_number: '',
  };

  // Doctor initial values
  const doctorInitialValues = {
    full_name: '',
    email: '',
    date_of_birth: '',
    gender: '',
    license_number: '',
    specialization: '',
    qualification: '',
    experience_years: '',
    consultation_fee: '',
    hospital_name: '',
    hospital_address: '',
    district: '',
    state: '',
    bio: '',
  };

  const formik = useFormik({
    initialValues: selectedRole === 'doctor' ? doctorInitialValues : patientInitialValues,
    validationSchema: selectedRole === 'doctor' ? doctorValidationSchema : patientValidationSchema,
    onSubmit: async (values) => {
      setIsLoading(true);
      setRegistrationError('');

      try {
        let result;

        if (selectedRole === 'doctor') {
          result = await registerDoctor(values);
        } else {
          result = await registerPatient(values);
        }

        if (result.success) {
          if (onSuccess) {
            onSuccess();
          }
          // Navigation is handled by AuthContext
        } else {
          setRegistrationError(result.error || t('register.genericError', 'Registration failed. Please try again.'));
        }
      } catch (err) {
        setRegistrationError(t('register.genericError', 'Registration failed. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    },
  });

  // Specializations list
  const specializations = [
    { value: 'general_physician', label: 'General Physician' },
    { value: 'cardiologist', label: 'Cardiologist' },
    { value: 'dermatologist', label: 'Dermatologist' },
    { value: 'pediatrician', label: 'Pediatrician' },
    { value: 'gynecologist', label: 'Gynecologist' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'psychiatrist', label: 'Psychiatrist' },
    { value: 'dentist', label: 'Dentist' },
    { value: 'ent', label: 'ENT Specialist' },
    { value: 'ophthalmologist', label: 'Ophthalmologist' },
    { value: 'neurologist', label: 'Neurologist' },
    { value: 'ayurveda', label: 'Ayurveda' },
    { value: 'homeopathy', label: 'Homeopathy' },
    { value: 'other', label: 'Other' },
  ];

  // Qualifications list
  const qualifications = [
    'MBBS',
    'MD',
    'MS',
    'MBBS, MD',
    'MBBS, MS',
    'BDS',
    'MDS',
    'BAMS',
    'BHMS',
    'Other',
  ];

  // Blood groups
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // States list (Indian states)
  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh',
  ];

  // Format phone for display
  const formatPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) {
      return `+91 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return phone;
  };

  // Total steps
  const totalSteps = selectedRole === 'doctor' ? 3 : 2;

  // Check if current step is valid
  const isStepValid = () => {
    if (selectedRole === 'patient') {
      if (currentStep === 1) {
        return !formik.errors.full_name && !formik.errors.date_of_birth && !formik.errors.gender &&
               formik.values.full_name && formik.values.date_of_birth && formik.values.gender;
      }
      return true;
    } else {
      if (currentStep === 1) {
        return !formik.errors.full_name && !formik.errors.email && !formik.errors.date_of_birth && !formik.errors.gender &&
               formik.values.full_name && formik.values.email && formik.values.date_of_birth && formik.values.gender;
      }
      if (currentStep === 2) {
        return !formik.errors.license_number && !formik.errors.specialization && !formik.errors.qualification &&
               !formik.errors.experience_years && !formik.errors.consultation_fee &&
               formik.values.license_number && formik.values.specialization && formik.values.qualification &&
               formik.values.experience_years !== '' && formik.values.consultation_fee !== '';
      }
      return true;
    }
  };

  // Render Patient Form
  const renderPatientForm = () => (
    <>
      {currentStep === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('register.basicInfo', 'Basic Information')}
          </h3>

          {/* Phone Display (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.phone', 'Mobile Number')}
            </label>
            <div className="flex items-center px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
              <Phone className="h-5 w-5 text-gray-500 mr-3" />
              <span className="text-gray-700 font-medium">{formatPhone(pendingPhone)}</span>
              <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
            </div>
            <p className="mt-1 text-xs text-green-600">
              {t('register.phoneVerified', 'Phone number verified')}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.fullName', 'Full Name')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoFocus
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.full_name}
                placeholder={t('register.fullNamePlaceholder', 'Enter your full name')}
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.full_name && formik.errors.full_name
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.full_name && formik.errors.full_name && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.full_name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.dob', 'Date of Birth')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.date_of_birth}
                max={new Date().toISOString().split('T')[0]}
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.date_of_birth && formik.errors.date_of_birth
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.date_of_birth && formik.errors.date_of_birth && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.date_of_birth}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.gender', 'Gender')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['male', 'female', 'other'].map((gender) => (
                <button
                  key={gender}
                  type="button"
                  onClick={() => formik.setFieldValue('gender', gender)}
                  className={`py-3 px-4 border-2 rounded-lg text-sm font-medium transition-all ${
                    formik.values.gender === gender
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t(`register.gender_${gender}`, gender.charAt(0).toUpperCase() + gender.slice(1))}
                </button>
              ))}
            </div>
            {formik.touched.gender && formik.errors.gender && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.gender}</p>
            )}
          </div>

          {/* Email (Optional) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.email', 'Email')} <span className="text-gray-400 text-xs">(Optional)</span>
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
                placeholder={t('register.emailPlaceholder', 'your@email.com')}
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.email}</p>
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('register.additionalInfo', 'Additional Information')}
            <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
          </h3>

          {/* Blood Group */}
          <div>
            <label htmlFor="blood_group" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.bloodGroup', 'Blood Group')}
            </label>
            <select
              id="blood_group"
              name="blood_group"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.blood_group}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">{t('register.selectBloodGroup', 'Select Blood Group')}</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.address', 'Address')}
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="address"
                name="address"
                rows="2"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.address}
                placeholder={t('register.addressPlaceholder', 'Enter your full address')}
                className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* State & District */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.state', 'State')}
              </label>
              <select
                id="state"
                name="state"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.state}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">{t('register.selectState', 'Select State')}</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.pincode', 'Pincode')}
              </label>
              <input
                id="pincode"
                name="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.pincode}
                placeholder="123456"
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-sm font-medium text-red-800 mb-3">
              🚨 {t('register.emergencyContact', 'Emergency Contact')}
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('register.emergencyContactName', 'Contact Name')}
                </label>
                <input
                  id="emergency_contact_name"
                  name="emergency_contact_name"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.emergency_contact_name}
                  placeholder={t('register.emergencyContactNamePlaceholder', 'Family member name')}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('register.emergencyContactPhone', 'Contact Phone')}
                </label>
                <input
                  id="emergency_contact_phone"
                  name="emergency_contact_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.emergency_contact_phone}
                  placeholder="9876543210"
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Aadhaar Number */}
          <div>
            <label htmlFor="aadhaar_number" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.aadhaar', 'Aadhaar Number')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="aadhaar_number"
                name="aadhaar_number"
                type="text"
                inputMode="numeric"
                maxLength={12}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.aadhaar_number}
                placeholder="XXXX XXXX XXXX"
                className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t('register.aadhaarPrivacy', 'Your Aadhaar is encrypted and used only for identity verification')}
            </p>
          </div>
        </div>
      )}
    </>
  );

  // Render Doctor Form
  const renderDoctorForm = () => (
    <>
      {currentStep === 1 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('register.basicInfo', 'Basic Information')}
          </h3>

          {/* Phone Display (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.phone', 'Mobile Number')}
            </label>
            <div className="flex items-center px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
              <Phone className="h-5 w-5 text-gray-500 mr-3" />
              <span className="text-gray-700 font-medium">{formatPhone(pendingPhone)}</span>
              <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.fullName', 'Full Name')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoFocus
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.full_name}
                placeholder="Dr. John Doe"
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.full_name && formik.errors.full_name
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.full_name && formik.errors.full_name && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.email', 'Email')} <span className="text-red-500">*</span>
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
                placeholder="doctor@hospital.com"
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.email && formik.errors.email
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.email}</p>
            )}
          </div>

          {/* Date of Birth & Gender */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.dob', 'Date of Birth')} <span className="text-red-500">*</span>
              </label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.date_of_birth}
                max={new Date().toISOString().split('T')[0]}
                className={`block w-full px-4 py-3 border ${
                  formik.touched.date_of_birth && formik.errors.date_of_birth
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
              {formik.touched.date_of_birth && formik.errors.date_of_birth && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.date_of_birth}</p>
              )}
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.gender', 'Gender')} <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.gender}
                className={`block w-full px-4 py-3 border ${
                  formik.touched.gender && formik.errors.gender
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {formik.touched.gender && formik.errors.gender && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.gender}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('register.professionalInfo', 'Professional Information')}
          </h3>

          {/* License Number */}
          <div>
            <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.medicalLicense', 'Medical License Number')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="license_number"
                name="license_number"
                type="text"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.license_number}
                placeholder="MCI-XXXXX or State-XXXXX"
                className={`pl-10 block w-full px-4 py-3 border ${
                  formik.touched.license_number && formik.errors.license_number
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
              />
            </div>
            {formik.touched.license_number && formik.errors.license_number && (
              <p className="mt-2 text-sm text-red-600">{formik.errors.license_number}</p>
            )}
          </div>

          {/* Specialization & Qualification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.specialization', 'Specialization')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Stethoscope className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="specialization"
                  name="specialization"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.specialization}
                  className={`pl-10 block w-full px-4 py-3 border ${
                    formik.touched.specialization && formik.errors.specialization
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
                >
                  <option value="">{t('register.selectSpecialization', 'Select')}</option>
                  {specializations.map((spec) => (
                    <option key={spec.value} value={spec.value}>{spec.label}</option>
                  ))}
                </select>
              </div>
              {formik.touched.specialization && formik.errors.specialization && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.specialization}</p>
              )}
            </div>
            <div>
              <label htmlFor="qualification" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.qualification', 'Qualification')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="qualification"
                  name="qualification"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.qualification}
                  className={`pl-10 block w-full px-4 py-3 border ${
                    formik.touched.qualification && formik.errors.qualification
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
                >
                  <option value="">Select</option>
                  {qualifications.map((qual) => (
                    <option key={qual} value={qual}>{qual}</option>
                  ))}
                </select>
              </div>
              {formik.touched.qualification && formik.errors.qualification && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.qualification}</p>
              )}
            </div>
          </div>

          {/* Experience & Fee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="experience_years" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.experience', 'Experience (Years)')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="experience_years"
                  name="experience_years"
                  type="number"
                  min="0"
                  max="60"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.experience_years}
                  placeholder="5"
                  className={`pl-10 block w-full px-4 py-3 border ${
                    formik.touched.experience_years && formik.errors.experience_years
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
                />
              </div>
              {formik.touched.experience_years && formik.errors.experience_years && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.experience_years}</p>
              )}
            </div>
            <div>
              <label htmlFor="consultation_fee" className="block text-sm font-medium text-gray-700 mb-2">
                {t('register.consultationFee', 'Consultation Fee')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="consultation_fee"
                  name="consultation_fee"
                  type="number"
                  min="0"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.consultation_fee}
                  placeholder="500"
                  className={`pl-10 block w-full px-4 py-3 border ${
                    formik.touched.consultation_fee && formik.errors.consultation_fee
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  } rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 sm:text-sm transition-colors`}
                />
              </div>
              {formik.touched.consultation_fee && formik.errors.consultation_fee && (
                <p className="mt-2 text-sm text-red-600">{formik.errors.consultation_fee}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('register.practiceInfo', 'Practice Information')}
            <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
          </h3>

          {/* Hospital Name */}
          <div>
            <label htmlFor="hospital_name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.hospitalName', 'Hospital/Clinic Name')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="hospital_name"
                name="hospital_name"
                type="text"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.hospital_name}
                placeholder="City Hospital"
                className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Hospital Address */}
          <div>
            <label htmlFor="hospital_address" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.hospitalAddress', 'Hospital/Clinic Address')}
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <textarea
                id="hospital_address"
                name="hospital_address"
                rows="2"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.hospital_address}
                placeholder="Full address of your practice"
                className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.state', 'State')}
            </label>
            <select
              id="state"
              name="state"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.state}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              {t('register.bio', 'About You')}
            </label>
            <textarea
              id="bio"
              name="bio"
              rows="3"
              maxLength={500}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.bio}
              placeholder="Brief description about your practice and expertise..."
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {formik.values.bio.length}/500
            </p>
          </div>

          {/* Verification Note */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>⚠️ {t('register.verificationNote', 'Note:')}</strong>{' '}
              {t('register.verificationNoteText', 'Your medical credentials will be verified before your profile goes live. This may take 1-2 business days.')}
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${
            selectedRole === 'doctor'
              ? 'bg-gradient-to-r from-green-500 to-teal-500'
              : 'bg-gradient-to-r from-blue-500 to-teal-500'
          }`}>
            {selectedRole === 'doctor' ? (
              <Stethoscope className="h-8 w-8 text-white" aria-hidden="true" />
            ) : (
              <Heart className="h-8 w-8 text-white" aria-hidden="true" />
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedRole === 'doctor'
            ? t('register.doctorTitle', 'Doctor Registration')
            : t('register.patientTitle', 'Patient Registration')
          }
        </h2>
        <p className="text-gray-600 text-sm mt-2">
          {t('register.subtitle', 'Complete your profile to get started')}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <React.Fragment key={step}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step < currentStep
                    ? 'bg-green-500 text-white'
                    : step === currentStep
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step
                )}
              </div>
              {step < totalSteps && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 mt-2">
          {t('register.step', 'Step')} {currentStep} {t('register.of', 'of')} {totalSteps}
        </p>
      </div>

      {/* Error Alert */}
      {registrationError && (
        <div
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-red-700 text-sm">{registrationError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={formik.handleSubmit}>
        {selectedRole === 'doctor' ? renderDoctorForm() : renderPatientForm()}

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              {t('register.back', 'Back')}
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => {
                // Touch all fields in current step for validation
                if (selectedRole === 'patient') {
                  if (currentStep === 1) {
                    formik.setTouched({
                      full_name: true,
                      date_of_birth: true,
                      gender: true,
                      email: true,
                    });
                  }
                } else {
                  if (currentStep === 1) {
                    formik.setTouched({
                      full_name: true,
                      email: true,
                      date_of_birth: true,
                      gender: true,
                    });
                  } else if (currentStep === 2) {
                    formik.setTouched({
                      license_number: true,
                      specialization: true,
                      qualification: true,
                      experience_years: true,
                      consultation_fee: true,
                    });
                  }
                }

                if (isStepValid()) {
                  setCurrentStep(currentStep + 1);
                }
              }}
              disabled={!isStepValid()}
              className={`flex-1 py-3 px-4 rounded-lg text-white font-medium transition-all ${
                isStepValid()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {t('register.next', 'Next')}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-medium transition-all ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  {t('register.creating', 'Creating Account...')}
                </>
              ) : (
                t('register.createAccount', 'Create Account')
              )}
            </button>
          )}
        </div>

        {/* Terms */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          {t('register.termsText', 'By creating an account, you agree to our')}{' '}
          <Link to="/terms" className="text-blue-600 hover:underline">
            {t('register.terms', 'Terms')}
          </Link>{' '}
          {t('register.and', 'and')}{' '}
          <Link to="/privacy" className="text-blue-600 hover:underline">
            {t('register.privacy', 'Privacy Policy')}
          </Link>
        </p>

        {/* Government Badge */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <div className="flex items-center justify-center">
            <Shield className="h-4 w-4 text-blue-600 mr-2" aria-hidden="true" />
            <p className="text-xs text-blue-800">
              {t('register.governmentVerified', 'Government Verified Healthcare Platform')}
            </p>
          </div>
        </div>
      </form>

      {/* Back to Role Selection */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => navigate('/select-role', { replace: true })}
          className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
        >
          ← {t('register.changeRole', 'Change role selection')}
        </button>
      </div>

      {/* Login Link */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {t('register.alreadyHaveAccount', 'Already have an account?')}{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            {t('register.signIn', 'Sign In')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;