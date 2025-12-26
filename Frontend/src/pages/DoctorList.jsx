import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  Star,
  Clock,
  MapPin,
  Phone,
  Video,
  Calendar,
  Award,
  Users,
  CheckCircle,
  ChevronRight,
  Heart,
  Shield,
  DollarSign
} from 'lucide-react';
import { doctorAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DoctorList = () => {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    specialization: '',
    availability: '',
    rating: '',
    feeRange: [0, 2000]
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [appointmentType, setAppointmentType] = useState('video');
  const [isBooking, setIsBooking] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationId, setConfirmationId] = useState(null);
  const [offlineBooking, setOfflineBooking] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [searchTerm, filters, doctors]);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const response = await doctorAPI.getAllDoctors();
      setDoctors(response.data);
      setFilteredDoctors(response.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Mock data for demo
      setTimeout(() => {
        const mockDoctors = [
          {
            id: 1,
            name: 'Dr. Rajesh Sharma',
            specialization: 'Cardiologist',
            rating: 4.8,
            totalRatings: 124,
            experience: '12 years',
            fee: 800,
            nextAvailable: '10:30 AM',
            languages: ['Hindi', 'English', 'Bengali'],
            isOnline: true,
            hospital: 'Apollo Hospital, Delhi',
            education: 'MD, AIIMS Delhi',
            awards: ['Best Cardiologist 2022', 'MCI Excellence Award']
          },
          {
            id: 2,
            name: 'Dr. Priya Singh',
            specialization: 'Pediatrician',
            rating: 4.9,
            totalRatings: 89,
            experience: '8 years',
            fee: 600,
            nextAvailable: '2:00 PM',
            languages: ['Hindi', 'English'],
            isOnline: false,
            hospital: 'Fortis Hospital, Mumbai',
            education: 'MD Pediatrics, KEM Hospital'
          },
          {
            id: 3,
            name: 'Dr. Amit Patel',
            specialization: 'Orthopedic',
            rating: 4.7,
            totalRatings: 156,
            experience: '15 years',
            fee: 1000,
            nextAvailable: '11:00 AM',
            languages: ['Hindi', 'Gujarati', 'English'],
            isOnline: true,
            hospital: 'Medanta Hospital, Gurgaon'
          },
          {
            id: 4,
            name: 'Dr. Sunita Reddy',
            specialization: 'Gynecologist',
            rating: 4.9,
            totalRatings: 210,
            experience: '18 years',
            fee: 1200,
            nextAvailable: '4:30 PM',
            languages: ['Hindi', 'Telugu', 'English'],
            isOnline: true,
            hospital: 'Max Hospital, Delhi'
          },
          {
            id: 5,
            name: 'Dr. Rohit Kumar',
            specialization: 'General Physician',
            rating: 4.6,
            totalRatings: 95,
            experience: '6 years',
            fee: 400,
            nextAvailable: '9:00 AM',
            languages: ['Hindi', 'English'],
            isOnline: true,
            hospital: 'City Hospital, Bangalore'
          },
          {
            id: 6,
            name: 'Dr. Neha Gupta',
            specialization: 'Dermatologist',
            rating: 4.8,
            totalRatings: 178,
            experience: '10 years',
            fee: 900,
            nextAvailable: '3:00 PM',
            languages: ['Hindi', 'English', 'Punjabi'],
            isOnline: false,
            hospital: 'Artemis Hospital, Delhi'
          }
        ];
        setDoctors(mockDoctors);
        setFilteredDoctors(mockDoctors);
        setIsLoading(false);
      }, 1000);
    }
  };

  const filterDoctors = () => {
    let result = [...doctors];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(doctor =>
        doctor.name.toLowerCase().includes(term) ||
        doctor.specialization.toLowerCase().includes(term) ||
        doctor.hospital.toLowerCase().includes(term)
      );
    }

    // Specialization filter
    if (filters.specialization) {
      result = result.filter(doctor => doctor.specialization === filters.specialization);
    }

    // Availability filter
    if (filters.availability === 'online') {
      result = result.filter(doctor => doctor.isOnline);
    } else if (filters.availability === 'available') {
      result = result.filter(doctor => doctor.nextAvailable);
    }

    // Rating filter
    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      result = result.filter(doctor => doctor.rating >= minRating);
    }

    // Fee filter
    result = result.filter(doctor =>
      doctor.fee >= filters.feeRange[0] && doctor.fee <= filters.feeRange[1]
    );

    setFilteredDoctors(result);
  };

  const specializations = [
    'Cardiologist',
    'Pediatrician',
    'Orthopedic',
    'Gynecologist',
    'General Physician',
    'Dermatologist',
    'Psychiatrist',
    'Dentist',
    'Ayurveda',
    'Homeopathy'
  ];

  const renderDoctorCard = (doctor) => (
    <div key={doctor.id} className="bg-white rounded-xl shadow-lg border p-6 hover:shadow-xl transition-shadow">
      <div className="flex flex-col lg:flex-row">
        {/* Doctor Avatar and Basic Info */}
        <div className="lg:w-1/4 mb-6 lg:mb-0 lg:pr-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="text-2xl font-bold text-blue-600">
                {doctor.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
              <p className="text-blue-600 font-medium">{doctor.specialization}</p>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="ml-1 font-bold">{doctor.rating}</span>
                  <span className="ml-1 text-gray-500">({doctor.totalRatings})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Online Status */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-4 ${
            doctor.isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              doctor.isOnline ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
            {doctor.isOnline ? t('OnlineNow') : t('Offline')}
          </div>
        </div>

        {/* Doctor Details */}
        <div className="lg:w-2/4 mb-6 lg:mb-0 lg:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center">
              <Award className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-sm text-gray-500">{t('Experience')}</div>
                <div className="font-medium">{doctor.experience}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-sm text-gray-500">{t('NextAvailable')}</div>
                <div className="font-medium">{doctor.nextAvailable}</div>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-sm text-gray-500">{t('Hospital')}</div>
                <div className="font-medium">{doctor.hospital}</div>
              </div>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-sm text-gray-500">{t('consultationFee')}</div>
                <div className="font-medium">₹{doctor.fee}</div>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="mt-4">
            <div className="text-sm text-gray-500 mb-2">{t('Languages')}</div>
            <div className="flex flex-wrap gap-2">
              {doctor.languages?.map((lang, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Education */}
          {doctor.education && (
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">{t('Education')}</div>
              <div className="font-medium">{doctor.education}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="lg:w-1/4 lg:pl-6">
          <div className="space-y-3">
            <Link
              to={`/consultation/${doctor.id}`}
              className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-center"
            >
              <Video className="inline-block h-4 w-4 mr-2" />
              {t('VideoConsult')}
            </Link>
            <Link
              to={`/doctors/${doctor.id}`}
              state={{ doctor }}
              className="block w-full py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 text-center"
            >
              {t('ViewProfile')}
            </Link>
            <button
              onClick={() => setSelectedDoctor(doctor)}
              className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 text-center"
            >
              <Calendar className="inline-block h-4 w-4 mr-2" />
              {t('BookSlot')}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center text-sm text-gray-600">
              <Shield className="h-4 w-4 mr-2 text-green-500" />
              {t('Verified')}
            </div>
            <div className="flex items-center text-sm text-gray-600 mt-2">
              <Heart className="h-4 w-4 mr-2 text-red-400" />
              {t('EmergencyAvailable')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('DoctorList')}
          </h1>
          <p className="text-gray-600">
            {t('DoctorList')}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4">
            {/* Search Input */}
            <div className="flex-1 mb-4 lg:mb-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('SearchPlaceholder')}
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('Filters')}
              {Object.values(filters).some(f => f !== '' && (!Array.isArray(f) || f[0] !== 0 || f[1] !== 2000)) && (
                <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Specialization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('Specialization')}
                  </label>
                  <select
                    value={filters.specialization}
                    onChange={(e) => setFilters({...filters, specialization: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('AllSpecializations')}</option>
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('Availability')}
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => setFilters({...filters, availability: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('All')}</option>
                    <option value="online">{t('OnlineNow')}</option>
                    <option value="available">{t('AvailableToday')}</option>
                  </select>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('MinimumRating')}
                  </label>
                  <select
                    value={filters.rating}
                    onChange={(e) => setFilters({...filters, rating: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('AnyRating')}</option>
                    <option value="4.5">4.5+ ★</option>
                    <option value="4.0">4.0+ ★</option>
                    <option value="3.5">3.5+ ★</option>
                  </select>
                </div>

                {/* Fee Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('FeeRange')}: ₹{filters.feeRange[0]} - ₹{filters.feeRange[1]}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={filters.feeRange[1]}
                    onChange={(e) => setFilters({...filters, feeRange: [filters.feeRange[0], parseInt(e.target.value)]})}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setFilters({
                    specialization: '',
                    availability: '',
                    rating: '',
                    feeRange: [0, 2000]
                  })}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  {t('ClearFilters')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-gray-700">
              {t('Found')} <span className="font-bold">{filteredDoctors.length}</span> {t('Doctors')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{t('SortBy')}:</span>
            <select className="border rounded-lg px-3 py-2">
              <option>{t('Relevance')}</option>
              <option>{t('rating')}</option>
              <option>{t('Experience')}</option>
              <option>{t('FeeLowHigh')}</option>
            </select>
          </div>
        </div>

        {/* Doctors List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDoctors.length > 0 ? (
          <div className="space-y-6">
            {filteredDoctors.map(renderDoctorCard)}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('NoDoctorsFound')}</h3>
            <p className="text-gray-600 mb-6">{t('TryDifferentFilters')}</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  specialization: '',
                  availability: '',
                  rating: '',
                  feeRange: [0, 2000]
                });
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('ResetFilters')}
            </button>
          </div>
        )}

        {/* Booking Modal */}
        {selectedDoctor && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('BookAppointment')} - {selectedDoctor.name}
                  </h3>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Date Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('doctorList.selectDate')}
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7].map(day => {
                        const isSelected = selectedDate === day;
                        return (
                        <button
                          key={day}
                          onClick={() => setSelectedDate(day)}
                          className={`p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
                        >
                          <div className="text-sm">Mon</div>
                          <div className="font-bold">{day}</div>
                        </button>
                      )})}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('SelectTime')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'].map(time => {
                        const isSelected = selectedTime === time;
                        return (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 ${isSelected ? 'bg-blue-50 border-blue-300' : ''}`}
                        >
                          {time}
                        </button>
                      )})}
                    </div>
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('AppointmentType')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setAppointmentType('video')} className={`p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 ${appointmentType === 'video' ? 'bg-blue-50 border-blue-300' : ''}`}>
                        <Video className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                        <div className="font-medium">{t('VideoConsult')}</div>
                      </button>
                      <button onClick={() => setAppointmentType('audio')} className={`p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 ${appointmentType === 'audio' ? 'bg-blue-50 border-blue-300' : ''}`}>
                        <Phone className="h-6 w-6 mx-auto mb-2 text-green-600" />
                        <div className="font-medium">{t('AudioCall')}</div>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setSelectedDoctor(null)}
                      className="px-6 py-3 border rounded-lg hover:bg-gray-50"
                    >
                      {t('Cancel')}
                    </button>
                    <button
                      onClick={async () => {
                        // validate selections
                        if (!selectedDate || !selectedTime) {
                          alert(t('SelectDateTime'));
                          return;
                        }

                        setIsBooking(true);
                        try {
                          const payload = {
                            doctorId: selectedDoctor.id,
                            date: selectedDate,
                            time: selectedTime,
                            type: appointmentType,
                            fee: selectedDoctor.fee,
                            patientId: user?.id || null
                          };

                          const res = await doctorAPI.bookAppointment(payload);
                          // expect backend to return appointment id
                          const appointmentId = res?.data?.appointmentId || res?.data?.id || `APPT-${Date.now()}`;
                          setConfirmationId(appointmentId);
                          setShowConfirmation(true);
                          // Notify other parts of the app that an appointment was booked
                          try {
                            window.dispatchEvent(new CustomEvent('appointmentBooked', { detail: { doctorId: selectedDoctor.id, date: selectedDate, appointmentId } }));
                          } catch (e) {
                            console.warn('Event dispatch failed', e);
                          }
                          // clear modal selections
                          setSelectedDoctor(null);
                          setSelectedDate(null);
                          setSelectedTime(null);
                          setAppointmentType('video');
                        } catch (error) {
                          console.error('Booking error:', error);
                          // If no response (network error), offer offline/demo confirmation
                          const status = error?.status ?? error?.response?.status ?? null;
                          if (status === 0 || error?.code === 'ERR_NETWORK') {
                            // generate a local appointment id and show confirmation modal
                            const appointmentId = `APPT-OFFLINE-${Date.now()}`;
                            setConfirmationId(appointmentId);
                            setOfflineBooking(true);
                            setShowConfirmation(true);
                            // Fire appointmentBooked event for offline bookings as well
                            try {
                              window.dispatchEvent(new CustomEvent('appointmentBooked', { detail: { doctorId: selectedDoctor.id, date: selectedDate, appointmentId, offline: true } }));
                            } catch (e) {
                              console.warn('Event dispatch failed', e);
                            }
                            // close booking modal selections
                            setSelectedDoctor(null);
                            setSelectedDate(null);
                            setSelectedTime(null);
                            setAppointmentType('video');
                          } else {
                            const msg = error?.message || error?.response?.data?.message || t('BookingError');
                            alert(msg);
                          }
                        } finally {
                          setIsBooking(false);
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isBooking ? t('Booking') : `${t('ConfirmBooking')} - ₹${selectedDoctor.fee}`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 text-center">
              <h3 className="text-xl font-bold mb-4">{t('BookingConfirmed')}</h3>
              <p className="mb-4">{t('BookingMessage')}</p>
              <div className="mb-4 p-4 bg-gray-50 rounded">
                <div className="font-semibold">{t('AppointmentId')}:</div>
                <div className="text-blue-600 font-mono mt-1">{confirmationId}</div>
              </div>
              <button onClick={() => setShowConfirmation(false)} className="px-6 py-2 bg-blue-600 text-white rounded-lg">{t('Ok')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorList;