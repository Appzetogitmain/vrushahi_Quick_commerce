import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { updateSettings, getDeliveryProfile, getPolicies } from '../../../services/api/delivery/deliveryService';

export default function DeliverySettings() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<{ title: string; content: string } | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profile = await getDeliveryProfile();
        if (profile.settings) {
          setNotificationsEnabled(profile.settings.notifications ?? true);
          setLocationEnabled(profile.settings.location ?? true);
          setSoundEnabled(profile.settings.sound ?? true);
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingChange = async (key: string, value: boolean) => {
    // Optimistic update
    if (key === 'notifications') setNotificationsEnabled(value);
    if (key === 'location') setLocationEnabled(value);
    if (key === 'sound') setSoundEnabled(value);

    try {
      await updateSettings({ [key]: value });
    } catch (error) {
      console.error("Failed to update settings", error);
    }
  };

  const handleShowPolicy = async (title: string) => {
    setPolicyLoading(true);
    try {
      const policies = await getPolicies('delivery');
      // Find policy by title (case insensitive)
      const policy = policies.find((p: any) => p.title.toLowerCase().includes(title.toLowerCase()));
      if (policy) {
        setSelectedPolicy({ title: policy.title, content: policy.content });
        setShowPolicyModal(true);
      } else {
        alert(`${title} not found.`);
      }
    } catch (error) {
      console.error("Failed to fetch policy", error);
      alert("Failed to load policy content.");
    } finally {
      setPolicyLoading(false);
    }
  };

  const settingsOptions = [
    {
      id: 'notifications',
      title: 'Push Notifications',
      description: 'Receive notifications for new orders',
      value: notificationsEnabled,
      onChange: (val: boolean) => handleSettingChange('notifications', val),
    },
    {
      id: 'location',
      title: 'Location Services',
      description: 'Allow app to access your location',
      value: locationEnabled,
      onChange: (val: boolean) => handleSettingChange('location', val),
    },
    {
      id: 'sound',
      title: 'Sound Alerts',
      description: 'Play sound for new order alerts',
      value: soundEnabled,
      onChange: (val: boolean) => handleSettingChange('sound', val),
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader hideProfile={true} hideToggle={true} />
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Settings</h2>
        </div>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-4">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Preferences</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            {settingsOptions.map((option) => (
              <div key={option.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-neutral-900 text-sm font-medium mb-1">{option.title}</p>
                  <p className="text-neutral-500 text-xs">{option.description}</p>
                </div>
                <button
                  onClick={() => option.onChange(!option.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${option.value ? 'bg-orange-500' : 'bg-neutral-300'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${option.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Other</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <button className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Language</p>
                <p className="text-neutral-500 text-xs mt-1">English</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button 
              onClick={() => handleShowPolicy('Privacy Policy')}
              disabled={policyLoading}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Privacy Policy</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
            <button 
              onClick={() => handleShowPolicy('Terms & Conditions')}
              disabled={policyLoading}
              className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              <div className="flex-1 text-left">
                <p className="text-neutral-900 text-sm font-medium">Terms & Conditions</p>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* App Version */}
        <div className="mt-4 text-center">
          <p className="text-neutral-400 text-xs">App Version 1.0.0</p>
        </div>
      </div>
      <DeliveryBottomNav />

      {/* Policy Modal */}
      {showPolicyModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 duration-500">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-orange-500 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedPolicy.title}</h3>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto text-neutral-600">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                {selectedPolicy.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex justify-end bg-neutral-50">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-8 py-2.5 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

