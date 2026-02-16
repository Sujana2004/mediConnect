/**
 * Voice Commands Service
 * Handles voice-based navigation and actions
 * Supports English, Hindi, and Telugu commands
 */

import { getRecognitionController } from './speechRecognition';
import { speak } from './textToSpeech';

/**
 * Command patterns for different languages
 * @readonly
 */
const COMMAND_PATTERNS = Object.freeze({
  en: Object.freeze({
    // Navigation commands
    navigation: Object.freeze({
      home: Object.freeze(['go to home', 'open home', 'home page', 'take me home']),
      doctors: Object.freeze(['find doctor', 'find doctors', 'show doctors', 'go to doctors', 'search doctor']),
      appointments: Object.freeze(['my appointments', 'show appointments', 'go to appointments', 'view appointments']),
      medicines: Object.freeze(['my medicines', 'show medicines', 'go to medicines', 'medicine reminders']),
      health_records: Object.freeze(['health records', 'my records', 'medical records', 'go to records']),
      symptom_checker: Object.freeze(['check symptoms', 'symptom checker', 'i feel sick', "i'm not well", 'diagnose']),
      chatbot: Object.freeze(['open chat', 'talk to assistant', 'health assistant', 'chat bot']),
      emergency: Object.freeze(['emergency', 'sos', 'help me', 'urgent help']),
      profile: Object.freeze(['my profile', 'open profile', 'settings', 'account']),
      notifications: Object.freeze(['notifications', 'show notifications', 'my alerts']),
    }),
    // Action commands
    actions: Object.freeze({
      book_appointment: Object.freeze(['book appointment', 'schedule appointment', 'new appointment']),
      call_doctor: Object.freeze(['call doctor', 'video call', 'start consultation']),
      take_medicine: Object.freeze(['took medicine', 'medicine taken', 'mark as taken']),
      skip_medicine: Object.freeze(['skip medicine', 'skip dose', "didn't take"]),
      go_back: Object.freeze(['go back', 'back', 'previous page', 'return']),
      scroll_up: Object.freeze(['scroll up', 'go up', 'move up']),
      scroll_down: Object.freeze(['scroll down', 'go down', 'move down']),
      refresh: Object.freeze(['refresh', 'reload', 'update page']),
      read_aloud: Object.freeze(['read aloud', 'read this', 'speak this', 'read page']),
      stop_reading: Object.freeze(['stop reading', 'stop speaking', 'quiet', 'silence']),
    }),
    // Confirmations
    confirmations: Object.freeze({
      yes: Object.freeze(['yes', 'yeah', 'yep', 'confirm', 'ok', 'okay', 'sure', 'correct']),
      no: Object.freeze(['no', 'nope', 'cancel', 'stop', 'wrong', 'incorrect']),
    }),
  }),
  hi: Object.freeze({
    navigation: Object.freeze({
      home: Object.freeze(['होम पर जाएं', 'होम खोलें', 'मुख्य पृष्ठ', 'घर']),
      doctors: Object.freeze(['डॉक्टर खोजें', 'डॉक्टर दिखाएं', 'डॉक्टर पर जाएं']),
      appointments: Object.freeze(['मेरी अपॉइंटमेंट', 'अपॉइंटमेंट दिखाएं', 'मुलाकात']),
      medicines: Object.freeze(['मेरी दवाइयां', 'दवाई दिखाएं', 'दवाई रिमाइंडर']),
      health_records: Object.freeze(['स्वास्थ्य रिकॉर्ड', 'मेरे रिकॉर्ड', 'मेडिकल रिकॉर्ड']),
      symptom_checker: Object.freeze(['लक्षण जांचें', 'तबीयत खराब है', 'बीमार हूं']),
      chatbot: Object.freeze(['चैट खोलें', 'सहायक से बात करें', 'मदद चाहिए']),
      emergency: Object.freeze(['आपातकाल', 'इमरजेंसी', 'मदद करो', 'जल्दी मदद']),
      profile: Object.freeze(['मेरी प्रोफाइल', 'सेटिंग्स', 'खाता']),
      notifications: Object.freeze(['सूचनाएं', 'अलर्ट दिखाएं']),
    }),
    actions: Object.freeze({
      book_appointment: Object.freeze(['अपॉइंटमेंट बुक करें', 'मुलाकात तय करें']),
      call_doctor: Object.freeze(['डॉक्टर को कॉल करें', 'वीडियो कॉल']),
      take_medicine: Object.freeze(['दवाई ली', 'दवाई खाई']),
      skip_medicine: Object.freeze(['दवाई छोड़ें', 'दवाई नहीं ली']),
      go_back: Object.freeze(['वापस जाएं', 'पीछे जाएं']),
      scroll_up: Object.freeze(['ऊपर स्क्रॉल करें', 'ऊपर जाएं']),
      scroll_down: Object.freeze(['नीचे स्क्रॉल करें', 'नीचे जाएं']),
      refresh: Object.freeze(['रिफ्रेश करें', 'अपडेट करें']),
      read_aloud: Object.freeze(['पढ़कर सुनाएं', 'यह पढ़ें', 'बोलें']),
      stop_reading: Object.freeze(['पढ़ना बंद करें', 'चुप रहें']),
    }),
    confirmations: Object.freeze({
      yes: Object.freeze(['हां', 'जी', 'ठीक है', 'सही', 'हा']),
      no: Object.freeze(['नहीं', 'ना', 'रद्द करें', 'गलत']),
    }),
  }),
  te: Object.freeze({
    navigation: Object.freeze({
      home: Object.freeze(['హోమ్‌కి వెళ్ళండి', 'హోమ్ తెరవండి', 'ముఖ్య పేజీ']),
      doctors: Object.freeze(['డాక్టర్ వెతకండి', 'డాక్టర్లు చూపించండి']),
      appointments: Object.freeze(['నా అపాయింట్‌మెంట్లు', 'అపాయింట్‌మెంట్లు చూపించండి']),
      medicines: Object.freeze(['నా మందులు', 'మందులు చూపించండి']),
      health_records: Object.freeze(['ఆరోగ్య రికార్డులు', 'నా రికార్డులు']),
      symptom_checker: Object.freeze(['లక్షణాలు తనిఖీ', 'నాకు అస్వస్థత']),
      chatbot: Object.freeze(['చాట్ తెరవండి', 'సహాయం కావాలి']),
      emergency: Object.freeze(['అత్యవసర', 'ఎమర్జెన్సీ', 'సహాయం']),
      profile: Object.freeze(['నా ప్రొఫైల్', 'సెట్టింగ్‌లు']),
      notifications: Object.freeze(['నోటిఫికేషన్లు', 'అలర్ట్‌లు']),
    }),
    actions: Object.freeze({
      book_appointment: Object.freeze(['అపాయింట్‌మెంట్ బుక్ చేయండి']),
      call_doctor: Object.freeze(['డాక్టర్‌ను కాల్ చేయండి', 'వీడియో కాల్']),
      take_medicine: Object.freeze(['మందు తీసుకున్నాను']),
      skip_medicine: Object.freeze(['మందు వదిలేయండి']),
      go_back: Object.freeze(['వెనక్కి వెళ్ళండి']),
      scroll_up: Object.freeze(['పైకి స్క్రోల్ చేయండి']),
      scroll_down: Object.freeze(['క్రిందికి స్క్రోల్ చేయండి']),
      refresh: Object.freeze(['రిఫ్రెష్ చేయండి']),
      read_aloud: Object.freeze(['చదవండి', 'చదివి వినిపించండి']),
      stop_reading: Object.freeze(['చదవడం ఆపండి']),
    }),
    confirmations: Object.freeze({
      yes: Object.freeze(['అవును', 'సరే', 'కరెక్ట్']),
      no: Object.freeze(['కాదు', 'లేదు', 'రద్దు']),
    }),
  }),
});

/**
 * Response messages for different languages
 * @readonly
 */
const RESPONSE_MESSAGES = Object.freeze({
  en: Object.freeze({
    navigating: 'Navigating to {page}',
    action_performed: '{action} completed',
    not_understood: "Sorry, I didn't understand that. Please try again.",
    listening: 'Listening...',
    confirmation_required: 'Please say yes to confirm or no to cancel',
    cancelled: 'Action cancelled',
  }),
  hi: Object.freeze({
    navigating: '{page} पर जा रहे हैं',
    action_performed: '{action} हो गया',
    not_understood: 'माफ़ कीजिए, मुझे समझ नहीं आया। कृपया दोबारा कहें।',
    listening: 'सुन रहा हूं...',
    confirmation_required: 'कृपया हां कहें पुष्टि करने के लिए या नहीं कहें रद्द करने के लिए',
    cancelled: 'रद्द कर दिया गया',
  }),
  te: Object.freeze({
    navigating: '{page}కి వెళ్తున్నాము',
    action_performed: '{action} పూర్తయింది',
    not_understood: 'క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.',
    listening: 'వింటున్నాను...',
    confirmation_required: 'దయచేసి నిర్ధారించడానికి అవును అని చెప్పండి లేదా రద్దు చేయడానికి లేదు అని చెప్పండి',
    cancelled: 'రద్దు చేయబడింది',
  }),
});

/**
 * Patient route mappings
 * @readonly
 */
const PATIENT_ROUTES = Object.freeze({
  home: '/patient/home',
  doctors: '/patient/doctors',
  appointments: '/patient/appointments',
  medicines: '/patient/medicines',
  health_records: '/patient/health-records',
  symptom_checker: '/patient/symptom-checker',
  chatbot: '/patient/chat',
  emergency: '/patient/emergency',
  profile: '/patient/profile',
  notifications: '/patient/notifications',
});

/**
 * Doctor route mappings
 * @readonly
 */
const DOCTOR_ROUTES = Object.freeze({
  home: '/doctor/home',
  appointments: '/doctor/appointments',
  queue: '/doctor/queue',
  patients: '/doctor/patients',
  consultations: '/doctor/consultations',
  prescriptions: '/doctor/prescriptions',
  schedule: '/doctor/schedule',
  profile: '/doctor/profile',
  notifications: '/doctor/notifications',
});

/**
 * Voice Commands Controller
 */
class VoiceCommandsController {
  constructor() {
    this.language = 'en';
    this.isActive = false;
    this.recognitionController = null;
    this.onCommand = null;
    this.onNavigate = null;
    this.onAction = null;
    this.onNotUnderstood = null;
    this.speakResponses = true;
    this.commandHistory = [];
  }

  /**
   * Initialize voice commands
   * @param {Object} options - Configuration options
   */
  init(options = {}) {
    const {
      language = 'en',
      onCommand,
      onNavigate,
      onAction,
      onNotUnderstood,
      speakResponses = true,
    } = options;

    this.language = language;
    this.onCommand = onCommand;
    this.onNavigate = onNavigate;
    this.onAction = onAction;
    this.onNotUnderstood = onNotUnderstood;
    this.speakResponses = speakResponses;

    this.recognitionController = getRecognitionController();
    this.recognitionController.init({
      language,
      continuous: true,
      interimResults: false,
      onResult: this._handleResult.bind(this),
      onError: this._handleError.bind(this),
    });
  }

  /**
   * Handle recognition result
   * @private
   */
  _handleResult(result) {
    const { transcript } = result;
    const normalizedTranscript = transcript.toLowerCase().trim();

    // Add to history
    this.commandHistory.push({
      transcript: normalizedTranscript,
      timestamp: new Date(),
    });

    // Try to match command
    const command = this._matchCommand(normalizedTranscript);

    if (command) {
      this._executeCommand(command);
    } else {
      this._handleUnknownCommand(normalizedTranscript);
    }
  }

  /**
   * Match transcript to command
   * @private
   */
  _matchCommand(transcript) {
    const patterns = COMMAND_PATTERNS[this.language] || COMMAND_PATTERNS.en;

    // Check navigation commands
    for (const [page, phrases] of Object.entries(patterns.navigation)) {
      if (phrases.some((phrase) => transcript.includes(phrase.toLowerCase()))) {
        return { type: 'navigation', target: page };
      }
    }

    // Check action commands
    for (const [action, phrases] of Object.entries(patterns.actions)) {
      if (phrases.some((phrase) => transcript.includes(phrase.toLowerCase()))) {
        return { type: 'action', target: action };
      }
    }

    // Check confirmations
    for (const [response, phrases] of Object.entries(patterns.confirmations)) {
      if (phrases.some((phrase) => transcript.includes(phrase.toLowerCase()))) {
        return { type: 'confirmation', target: response };
      }
    }

    return null;
  }

  /**
   * Execute matched command
   * @private
   */
  _executeCommand(command) {
    const messages = RESPONSE_MESSAGES[this.language] || RESPONSE_MESSAGES.en;

    if (this.onCommand) {
      this.onCommand(command);
    }

    switch (command.type) {
      case 'navigation':
        if (this.onNavigate) {
          this.onNavigate(command.target);
        }
        if (this.speakResponses) {
          const message = messages.navigating.replace('{page}', command.target);
          speak(message, { language: this.language });
        }
        break;

      case 'action':
        if (this.onAction) {
          this.onAction(command.target);
        }
        if (this.speakResponses) {
          const message = messages.action_performed.replace('{action}', command.target);
          speak(message, { language: this.language });
        }
        break;

      case 'confirmation':
        if (this.onCommand) {
          this.onCommand({ type: 'confirmation', value: command.target === 'yes' });
        }
        break;

      default:
        break;
    }
  }

  /**
   * Handle unknown command
   * @private
   */
  _handleUnknownCommand(transcript) {
    const messages = RESPONSE_MESSAGES[this.language] || RESPONSE_MESSAGES.en;

    if (this.onNotUnderstood) {
      this.onNotUnderstood(transcript);
    }

    if (this.speakResponses) {
      speak(messages.not_understood, { language: this.language });
    }
  }

  /**
   * Handle recognition error
   * @private
   */
  _handleError(error) {
    console.error('Voice command error:', error);
  }

  /**
   * Start listening for commands
   */
  start() {
    if (this.recognitionController) {
      this.recognitionController.start();
      this.isActive = true;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.recognitionController) {
      this.recognitionController.stop();
      this.isActive = false;
    }
  }

  /**
   * Toggle listening
   */
  toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Set language
   * @param {string} language - Language code
   */
  setLanguage(language) {
    this.language = language;
    if (this.recognitionController) {
      this.recognitionController.setLanguage(language);
    }
  }

  /**
   * Get command history
   * @returns {Array} Command history
   */
  getHistory() {
    return this.commandHistory;
  }

  /**
   * Clear command history
   */
  clearHistory() {
    this.commandHistory = [];
  }

  /**
   * Get available commands for current language
   * @returns {Object} Available commands
   */
  getAvailableCommands() {
    return COMMAND_PATTERNS[this.language] || COMMAND_PATTERNS.en;
  }

  /**
   * Check if active
   * @returns {boolean}
   */
  getIsActive() {
    return this.isActive;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stop();
    if (this.recognitionController) {
      this.recognitionController.destroy();
    }
    this.onCommand = null;
    this.onNavigate = null;
    this.onAction = null;
    this.onNotUnderstood = null;
  }
}

// Singleton instance
let voiceCommandsController = null;

/**
 * Get or create voice commands controller
 * @returns {VoiceCommandsController}
 */
export const getVoiceCommandsController = () => {
  if (!voiceCommandsController) {
    voiceCommandsController = new VoiceCommandsController();
  }
  return voiceCommandsController;
};

/**
 * Get route path for navigation command
 * @param {string} target - Navigation target
 * @param {string} userRole - User role (patient/doctor)
 * @returns {string|null} Route path
 */
export const getRouteForCommand = (target, userRole = 'patient') => {
  const routes = userRole === 'doctor' ? DOCTOR_ROUTES : PATIENT_ROUTES;
  return routes[target] || null;
};

// ==================== NAMED EXPORTS ====================
export { COMMAND_PATTERNS, RESPONSE_MESSAGES };

// ==================== DEFAULT EXPORT ====================
export default {
  getVoiceCommandsController,
  getRouteForCommand,
  COMMAND_PATTERNS,
  RESPONSE_MESSAGES,
  VoiceCommandsController,
};