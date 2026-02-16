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
import { authService, appointmentService } from '../../services/api';

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
  { id: 1, title: 'Select Date & Time', icon: Calendar },
  { id: 2, title: 'Patient Details', icon: User },
  { id: 3, title: 'Confirm & Pay', icon: CreditCard }
];

const CONSULTATION_TYPES = {
  video: { icon: Video, label: 'Video Consultation', color: 'text-blue-500', bg: 'bg-blue-100' },
  audio: { icon: Phone, label: 'Audio Consultation', color: 'text-green-500', bg: 'bg-green-100' },
  in_person: { icon: MapPin, label: 'In-Person Visit', color: 'text-purple-500', bg: 'bg-purple-100' }
};

const BOOKING_FOR_OPTIONS = [
  { value: 'self', label: 'Myself' },
  { value: 'family', label: 'Family Member' },
  { value: 'other', label: 'Someone Else' }
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.errorOccurred', 'Something went wrong')}
      </h3>
      <p className="text-gray-500 text-center mb-4">{message}</p>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

// Step Indicator
const StepIndicator = ({ steps, currentStep }) => (
  <div className="flex items-center justify-between px-4 py-4 bg-white border-b">
    {steps.map((step, index) => {
      const Icon = step.icon;
      const isActive = currentStep === step.id;
      const isCompleted = currentStep > step.id;
      
      return (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center transition-colors
              ${isCompleted ? 'bg-green-500 text-white' : 
                isActive ? 'bg-primary-500 text-white' : 
                'bg-gray-200 text-gray-500'}
            `}>
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
            </div>
            <span className={`text-xs mt-1 font-medium ${isActive ? 'text-primary-600' : 'text-gray-500'}`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      );
    })}
  </div>
);

// Doctor Summary Card
const DoctorSummaryCard = ({ doctor }) => {
  const { t } = useTranslation();
  
  if (!doctor) return null;
  
  return (
    <Card className="p-4 mb-4">
      <div className="flex gap-4">
        <Avatar
          src={doctor.profile_picture}
          name={doctor.full_name || doctor.first_name}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            Dr. {doctor.full_name || `${doctor.first_name} ${doctor.last_name || ''}`}
          </h3>
          <p className="text-sm text-primary-600">
            {doctor.specialization_display || doctor.specialization}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            {doctor.rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {doctor.rating.toFixed(1)}
              </span>
            )}
            {doctor.experience_years > 0 && (
              <span className="text-gray-500">
                {doctor.experience_years} {t('doctors.yearsExp', 'years')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Calendar Component
const CalendarPicker = ({ selectedDate, onSelectDate, availableDates = [] }) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    
    // Add padding for start of week
    const startDay = getDay(start);
    const paddingDays = Array(startDay).fill(null);
    
    return [...paddingDays, ...daysInMonth];
  }, [currentMonth]);

  const isDateAvailable = (date) => {
    if (!date) return false;
    if (isBefore(startOfDay(date), startOfDay(new Date()))) return false;
    if (availableDates.length === 0) return true;
    return availableDates.some(d => isSameDay(new Date(d), date));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="bg-white rounded-xl p-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          disabled={isSameMonth(currentMonth, new Date())}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
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
                aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${isSelected 
                  ? 'bg-primary-500 text-white' 
                  : isAvailable
                    ? isTodayDate
                      ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                      : 'hover:bg-gray-100 text-gray-700'
                    : 'text-gray-300 cursor-not-allowed'
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

// Time Slot Grid
const TimeSlotGrid = ({ slots, selectedSlot, onSelectSlot, isLoading }) => {
  const { t } = useTranslation();

  const groupedSlots = useMemo(() => {
    if (!slots?.length) return { morning: [], afternoon: [], evening: [] };

    return slots.reduce((acc, slot) => {
      const timeStr = slot.time || slot.start_time || '';
      const hour = parseInt(timeStr.split(':')[0] || '12');
      
      if (hour < 12) acc.morning.push(slot);
      else if (hour < 17) acc.afternoon.push(slot);
      else acc.evening.push(slot);
      
      return acc;
    }, { morning: [], afternoon: [], evening: [] });
  }, [slots]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader size="md" />
      </div>
    );
  }

  if (!slots?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>{t('booking.noSlots', 'No slots available for this date')}</p>
        <p className="text-sm mt-1">{t('booking.tryAnotherDate', 'Please try another date')}</p>
      </div>
    );
  }

  const renderSlotGroup = (title, slots) => {
    if (!slots.length) return null;
    
    return (
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => {
            const time = slot.time || slot.start_time;
            const isSelected = selectedSlot?.id === slot.id || selectedSlot?.time === time;
            const isBooked = slot.is_booked;
            
            return (
              <button
                key={slot.id || time}
                onClick={() => !isBooked && onSelectSlot(slot)}
                disabled={isBooked}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${isBooked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                    : isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-500'
                  }
                `}
              >
                {time}
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

// Consultation Type Selector
const ConsultationTypeSelector = ({ types, selectedType, onSelectType }) => {
  return (
    <div className="space-y-3">
      {types.map((type) => {
        const config = CONSULTATION_TYPES[type.type] || CONSULTATION_TYPES.video;
        const Icon = config.icon;
        const isSelected = selectedType === type.type;
        
        return (
          <button
            key={type.type}
            onClick={() => type.available && onSelectType(type.type)}
            disabled={!type.available}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              ${!type.available
                ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
                : isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-300 bg-white'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{config.label}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-primary-500" />}
                </div>
                <span className="text-sm text-gray-500">₹{type.fee}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Booking Summary
const BookingSummary = ({ doctor, date, slot, consultationType, fee }) => {
  const { t } = useTranslation();
  const typeConfig = CONSULTATION_TYPES[consultationType] || CONSULTATION_TYPES.video;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="p-4 bg-gray-50">
      <h3 className="font-semibold text-gray-900 mb-3">
        {t('booking.summary', 'Booking Summary')}
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">{t('booking.date', 'Date')}</p>
            <p className="font-medium text-gray-900">
              {date ? format(date, 'EEEE, MMMM d, yyyy') : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-500">{t('booking.time', 'Time')}</p>
            <p className="font-medium text-gray-900">
              {slot?.time || slot?.start_time || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
          <div>
            <p className="text-sm text-gray-500">{t('booking.type', 'Consultation Type')}</p>
            <p className="font-medium text-gray-900">{typeConfig.label}</p>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">{t('booking.consultationFee', 'Consultation Fee')}</span>
            <span className="font-semibold text-gray-900">₹{fee}</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-lg">
            <span className="font-semibold text-gray-900">{t('booking.total', 'Total')}</span>
            <span className="font-bold text-primary-600">₹{fee}</span>
          </div>
        </div>
      </div>
    </Card>
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

  // Get pre-selected data from navigation state
  const preSelectedData = location.state || {};

  // Online status
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
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    preSelectedData.date ? new Date(preSelectedData.date) : new Date()
  );
  const [selectedSlot, setSelectedSlot] = useState(preSelectedData.slot || null);
  const [selectedType, setSelectedType] = useState(preSelectedData.consultationType || 'video');
  const [patientDetails, setPatientDetails] = useState({
    bookingFor: 'self',
    patientName: user?.full_name || '',
    patientPhone: user?.phone_number || '',
    patientAge: '',
    patientGender: '',
    symptoms: '',
    notes: ''
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch doctor details
  const {
    data: doctorData,
    isLoading: doctorLoading,
    isError: doctorError,
    refetch: refetchDoctor
  } = useQuery({
    queryKey: ['doctor', doctorId],
    queryFn: () => authService.getDoctorById(doctorId),
    enabled: !!doctorId && isOnline,
    staleTime: 1000 * 60 * 10,
    initialData: preSelectedData.doctor ? { data: preSelectedData.doctor } : undefined
  });

  // Fetch available slots
  const {
    data: slotsData,
    isLoading: slotsLoading,
    refetch: refetchSlots
  } = useQuery({
    queryKey: ['slots', doctorId, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: () => appointmentService.getAvailableSlots(doctorId, format(selectedDate, 'yyyy-MM-dd')),
    enabled: !!doctorId && !!selectedDate && isOnline,
    staleTime: 1000 * 60 * 2
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data) => appointmentService.create(data),
    onSuccess: (response) => {
      toast.success(t('booking.success', 'Appointment booked successfully!'));
      navigate('/patient/appointments', { 
        state: { newAppointment: response.data } 
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('booking.error', 'Failed to book appointment'));
    }
  });

  // Extract data
  const doctor = doctorData?.data || doctorData;
  const slots = slotsData?.data || slotsData || [];

  // Consultation types
  const consultationTypes = useMemo(() => {
    if (!doctor) return [];
    
    const types = [];
    
    if (doctor.offers_video !== false) {
      types.push({
        type: 'video',
        fee: doctor.video_consultation_fee || doctor.consultation_fee || 500,
        available: true
      });
    }
    
    if (doctor.offers_audio !== false) {
      types.push({
        type: 'audio',
        fee: doctor.audio_consultation_fee || doctor.consultation_fee || 400,
        available: true
      });
    }
    
    if (doctor.offers_in_person !== false && doctor.hospital_address) {
      types.push({
        type: 'in_person',
        fee: doctor.in_person_fee || doctor.consultation_fee || 600,
        available: true
      });
    }
    
    return types;
  }, [doctor]);

  // Get current fee
  const currentFee = useMemo(() => {
    const type = consultationTypes.find(t => t.type === selectedType);
    return type?.fee || doctor?.consultation_fee || 500;
  }, [consultationTypes, selectedType, doctor]);

  // Handlers
  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const handleSlotSelect = useCallback((slot) => {
    setSelectedSlot(slot);
  }, []);

  const handleTypeSelect = useCallback((type) => {
    setSelectedType(type);
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
    const appointmentData = {
      doctor: doctorId,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time_slot: selectedSlot.time || selectedSlot.start_time,
      slot_id: selectedSlot.id,
      consultation_type: selectedType,
      booking_for: patientDetails.bookingFor,
      patient_name: patientDetails.bookingFor === 'self' ? user?.full_name : patientDetails.patientName,
      patient_phone: patientDetails.bookingFor === 'self' ? user?.phone_number : patientDetails.patientPhone,
      patient_age: patientDetails.patientAge,
      patient_gender: patientDetails.patientGender,
      symptoms: patientDetails.symptoms,
      notes: patientDetails.notes,
      fee: currentFee
    };

    createAppointmentMutation.mutate(appointmentData);
    setShowConfirmModal(false);
  }, [doctorId, selectedDate, selectedSlot, selectedType, patientDetails, user, currentFee, createAppointmentMutation]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      handlePrevStep();
    } else {
      navigate(-1);
    }
  }, [currentStep, handlePrevStep, navigate]);

  // Offline state
  if (!isOnline) {
    return <OfflineState />;
  }

  // Loading state
  if (doctorLoading && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  // Error state
  if (doctorError || !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <ErrorState 
          message={t('errors.doctorNotFound', 'Doctor not found')}
          onRetry={refetchDoctor}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {t('booking.title', 'Book Appointment')}
          </h1>
        </div>
        
        {/* Step Indicator */}
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Doctor Summary */}
        <DoctorSummaryCard doctor={doctor} />

        {/* Step 1: Date, Time & Type Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Consultation Type */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('booking.selectType', 'Select Consultation Type')}
              </h3>
              <ConsultationTypeSelector
                types={consultationTypes}
                selectedType={selectedType}
                onSelectType={handleTypeSelect}
              />
            </Card>

            {/* Date Selection */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('booking.selectDate', 'Select Date')}
              </h3>
              <CalendarPicker
                selectedDate={selectedDate}
                onSelectDate={handleDateSelect}
              />
            </Card>

            {/* Time Selection */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('booking.selectTime', 'Select Time')}
                {selectedDate && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({format(selectedDate, 'MMM d, yyyy')})
                  </span>
                )}
              </h3>
              <TimeSlotGrid
                slots={slots}
                selectedSlot={selectedSlot}
                onSelectSlot={handleSlotSelect}
                isLoading={slotsLoading}
              />
            </Card>
          </div>
        )}

        {/* Step 2: Patient Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">
                {t('booking.patientDetails', 'Patient Details')}
              </h3>
              
              <div className="space-y-4">
                {/* Booking For */}
                <Select
                  label={t('booking.bookingFor', 'Booking For')}
                  value={patientDetails.bookingFor}
                  onChange={(e) => handlePatientDetailsChange('bookingFor', e.target.value)}
                  options={BOOKING_FOR_OPTIONS}
                />

                {/* Patient Name (for family/other) */}
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

                <div className="grid grid-cols-2 gap-4">
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
            </Card>
          </div>
        )}

        {/* Step 3: Confirm & Pay */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <BookingSummary
              doctor={doctor}
              date={selectedDate}
              slot={selectedSlot}
              consultationType={selectedType}
              fee={currentFee}
            />

            {/* Patient Info Summary */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {t('booking.patientInfo', 'Patient Information')}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('booking.name', 'Name')}</span>
                  <span className="font-medium text-gray-900">
                    {patientDetails.bookingFor === 'self' ? user?.full_name : patientDetails.patientName}
                  </span>
                </div>
                {patientDetails.patientAge && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('booking.age', 'Age')}</span>
                    <span className="font-medium text-gray-900">{patientDetails.patientAge} years</span>
                  </div>
                )}
                {patientDetails.patientGender && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('booking.gender', 'Gender')}</span>
                    <span className="font-medium text-gray-900 capitalize">{patientDetails.patientGender}</span>
                  </div>
                )}
                {patientDetails.symptoms && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-500">{t('booking.symptoms', 'Symptoms')}</span>
                    <p className="font-medium text-gray-900 mt-1">{patientDetails.symptoms}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Policies */}
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">{t('booking.policies', 'Booking Policies')}</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-600">
                    <li>{t('booking.policy1', 'Free cancellation up to 2 hours before appointment')}</li>
                    <li>{t('booking.policy2', 'Please join 5 minutes before scheduled time')}</li>
                    <li>{t('booking.policy3', 'Prescription will be sent after consultation')}</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-30">
        <div className="flex gap-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              className="flex-shrink-0"
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
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t('booking.payAndBook', 'Pay ₹{{amount}} & Book', { amount: currentFee })}
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
        <div className="space-y-4">
          <p className="text-gray-600">
            {t('booking.confirmMessage', 'You are about to book an appointment with Dr. {{name}} for ₹{{amount}}.', {
              name: doctor.full_name || doctor.first_name,
              amount: currentFee
            })}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm mt-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>{selectedSlot?.time || selectedSlot?.start_time}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="flex-1"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitBooking}
              loading={createAppointmentMutation.isPending}
              className="flex-1"
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