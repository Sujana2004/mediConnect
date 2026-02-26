// src/pages/patient/Doctors.jsx

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Star,
  Clock,
  Video,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Sliders,
  RefreshCw,
  WifiOff,
  AlertCircle,
  Loader2,
  Heart,
  User,
  IndianRupee,
  Languages,
  GraduationCap,
  Award,
  CheckCircle,
  Mic,
  MicOff,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  Select,
  Badge,
  Avatar,
  EmptyState,
  Loader
} from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import { useVoice } from '../../hooks/useVoice';
import { useLanguage } from '../../hooks/useLanguage';
import { authService } from '../../services/api';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const SPECIALIZATIONS = [
  { value: '', label: 'All Specializations' },
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

const CONSULTATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'video', label: 'Video Consultation' },
  { value: 'audio', label: 'Audio Consultation' },
  { value: 'both', label: 'Video & Audio' }
];

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'Any Time' },
  { value: 'today', label: 'Available Today' },
  { value: 'tomorrow', label: 'Available Tomorrow' },
  { value: 'this_week', label: 'This Week' }
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'experience', label: 'Most Experienced' },
  { value: 'fee_low', label: 'Fee: Low to High' },
  { value: 'fee_high', label: 'Fee: High to Low' },
  { value: 'availability', label: 'Earliest Available' }
];

const GENDER_OPTIONS = [
  { value: '', label: 'Any Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const FEE_RANGES = [
  { value: '', label: 'Any Fee' },
  { value: '0-200', label: 'Under ₹200' },
  { value: '200-500', label: '₹200 - ₹500' },
  { value: '500-1000', label: '₹500 - ₹1000' },
  { value: '1000+', label: 'Above ₹1000' }
];

const PAGE_SIZE = 10;

const normalizeDoctorData = (doc) => ({
  ...doc,
  full_name: doc.full_name || doc.name || `Dr. ${doc.user?.first_name || ''} ${doc.user?.last_name || ''}`.trim() || 'Doctor',
  profile_picture: doc.profile_picture || doc.profile_photo || doc.user?.profile_photo || null,
  rating: parseFloat(doc.rating || doc.average_rating || 0),
  languages: doc.languages || doc.languages_spoken || [],
  consultation_types: doc.consultation_types || (doc.is_available_online ? ['video', 'audio'] : []),
  is_verified: doc.is_verified !== undefined ? doc.is_verified : true,
  is_available_today: doc.is_available_today || doc.is_available_online || false,
  next_available_slot: doc.next_available_slot || null,
  experience_years: doc.experience_years || 0,
  consultation_fee: doc.consultation_fee || 0,
  total_reviews: doc.total_reviews || 0,
  total_consultations: doc.total_consultations || 0,
  specialization: doc.specialization_display || doc.specialization || '',
});

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

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
      <p className="text-gray-400 text-center mb-6 max-w-xs text-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button variant="primary" onClick={onRetry} className="!rounded-xl !bg-violet-600 hover:!bg-violet-700 !px-6">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t('common.retry', 'Try Again')}
      </Button>
    </div>
  );
};

// ============================================================================
// OFFLINE STATE COMPONENT
// ============================================================================

const OfflineState = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-400 text-center max-w-xs text-sm">
        {t('common.checkConnection', 'Please check your internet connection')}
      </p>
    </div>
  );
};

// ============================================================================
// DOCTOR CARD COMPONENT
// ============================================================================

const DoctorCard = ({ doctor, onBook, onViewProfile, isFavorite, onToggleFavorite, viewMode = 'list' }) => {
  const { t } = useTranslation();
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const handleToggleFavorite = async (e) => {
    e.stopPropagation();
    setIsTogglingFavorite(true);
    await onToggleFavorite(doctor.id);
    setIsTogglingFavorite(false);
  };

  const availabilityText = doctor.next_available_slot
    ? `Available ${doctor.next_available_slot}`
    : doctor.is_available_today
      ? t('doctors.availableToday', 'Available Today')
      : t('doctors.checkAvailability', 'Check Availability');

  if (viewMode === 'grid') {
    return (
      <div
        onClick={() => onViewProfile(doctor)}
        className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 cursor-pointer group"
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-3">
            <div className="rounded-full ring-2 ring-violet-100 group-hover:ring-violet-200 transition-colors">
              <Avatar
                src={doctor.profile_picture}
                name={doctor.full_name}
                size="xl"
              />
            </div>
            {doctor.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>

          <h3 className="font-bold text-gray-900 truncate w-full text-sm">
            {doctor.full_name}
          </h3>
          <p className="text-xs text-violet-500 font-medium truncate w-full mt-0.5">
            {doctor.specialization}
          </p>

          {/* Rating & Exp */}
          <div className="flex items-center gap-2 mt-2.5">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-700">{doctor.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <span className="text-xs text-gray-400">{doctor.experience_years}y exp</span>
          </div>

          {/* Fee */}
          <p className="text-lg font-extrabold text-violet-600 mt-2">
            ₹{doctor.consultation_fee}
          </p>

          {/* Availability */}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            <Clock className="w-3 h-3" />
            <span className="font-medium">{availabilityText}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 !rounded-xl !text-xs !border-violet-200 !text-violet-600 hover:!bg-violet-50"
              onClick={(e) => { e.stopPropagation(); onViewProfile(doctor); }}
            >
              {t('common.view', 'View')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 !rounded-xl !text-xs !bg-violet-600 hover:!bg-violet-700"
              onClick={(e) => { e.stopPropagation(); onBook(doctor); }}
            >
              {t('doctors.book', 'Book')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:shadow-violet-100/50 transition-all duration-300 group">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="rounded-full ring-2 ring-violet-100 group-hover:ring-violet-200 transition-colors">
            <Avatar
              src={doctor.profile_picture}
              name={doctor.full_name}
              size="lg"
            />
          </div>
          {doctor.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-white">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 truncate">
                {doctor.full_name}
              </h3>
              <p className="text-sm text-violet-500 font-medium">
                {doctor.specialization}
              </p>
            </div>

            {/* Favorite */}
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className={`p-2 rounded-xl transition-all duration-200 ${
                isFavorite
                  ? 'text-red-500 bg-red-50'
                  : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
              }`}
            >
              {isTogglingFavorite ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              )}
            </button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold text-amber-700">{doctor.rating?.toFixed(1) || 'N/A'}</span>
              {doctor.total_reviews > 0 && (
                <span className="text-xs text-amber-500">({doctor.total_reviews})</span>
              )}
            </div>
            <div className="flex items-center gap-1 bg-violet-50 px-2 py-0.5 rounded-lg">
              <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-600">{doctor.experience_years} yrs</span>
            </div>
            {doctor.languages?.length > 0 && (
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-lg">
                <Languages className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">{doctor.languages.slice(0, 2).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Consultation Types */}
          <div className="flex items-center gap-1.5 mt-2.5">
            {doctor.consultation_types?.includes('video') && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                <Video className="w-3 h-3" />
                Video
              </span>
            )}
            {doctor.consultation_types?.includes('audio') && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                <Phone className="w-3 h-3" />
                Audio
              </span>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div>
              <p className="text-xl font-extrabold text-violet-600">
                ₹{doctor.consultation_fee}
              </p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                <Clock className="w-3 h-3" />
                {availabilityText}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="!rounded-xl !border-violet-200 !text-violet-600 hover:!bg-violet-50"
                onClick={() => onViewProfile(doctor)}
              >
                {t('doctors.viewProfile', 'View Profile')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="!rounded-xl !bg-violet-600 hover:!bg-violet-700"
                onClick={() => onBook(doctor)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('doctors.bookNow', 'Book Now')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FILTER MODAL COMPONENT
// ============================================================================

const FilterModal = ({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset
}) => {
  const { t } = useTranslation();
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      specialization: '',
      consultation_type: '',
      availability: '',
      gender: '',
      fee_range: '',
      rating: '',
      language: ''
    };
    setLocalFilters(resetFilters);
    onReset();
    onClose();
  };

  const hasActiveFilters = Object.values(localFilters).some(v => v && v !== '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('doctors.filters', 'Filters')}
      size="md"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        <Select
          label={t('doctors.specialization', 'Specialization')}
          value={localFilters.specialization}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, specialization: e.target.value }))}
          options={SPECIALIZATIONS}
        />

        <Select
          label={t('doctors.consultationType', 'Consultation Type')}
          value={localFilters.consultation_type}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, consultation_type: e.target.value }))}
          options={CONSULTATION_TYPES}
        />

        <Select
          label={t('doctors.availability', 'Availability')}
          value={localFilters.availability}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, availability: e.target.value }))}
          options={AVAILABILITY_OPTIONS}
        />

        <Select
          label={t('doctors.gender', 'Doctor Gender')}
          value={localFilters.gender}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, gender: e.target.value }))}
          options={GENDER_OPTIONS}
        />

        <Select
          label={t('doctors.feeRange', 'Fee Range')}
          value={localFilters.fee_range}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, fee_range: e.target.value }))}
          options={FEE_RANGES}
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('doctors.minimumRating', 'Minimum Rating')}
          </label>
          <div className="flex gap-2">
            {[4.5, 4, 3.5, 3, 0].map((rating) => (
              <button
                key={rating}
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  rating: prev.rating === rating.toString() ? '' : rating.toString()
                }))}
                className={`
                  flex items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-200
                  ${localFilters.rating === rating.toString()
                    ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                    : 'border-gray-200 hover:border-violet-200 hover:bg-violet-50/30'
                  }
                `}
              >
                <Star className={`w-3.5 h-3.5 ${localFilters.rating === rating.toString() ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                <span className="text-sm font-medium">{rating === 0 ? 'Any' : `${rating}+`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1 !rounded-xl"
          onClick={handleReset}
          disabled={!hasActiveFilters}
        >
          {t('common.reset', 'Reset')}
        </Button>
        <Button
          variant="primary"
          className="flex-1 !rounded-xl !bg-violet-600 hover:!bg-violet-700"
          onClick={handleApply}
        >
          {t('common.apply', 'Apply Filters')}
        </Button>
      </div>
    </Modal>
  );
};

// ============================================================================
// SPECIALIZATION CHIPS COMPONENT
// ============================================================================

const SpecializationChips = ({ selected, onSelect }) => {
  const scrollRef = useRef(null);

  const popularSpecializations = SPECIALIZATIONS.slice(0, 8);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
    >
      {popularSpecializations.map((spec) => (
        <button
          key={spec.value}
          onClick={() => onSelect(spec.value)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
            ${selected === spec.value
              ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
              : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
            }
          `}
        >
          {spec.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Doctors = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { voiceEnabled, isListening, startListening, stopListening, transcript, clearTranscript } = useVoice();
  const { currentLanguage } = useLanguage();

  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView();

  // State
  const [doctors, setDoctors] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [filters, setFilters] = useState({
    specialization: searchParams.get('specialization') || '',
    consultation_type: searchParams.get('type') || '',
    availability: searchParams.get('availability') || '',
    gender: searchParams.get('gender') || '',
    fee_range: searchParams.get('fee') || '',
    rating: searchParams.get('rating') || '',
    language: searchParams.get('language') || ''
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');
  const [viewMode, setViewMode] = useState('list');

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // Modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Online status
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/Offline listener
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Voice search
  useEffect(() => {
    if (transcript) {
      setSearchQuery(transcript);
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set('q', debouncedSearch);
    if (filters.specialization) params.set('specialization', filters.specialization);
    if (filters.consultation_type) params.set('type', filters.consultation_type);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.gender) params.set('gender', filters.gender);
    if (filters.fee_range) params.set('fee', filters.fee_range);
    if (filters.rating) params.set('rating', filters.rating);
    if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);

    setSearchParams(params, { replace: true });
  }, [debouncedSearch, filters, sortBy, setSearchParams]);

  // Load doctors when filters change
  useEffect(() => {
    setDoctors([]);
    setCurrentPage(1);
    setHasMore(true);
    loadDoctors(1, true);
  }, [debouncedSearch, filters, sortBy]);

  // Infinite scroll - load more when in view
  useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      loadMoreDoctors();
    }
  }, [inView, hasMore, isLoading, isLoadingMore]);

  const loadDoctors = async (page = 1, isNewSearch = false) => {
    if (!isOnline) {
      setError('You are offline');
      setIsLoading(false);
      return;
    }

    if (isNewSearch) {
      setIsLoading(true);
      setIsSearching(true);
    }
    setError(null);

    try {
      const params = {};

      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.specialization) params.specialization = filters.specialization;
      if (filters.language) params.language = filters.language;

      const orderBy = getSortOrdering(sortBy);
      if (orderBy) params.order_by = orderBy;

      const response = await authService.getDoctors(params);

      let rawDoctors = [];
      let total = 0;

      if (Array.isArray(response)) {
        rawDoctors = response;
        total = response.length;
      } else if (response?.results && Array.isArray(response.results)) {
        rawDoctors = response.results;
        total = response.count || response.results.length;
      } else if (Array.isArray(response?.data)) {
        rawDoctors = response.data;
        total = response.data.length;
      } else if (response?.data?.results) {
        rawDoctors = response.data.results;
        total = response.data.count || response.data.results.length;
      }

      const normalizedDoctors = rawDoctors.map(normalizeDoctorData);

      let filteredDoctors = normalizedDoctors;

      if (filters.gender) {
        filteredDoctors = filteredDoctors.filter(doc => {
          const docGender = doc.gender || doc.user?.gender || '';
          return docGender.toLowerCase() === filters.gender.toLowerCase();
        });
      }

      if (filters.fee_range) {
        const [minStr, maxStr] = filters.fee_range.split('-');
        const minFee = parseInt(minStr) || 0;
        filteredDoctors = filteredDoctors.filter(doc => {
          const fee = parseFloat(doc.consultation_fee) || 0;
          if (maxStr === '' || maxStr === '+' || !maxStr) {
            return fee >= minFee;
          }
          return fee >= minFee && fee <= parseInt(maxStr);
        });
      }

      if (filters.rating) {
        const minRating = parseFloat(filters.rating);
        if (minRating > 0) {
          filteredDoctors = filteredDoctors.filter(doc => (doc.rating || 0) >= minRating);
        }
      }

      if (isNewSearch) {
        setDoctors(filteredDoctors);
      } else {
        setDoctors(prev => [...prev, ...filteredDoctors]);
      }

      setTotalCount(filteredDoctors.length);
      setCurrentPage(page);
      setHasMore(false);

    } catch (err) {
      console.error('Error loading doctors:', err);

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to load doctors';

      setError(errorMessage);

      if (isNewSearch) {
        toast.error(t('doctors.loadError', 'Failed to load doctors'));
      }
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  const loadMoreDoctors = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    await loadDoctors(currentPage + 1, false);
    setIsLoadingMore(false);
  };

  const getSortOrdering = (sort) => {
    switch (sort) {
      case 'rating': return '-average_rating';
      case 'experience': return '-experience_years';
      case 'fee_low': return 'consultation_fee';
      case 'fee_high': return '-consultation_fee';
      default: return '-average_rating';
    }
  };

  const handleToggleFavorite = async (doctorId) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(doctorId)) {
        newSet.delete(doctorId);
        toast.success(t('doctors.removedFavorite', 'Removed from favorites'));
      } else {
        newSet.add(doctorId);
        toast.success(t('doctors.addedFavorite', 'Added to favorites'));
      }
      return newSet;
    });
  };

  const handleViewProfile = (doctor) => {
    navigate(`/patient/doctors/${doctor.id}`);
  };

  const handleBookAppointment = (doctor) => {
    navigate(`/patient/appointments/book/${doctor.id}`, {
      state: { doctor }
    });
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      specialization: '',
      consultation_type: '',
      availability: '',
      gender: '',
      fee_range: '',
      rating: '',
      language: ''
    });
  };

  const handleSpecializationSelect = (spec) => {
    setFilters(prev => ({
      ...prev,
      specialization: prev.specialization === spec ? '' : spec
    }));
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v && v !== '').length;
  }, [filters]);

  // Render offline state
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-5">
          <h1 className="text-xl font-bold text-white">
            {t('doctors.title', 'Find Doctors')}
          </h1>
        </div>
        <OfflineState />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10">
        {/* Top gradient header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-5 pt-5 pb-6 relative overflow-hidden">
          {/* Decorative */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.07]" />
          <div className="absolute top-12 -left-6 w-24 h-24 rounded-full bg-white/[0.05]" />

          <h1 className="text-xl font-bold text-white mb-4 relative z-10">
            {t('doctors.title', 'Find Doctors')}
          </h1>

          {/* Search Bar */}
          <div className="relative z-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('doctors.searchPlaceholder', 'Search doctors, specializations...')}
              className="w-full pl-11 pr-20 py-3.5 bg-white border-0 rounded-2xl focus:ring-2 focus:ring-violet-300 shadow-lg shadow-violet-900/20 text-sm placeholder:text-gray-400"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {voiceEnabled && (
                <button
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isListening
                      ? 'bg-red-100 text-red-500'
                      : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'
                  }`}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chips & Filters on white bg */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          {/* Specialization Chips */}
          <div className="px-5 pt-4 pb-2">
            <SpecializationChips
              selected={filters.specialization}
              onSelect={handleSpecializationSelect}
            />
          </div>

          {/* Filter Bar */}
          <div className="px-5 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setShowFilterModal(true)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                  ${activeFilterCount > 0
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100'
                  }
                `}
              >
                <Sliders className="w-4 h-4" />
                {t('doctors.filters', 'Filters')}
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={SORT_OPTIONS}
                className="!text-sm !border-gray-200 !rounded-xl !py-2"
              />
            </div>

            <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="px-5 py-3">
          <p className="text-sm text-gray-400 font-medium">
            {isSearching ? (
              <span className="flex items-center gap-2 text-violet-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('doctors.searching', 'Searching...')}
              </span>
            ) : (
              t('doctors.resultsCount', '{{count}} doctors found', { count: totalCount })
            )}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-3">
              <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Finding doctors...</p>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadDoctors(1, true)} />
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-violet-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {t('doctors.noResults', 'No doctors found')}
            </h3>
            <p className="text-sm text-gray-400 text-center mb-5 max-w-xs">
              {debouncedSearch || activeFilterCount > 0
                ? t('doctors.tryDifferentSearch', 'Try adjusting your search or filters')
                : t('doctors.noResultsDesc', 'No doctors available at the moment')}
            </p>
            {(debouncedSearch || activeFilterCount > 0) && (
              <Button
                variant="outline"
                className="!rounded-xl !border-violet-200 !text-violet-600 hover:!bg-violet-50"
                onClick={() => { setSearchQuery(''); handleResetFilters(); }}
              >
                {t('doctors.clearFilters', 'Clear All Filters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onBook={handleBookAppointment}
                  onViewProfile={handleViewProfile}
                  isFavorite={favorites.has(doctor.id)}
                  onToggleFavorite={handleToggleFavorite}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="flex justify-center py-6">
                {isLoadingMore && (
                  <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasMore && doctors.length > 0 && (
              <p className="text-center text-gray-300 text-sm py-6 font-medium">
                {t('doctors.endOfResults', "You've reached the end")}
              </p>
            )}
          </>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
};

export default Doctors;