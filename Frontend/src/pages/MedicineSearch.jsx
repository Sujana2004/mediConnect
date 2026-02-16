import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Pill,
  AlertTriangle,
  Star,
  Clock,
  MapPin,
  ChevronRight,
  Info,
  Share2,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Shield,
  Package,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  FileText,
  Zap
} from 'lucide-react';
import { medicineAPI } from '../services/api';

const MedicineSearch = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [searchHistory, setSearchHistory] = useState([]);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    availability: '',
    prescription: '',
    maxPrice: 2000
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  
  // Medicine detail modal
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Pincode for availability
  const [pincode, setPincode] = useState(localStorage.getItem('mediconnect_pincode') || '');
  
  // Saved medicines
  const [savedMedicines, setSavedMedicines] = useState(() => {
    const saved = localStorage.getItem('mediconnect_saved_medicines');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Interaction checker
  const [showInteractionChecker, setShowInteractionChecker] = useState(false);
  const [selectedForInteraction, setSelectedForInteraction] = useState([]);
  const [interactionResult, setInteractionResult] = useState(null);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  // Popular searches
  const [popularSearches, setPopularSearches] = useState([]);
  
  // Categories
  const categories = [
    { id: 'analgesic', label: t('medicine.analgesic', 'Pain Relief'), icon: '💊' },
    { id: 'antibiotic', label: t('medicine.antibiotic', 'Antibiotics'), icon: '🦠' },
    { id: 'antihistamine', label: t('medicine.antihistamine', 'Allergy'), icon: '🤧' },
    { id: 'antacid', label: t('medicine.antacid', 'Digestive'), icon: '🫁' },
    { id: 'antidiabetic', label: t('medicine.antidiabetic', 'Diabetes'), icon: '💉' },
    { id: 'cardiovascular', label: t('medicine.cardiovascular', 'Heart'), icon: '❤️' },
    { id: 'respiratory', label: t('medicine.respiratory', 'Respiratory'), icon: '🫁' },
    { id: 'supplement', label: t('medicine.supplement', 'Vitamins'), icon: '🥬' }
  ];

  // Fetch popular searches on mount
  useEffect(() => {
    fetchPopularSearches();
    loadSearchHistory();
  }, []);

  // Search when term changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) {
        searchMedicines();
      } else if (searchTerm.length === 0 && filters.category) {
        fetchByCategory();
      } else {
        setMedicines([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, filters.category]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (filters.category) params.set('category', filters.category);
    setSearchParams(params, { replace: true });
  }, [searchTerm, filters.category, setSearchParams]);

  // Save pincode to localStorage
  useEffect(() => {
    if (pincode && pincode.length === 6) {
      localStorage.setItem('mediconnect_pincode', pincode);
    }
  }, [pincode]);

  // Fetch popular searches
  const fetchPopularSearches = async () => {
    try {
      const response = await medicineAPI.medicines.getPopular();
      setPopularSearches(response.data?.slice(0, 6) || []);
    } catch (err) {
      console.error('Failed to fetch popular:', err);
    }
  };

  // Load search history from localStorage
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('mediconnect_medicine_search_history');
      if (history) {
        setSearchHistory(JSON.parse(history).slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  };

  // Save search to history
  const saveToSearchHistory = (term) => {
    if (!term.trim()) return;
    
    const history = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10);
    setSearchHistory(history.slice(0, 5));
    localStorage.setItem('mediconnect_medicine_search_history', JSON.stringify(history));
  };

  // Search medicines
  const searchMedicines = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await medicineAPI.medicines.search({
        query: searchTerm,
        category: filters.category || undefined,
        max_price: filters.maxPrice < 2000 ? filters.maxPrice : undefined,
        requires_prescription: filters.prescription === 'required' ? true :
                               filters.prescription === 'otc' ? false : undefined
      });

      let results = response.data?.results || response.data?.medicines || response.data || [];
      
      // Apply client-side filters and sorting
      results = applyFiltersAndSort(results);
      
      setMedicines(results);
      saveToSearchHistory(searchTerm);
      
    } catch (err) {
      console.error('Error searching medicines:', err);
      setError(t('medicine.searchError', 'Failed to search medicines. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch by category
  const fetchByCategory = async () => {
    if (!filters.category) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await medicineAPI.medicines.list({
        category: filters.category,
        limit: 20
      });

      let results = response.data?.results || response.data || [];
      results = applyFiltersAndSort(results);
      setMedicines(results);
      
    } catch (err) {
      console.error('Error fetching category:', err);
      setError(t('medicine.fetchError', 'Failed to load medicines.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFiltersAndSort = (data) => {
    let result = [...data];

    // Availability filter
    if (filters.availability === 'in_stock') {
      result = result.filter(med => med.in_stock || med.is_available);
    } else if (filters.availability === 'out_of_stock') {
      result = result.filter(med => !med.in_stock && !med.is_available);
    }

    // Price filter
    if (filters.maxPrice < 2000) {
      result = result.filter(med => (med.price || med.mrp || 0) <= filters.maxPrice);
    }

    // Prescription filter
    if (filters.prescription === 'required') {
      result = result.filter(med => med.requires_prescription || med.prescription_required);
    } else if (filters.prescription === 'otc') {
      result = result.filter(med => !med.requires_prescription && !med.prescription_required);
    }

    // Sorting
    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'name':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      default:
        // Relevance - keep original order
        break;
    }

    return result;
  };

  // Re-apply filters when they change
  useEffect(() => {
    if (medicines.length > 0) {
      setMedicines(prev => applyFiltersAndSort(prev));
    }
  }, [filters.availability, filters.prescription, filters.maxPrice, sortBy]);

  // View medicine details
  const viewMedicineDetails = async (medicine) => {
    setSelectedMedicine(medicine);
    setIsLoadingDetails(true);

    try {
      const response = await medicineAPI.medicines.getById(medicine.id);
      setSelectedMedicine(response.data || medicine);
    } catch (err) {
      console.error('Failed to load details:', err);
      // Keep showing basic info
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Toggle save medicine
  const toggleSaveMedicine = (medicine) => {
    const isAlreadySaved = savedMedicines.some(m => m.id === medicine.id);
    
    let newSaved;
    if (isAlreadySaved) {
      newSaved = savedMedicines.filter(m => m.id !== medicine.id);
    } else {
      newSaved = [...savedMedicines, { id: medicine.id, name: medicine.name, savedAt: new Date().toISOString() }];
    }
    
    setSavedMedicines(newSaved);
    localStorage.setItem('mediconnect_saved_medicines', JSON.stringify(newSaved));
  };

  // Check drug interactions
  const checkInteractions = async () => {
    if (selectedForInteraction.length < 2) {
      alert(t('medicine.selectTwoMedicines', 'Please select at least 2 medicines to check interactions'));
      return;
    }

    setCheckingInteractions(true);
    setInteractionResult(null);

    try {
      const response = await medicineAPI.medicines.checkInteractions(
        selectedForInteraction.map(m => m.id)
      );
      setInteractionResult(response.data);
    } catch (err) {
      console.error('Failed to check interactions:', err);
      setInteractionResult({ error: t('medicine.interactionCheckError', 'Failed to check interactions') });
    } finally {
      setCheckingInteractions(false);
    }
  };

  // Toggle medicine for interaction check
  const toggleForInteraction = (medicine) => {
    const isSelected = selectedForInteraction.some(m => m.id === medicine.id);
    
    if (isSelected) {
      setSelectedForInteraction(prev => prev.filter(m => m.id !== medicine.id));
    } else {
      setSelectedForInteraction(prev => [...prev, medicine]);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      category: '',
      availability: '',
      prescription: '',
      maxPrice: 2000
    });
    setSortBy('relevance');
  };

  // Check if any filters are active
  const hasActiveFilters = filters.category || filters.availability || 
    filters.prescription || filters.maxPrice < 2000;

  // Render medicine card
  const renderMedicineCard = (medicine) => {
    const isSaved = savedMedicines.some(m => m.id === medicine.id);
    const isSelectedForInteraction = selectedForInteraction.some(m => m.id === medicine.id);
    const requiresPrescription = medicine.requires_prescription || medicine.prescription_required;
    const isInStock = medicine.in_stock !== false && medicine.is_available !== false;
    const price = medicine.price || medicine.mrp || 0;
    const discountPrice = medicine.discount_price || medicine.sale_price;
    const discount = discountPrice ? Math.round((1 - discountPrice / price) * 100) : 0;

    return (
      <div 
        key={medicine.id}
        className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
          isSelectedForInteraction ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        {/* Header with badges */}
        <div className="p-4 pb-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              {/* Prescription badge */}
              {requiresPrescription && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mb-2">
                  <FileText className="h-3 w-3 mr-1" />
                  {t('medicine.rxRequired', 'Rx Required')}
                </span>
              )}
              
              <h3 
                className="font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600"
                onClick={() => viewMedicineDetails(medicine)}
              >
                {medicine.name}
              </h3>
              
              {medicine.brand && (
                <p className="text-sm text-gray-500">{medicine.brand}</p>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={() => toggleSaveMedicine(medicine)}
              className={`p-2 rounded-lg transition-colors ${
                isSaved 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              title={isSaved ? t('medicine.unsave', 'Remove from saved') : t('medicine.save', 'Save for later')}
            >
              {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
            </button>
          </div>

          {/* Category */}
          {medicine.category && (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize mb-2">
              {medicine.category.replace('_', ' ')}
            </span>
          )}

          {/* Rating */}
          {medicine.rating && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{medicine.rating.toFixed(1)}</span>
              {medicine.total_ratings && (
                <span className="text-sm text-gray-500">({medicine.total_ratings})</span>
              )}
            </div>
          )}
        </div>

        {/* Price and Stock */}
        <div className="px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div>
              {discountPrice ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">₹{discountPrice}</span>
                  <span className="text-sm text-gray-500 line-through">₹{price}</span>
                  <span className="text-xs font-medium text-green-600">{discount}% off</span>
                </div>
              ) : (
                <span className="text-lg font-bold text-gray-900">₹{price}</span>
              )}
            </div>
            
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              isInStock 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isInStock ? t('medicine.inStock', 'In Stock') : t('medicine.outOfStock', 'Out of Stock')}
            </span>
          </div>

          {/* Manufacturer */}
          {medicine.manufacturer && (
            <p className="text-xs text-gray-500 mb-3">
              {t('medicine.by', 'By')} {medicine.manufacturer}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => viewMedicineDetails(medicine)}
              className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('medicine.viewDetails', 'View Details')}
            </button>
            
            {showInteractionChecker && (
              <button
                onClick={() => toggleForInteraction(medicine)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  isSelectedForInteraction
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title={t('medicine.selectForInteraction', 'Select for interaction check')}
              >
                <Zap className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render skeleton loading
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
          <div className="pt-3 border-t">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            {t('medicine.title', 'Medicine Search')}
          </h1>
          <p className="text-gray-600">
            {t('medicine.subtitle', 'Search medicines, check alternatives and drug interactions')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
            {/* Main Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('medicine.searchPlaceholder', 'Search medicine name, salt, or brand...')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Search suggestions */}
              {searchTerm.length === 0 && searchHistory.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 py-2">
                  <p className="px-3 py-1 text-xs text-gray-500 font-medium">
                    {t('medicine.recentSearches', 'Recent searches')}
                  </p>
                  {searchHistory.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSearchTerm(term)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pincode */}
            <div className="relative w-full lg:w-40">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('medicine.pincode', 'Pincode')}
                maxLength="6"
                inputMode="numeric"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                hasActiveFilters 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>{t('common.filters', 'Filters')}</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                  {[filters.category, filters.availability, filters.prescription, filters.maxPrice < 2000].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Interaction Checker Toggle */}
            <button
              onClick={() => {
                setShowInteractionChecker(!showInteractionChecker);
                if (showInteractionChecker) {
                  setSelectedForInteraction([]);
                  setInteractionResult(null);
                }
              }}
              className={`px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-colors ${
                showInteractionChecker 
                  ? 'border-purple-500 bg-purple-50 text-purple-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              title={t('medicine.checkInteractions', 'Check drug interactions')}
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('medicine.interactions', 'Interactions')}</span>
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('medicine.category', 'Category')}
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  >
                    <option value="">{t('medicine.allCategories', 'All Categories')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('medicine.availability', 'Availability')}
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  >
                    <option value="">{t('common.all', 'All')}</option>
                    <option value="in_stock">{t('medicine.inStock', 'In Stock')}</option>
                    <option value="out_of_stock">{t('medicine.outOfStock', 'Out of Stock')}</option>
                  </select>
                </div>

                {/* Prescription */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('medicine.prescription', 'Prescription')}
                  </label>
                  <select
                    value={filters.prescription}
                    onChange={(e) => setFilters(prev => ({ ...prev, prescription: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  >
                    <option value="">{t('common.all', 'All')}</option>
                    <option value="required">{t('medicine.rxRequired', 'Prescription Required')}</option>
                    <option value="otc">{t('medicine.otc', 'Over the Counter')}</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('medicine.maxPrice', 'Max Price')}: ₹{filters.maxPrice}
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                  >
                    <X className="h-4 w-4" />
                    {t('common.clearFilters', 'Clear filters')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Interaction Checker Panel */}
          {showInteractionChecker && (
            <div className="mt-4 pt-4 border-t bg-purple-50 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 rounded-b-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium text-purple-900">
                    {t('medicine.drugInteractionChecker', 'Drug Interaction Checker')}
                  </h3>
                  <p className="text-sm text-purple-700">
                    {selectedForInteraction.length === 0
                      ? t('medicine.selectMedicines', 'Select 2 or more medicines to check interactions')
                      : `${selectedForInteraction.length} ${t('medicine.selected', 'selected')}: ${selectedForInteraction.map(m => m.name).join(', ')}`
                    }
                  </p>
                </div>
                
                <div className="flex gap-2">
                  {selectedForInteraction.length > 0 && (
                    <button
                      onClick={() => setSelectedForInteraction([])}
                      className="px-3 py-2 text-sm text-purple-700 hover:bg-purple-100 rounded-lg"
                    >
                      {t('common.clear', 'Clear')}
                    </button>
                  )}
                  <button
                    onClick={checkInteractions}
                    disabled={selectedForInteraction.length < 2 || checkingInteractions}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {checkingInteractions ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('common.checking', 'Checking...')}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" />
                        {t('medicine.checkInteractions', 'Check Interactions')}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Interaction Result */}
              {interactionResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  interactionResult.error 
                    ? 'bg-red-100 text-red-800' 
                    : interactionResult.has_interactions
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                }`}>
                  {interactionResult.error ? (
                    <p>{interactionResult.error}</p>
                  ) : interactionResult.has_interactions ? (
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        {t('medicine.interactionsFound', 'Potential interactions found!')}
                      </p>
                      {interactionResult.interactions?.map((interaction, idx) => (
                        <p key={idx} className="mt-2 text-sm">{interaction.description}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {t('medicine.noInteractions', 'No known interactions found between these medicines.')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Categories */}
        {!searchTerm && !filters.category && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              {t('medicine.browseCategories', 'Browse by Category')}
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilters(prev => ({ ...prev, category: cat.id }))}
                  className="flex flex-col items-center p-3 bg-white border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="text-2xl mb-1">{cat.icon}</span>
                  <span className="text-xs text-center text-gray-600">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured Banners */}
        {!searchTerm && !filters.category && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold">{t('medicine.verifiedQuality', '100% Genuine')}</h3>
                  <p className="text-sm opacity-90">{t('medicine.qualityAssurance', 'All medicines are verified')}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold">{t('medicine.interactionChecker', 'Interaction Checker')}</h3>
                  <p className="text-sm opacity-90">{t('medicine.checkSafety', 'Check drug safety')}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold">{t('medicine.alternatives', 'Find Alternatives')}</h3>
                  <p className="text-sm opacity-90">{t('medicine.genericOptions', 'Generic options available')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => searchMedicines()}
              className="ml-auto text-red-600 hover:text-red-800 underline text-sm"
            >
              {t('common.tryAgain', 'Try again')}
            </button>
          </div>
        )}

        {/* Results Header */}
        {(searchTerm || filters.category) && !isLoading && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {searchTerm 
                  ? `${t('medicine.resultsFor', 'Results for')} "${searchTerm}"`
                  : categories.find(c => c.id === filters.category)?.label
                }
                <span className="text-gray-500 ml-2">({medicines.length})</span>
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('common.sortBy', 'Sort by')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm focus:ring-blue-500"
              >
                <option value="relevance">{t('common.relevance', 'Relevance')}</option>
                <option value="price_low">{t('medicine.priceLowHigh', 'Price: Low to High')}</option>
                <option value="price_high">{t('medicine.priceHighLow', 'Price: High to Low')}</option>
                <option value="rating">{t('common.rating', 'Rating')}</option>
                <option value="name">{t('common.name', 'Name')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          renderSkeleton()
        ) : medicines.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map(renderMedicineCard)}
          </div>
        ) : searchTerm || filters.category ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('medicine.noResults', 'No medicines found')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('medicine.tryDifferent', 'Try a different search term or check the spelling')}
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.clearFilters', 'Clear Filters')}
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t('medicine.startSearching', 'Start searching for medicines')}</p>
          </div>
        )}

        {/* Safety Information */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">
                {t('medicine.safetyFirst', 'Important Safety Information')}
              </h3>
              <ul className="space-y-2 text-amber-800 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></span>
                  {t('medicine.safetyTip1', 'Always consult a doctor before taking any new medication')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></span>
                  {t('medicine.safetyTip2', 'Do not self-medicate with prescription drugs')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></span>
                  {t('medicine.safetyTip3', 'Check for allergies and drug interactions before use')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-amber-600 rounded-full mt-2 flex-shrink-0"></span>
                  {t('medicine.safetyTip4', 'This information is for reference only, not medical advice')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Medicine Detail Modal */}
      {selectedMedicine && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedMedicine(null)}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900 truncate pr-4">
                {selectedMedicine.name}
              </h2>
              <button
                onClick={() => setSelectedMedicine(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="flex items-start justify-between">
                    <div>
                      {selectedMedicine.brand && (
                        <p className="text-gray-600">{selectedMedicine.brand}</p>
                      )}
                      {selectedMedicine.manufacturer && (
                        <p className="text-sm text-gray-500">
                          {t('medicine.by', 'By')} {selectedMedicine.manufacturer}
                        </p>
                      )}
                    </div>
                    
                    {/* Price */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{selectedMedicine.discount_price || selectedMedicine.price}
                      </p>
                      {selectedMedicine.discount_price && (
                        <p className="text-sm text-gray-500 line-through">
                          ₹{selectedMedicine.price}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {(selectedMedicine.requires_prescription || selectedMedicine.prescription_required) && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        {t('medicine.rxRequired', 'Prescription Required')}
                      </span>
                    )}
                    {selectedMedicine.category && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                        {selectedMedicine.category.replace('_', ' ')}
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedMedicine.in_stock !== false
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedMedicine.in_stock !== false 
                        ? t('medicine.inStock', 'In Stock')
                        : t('medicine.outOfStock', 'Out of Stock')
                      }
                    </span>
                  </div>

                  {/* Description */}
                  {selectedMedicine.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t('medicine.description', 'Description')}
                      </h3>
                      <p className="text-gray-600">{selectedMedicine.description}</p>
                    </div>
                  )}

                  {/* Uses */}
                  {selectedMedicine.uses && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t('medicine.uses', 'Uses')}
                      </h3>
                      <p className="text-gray-600">{selectedMedicine.uses}</p>
                    </div>
                  )}

                  {/* Dosage */}
                  {selectedMedicine.dosage && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {t('medicine.dosage', 'Dosage')}
                      </h3>
                      <p className="text-gray-600">{selectedMedicine.dosage}</p>
                    </div>
                  )}

                  {/* Side Effects */}
                  {selectedMedicine.side_effects?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {t('medicine.sideEffects', 'Possible Side Effects')}
                      </h3>
                      <ul className="space-y-1">
                        {selectedMedicine.side_effects.map((effect, idx) => (
                          <li key={idx} className="text-gray-600 text-sm flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                            {effect}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Alternatives */}
                  {selectedMedicine.alternatives?.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {t('medicine.alternatives', 'Alternatives')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedMedicine.alternatives.map((alt, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedMedicine(null);
                              setSearchTerm(typeof alt === 'string' ? alt : alt.name);
                            }}
                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                          >
                            {typeof alt === 'string' ? alt : alt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => toggleSaveMedicine(selectedMedicine)}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      {savedMedicines.some(m => m.id === selectedMedicine.id) ? (
                        <>
                          <BookmarkCheck className="h-5 w-5 text-blue-600" />
                          {t('medicine.saved', 'Saved')}
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-5 w-5" />
                          {t('medicine.save', 'Save')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: selectedMedicine.name,
                            text: `Check out ${selectedMedicine.name} on MediConnect`,
                            url: window.location.href
                          });
                        }
                      }}
                      className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <Share2 className="h-5 w-5" />
                      {t('common.share', 'Share')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineSearch;