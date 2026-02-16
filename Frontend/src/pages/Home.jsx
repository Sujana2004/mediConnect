import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Truck,
  X,
  Globe,
  Volume2,
  VolumeX,
  MessageSquare,
  Phone,
  ArrowRight,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Language options
const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' }
];

const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [showVideo, setShowVideo] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle language change
  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
    // Store preference
    localStorage.setItem('mediconnect_language', langCode);
  };

  // Text to speech for hero section
  const handleSpeakHero = () => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = t('home.heroTitle') + '. ' + t('home.heroDescription');
    const utterance = new SpeechSynthesisUtterance(text);
    
    const langMap = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };
    utterance.lang = langMap[i18n.language] || 'en-IN';
    utterance.rate = 0.9;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Services data
  const services = [
    {
      icon: Video,
      title: t('home.videoConsultation', 'Video Consultation'),
      description: t('home.videoConsultationDesc', 'Connect with doctors instantly via secure video calls'),
      link: isAuthenticated ? '/doctors' : '/login?redirect=/doctors',
      color: 'blue',
      badge: t('home.popular', 'Popular')
    },
    {
      icon: Stethoscope,
      title: t('home.aiSymptomChecker', 'AI Symptom Checker'),
      description: t('home.aiSymptomCheckerDesc', 'Get preliminary health insights using AI'),
      link: '/symptom-checker',
      color: 'green',
      badge: t('home.free', 'Free')
    },
    {
      icon: FileText,
      title: t('home.digitalHealthRecords', 'Health Records'),
      description: t('home.digitalHealthRecordsDesc', 'Store and manage your medical records securely'),
      link: isAuthenticated ? '/health-records' : '/login?redirect=/health-records',
      color: 'purple'
    },
    {
      icon: Pill,
      title: t('home.medicineSearch', 'Medicine Search'),
      description: t('home.medicineSearchDesc', 'Search medicines, check alternatives and interactions'),
      link: '/medicines',
      color: 'red'
    },
    {
      icon: Users,
      title: t('home.findDoctors', 'Find Doctors'),
      description: t('home.findDoctorsDesc', 'Browse verified doctors by specialization'),
      link: '/doctors',
      color: 'orange'
    },
    {
      icon: Heart,
      title: t('home.emergencyServices', 'Emergency SOS'),
      description: t('home.emergencyServicesDesc', 'Quick access to emergency services and contacts'),
      link: '/emergency',
      color: 'pink',
      badge: t('home.emergency', '24/7')
    }
  ];

  // Stats data
  const stats = [
    { value: '5,000+', label: t('home.doctors', 'Doctors'), icon: Stethoscope },
    { value: '50,000+', label: t('home.patients', 'Patients'), icon: Users },
    { value: '1,00,000+', label: t('home.consultations', 'Consultations'), icon: Video },
    { value: '24/7', label: t('home.support', 'Support'), icon: Clock }
  ];

  // Features data
  const features = [
    { icon: Shield, text: t('home.secureData', 'End-to-end encrypted data') },
    { icon: Award, text: t('home.verifiedDoctors', 'Verified & certified doctors') },
    { icon: Truck, text: t('home.medicineDelivery', 'Medicine home delivery') },
    { icon: MapPin, text: t('home.ruralCoverage', 'Available in rural areas') }
  ];

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      text: t('home.testimonial1', 'MediConnect helped me consult a cardiologist from my village. No need to travel to the city anymore!'),
      author: t('home.user1', 'Ramesh Kumar'),
      location: t('home.location1', 'Warangal, Telangana'),
      rating: 5
    },
    {
      id: 2,
      text: t('home.testimonial2', 'The Telugu language support made it so easy for my parents to use. Best healthcare app!'),
      author: t('home.user2', 'Priya Reddy'),
      location: t('home.location2', 'Vijayawada, AP'),
      rating: 5
    },
    {
      id: 3,
      text: t('home.testimonial3', 'Emergency SOS feature saved my father\'s life. Ambulance reached within 15 minutes.'),
      author: t('home.user3', 'Amit Sharma'),
      location: t('home.location3', 'Hyderabad, Telangana'),
      rating: 5
    }
  ];

  // Get color classes
  const getColorClasses = (color) => {
    const colors = {
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-600' },
      green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', badge: 'bg-green-600' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-600' },
      red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-600' },
      orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-600' },
      pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600', badge: 'bg-pink-600' }
    };
    return colors[color] || colors.blue;
  };

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  return (
    <div className="relative min-h-screen">
      {/* Floating Language Selector */}
      <div className="fixed top-4 right-4 z-40">
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg hover:bg-white transition-colors"
            aria-label={t('common.selectLanguage', 'Select language')}
          >
            <Globe className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">{currentLanguage.nativeLabel}</span>
          </button>

          {showLanguageMenu && (
            <>
              <div 
                className="fixed inset-0" 
                onClick={() => setShowLanguageMenu(false)}
              />
              <div className="absolute right-0 mt-2 py-1 w-40 bg-white border rounded-lg shadow-xl z-10">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                      i18n.language === lang.code ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span>{lang.nativeLabel}</span>
                    {i18n.language === lang.code && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t('home.govtInitiative', 'Digital India Healthcare Initiative')}
                </span>
              </div>

              {/* Title */}
              <div className="relative">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  {t('home.heroTitle', 'Quality Healthcare')}
                  <span className="block text-blue-200 mt-2">
                    {t('home.heroSubtitle', 'At Your Fingertips')}
                  </span>
                </h1>
                
                {/* Voice Output Button */}
                <button
                  onClick={handleSpeakHero}
                  className={`absolute -right-2 top-0 lg:right-auto lg:-left-12 p-2 rounded-full transition-colors ${
                    isSpeaking ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                  aria-label={isSpeaking ? t('common.stopSpeaking', 'Stop speaking') : t('common.listen', 'Listen')}
                  title={t('home.listenToThis', 'Listen to this')}
                >
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
              </div>

              {/* Description */}
              <p className="text-lg sm:text-xl text-blue-100 max-w-xl mx-auto lg:mx-0">
                {t('home.heroDescription', 'Connect with verified doctors, manage health records, and access emergency services - all in your preferred language.')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {isAuthenticated ? (
                  <Link
                    to={user?.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'}
                    className="inline-flex items-center justify-center px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
                  >
                    {t('home.goToDashboard', 'Go to Dashboard')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-white text-blue-700 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
                    >
                      {t('home.getStarted', 'Get Started Free')}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center px-6 sm:px-8 py-3 text-base sm:text-lg font-semibold bg-transparent border-2 border-white text-white rounded-xl hover:bg-white/10 transition-all"
                    >
                      {t('home.existingUser', 'Login')}
                    </Link>
                  </>
                )}
              </div>

              {/* Watch Demo */}
              <button
                onClick={() => setShowVideo(true)}
                className="inline-flex items-center text-white/90 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors">
                  <PlayCircle className="h-5 w-5" />
                </div>
                {t('home.watchDemo', 'Watch how it works')}
              </button>
            </div>

            {/* Stats Card */}
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  {stats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <div key={index} className="bg-white/20 rounded-xl p-4 sm:p-6 text-center">
                        <div className="flex justify-center mb-2">
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold">{stat.value}</div>
                        <div className="text-sm opacity-90">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Features List */}
                <div className="space-y-3 sm:space-y-4">
                  {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span className="text-sm sm:text-base">{feature.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 100L60 95C120 90 240 80 360 75C480 70 600 70 720 75C840 80 960 90 1080 92.5C1200 95 1320 90 1380 87.5L1440 85V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16" id="services">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            {t('home.ourServices', 'Our Services')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('home.servicesDescription', 'Comprehensive healthcare services designed for everyone')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {services.map((service, index) => {
            const colors = getColorClasses(service.color);
            const IconComponent = service.icon;
            
            return (
              <Link
                key={index}
                to={service.link}
                className={`${colors.bg} ${colors.border} border rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden`}
              >
                {/* Badge */}
                {service.badge && (
                  <span className={`absolute top-3 right-3 ${colors.badge} text-white text-xs font-medium px-2 py-0.5 rounded-full`}>
                    {service.badge}
                  </span>
                )}
                
                <div className={`w-12 h-12 sm:w-14 sm:h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className={`h-6 w-6 sm:h-7 sm:w-7 ${colors.icon}`} />
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  {service.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4">
                  {service.description}
                </p>
                
                <div className={`flex items-center ${colors.icon} font-medium text-sm sm:text-base`}>
                  {t('home.learnMore', 'Learn more')}
                  <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Emergency Banner */}
      <section className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center lg:text-left">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Heart className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold">
                  {t('home.emergencyTitle', 'Medical Emergency?')}
                </h3>
                <p className="text-red-100 text-sm sm:text-base">
                  {t('home.emergencySubtitle', 'Get immediate help with one tap')}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full lg:w-auto">
              <Link
                to="/emergency"
                className="flex items-center justify-center gap-2 bg-white text-red-600 px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg"
              >
                <Phone className="h-5 w-5" />
                {t('home.sosButton', 'Emergency SOS')}
              </Link>
              <Link
                to="/doctors"
                className="flex items-center justify-center gap-2 border-2 border-white text-white px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
              >
                <Stethoscope className="h-5 w-5" />
                {t('home.findDoctorNow', 'Find Doctor Now')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              {t('home.testimonials', 'What Our Users Say')}
            </h2>
            <p className="text-gray-600">
              {t('home.testimonialsDescription', 'Trusted by thousands across India')}
            </p>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-white p-6 rounded-xl shadow-lg border">
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`h-5 w-5 ${star <= testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                    />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Carousel */}
          <div className="md:hidden">
            <div className="bg-white p-6 rounded-xl shadow-lg border">
              <div className="flex items-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-5 w-5 ${star <= testimonials[activeTestimonial].rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
              <p className="text-gray-600 mb-4 italic min-h-[80px]">
                "{testimonials[activeTestimonial].text}"
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">{testimonials[activeTestimonial].author}</p>
                  <p className="text-sm text-gray-500">{testimonials[activeTestimonial].location}</p>
                </div>
              </div>
            </div>
            
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === activeTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-teal-600 text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            {t('home.readyToStart', 'Ready to Take Control of Your Health?')}
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-blue-100">
            {t('home.joinMillions', 'Join thousands of Indians who trust MediConnect')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                to={user?.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'}
                className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg inline-flex items-center justify-center gap-2"
              >
                {t('home.goToDashboard', 'Go to Dashboard')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
                >
                  {t('home.createFreeAccount', 'Create Free Account')}
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  {t('home.loginExisting', 'Login to Account')}
                </Link>
              </>
            )}
          </div>
          
          <p className="mt-6 text-sm text-blue-200">
            {t('home.freeForever', '✓ Free for patients ✓ No hidden charges ✓ Cancel anytime')}
          </p>
        </div>
      </section>

      {/* AI Chatbot CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl sm:rounded-3xl p-6 sm:p-10 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold mb-1">
                  {t('home.aiAssistant', 'AI Health Assistant')}
                </h3>
                <p className="text-purple-200 text-sm sm:text-base">
                  {t('home.aiAssistantDesc', 'Get instant health guidance in your language')}
                </p>
              </div>
            </div>
            <Link
              to="/chatbot"
              className="w-full md:w-auto bg-white text-purple-600 px-6 sm:px-8 py-3 rounded-xl font-bold hover:bg-purple-50 transition-colors shadow-lg inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              {t('home.tryNow', 'Try Now')}
            </Link>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div 
            className="bg-white rounded-xl sm:rounded-2xl w-full max-w-4xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-5 w-5" />
            </button>

            {/* Video placeholder */}
            <div className="aspect-video bg-gray-900 flex items-center justify-center">
              {/* Replace with actual video embed */}
              <div className="text-center text-white p-8">
                <PlayCircle className="h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-4 opacity-50" />
                <p className="text-lg sm:text-xl mb-2">{t('home.demoVideo', 'Demo Video')}</p>
                <p className="text-gray-400 text-sm">
                  {t('home.videoComingSoon', 'Video demonstration coming soon')}
                </p>
              </div>
            </div>

            {/* Video info */}
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                {t('home.howItWorks', 'How MediConnect Works')}
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                {t('home.videoDescription', 'Learn how to book appointments, consult doctors, and manage your health records.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chatbot Button */}
      <Link
        to="/chatbot"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow group"
        aria-label={t('home.openChatbot', 'Open AI Health Assistant')}
      >
        <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 group-hover:scale-110 transition-transform" />
        
        {/* Pulse animation */}
        <span className="absolute w-full h-full rounded-full bg-blue-600 animate-ping opacity-20"></span>
      </Link>
    </div>
  );
};

export default Home;