import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Heart, 
  Phone, 
  Mail, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram,
  Youtube,
  Stethoscope
} from 'lucide-react';

const Footer = () => {
  const { t } = useTranslation();

  const quickLinks = [
    { path: '/symptom-checker', label: t('footer.symptomChecker') },
    { path: '/doctors', label: t('footer.findDoctor') },
    { path: '/medicines', label: t('footer.medicineSearch') },
    { path: '/emergency', label: t('footer.emergency') },
    { path: '/health-records', label: t('footer.healthRecords') },
  ];

  const services = [
    { path: '/consultation', label: t('footer.videoConsultation') },
    { path: '/chatbot', label: t('footer.aiChatbot') },
    { path: '/health-records', label: t('footer.digitalRecords') },
    { path: '/medicines', label: t('footer.medicineDelivery') },
    { path: '/emergency', label: t('footer.emergencyServices') },
  ];

  const contactInfo = [
    { icon: <Phone className="h-4 w-4" />, text: '104 - Health Helpline' },
    { icon: <Phone className="h-4 w-4" />, text: '108 - Emergency Ambulance' },
    { icon: <Mail className="h-4 w-4" />, text: 'support@mediconnect.gov.in' },
    { icon: <MapPin className="h-4 w-4" />, text: t('footer.address') },
  ];

  const socialLinks = [
    { icon: <Facebook className="h-5 w-5" />, url: '#' },
    { icon: <Twitter className="h-5 w-5" />, url: '#' },
    { icon: <Instagram className="h-5 w-5" />, url: '#' },
    { icon: <Youtube className="h-5 w-5" />, url: '#' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="bg-white p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">MediConnect</h2>
                <p className="text-sm text-gray-300">
                  {t('footer.tagline')}
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              {t('footer.description')}
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  className="bg-gray-800 p-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-300 hover:text-white hover:underline text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.services')}</h3>
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.path}>
                  <Link
                    to={service.path}
                    className="text-gray-300 hover:text-white hover:underline text-sm"
                  >
                    {service.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.contactUs')}</h3>
            <ul className="space-y-3">
              {contactInfo.map((info, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="text-blue-400 mt-0.5">{info.icon}</div>
                  <span className="text-gray-300 text-sm">{info.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 bg-blue-900/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-400" />
                <span className="text-sm font-medium">
                  {t('footer.emergencyHelp')}
                </span>
              </div>
              <a
                href="/emergency"
                className="mt-2 inline-block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                {t('footer.sosButton')}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} MediConnect - {t('footer.governmentInitiative')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-gray-400 hover:text-white text-sm">
                {t('footer.privacyPolicy')}
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white text-sm">
                {t('footer.terms')}
              </Link>
              <Link to="/disclaimer" className="text-gray-400 hover:text-white text-sm">
                {t('footer.disclaimer')}
              </Link>
            </div>
          </div>
          <div className="mt-4 text-center text-gray-500 text-xs">
            <p>{t('footer.importantNote')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;