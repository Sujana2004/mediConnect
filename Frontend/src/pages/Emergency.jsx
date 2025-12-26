import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Navigation,
  Clock,
  Users,
  Heart,
  Shield,
  Truck,
  Bed,
  ChevronRight,
  Bell,
  Share2,
  Download,
  User,
  MessageSquare,
  Video
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import EmergencyButton from '../components/emergency/EmergencyButton';
import { emergencyAPI } from '../services/api';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const Emergency = () => {
  const { t } = useTranslation();
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
  const mapRef = useRef(null);

  useEffect(() => {
    fetchLocation();
    fetchEmergencyContacts();
    fetchNearbyHospitals();
  }, []);

  const fetchLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocation('Location access denied');
        }
      );
    } else {
      setLocation('Geolocation not supported');
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const contacts = [
        { name: 'National Emergency Number', number: '112', type: 'emergency' },
        { name: 'Police', number: '100', type: 'police' },
        { name: 'Fire Brigade', number: '101', type: 'fire' },
        { name: 'Ambulance', number: '102', type: 'ambulance' },
        { name: 'Disaster Management', number: '108', type: 'disaster' },
        { name: 'Women Helpline', number: '1091', type: 'women' },
        { name: 'Child Helpline', number: '1098', type: 'child' },
        { name: 'Mental Health', number: '08046110007', type: 'mental' }
      ];
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  const fetchNearbyHospitals = async () => {
    try {
      const response = await emergencyAPI.getNearbyHospitals(userLocation.lat, userLocation.lng);
      setHospitals(response.data);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      // Mock data for demo
      setTimeout(() => {
        const mockHospitals = [
          {
            id: 1,
            name: 'Apollo Hospital',
            type: 'multi_specialty',
            distance: '2.5 km',
            travelTime: '10 min',
            bedsAvailable: 12,
            icuAvailable: 3,
            emergencyAvailable: true,
            contact: '011-23231333',
            location: { lat: 28.615, lng: 77.21 },
            specialities: ['Cardiology', 'Neurology', 'Trauma']
          },
          {
            id: 2,
            name: 'AIIMS Hospital',
            type: 'government',
            distance: '5.2 km',
            travelTime: '15 min',
            bedsAvailable: 25,
            icuAvailable: 8,
            emergencyAvailable: true,
            contact: '011-26588500',
            location: { lat: 28.617, lng: 77.208 },
            specialities: ['All Specialities', 'Research', 'Teaching']
          },
          {
            id: 3,
            name: 'Max Super Speciality Hospital',
            type: 'multi_specialty',
            distance: '3.8 km',
            travelTime: '12 min',
            bedsAvailable: 8,
            icuAvailable: 2,
            emergencyAvailable: true,
            contact: '011-26515555',
            location: { lat: 28.612, lng: 77.211 },
            specialities: ['Orthopedics', 'Oncology', 'Transplant']
          },
          {
            id: 4,
            name: 'Fortis Hospital',
            type: 'private',
            distance: '4.5 km',
            travelTime: '14 min',
            bedsAvailable: 15,
            icuAvailable: 4,
            emergencyAvailable: true,
            contact: '011-42776222',
            location: { lat: 28.618, lng: 77.206 },
            specialities: ['Cardiac', 'Neuro', 'Gastroenterology']
          }
        ];
        setHospitals(mockHospitals);
      }, 1000);
    }
  };

  const handleSOS = async () => {
    setIsSendingSOS(true);
    try {
      const sosData = {
        location: userLocation,
        timestamp: new Date().toISOString(),
        emergencyType: 'medical',
        severity: 'critical'
      };

      await emergencyAPI.sendSOS(sosData);
      setSosSent(true);
      
      // Alert emergency contacts
      alertEmergencyContacts();
      
      // Request ambulance
      requestAmbulance();
      
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert(t('emergency.sosError'));
    } finally {
      setIsSendingSOS(false);
    }
  };

  const alertEmergencyContacts = () => {
    // In real implementation, this would send notifications to emergency contacts
    console.log('Alerting emergency contacts...');
  };

  const requestAmbulance = async () => {
    try {
      const response = await emergencyAPI.getAmbulanceStatus();
      setAmbulances(response.data);
    } catch (error) {
      console.error('Error requesting ambulance:', error);
    }
  };

  const emergencyServices = [
    {
      title: t('Emergencyambulance'),
      description: t('AmbulanceDesc'),
      icon: <Truck className="h-8 w-8" />,
      color: 'from-red-500 to-orange-500',
      action: () => requestAmbulance()
    },
    {
      title: t('EmergencynearestHospital'),
      description: t('NearestHospitalDesc'),
      icon: <Bed className="h-8 w-8" />,
      color: 'from-blue-500 to-teal-500',
      action: () => fetchNearbyHospitals()
    },
    {
      title: t('EmergencyContact'),
      description: t('EmergencyContactDesc'),
      icon: <Phone className="h-8 w-8" />,
      color: 'from-green-500 to-emerald-500',
      action: () => {}
    },
    {
      title: t('EmergencyvideoConsult'),
      description: t('EmergencyvideoConsultDesc'),
      icon: <Video className="h-8 w-8" />,
      color: 'from-purple-500 to-pink-500',
      action: () => window.open('/consultation', '_blank')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Emergency Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('Emergency')}
              </h1>
             
            </div>
            <div className="flex items-center space-x-3">
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded-full flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                <span className="font-medium">{t('emergency.liveAlerts')}</span>
              </div>
            </div>
          </div>

          {/* SOS Banner */}
          <div className="mt-6 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between">
              <div className="mb-4 lg:mb-0 lg:mr-6">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-6 w-6 mr-3 animate-pulse" />
                  <h2 className="text-2xl font-bold">{t('EmergencyAlert')}</h2>
                </div>
                <p className="text-red-100">
                  {t('EmergencyDescription')}
                </p>
                <div className="mt-3 flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{location || t('FetchingLocation')}</span>
                </div>
              </div>
              <EmergencyButton 
                onSOS={handleSOS}
                disabled={isSendingSOS}
              />
            </div>
          </div>
        </div>

        {/* Emergency Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {emergencyServices.map((service, index) => (
            <button
              key={index}
              onClick={service.action}
              className={`bg-gradient-to-r ${service.color} text-white rounded-xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="flex items-center mb-4">
                {service.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{service.title}</h3>
              <p className="text-white/80 text-sm">{service.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{t('NearbyHospitals')}</h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{hospitals.length} {t('HospitalsFound')}</span>
                  </div>
                </div>
              </div>
              <div className="h-96">
                <MapContainer
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={13}
                  className="h-full w-full"
                  ref={mapRef}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* User Location */}
                  <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>
                      <div className="text-center">
                        <User className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                        <strong>{t('emergency.yourLocation')}</strong>
                        <p className="text-sm">{location}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Hospital Markers */}
                  {hospitals.map(hospital => (
                    <Marker 
                      key={hospital.id} 
                      position={[hospital.location.lat, hospital.location.lng]}
                      icon={L.icon({
                        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208720.png',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                        popupAnchor: [0, -32]
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-bold text-gray-900">{hospital.name}</h4>
                          <div className="space-y-1 text-sm mt-2">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-2 text-gray-400" />
                              <span>{hospital.distance} • {hospital.travelTime}</span>
                            </div>
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-2 text-gray-400" />
                              <span>{hospital.contact}</span>
                            </div>
                            <div className="flex items-center">
                              <Bed className="h-3 w-3 mr-2 text-gray-400" />
                              <span>{hospital.bedsAvailable} {t('BedsAvailable')}</span>
                            </div>
                            {hospital.emergencyAvailable && (
                              <div className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                <AlertTriangle className="h-2 w-2 mr-1" />
                                {t('EmergencyAvailable')}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedHospital(hospital)}
                            className="mt-3 w-full py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            {t('ViewDetails')}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Emergency Radius Circle */}
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={2000} // 2km radius
                    pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.1 }}
                  />
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Emergency Contacts & Info */}
          <div className="space-y-6">
            {/* Emergency Contacts */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="font-bold text-gray-900 mb-4">{t('EmergencyContacts')}</h3>
              <div className="space-y-3">
                {emergencyContacts.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{contact.name}</div>
                      <div className="text-sm text-gray-500">{t(`emergency.${contact.type}`)}</div>
                    </div>
                    <a
                      href={`tel:${contact.number}`}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {contact.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Guidelines */}
            <div className="bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl p-6">
              <h3 className="font-bold mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                {t('EmergencyGuidelines')}
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 mr-2"></div>
                  <span>{t('Guideline1')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 mr-2"></div>
                  <span>{t('Guideline2')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 mr-2"></div>
                  <span>{t('Guideline3')}</span>
                </li>
                <li className="flex items-start">
                  <div className="w-2 h-2 bg-white rounded-full mt-2 mr-2"></div>
                  <span>{t('Guideline4')}</span>
                </li>
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg border p-6">
              <h3 className="font-bold text-gray-900 mb-4">{t('QuickActions')}</h3>
              <div className="space-y-3">
                <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-blue-600 mr-3" />
                    <span>{t('ChatWithMedic')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <Share2 className="h-5 w-5 text-green-600 mr-3" />
                    <span>{t('ShareLocation')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
                <button className="w-full p-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center">
                    <Download className="h-5 w-5 text-purple-600 mr-3" />
                    <span>{t('DownloadReport')}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Nearby Hospitals List */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {t('NearbyHospitalsDetailed')}
            </h3>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>{t('RealTimeUpdates')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hospitals.map(hospital => (
              <div
                key={hospital.id}
                className="bg-white rounded-xl shadow border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{hospital.name}</h4>
                    <div className="flex items-center mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full mr-2 ${
                        hospital.type === 'government' ? 'bg-blue-100 text-blue-800' :
                        hospital.type === 'private' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {hospital.type === 'government' ? t('Government') : 
                         hospital.type === 'private' ? t('Private') : t('MultiSpecialty')}
                      </span>
                      {hospital.emergencyAvailable && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center">
                          <AlertTriangle className="h-2 w-2 mr-1" />
                          {t('Emergency')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{hospital.distance}</div>
                    <div className="text-sm text-gray-500">{hospital.travelTime}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center">
                    <Bed className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">{t('Emergencybeds')}</div>
                      <div className="font-medium">{hospital.bedsAvailable}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Heart className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">{t('ICU')}</div>
                      <div className="font-medium">{hospital.icuAvailable}</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">{t('Specialities')}</div>
                  <div className="flex flex-wrap gap-2">
                    {hospital.specialities?.slice(0, 3).map((spec, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <a
                    href={`tel:${hospital.contact}`}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700"
                  >
                    <Phone className="inline-block h-4 w-4 mr-2" />
                    {t('CallNow')}
                  </a>
                  <button
                    onClick={() => setSelectedHospital(hospital)}
                    className="flex-1 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    {t('Directions')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hospital Details Modal */}
        {selectedHospital && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedHospital.name}
                  </h3>
                  <button
                    onClick={() => setSelectedHospital(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">{t('distance')}</div>
                      <div className="text-xl font-bold">{selectedHospital.distance}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t('TravelTime')}</div>
                      <div className="text-xl font-bold">{selectedHospital.travelTime}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t('Emergencybeds')}</div>
                      <div className="text-xl font-bold">{selectedHospital.bedsAvailable}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">{t('ICU')}</div>
                      <div className="text-xl font-bold">{selectedHospital.icuAvailable}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{t('contact')}</h4>
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <Phone className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <div className="font-medium">{selectedHospital.contact}</div>
                        <div className="text-sm text-gray-600">{t('EmergencyDesk')}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">{t('Specialities')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedHospital.specialities?.map((spec, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <a
                      href={`tel:${selectedHospital.contact}`}
                      className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold text-center hover:bg-red-700"
                    >
                      🚨 {t('CallEmergency')}
                    </a>
                    <button className="flex-1 py-3 border border-blue-600 text-blue-600 rounded-lg font-bold hover:bg-blue-50">
                      <Navigation className="inline-block h-5 w-5 mr-2" />
                      {t('GetDirections')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SOS Confirmation */}
        {sosSent && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md text-center p-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {t('sosSent')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('sosConfirmation')}
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-green-100 text-green-800 rounded-lg">
                  <div className="font-medium">{t('AmbulanceDispatched')}</div>
                  <div className="text-sm">{t('emergency.eta')}: 8 {t('emergency.minutes')}</div>
                </div>
                <div className="p-3 bg-blue-100 text-blue-800 rounded-lg">
                  <div className="font-medium">{t('NearestHospitalAlerted')}</div>
                  <div className="text-sm">{t('Standby')}</div>
                </div>
              </div>
              <button
                onClick={() => setSosSent(false)}
                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
              >
                {t('Understood')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Emergency;