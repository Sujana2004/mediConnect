import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Star,
  MapPin,
  Award,
  Calendar,
  Phone,
  Video,
  Clock,
  Users,
  Shield,
  Heart,
  Share2,
  ChevronLeft,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Languages,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { doctorsAPI, appointmentsAPI, consultationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DoctorProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // State
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [copied, setCopied] = useState(false);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Generate next 7 days
  const getNext7Days = useCallback(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: i === 0
      });
    }
    return days;
  }, []);

  const availableDates = getNext7Days();

  // Fetch doctor details
  useEffect(() => {
    const fetchDoctor = async () => {
      setIsLoading(true);
      setError(null);

      // Check if doctor data passed via navigation state
      const passedDoctor = location?.state?.doctor;
      if (passedDoctor) {
        setDoctor(normalizeDoctor(passedDoctor));
      }

      try {
        const response = await doctorsAPI.getById(id);
        const data = response.data;
        
        if (data) {
          setDoctor(normalizeDoctor(data));
        } else {
          throw new Error('No doctor data received');
        }
      } catch (err) {
        console.error('Failed to load doctor:', err);
        // If we have passed doctor data, keep showing it
        if (!passedDoctor) {
          setError(t('doctorProfile.loadError', 'Failed to load doctor profile'));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctor();
  }, [id, location?.state?.doctor, t]);

  // Normalize doctor data from various API response formats
  const normalizeDoctor = (data) => {
    return {
      id: data.id || id,
      name: data.name || `Dr. ${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Doctor',
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      specialization: data.specialization || data.specialty || '',
      rating: data.rating || data.average_rating || 0,
      totalRatings: data.total_ratings || data.reviews_count || 0,
      experienceYears: data.experience_years || data.experience || 0,
      consultationFee: data.consultation_fee || data.fee || 0,
      languages: data.languages || [],
      hospital: data.hospital_name || data.clinic_name || data.hospital || '',
      address: data.address || data.clinic_address || '',
      education: data.education || data.qualifications || '',
      awards: data.awards || [],
      bio: data.bio || data.about || data.description || '',
      profileImage: data.profile_image || data.avatar || null,
      isOnline: data.is_available || data.is_online || false,
      isVerified: data.is_verified || false,
      emergencyAvailable: data.emergency_available || false,
      gender: data.gender || '',
      registrationNumber: data.registration_number || data.medical_license || '',
      nextAvailable: data.next_available_slot || null,
      totalPatients: data.total_patients || data.patients_count || 0,
      totalConsultations: data.total_consultations || 0
    };
  };

  // Fetch reviews
  useEffect(() => {
    if (doctor && activeTab === 'reviews') {
      fetchReviews();
    }
  }, [doctor, activeTab]);

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const response = await consultationAPI.getDoctorFeedbackSummary(id);
      setReviews(response.data?.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Fetch available slots for selected date
  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  const fetchSlots = async () => {
    try {
      const response = await appointmentsAPI.getAvailableSlots(id, selectedDate);
      setAvailableSlots(response.data?.slots || response.data || []);
    } catch (err) {
      console.error('Failed to load slots:', err);
      setAvailableSlots([]);
    }
  };

  // Handle share
  const handleShare = async () => {
    const url = window.location.href;
    const title = `${doctor?.name} - ${doctor?.specialization}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to copy
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Handle book appointment
  const handleBookAppointment = () => {
    // Navigate to doctors list with this doctor pre-selected for booking
    navigate(`/doctors?book=${id}`);
  };

  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex items-center" role="img" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= Math.floor(rating)
                ? 'text-yellow-400 fill-current'
                : star - 0.5 <= rating
                  ? 'text-yellow-400 fill-current opacity-50'
                  : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  // Loading skeleton
  if (isLoading && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button skeleton */}
          <div className="mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Profile card skeleton */}
          <div className="bg-white rounded-xl shadow-sm border p-6 animate-pulse">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar skeleton */}
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-gray-200 rounded"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
              
              {/* Details skeleton */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
              
              {/* Actions skeleton */}
              <div className="space-y-3 w-48">
                <div className="h-12 bg-gray-200 rounded-lg"></div>
                <div className="h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !doctor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-sm border">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('doctorProfile.errorTitle', 'Unable to Load Profile')}
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {t('common.goBack', 'Go Back')}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) return null;

  // Get initials for avatar
  const initials = doctor.name
    .split(' ')
    .filter(n => n)
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>{t('doctorProfile.backToList', 'Back to doctors')}</span>
          </button>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Header Section */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {doctor.profileImage ? (
                    <img
                      src={doctor.profileImage}
                      alt={doctor.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border-4 border-white shadow-md">
                      <span className="text-2xl sm:text-3xl font-bold text-blue-600">{initials}</span>
                    </div>
                  )}
                  
                  {/* Online indicator */}
                  {doctor.isOnline && (
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Name and Specialization */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{doctor.name}</h1>
                      <p className="text-blue-600 font-medium capitalize">
                        {doctor.specialization?.replace('_', ' ')}
                      </p>
                    </div>
                    
                    {/* Share button - Desktop */}
                    <button
                      onClick={handleShare}
                      className="hidden lg:flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label={t('common.share', 'Share')}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                      <span className="text-sm">{copied ? t('common.copied', 'Copied') : t('common.share', 'Share')}</span>
                    </button>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mt-2">
                    {renderStars(doctor.rating)}
                    <span className="font-bold">{doctor.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-500">({doctor.totalRatings} {t('doctorProfile.reviews', 'reviews')})</span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {doctor.isOnline && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                        {t('doctorProfile.online', 'Online Now')}
                      </span>
                    )}
                    {doctor.isVerified && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Shield className="h-3 w-3 mr-1" />
                        {t('doctorProfile.verified', 'Verified')}
                      </span>
                    )}
                    {doctor.emergencyAvailable && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Heart className="h-3 w-3 mr-1" />
                        {t('doctorProfile.emergency', 'Emergency')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons - Desktop */}
              <div className="hidden lg:flex flex-col gap-3 w-48 flex-shrink-0">
                <button
                  onClick={handleBookAppointment}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  {t('doctorProfile.bookAppointment', 'Book Appointment')}
                </button>
                
                <Link
                  to={`/consultation?doctor=${doctor.id}`}
                  className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  {t('doctorProfile.videoConsult', 'Video Consult')}
                </Link>

                {/* Fee */}
                <div className="pt-3 border-t text-center">
                  <p className="text-sm text-gray-500">{t('doctorProfile.consultationFee', 'Consultation Fee')}</p>
                  <p className="text-2xl font-bold text-gray-900">₹{doctor.consultationFee}</p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-full mx-auto mb-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <p className="font-bold text-gray-900">{doctor.experienceYears}+</p>
                <p className="text-xs text-gray-500">{t('doctorProfile.yearsExp', 'Years Exp.')}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-full mx-auto mb-2">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <p className="font-bold text-gray-900">{doctor.totalPatients || '500'}+</p>
                <p className="text-xs text-gray-500">{t('doctorProfile.patients', 'Patients')}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-full mx-auto mb-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                </div>
                <p className="font-bold text-gray-900">{doctor.totalConsultations || '1000'}+</p>
                <p className="text-xs text-gray-500">{t('doctorProfile.consultations', 'Consultations')}</p>
              </div>
              
              <div className="text-center hidden sm:block">
                <div className="flex items-center justify-center w-10 h-10 bg-yellow-50 rounded-full mx-auto mb-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <p className="font-bold text-gray-900">{doctor.rating?.toFixed(1) || '0.0'}</p>
                <p className="text-xs text-gray-500">{t('doctorProfile.rating', 'Rating')}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-b bg-gray-50">
            <div className="flex overflow-x-auto">
              {[
                { id: 'overview', label: t('doctorProfile.overview', 'Overview') },
                { id: 'availability', label: t('doctorProfile.availability', 'Availability') },
                { id: 'reviews', label: t('doctorProfile.reviews', 'Reviews') }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* About */}
                {doctor.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('doctorProfile.about', 'About')}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Hospital */}
                  {doctor.hospital && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('doctorProfile.hospital', 'Hospital/Clinic')}</p>
                        <p className="font-medium text-gray-900">{doctor.hospital}</p>
                        {doctor.address && (
                          <p className="text-sm text-gray-500 mt-0.5">{doctor.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {doctor.education && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('doctorProfile.education', 'Education')}</p>
                        <p className="font-medium text-gray-900">{doctor.education}</p>
                      </div>
                    </div>
                  )}

                  {/* Experience */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Award className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('doctorProfile.experience', 'Experience')}</p>
                      <p className="font-medium text-gray-900">
                        {doctor.experienceYears} {t('doctorProfile.years', 'years')}
                      </p>
                    </div>
                  </div>

                  {/* Languages */}
                  {doctor.languages?.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Languages className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">{t('doctorProfile.languages', 'Languages')}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {doctor.languages.map((lang, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Awards */}
                {doctor.awards?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      {t('doctorProfile.awards', 'Awards & Recognition')}
                    </h3>
                    <ul className="space-y-2">
                      {doctor.awards.map((award, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-600">
                          <Award className="h-4 w-4 text-yellow-500" />
                          {award}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Registration */}
                {doctor.registrationNumber && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      {t('doctorProfile.regNumber', 'Medical Registration')}: 
                      <span className="font-mono ml-2 text-gray-700">{doctor.registrationNumber}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('doctorProfile.selectDate', 'Select a date to view available slots')}
                  </h3>
                  
                  {/* Date Selection */}
                  <div className="grid grid-cols-7 gap-2">
                    {availableDates.map((dateObj) => (
                      <button
                        key={dateObj.date}
                        onClick={() => setSelectedDate(dateObj.date)}
                        className={`p-3 border rounded-lg text-center transition-colors ${
                          selectedDate === dateObj.date
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <div className="text-xs opacity-70">{dateObj.dayName}</div>
                        <div className="font-bold">{dateObj.dayNum}</div>
                        <div className="text-xs opacity-70">{dateObj.month}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                {selectedDate && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      {t('doctorProfile.availableSlots', 'Available Slots')} - {new Date(selectedDate).toLocaleDateString()}
                    </h4>
                    
                    {availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {availableSlots.map((slot, idx) => {
                          const time = slot.start_time || slot.time || slot;
                          return (
                            <button
                              key={idx}
                              onClick={() => navigate(`/doctors?book=${id}&date=${selectedDate}&time=${time}`)}
                              disabled={slot.is_booked}
                              className={`p-2 border rounded-lg text-sm transition-colors ${
                                slot.is_booked
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'hover:border-blue-500 hover:bg-blue-50'
                              }`}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>{t('doctorProfile.noSlots', 'No slots available for this date')}</p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedDate && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>{t('doctorProfile.selectDatePrompt', 'Select a date to see available time slots')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Rating Summary */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-900">{doctor.rating?.toFixed(1) || '0.0'}</p>
                    <div className="mt-1">{renderStars(doctor.rating)}</div>
                    <p className="text-sm text-gray-500 mt-1">{doctor.totalRatings} {t('doctorProfile.reviews', 'reviews')}</p>
                  </div>
                </div>

                {/* Reviews List */}
                {isLoadingReviews ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review, idx) => (
                      <div key={idx} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="font-medium">{review.patient_name || 'Patient'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 text-sm">{review.comment}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>{t('doctorProfile.noReviews', 'No reviews yet')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Action Buttons */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-3 z-10">
          <div className="flex-1 text-center">
            <p className="text-xs text-gray-500">{t('doctorProfile.fee', 'Fee')}</p>
            <p className="font-bold">₹{doctor.consultationFee}</p>
          </div>
          <button
            onClick={handleBookAppointment}
            className="flex-[2] py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {t('doctorProfile.bookNow', 'Book Now')}
          </button>
        </div>

        {/* Spacer for mobile fixed button */}
        <div className="lg:hidden h-20"></div>
      </div>
    </div>
  );
};

export default DoctorProfile;