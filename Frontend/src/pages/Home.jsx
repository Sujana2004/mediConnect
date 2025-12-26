import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Stethoscope, 
  Video, 
  FileText, 
  Pill, 
  Heart, 
  Shield, 
  Users,
  MapPin,
  Clock,
  ChevronRight,
  PlayCircle,
  Star,
  Award,
  Truck
} from 'lucide-react';
import ChatbotWidget from '../components/chatbot/ChatbotWidget';

const Home = () => {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);

  const services = [
    {
      icon: <Video className="h-10 w-10 text-blue-600" />,
      title: t('home.videoConsultation'),
      description: t('home.videoConsultationDesc'),
      link: '/consultation',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      icon: <Stethoscope className="h-10 w-10 text-green-600" />,
      title: t('home.aiSymptomChecker'),
      description: t('home.aiSymptomCheckerDesc'),
      link: '/symptom-checker',
      color: 'bg-green-50 border-green-200',
    },
    {
      icon: <FileText className="h-10 w-10 text-purple-600" />,
      title: t('home.digitalHealthRecords'),
      description: t('home.digitalHealthRecordsDesc'),
      link: '/health-records',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      icon: <Pill className="h-10 w-10 text-red-600" />,
      title: t('home.medicineSearch'),
      description: t('home.medicineSearchDesc'),
      link: '/medicines',
      color: 'bg-red-50 border-red-200',
    },
    {
      icon: <Users className="h-10 w-10 text-orange-600" />,
      title: t('home.findDoctors'),
      description: t('home.findDoctorsDesc'),
      link: '/doctors',
      color: 'bg-orange-50 border-orange-200',
    },
    {
      icon: <Heart className="h-10 w-10 text-pink-600" />,
      title: t('home.emergencyServices'),
      description: t('home.emergencyServicesDesc'),
      link: '/emergency',
      color: 'bg-pink-50 border-pink-200',
    },
  ];

  const stats = [
    { value: '5000+', label: t('home.doctors'), icon: <Stethoscope className="h-6 w-6" /> },
    { value: '50K+', label: t('home.patients'), icon: <Users className="h-6 w-6" /> },
    { value: '100K+', label: t('home.consultations'), icon: <Video className="h-6 w-6" /> },
    { value: '24/7', label: t('home.support'), icon: <Clock className="h-6 w-6" /> },
  ];

  const features = [
    { icon: <Shield className="h-6 w-6" />, text: t('home.secureData') },
    { icon: <Award className="h-6 w-6" />, text: t('home.verifiedDoctors') },
    { icon: <Truck className="h-6 w-6" />, text: t('home.medicineDelivery') },
    { icon: <MapPin className="h-6 w-6" />, text: t('home.ruralCoverage') },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-teal-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-sm font-medium">🏆 {t('home.govtInitiative')}</span>
              </div>
              <h1 className="text-5xl font-bold leading-tight">
                {t('home.heroTitle')}
                <span className="block text-teal-300">{t('home.heroSubtitle')}</span>
              </h1>
              <p className="text-xl text-blue-100">
                {t('home.heroDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
                >
                  {t('home.getStarted')}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-all"
                >
                  {t('home.existingUser')}
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowVideo(true)}
                  className="inline-flex items-center text-white hover:text-teal-200"
                >
                  <PlayCircle className="h-6 w-6 mr-2" />
                  {t('home.watchDemo')}
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white/20 rounded-xl p-6 text-center">
                      <div className="flex justify-center mb-2">{stat.icon}</div>
                      <div className="text-3xl font-bold">{stat.value}</div>
                      <div className="text-sm opacity-90">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        {feature.icon}
                      </div>
                      <span>{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
      </div>

      {/* Services Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('home.ourServices')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('home.servicesDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Link
              key={index}
              to={service.link}
              className={`${service.color} border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="mb-4">{service.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {service.title}
              </h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <div className="flex items-center text-blue-600 font-medium">
                {t('home.getStarted')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Emergency Banner */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-3">
                <Heart className="h-8 w-8" />
                <div>
                  <h3 className="text-2xl font-bold">{t('home.emergencyTitle')}</h3>
                  <p className="text-red-100">{t('home.emergencySubtitle')}</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/emergency"
                className="bg-white text-red-600 px-8 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors shadow-lg"
              >
                🚨 {t('home.sosButton')}
              </Link>
              <Link
                to="/doctors"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
              >
                👨‍⚕️ {t('home.findDoctorNow')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('home.testimonials')}
            </h2>
            <p className="text-gray-600">
              {t('home.testimonialsDescription')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-lg border">
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{t(`home.testimonial${i}`)}"
                </p>
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">{t(`home.user${i}`)}</p>
                    <p className="text-sm text-gray-500">{t(`home.location${i}`)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-500 to-teal-500 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t('home.readyToStart')}
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            {t('home.joinMillions')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-lg"
            >
              {t('home.createFreeAccount')}
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              {t('home.loginExisting')}
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200">
            {t('home.freeForever')}
          </p>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl relative">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white text-2xl"
            >
              ✕
            </button>
            <div className="aspect-video bg-gray-900 rounded-t-xl flex items-center justify-center">
              <div className="text-center text-white">
                <PlayCircle className="h-20 w-20 mx-auto mb-4" />
                <p>{t('home.demoVideo')}</p>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-2">{t('home.howItWorks')}</h3>
              <p className="text-gray-600">{t('home.videoDescription')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
};

export default Home;