import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, MapPin, Award, DollarSign, Calendar, Phone } from 'lucide-react';
import { doctorAPI } from '../services/api';

const DoctorProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const [doctor, setDoctor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      setIsLoading(true);
      // If a doctor object was passed via Link state, show it immediately
      const passed = location?.state?.doctor;
      if (passed) {
        setDoctor({
          id: passed.id || id,
          name: passed.name || passed.fullName || `Dr. ${passed.lastName || 'Unknown'}`,
          specialization: passed.specialization || passed.speciality || passed.field || '-',
          rating: passed.rating ?? passed.avgRating ?? 0,
          totalRatings: passed.totalRatings ?? passed.ratingsCount ?? 0,
          experience: passed.experience || passed.yearsExperience || '-',
          fee: passed.fee ?? passed.consultationFee ?? '-',
          languages: passed.languages || passed.langs || [],
          hospital: passed.hospital || passed.clinic || '-',
          education: passed.education || passed.qualifications || '-',
          awards: passed.awards || passed.honors || [],
          phone: passed.phone || passed.contact || ''
        });
        setIsLoading(false);
      }
      try {
        const res = await doctorAPI.getDoctorById(id);
        // normalize response shapes: API may return { data: doctor } or { data: { doctor } } or doctor directly
        const payload = res?.data ?? res;
        let doc = null;
        if (!payload) doc = null;
        else if (payload.doctor) doc = payload.doctor;
        else if (payload.data && typeof payload.data === 'object' && (payload.data.id || payload.data.name)) doc = payload.data;
        else if (payload.data && payload.data.doctor) doc = payload.data.doctor;
        else doc = payload;

        if (!doc) throw new Error('No doctor data');

        setDoctor({
          id: doc.id || id,
          name: doc.name || doc.fullName || `Dr. ${doc.lastName || 'Unknown'}`,
          specialization: doc.specialization || doc.speciality || doc.field || '-',
          rating: doc.rating ?? doc.avgRating ?? 0,
          totalRatings: doc.totalRatings ?? doc.ratingsCount ?? 0,
          experience: doc.experience || doc.yearsExperience || '-',
          fee: doc.fee ?? doc.consultationFee ?? '-',
          languages: doc.languages || doc.langs || [],
          hospital: doc.hospital || doc.clinic || '-',
          education: doc.education || doc.qualifications || '-',
          awards: doc.awards || doc.honors || [],
          phone: doc.phone || doc.contact || ''
        });
      } catch (err) {
        console.error('Failed to load doctor:', err);
        setDoctor({
          id,
          name: 'Dr. Unknown',
          specialization: '',
          rating: 0,
          totalRatings: 0,
          experience: '-',
          fee: '-',
          languages: [],
          hospital: '-',
          education: '-',
          awards: []
        });
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDoctor();
  }, [id]);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!doctor) return null;

  const initials = (doctor.name || 'Dr').split(' ').map(n => n[0] || '').join('').slice(0,3).toUpperCase();

  const tr = (key, fallback) => {
    try {
      const val = t(key);
      return val === key ? fallback : val;
    } catch (e) {
      return fallback;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/doctors" className="text-blue-600 hover:underline">← {t('BackToList') || 'Back to list'}</Link>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex flex-col lg:flex-row lg:items-start">
            <div className="lg:w-1/4 mb-6 lg:mb-0 flex items-center">
              <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <div className="text-3xl font-bold text-blue-600">{initials}</div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{doctor.name}</h2>
                <div className="text-blue-600 font-medium">{doctor.specialization}</div>
                <div className="flex items-center mt-2">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="ml-1 font-bold">{doctor.rating || '—'}</span>
                  <span className="ml-2 text-gray-500">({doctor.totalRatings || 0})</span>
                </div>
              </div>
            </div>

            <div className="lg:w-2/4 lg:px-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center">
                  <Award className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">{tr('Experience', 'Experience')}</div>
                    <div className="font-medium">{doctor.experience || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <div className="text-sm text-gray-500">{tr('Hospital', 'Hospital')}</div>
                    <div className="font-medium">{doctor.hospital || '-'}</div>
                  </div>
                </div>
                {doctor.education && (
                  <div>
                    <div className="text-sm text-gray-500">{tr('Education', 'Education')}</div>
                    <div className="font-medium">{doctor.education || '-'}</div>
                  </div>
                )}

                {doctor.awards?.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">{tr('Awards', 'Awards')}</div>
                    <ul className="list-disc list-inside mt-1 text-gray-700">
                      {doctor.awards.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}

                {doctor.languages?.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-500">{tr('Languages', 'Languages')}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {doctor.languages.map((l, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:w-1/4 lg:pl-6 mt-6 lg:mt-0">
              <div className="space-y-3">
                <Link to={`/consultation/${doctor.id}`} className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium text-center hover:bg-blue-700">
                  <Calendar className="inline-block h-4 w-4 mr-2" /> {tr('BookSlot', 'Book Slot')}
                </Link>
                <a href={doctor.phone ? `tel:${doctor.phone}` : '#'} className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium text-center hover:bg-gray-50">
                  <Phone className="inline-block h-4 w-4 mr-2" /> {doctor.phone ? tr('Call', 'Call') : tr('Contact', 'Contact')}
                </a>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">{tr('consultationFee', 'Consultation Fee')}</div>
                  <div className="font-bold text-lg">{doctor.fee && doctor.fee !== '-' ? `₹${doctor.fee}` : '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600">{t('FailedToLoadDoctor') || 'Failed to load doctor details.'}</div>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
