// pages/patient/PatientMoreTab/panels/SupportPanels.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
  Heart,
  Check,
  Star,
  MessageSquare,
  Phone,
  Video,
  Share2,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { DetailPanel, ActionButton, InfoCard } from '../components';
import { USER_GUIDES, FAQS, FEEDBACK_TAGS } from '../constants';

// ============================================
// ABOUT PANEL
// ============================================
export const AboutPanel = ({ onClose }) => (
  <DetailPanel title="About MediConnect" onClose={onClose}>
    <div className="space-y-6">
      {/* App Logo & Info */}
      <div className="text-center py-6">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Heart className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">MediConnect</h2>
        <p className="text-gray-500">Version 2.0.0</p>
        <p className="text-sm text-gray-400 mt-1">Build 2024.01.15</p>
      </div>

      {/* Description */}
      <p className="text-gray-700 text-center px-4">
        Your trusted healthcare companion. Book appointments, manage medications, access medical records,
        and connect with healthcare providers - all in one app.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center p-4 bg-green-50 rounded-xl">
          <p className="text-2xl font-bold text-green-600">1M+</p>
          <p className="text-xs text-gray-500">Active Users</p>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-xl">
          <p className="text-2xl font-bold text-blue-600">10K+</p>
          <p className="text-xs text-gray-500">Doctors</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-xl">
          <p className="text-2xl font-bold text-purple-600">500+</p>
          <p className="text-xs text-gray-500">Hospitals</p>
        </div>
      </div>

      {/* What's New */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">What&apos;s New in v2.0.0</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          {[
            'Enhanced video consultation quality',
            'New medication reminder features',
            'Improved offline mode support',
            'Family health management',
            'Better voice assistant support',
            'Redesigned user interface',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Credits */}
      <div className="text-center space-y-2 text-sm text-gray-500">
        <p>© 2024 MediConnect Health Technologies</p>
        <p>Made with ❤️ for better healthcare</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 py-3 border rounded-xl font-medium text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50">
          <Share2 className="h-4 w-4" /> Share App
        </button>
        <button className="flex-1 py-3 border rounded-xl font-medium text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50">
          <FileText className="h-4 w-4" /> Licenses
        </button>
      </div>

      {/* Social Links */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3 text-center">Follow Us</h4>
        <div className="flex justify-center gap-4">
          {['Twitter', 'Facebook', 'Instagram', 'LinkedIn'].map((social) => (
            <button
              key={social}
              className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              {social}
            </button>
          ))}
        </div>
      </div>
    </div>
  </DetailPanel>
);

AboutPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};

// ============================================
// USER GUIDE PANEL
// ============================================
export const GuidePanel = ({ expandedGuide, setExpandedGuide, onClose }) => (
  <DetailPanel title="User Guide" onClose={onClose}>
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Learn how to make the most of MediConnect with these helpful guides.
      </p>

      {USER_GUIDES.map((guide, i) => (
        <div key={i} className="bg-white border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedGuide(expandedGuide === i ? null : i)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                {React.createElement(guide.icon, { className: 'h-5 w-5 text-primary-600' })}
              </div>
              <span className="font-medium text-gray-900">{guide.title}</span>
            </div>
            {expandedGuide === i ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>
          {expandedGuide === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed pl-12">{guide.content}</p>
              <button className="ml-12 mt-3 text-sm text-primary-600 font-medium flex items-center gap-1 hover:underline">
                <Video className="h-4 w-4" /> Watch Tutorial
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Quick Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Use voice commands for hands-free navigation</li>
          <li>• Enable offline mode before traveling</li>
          <li>• Set up medication reminders to never miss a dose</li>
          <li>• Add family members to manage their health too</li>
        </ul>
      </div>

      {/* Video Tutorials */}
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Video Tutorials</h4>
        <div className="grid grid-cols-2 gap-3">
          {['Getting Started', 'Booking Appointments', 'Using SOS', 'Managing Family'].map((title) => (
            <button
              key={title}
              className="p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Video className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-center">{title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  </DetailPanel>
);

GuidePanel.propTypes = {
  expandedGuide: PropTypes.number,
  setExpandedGuide: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FAQS PANEL
// ============================================
export const FAQsPanel = ({ expandedFaq, setExpandedFaq, onOpenContact, onClose }) => (
  <DetailPanel title="FAQs" onClose={onClose}>
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-4">
        Find answers to commonly asked questions about MediConnect.
      </p>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search FAQs..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* FAQ Items */}
      {FAQS.map((faq, i) => (
        <div key={i} className="bg-white border rounded-xl overflow-hidden">
          <button
            onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
            className="w-full p-4 flex items-start justify-between hover:bg-gray-50 text-left transition-colors"
          >
            <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
            {expandedFaq === i ? (
              <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            )}
          </button>
          {expandedFaq === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">{faq.a}</p>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-xs text-gray-500">Was this helpful?</span>
                <button className="text-xs text-green-600 font-medium hover:underline">Yes</button>
                <button className="text-xs text-red-600 font-medium hover:underline">No</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Contact Support CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <p className="text-sm text-blue-800">
          <strong>Still have questions?</strong> Contact our support team for help.
        </p>
        <button
          onClick={onOpenContact}
          className="mt-2 text-blue-600 font-medium text-sm hover:underline"
        >
          Contact Support →
        </button>
      </div>

      {/* Popular Topics */}
      <div className="bg-white border rounded-xl p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Popular Topics</h4>
        <div className="flex flex-wrap gap-2">
          {['Appointments', 'Payments', 'Prescriptions', 'Video Call', 'Account', 'Privacy'].map(
            (topic) => (
              <button
                key={topic}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200"
              >
                {topic}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  </DetailPanel>
);

FAQsPanel.propTypes = {
  expandedFaq: PropTypes.number,
  setExpandedFaq: PropTypes.func.isRequired,
  onOpenContact: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// CONTACT SUPPORT PANEL
// ============================================
export const ContactSupportPanel = ({
  supportMessage,
  setSupportMessage,
  onSendMessage,
  isLoading,
  onClose,
}) => {
  const handleChange = (field) => (e) => {
    setSupportMessage((prev) => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <DetailPanel title="Contact Support" onClose={onClose}>
      <div className="space-y-6">
        {/* Quick Contact Options */}
        <div className="grid grid-cols-2 gap-4">
          <a
            href="tel:1-800-MEDI-HELP"
            className="p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col items-center gap-2 hover:bg-green-100 transition-colors"
          >
            <div className="p-3 bg-green-100 rounded-full">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <span className="font-medium text-green-800">Call Us</span>
            <span className="text-xs text-green-600">24/7 Support</span>
          </a>
          <button className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors">
            <div className="p-3 bg-blue-100 rounded-full">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <span className="font-medium text-blue-800">Live Chat</span>
            <span className="text-xs text-blue-600">Instant Help</span>
          </button>
        </div>

        {/* Response Time Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>Average Response Time:</strong> Less than 2 hours during business hours (9 AM - 6 PM)
          </p>
        </div>

        {/* Contact Form */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Send us a message</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <select
                value={supportMessage.subject}
                onChange={handleChange('subject')}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500"
              >
                <option>Technical Issue</option>
                <option>Billing Question</option>
                <option>Appointment Help</option>
                <option>Account Issue</option>
                <option>Feature Request</option>
                <option>Report a Bug</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={supportMessage.message}
                onChange={handleChange('message')}
                rows={5}
                placeholder="Describe your issue in detail. Include any error messages you've seen..."
                className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {supportMessage.message.length}/1000 characters
              </p>
            </div>

            {/* Attachment Option */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Attach Screenshot (optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-primary-500 cursor-pointer transition-colors">
                <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>

            <ActionButton
              onClick={onSendMessage}
              loading={isLoading}
              disabled={!supportMessage.message.trim()}
            >
              Send Message
            </ActionButton>
          </div>
        </div>

        {/* Alternative Contact Info */}
        <div className="bg-gray-50 border rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">You can also reach us at:</p>
          <p className="font-medium text-gray-900">support@mediconnect.com</p>
          <p className="font-medium text-gray-900">1-800-MEDI-HELP (1-800-633-4435)</p>
        </div>

        {/* Office Hours */}
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Support Hours</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Monday - Friday</span>
              <span className="font-medium text-gray-900">9:00 AM - 9:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saturday</span>
              <span className="font-medium text-gray-900">10:00 AM - 6:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sunday</span>
              <span className="font-medium text-gray-900">Closed</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600">Emergency Support</span>
              <span className="font-medium text-green-600">24/7 Available</span>
            </div>
          </div>
        </div>
      </div>
    </DetailPanel>
  );
};

ContactSupportPanel.propTypes = {
  supportMessage: PropTypes.object.isRequired,
  setSupportMessage: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// FEEDBACK PANEL
// ============================================
export const FeedbackPanel = ({
  feedback,
  setFeedback,
  onToggleTag,
  onSubmit,
  isLoading,
  onClose,
}) => {
  const getRatingText = (rating) => {
    switch (rating) {
      case 5:
        return 'Excellent! 🎉';
      case 4:
        return 'Good! 😊';
      case 3:
        return 'Average 😐';
      case 2:
        return 'Poor 😕';
      case 1:
        return 'Very Poor 😞';
      default:
        return '';
    }
  };

  return (
    <DetailPanel title="Send Feedback" onClose={onClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-900">How&apos;s your experience?</h3>
          <p className="text-gray-500 text-sm">Your feedback helps us improve</p>
        </div>

        {/* Star Rating */}
        <div className="bg-white border rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
            Rate your overall experience
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setFeedback((prev) => ({ ...prev, rating: star }))}
                className="p-1 hover:scale-110 transition-transform focus:outline-none"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {feedback.rating > 0 && (
            <p className="text-center text-sm text-gray-500 mt-2">{getRatingText(feedback.rating)}</p>
          )}
        </div>

        {/* Feedback Tags */}
        <div className="bg-white border rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What can we improve? (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  feedback.tags.includes(tag)
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="bg-white border rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tell us more (optional)
          </label>
          <textarea
            value={feedback.message}
            onChange={(e) => setFeedback((prev) => ({ ...prev, message: e.target.value }))}
            rows={4}
            placeholder="Share your thoughts, suggestions, or concerns. What do you love? What could be better?"
            className="w-full px-4 py-3 border rounded-xl resize-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">{feedback.message.length}/500 characters</p>
        </div>

        {/* Suggestions based on rating */}
        {feedback.rating > 0 && feedback.rating <= 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              We&apos;re sorry to hear that. Please let us know what went wrong so we can improve your
              experience.
            </p>
          </div>
        )}

        {feedback.rating >= 4 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-800">
              We&apos;re glad you&apos;re enjoying MediConnect! Consider rating us on the app store to
              help others discover us.
            </p>
          </div>
        )}

        {/* Submit Button */}
        <ActionButton
          onClick={onSubmit}
          loading={isLoading}
          disabled={feedback.rating === 0}
        >
          Submit Feedback
        </ActionButton>

        {/* Privacy Note */}
        <p className="text-xs text-gray-500 text-center">
          Your feedback is anonymous and will be used to improve our services.
        </p>
      </div>
    </DetailPanel>
  );
};

FeedbackPanel.propTypes = {
  feedback: PropTypes.object.isRequired,
  setFeedback: PropTypes.func.isRequired,
  onToggleTag: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

// ============================================
// RATE APP PANEL
// ============================================
export const RateAppPanel = ({ onClose }) => (
  <DetailPanel title="Rate MediConnect" onClose={onClose}>
    <div className="space-y-6 text-center">
      {/* Header */}
      <div className="py-6">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Heart className="h-12 w-12 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Enjoying MediConnect?</h3>
        <p className="text-gray-600 mt-2">
          Your review helps us improve and helps others discover the app!
        </p>
      </div>

      {/* Star Display */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className="h-12 w-12 text-yellow-400 fill-yellow-400" />
        ))}
      </div>

      <p className="text-sm text-gray-500">Tap a button below to rate on your preferred store</p>

      {/* Store Buttons */}
      <div className="space-y-3 pt-4">
        <button className="w-full py-3.5 bg-black text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Rate on App Store
        </button>

        <button className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-green-700 transition-colors">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
          </svg>
          Rate on Google Play
        </button>
      </div>

      {/* Maybe Later */}
      <button onClick={onClose} className="text-gray-500 text-sm font-medium hover:underline">
        Maybe Later
      </button>

      {/* Share Option */}
      <div className="bg-gray-50 border rounded-xl p-4 mt-6">
        <p className="text-sm text-gray-600 mb-3">
          Already rated? Help us spread the word!
        </p>
        <button className="w-full py-3 border border-primary-500 text-primary-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors">
          <Share2 className="h-5 w-5" /> Share with Friends
        </button>
      </div>

      {/* Testimonials */}
      <div className="bg-white border rounded-xl p-4 text-left">
        <h4 className="font-semibold text-gray-900 mb-3 text-center">What Others Say</h4>
        <div className="space-y-3">
          {[
            {
              name: 'Sarah M.',
              text: 'This app has made managing my health so much easier!',
              rating: 5,
            },
            {
              name: 'John D.',
              text: 'Best healthcare app I have ever used. Highly recommend!',
              rating: 5,
            },
            {
              name: 'Emily R.',
              text: 'The video consultation feature is amazing.',
              rating: 4,
            },
          ].map((review, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">{review.name}</span>
                <div className="flex">
                  {[...Array(review.rating)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600">&quot;{review.text}&quot;</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </DetailPanel>
);

RateAppPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
};