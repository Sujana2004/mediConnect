// src/pages/doctor/Profile.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  User, Mail, Phone, MapPin, Calendar, Camera, Edit2, X, Check, AlertCircle,
  Shield, Briefcase, GraduationCap, Building, Globe, Settings, Lock, Bell,
  LogOut, ChevronRight, Upload, Trash2, Stethoscope, Languages, IndianRupee,
  CheckCircle, Plus, Pencil, Star, Sparkles, Clock, Award, RefreshCw, Loader2,
  CalendarOff
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/api';
import api from '../../config/api';
import {
  Card, Button, Badge, Avatar, Loader, EmptyState, Modal, Input, TextArea, Select
} from '../../components/common';
import toast from 'react-hot-toast';

// ============================================================================
// HELPERS
// ============================================================================

const normalizeProfileResponse = (apiData) => {
  if (!apiData) return null;

  const userData = apiData.user || apiData;
  const doctorProfile = apiData.profile || {};

  return {
    id: userData.id,
    first_name: userData.first_name || '',
    last_name: userData.last_name || '',
    full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Doctor',
    email: userData.email || '',
    phone: userData.phone || '',
    gender: userData.gender || '',
    date_of_birth: userData.date_of_birth || '',
    profile_photo: userData.profile_photo || null,
    preferred_language: userData.preferred_language || 'en',
    address: userData.address || '',
    
    registration_number: doctorProfile.registration_number || '',
    registration_council: doctorProfile.registration_council || '',
    specialization: doctorProfile.specialization || '',
    specialization_display: doctorProfile.specialization_display || doctorProfile.specialization || '',
    qualification: doctorProfile.qualification || '',
    experience_years: doctorProfile.experience_years || 0,
    hospital_name: doctorProfile.hospital_name || '',
    hospital_address: doctorProfile.hospital_address || '',
    consultation_fee: doctorProfile.consultation_fee || 0,
    consultation_duration: doctorProfile.consultation_duration || 15,
    languages_spoken: doctorProfile.languages_spoken || [],
    bio: doctorProfile.bio || '',
    is_available_online: doctorProfile.is_available_online ?? true,
    
    average_rating: parseFloat(doctorProfile.average_rating) || 0,
    total_reviews: doctorProfile.total_reviews || 0,
    total_consultations: doctorProfile.total_consultations || 0,
    
    verification_status: doctorProfile.verification_status || 'pending',
    is_verified: doctorProfile.verification_status === 'verified',
  };
};

const unwrapResponse = (response) => {
  if (response && typeof response === 'object' && 'data' in response && 'success' in response) {
    return response.data;
  }
  return response;
};

const buildUpdatePayload = (formData) => {
  const payload = {};

  if (formData.first_name !== undefined) payload.first_name = formData.first_name;
  if (formData.last_name !== undefined) payload.last_name = formData.last_name;
  if (formData.gender !== undefined) payload.gender = formData.gender;
  if (formData.date_of_birth !== undefined) payload.date_of_birth = formData.date_of_birth;
  if (formData.address !== undefined) payload.address = formData.address;

  if (formData.specialization !== undefined) payload.specialization = formData.specialization;
  if (formData.qualification !== undefined) payload.qualification = formData.qualification;
  if (formData.experience_years !== undefined) payload.experience_years = parseInt(formData.experience_years) || 0;
  if (formData.hospital_name !== undefined) payload.hospital_name = formData.hospital_name;
  if (formData.hospital_address !== undefined) payload.hospital_address = formData.hospital_address;
  if (formData.consultation_fee !== undefined) payload.consultation_fee = parseFloat(formData.consultation_fee) || 0;
  if (formData.consultation_duration !== undefined) payload.consultation_duration = parseInt(formData.consultation_duration) || 15;
  if (formData.languages_spoken !== undefined) payload.languages_spoken = formData.languages_spoken;
  if (formData.bio !== undefined) payload.bio = formData.bio;
  if (formData.is_available_online !== undefined) payload.is_available_online = formData.is_available_online;

  return payload;
};

const getGenderLabel = (gender, t) => {
  if (!gender) return null;
  const genderMap = {
    male: t('common.male', 'Male'),
    female: t('common.female', 'Female'),
    other: t('common.other', 'Other')
  };
  return genderMap[gender] || gender;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });
};

// ============================================================================
// CONSTANTS
// ============================================================================

const SPECIALIZATIONS = [
  { value: 'general', label: 'General Physician' },
  { value: 'pediatrics', label: 'Pediatrics' },
  { value: 'gynecology', label: 'Gynecology' },
  { value: 'orthopedics', label: 'Orthopedics' },
  { value: 'dermatology', label: 'Dermatology' },
  { value: 'ent', label: 'ENT' },
  { value: 'ophthalmology', label: 'Ophthalmology' },
  { value: 'cardiology', label: 'Cardiology' },
  { value: 'neurology', label: 'Neurology' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'dentistry', label: 'Dentistry' },
  { value: 'ayurveda', label: 'Ayurveda' },
  { value: 'homeopathy', label: 'Homeopathy' },
  { value: 'other', label: 'Other' }
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'te', label: 'Telugu' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'gu', label: 'Gujarati' },
  { value: 'pa', label: 'Punjabi' }
];

const APP_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' }
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const VerificationBadge = ({ status }) => {
  const { t } = useTranslation();
  
  const statusConfig = {
    verified: { 
      bg: 'bg-emerald-100', 
      text: 'text-emerald-700',
      border: 'border border-emerald-200',
      icon: CheckCircle,
      label: t('doctor.verified', 'Verified')
    },
    pending: { 
      bg: 'bg-amber-100', 
      text: 'text-amber-700',
      border: 'border border-amber-200',
      icon: Clock,
      label: t('doctor.pendingVerification', 'Pending')
    },
    rejected: { 
      bg: 'bg-red-100', 
      text: 'text-red-700',
      border: 'border border-red-200',
      icon: X,
      label: t('doctor.rejected', 'Rejected')
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

const ProfileHeader = ({ profile, onEditPhoto, isUploading }) => {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden">
      <div className="h-36 sm:h-44 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 relative">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/[0.07]" />
        <div className="absolute top-16 -left-10 w-32 h-32 rounded-full bg-white/[0.05]" />
        <div className="absolute bottom-4 right-16 w-16 h-16 rounded-full bg-white/[0.06]" />
      </div>

      <div className="px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-violet-900/10 p-4 sm:p-6 border border-violet-100/30">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="relative -mt-16 sm:-mt-20">
              <div className="ring-4 ring-white rounded-full shadow-lg">
                <Avatar
                  src={profile?.profile_photo}
                  name={profile?.full_name || 'Doctor'}
                  size="2xl"
                />
              </div>
              <button
                onClick={onEditPhoto}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 bg-violet-600 rounded-full text-white hover:bg-violet-700 shadow-lg transition-all ring-2 ring-white disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Dr. {profile?.first_name} {profile?.last_name}
                </h1>
                <VerificationBadge status={profile?.verification_status} />
              </div>
              
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-gray-500">
                <Stethoscope className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">
                  {profile?.specialization_display || profile?.specialization || t('doctor.specialist')}
                </span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3">
                {profile?.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-700">
                      {profile.average_rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({profile.total_reviews})
                    </span>
                  </div>
                )}
                {profile?.experience_years > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Briefcase className="w-4 h-4" />
                    <span>{profile.experience_years} yrs</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100/50">
              <p className="text-xl sm:text-2xl font-bold text-violet-600">
                {profile?.total_consultations || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Consultations</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100/50">
              <p className="text-xl sm:text-2xl font-bold text-emerald-600">
                {profile?.experience_years || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Years Exp</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100/50">
              <p className="text-xl sm:text-2xl font-bold text-amber-600">
                {profile?.average_rating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Rating</p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100/50">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                ₹{profile?.consultation_fee || 0}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Fee</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value, iconBg = 'bg-gray-100', iconColor = 'text-gray-600' }) => (
  <div className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-colors">
    <div className={`p-2.5 rounded-xl ${iconBg}`}>
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
    </div>
  </div>
);

const Section = ({ title, icon: Icon, iconBg, iconColor, onEdit, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-4 sm:px-5 py-4 border-b border-gray-50 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`p-2 rounded-xl ${iconBg || 'bg-violet-50'}`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor || 'text-violet-600'}`} />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-gray-900">{title}</h3>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
    </div>
    <div className="p-4 sm:p-5">
      {children}
    </div>
  </div>
);

const SettingsMenuItem = ({ icon: Icon, label, description, onClick, variant = 'default', rightContent }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl text-left transition-all ${
      variant === 'danger' ? 'hover:bg-red-50' : 'hover:bg-gray-50'
    }`}
  >
    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
      variant === 'danger' ? 'bg-red-50' : 'bg-violet-50'
    }`}>
      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
        variant === 'danger' ? 'text-red-500' : 'text-violet-600'
      }`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-semibold ${
        variant === 'danger' ? 'text-red-600' : 'text-gray-900'
      }`}>
        {label}
      </p>
      {description && (
        <p className="text-xs text-gray-400 truncate">{description}</p>
      )}
    </div>
    {rightContent || (
      <ChevronRight className={`w-4 h-4 flex-shrink-0 ${
        variant === 'danger' ? 'text-red-300' : 'text-gray-300'
      }`} />
    )}
  </button>
);

const LanguageSelector = ({ currentLanguage, onChange, isChanging }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-50">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <h3 className="text-sm sm:text-base font-bold text-gray-900">
          {t('settings.appLanguage', 'App Language')}
        </h3>
        {isChanging && (
          <Loader2 className="w-4 h-4 text-violet-500 animate-spin ml-auto" />
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2">
          {APP_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onChange(lang.code)}
              disabled={isChanging}
              className={`p-3 rounded-xl text-center transition-all disabled:opacity-50 ${
                currentLanguage === lang.code
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="block text-sm font-bold">{lang.nativeName}</span>
              <span className={`block text-xs mt-0.5 ${
                currentLanguage === lang.code ? 'text-violet-200' : 'text-gray-400'
              }`}>
                {lang.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const AvailabilitySection = ({ availabilities, onAdd, onEdit, onDelete, isLoading }) => {
  const { t } = useTranslation();

  const groupedByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    // appointments app uses 'is_active' instead of 'is_available'
    slots: (availabilities || []).filter(a => a.day_of_week === day.value)
  }));

  return (
    <Section
      title={t('doctor.availability', 'Availability')}
      icon={Clock}
      iconBg="bg-indigo-50"
      iconColor="text-indigo-600"
      onEdit={onAdd}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      ) : availabilities?.length > 0 ? (
        <div className="space-y-3">
          {groupedByDay.filter(day => day.slots.length > 0).map((day) => (
            <div key={day.value} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{day.label}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {day.slots.map((slot) => {
                  // Handle both 'is_active' (appointments) and 'is_available' (users)
                  const isActive = slot.is_active ?? slot.is_available ?? true;
                  return (
                    <div
                      key={slot.id}
                      className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 group"
                    >
                      <span className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                      </span>
                      {!isActive && (
                        <Badge variant="secondary" size="sm" className="!text-xs !py-0 !px-1.5 !bg-gray-100 !text-gray-500">
                          Off
                        </Badge>
                      )}
                      <button
                        onClick={() => onEdit(slot)}
                        className="p-1 text-gray-400 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDelete(slot)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('doctor.noAvailability', 'No availability set')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t('doctor.addAvailabilityDesc', 'Add your consultation hours')}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 !border-indigo-200 !text-indigo-600 hover:!bg-indigo-50"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('doctor.addSlot', 'Add Time Slot')}
          </Button>
        </div>
      )}
    </Section>
  );
};

const LeaveSection = ({ leaves, onAdd, onDelete, isLoading }) => {
  const { t } = useTranslation();

  // appointments app uses 'exception_date', users app uses 'date'
  const sortedLeaves = [...(leaves || [])].sort((a, b) => 
    new Date(a.exception_date || a.date) - new Date(b.exception_date || b.date)
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingLeaves = sortedLeaves.filter(leave => 
    new Date(leave.exception_date || leave.date) >= today
  );
  const pastLeaves = sortedLeaves.filter(leave => 
    new Date(leave.exception_date || leave.date) < today
  );

  return (
    <Section
      title={t('doctor.leaveManagement', 'Leave / Days Off')}
      icon={CalendarOff}
      iconBg="bg-red-50"
      iconColor="text-red-600"
      onEdit={onAdd}
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      ) : leaves?.length > 0 ? (
        <div className="space-y-4">
          {upcomingLeaves.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t('doctor.upcomingLeaves', 'Upcoming')}
              </p>
              <div className="space-y-2">
                {upcomingLeaves.map((leave) => {
                  // Handle both field naming conventions
                  const leaveDate = leave.exception_date || leave.date;
                  const isFullDay = leave.exception_type === 'leave' || leave.is_full_day;
                  
                  return (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <CalendarOff className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(leaveDate)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {isFullDay ? (
                              t('doctor.fullDay', 'Full Day')
                            ) : (
                              `${leave.start_time?.slice(0, 5)} - ${leave.end_time?.slice(0, 5)}`
                            )}
                            {leave.reason && ` • ${leave.reason}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => onDelete(leave)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pastLeaves.length > 0 && (
            <details className="group">
              <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 cursor-pointer list-none flex items-center gap-1">
                {t('doctor.pastLeaves', 'Past Leaves')} ({pastLeaves.length})
                <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
              </summary>
              <div className="space-y-2 mt-2">
                {pastLeaves.slice(0, 5).map((leave) => {
                  const leaveDate = leave.exception_date || leave.date;
                  
                  return (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <CalendarOff className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">
                            {formatDate(leaveDate)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {leave.reason || t('doctor.noReason', 'No reason specified')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <CalendarOff className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            {t('doctor.noLeaves', 'No leaves scheduled')}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t('doctor.addLeaveDesc', 'Mark days when you are unavailable')}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 !border-red-200 !text-red-600 hover:!bg-red-50"
            onClick={onAdd}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('doctor.addLeave', 'Add Leave')}
          </Button>
        </div>
      )}
    </Section>
  );
};

const AvailabilityModal = ({ isOpen, onClose, slot, onSave, onDelete, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    day_of_week: 0,
    start_time: '09:00',
    end_time: '17:00',
    slot_duration_minutes: 30,  // appointments app field name
    max_patients_per_slot: 1,   // appointments app field name
    is_active: true,            // appointments app field name
  });

  useEffect(() => {
    if (isOpen) {
      if (slot) {
        setFormData({
          day_of_week: slot.day_of_week ?? 0,
          start_time: slot.start_time?.slice(0, 5) || '09:00',
          end_time: slot.end_time?.slice(0, 5) || '17:00',
          // Handle both field names
          slot_duration_minutes: slot.slot_duration_minutes || slot.slot_duration || 30,
          max_patients_per_slot: slot.max_patients_per_slot || slot.max_appointments || 1,
          is_active: slot.is_active ?? slot.is_available ?? true,
        });
      } else {
        setFormData({
          day_of_week: 0,
          start_time: '09:00',
          end_time: '17:00',
          slot_duration_minutes: 30,
          max_patients_per_slot: 1,
          is_active: true,
        });
      }
    }
  }, [isOpen, slot]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Send with appointments app field names
    onSave({
      day_of_week: parseInt(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      slot_duration_minutes: formData.slot_duration_minutes,
      max_patients_per_slot: formData.max_patients_per_slot,
      is_active: formData.is_active,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={slot ? t('doctor.editSlot', 'Edit Time Slot') : t('doctor.addSlot', 'Add Time Slot')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={t('doctor.dayOfWeek', 'Day')}
          value={formData.day_of_week}
          onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
          options={DAYS_OF_WEEK.map(d => ({ value: d.value, label: d.label }))}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('doctor.startTime', 'Start Time')}
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
            required
          />
          <Input
            label={t('doctor.endTime', 'End Time')}
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={t('doctor.slotDuration', 'Slot Duration')}
            value={formData.slot_duration_minutes}
            onChange={(e) => setFormData(prev => ({ ...prev, slot_duration_minutes: parseInt(e.target.value) }))}
            options={[
              { value: 10, label: '10 minutes' },
              { value: 15, label: '15 minutes' },
              { value: 20, label: '20 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 45, label: '45 minutes' },
              { value: 60, label: '60 minutes' },
            ]}
          />
          <Input
            label={t('doctor.maxAppointments', 'Max Patients Per Slot')}
            type="number"
            value={formData.max_patients_per_slot}
            onChange={(e) => setFormData(prev => ({ ...prev, max_patients_per_slot: parseInt(e.target.value) || 1 }))}
            min={1}
            max={10}
          />
        </div>

        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              {t('doctor.isAvailable', 'Active')}
            </span>
            <p className="text-xs text-gray-400">
              {t('doctor.isAvailableDesc', 'Uncheck to temporarily disable this slot')}
            </p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          {slot && (
            <Button
              type="button"
              variant="outline"
              className="!text-red-600 !border-red-200 hover:!bg-red-50"
              onClick={() => onDelete(slot)}
              disabled={isSaving}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 !bg-violet-600 hover:!bg-violet-700"
            loading={isSaving}
          >
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const LeaveModal = ({ isOpen, onClose, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    exception_date: '',      // appointments app field name
    exception_type: 'leave', // appointments app field name
    reason: '',
    start_time: '09:00',
    end_time: '17:00',
  });

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      setFormData({
        exception_date: dateStr,
        exception_type: 'leave',
        reason: '',
        start_time: '09:00',
        end_time: '17:00',
      });
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payload = {
      exception_date: formData.exception_date,
      exception_type: formData.exception_type,
      reason: formData.reason,
    };

    // Only include times for modified/extra types
    if (formData.exception_type !== 'leave') {
      payload.start_time = formData.start_time;
      payload.end_time = formData.end_time;
    }

    onSave(payload);
  };

  const minDate = new Date().toISOString().split('T')[0];
  const isFullDayLeave = formData.exception_type === 'leave';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctor.addLeave', 'Add Leave / Exception')}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('doctor.leaveDate', 'Date')}
          type="date"
          value={formData.exception_date}
          onChange={(e) => setFormData(prev => ({ ...prev, exception_date: e.target.value }))}
          min={minDate}
          required
        />

        <Select
          label={t('doctor.exceptionType', 'Type')}
          value={formData.exception_type}
          onChange={(e) => setFormData(prev => ({ ...prev, exception_type: e.target.value }))}
          options={[
            { value: 'leave', label: 'Full Day Leave' },
            { value: 'modified', label: 'Modified Hours' },
            { value: 'extra', label: 'Extra Working Day' },
          ]}
        />

        <Input
          label={t('doctor.reason', 'Reason (Optional)')}
          value={formData.reason}
          onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
          placeholder={t('doctor.reasonPlaceholder', 'e.g., Personal work, Conference')}
        />

        {!isFullDayLeave && (
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('doctor.startTime', 'Start Time')}
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              required
            />
            <Input
              label={t('doctor.endTime', 'End Time')}
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              required
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 !bg-violet-600 hover:!bg-violet-700"
            loading={isSaving}
          >
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditPersonalModal = ({ isOpen, onClose, profile, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        gender: profile.gender || '',
        date_of_birth: profile.date_of_birth || '',
        address: profile.address || '',
      });
    }
  }, [isOpen, profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('doctor.editPersonalInfo', 'Edit Personal Information')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('common.firstName', 'First Name')}
            value={formData.first_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            required
          />
          <Input
            label={t('common.lastName', 'Last Name')}
            value={formData.last_name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
          />
        </div>
        <Select
          label={t('common.gender', 'Gender')}
          value={formData.gender || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
          options={[
            { value: 'male', label: t('common.male', 'Male') },
            { value: 'female', label: t('common.female', 'Female') },
            { value: 'other', label: t('common.other', 'Other') }
          ]}
        />
        <Input
          label={t('common.dateOfBirth', 'Date of Birth')}
          type="date"
          value={formData.date_of_birth || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
        />
        <TextArea
          label={t('common.address', 'Address')}
          value={formData.address || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          rows={2}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1 !bg-violet-600 hover:!bg-violet-700" loading={isSaving}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditProfessionalModal = ({ isOpen, onClose, profile, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (isOpen && profile) {
      setFormData({
        specialization: profile.specialization || '',
        qualification: profile.qualification || '',
        experience_years: profile.experience_years || '',
        hospital_name: profile.hospital_name || '',
        consultation_fee: profile.consultation_fee || '',
        consultation_duration: profile.consultation_duration || 15,
        bio: profile.bio || '',
      });
    }
  }, [isOpen, profile]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('doctor.editProfessionalInfo', 'Edit Professional Information')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={t('doctor.specialization', 'Specialization')}
          value={formData.specialization || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
          options={SPECIALIZATIONS}
        />
        <Input
          label={t('doctor.qualification', 'Qualification')}
          value={formData.qualification || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
          placeholder="e.g., MBBS, MD"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('doctor.experience', 'Experience (Years)')}
            type="number"
            value={formData.experience_years || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, experience_years: e.target.value }))}
            min={0}
            max={60}
          />
          <Input
            label={t('doctor.consultationFee', 'Fee (₹)')}
            type="number"
            value={formData.consultation_fee || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, consultation_fee: e.target.value }))}
            min={0}
          />
        </div>
        <Input
          label={t('doctor.hospitalName', 'Hospital/Clinic Name')}
          value={formData.hospital_name || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, hospital_name: e.target.value }))}
        />
        <TextArea
          label={t('doctor.bio', 'About')}
          value={formData.bio || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
          rows={3}
          placeholder={t('doctor.bioPlaceholder', 'Tell patients about yourself...')}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="primary" className="flex-1 !bg-violet-600 hover:!bg-violet-700" loading={isSaving}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const EditLanguagesModal = ({ isOpen, onClose, selectedLanguages, onSave, isSaving }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSelected(selectedLanguages || []);
    }
  }, [isOpen, selectedLanguages]);

  const toggleLanguage = (langCode) => {
    setSelected(prev => {
      if (prev.includes(langCode)) {
        return prev.filter(l => l !== langCode);
      }
      return [...prev, langCode];
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('doctor.editLanguages', 'Languages Spoken')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          {t('doctor.selectLanguages', 'Select all languages you can communicate in')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => toggleLanguage(lang.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                selected.includes(lang.value)
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{lang.label}</span>
                {selected.includes(lang.value) && (
                  <CheckCircle className="w-4 h-4 text-violet-600" />
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" variant="primary" className="flex-1 !bg-violet-600 hover:!bg-violet-700" onClick={() => onSave(selected)} loading={isSaving}>
            {t('common.save', 'Save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const PhotoUploadModal = ({ isOpen, onClose, currentPhoto, onSave, isSaving }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setFile(null);
    }
  }, [isOpen]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error(t('profile.fileTooLarge', 'File size must be less than 5MB'));
        return;
      }
      if (!selectedFile.type.startsWith('image/')) {
        toast.error(t('profile.invalidFileType', 'Please select an image file'));
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('doctor.editPhoto', 'Change Profile Photo')} size="sm">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Avatar
            src={preview || currentPhoto}
            name="Profile"
            size="2xl"
            className="ring-4 ring-violet-100"
          />
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('common.upload', 'Upload')}
          </Button>
          {(preview || currentPhoto) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => { setPreview(null); setFile(null); onSave(null); }}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {t('common.remove', 'Remove')}
            </Button>
          )}
        </div>
        
        <p className="text-xs text-gray-400">JPG, PNG. Max 5MB</p>
      </div>
      
      <div className="flex gap-3 mt-6">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          className="flex-1 !bg-violet-600 hover:!bg-violet-700"
          onClick={() => file && onSave(file)}
          loading={isSaving}
          disabled={!file}
        >
          {t('common.save', 'Save')}
        </Button>
      </div>
    </Modal>
  );
};

const LogoutModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('common.logout', 'Logout')} size="sm">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600">
          {t('common.logoutConfirm', 'Are you sure you want to logout?')}
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} loading={isLoading}>
          {t('common.logout', 'Logout')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DoctorProfile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, handleLogout: authLogout } = useAuth();

  // Profile state
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Availability state
  const [availabilities, setAvailabilities] = useState([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Leave state
  const [leaves, setLeaves] = useState([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Language state
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Modals
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showLanguagesModal, setShowLanguagesModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch profile - using navigator.onLine directly
  const fetchProfile = async () => {
    if (!navigator.onLine) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.getProfile();
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);
      setProfile(normalized);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  // In Profile.jsx - Update fetchAvailability
  const fetchAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const response = await api.get('/appointments/schedules/');
      const apiResponse = response.data;
      
      // Backend ModelViewSet returns plain array or {results: []} for pagination
      if (Array.isArray(apiResponse)) {
        setAvailabilities(apiResponse);
      } else if (apiResponse?.results) {
        setAvailabilities(apiResponse.results);
      } else if (apiResponse?.data) {
        setAvailabilities(apiResponse.data);
      } else {
        setAvailabilities([]);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setAvailabilities([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Update fetchLeaves
  const fetchLeaves = async () => {
    setIsLoadingLeaves(true);
    try {
      // Change from '/auth/doctor/leaves/' to appointments endpoint
      const response = await api.get('/appointments/exceptions/');
      const apiResponse = response.data;
      
      if (apiResponse?.success && Array.isArray(apiResponse.data)) {
        setLeaves(apiResponse.data);
      } else if (Array.isArray(apiResponse)) {
        setLeaves(apiResponse);
      } else {
        setLeaves([]);
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
      setLeaves([]);
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchProfile();
    fetchAvailability();
    fetchLeaves();
  }, []);

  // Profile update handlers
  const handleUpdateProfile = async (formData) => {
    setIsSaving(true);
    try {
      const payload = buildUpdatePayload(formData);
      const response = await authService.updateProfile(payload);
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);
      
      setProfile(prev => ({ ...prev, ...normalized }));
      toast.success(t('profile.updateSuccess', 'Profile updated successfully'));
      
      setShowPersonalModal(false);
      setShowProfessionalModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateError', 'Failed to update profile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePhoto = async (file) => {
    setIsSaving(true);
    try {
      if (file) {
        const response = await authService.updateProfilePicture(file);
        const rawData = unwrapResponse(response);
        const normalized = normalizeProfileResponse(rawData);
        setProfile(prev => ({ ...prev, profile_photo: normalized?.profile_photo }));
        toast.success(t('profile.photoUpdated', 'Photo updated'));
      } else {
        await authService.updateProfile({ profile_photo: null });
        setProfile(prev => ({ ...prev, profile_photo: null }));
        toast.success(t('profile.photoRemoved', 'Photo removed'));
      }
      setShowPhotoModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.photoError', 'Failed to update photo'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateLanguages = async (languages) => {
    setIsSaving(true);
    try {
      const response = await authService.updateProfile({ languages_spoken: languages });
      const rawData = unwrapResponse(response);
      const normalized = normalizeProfileResponse(rawData);
      
      setProfile(prev => ({ ...prev, languages_spoken: normalized?.languages_spoken || languages }));
      toast.success(t('profile.languagesUpdated', 'Languages updated'));
      setShowLanguagesModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('profile.updateError', 'Failed to update'));
    } finally {
      setIsSaving(false);
    }
  };

  // App language change
  const handleChangeAppLanguage = async (langCode) => {
    i18n.changeLanguage(langCode);
    setIsChangingLanguage(true);
    
    try {
      await authService.changeLanguage(langCode);
    } catch (err) {
      console.error('Error syncing language:', err);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  // Availability handlers - use appointments endpoints
  const handleSaveAvailability = async (slotData) => {
    setIsSaving(true);
    try {
      if (editingSlot?.id) {
        // Update existing
        await api.put(`/appointments/schedules/${editingSlot.id}/`, slotData);
      } else {
        // Create new
        await api.post('/appointments/schedules/', slotData);
      }
      toast.success(editingSlot ? t('doctor.slotUpdated', 'Time slot updated') : t('doctor.slotAdded', 'Time slot added'));
      setShowAvailabilityModal(false);
      setEditingSlot(null);
      fetchAvailability();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      Object.values(err.response?.data || {}).flat().join(', ') ||
                      t('doctor.slotError', 'Failed to save time slot');
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAvailability = async (slot) => {
    setIsSaving(true);
    try {
      await api.delete(`/appointments/schedules/${slot.id}/`);
      toast.success(t('doctor.slotDeleted', 'Time slot deleted'));
      setShowAvailabilityModal(false);
      setEditingSlot(null);
      fetchAvailability();
    } catch (err) {
      toast.error(err.response?.data?.message || t('doctor.slotDeleteError', 'Failed to delete'));
    } finally {
      setIsSaving(false);
    }
  };

  // Leave handlers - use appointments endpoints
  const handleSaveLeave = async (leaveData) => {
    setIsSaving(true);
    try {
      await api.post('/appointments/exceptions/', leaveData);
      toast.success(t('doctor.leaveAdded', 'Leave added successfully'));
      setShowLeaveModal(false);
      fetchLeaves();
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.exception_date?.[0] ||
                      Object.values(err.response?.data || {}).flat().join(', ') ||
                      t('doctor.leaveError', 'Failed to add leave');
      toast.error(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLeave = async (leave) => {
    try {
      await api.delete(`/appointments/exceptions/${leave.id}/`);
      toast.success(t('doctor.leaveDeleted', 'Leave removed'));
      fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || t('doctor.leaveDeleteError', 'Failed to remove leave'));
    }
  };

  // Logout
  const handleLogout = async () => {
    setIsSaving(true);
    try {
      await authLogout();
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(t('profile.logoutError', 'Failed to logout'));
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader size="lg" />
      </div>
    );
  }

  // Error state
  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-1">Something went wrong</h3>
        <p className="text-gray-400 text-center mb-6 text-sm">{error}</p>
        <Button variant="primary" onClick={fetchProfile} className="!bg-violet-600 hover:!bg-violet-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      {error && profile && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ProfileHeader
        profile={profile}
        onEditPhoto={() => setShowPhotoModal(true)}
        isUploading={isSaving}
      />

      <div className="px-4 sm:px-6 mt-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Personal Information */}
            <Section
              title={t('doctor.personalInfo', 'Personal Information')}
              icon={User}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              onEdit={() => setShowPersonalModal(true)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Mail} label={t('common.email', 'Email')} value={profile?.email} iconBg="bg-blue-50" iconColor="text-blue-600" />
                <InfoRow icon={Phone} label={t('common.phone', 'Phone')} value={profile?.phone} iconBg="bg-green-50" iconColor="text-green-600" />
                <InfoRow icon={User} label={t('common.gender', 'Gender')} value={getGenderLabel(profile?.gender, t)} iconBg="bg-purple-50" iconColor="text-purple-600" />
                <InfoRow icon={Calendar} label={t('common.dateOfBirth', 'Date of Birth')} value={profile?.date_of_birth} iconBg="bg-amber-50" iconColor="text-amber-600" />
              </div>
            </Section>

            {/* Professional Information */}
            <Section
              title={t('doctor.professionalInfo', 'Professional Information')}
              icon={Briefcase}
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
              onEdit={() => setShowProfessionalModal(true)}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={Stethoscope} label={t('doctor.specialization', 'Specialization')} value={profile?.specialization_display || profile?.specialization} iconBg="bg-violet-50" iconColor="text-violet-600" />
                <InfoRow icon={GraduationCap} label={t('doctor.qualification', 'Qualification')} value={profile?.qualification} iconBg="bg-blue-50" iconColor="text-blue-600" />
                <InfoRow icon={Briefcase} label={t('doctor.experience', 'Experience')} value={profile?.experience_years ? `${profile.experience_years} years` : null} iconBg="bg-green-50" iconColor="text-green-600" />
                <InfoRow icon={IndianRupee} label={t('doctor.consultationFee', 'Consultation Fee')} value={profile?.consultation_fee ? `₹${profile.consultation_fee}` : null} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
                <InfoRow icon={Shield} label={t('doctor.registrationNumber', 'Registration No.')} value={profile?.registration_number} iconBg="bg-amber-50" iconColor="text-amber-600" />
                <InfoRow icon={Building} label={t('doctor.hospital', 'Hospital/Clinic')} value={profile?.hospital_name} iconBg="bg-pink-50" iconColor="text-pink-600" />
              </div>

              {profile?.bio && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {t('doctor.about', 'About')}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl">
                    {profile.bio}
                  </p>
                </div>
              )}
            </Section>

            {/* Availability */}
            <AvailabilitySection
              availabilities={availabilities}
              onAdd={() => { setEditingSlot(null); setShowAvailabilityModal(true); }}
              onEdit={(slot) => { setEditingSlot(slot); setShowAvailabilityModal(true); }}
              onDelete={handleDeleteAvailability}
              isLoading={isLoadingAvailability}
            />

            {/* Leave Management */}
            <LeaveSection
              leaves={leaves}
              onAdd={() => setShowLeaveModal(true)}
              onDelete={handleDeleteLeave}
              isLoading={isLoadingLeaves}
            />

            {/* Languages Spoken */}
            <Section
              title={t('doctor.languagesSpoken', 'Languages Spoken')}
              icon={Languages}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              onEdit={() => setShowLanguagesModal(true)}
            >
              {profile?.languages_spoken?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.languages_spoken.map((lang, index) => {
                    const langInfo = LANGUAGES.find(l => l.value === lang);
                    return (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="!bg-green-50 !text-green-700 !border-green-200"
                      >
                        {langInfo?.label || lang}
                      </Badge>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  {t('doctor.noLanguagesAdded', 'No languages added')}
                </p>
              )}
            </Section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* App Language */}
            <LanguageSelector
              currentLanguage={i18n.language}
              onChange={handleChangeAppLanguage}
              isChanging={isChangingLanguage}
            />

            {/* Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 sm:px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gray-100">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  {t('common.settings', 'Settings')}
                </h3>
              </div>
              <div className="p-2">
                <SettingsMenuItem
                  icon={Bell}
                  label={t('common.notifications', 'Notifications')}
                  description={t('doctor.manageNotifications', 'Manage notifications')}
                  onClick={() => navigate('/doctor/notifications')}
                />
                <SettingsMenuItem
                  icon={Shield}
                  label={t('common.privacy', 'Privacy & Security')}
                  onClick={() => navigate('/doctor/settings/privacy')}
                />
                <SettingsMenuItem
                  icon={LogOut}
                  label={t('common.logout', 'Logout')}
                  description={t('common.logoutDesc', 'Sign out of your account')}
                  onClick={() => setShowLogoutModal(true)}
                  variant="danger"
                />
              </div>
            </div>

            {/* App Version */}
            <p className="text-center text-xs text-gray-300 font-medium">
              {t('profile.version', 'Version')} 1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        currentPhoto={profile?.profile_photo}
        onSave={handleUpdatePhoto}
        isSaving={isSaving}
      />

      <EditPersonalModal
        isOpen={showPersonalModal}
        onClose={() => setShowPersonalModal(false)}
        profile={profile}
        onSave={handleUpdateProfile}
        isSaving={isSaving}
      />

      <EditProfessionalModal
        isOpen={showProfessionalModal}
        onClose={() => setShowProfessionalModal(false)}
        profile={profile}
        onSave={handleUpdateProfile}
        isSaving={isSaving}
      />

      <EditLanguagesModal
        isOpen={showLanguagesModal}
        onClose={() => setShowLanguagesModal(false)}
        selectedLanguages={profile?.languages_spoken}
        onSave={handleUpdateLanguages}
        isSaving={isSaving}
      />

      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => { setShowAvailabilityModal(false); setEditingSlot(null); }}
        slot={editingSlot}
        onSave={handleSaveAvailability}
        onDelete={handleDeleteAvailability}
        isSaving={isSaving}
      />

      <LeaveModal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onSave={handleSaveLeave}
        isSaving={isSaving}
      />

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        isLoading={isSaving}
      />
    </div>
  );
};

export default DoctorProfile;