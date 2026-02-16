import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  Star,
  Clock,
  MapPin,
  Video,
  Calendar,
  Award,
  Users,
  Heart,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  Loader2,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { doctorsAPI, appointmentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DoctorList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // State
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    specialization: searchParams.get('specialization') || '',
    availability: searchParams.get('availability') || '',
    rating: searchParams.get('rating') || '',
    gender: searchParams.get('gender') || '',
    minFee: parseInt(searchParams.get('minFee')) || 0,
    maxFee: parseInt(searchParams.get('maxFee')) || 5000
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Booking modal state
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('video');
  const [bookingReason, setBookingReason] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Confirmation modal
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  // Specializations list
  const specializations = useMemo(() => [
    { value: 'general_physician', label: t('specializations.generalPhysician', 'General Physician') },
    { value: 'cardiologist', label: t('specializations.cardiologist', 'Cardiologist') },
    { value: 'pediatrician', label: t('specializations.pediatrician', 'Pediatrician') },
    { value: 'orthopedic', label: t('specializations.orthopedic', 'Orthopedic') },
    { value: 'gynecologist', label: t('specializations.gynecologist', 'Gynecologist') },
    { value: 'dermatologist', label: t('specializations.dermatologist', 'Dermatologist') },
    { value: 'psychiatrist', label: t('specializations.psychiatrist', 'Psychiatrist') },
    { value: 'neurologist', label: t('specializations.neurologist', 'Neurologist') },
    { value: 'ent', label: t('specializations.ent', 'ENT Specialist') },
    { value: 'ophthalmologist', label: t('specializations.ophthalmologist', 'Ophthalmologist') },
    { value: 'dentist', label: t('specializations.dentist', 'Dentist') },
    { value: 'ayurveda', label: t('specializations.ayurveda', 'Ayurveda') },
    { value: 'homeopathy', label: t('specializations.homeopathy', 'Homeopathy') }
  ], [t]);

  // Generate next 7 days for date selection
  const availableDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: i === 0
      });
    }
    return dates;
  }, []);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        specialization: filters.specialization || undefined,
        is_available: filters.availability === 'online' ? true : undefined,
        min_rating: filters.rating || undefined,
        gender: filters.gender || undefined,
        min_fee: filters.minFee > 0 ? filters.minFee : undefined,
        max_fee: filters.maxFee < 5000 ? filters.maxFee : undefined,
        ordering: sortBy === 'rating' ? '-rating' : 
                  sortBy === 'experience' ? '-experience_years' :
                  sortBy === 'fee_low' ? 'consultation_fee' :
                  sortBy === 'fee_high' ? '-consultation_fee' : undefined
      };

      // Remove undefined values
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await doctorsAPI.list(params);
      const data = response.data;

      // Handle different response formats
      const doctorsList = data.results || data.doctors || data || [];
      const total = data.count || data.total || doctorsList.length;
      
      setDoctors(Array.isArray(doctorsList) ? doctorsList : []);
      setPagination(prev => ({
        ...prev,
        total,
        totalPages: Math.ceil(total / prev.limit)
      }));

    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError(t('doctorList.fetchError', 'Failed to load doctors. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filters, sortBy, pagination.page, pagination.limit, t]);

  // Initial fetch
  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (filters.specialization) params.set('specialization', filters.specialization);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.rating) params.set('rating', filters.rating);
    if (sortBy !== 'relevance') params.set('sort', sortBy);
    
    setSearchParams(params, { replace: true });
  }, [searchTerm, filters, sortBy, setSearchParams]);

  // Fetch available slots when doctor and date selected
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    setIsLoadingSlots(true);
    setSelectedSlot(null);

    try {
      const response = await appointmentsAPI.getAvailableSlots(selectedDoctor.id, selectedDate);
      const slots = response.data?.slots || response.data || [];
      setAvailableSlots(Array.isArray(slots) ? slots : []);
    } catch (err) {
      console.error('Error fetching slots:', err);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Handle booking
  const handleBookAppointment = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) {
      return;
    }

    setIsBooking(true);

    try {
      const payload = {
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        start_time: selectedSlot.start_time || selectedSlot.time || selectedSlot,
        booking_type: appointmentType,
        reason: bookingReason || undefined,
        consultation_type: appointmentType
      };

      const response = await appointmentsAPI.create(payload);
      
      // Store booking details for confirmation
      setBookingDetails({
        appointmentId: response.data.id || response.data.appointment_id,
        doctorName: selectedDoctor.name || `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}`,
        date: selectedDate,
        time: selectedSlot.start_time || selectedSlot.time || selectedSlot,
        type: appointmentType,
        fee: selectedDoctor.consultation_fee || selectedDoctor.fee
      });

      // Close booking modal and show confirmation
      setSelectedDoctor(null);
      setShowConfirmation(true);

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('appointmentBooked', {
        detail: { 
          appointmentId: response.data.id,
          doctorId: selectedDoctor.id 
        }
      }));

    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage = err?.message || err?.data?.detail || t('doctorList.bookingError', 'Failed to book appointment');
      alert(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  // Reset booking modal
  const resetBookingModal = () => {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setBookingReason('');
    setAppointmentType('video');
  };

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      specialization: '',
      availability: '',
      rating: '',
      gender: '',
      minFee: 0,
      maxFee: 5000
    });
    setSearchTerm('');
    setSortBy('relevance');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Check if any filters are active
  const hasActiveFilters = filters.specialization || filters.availability || 
    filters.rating || filters.gender || filters.minFee > 0 || filters.maxFee < 5000;

  // Format doctor name
  const formatDoctorName = (doctor) => {
    if (doctor.name) return doctor.name;
    const firstName = doctor.first_name || '';
    const lastName = doctor.last_name || '';
    return `Dr. ${firstName} ${lastName}`.trim();
  };

  // Render doctor card
  const renderDoctorCard = (doctor) => {
    const doctorName = formatDoctorName(doctor);
    const initials = doctorName.split(' ').filter(n => n).slice(0, 2).map(n => n[0]).join('');
    const rating = doctor.rating || doctor.average_rating || 0;
    const totalRatings = doctor.total_ratings || doctor.reviews_count || 0;
    const experience = doctor.experience_years || doctor.experience || 0;
    const fee = doctor.consultation_fee || doctor.fee || 0;
    const isOnline = doctor.is_available || doctor.is_online || false;
    const specialization = doctor.specialization || doctor.specialty || '';
    const hospital = doctor.hospital_name || doctor.clinic_name || doctor.hospital || '';
    const languages = doctor.languages || [];
    const nextAvailable = doctor.next_available_slot || doctor.next_available || '';

    return (
      <div 
        key={doctor.id} 
        className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow"
      >
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Doctor Avatar and Basic Info */}
          <div className="flex items-start gap-4 lg:w-1/4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
              {doctor.profile_image ? (
                <img 
                  src={doctor.profile_image} 
                  alt={doctorName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-blue-600">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{doctorName}</h3>
              <p className="text-blue-600 font-medium capitalize">{specialization.replace('_', ' ')}</p>
              <div className="flex items-center mt-1">
                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="ml-1 font-bold text-sm">{rating.toFixed(1)}</span>
                <span className="ml-1 text-gray-500 text-sm">({totalRatings})</span>
              </div>
              
              {/* Online Status - Mobile */}
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2 lg:hidden ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                {isOnline ? t('doctorList.online', 'Online') : t('doctorList.offline', 'Offline')}
              </div>
            </div>
          </div>

          {/* Doctor Details */}
          <div className="lg:w-2/4 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{t('doctorList.experience', 'Experience')}</div>
                <div className="font-medium text-sm">{experience} {t('doctorList.years', 'years')}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{t('doctorList.nextAvailable', 'Next Available')}</div>
                <div className="font-medium text-sm">{nextAvailable || t('doctorList.checkSlots', 'Check slots')}</div>
              </div>
            </div>
            
            {hospital && (
              <div className="flex items-start gap-2 col-span-2 sm:col-span-1">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('doctorList.hospital', 'Hospital')}</div>
                  <div className="font-medium text-sm truncate">{hospital}</div>
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{t('doctorList.fee', 'Consultation Fee')}</div>
                <div className="font-medium text-sm">₹{fee}</div>
              </div>
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-1">{t('doctorList.languages', 'Languages')}</div>
                <div className="flex flex-wrap gap-1">
                  {languages.slice(0, 3).map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                    >
                      {lang}
                    </span>
                  ))}
                  {languages.length > 3 && (
                    <span className="px-2 py-0.5 text-gray-500 text-xs">
                      +{languages.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="lg:w-1/4 flex flex-row lg:flex-col gap-2 sm:gap-3">
            {/* Online Status - Desktop */}
            <div className={`hidden lg:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium self-start ${
              isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {isOnline ? t('doctorList.online', 'Online') : t('doctorList.offline', 'Offline')}
            </div>

            <button
              onClick={() => {
                setSelectedDoctor(doctor);
                setSelectedDate(availableDates[0].date);
              }}
              className="flex-1 lg:flex-none py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t('doctorList.bookSlot', 'Book Slot')}
            </button>
            
            <Link
              to={`/doctors/${doctor.id}`}
              className="flex-1 lg:flex-none py-2.5 px-4 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors text-center"
            >
              {t('doctorList.viewProfile', 'View Profile')}
            </Link>

            {/* Badges */}
            <div className="hidden lg:flex flex-col gap-1 mt-2">
              {doctor.is_verified && (
                <div className="flex items-center text-xs text-gray-600">
                  <Shield className="h-3 w-3 mr-1 text-green-500" />
                  {t('doctorList.verified', 'Verified')}
                </div>
              )}
              {doctor.emergency_available && (
                <div className="flex items-center text-xs text-gray-600">
                  <Heart className="h-3 w-3 mr-1 text-red-400" />
                  {t('doctorList.emergencyAvailable', 'Emergency Available')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render skeleton loading
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-xl border p-6 animate-pulse">
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-32 space-y-2">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t('doctorList.title', 'Find Doctors')}
          </h1>
          <p className="text-gray-600">
            {t('doctorList.subtitle', 'Book appointments with verified healthcare professionals')}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                placeholder={t('doctorList.searchPlaceholder', 'Search by name, specialization, or hospital...')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Specialization Quick Filter */}
            <select
              value={filters.specialization}
              onChange={(e) => handleFilterChange('specialization', e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">{t('doctorList.allSpecializations', 'All Specializations')}</option>
              {specializations.map(spec => (
                <option key={spec.value} value={spec.value}>{spec.label}</option>
              ))}
            </select>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                hasActiveFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t('doctorList.filters', 'Filters')}</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                  {Object.values(filters).filter(f => f && f !== 0 && f !== 5000).length}
                </span>
              )}
            </button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('doctorList.availability', 'Availability')}
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => handleFilterChange('availability', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('doctorList.all', 'All')}</option>
                    <option value="online">{t('doctorList.onlineNow', 'Online Now')}</option>
                    <option value="today">{t('doctorList.availableToday', 'Available Today')}</option>
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('doctorList.minRating', 'Minimum Rating')}
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) => handleFilterChange('rating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('doctorList.anyRating', 'Any Rating')}</option>
                    <option value="4.5">4.5+ ★</option>
                    <option value="4.0">4.0+ ★</option>
                    <option value="3.5">3.5+ ★</option>
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('doctorList.gender', 'Doctor Gender')}
                  </label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('doctorList.anyGender', 'Any')}</option>
                    <option value="male">{t('doctorList.male', 'Male')}</option>
                    <option value="female">{t('doctorList.female', 'Female')}</option>
                  </select>
                </div>

                {/* Fee Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('doctorList.feeRange', 'Fee Range')}: ₹{filters.minFee} - ₹{filters.maxFee}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={filters.maxFee}
                      value={filters.minFee}
                      onChange={(e) => handleFilterChange('minFee', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Min"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      min={filters.minFee}
                      max="10000"
                      value={filters.maxFee}
                      onChange={(e) => handleFilterChange('maxFee', parseInt(e.target.value) || 5000)}
                      className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Max"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    {t('doctorList.clearFilters', 'Clear all filters')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-700">
              {isLoading ? (
                t('doctorList.loading', 'Loading...')
              ) : (
                <>
                  {t('doctorList.found', 'Found')}{' '}
                  <span className="font-bold">{pagination.total}</span>{' '}
                  {t('doctorList.doctors', 'doctors')}
                </>
              )}
            </span>
            <button
              onClick={() => fetchDoctors()}
              disabled={isLoading}
              className="p-1 text-gray-400 hover:text-gray-600"
              aria-label={t('common.refresh', 'Refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('doctorList.sortBy', 'Sort by')}:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="relevance">{t('doctorList.relevance', 'Relevance')}</option>
              <option value="rating">{t('doctorList.highestRated', 'Highest Rated')}</option>
              <option value="experience">{t('doctorList.mostExperienced', 'Most Experienced')}</option>
              <option value="fee_low">{t('doctorList.feeLowToHigh', 'Fee: Low to High')}</option>
              <option value="fee_high">{t('doctorList.feeHighToLow', 'Fee: High to Low')}</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <div>
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => fetchDoctors()}
                  className="text-red-600 hover:text-red-800 text-sm mt-1 underline"
                >
                  {t('common.tryAgain', 'Try again')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Doctors List */}
        {isLoading ? (
          renderSkeleton()
        ) : doctors.length > 0 ? (
          <div className="space-y-4">
            {doctors.map(renderDoctorCard)}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('doctorList.noDoctorsFound', 'No doctors found')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('doctorList.tryDifferentFilters', 'Try adjusting your search or filters')}
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('doctorList.resetFilters', 'Reset Filters')}
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <span className="px-4 py-2 text-sm text-gray-600">
              {t('doctorList.page', 'Page')} {pagination.page} {t('doctorList.of', 'of')} {pagination.totalPages}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {selectedDoctor && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => resetBookingModal()}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('doctorList.bookAppointment', 'Book Appointment')}
                </h3>
                <p className="text-sm text-gray-600">{formatDoctorName(selectedDoctor)}</p>
              </div>
              <button
                onClick={() => resetBookingModal()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label={t('common.close', 'Close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctorList.selectDate', 'Select Date')}
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {availableDates.map((dateObj) => (
                    <button
                      key={dateObj.date}
                      onClick={() => setSelectedDate(dateObj.date)}
                      className={`p-2 sm:p-3 border rounded-lg text-center transition-colors ${
                        selectedDate === dateObj.date
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'hover:border-blue-500 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-xs">{dateObj.dayName}</div>
                      <div className="font-bold">{dateObj.dayNum}</div>
                      {dateObj.isToday && (
                        <div className="text-xs opacity-70">{t('doctorList.today', 'Today')}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctorList.selectTime', 'Select Time')}
                </label>
                
                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">{t('doctorList.loadingSlots', 'Loading available slots...')}</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availableSlots.map((slot, idx) => {
                      const slotTime = slot.start_time || slot.time || slot;
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSlot(slot)}
                          disabled={slot.is_booked}
                          className={`p-2 sm:p-3 border rounded-lg text-sm transition-colors ${
                            slot.is_booked
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          {slotTime}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>{t('doctorList.noSlotsAvailable', 'No slots available for this date')}</p>
                    <p className="text-sm mt-1">{t('doctorList.tryAnotherDate', 'Please try another date')}</p>
                  </div>
                )}
              </div>

              {/* Appointment Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctorList.consultationType', 'Consultation Type')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAppointmentType('video')}
                    className={`p-4 border rounded-lg flex flex-col items-center transition-colors ${
                      appointmentType === 'video'
                        ? 'bg-blue-50 border-blue-500'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <Video className={`h-6 w-6 mb-2 ${appointmentType === 'video' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{t('doctorList.videoConsult', 'Video Call')}</span>
                  </button>
                  <button
                    onClick={() => setAppointmentType('audio')}
                    className={`p-4 border rounded-lg flex flex-col items-center transition-colors ${
                      appointmentType === 'audio'
                        ? 'bg-green-50 border-green-500'
                        : 'hover:border-gray-400'
                    }`}
                  >
                    <Phone className={`h-6 w-6 mb-2 ${appointmentType === 'audio' ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{t('doctorList.audioCall', 'Audio Call')}</span>
                  </button>
                </div>
              </div>

              {/* Reason (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('doctorList.reason', 'Reason for visit')} ({t('common.optional', 'Optional')})
                </label>
                <textarea
                  value={bookingReason}
                  onChange={(e) => setBookingReason(e.target.value)}
                  placeholder={t('doctorList.reasonPlaceholder', 'Briefly describe your symptoms or reason for consultation...')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Fee Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{t('doctorList.consultationFee', 'Consultation Fee')}</span>
                  <span className="text-xl font-bold text-gray-900">
                    ₹{selectedDoctor.consultation_fee || selectedDoctor.fee || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-white sticky bottom-0">
              <div className="flex gap-3">
                <button
                  onClick={() => resetBookingModal()}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedSlot || isBooking}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t('doctorList.booking', 'Booking...')}
                    </>
                  ) : (
                    t('doctorList.confirmBooking', 'Confirm Booking')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && bookingDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('doctorList.bookingConfirmed', 'Booking Confirmed!')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('doctorList.bookingConfirmedMessage', 'Your appointment has been successfully booked.')}
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctorList.doctor', 'Doctor')}</span>
                  <span className="font-medium">{bookingDetails.doctorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctorList.date', 'Date')}</span>
                  <span className="font-medium">{new Date(bookingDetails.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctorList.time', 'Time')}</span>
                  <span className="font-medium">{bookingDetails.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('doctorList.type', 'Type')}</span>
                  <span className="font-medium capitalize">{bookingDetails.type}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-500">{t('doctorList.appointmentId', 'Appointment ID')}</span>
                  <span className="font-mono text-blue-600">{bookingDetails.appointmentId}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setBookingDetails(null);
                }}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
              >
                {t('common.close', 'Close')}
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setBookingDetails(null);
                  navigate('/appointments');
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                {t('doctorList.viewAppointments', 'View Appointments')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorList;