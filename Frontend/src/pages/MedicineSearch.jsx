import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  Pill,
  AlertTriangle,
  ShoppingCart,
  Heart,
  Star,
  Truck,
  Clock,
  MapPin,
  ChevronRight,
  Info,
  Share2,
  Bookmark,
  TrendingUp,
  Shield,
  Package
} from 'lucide-react';
import MedicineCard from '../components/medicine/MedicineCard';
import { medicineAPI } from '../services/api';

const MedicineSearch = () => {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    availability: '',
    priceRange: [0, 1000],
    prescription: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMedicines();
    } else {
      setFilteredMedicines([]);
    }
  }, [searchTerm]);

  const searchMedicines = async () => {
    setIsLoading(true);
    try {
      const response = await medicineAPI.searchMedicines(searchTerm);
      setMedicines(response.data);
      applyFilters(response.data);
    } catch (error) {
      console.error('Error searching medicines:', error);
      // Mock data for demo
      setTimeout(() => {
        const mockMedicines = [
          {
            id: 1,
            name: 'Paracetamol 500mg',
            brand: 'Crocin',
            category: 'analgesic',
            prescriptionRequired: false,
            price: 25,
            discountPrice: 20,
            discount: 20,
            inStock: true,
            stockCount: 45,
            deliveryTime: '2-3 hours',
            rating: 4.5,
            totalRatings: 1245,
            manufacturer: 'GSK Pharmaceuticals',
            description: 'Used for relief of fever and mild to moderate pain',
            dosage: '1 tablet every 4-6 hours',
            sideEffects: ['Nausea', 'Skin rash'],
            alternatives: ['Dolo 650', 'Calpol']
          },
          {
            id: 2,
            name: 'Amoxicillin 250mg',
            brand: 'Mox',
            category: 'antibiotic',
            prescriptionRequired: true,
            price: 120,
            discountPrice: 95,
            discount: 21,
            inStock: true,
            stockCount: 12,
            deliveryTime: '4-6 hours',
            rating: 4.3,
            totalRatings: 890,
            manufacturer: 'Cipla',
            description: 'Antibiotic used to treat bacterial infections',
            dosage: '1 capsule twice daily',
            sideEffects: ['Diarrhea', 'Allergic reactions'],
            alternatives: ['Amoxyclav', 'Augmentin']
          },
          {
            id: 3,
            name: 'Cetirizine 10mg',
            brand: 'Alatrol',
            category: 'antihistamine',
            prescriptionRequired: false,
            price: 45,
            discountPrice: 35,
            discount: 22,
            inStock: true,
            stockCount: 78,
            deliveryTime: '1-2 hours',
            rating: 4.7,
            totalRatings: 2100,
            manufacturer: 'Sun Pharma',
            description: 'Used to relieve allergy symptoms',
            dosage: '1 tablet daily',
            sideEffects: ['Drowsiness', 'Dry mouth'],
            alternatives: ['Levocytirizine', 'Fexofenadine']
          },
          {
            id: 4,
            name: 'Omeprazole 20mg',
            brand: 'Omez',
            category: 'antacid',
            prescriptionRequired: false,
            price: 85,
            discountPrice: 65,
            discount: 24,
            inStock: false,
            stockCount: 0,
            deliveryTime: '6-8 hours',
            rating: 4.4,
            totalRatings: 1560,
            manufacturer: 'Dr. Reddy\'s',
            description: 'Used to treat acid reflux and GERD',
            dosage: '1 capsule daily before food',
            sideEffects: ['Headache', 'Abdominal pain'],
            alternatives: ['Pantoprazole', 'Rabeprazole']
          },
          {
            id: 5,
            name: 'Metformin 500mg',
            brand: 'Glycomet',
            category: 'antidiabetic',
            prescriptionRequired: true,
            price: 95,
            discountPrice: 75,
            discount: 21,
            inStock: true,
            stockCount: 34,
            deliveryTime: '3-4 hours',
            rating: 4.6,
            totalRatings: 980,
            manufacturer: 'USV',
            description: 'Used to control blood sugar in type 2 diabetes',
            dosage: '1 tablet twice daily with meals',
            sideEffects: ['Nausea', 'Diarrhea'],
            alternatives: ['Glimipiride', 'Voglibose']
          },
          {
            id: 6,
            name: 'Vitamin C 500mg',
            brand: 'Limcee',
            category: 'supplement',
            prescriptionRequired: false,
            price: 150,
            discountPrice: 120,
            discount: 20,
            inStock: true,
            stockCount: 120,
            deliveryTime: '2-3 hours',
            rating: 4.8,
            totalRatings: 3200,
            manufacturer: 'Dabur',
            description: 'Vitamin C supplement for immunity',
            dosage: '1 tablet daily',
            sideEffects: ['Stomach upset'],
            alternatives: ['Celin', 'VitCo']
          }
        ];
        setMedicines(mockMedicines);
        applyFilters(mockMedicines);
        setIsLoading(false);
      }, 1000);
    }
  };

  const applyFilters = (data) => {
    let result = data;

    // Category filter
    if (filters.category) {
      result = result.filter(med => med.category === filters.category);
    }

    // Availability filter
    if (filters.availability === 'in_stock') {
      result = result.filter(med => med.inStock);
    } else if (filters.availability === 'out_of_stock') {
      result = result.filter(med => !med.inStock);
    }

    // Prescription filter
    if (filters.prescription === 'required') {
      result = result.filter(med => med.prescriptionRequired);
    } else if (filters.prescription === 'not_required') {
      result = result.filter(med => !med.prescriptionRequired);
    }

    // Price filter
    result = result.filter(med =>
      med.discountPrice >= filters.priceRange[0] &&
      med.discountPrice <= filters.priceRange[1]
    );

    setFilteredMedicines(result);
  };

  const checkAvailability = async (medicineId) => {
    if (!pincode || pincode.length !== 6) {
      alert(t('EnterValidPincode'));
      return;
    }

    try {
      const response = await medicineAPI.checkAvailability(medicineId, pincode);
      alert(`${t('Availability')}: ${response.data.available ? t('medicine.available') : t('medicine.notAvailable')}`);
    } catch (error) {
      console.error('Error checking availability:', error);
      alert(t('AvailabilityCheckError'));
    }
  };

  const categories = [
    { id: 'analgesic', label: t('analgesic') },
    { id: 'antibiotic', label: t('antibiotic') },
    { id: 'antihistamine', label: t('antihistamine') },
    { id: 'antacid', label: t('antacid') },
    { id: 'antidiabetic', label: t('antidiabetic') },
    { id: 'supplement', label: t('supplement') },
    { id: 'cardiovascular', label: t('cardiovascular') },
    { id: 'respiratory', label: t('respiratory') }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('MedicineSearchTitle')}
          </h1>
         
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
            <div className="flex-1 mb-4 lg:mb-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('MedicineSearch')}
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder={t('medicine.pincode')}
                    maxLength="6"
                    className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                {t('Filters')}
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('Category')}
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('AllCategories')}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('Availability')}
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => setFilters({...filters, availability: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('medicine.all')}</option>
                    <option value="in_stock">{t('InStock')}</option>
                    <option value="out_of_stock">{t('OutOfStock')}</option>
                  </select>
                </div>

                {/* Prescription Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('Prescription')}
                  </label>
                  <select
                    value={filters.prescription}
                    onChange={(e) => setFilters({...filters, prescription: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('medicine.all')}</option>
                    <option value="required">{t('PrescriptionRequired')}</option>
                    <option value="not_required">{t('OverTheCounter')}</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('priceRange')}: ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={filters.priceRange[1]}
                    onChange={(e) => setFilters({...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)]})}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setFilters({
                    category: '',
                    availability: '',
                    priceRange: [0, 1000],
                    prescription: ''
                  })}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('ClearFilters')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Featured Medicines */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {t('FeaturedMedicines')}
            </h2>
            <div className="flex items-center text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t('TrendingNow')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 mr-3" />
                <div>
                  <h3 className="text-lg font-bold">{t('VerifiedQuality')}</h3>
                  <p className="text-sm opacity-90">{t('QualityAssurance')}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Truck className="h-8 w-8 mr-3" />
                <div>
                  <h3 className="text-lg font-bold">{t('FastDelivery')}</h3>
                  <p className="text-sm opacity-90">{t('DeliveryGuarantee')}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-6">
              <div className="flex items-center mb-4">
                <Package className="h-8 w-8 mr-3" />
                <div>
                  <h3 className="text-lg font-bold">{t('CashOnDelivery')}</h3>
                  <p className="text-sm opacity-90">{t('PayOnDelivery')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {searchTerm ? t('medicine.searchResults') : t('popularMedicines')}
              {searchTerm && `: "${searchTerm}"`}
              <span className="text-gray-500 ml-2">({filteredMedicines.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMedicines.length > 0 ? (
            <div>
              {searchTerm && (
                <div className="mb-4 text-sm text-gray-600">
                  {t('ResultsFor')} <span className="font-semibold">{searchTerm}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMedicines.map(medicine => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onCheckAvailability={() => checkAvailability(medicine.id)}
                  pincode={pincode}
                />
              ))}
              </div>
            </div>
          ) : searchTerm ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {t('NoMedicinesFound')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('TryDifferentSearch')}
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">{t('StartSearching')}</p>
            </div>
          )}
        </div>

        {/* Medicine Categories */}
        <div className="bg-white rounded-xl shadow border p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {t('BrowseCategories')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => {
                  setFilters({...filters, category: category.id});
                  setSearchTerm('');
                }}
                className={`flex flex-col items-center p-4 rounded-lg border hover:border-blue-500 hover:bg-blue-50 ${
                  filters.category === category.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <Pill className={`h-6 w-6 mb-2 ${
                  filters.category === category.id ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className="text-sm text-center">{category.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Safety Information */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-yellow-900 mb-2">
                {t('SafetyFirst')}
              </h3>
              <ul className="space-y-2 text-yellow-800">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-2"></div>
                  <span>{t('SafetyTip1')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-2"></div>
                  <span>{t('SafetyTip2')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-2"></div>
                  <span>{t('SafetyTip3')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-2"></div>
                  <span>{t('SafetyTip4')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Medicine Details Modal */}
        {selectedMedicine && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedMedicine.name}
                  </h3>
                  <button
                    onClick={() => setSelectedMedicine(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div>
                    <div className="bg-gray-50 rounded-xl p-6 mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">
                            ₹{selectedMedicine.discountPrice}
                          </div>
                          <div className="text-sm text-gray-500 line-through">
                            ₹{selectedMedicine.price}
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {selectedMedicine.discount}% OFF
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t('AuthenticProduct')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Truck className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t('DeliveryIn')} {selectedMedicine.deliveryTime}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-purple-500 mr-2" />
                          <span className="text-sm text-gray-700">
                            {t('CashOnDeliveryAvailable')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-2">{t('medicine.description')}</h4>
                      <p className="text-gray-600">{selectedMedicine.description}</p>
                    </div>

                    {/* Dosage */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-2">{t('Dosage')}</h4>
                      <p className="text-gray-600">{selectedMedicine.dosage}</p>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div>
                    {/* Manufacturer */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-2">{t('Manufacturer')}</h4>
                      <p className="text-gray-600">{selectedMedicine.manufacturer}</p>
                    </div>

                    {/* Side Effects */}
                    <div className="mb-6">
                      <h4 className="font-bold text-gray-900 mb-2">{t('SideEffects')}</h4>
                      <ul className="list-disc pl-5 space-y-1 text-gray-600">
                        {selectedMedicine.sideEffects.map((effect, index) => (
                          <li key={index}>{effect}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Alternatives */}
                    {selectedMedicine.alternatives && (
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-2">{t('Alternatives')}</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMedicine.alternatives.map((alt, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                            >
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        {t('AddToCart')}
                      </button>
                      <button className="w-full py-3 border border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50 flex items-center justify-center">
                        <Heart className="h-5 w-5 mr-2" />
                        {t('SaveForLater')}
                      </button>
                      {selectedMedicine.prescriptionRequired && (
                        <button className="w-full py-3 border border-red-600 text-red-600 rounded-lg font-bold hover:bg-red-50 flex items-center justify-center">
                          <Info className="h-5 w-5 mr-2" />
                          {t('PrescriptionRequired')}
                        </button>
                      )}
                    </div>

                    {/* Check Availability */}
                    <div className="mt-6">
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                          placeholder={t('EnterPincode')}
                          maxLength="6"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={() => checkAvailability(selectedMedicine.id)}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          {t('Check')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicineSearch;