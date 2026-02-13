import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  FileText,
  Heart,
  Syringe,
  FlaskConical,
  AlertTriangle,
  Users,
  Share2,
  ChevronRight,
  Edit3,
  Upload,
  Download,
  Eye,
  Trash2,
  Plus,
} from 'lucide-react';

const RECORD_SUB_TABS = [
  { id: 'overview', icon: BarChart3, labelKey: 'patient.records.overview' },
  { id: 'documents', icon: FileText, labelKey: 'patient.records.documents' },
  { id: 'conditions', icon: Heart, labelKey: 'patient.records.conditions' },
  { id: 'vaccinations', icon: Syringe, labelKey: 'patient.records.vaccinations' },
  { id: 'lab', icon: FlaskConical, labelKey: 'patient.records.labReports' },
  { id: 'allergies', icon: AlertTriangle, labelKey: 'patient.records.allergies' },
  { id: 'family', icon: Users, labelKey: 'patient.records.familyHistory' },
  { id: 'share', icon: Share2, labelKey: 'patient.records.share' },
];

const PatientRecordsTab = () => {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState('overview');

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      {/* Horizontal scroll sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4">
        {RECORD_SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium touch-manipulation min-h-[44px] whitespace-nowrap ${isActive ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              <Icon className="h-4 w-4" />
              {t(tab.labelKey, tab.id)}
            </button>
          );
        })}
      </div>

      {activeSubTab === 'overview' && <RecordsOverview t={t} />}
      {activeSubTab === 'documents' && <RecordsDocuments t={t} />}
      {activeSubTab === 'conditions' && <RecordsConditions t={t} />}
      {activeSubTab === 'vaccinations' && <RecordsVaccinations t={t} />}
      {activeSubTab === 'lab' && <RecordsLabReports t={t} />}
      {activeSubTab === 'allergies' && <RecordsAllergies t={t} />}
      {activeSubTab === 'family' && <RecordsFamilyHistory t={t} />}
      {activeSubTab === 'share' && <RecordsShare t={t} />}

      <div className="h-16" />
    </div>
  );
};

function RecordsOverview({ t }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900">👤 {t('patient.records.basicInfo', 'Basic Information')}</h3>
          <button type="button" className="text-sm text-primary-600 flex items-center gap-1"><Edit3 className="h-4 w-4" /> {t('patient.edit', 'Edit')}</button>
        </div>
        <dl className="mt-2 space-y-1 text-sm">
          <div><span className="text-gray-500">Name:</span> Lakshmi</div>
          <div><span className="text-gray-500">Age:</span> 55 years</div>
          <div><span className="text-gray-500">Gender:</span> Female</div>
          <div><span className="text-gray-500">Blood Group:</span> O+ 🩸</div>
          <div><span className="text-gray-500">Height:</span> 160 cm</div>
          <div><span className="text-gray-500">Weight:</span> 65 kg</div>
          <div><span className="text-gray-500">BMI:</span> 25.4 (Slightly Overweight) 🟡</div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">❤️ {t('patient.records.healthScore', 'Health Score')}</h3>
        <div className="mt-2 flex flex-col items-center">
          <p className="text-2xl font-bold text-primary-600">78/100</p>
          <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full" style={{ width: '78%' }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">GOOD</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">✅ Regular checkups • ✅ Controlled diabetes • ⚠️ Needs more exercise • ✅ Medication adherence: 92%</p>
        <button type="button" className="mt-2 text-sm text-primary-600">📈 {t('patient.records.viewDetailed', 'View detailed analysis')}</button>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900">🏥 {t('patient.records.activeConditions', 'Active conditions')} (2)</h3>
          <button type="button" className="text-sm text-primary-600">{t('patient.viewAll', 'View All')}</button>
        </div>
        <div className="mt-2 space-y-2">
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="font-medium">🩸 Type 2 Diabetes</p>
            <p className="text-xs text-gray-500">Diagnosed 5 years ago • MODERATE 🟡 • Last checkup: 20 Jan 2025</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="font-medium">💓 Hypertension</p>
            <p className="text-xs text-gray-500">Diagnosed 3 years ago • MILD 🟢 • Well controlled</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
        <h3 className="font-bold text-gray-900">⚠️ {t('patient.records.criticalAllergies', 'Critical allergies')} (3)</h3>
        <p className="text-sm text-gray-700 mt-1">🔴 Penicillin (Severe) • 🟡 Peanuts (Moderate) • 🟢 Pollen (Mild)</p>
        <button type="button" className="mt-2 text-sm text-primary-600">{t('patient.viewAll', 'View All')}</button>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">💊 {t('patient.records.currentMeds', 'Current medications')} (3)</h3>
        <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
          <li>Metformin 500mg - Twice daily (Diabetes)</li>
          <li>Amlodipine 5mg - Once daily (BP)</li>
          <li>Aspirin 75mg - Once daily (Blood thinner)</li>
        </ul>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">📈 {t('patient.records.healthTimeline', 'Health timeline')}</h3>
        <div className="mt-2 space-y-2 text-sm">
          <p>📅 27 Jan 2025 - 💊 Metformin taken</p>
          <p>📅 25 Jan 2025 - 📊 Vitals: BP 130/85, Sugar 110</p>
          <p>📅 20 Jan 2025 - 🩺 Dr. Ramesh (Diabetes checkup)</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">📤 {t('patient.records.sharedWith', 'Shared with')}</h3>
        <p className="text-sm text-gray-600 mt-1">🩺 Dr. Ramesh Kumar (Permanent) • 🩺 Dr. Priya Sharma (Expires 30 Jan)</p>
        <button type="button" className="mt-2 text-sm text-primary-600">{t('patient.manage', 'Manage')}</button>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-3">{t('patient.records.quickActions', 'Quick actions')}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('patient.records.uploadDoc', 'Upload document'), icon: '📄' },
            { label: t('patient.records.recordVitals', 'Record vitals'), icon: '📊' },
            { label: t('patient.records.shareDoctor', 'Share with doctor'), icon: '📤' },
            { label: t('patient.records.downloadAll', 'Download all'), icon: '📥' },
            { label: t('patient.records.emailSummary', 'Email summary'), icon: '📧' },
            { label: t('patient.records.printSummary', 'Print summary'), icon: '🖨️' },
          ].map((a, i) => (
            <button key={i} type="button" className="flex flex-col items-center p-3 rounded-xl border border-gray-200 text-xs font-medium">
              <span className="text-lg mb-1">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecordsDocuments({ t }) {
  const [filter, setFilter] = useState('all');
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">📄 {t('patient.records.myDocuments', 'My medical documents')}</h3>
        <button type="button" className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm"><Plus className="h-4 w-4" /> {t('patient.records.uploadNew', 'Upload New')}</button>
      </div>
      <div className="rounded-xl border border-gray-200 p-3">
        <p className="text-sm text-gray-600">Storage: 125 MB / 1 GB (12.5%)</p>
        <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full" style={{ width: '12.5%' }} />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {['all', 'prescriptions', 'lab', 'xray', 'other'].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>{f}</button>
        ))}
      </div>
      <div className="space-y-2">
        {[
          { name: 'Prescription_20Jan2025.pdf', by: 'Dr. Ramesh Kumar', date: '20 Jan 2025', size: '245 KB' },
          { name: 'HbA1c_Test_15Jan2025.pdf', by: 'Apollo Diagnostics', date: '15 Jan 2025', size: '1.2 MB' },
        ].map((doc, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{doc.name}</p>
              <p className="text-xs text-gray-500">{doc.by} • {doc.date} • {doc.size}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100" aria-label="View"><Eye className="h-4 w-4" /></button>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100" aria-label="Download"><Download className="h-4 w-4" /></button>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100" aria-label="Share"><Share2 className="h-4 w-4" /></button>
              <button type="button" className="p-2 rounded-lg hover:bg-red-50 text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">{t('patient.records.clickOrDrag', 'Click or drag to upload')}</p>
        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC • Max 10 MB</p>
      </div>
    </div>
  );
}

function RecordsConditions({ t }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">🏥 {t('patient.records.myConditions', 'My medical conditions')}</h3>
        <button type="button" className="flex items-center gap-1 text-primary-600 text-sm"><Plus className="h-4 w-4" /> {t('patient.records.addNew', 'Add New')}</button>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🩸 Type 2 Diabetes Mellitus</p>
        <p className="text-sm text-gray-500">Diagnosed Jan 2020 • Dr. Ramesh Kumar</p>
        <p className="text-xs mt-2">Severity: MODERATE • Chronic: Yes</p>
        <p className="text-xs">Latest HbA1c: 7.2% (15 Jan 2025) • Next checkup: 20 Feb 2025</p>
        <div className="flex gap-2 mt-3">
          <button type="button" className="text-sm text-primary-600">{t('patient.edit', 'Edit')}</button>
          <button type="button" className="text-sm text-primary-600">📊 {t('patient.records.viewTrends', 'View trends')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">💓 Essential Hypertension</p>
        <p className="text-sm text-gray-500">Diagnosed Mar 2022 • Dr. Ramesh Kumar</p>
        <p className="text-xs mt-2">Severity: MILD • Latest BP: 130/85 (25 Jan 2025)</p>
        <div className="flex gap-2 mt-3">
          <button type="button" className="text-sm text-primary-600">{t('patient.edit', 'Edit')}</button>
          <button type="button" className="text-sm text-primary-600">📊 {t('patient.records.viewTrends', 'View trends')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
        <p className="font-medium text-gray-700">✅ {t('patient.records.resolved', 'Resolved')}: Vitamin D Deficiency (Jan 2024 - Jun 2024)</p>
      </div>
    </div>
  );
}

function RecordsVaccinations({ t }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-bold text-amber-800">⚠️ {t('patient.records.pendingVaccine', 'Pending')}: Influenza (Flu) - Due 1 Feb 2025</p>
        <div className="flex gap-2 mt-2">
          <button type="button" className="px-3 py-1.5 rounded-lg bg-amber-200 text-amber-900 text-sm">✅ {t('patient.records.markDone', 'Mark as done')}</button>
          <button type="button" className="px-3 py-1.5 rounded-lg border border-amber-300 text-sm">🔔 {t('patient.remindMe', 'Remind Me')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">💉 COVID-19 (Covishield)</p>
        <p className="text-sm text-gray-600">Dose 1: 15 Apr 2021 ✅ • Dose 2: 15 Jul 2021 ✅ • Booster: 10 Jan 2022 ✅</p>
        <p className="text-xs text-gray-500 mt-1">PHC Malkajgiri • Batch 4120Z004</p>
        <button type="button" className="mt-2 text-sm text-primary-600">👁️ {t('patient.records.viewCertificate', 'View certificate')}</button>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">💉 Tetanus Toxoid</p>
        <p className="text-sm text-gray-600">Last dose: 10 Mar 2020 ✅ • Next due: 10 Mar 2030</p>
      </div>
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-900">{t('patient.records.addVaccination', 'Add vaccination')}</h3>
        <button type="button" className="flex items-center gap-1 text-primary-600 text-sm"><Plus className="h-4 w-4" /> {t('patient.records.addNew', 'Add New')}</button>
      </div>
    </div>
  );
}

function RecordsLabReports({ t }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">📊 HbA1c - 15 Jan 2025</p>
        <p className="text-sm text-gray-500">Apollo Diagnostics</p>
        <table className="w-full mt-2 text-sm">
          <tbody>
            <tr><td>HbA1c</td><td>7.2%</td><td>&lt;7.0%</td><td>🟡 HIGH</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-amber-700 mt-2">Overall: Acceptable (Target &lt;7.0%)</p>
        <div className="flex gap-2 mt-3">
          <button type="button" className="text-sm text-primary-600">📊 {t('patient.records.viewTrends', 'View trends')}</button>
          <button type="button" className="text-sm text-primary-600">📤 {t('patient.records.shareDoctor', 'Share with doctor')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">📊 Lipid Profile - 10 Dec 2024</p>
        <p className="text-sm text-gray-500">City Labs</p>
        <p className="text-sm text-green-700 mt-1">✅ All values normal</p>
      </div>
      <button type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600">
        <Plus className="h-5 w-5" /> {t('patient.records.addReport', 'Add lab report')}
      </button>
    </div>
  );
}

function RecordsAllergies({ t }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded-xl">⚠️ {t('patient.records.alwaysInformDoctors', 'Always inform doctors about your allergies!')}</p>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="font-bold text-red-800">💊 Penicillin (Drug) - SEVERE</p>
        <p className="text-sm text-gray-700 mt-1">Reaction: Severe skin rash, difficulty breathing, swelling. First occurrence: 2018.</p>
        <p className="text-xs text-red-700 mt-2">AVOID: Penicillin, Amoxicillin, Ampicillin. Safe alternatives: Azithromycin, Ciprofloxacin.</p>
        <div className="flex gap-2 mt-3">
          <button type="button" className="text-sm text-primary-600">{t('patient.edit', 'Edit')}</button>
          <button type="button" className="text-sm text-red-600">{t('patient.delete', 'Delete')}</button>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🥜 Peanuts (Food) - MODERATE</p>
        <p className="text-sm text-gray-600">Skin rash, stomach upset. Avoid all peanut products.</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🌸 Pollen (Environmental) - MILD</p>
        <p className="text-sm text-gray-600">Sneezing, runny nose. Seasonal (Spring).</p>
      </div>
      <button type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600">
        <Plus className="h-5 w-5" /> {t('patient.records.addAllergy', 'Add allergy')}
      </button>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-medium text-gray-900">💡 {t('patient.records.allergyCard', 'Allergy card (for emergencies)')}</p>
        <div className="flex gap-2 mt-2">
          <button type="button" className="px-3 py-2 rounded-lg bg-gray-100 text-sm">📄 {t('patient.records.generateCard', 'Generate allergy card')}</button>
          <button type="button" className="px-3 py-2 rounded-lg bg-gray-100 text-sm">📥 {t('patient.records.downloadPdf', 'Download PDF')}</button>
        </div>
      </div>
    </div>
  );
}

function RecordsFamilyHistory({ t }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">💡 {t('patient.records.helpsGeneticRisks', 'Helps doctors understand your genetic health risks')}</p>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">👨 Father (82, Living)</p>
        <p className="text-sm text-gray-600">Diabetes (age 50), Heart disease (age 68)</p>
        <button type="button" className="mt-2 text-sm text-primary-600">{t('patient.edit', 'Edit')}</button>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">👩 Mother (78, Living)</p>
        <p className="text-sm text-gray-600">Hypertension (age 55)</p>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🧬 {t('patient.records.geneticRisk', 'Genetic risk analysis')}</p>
        <p className="text-sm text-red-700 mt-1">HIGH: Diabetes, Heart disease</p>
        <p className="text-sm text-amber-700 mt-1">MODERATE: Hypertension, Stroke</p>
        <p className="text-xs text-gray-600 mt-2">Recommendations: Regular checkups every 6 months, monitor BP and sugar, healthy lifestyle.</p>
      </div>
      <button type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600">
        <Plus className="h-5 w-5" /> {t('patient.records.addFamilyMember', 'Add family member')}
      </button>
    </div>
  );
}

function RecordsShare({ t }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900">📤 {t('patient.records.shareWithDoctor', 'Share medical records with doctor')}</h3>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🩺 Dr. Ramesh Kumar</p>
        <p className="text-sm text-gray-500">General Physician • Primary Health Center</p>
        <p className="text-xs text-gray-600 mt-1">Access: PERMANENT • Can view: All records</p>
        <button type="button" className="mt-2 text-sm text-red-600">🔒 {t('patient.records.revokeAccess', 'Revoke access')}</button>
      </div>
      <div className="rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-gray-900">🩺 Dr. Priya Sharma</p>
        <p className="text-sm text-gray-500">Gynecologist • Expires 30 Jan 2025</p>
        <button type="button" className="mt-2 text-sm text-primary-600">⏰ {t('patient.records.extend', 'Extend')}</button>
      </div>
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-4">
        <p className="font-medium text-gray-700">{t('patient.records.shareWithNew', 'Share with new doctor')}</p>
        <input type="text" placeholder={t('patient.records.searchDoctor', 'Search by name or ID...')} className="w-full mt-2 px-3 py-2 border rounded-xl text-sm" />
        <div className="mt-2">
          <label className="flex items-center gap-2 text-sm"><input type="radio" name="access" defaultChecked /> {t('patient.records.permanent', 'Permanent')}</label>
          <label className="flex items-center gap-2 text-sm mt-1"><input type="radio" name="access" /> {t('patient.records.temporary', 'Temporary')} (7/30 days)</label>
        </div>
        <button type="button" className="mt-3 w-full py-2 rounded-xl bg-primary-600 text-white text-sm font-medium">📤 {t('patient.records.shareRecords', 'Share records')}</button>
      </div>
    </div>
  );
}

export default PatientRecordsTab;
