// pages/patient/PatientMoreTab/constants.js

import {
  Heart,
  AlertTriangle,
  Droplet,
  Activity,
  Stethoscope,
  User,
  Calendar,
  FileText,
  Users,
} from 'lucide-react';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const GENDERS = ['Female', 'Male', 'Other'];
export const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Doctor', 'Neighbor', 'Other'];
export const FAMILY_RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Other'];

export const TEXT_SIZES = [
  { id: 'small', label: 'Small', preview: 14 },
  { id: 'medium', label: 'Medium', preview: 16 },
  { id: 'large', label: 'Large', preview: 18 },
  { id: 'extra-large', label: 'Extra Large', preview: 20 },
];

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'es', name: 'Spanish', native: 'Español' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
];

export const HELPLINES = [
  { name: 'Emergency Services', number: '911', desc: 'Police, Fire, Ambulance' },
  { name: 'Poison Control', number: '1-800-222-1222', desc: '24/7 Poison Help' },
  { name: 'Suicide Prevention', number: '988', desc: 'Mental Health Crisis' },
  { name: 'Domestic Violence', number: '1-800-799-7233', desc: 'National Hotline' },
  { name: 'Child Abuse Hotline', number: '1-800-422-4453', desc: 'Childhelp National' },
  { name: 'SAMHSA Helpline', number: '1-800-662-4357', desc: 'Substance Abuse' },
];

export const FIRST_AID_GUIDES = [
  {
    id: 1,
    title: 'CPR (Cardiopulmonary Resuscitation)',
    icon: Heart,
    description: 'Life-saving technique for cardiac arrest',
    steps: [
      'Check for responsiveness - tap and shout',
      'Call 911 or ask someone to call',
      'Place heel of hand on center of chest',
      'Push hard and fast (100-120 compressions/min)',
      'Allow chest to fully recoil between compressions',
      'Continue until help arrives',
    ],
    tips: ['Push at least 2 inches deep', 'Use AED if available', 'Hands-only CPR is effective for adults'],
  },
  {
    id: 2,
    title: 'Choking - Heimlich Maneuver',
    icon: AlertTriangle,
    description: 'For clearing blocked airways',
    steps: [
      'Stand behind the person',
      'Make a fist with one hand',
      'Place it above the navel',
      'Grasp fist with other hand',
      'Give quick upward thrusts',
      'Repeat until object is expelled',
    ],
    tips: ['For infants, use back blows', 'If alone, use a chair for self-Heimlich'],
  },
  {
    id: 3,
    title: 'Severe Bleeding Control',
    icon: Droplet,
    description: 'Stop life-threatening bleeding',
    steps: [
      'Apply direct pressure with clean cloth',
      'Elevate the injured area if possible',
      'Apply firm, continuous pressure',
      'Add more cloths if bleeding through',
      'Call emergency services',
      'Keep victim calm and warm',
    ],
    tips: ['Do not remove embedded objects', 'Use tourniquet only as last resort'],
  },
  {
    id: 4,
    title: 'Heart Attack Recognition',
    icon: Activity,
    description: 'Recognize and respond to heart attacks',
    steps: [
      'Call 911 immediately',
      'Have person sit or lie down',
      'Loosen any tight clothing',
      'Give aspirin if not allergic',
      'Be ready to perform CPR',
      'Stay with the person until help arrives',
    ],
    tips: ['Symptoms may differ in women', 'Time is critical - act fast'],
  },
  {
    id: 5,
    title: 'Stroke - FAST Method',
    icon: Stethoscope,
    description: 'Identify stroke symptoms quickly',
    steps: [
      'F - Face drooping on one side?',
      'A - Arm weakness or numbness?',
      'S - Speech difficulty or slurred?',
      'T - Time to call 911!',
      'Note the time symptoms started',
      'Keep person comfortable until help arrives',
    ],
    tips: ['Every minute counts', 'Do not give food or drink'],
  },
  {
    id: 6,
    title: 'Burns Treatment',
    icon: AlertTriangle,
    description: 'Proper care for burn injuries',
    steps: [
      'Remove from heat source',
      'Cool burn under running water (10-20 min)',
      'Remove jewelry near the burn',
      'Cover with sterile bandage',
      'Do not apply ice directly',
      'Seek medical help for severe burns',
    ],
    tips: ['Do not pop blisters', 'Do not use butter or toothpaste'],
  },
];

export const USER_GUIDES = [
  {
    title: 'Getting Started',
    icon: User,
    content:
      'Learn how to set up your profile, add your health information, and navigate the app. Start by completing your profile with accurate medical information for better healthcare recommendations.',
  },
  {
    title: 'Booking Appointments',
    icon: Calendar,
    content:
      'Find doctors by specialty, location, or name. View available time slots, read doctor profiles and reviews, then book your appointment with just a few taps.',
  },
  {
    title: 'Managing Medications',
    icon: Activity,
    content:
      "Add your prescriptions, set up medication reminders, and track your adherence. Get notified when it's time to take your medicines.",
  },
  {
    title: 'Health Records',
    icon: FileText,
    content:
      'Access all your medical records in one place. Upload documents, view lab results, download reports, and securely share them with your healthcare providers.',
  },
  {
    title: 'Emergency Features',
    icon: AlertTriangle,
    content:
      'Set up emergency contacts, configure SOS settings, and access first aid guides. In an emergency, trigger SOS to alert contacts and share your location.',
  },
  {
    title: 'Family Profiles',
    icon: Users,
    content:
      "Add family members to manage their healthcare too. Switch between profiles easily, book appointments for them, and keep track of everyone's health.",
  },
];

export const FAQS = [
  {
    q: 'How do I book an appointment?',
    a: "Go to the Appointments tab, select a specialty or search for a doctor, choose an available time slot, and confirm your booking. You'll receive a confirmation notification.",
  },
  {
    q: 'Can I cancel or reschedule appointments?',
    a: 'Yes, you can cancel or reschedule appointments up to 2 hours before the scheduled time without any charges.',
  },
  {
    q: 'How do I add family members?',
    a: 'Go to Settings > Family Members > Add Family Member. Fill in their details including name, relationship, age, and blood group.',
  },
  {
    q: 'Is my health data secure?',
    a: 'Yes, we use end-to-end encryption and comply with HIPAA regulations to protect your health information.',
  },
  {
    q: 'How do I contact my doctor?',
    a: 'You can message your doctor through the chat feature available in your appointment history, or schedule a video consultation.',
  },
  {
    q: 'What if I have a medical emergency?',
    a: 'Use the SOS button for immediate help. It will alert your emergency contacts, share your location, and can notify nearby emergency services.',
  },
  {
    q: 'How do I get medication reminders?',
    a: "Add your medications in the Medications section with dosage and schedule. Enable notifications and you'll receive timely reminders.",
  },
  {
    q: 'Can I access my records offline?',
    a: 'Yes, enable Offline Mode in Settings. Your downloaded records, saved appointments, and emergency contacts will be available without internet.',
  },
];

export const FEEDBACK_TAGS = ['Appointments', 'Navigation', 'Speed', 'Features', 'Design', 'Support', 'Doctors', 'Payments'];

export const SYNC_FREQUENCY_OPTIONS = [
  { value: '15min', label: 'Every 15 minutes' },
  { value: '30min', label: 'Every 30 minutes' },
  { value: '1hour', label: 'Every hour' },
  { value: '6hours', label: 'Every 6 hours' },
];

export const VOICE_COMMANDS = [
  { command: '"Book appointment"', action: 'Start booking process' },
  { command: '"My medications"', action: 'View your medicines' },
  { command: '"Call doctor"', action: 'Contact your doctor' },
  { command: '"Emergency"', action: 'Trigger SOS alert' },
  { command: '"Read notifications"', action: 'Hear your alerts' },
  { command: '"Check appointments"', action: 'View upcoming visits' },
];

export const CACHE_OPTIONS = [
  { key: 'images', name: 'Images & Media', size: '65 MB' },
  { key: 'documents', name: 'Offline Documents', size: '35 MB' },
  { key: 'searchHistory', name: 'Search History', size: '15 MB' },
  { key: 'tempFiles', name: 'Temporary Files', size: '10 MB' },
];

export const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    content:
      'We collect information you provide directly to us, including personal information such as your name, email address, phone number, date of birth, and health-related information.',
  },
  {
    title: '2. How We Use Your Information',
    content:
      'We use the information we collect to provide, maintain, and improve our services, to process appointments, communicate with you about your health care, and send reminders.',
  },
  {
    title: '3. Information Sharing',
    content:
      'We do not sell your personal information. We may share your information with healthcare providers with your consent, or as required by law.',
  },
  {
    title: '4. Data Security',
    content:
      'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.',
  },
  {
    title: '5. Your Rights',
    content:
      'You have the right to access, correct, or delete your personal information. You may also request a copy of your data or restrict certain processing activities.',
  },
  {
    title: '6. Data Retention',
    content:
      'We retain your personal information for as long as necessary to provide our services and comply with legal obligations.',
  },
];

export const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing and using MediConnect, you agree to be bound by these Terms of Service and all applicable laws and regulations.',
  },
  {
    title: '2. Use of Services',
    content:
      'MediConnect provides a platform for connecting patients with healthcare providers. Our services are not a substitute for professional medical advice.',
  },
  {
    title: '3. User Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
  },
  {
    title: '4. Medical Disclaimer',
    content:
      'The content provided through MediConnect is for informational purposes only. Always seek the advice of your physician.',
  },
  {
    title: '5. Limitation of Liability',
    content:
      'MediConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages.',
  },
  {
    title: '6. Changes to Terms',
    content:
      'We reserve the right to modify these terms at any time. Continued use after changes constitutes acceptance.',
  },
];

export const DEFAULT_SETTINGS = {
  notifications: {
    appointments: true,
    medications: true,
    healthTips: false,
    labResults: true,
    emergencyAlerts: true,
    promotions: false,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
  language: 'English',
  voiceAssistant: true,
  textSize: 'medium',
  highContrast: false,
  offlineMode: false,
  autoSync: true,
  biometric: true,
  syncFrequency: '15min',
  wifiOnly: true,
  mobileData: false,
  cache: {
    size: '125 MB',
    lastCleared: '2024-01-15',
  },
  dataUsage: {
    total: '245 MB',
    limit: '1 GB',
    percentage: 24.5,
    breakdown: [
      { name: 'Appointments & Scheduling', usage: 85 },
      { name: 'Medical Records', usage: 78 },
      { name: 'Video Consultations', usage: 52 },
      { name: 'Chat & Messages', usage: 30 },
    ],
  },
};

export const DEFAULT_PROFILE = {
  id: 'MED-2024-1234',
  name: 'Sarah Johnson',
  gender: 'Female',
  age: 55,
  bloodGroup: 'O+',
  phone: '+1 (555) 123-4567',
  email: 'sarah.johnson@email.com',
  address: '123 Health Street, Medical City, MC 12345',
  dateOfBirth: '1969-03-15',
  height: '165',
  weight: '68',
  allergies: ['Penicillin', 'Peanuts'],
  conditions: ['Hypertension', 'Type 2 Diabetes'],
  emergencyContact: 'John Johnson - +1 (555) 987-6543',
};

export const DEFAULT_EMERGENCY_CONTACTS = [
  { id: 1, name: 'John Johnson', relation: 'Husband', phone: '+1 (555) 987-6543', primary: true },
  { id: 2, name: 'Emily Johnson', relation: 'Daughter', phone: '+1 (555) 456-7890', primary: false },
  { id: 3, name: 'Dr. Smith', relation: 'Primary Doctor', phone: '+1 (555) 111-2222', primary: false },
];

export const DEFAULT_FAMILY_MEMBERS = [
  { id: 1, name: 'Sarah', relation: 'Self', age: 55, gender: 'Female', bloodGroup: 'O+', active: true, avatar: '👩' },
  { id: 2, name: 'John', relation: 'Husband', age: 58, gender: 'Male', bloodGroup: 'A+', active: false, avatar: '👨' },
  { id: 3, name: 'Emily', relation: 'Daughter', age: 28, gender: 'Female', bloodGroup: 'O+', active: false, avatar: '👧' },
];

export const DEFAULT_SOS_SETTINGS = {
  callPrimary: true,
  sendSms: true,
  shareLocation: true,
  alertHospitals: false,
  soundAlarm: true,
  powerButton: true,
  shakePhone: true,
  voiceCommand: true,
};