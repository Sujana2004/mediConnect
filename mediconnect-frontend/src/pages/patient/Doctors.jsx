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
  { value: 'general_physician', label: 'General Physician' },
  { value: 'cardiologist', label: 'Cardiologist' },
  { value: 'dermatologist', label: 'Dermatologist' },
  { value: 'orthopedic', label: 'Orthopedic' },
  { value: 'pediatrician', label: 'Pediatrician' },
  { value: 'gynecologist', label: 'Gynecologist' },
  { value: 'neurologist', label: 'Neurologist' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'ophthalmologist', label: 'Ophthalmologist' },
  { value: 'ent', label: 'ENT Specialist' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'physiotherapist', label: 'Physiotherapist' }
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

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

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
      <p className="text-gray-500 text-center mb-4 max-w-sm">
        {message || t('common.tryAgain', 'Please try again later')}
      </p>
      <Button variant="primary" onClick={onRetry}>
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
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <WifiOff className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {t('common.offline', 'You are offline')}
      </h3>
      <p className="text-gray-500 text-center max-w-sm">
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
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewProfile(doctor)}>
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <Avatar
              src={doctor.profile_picture}
              name={doctor.full_name}
              size="xl"
            />
            {doctor.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <h3 className="font-semibold text-gray-900 truncate w-full">
            {doctor.full_name}
          </h3>
          <p className="text-sm text-gray-500 truncate w-full">
            {doctor.specialization}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{doctor.rating?.toFixed(1) || 'N/A'}</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="text-sm text-gray-500">{doctor.experience_years}y exp</span>
          </div>

          <p className="text-lg font-bold text-primary-600 mt-2">
            ₹{doctor.consultation_fee}
          </p>

          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
            <Clock className="w-3 h-3" />
            <span>{availabilityText}</span>
          </div>

          <div className="flex gap-2 mt-3 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(doctor);
              }}
            >
              {t('common.view', 'View')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onBook(doctor);
              }}
            >
              {t('doctors.book', 'Book')}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // List view (default)
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar
            src={doctor.profile_picture}
            name={doctor.full_name}
            size="lg"
          />
          {doctor.is_verified && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {doctor.full_name}
              </h3>
              <p className="text-sm text-gray-500">
                {doctor.specialization}
              </p>
            </div>

            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              disabled={isTogglingFavorite}
              className={`p-2 rounded-full transition-colors ${
                isFavorite 
                  ? 'text-red-500 bg-red-50' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              {isTogglingFavorite ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
              )}
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="font-medium">{doctor.rating?.toFixed(1) || 'N/A'}</span>
              {doctor.total_reviews > 0 && (
                <span className="text-gray-400">({doctor.total_reviews})</span>
              )}
            </div>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-1 text-gray-500">
              <GraduationCap className="w-4 h-4" />
              <span>{doctor.experience_years} years</span>
            </div>
            {doctor.languages?.length > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1 text-gray-500">
                  <Languages className="w-4 h-4" />
                  <span>{doctor.languages.slice(0, 2).join(', ')}</span>
                </div>
              </>
            )}
          </div>

          {/* Consultation Types */}
          <div className="flex items-center gap-2 mt-2">
            {doctor.consultation_types?.includes('video') && (
              <Badge variant="default" size="sm">
                <Video className="w-3 h-3 mr-1" />
                Video
              </Badge>
            )}
            {doctor.consultation_types?.includes('audio') && (
              <Badge variant="default" size="sm">
                <Phone className="w-3 h-3 mr-1" />
                Audio
              </Badge>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <div>
              <p className="text-lg font-bold text-primary-600">
                ₹{doctor.consultation_fee}
              </p>
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {availabilityText}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(doctor)}
              >
                {t('doctors.viewProfile', 'View Profile')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onBook(doctor)}
              >
                <Calendar className="w-4 h-4 mr-1" />
                {t('doctors.bookNow', 'Book Now')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  flex items-center gap-1 px-3 py-2 rounded-lg border transition-colors
                  ${localFilters.rating === rating.toString()
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <Star className={`w-4 h-4 ${localFilters.rating === rating.toString() ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
                <span className="text-sm">{rating === 0 ? 'Any' : `${rating}+`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 pt-4 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleReset}
          disabled={!hasActiveFilters}
        >
          {t('common.reset', 'Reset')}
        </Button>
        <Button
          variant="primary"
          className="flex-1"
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
            flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
            ${selected === spec.value
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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

  // State - NO MOCK DATA
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

  // API: Load doctors
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
      const params = {
        page,
        page_size: PAGE_SIZE,
        search: debouncedSearch || undefined,
        specialization: filters.specialization || undefined,
        consultation_type: filters.consultation_type || undefined,
        availability: filters.availability || undefined,
        gender: filters.gender || undefined,
        min_rating: filters.rating || undefined,
        ordering: getSortOrdering(sortBy)
      };

      // Handle fee range
      if (filters.fee_range) {
        const [min, max] = filters.fee_range.split('-');
        params.min_fee = min;
        if (max && max !== '+') {
          params.max_fee = max;
        }
      }

      // Remove undefined values
      Object.keys(params).forEach(key => {
        if (params[key] === undefined) delete params[key];
      });

      const response = await authService.getDoctors(params);
      const newDoctors = response.data?.results || response.data || [];
      const total = response.data?.count || newDoctors.length;

      if (isNewSearch) {
        setDoctors(newDoctors);
      } else {
        setDoctors(prev => [...prev, ...newDoctors]);
      }

      setTotalCount(total);
      setCurrentPage(page);
      setHasMore(newDoctors.length === PAGE_SIZE);

    } catch (err) {
      console.error('Error loading doctors:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load doctors');
      toast.error(t('doctors.loadError', 'Failed to load doctors'));
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  };

  // Load more doctors (pagination)
  const loadMoreDoctors = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    await loadDoctors(currentPage + 1, false);
    setIsLoadingMore(false);
  };

  // Get sort ordering for API
  const getSortOrdering = (sort) => {
    switch (sort) {
      case 'rating': return '-rating';
      case 'experience': return '-experience_years';
      case 'fee_low': return 'consultation_fee';
      case 'fee_high': return '-consultation_fee';
      case 'availability': return 'next_available_slot';
      default: return '-rating,-experience_years';
    }
  };

  // API: Toggle favorite
  const handleToggleFavorite = async (doctorId) => {
    try {
      const isFav = favorites.has(doctorId);
      
      if (isFav) {
        await authService.removeFavoriteDoctor(doctorId);
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(doctorId);
          return newSet;
        });
        toast.success(t('doctors.removedFavorite', 'Removed from favorites'));
      } else {
        await authService.addFavoriteDoctor(doctorId);
        setFavorites(prev => new Set([...prev, doctorId]));
        toast.success(t('doctors.addedFavorite', 'Added to favorites'));
      }
    } catch (err) {
      toast.error(t('doctors.favoriteError', 'Failed to update favorites'));
    }
  };

  // Navigation handlers
  const handleViewProfile = (doctor) => {
    navigate(`/patient/doctors/${doctor.id}`);
  };

  const handleBookAppointment = (doctor) => {
    navigate(`/patient/book-appointment/${doctor.id}`);
  };

  // Filter handlers
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

  // Voice search toggle
  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v && v !== '').length;
  }, [filters]);

  // Render offline state
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
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
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            {t('doctors.title', 'Find Doctors')}
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('doctors.searchPlaceholder', 'Search doctors, specializations...')}
              className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {voiceEnabled && (
                <button
                  onClick={handleVoiceSearch}
                  className={`p-2 rounded-full transition-colors ${
                    isListening 
                      ? 'bg-red-100 text-red-500' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
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

          {/* Specialization Chips */}
          <div className="mt-4">
            <SpecializationChips
              selected={filters.specialization}
              onSelect={handleSpecializationSelect}
            />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 border-t flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeFilterCount > 0
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <Sliders className="w-4 h-4" />
              {t('doctors.filters', 'Filters')}
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={SORT_OPTIONS}
              className="text-sm border-gray-200 rounded-full py-1.5"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!isLoading && !error && (
        <div className="px-4 py-2 bg-gray-50">
          <p className="text-sm text-gray-500">
            {isSearching ? (
              <span className="flex items-center gap-2">
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
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadDoctors(1, true)} />
        ) : doctors.length === 0 ? (
          <EmptyState
            icon={User}
            title={t('doctors.noResults', 'No doctors found')}
            description={
              debouncedSearch || activeFilterCount > 0
                ? t('doctors.tryDifferentSearch', 'Try adjusting your search or filters')
                : t('doctors.noResultsDesc', 'No doctors available at the moment')
            }
            action={
              (debouncedSearch || activeFilterCount > 0) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    handleResetFilters();
                  }}
                >
                  {t('doctors.clearFilters', 'Clear All Filters')}
                </Button>
              )
            }
          />
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
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                )}
              </div>
            )}

            {/* End of Results */}
            {!hasMore && doctors.length > 0 && (
              <p className="text-center text-gray-400 text-sm py-6">
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