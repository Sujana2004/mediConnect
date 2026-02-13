import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Bell,
  Phone,
  CheckCircle,
} from 'lucide-react';

const APPT_SUB_TABS = [
  { id: 'upcoming', label: 'upcoming' },
  { id: 'today', label: 'today' },
  { id: 'history', label: 'history' },
  { id: 'book', label: 'book' },
];

const SPECIALIZATIONS = [
  { id: 'general', icon: '🩺', name: 'General Physician' },
  { id: 'dentist', icon: '🦷', name: 'Dentist' },
  { id: 'eye', icon: '👁️', name: 'Eye Specialist' },
  { id: 'ortho', icon: '🦴', name: 'Ortho' },
  { id: 'diabetes', icon: '💊', name: 'Diabetes Specialist' },
  { id: 'cardio', icon: '❤️', name: 'Cardio' },
  { id: 'pediatric', icon: '👶', name: 'Pediatric' },
];

const MOCK_DOCTORS = [
  {
    id: 1,
    name: 'Dr. Ramesh Kumar',
    spec: 'General Physician',
    slots: ['9:00 AM', '9:30 AM', '10:00 AM'],
  },
  {
    id: 2,
    name: 'Dr. Priya Sharma',
    spec: 'Gynecologist',
    slots: ['2:00 PM', '3:00 PM'],
  },
];

const PatientAppointmentsTab = () => {
  const { t } = useTranslation();

  const [activeSubTab, setActiveSubTab] = useState('upcoming');
  const [historyFilter, setHistoryFilter] = useState('All');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Booking States
  const [bookStep, setBookStep] = useState(1);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [queueStatus] = useState({
    myToken: 12,
    patientsAhead: 5,
    estimatedMin: 25,
  });

  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory([
      {
        id: 1,
        doctor: 'Dr. Ramesh Kumar',
        date: '20 Jan 2025',
        time: '10:00 AM',
        status: 'completed',
        reason: 'Diabetes checkup',
      },
      {
        id: 2,
        doctor: 'Dr. Priya Sharma',
        date: '15 Jan 2025',
        time: '3:00 PM',
        status: 'cancelled',
      },
    ]);
  }, []);

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">

      {/* TABS */}
      <div className="flex gap-2 mb-6">
        {APPT_SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-4 py-2 rounded-xl ${
              activeSubTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= UPCOMING ================= */}
      {activeSubTab === 'upcoming' && (
        <div className="border rounded-xl p-4 bg-green-50">
          <p className="font-bold">Dr. Ramesh Kumar</p>
          <p>Tomorrow • 10:30 AM</p>

          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => setActionMessage("Reminder set successfully!")} className="border px-3 py-2 rounded-lg text-sm flex gap-1">
              <Bell size={16} /> Remind Me
            </button>
            <button onClick={() => window.open("https://maps.google.com")} className="border px-3 py-2 rounded-lg text-sm flex gap-1">
              <MapPin size={16} /> Directions
            </button>
            <button onClick={() => setActionMessage("Calling clinic...")} className="border px-3 py-2 rounded-lg text-sm flex gap-1">
              <Phone size={16} /> Call
            </button>
          </div>
        </div>
      )}

      {/* ================= TODAY ================= */}
      {activeSubTab === 'today' && (
        <div className="border rounded-xl p-4 bg-green-50">
          <p className="font-bold">Dr. Ramesh Kumar</p>
          <p>Starting soon</p>

          <div className="mt-3 border rounded-lg p-3 bg-white">
            <p>Your token: #{queueStatus.myToken}</p>
            <p>Patients ahead: {queueStatus.patientsAhead}</p>
            <p>Estimated wait: {queueStatus.estimatedMin} min</p>
          </div>

          <div className="flex gap-2 mt-3">
            <button onClick={() => setActionMessage("Checked in successfully!")} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">
              Check in
            </button>
            <button onClick={() => setActionMessage("Queue information shown")} className="border px-4 py-2 rounded-lg text-sm">
              View queue
            </button>
            <button onClick={() => setActionMessage("Calling clinic...")} className="border px-4 py-2 rounded-lg text-sm">
              Call clinic
            </button>
          </div>
        </div>
      )}

      {/* ================= HISTORY ================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-4">

          <div className="flex gap-2">
            {['All', 'Completed', 'Cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className={`px-3 py-1 rounded ${
                  historyFilter === f
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {history
            .filter((h) => {
              if (historyFilter === 'All') return true;
              if (historyFilter === 'Completed') return h.status === 'completed';
              if (historyFilter === 'Cancelled') return h.status === 'cancelled';
              return true;
            })
            .map((h) => (
              <div key={h.id} className="border rounded-xl p-4">
                <p className="font-bold">{h.doctor}</p>
                <p>{h.date} • {h.time}</p>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setSelectedHistory(h)} className="text-primary-600 text-sm">
                    View details
                  </button>

                  {h.status === 'completed' && (
                    <button
                      onClick={() => setSelectedHistory({ ...h, showPrescription: true })}
                      className="text-primary-600 text-sm"
                    >
                      View prescription
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ================= BOOK ================= */}
      {activeSubTab === 'book' && (
        <div>

          {/* STEP 1 */}
          {bookStep === 1 && (
            <>
              <h2 className="text-lg font-bold mb-4">
                What type of doctor do you need?
              </h2>

              <div className="grid grid-cols-4 gap-3">
                {SPECIALIZATIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSpec(s);
                      setBookStep(2);
                    }}
                    className="border-2 rounded-xl p-4 text-center hover:border-primary-600"
                  >
                    <div className="text-2xl">{s.icon}</div>
                    <div className="text-xs">{s.name}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 2 */}
          {bookStep === 2 && (
            <>
              <button onClick={() => setBookStep(1)}>← Back</button>

              {MOCK_DOCTORS.map((doc) => (
                <div key={doc.id} className="border rounded-xl p-4 mt-3">
                  <p className="font-bold">{doc.name}</p>
                  <p className="text-sm text-gray-500">{doc.spec}</p>
                  <button
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setBookStep(3);
                    }}
                    className="mt-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </>
          )}

          {/* STEP 3 */}
          {bookStep === 3 && selectedDoctor && (
            <>
              <button onClick={() => setBookStep(2)}>← Back</button>

              <div className="flex gap-2 mt-3">
                {['27', '28', '29'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`px-4 py-2 border rounded-lg ${
                      selectedDate === d
                        ? 'bg-primary-600 text-white'
                        : ''
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {selectedDate && (
                <div className="flex gap-2 mt-3">
                  {selectedDoctor.slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-4 py-2 border rounded-lg ${
                        selectedSlot === slot
                          ? 'bg-primary-600 text-white'
                          : ''
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}

              <button
                disabled={!selectedSlot}
                onClick={() => setBookStep(4)}
                className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg"
              >
                Continue
              </button>
            </>
          )}

          {/* STEP 4 */}
          {bookStep === 4 && (
            <div className="mt-4">
              <p>{selectedDoctor.name}</p>
              <p>{selectedDate} • {selectedSlot}</p>
              <button
                onClick={() => setBookingSuccess(true)}
                className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg"
              >
                Confirm Booking
              </button>
            </div>
          )}

          {/* SUCCESS */}
          {bookingSuccess && (
            <div className="text-center mt-6">
              <CheckCircle size={50} className="mx-auto text-green-600" />
              <p className="font-bold mt-2">Appointment Booked!</p>
              <p>Token #12</p>
              <button
                onClick={() => {
                  setBookStep(1);
                  setBookingSuccess(false);
                }}
                className="mt-3 bg-primary-600 text-white px-4 py-2 rounded-lg"
              >
                Book Another
              </button>
            </div>
          )}
        </div>
      )}

      {/* ACTION MODAL */}
      {actionMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-80 text-center">
            <p>{actionMessage}</p>
            <button
              onClick={() => setActionMessage(null)}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {selectedHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl w-96">
            <h2 className="font-bold mb-2">
              {selectedHistory.showPrescription
                ? 'Prescription'
                : 'Appointment Details'}
            </h2>
            <p>{selectedHistory.doctor}</p>
            <p>{selectedHistory.date} • {selectedHistory.time}</p>
            <button
              onClick={() => setSelectedHistory(null)}
              className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default PatientAppointmentsTab;
