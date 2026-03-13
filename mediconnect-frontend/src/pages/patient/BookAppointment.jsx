// src/pages/patient/BookAppointment.jsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  User,
  FileText,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Info,
  Loader2,
  WifiOff,
  RefreshCw,
  Star,
  Shield,
  Heart,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isValid,
  startOfDay,
  addMonths,
  subMonths,
  getDay
} from 'date-fns';
import toast from 'react-hot-toast';

import {
  Card,
  Button,
  Avatar,
  Badge,
  Loader,
  EmptyState,
  Modal,
  Input,
  TextArea,
  Select
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/api';
import {
  getAvailableSlots,
  createAppointment,
  getDoctorAvailability
} from '../../services/api';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Date & Time', icon: Calendar },
  { id: 2, title: 'Details', icon: User },
  { id: 3, title: 'Confirm', icon: CreditCard }
];

const BOOKING_TYPES = {
  online: { icon: Video, label: 'Online Consultation', color: 'text-blue-500', bg: 'bg-blue-100' },
  walk_in: { icon: MapPin, label: 'Walk-in Visit', color: 'text-purple-500', bg: 'bg-purple-100' },
  phone: { icon: Phone, label: 'Phone Consultation', color: 'text-green-500', bg: 'bg-green-100' },
  follow_up: { icon: FileText, label: 'Follow-up', color: 'text-orange-500', bg: 'bg-orange-100' }
};

const BOOKING_FOR_OPTIONS = [
  { value: 'self', label: 'Myself' },
  { value: 'family', label: 'Family Member' },
  { value: 'other', label: 'Someone Else' }
];

const parseApiDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const stringValue = String(value);
  const dateOnlyMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return isValid(parsedDate) ? parsedDate : null;
  }

  const fallbackDate = new Date(stringValue);
  return isValid(fallbackDate) ? fallbackDate : null;
};

const isBackendConnectionIssue = (error) => {
  if (!error) return false;
  if (error?.response) return false;

  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'ERR_NETWORK' ||
    message.includes('network error') ||
    message.includes('connection refused') ||
    message.includes('failed to fetch')
  );
};

const normalizeDoctorData = (doc) => {
  if (!doc) return null;
  return {
    ...doc,
    id: doc.id, // Keep DoctorProfile.id for reference
    user_id: doc.user_id || doc.user?.id,  // ADD THIS - User UUID for API calls
    full_name: doc.full_name || doc.name || `${doc.first_name || doc.user?.first_name || ''} ${doc.last_name || doc.user?.last_name || ''}`.trim() || 'Doctor',
    first_name: doc.first_name || doc.user?.first_name || '',
    last_name: doc.last_name || doc.user?.last_name || '',
    profile_picture: doc.profile_picture || doc.profile_photo || doc.user?.profile_photo || null,
    rating: parseFloat(doc.rating || doc.average_rating || 0),
    specialization: doc.specialization || '',
    specialization_display: doc.specialization_display || doc.specialization || '',
    experience_years: doc.experience_years || 0,
    consultation_fee: doc.consultation_fee || 0,
    total_reviews: doc.total_reviews || 0,
    languages_spoken: doc.languages_spoken || doc.languages || [],
    is_available_online: doc.is_available_online !== undefined ? doc.is_available_online : true,
    hospital_name: doc.hospital_name || '',
    hospital_address: doc.hospital_address || '',
    bio: doc.bio || '',
    availabilities: doc.availabilities || [],
  };
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-violet-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-400 text-center text-sm">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-400 text-center mb-6 text-sm">{message}</p>
      <Button variant="primary" onClick={onRetry} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !px-6">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center gap-0 px-6 py-4 bg-white">
    {steps.map((step, index) => {
      const Icon = step.icon;
      const isActive = currentStep === step.id;
      const isCompleted = currentStep > step.id;

      return (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
              ${isCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' :
                isActive ? 'bg-violet-600 text-white shadow-md shadow-violet-200' :
                'bg-gray-100 text-gray-400'}
            `}>
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <span className={`text-[10px] mt-1.5 font-semibold tracking-wide ${isActive ? 'text-violet-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-10 h-[2px] mx-1.5 rounded-full transition-colors duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          )}
        </div>
      );
    })}
  </div>
);

const DoctorSummaryCard = ({ doctor }) => {
  const { t } = useTranslation();

  if (!doctor) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex gap-4 items-center">
      <div className="relative flex-shrink-0">
        <div className="rounded-xl ring-2 ring-violet-100 overflow-hidden">
          <Avatar
            src={doctor.profile_picture}
            name={doctor.full_name}
            size="lg"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate text-sm">
          Dr. {doctor.full_name}
        </h3>
        <p className="text-xs text-violet-600 font-semibold mt-0.5">
          {doctor.specialization_display || doctor.specialization}
        </p>
        <div className="flex items-center gap-3 mt-2">
          {doctor.rating > 0 && (
            <span className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-700">{doctor.rating.toFixed(1)}</span>
            </span>
          )}
          {doctor.experience_years > 0 && (
            <span className="flex items-center gap-1 bg-violet-50 px-2 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-violet-400" />
              <span className="text-xs font-semibold text-violet-600">
                {doctor.experience_years} {t('doctors.yearsExp', 'yrs')}
              </span>
            </span>
          )}
        </div>
      </div>
      {doctor.consultation_fee > 0 && (
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400">Fee</p>
          <p className="text-lg font-extrabold text-violet-600">₹{doctor.consultation_fee}</p>
        </div>
      )}
    </div>
  );
};

const CalendarPicker = ({ selectedDate, onSelectDate, availableDates = [], strictAvailability = false }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const availableDateSet = useMemo(() => {
    return new Set(
      availableDates
        .map((dateValue) => String(dateValue).slice(0, 10))
        .filter(Boolean)
    );
  }, [availableDates]);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });

    const startDay = getDay(start);
    const paddingDays = Array(startDay).fill(null);

    return [...paddingDays, ...daysInMonth];
  }, [currentMonth]);

  const isDateAvailable = (date) => {
    if (!date) return false;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;
    if (!strictAvailability) return true;
    if (availableDateSet.size === 0) return !strictAvailability;
    return availableDateSet.has(format(date, 'yyyy-MM-dd'));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="bg-white rounded-2xl p-4">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          disabled={isSameMonth(currentMonth, new Date())}
          className="p-2 rounded-xl hover:bg-violet-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-bold text-gray-900 text-sm">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl hover:bg-violet-50 text-gray-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-gray-300 uppercase py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isAvailable = isDateAvailable(day);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => isAvailable && onSelectDate(day)}
              disabled={!isAvailable}
              className={`
                aspect-square flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200
                ${isSelected
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : isAvailable
                    ? isTodayDate
                      ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 ring-1 ring-violet-200'
                      : 'hover:bg-violet-50 text-gray-700'
                    : 'text-gray-200 cursor-not-allowed'
                }
              `}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TimeSlotGrid = ({ slots, selectedSlot, onSelectSlot, isLoading }) => {
  const { t } = useTranslation();

  const groupedSlots = useMemo(() => {
    if (!slots?.length) return { morning: [], afternoon: [], evening: [] };

    return slots.reduce((acc, slot) => {
      const timeStr = slot.start_time || '';
      const hour = parseInt(timeStr.split(':')[0] || '12');

      if (hour < 12) acc.morning.push(slot);
      else if (hour < 17) acc.afternoon.push(slot);
      else acc.evening.push(slot);

      return acc;
    }, { morning: [], afternoon: [], evening: [] });
  }, [slots]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-2">
          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
        </div>
        <p className="text-xs text-gray-400 font-medium">Loading slots...</p>
      </div>
    );
  }

  if (!slots?.length) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-2xl">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm font-medium text-gray-500">{t('booking.noSlots', 'No slots available')}</p>
        <p className="text-xs text-gray-400 mt-0.5">{t('booking.tryAnotherDate', 'Please try another date')}</p>
      </div>
    );
  }

  const renderSlotGroup = (title, groupSlots) => {
    if (!groupSlots.length) return null;

    return (
      <div className="mb-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {groupSlots.map((slot) => {
            const isSelected = selectedSlot &&
              (selectedSlot.id === slot.id || selectedSlot.start_time === slot.start_time);
            const isUnavailable = slot.is_available === false;

            return (
              <button
                key={slot.id || slot.start_time}
                onClick={() => !isUnavailable && onSelectSlot(slot)}
                disabled={isUnavailable}
                className={`
                  px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                  ${isUnavailable
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through border border-gray-100'
                    : isSelected
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30'
                  }
                `}
              >
                {slot.start_time}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderSlotGroup(t('booking.morning', 'Morning'), groupedSlots.morning)}
      {renderSlotGroup(t('booking.afternoon', 'Afternoon'), groupedSlots.afternoon)}
      {renderSlotGroup(t('booking.evening', 'Evening'), groupedSlots.evening)}
    </div>
  );
};

const BookingTypeSelector = ({ selectedType, onSelectType }) => {
  const availableTypes = ['online', 'walk_in', 'phone', 'follow_up'];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {availableTypes.map((type) => {
        const config = BOOKING_TYPES[type];
        const Icon = config.icon;
        const isSelected = selectedType === type;

        return (
          <button
            key={type}
            onClick={() => onSelectType(type)}
            className={`
              p-3.5 rounded-2xl border-2 text-left transition-all duration-200
              ${isSelected
                ? 'border-violet-500 bg-violet-50/50 shadow-sm shadow-violet-100'
                : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/20 bg-white'
              }
            `}
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-violet-600 text-white' : config.bg}`}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : config.color}`} />
              </div>
              <span className={`text-xs font-bold ${isSelected ? 'text-violet-700' : 'text-gray-700'}`}>{config.label}</span>
              {isSelected && (
                <CheckCircle className="w-4 h-4 text-violet-500" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

const BookingSummary = ({ doctor, date, slot, bookingType, fee }) => {
  const { t } = useTranslation();
  const typeConfig = BOOKING_TYPES[bookingType] || BOOKING_TYPES.online;
  const TypeIcon = typeConfig.icon;
  const hasValidDate = date && isValid(date);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <FileText className="w-4 h-4 text-violet-500" />
        </div>
        {t('booking.summary', 'Booking Summary')}
      </h3>

      <div className="space-y-3.5">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t('booking.date', 'Date')}</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">
              {hasValidDate ? format(date, 'EEEE, MMMM d, yyyy') : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t('booking.time', 'Time')}</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">
              {slot?.start_time || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <TypeIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{t('booking.type', 'Type')}</p>
            <p className="font-semibold text-gray-900 text-sm mt-0.5">{typeConfig.label}</p>
          </div>
        </div>

        {fee && (
          <div className="pt-3.5 mt-1 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 font-medium">{t('booking.consultationFee', 'Consultation Fee')}</span>
              <span className="font-semibold text-gray-900">₹{fee}</span>
            </div>
            <div className="flex items-center justify-between mt-3 py-3 bg-violet-50 rounded-xl px-3 -mx-1">
              <span className="font-bold text-violet-900">{t('booking.total', 'Total')}</span>
              <span className="text-xl font-extrabold text-violet-600">₹{fee}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const BookAppointment = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const preSelectedData = location.state || {};
  // Prefer user_id (UUID) over id
  const effectiveDoctorId = doctorId || preSelectedData?.doctor?.user_id || preSelectedData?.doctor?.id;

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

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = preSelectedData.date ? parseApiDate(preSelectedData.date) : new Date();
    return isValid(initialDate) ? initialDate : new Date();
  });
  const [selectedSlot, setSelectedSlot] = useState(preSelectedData.slot || null);
  const [selectedBookingType, setSelectedBookingType] = useState(
    preSelectedData.bookingType || preSelectedData.consultationType || 'online'
  );
  const [patientDetails, setPatientDetails] = useState({
    bookingFor: 'self',
    patientName: user?.full_name || user?.first_name || '',
    patientPhone: user?.phone_number || user?.phone || '',
    patientAge: '',
    patientGender: '',
    symptoms: '',
    notes: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const preSelectedDoctor = useMemo(() => {
    if (preSelectedData.doctor) {
      return normalizeDoctorData(preSelectedData.doctor);
    }
    return null;
  }, [preSelectedData.doctor]);

  const {
    data: doctorRaw,
    isLoading: doctorLoading,
    isError: doctorError,
    error: doctorQueryError,
    refetch: refetchDoctor
  } = useQuery({
    queryKey: ['doctor', effectiveDoctorId],
    queryFn: () => authService.getDoctorById(effectiveDoctorId),
    enabled: !!effectiveDoctorId && isOnline && !preSelectedDoctor,
    staleTime: 1000 * 60 * 10,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const doctor = useMemo(() => {
    if (preSelectedDoctor) return preSelectedDoctor;
    if (!doctorRaw) return null;
    const raw = doctorRaw?.data || doctorRaw;
    return normalizeDoctorData(raw);
  }, [preSelectedDoctor, doctorRaw]);

  const selectedDateKey = useMemo(() => {
    if (!selectedDate || !isValid(selectedDate)) return null;
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  useEffect(() => {
    if (!effectiveDoctorId && !preSelectedDoctor) {
      navigate('/patient/doctors', { replace: true });
    }
  }, [effectiveDoctorId, preSelectedDoctor, navigate]);

  const {
    data: availabilityData,
    isLoading: availabilityLoading,
    isError: availabilityError,
    error: availabilityQueryError,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['doctor-availability', effectiveDoctorId],
    queryFn: async () => {
      const response = await getDoctorAvailability(effectiveDoctorId, { days: 60 });
      return response;
    },
    enabled: !!effectiveDoctorId && isOnline,
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: slotsResponse,
    isLoading: slotsLoading,
    isError: slotsError,
    error: slotsQueryError,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['slots', effectiveDoctorId, selectedDateKey],
    queryFn: async () => {
      const response = await getAvailableSlots(effectiveDoctorId, selectedDateKey);
      return response;
    },
    enabled: !!effectiveDoctorId && !!selectedDateKey && isOnline,
    staleTime: 1000 * 60 * 2,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: (data) => createAppointment(data),
    onSuccess: (response) => {
      toast.success(t('booking.pendingSuccess', 'Appointment request sent. Waiting for doctor confirmation.'));
      navigate('/patient/appointments', {
        state: { newAppointment: response?.data || response }
      });
    },
    onError: (error) => {
      const errorData = error?.response?.data;
      let errorMessage = t('booking.error', 'Failed to book appointment');

      if (errorData) {
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'object') {
          const errors = Object.entries(errorData)
            .map(([key, value]) => {
              const msg = Array.isArray(value) ? value.join(', ') : String(value);
              return `${key}: ${msg}`;
            })
            .join('; ');
          if (errors) errorMessage = errors;
        }
      }

      toast.error(errorMessage);
    }
  });

  const slots = useMemo(() => {
    const rawSlots = slotsResponse?.data?.slots || slotsResponse?.slots || [];
    return Array.isArray(rawSlots) ? rawSlots : [];
  }, [slotsResponse]);

  const isAvailableOnDate = slotsResponse?.data?.is_available !== false;

  const availableDates = useMemo(() => {
    const dates = availabilityData?.data?.available_days ||
           availabilityData?.available_days ||
           [];
    return Array.isArray(dates) ? dates : [];
  }, [availabilityData]);

  const bookingDoctorId = useMemo(() => {
    // Get the correct UUID - prefer user_id over id
    const doctorUUID = 
      slotsResponse?.data?.doctor_id ||
      slotsResponse?.doctor_id ||
      availabilityData?.data?.doctor_id ||
      availabilityData?.doctor_id ||
      doctor?.user_id ||
      doctor?.user?.id;
    
    // ✅ Only use effectiveDoctorId if it looks like a UUID (contains dashes)
    const fallbackId = effectiveDoctorId;
    const isUUID = fallbackId && String(fallbackId).includes('-');
    
    return doctorUUID || (isUUID ? fallbackId : null);
  }, [slotsResponse, availabilityData, doctor, effectiveDoctorId]);

  useEffect(() => {
    if (selectedDateKey || !availableDates.length) return;

    const firstAvailableDate = parseApiDate(availableDates[0]);
    if (isValid(firstAvailableDate)) {
      setSelectedDate(firstAvailableDate);
      setSelectedSlot(null);
    }
  }, [availableDates, selectedDateKey]);

  const consultationFee = useMemo(() => {
    return doctor?.consultation_fee || null;
  }, [doctor]);

  const backendUnavailable = useMemo(() => {
    return [doctorQueryError, availabilityQueryError, slotsQueryError].some(isBackendConnectionIssue);
  }, [doctorQueryError, availabilityQueryError, slotsQueryError]);

  const handleDateSelect = useCallback((date) => {
    if (!date || !isValid(date)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const handleBookingTypeSelect = useCallback((type) => {
    setSelectedBookingType(type);
  }, []);

  const handlePatientDetailsChange = useCallback((field, value) => {
    setPatientDetails(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      if (!selectedSlot) {
        toast.error(t('booking.selectSlot', 'Please select a time slot'));
        return;
      }
    }

    if (currentStep === 2) {
      if (patientDetails.bookingFor !== 'self' && !patientDetails.patientName.trim()) {
        toast.error(t('booking.enterPatientName', 'Please enter patient name'));
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
  }, [currentStep, selectedSlot, patientDetails, t]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleConfirmBooking = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleSubmitBooking = useCallback(() => {
    if (!bookingDoctorId) {
      toast.error(t('errors.doctorNotFound', 'Doctor information not available'));
      return;
    }

    if (!selectedSlot?.start_time) {
      toast.error(t('booking.selectSlot', 'Please select a time slot'));
      return;
    }

    if (!selectedDateKey) {
      toast.error(t('booking.selectDate', 'Please select a valid date'));
      return;
    }

    const appointmentData = {
      doctor_id: bookingDoctorId,
      appointment_date: selectedDateKey,
      start_time: selectedSlot.start_time,
      booking_type: selectedBookingType,
      reason: patientDetails.symptoms || '',
      symptoms: patientDetails.symptoms || '',
      patient_notes: patientDetails.notes || '',
    };

    if (selectedSlot?.id) {
      appointmentData.time_slot_id = selectedSlot.id;
    }

    createAppointmentMutation.mutate(appointmentData);
    setShowConfirmModal(false);
  }, [
    bookingDoctorId,
    t,
    selectedDateKey,
    selectedSlot,
    selectedBookingType,
    patientDetails,
    createAppointmentMutation
  ]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      handlePrevStep();
    } else {
      navigate(-1);
    }
  }, [currentStep, handlePrevStep, navigate]);

  if (!isOnline) {
    return <OfflineState />;
  }

  if (doctorLoading && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
          <div className="w-7 h-7 border-3 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading...</p>
      </div>
    );
  }

  if (!doctorLoading && (doctorError || !doctor)) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <ErrorState
          message={t('errors.doctorNotFound', 'Doctor not found')}
          onRetry={refetchDoctor}
        />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20">
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-4 py-4 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/[0.07]" />
          <div className="absolute top-10 -left-6 w-20 h-20 rounded-full bg-white/[0.05]" />

          <div className="relative z-10 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-white">
              {t('booking.title', 'Book Appointment')}
            </h1>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <DoctorSummaryCard doctor={doctor} />

        {backendUnavailable && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl mb-4 border border-red-100">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium">
              {t('booking.backendUnavailable', 'Backend server is not reachable. Please start backend and retry.')}
            </span>
          </div>
        )}

        {/* Step 1: Date, Time & Booking Type */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Booking Type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Video className="w-4 h-4 text-violet-500" />
                </div>
                {t('booking.selectType', 'Consultation Type')}
              </h3>
              <BookingTypeSelector
                selectedType={selectedBookingType}
                onSelectType={handleBookingTypeSelect}
              />
            </div>

            {/* Date Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-violet-500" />
                </div>
                {t('booking.selectDate', 'Select Date')}
              </h3>
              <CalendarPicker
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
                availableDates={availableDates}
                strictAvailability={false}
              />

              {availabilityError && !availabilityLoading && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl mt-3 border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">
                    {t('booking.availabilityError', 'Unable to load doctor availability. Please retry.')}
                  </span>
                  <button
                    onClick={() => refetchAvailability()}
                    className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-700"
                  >
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              )}
            </div>

            {/* Time Selection */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-violet-500" />
                </div>
                {t('booking.selectTime', 'Select Time')}
                {selectedDateKey && (
                  <span className="text-xs font-medium text-violet-400 ml-auto">
                    {format(selectedDate, 'MMM d')}
                  </span>
                )}
              </h3>

              {!isAvailableOnDate && !slotsLoading && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl mb-3 mt-3 border border-amber-100">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-amber-700 font-medium">
                    {slotsResponse?.data?.reason || t('booking.doctorUnavailable', 'Doctor is not available on this date')}
                  </span>
                </div>
              )}

              <div className="mt-3">
                <TimeSlotGrid
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelectSlot={handleSlotSelect}
                  isLoading={slotsLoading}
                />

                {slotsError && !slotsLoading && !backendUnavailable && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                    {t('booking.slotLoadError', 'Could not load slots for this date. Please try again.')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Patient Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-500" />
                </div>
                {t('booking.patientDetails', 'Patient Details')}
              </h3>

              <div className="space-y-4">
                <Select
                  label={t('booking.bookingFor', 'Booking For')}
                  value={patientDetails.bookingFor}
                  onChange={(e) => handlePatientDetailsChange('bookingFor', e.target.value)}
                  options={BOOKING_FOR_OPTIONS}
                />

                {patientDetails.bookingFor !== 'self' && (
                  <>
                    <Input
                      label={t('booking.patientName', 'Patient Name')}
                      value={patientDetails.patientName}
                      onChange={(e) => handlePatientDetailsChange('patientName', e.target.value)}
                      placeholder="Enter patient name"
                      required
                    />
                    <Input
                      label={t('booking.patientPhone', 'Patient Phone')}
                      value={patientDetails.patientPhone}
                      onChange={(e) => handlePatientDetailsChange('patientPhone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={t('booking.age', 'Age')}
                    type="number"
                    value={patientDetails.patientAge}
                    onChange={(e) => handlePatientDetailsChange('patientAge', e.target.value)}
                    placeholder="Age"
                    min="0"
                    max="150"
                  />
                  <Select
                    label={t('booking.gender', 'Gender')}
                    value={patientDetails.patientGender}
                    onChange={(e) => handlePatientDetailsChange('patientGender', e.target.value)}
                    options={[
                      { value: '', label: 'Select' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </div>

                <TextArea
                  label={t('booking.symptoms', 'Symptoms / Reason for Visit')}
                  value={patientDetails.symptoms}
                  onChange={(e) => handlePatientDetailsChange('symptoms', e.target.value)}
                  placeholder="Describe your symptoms or reason for consultation..."
                  rows={3}
                />

                <TextArea
                  label={t('booking.notes', 'Additional Notes (Optional)')}
                  value={patientDetails.notes}
                  onChange={(e) => handlePatientDetailsChange('notes', e.target.value)}
                  placeholder="Any additional information for the doctor..."
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm & Pay */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <BookingSummary
              doctor={doctor}
              date={selectedDate}
              slot={selectedSlot}
              bookingType={selectedBookingType}
              fee={consultationFee}
            />

            {/* Patient Info Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-500" />
                </div>
                {t('booking.patientInfo', 'Patient Information')}
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-medium">{t('booking.name', 'Name')}</span>
                  <span className="font-semibold text-gray-900">
                    {patientDetails.bookingFor === 'self'
                      ? (user?.full_name || user?.first_name || 'Patient')
                      : patientDetails.patientName}
                  </span>
                </div>
                {patientDetails.patientAge && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">{t('booking.age', 'Age')}</span>
                    <span className="font-semibold text-gray-900">{patientDetails.patientAge} years</span>
                  </div>
                )}
                {patientDetails.patientGender && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-400 font-medium">{t('booking.gender', 'Gender')}</span>
                    <span className="font-semibold text-gray-900 capitalize">{patientDetails.patientGender}</span>
                  </div>
                )}
                {patientDetails.symptoms && (
                  <div className="pt-2">
                    <span className="text-gray-400 font-medium text-xs">{t('booking.symptoms', 'Symptoms')}</span>
                    <p className="font-medium text-gray-900 mt-1 text-sm bg-gray-50 rounded-xl p-3">{patientDetails.symptoms}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Policies */}
            <div className="bg-violet-50/50 rounded-2xl border border-violet-100/50 p-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-violet-500" />
                </div>
                <div className="text-sm">
                  <p className="font-bold text-violet-900 text-xs mb-1.5">{t('booking.policies', 'Booking Policies')}</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2 text-xs text-violet-700">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                      {t('booking.policyApproval', 'Doctor will review and confirm your appointment request.')}
                    </li>
                    <li className="flex items-start gap-2 text-xs text-violet-700">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                      {t('booking.policy1', 'Free cancellation up to 2 hours before')}
                    </li>
                    <li className="flex items-start gap-2 text-xs text-violet-700">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                      {t('booking.policy2', 'Join 5 minutes before scheduled time')}
                    </li>
                    <li className="flex items-start gap-2 text-xs text-violet-700">
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                      {t('booking.policy3', 'Prescription sent after consultation')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-30 shadow-2xl shadow-black/5 rounded-t-3xl">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              className="flex-shrink-0 !rounded-xl !border-violet-200 !text-violet-600 hover:!bg-violet-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('common.back', 'Back')}
            </Button>
          )}

          {currentStep < 3 ? (
            <Button
              variant="primary"
              onClick={handleNextStep}
              fullWidth
              disabled={currentStep === 1 && !selectedSlot}
              className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !font-bold disabled:!bg-gray-200 disabled:!text-gray-400 shadow-lg shadow-violet-200 disabled:shadow-none transition-all duration-200"
            >
              {t('common.continue', 'Continue')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleConfirmBooking}
              fullWidth
              loading={createAppointmentMutation.isPending}
              className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !font-bold shadow-lg shadow-violet-200 transition-all duration-200"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {consultationFee
                ? t('booking.payAndBook', 'Pay ₹{{amount}} & Book', { amount: consultationFee })
                : t('booking.confirmBooking', 'Confirm Booking')
              }
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={t('booking.confirmBooking', 'Confirm Booking')}
        size="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-gray-500 text-sm">
            {t('booking.confirmMessage', 'You are about to book an appointment with Dr. {{name}}.', {
              name: doctor.full_name,
            })}
          </p>

          <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100">
            <Info className="w-4 h-4 text-violet-500 mt-0.5" />
            <p className="text-xs text-violet-700 font-medium">
              {t('booking.pendingNote', 'This request will be marked as pending until the doctor confirms it.')}
            </p>
          </div>

          <div className="bg-violet-50 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-violet-500" />
              </div>
              <span className="font-semibold text-gray-900">{selectedDateKey ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '-'}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-violet-500" />
              </div>
              <span className="font-semibold text-gray-900">{selectedSlot?.start_time}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 !rounded-xl"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitBooking}
              loading={createAppointmentMutation.isPending}
              className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700"
            >
              {t('common.confirm', 'Confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BookAppointment;