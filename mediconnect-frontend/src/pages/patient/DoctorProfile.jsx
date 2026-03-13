// src/pages/patient/DoctorProfile.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Phone,
  Video,
  Calendar,
  CheckCircle,
  Users,
  Languages,
  GraduationCap,
  Award,
  Building,
  IndianRupee,
  MessageCircle,
  Share2,
  Heart,
  ChevronRight,
  ChevronLeft,
  Info,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Avatar,
  Badge,
  Loader,
  EmptyState,
  Modal,
  Tabs
} from '../../components/common';
import { authService, getDoctorAvailability, getAvailableSlots } from '../../services/api';

const normalizeDoctorData = (doc) => {
  if (!doc) return null;
  return {
    ...doc,
    id: doc.id,
    user_id: doc.user_id || doc.user?.id || doc.id,
    full_name: doc.full_name || doc.name || `Dr. ${doc.user?.first_name || ''} ${doc.user?.last_name || ''}`.trim() || 'Doctor',
    profile_picture: doc.profile_picture || doc.profile_photo || doc.user?.profile_photo || null,
    rating: parseFloat(doc.rating || doc.average_rating || 0),
    languages_spoken: doc.languages_spoken || doc.languages || [],
    consultation_types: doc.consultation_types || (doc.is_available_online ? ['video', 'audio'] : []),
    is_verified: doc.is_verified !== undefined ? doc.is_verified : true,
    experience_years: doc.experience_years || 0,
    consultation_fee: doc.consultation_fee || 0,
    total_reviews: doc.total_reviews || 0,
    total_consultations: doc.total_consultations || 0,
    specialization_display: doc.specialization_display || doc.specialization || '',
    total_patients: doc.total_patients || doc.total_consultations || 0,
    hospital_name: doc.hospital_name || '',
    hospital_address: doc.hospital_address || '',
    bio: doc.bio || '',
    qualification: doc.qualification || '',
    registration_number: doc.registration_number || '',
    registration_council: doc.registration_council || '',
    gender: doc.gender || doc.user?.gender || '',
  };
};

const buildDateOption = (dateValue, index) => {
  if (!dateValue) return null;
  
  let parsedDate;
  let dateString;
  
  if (dateValue instanceof Date) {
    parsedDate = dateValue;
    dateString = format(dateValue, 'yyyy-MM-dd');
  } else if (typeof dateValue === 'string') {
    parsedDate = parseISO(dateValue);
    dateString = dateValue;
  } else {
    const strValue = String(dateValue);
    if (strValue && strValue !== 'undefined' && strValue !== 'null') {
      parsedDate = parseISO(strValue);
      dateString = strValue;
    } else {
      return null;
    }
  }
  
  if (!parsedDate || !isValid(parsedDate)) {
    return null;
  }
  
  return {
    date: parsedDate,
    dateString,
    dayName: index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : format(parsedDate, 'EEE'),
    dayNumber: format(parsedDate, 'd'),
    month: format(parsedDate, 'MMM')
  };
};

const toDisplayTime = (timeString) => {
  if (!timeString) return '';
  const [hourStr, minuteStr] = timeString.split(':');
  const hours = parseInt(hourStr || '0', 10);
  const minutes = parseInt(minuteStr || '0', 10);
  return format(new Date(2000, 0, 1, hours, minutes), 'hh:mm a');
};

/**
 * Offline State Component
 */
const OfflineState = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-400 text-center mb-6 text-sm">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
      <Button variant="primary" onClick={onRetry} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !px-6">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

/**
 * Consultation Type Card Component
 */
const ConsultationTypeCard = ({
  type,
  icon: Icon,
  label,
  description,
  fee,
  selected,
  onSelect,
  available,
}) => (
  <button
    onClick={() => available && onSelect(type)}
    disabled={!available}
    className={`
      w-full p-4 rounded-2xl border-2 text-left transition-all duration-200
      ${
        !available
          ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
          : selected
          ? 'border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100'
          : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/30 bg-white'
      }
    `}
  >
    <div className="flex items-start gap-3">
      <div
        className={`
        w-11 h-11 rounded-xl flex items-center justify-center transition-colors
        ${selected ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-500'}
      `}
      >
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-900 text-sm">{label}</h4>
          {selected && (
            <CheckCircle size={18} className="text-violet-500" />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        <div className="flex items-center gap-1 mt-2">
          <IndianRupee size={14} className="text-violet-500" />
          <span className="font-bold text-violet-600">{fee}</span>
        </div>
      </div>
    </div>
  </button>
);

/**
 * Time Slot Button Component
 */
const TimeSlotButton = ({ slot, selected, onSelect, disabled }) => (
  <button
    onClick={() => !disabled && onSelect(slot)}
    disabled={disabled}
    className={`
      px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
      ${
        disabled
          ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through border border-gray-100'
          : selected
          ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30'
      }
    `}
  >
    {slot.time || slot.start_time}
  </button>
);

/**
 * Review Card Component
 */
const ReviewCard = ({ review }) => (
  <div className="p-4 bg-white rounded-2xl border border-gray-100">
    <div className="flex items-start gap-3 mb-3">
      <Avatar name={review.patient_name || 'Anonymous'} size="sm" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 text-sm">
            {review.patient_name || 'Anonymous'}
          </h4>
          <span className="text-xs text-gray-400">
            {review.created_at
              ? format(parseISO(review.created_at), 'MMM d, yyyy')
              : ''}
          </span>
        </div>
        <div className="flex items-center gap-0.5 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={
                i < review.rating
                  ? 'text-amber-400 fill-current'
                  : 'text-gray-200'
              }
            />
          ))}
        </div>
      </div>
    </div>
    {review.comment && (
      <p className="text-sm text-gray-500 leading-relaxed">{review.comment}</p>
    )}
  </div>
);

/**
 * Info Row Component
 */
const InfoRow = ({ icon: Icon, label, value, className = '' }) => (
  <div className={`flex items-start gap-3.5 ${className}`}>
    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
      <Icon size={18} className="text-violet-500" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="font-semibold text-gray-900 text-sm mt-0.5">{value}</p>
    </div>
  </div>
);

/**
 * Doctor Profile Page
 */
const DoctorProfile = () => {
  const params = useParams();
  const docId = params.id || params.doctorId;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [activeTab, setActiveTab] = useState('about');

  const {
    data: doctorRaw,
    isLoading: doctorLoading,
    isError: doctorError,
    refetch: refetchDoctor,
  } = useQuery({
    queryKey: ['doctor', docId],
    queryFn: () => authService.getDoctorById(docId),
    staleTime: 1000 * 60 * 10,
    enabled: !!docId && isOnline,
  });

  const doctor = useMemo(() => {
    if (!doctorRaw) return null;
    const raw = doctorRaw?.data || doctorRaw;
    return normalizeDoctorData(raw);
  }, [doctorRaw]);

  const {
    data: availabilityRaw,
    isLoading: availabilityLoading,
    isError: availabilityError,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['doctor-availability', docId],
    queryFn: () => getDoctorAvailability(docId, { days: 30 }),
    staleTime: 1000 * 60 * 5,
    enabled: !!docId && isOnline,
  });

  const availableDates = useMemo(() => {
    return availabilityRaw?.data?.available_days || availabilityRaw?.available_days || [];
  }, [availabilityRaw]);

  const dateOptions = useMemo(() => {
    if (!availableDates || !Array.isArray(availableDates)) return [];
    
    return availableDates
      .slice(0, 14)
      .map((dateValue, index) => buildDateOption(dateValue, index))
      .filter(Boolean);
  }, [availableDates]);

  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].dateString);
      return;
    }

    if (selectedDate && availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(dateOptions[0]?.dateString || null);
      setSelectedSlot(null);
    }
  }, [dateOptions, selectedDate, availableDates]);

  const {
    data: slotsRaw,
    isLoading: slotsLoading,
  } = useQuery({
    queryKey: ['doctor-profile-slots', docId, selectedDate],
    queryFn: () => getAvailableSlots(docId, selectedDate),
    staleTime: 1000 * 60 * 2,
    enabled: !!docId && !!selectedDate && isOnline,
  });

  const slots = useMemo(() => {
    const apiSlots = slotsRaw?.data?.slots || slotsRaw?.slots || [];
    return apiSlots.map((slot) => ({
      ...slot,
      time: toDisplayTime(slot.start_time),
    }));
  }, [slotsRaw]);

  const reviews = [];
  const reviewsLoading = false;

  const consultationTypes = useMemo(() => {
    if (!doctor) return [];

    const types = [];
    const fee = doctor.consultation_fee || 0;

    if (
      doctor.consultation_types?.includes('video') ||
      doctor.is_available_online
    ) {
      types.push({
        type: 'video',
        icon: Video,
        label: t('doctors.videoConsultation', 'Video Consultation'),
        description: t('doctors.videoDesc', 'Consult via video call'),
        fee: fee,
        available: true,
      });
    }

    if (
      doctor.consultation_types?.includes('audio') ||
      doctor.is_available_online
    ) {
      types.push({
        type: 'audio',
        icon: Phone,
        label: t('doctors.audioConsultation', 'Audio Consultation'),
        description: t('doctors.audioDesc', 'Consult via voice call'),
        fee: fee,
        available: true,
      });
    }

    if (doctor.hospital_address) {
      types.push({
        type: 'in_person',
        icon: MapPin,
        label: t('doctors.inPersonConsultation', 'In-Person Visit'),
        description: t('doctors.inPersonDesc', 'Visit at clinic'),
        fee: fee,
        available: true,
      });
    }

    if (types.length === 0) {
      types.push({
        type: 'video',
        icon: Video,
        label: t('doctors.videoConsultation', 'Video Consultation'),
        description: t('doctors.videoDesc', 'Consult via video call'),
        fee: fee,
        available: true,
      });
    }

    return types;
  }, [doctor, t]);

  useEffect(() => {
    if (!selectedType && consultationTypes.length > 0) {
      const availableType = consultationTypes.find((t) => t.available);
      if (availableType) {
        setSelectedType(availableType.type);
      }
    }
  }, [consultationTypes, selectedType]);

  const groupedSlots = useMemo(() => {
    if (!slots.length) return { morning: [], afternoon: [], evening: [] };

    return slots.reduce(
      (acc, slot) => {
        const timeStr = slot.start_time || slot.time || '12:00';
        const hour = parseInt(timeStr.split(':')[0]);

        if (hour < 12) {
          acc.morning.push(slot);
        } else if (hour < 17) {
          acc.afternoon.push(slot);
        } else {
          acc.evening.push(slot);
        }

        return acc;
      },
      { morning: [], afternoon: [], evening: [] }
    );
  }, [slots]);

  const languagesText = useMemo(() => {
    const langs = doctor?.languages_spoken || [];
    if (!langs.length) return '-';
    return langs
      .map((l) => l.charAt(0).toUpperCase() + l.slice(1))
      .join(', ');
  }, [doctor?.languages_spoken]);

  const handleDateSelect = useCallback((dateString) => {
    setSelectedDate(dateString);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const handleTypeSelect = useCallback((type) => {
    setSelectedType(type);
  }, []);

  const handleBookAppointment = useCallback(() => {
    if (!selectedSlot || !selectedType) return;

    // Use user_id (UUID) for booking
    const doctorUserId = doctor?.user_id || doctor?.user?.id || docId;

    navigate(`/patient/appointments/book/${doctorUserId}`, {
      state: {
        doctor,
        date: selectedDate,
        slot: selectedSlot,
        consultationType: selectedType,
      },
    });
  }, [navigate, docId, doctor, selectedDate, selectedSlot, selectedType]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = `${doctor?.full_name || 'Doctor'} - ${
      doctor?.specialization_display || 'Doctor'
    }`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('common.linkCopied', 'Link copied to clipboard'));
    }
  }, [doctor, t]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleRetry = useCallback(() => {
    refetchDoctor();
  }, [refetchDoctor]);

  const tabs = [
    { id: 'about', label: t('doctorProfile.about', 'About') },
    {
      id: 'reviews',
      label: `${t('doctorProfile.reviews', 'Reviews')} (${reviews.length})`,
    },
  ];

  if (!isOnline) {
    return <OfflineState onRetry={() => window.location.reload()} />;
  }

  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
          <div className="w-7 h-7 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading profile...</p>
      </div>
    );
  }

  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <EmptyState
            icon={Info}
            title={t('errors.doctorNotFound', 'Doctor not found')}
            description={t(
              'errors.doctorNotFoundDesc',
              'The doctor you are looking for does not exist or has been removed.'
            )}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="!rounded-xl">
                  {t('common.goBack', 'Go Back')}
                </Button>
                <Button variant="primary" onClick={handleRetry} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-32">
      {/* Hero Header */}
      <div className="relative">
        {/* Gradient Background */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 pt-4 pb-28 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/[0.07]" />
          <div className="absolute top-20 -left-8 w-28 h-28 rounded-full bg-white/[0.05]" />
          <div className="absolute bottom-6 right-14 w-16 h-16 rounded-full bg-white/[0.06]" />

          {/* Top Bar */}
          <div className="relative z-10 px-4 py-2 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-white text-base">
              {t('doctorProfile.title', 'Doctor Profile')}
            </h1>
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Profile Card */}
        <div className="px-4 -mt-24 relative z-10">
          <div className="bg-white rounded-3xl shadow-lg shadow-violet-900/10 p-5 border border-violet-100/30">
            {/* Avatar + Core Info */}
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="-mt-14 mb-3">
                <div className="relative">
                  <div className="rounded-full ring-4 ring-white shadow-lg">
                    <Avatar
                      src={doctor.profile_picture}
                      name={doctor.full_name}
                      size="2xl"
                    />
                  </div>
                  {doctor.is_verified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center ring-[3px] ring-white">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name */}
              <h2 className="text-xl font-bold text-gray-900">
                {doctor.full_name}
              </h2>
              <p className="text-violet-600 font-semibold text-sm mt-0.5">
                {doctor.specialization_display}
              </p>

              {doctor.qualification && (
                <p className="text-gray-400 text-xs mt-1">
                  {doctor.qualification}
                </p>
              )}

              {/* Stats Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                {doctor.rating > 0 && (
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">
                    <Star size={14} className="text-amber-400 fill-current" />
                    <span className="text-xs font-bold text-amber-700">
                      {doctor.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-amber-500">
                      ({doctor.total_reviews})
                    </span>
                  </div>
                )}

                {doctor.experience_years > 0 && (
                  <div className="flex items-center gap-1 bg-violet-50 px-3 py-1.5 rounded-xl border border-violet-100/50">
                    <Clock size={14} className="text-violet-400" />
                    <span className="text-xs font-bold text-violet-700">
                      {doctor.experience_years} {t('doctors.yearsExp', 'years')}
                    </span>
                  </div>
                )}

                {doctor.total_patients > 0 && (
                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                    <Users size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-blue-700">
                      {doctor.total_patients}+ {t('doctors.patients', 'patients')}
                    </span>
                  </div>
                )}
              </div>

              {/* Fee Banner */}
              <div className="flex items-center justify-center gap-2 mt-4 w-full py-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100/50">
                <IndianRupee size={18} className="text-violet-600" />
                <span className="text-2xl font-extrabold text-violet-600">
                  {doctor.consultation_fee}
                </span>
                <span className="text-violet-400 text-sm font-medium">
                  {t('doctors.perConsultation', 'per consultation')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-5">
        <div className="bg-violet-50/50 rounded-2xl p-1 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                ${
                  activeTab === tab.id
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        {activeTab === 'about' && (
          <div className="space-y-4">
            {/* About / Bio */}
            {doctor.bio && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Info size={16} className="text-violet-500" />
                  </div>
                  {t('doctorProfile.aboutDoctor', 'About Doctor')}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {doctor.bio}
                </p>
              </div>
            )}

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <GraduationCap size={16} className="text-violet-500" />
                </div>
                {t('doctorProfile.details', 'Details')}
              </h3>
              <div className="space-y-4">
                <InfoRow
                  icon={GraduationCap}
                  label={t('doctorProfile.qualification', 'Qualification')}
                  value={doctor.qualification || '-'}
                />
                <InfoRow
                  icon={Award}
                  label={t('doctorProfile.registration', 'Registration')}
                  value={
                    doctor.registration_number
                      ? `${doctor.registration_number} (${
                          doctor.registration_council || ''
                        })`
                      : '-'
                  }
                />
                <InfoRow
                  icon={Languages}
                  label={t('doctorProfile.languages', 'Languages')}
                  value={languagesText}
                />
                {doctor.hospital_name && (
                  <InfoRow
                    icon={Building}
                    label={t('doctorProfile.hospital', 'Hospital')}
                    value={doctor.hospital_name}
                  />
                )}
                {doctor.hospital_address && (
                  <InfoRow
                    icon={MapPin}
                    label={t('doctorProfile.address', 'Address')}
                    value={doctor.hospital_address}
                  />
                )}
              </div>
            </div>

            {/* Consultation Types */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Video size={16} className="text-violet-500" />
                </div>
                {t(
                  'doctorProfile.consultationTypes',
                  'Consultation Types'
                )}
              </h3>
              <div className="space-y-3">
                {consultationTypes.map((type) => (
                  <ConsultationTypeCard
                    key={type.type}
                    {...type}
                    selected={selectedType === type.type}
                    onSelect={handleTypeSelect}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <Loader size="md" />
              </div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-8">
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-violet-300" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    {t('doctorProfile.noReviews', 'No Reviews Yet')}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    {t(
                      'doctorProfile.noReviewsDesc',
                      'Be the first to review this doctor'
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Booking Section - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-2xl shadow-black/10 z-30 rounded-t-3xl">
        <div className="px-4 py-4">
          {availabilityError && !availabilityLoading && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl mb-3 border border-amber-100">
              <Info size={16} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs text-amber-700 font-medium">
                {t('doctorProfile.availabilityError', 'Unable to load live availability. Please retry.')}
              </span>
              <button
                onClick={() => refetchAvailability()}
                className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-700"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          )}

          {/* Date Selection */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-sm font-bold text-gray-900">
                {t('doctorProfile.selectDate', 'Select Date')}
              </h4>
              <Link
                to={`/patient/appointments/book/${docId}`}
                className="text-xs text-violet-600 font-semibold flex items-center gap-0.5 hover:text-violet-700"
              >
                {t('doctorProfile.viewCalendar', 'View Calendar')}
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              {dateOptions.map((dateOption) => (
                <button
                  key={dateOption.dateString}
                  onClick={() => handleDateSelect(dateOption.dateString)}
                  className={`
                    flex-shrink-0 w-[4.2rem] py-2.5 rounded-2xl text-center transition-all duration-200
                    ${
                      selectedDate === dateOption.dateString
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-violet-50 border border-gray-100'
                    }
                  `}
                >
                  <p className={`text-[10px] font-semibold ${selectedDate === dateOption.dateString ? 'text-violet-200' : 'text-gray-400'}`}>
                    {dateOption.dayName}
                  </p>
                  <p className="text-lg font-extrabold">{dateOption.dayNumber}</p>
                  <p className={`text-[10px] font-medium ${selectedDate === dateOption.dateString ? 'text-violet-200' : 'text-gray-400'}`}>
                    {dateOption.month}
                  </p>
                </button>
              ))}

              {!availabilityLoading && dateOptions.length === 0 && (
                <div className="w-full text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-sm text-gray-500 font-medium">
                    {t('doctorProfile.noAvailableDays', 'No available days in doctor schedule')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Time Slots */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 mb-2">
              {t('doctorProfile.selectTime', 'Select Time')}
            </h4>

            {slotsLoading ? (
              <div className="flex justify-center py-5">
                <Loader size="sm" />
              </div>
            ) : slots.length > 0 ? (
              <div className="space-y-3 max-h-32 overflow-y-auto scrollbar-hide">
                {groupedSlots.morning.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {t('doctorProfile.morning', 'Morning')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedSlots.morning.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={
                            selectedSlot?.id === slot.id ||
                            selectedSlot?.time === slot.time
                          }
                          onSelect={handleSlotSelect}
                          disabled={slot.is_available === false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedSlots.afternoon.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {t('doctorProfile.afternoon', 'Afternoon')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedSlots.afternoon.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={
                            selectedSlot?.id === slot.id ||
                            selectedSlot?.time === slot.time
                          }
                          onSelect={handleSlotSelect}
                          disabled={slot.is_available === false}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedSlots.evening.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      {t('doctorProfile.evening', 'Evening')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupedSlots.evening.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={
                            selectedSlot?.id === slot.id ||
                            selectedSlot?.time === slot.time
                          }
                          onSelect={handleSlotSelect}
                          disabled={slot.is_available === false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-5 bg-gray-50 rounded-2xl">
                <Clock className="w-5 h-5 text-gray-300 mx-auto mb-1.5" />
                <p className="text-sm text-gray-400 font-medium">
                  {t(
                    'doctorProfile.noSlots',
                    'No slots available for this date'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Book Button */}
          <p className="text-[11px] text-violet-700 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 mb-3">
            {t('doctorProfile.pendingApproval', 'Selected slot will be requested first. Doctor confirms the appointment after review.')}
          </p>

          <Button
            fullWidth
            size="lg"
            onClick={handleBookAppointment}
            disabled={!selectedSlot || !selectedType}
            rightIcon={<Calendar size={18} />}
            className="!rounded-2xl !py-4 !bg-violet-600 hover:!bg-violet-700 !font-bold !text-base disabled:!bg-gray-200 disabled:!text-gray-400 shadow-lg shadow-violet-200 disabled:shadow-none transition-all duration-200"
          >
            {selectedSlot
              ? t('doctorProfile.bookFor', {
                  time: selectedSlot.time || selectedSlot.start_time,
                })
              : t(
                  'doctorProfile.selectSlotToBook',
                  'Select a slot to book'
                )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;