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
import { format, addDays, parseISO, isSameDay } from 'date-fns';
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
import { authService } from '../../services/api/authService';
import { appointmentService } from '../../services/api/appointmentService';

/**
 * Generate next 7 days for date selection
 */
const generateDateOptions = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(new Date(), i);
    dates.push({
      date,
      dateString: format(date, 'yyyy-MM-dd'),
      dayName: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(date, 'EEE'),
      dayNumber: format(date, 'd'),
      month: format(date, 'MMM')
    });
  }
  return dates;
};

/**
 * Offline State Component
 */
const OfflineState = ({ onRetry }) => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center mb-4">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

/**
 * Consultation Type Card Component
 */
const ConsultationTypeCard = ({ type, icon: Icon, label, description, fee, selected, onSelect, available }) => (
  <button
    onClick={() => available && onSelect(type)}
    disabled={!available}
    className={`
      w-full p-4 rounded-xl border-2 text-left transition-all
      ${!available 
        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
        : selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 hover:border-primary-300 bg-white'
      }
    `}
  >
    <div className="flex items-start gap-3">
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center
        ${selected ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}
      `}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">{label}</h4>
          {selected && <CheckCircle size={18} className="text-primary-500" />}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        <div className="flex items-center gap-1 mt-2">
          <IndianRupee size={14} className="text-gray-400" />
          <span className="font-semibold text-gray-900">{fee}</span>
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
      px-4 py-2.5 rounded-lg text-sm font-medium transition-all
      ${disabled
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
        : selected
          ? 'bg-primary-500 text-white'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-500 hover:text-primary-600'
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
  <div className="p-4 bg-gray-50 rounded-xl">
    <div className="flex items-start gap-3 mb-3">
      <Avatar
        name={review.patient_name || 'Anonymous'}
        size="sm"
      />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">
            {review.patient_name || 'Anonymous'}
          </h4>
          <span className="text-xs text-gray-500">
            {format(parseISO(review.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < review.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}
            />
          ))}
        </div>
      </div>
    </div>
    {review.comment && (
      <p className="text-sm text-gray-600 leading-relaxed">
        {review.comment}
      </p>
    )}
  </div>
);

/**
 * Info Row Component
 */
const InfoRow = ({ icon: Icon, label, value, className = '' }) => (
  <div className={`flex items-start gap-3 ${className}`}>
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
      <Icon size={18} className="text-gray-500" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

/**
 * Doctor Profile Page
 */
const DoctorProfile = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ✅ 1. Offline detection - INSIDE the component
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

  // State
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  // Generate date options
  const dateOptions = useMemo(() => generateDateOptions(), []);

  // Initialize selected date
  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      setSelectedDate(dateOptions[0].dateString);
    }
  }, [dateOptions, selectedDate]);

  // Fetch doctor details
  const {
    data: doctorData,
    isLoading: doctorLoading,
    isError: doctorError,
    refetch: refetchDoctor  // ✅ Get refetch function
  } = useQuery({
    queryKey: ['doctor', id],
    queryFn: () => authService.getDoctorById(id),
    staleTime: 1000 * 60 * 10,
    enabled: isOnline  // ✅ Only fetch when online
  });

  // Fetch available slots for selected date
  const {
    data: slotsData,
    isLoading: slotsLoading
  } = useQuery({
    queryKey: ['doctorSlots', id, selectedDate],
    queryFn: () => appointmentService.getAvailableSlots(id, selectedDate),
    enabled: !!selectedDate && isOnline,
    staleTime: 1000 * 60 * 2,
  });

  // Fetch reviews
  const {
    data: reviewsData,
    isLoading: reviewsLoading
  } = useQuery({
    queryKey: ['doctorReviews', id],
    queryFn: () => authService.getDoctorReviews(id),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline
  });

  // Extract data
  const doctor = doctorData?.data || doctorData;
  const slots = slotsData?.data || slotsData || [];
  const reviews = reviewsData?.data || reviewsData || [];

  // Consultation types
  const consultationTypes = useMemo(() => {
    if (!doctor) return [];

    const types = [];
    
    if (doctor.offers_video !== false) {
      types.push({
        type: 'video',
        icon: Video,
        label: t('doctors.videoConsultation', 'Video Consultation'),
        description: t('doctors.videoDesc', 'Consult via video call'),
        fee: doctor.video_consultation_fee || doctor.consultation_fee || 0,
        available: true
      });
    }
    
    if (doctor.offers_audio !== false) {
      types.push({
        type: 'audio',
        icon: Phone,
        label: t('doctors.audioConsultation', 'Audio Consultation'),
        description: t('doctors.audioDesc', 'Consult via voice call'),
        fee: doctor.audio_consultation_fee || doctor.consultation_fee || 0,
        available: true
      });
    }
    
    if (doctor.offers_in_person !== false) {
      types.push({
        type: 'in_person',
        icon: MapPin,
        label: t('doctors.inPersonConsultation', 'In-Person Visit'),
        description: t('doctors.inPersonDesc', 'Visit at clinic'),
        fee: doctor.in_person_fee || doctor.consultation_fee || 0,
        available: !!doctor.hospital_address
      });
    }

    return types;
  }, [doctor, t]);

  // Initialize selected type
  useEffect(() => {
    if (!selectedType && consultationTypes.length > 0) {
      const availableType = consultationTypes.find(t => t.available);
      if (availableType) {
        setSelectedType(availableType.type);
      }
    }
  }, [consultationTypes, selectedType]);

  // Group slots by time period
  const groupedSlots = useMemo(() => {
    if (!slots.length) return { morning: [], afternoon: [], evening: [] };

    return slots.reduce((acc, slot) => {
      const hour = parseInt(slot.time?.split(':')[0] || slot.start_time?.split(':')[0] || '12');
      
      if (hour < 12) {
        acc.morning.push(slot);
      } else if (hour < 17) {
        acc.afternoon.push(slot);
      } else {
        acc.evening.push(slot);
      }
      
      return acc;
    }, { morning: [], afternoon: [], evening: [] });
  }, [slots]);

  // Languages formatted
  const languagesText = useMemo(() => {
    if (!doctor?.languages_spoken?.length) return '-';
    return doctor.languages_spoken
      .map(l => l.charAt(0).toUpperCase() + l.slice(1))
      .join(', ');
  }, [doctor?.languages_spoken]);

  // Handlers
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
    
    navigate(`/patient/book/${id}`, {
      state: {
        doctor,
        date: selectedDate,
        slot: selectedSlot,
        consultationType: selectedType
      }
    });
  }, [navigate, id, doctor, selectedDate, selectedSlot, selectedType]);

  // ✅ 2. Share with toast feedback - INSIDE the component
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = `Dr. ${doctor?.full_name || doctor?.first_name} - ${doctor?.specialization || 'Doctor'}`;
    
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

  // Tabs configuration
  const tabs = [
    { id: 'about', label: t('doctorProfile.about', 'About') },
    { id: 'reviews', label: `${t('doctorProfile.reviews', 'Reviews')} (${reviews.length})` }
  ];

  // ✅ Offline state
  if (!isOnline) {
    return <OfflineState onRetry={() => window.location.reload()} />;
  }

  // Loading state
  if (doctorLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  // ✅ 3. Error state with retry - INSIDE the component
  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Card className="p-6">
          <EmptyState
            icon={Info}
            title={t('errors.doctorNotFound', 'Doctor not found')}
            description={t('errors.doctorNotFoundDesc', 'The doctor you are looking for does not exist or has been removed.')}
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  {t('common.goBack', 'Go Back')}
                </Button>
                <Button variant="primary" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('common.retry', 'Retry')}
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-gray-900">
            {t('doctorProfile.title', 'Doctor Profile')}
          </h1>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      {/* Doctor Info Card */}
      <div className="px-4 py-4 sm:px-6">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center sm:items-start">
              <Avatar
                src={doctor.profile_picture}
                name={doctor.full_name || doctor.first_name}
                size="2xl"
                className="w-24 h-24 sm:w-32 sm:h-32"
              />
              {doctor.is_verified && (
                <Badge className="bg-green-100 text-green-700 mt-2">
                  <CheckCircle size={12} className="mr-1" />
                  {t('doctors.verified', 'Verified')}
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name || ''}`}
              </h2>
              <p className="text-primary-600 font-medium mt-1">
                {doctor.specialization_display || doctor.specialization || t('common.generalPhysician', 'General Physician')}
              </p>
              
              {doctor.qualification && (
                <p className="text-gray-500 text-sm mt-1">
                  {doctor.qualification}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                {doctor.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-amber-400 fill-current" />
                    <span className="font-semibold">{doctor.rating.toFixed(1)}</span>
                    <span className="text-gray-400 text-sm">
                      ({doctor.total_reviews || 0})
                    </span>
                  </div>
                )}
                
                {doctor.experience_years > 0 && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock size={16} className="text-gray-400" />
                    <span>{doctor.experience_years} {t('doctors.yearsExp', 'years')}</span>
                  </div>
                )}
                
                {doctor.total_patients > 0 && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Users size={16} className="text-gray-400" />
                    <span>{doctor.total_patients}+ {t('doctors.patients', 'patients')}</span>
                  </div>
                )}
              </div>

              {/* Consultation Fee */}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4 p-3 bg-primary-50 rounded-lg">
                <IndianRupee size={18} className="text-primary-600" />
                <span className="text-xl font-bold text-primary-600">
                  {doctor.consultation_fee || 0}
                </span>
                <span className="text-primary-600/70">
                  {t('doctors.perConsultation', 'per consultation')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6">
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4 sm:px-6">
        {activeTab === 'about' && (
          <div className="space-y-6">
            {/* About / Bio */}
            {doctor.bio && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {t('doctorProfile.aboutDoctor', 'About Doctor')}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {doctor.bio}
                </p>
              </Card>
            )}

            {/* Details */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">
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
                  value={doctor.registration_number ? `${doctor.registration_number} (${doctor.registration_council || ''})` : '-'}
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
            </Card>

            {/* Consultation Types */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t('doctorProfile.consultationTypes', 'Consultation Types')}
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
            </Card>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {reviewsLoading ? (
              <div className="flex justify-center py-8">
                <Loader size="md" />
              </div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <Card className="p-6">
                <EmptyState
                  icon={MessageCircle}
                  title={t('doctorProfile.noReviews', 'No Reviews Yet')}
                  description={t('doctorProfile.noReviewsDesc', 'Be the first to review this doctor')}
                  compact
                />
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Booking Section - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
        <div className="px-4 py-3 sm:px-6">
          {/* Date Selection */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                {t('doctorProfile.selectDate', 'Select Date')}
              </h4>
              <Link
                to={`/patient/book/${id}`}
                className="text-sm text-primary-600 font-medium flex items-center gap-1"
              >
                {t('doctorProfile.viewCalendar', 'View Calendar')}
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {dateOptions.map((dateOption) => (
                <button
                  key={dateOption.dateString}
                  onClick={() => handleDateSelect(dateOption.dateString)}
                  className={`
                    flex-shrink-0 w-16 py-2 rounded-xl text-center transition-all
                    ${selectedDate === dateOption.dateString
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <p className="text-xs font-medium opacity-80">
                    {dateOption.dayName}
                  </p>
                  <p className="text-lg font-bold">
                    {dateOption.dayNumber}
                  </p>
                  <p className="text-xs opacity-80">
                    {dateOption.month}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('doctorProfile.selectTime', 'Select Time')}
            </h4>
            
            {slotsLoading ? (
              <div className="flex justify-center py-4">
                <Loader size="sm" />
              </div>
            ) : slots.length > 0 ? (
              <div className="space-y-3 max-h-32 overflow-y-auto">
                {/* Morning */}
                {groupedSlots.morning.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('doctorProfile.morning', 'Morning')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.morning.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={selectedSlot?.id === slot.id || selectedSlot?.time === slot.time}
                          onSelect={handleSlotSelect}
                          disabled={slot.is_booked}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Afternoon */}
                {groupedSlots.afternoon.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('doctorProfile.afternoon', 'Afternoon')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.afternoon.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={selectedSlot?.id === slot.id || selectedSlot?.time === slot.time}
                          onSelect={handleSlotSelect}
                          disabled={slot.is_booked}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Evening */}
                {groupedSlots.evening.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('doctorProfile.evening', 'Evening')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupedSlots.evening.map((slot) => (
                        <TimeSlotButton
                          key={slot.id || slot.time}
                          slot={slot}
                          selected={selectedSlot?.id === slot.id || selectedSlot?.time === slot.time}
                          onSelect={handleSlotSelect}
                          disabled={slot.is_booked}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                {t('doctorProfile.noSlots', 'No slots available for this date')}
              </p>
            )}
          </div>

          {/* Book Button */}
          <Button
            fullWidth
            size="lg"
            onClick={handleBookAppointment}
            disabled={!selectedSlot || !selectedType}
            rightIcon={<Calendar size={18} />}
          >
            {selectedSlot
              ? t('doctorProfile.bookFor', { time: selectedSlot.time || selectedSlot.start_time })
              : t('doctorProfile.selectSlotToBook', 'Select a slot to book')
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;