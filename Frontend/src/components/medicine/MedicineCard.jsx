// src/components/medicine/MedicineCard.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Star,
  Truck,
  AlertTriangle,
  Info,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Pill,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Beaker,
} from 'lucide-react';
import { medicineAPI } from '../../services/api';

// Helper: Convert to Title Case
const toTitleCase = (s) => {
  if (!s) return '';
  return s
    .toString()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const MedicineCard = ({
  medicine,
  onAddToReminder,
  onViewDetails,
  showFullDetails = false,
  userMedicines = [], // Current user medicines for interaction check
  compact = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null);
  const [pincode, setPincode] = useState('');
  const [availability, setAvailability] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [showInteractions, setShowInteractions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Check availability by pincode
  const checkAvailability = async () => {
    if (!pincode || pincode.length !== 6) {
      setError(t('medicine.invalidPincode', 'Please enter a valid 6-digit pincode'));
      return;
    }

    setLoadingAction('availability');
    setError(null);

    try {
      // Note: This would need a backend endpoint for availability
      // For now, we'll simulate it
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulated response
      setAvailability({
        available: Math.random() > 0.3,
        deliveryDays: Math.floor(Math.random() * 5) + 1,
        nearbyStores: Math.floor(Math.random() * 5),
      });
    } catch (err) {
      console.error('Availability check error:', err);
      setError(t('medicine.availabilityError', 'Failed to check availability'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Get alternatives
  const fetchAlternatives = async () => {
    if (alternatives.length > 0) {
      setIsExpanded(!isExpanded);
      return;
    }

    setLoadingAction('alternatives');
    setError(null);

    try {
      const response = await medicineAPI.medicines.getAlternatives(medicine.id);
      setAlternatives(response.data?.alternatives || response.data || []);
      setIsExpanded(true);
    } catch (err) {
      console.error('Alternatives error:', err);
      setError(t('medicine.alternativesError', 'Failed to load alternatives'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Check interactions with user's current medicines
  const checkInteractions = async () => {
    if (interactions.length > 0 || userMedicines.length === 0) {
      setShowInteractions(!showInteractions);
      return;
    }

    setLoadingAction('interactions');
    setError(null);

    try {
      const medicineIds = [medicine.id, ...userMedicines.map((m) => m.id)];
      const response = await medicineAPI.medicines.checkInteractions(medicineIds);
      setInteractions(response.data?.interactions || response.data || []);
      setShowInteractions(true);
    } catch (err) {
      console.error('Interactions error:', err);
      setError(t('medicine.interactionsError', 'Failed to check interactions'));
    } finally {
      setLoadingAction(null);
    }
  };

  // Toggle wishlist (save to search history)
  const toggleWishlist = async () => {
    setIsWishlisted(!isWishlisted);
    // Note: Could save to local storage or user preferences
  };

  // Copy medicine name
  const copyMedicineName = async () => {
    try {
      await navigator.clipboard.writeText(medicine.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  // Add to reminder
  const handleAddToReminder = () => {
    if (onAddToReminder) {
      onAddToReminder(medicine);
    } else {
      // Navigate to create reminder with pre-filled medicine
      navigate('/patient/medicines/reminder/new', {
        state: { medicine },
      });
    }
  };

  // View details
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(medicine);
    } else {
      navigate(`/patient/medicines/${medicine.id}`);
    }
  };

  // Get medicine type badge color
  const getTypeBadgeColor = (type) => {
    const colors = {
      tablet: 'bg-blue-100 text-blue-800',
      capsule: 'bg-purple-100 text-purple-800',
      syrup: 'bg-orange-100 text-orange-800',
      injection: 'bg-red-100 text-red-800',
      cream: 'bg-green-100 text-green-800',
      drops: 'bg-cyan-100 text-cyan-800',
      inhaler: 'bg-teal-100 text-teal-800',
      powder: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Compact variant
  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow">
        <div className="flex items-center min-w-0">
          <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3 font-bold text-sm uppercase flex-shrink-0">
            {medicine.name?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{toTitleCase(medicine.name)}</h4>
            <p className="text-xs text-gray-500 truncate">
              {medicine.manufacturer || medicine.brand}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {medicine.prescription_required && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Rx</span>
          )}
          <button
            onClick={handleViewDetails}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <Info className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon and Name */}
          <div className="flex items-start min-w-0">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xl uppercase flex-shrink-0">
              {medicine.name?.charAt(0) || <Pill className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {toTitleCase(medicine.name)}
                </h3>
                <button
                  onClick={copyMedicineName}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  title={t('medicine.copyName', 'Copy name')}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {medicine.generic_name && (
                <p className="text-sm text-gray-500 truncate">
                  {t('medicine.generic', 'Generic')}: {medicine.generic_name}
                </p>
              )}
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {medicine.manufacturer || medicine.brand}
              </p>
            </div>
          </div>

          {/* Right: Badges */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {medicine.prescription_required && (
              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('medicine.rxRequired', 'Rx Required')}
              </span>
            )}
            {medicine.type && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(medicine.type)}`}>
                {toTitleCase(medicine.type)}
              </span>
            )}
          </div>
        </div>

        {/* Category & Composition */}
        <div className="mt-3 flex flex-wrap gap-2">
          {medicine.category && (
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs">
              {toTitleCase(medicine.category)}
            </span>
          )}
          {medicine.strength && (
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
              {medicine.strength}
            </span>
          )}
        </div>

        {/* Rating (if available) */}
        {medicine.rating && (
          <div className="flex items-center mt-3">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.floor(medicine.rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {medicine.rating} {medicine.total_ratings && `(${medicine.total_ratings})`}
            </span>
          </div>
        )}

        {/* Price (if available) */}
        {medicine.price && (
          <div className="mt-3">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                ₹{medicine.discounted_price || medicine.price}
              </span>
              {medicine.discounted_price && medicine.discounted_price < medicine.price && (
                <>
                  <span className="ml-2 text-sm text-gray-500 line-through">
                    ₹{medicine.price}
                  </span>
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    {Math.round(((medicine.price - medicine.discounted_price) / medicine.price) * 100)}% OFF
                  </span>
                </>
              )}
            </div>
            {medicine.pack_size && (
              <p className="text-xs text-gray-500 mt-0.5">
                {t('medicine.perPack', 'Per pack of')} {medicine.pack_size}
              </p>
            )}
          </div>
        )}

        {/* Description */}
        {medicine.description && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {medicine.description}
          </p>
        )}

        {/* Uses */}
        {medicine.uses && medicine.uses.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">{t('medicine.usedFor', 'Used for')}:</p>
            <div className="flex flex-wrap gap-1">
              {medicine.uses.slice(0, 3).map((use, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">
                  {use}
                </span>
              ))}
              {medicine.uses.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  +{medicine.uses.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Side Effects Warning */}
        {medicine.side_effects && medicine.side_effects.length > 0 && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-800">
                  {t('medicine.sideEffects', 'Possible side effects')}:
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {medicine.side_effects.slice(0, 3).join(', ')}
                  {medicine.side_effects.length > 3 && '...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Pincode Availability Check */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPincode(val);
                  setAvailability(null);
                }}
                placeholder={t('medicine.enterPincode', 'Enter pincode')}
                maxLength={6}
                inputMode="numeric"
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={checkAvailability}
              disabled={loadingAction === 'availability' || pincode.length !== 6}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loadingAction === 'availability' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('medicine.check', 'Check')
              )}
            </button>
          </div>

          {/* Availability Result */}
          {availability && (
            <div className={`mt-2 p-2 rounded-lg text-sm flex items-center ${
              availability.available
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {availability.available ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('medicine.availableDelivery', 'Available! Delivery in {{days}} days', {
                    days: availability.deliveryDays,
                  })}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  {t('medicine.notAvailable', 'Not available at this location')}
                  {availability.nearbyStores > 0 && (
                    <span className="ml-1">
                      ({availability.nearbyStores} {t('medicine.nearbyStores', 'nearby stores')})
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Interactions Check (if user has medicines) */}
        {userMedicines.length > 0 && (
          <div className="mt-3">
            <button
              onClick={checkInteractions}
              disabled={loadingAction === 'interactions'}
              className="flex items-center text-sm text-amber-700 hover:text-amber-800"
            >
              {loadingAction === 'interactions' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Beaker className="h-4 w-4 mr-2" />
              )}
              {t('medicine.checkInteractions', 'Check interactions with your medicines')}
            </button>

            {showInteractions && interactions.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {t('medicine.interactionsFound', 'Interactions found')}:
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {interactions.map((interaction, idx) => (
                    <li key={idx} className="flex items-start">
                      <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {interaction.description || interaction}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showInteractions && interactions.length === 0 && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('medicine.noInteractions', 'No known interactions found')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Add to Reminder */}
          <button
            onClick={handleAddToReminder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t('medicine.addReminder', 'Add Reminder')}</span>
          </button>

          {/* View Details */}
          <button
            onClick={handleViewDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">{t('medicine.details', 'Details')}</span>
          </button>

          {/* Alternatives */}
          <button
            onClick={fetchAlternatives}
            disabled={loadingAction === 'alternatives'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {loadingAction === 'alternatives' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{t('medicine.alternatives', 'Alternatives')}</span>
          </button>
        </div>

        {/* Wishlist */}
        <button
          onClick={toggleWishlist}
          className={`p-2 rounded-lg transition-colors ${
            isWishlisted
              ? 'bg-red-50 text-red-500'
              : 'hover:bg-gray-200 text-gray-400'
          }`}
          aria-label={isWishlisted ? t('medicine.removeWishlist', 'Remove from wishlist') : t('medicine.addWishlist', 'Add to wishlist')}
        >
          <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Alternatives Expansion */}
      {isExpanded && alternatives.length > 0 && (
        <div className="px-4 sm:px-6 py-4 bg-blue-50 border-t border-blue-100">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('medicine.alternativeMedicines', 'Alternative Medicines')}
          </h4>
          <div className="space-y-2">
            {alternatives.slice(0, 5).map((alt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-white rounded-lg"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{toTitleCase(alt.name)}</p>
                  <p className="text-xs text-gray-500">{alt.manufacturer}</p>
                </div>
                {alt.price && (
                  <span className="text-sm font-medium text-gray-900 ml-2">
                    ₹{alt.price}
                  </span>
                )}
              </div>
            ))}
          </div>
          {alternatives.length > 5 && (
            <button
              onClick={handleViewDetails}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              {t('medicine.viewAll', 'View all {{count}} alternatives', { count: alternatives.length })}
              <ExternalLink className="h-3 w-3 ml-1" />
            </button>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="px-4 sm:px-6 py-2 bg-gray-100 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          {t('medicine.disclaimer', '⚠️ This information is for reference only. Consult a doctor before taking any medicine.')}
        </p>
      </div>
    </div>
  );
};

export default MedicineCard;