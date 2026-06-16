import { useState, useEffect } from 'react';
import { getPolicies, updatePolicy, createPolicy } from '../../../services/api/admin/adminContentService';
import { useToast } from '../../../context/ToastContext';

type PolicyType = 'Privacy Policy' | 'Terms & Conditions';

export default function AdminDeliveryAppPolicy() {
  const [selectedType, setSelectedType] = useState<PolicyType>('Privacy Policy');
  const [policyContent, setPolicyContent] = useState('');
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    fetchPolicy(selectedType);
  }, [selectedType]);

  const fetchPolicy = async (type: PolicyType) => {
    try {
      setFetching(true);
      const response = await getPolicies({ type: 'delivery' });
      if (response.success && response.data) {
        const policy = response.data.find(p => p.title === type);
        if (policy) {
          setPolicyContent(policy.content);
          setPolicyId(policy._id);
        } else {
          setPolicyContent('');
          setPolicyId(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch policy:', err);
      showToast('Failed to load policy content', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (policyId) {
        await updatePolicy(policyId, {
          content: policyContent,
          title: selectedType,
        });
      } else {
        const response = await createPolicy({
          type: 'delivery',
          title: selectedType,
          content: policyContent,
          version: '1.0.0',
          isActive: true
        });
        if (response.success && response.data) {
          setPolicyId(response.data._id);
        }
      }
      showToast(`${selectedType} updated successfully!`, 'success');
    } catch (err) {
      showToast('Failed to update policy', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Delivery App Policies</h1>
            <p className="text-sm text-neutral-500 mt-1">Manage Privacy Policy and Terms & Conditions for Riders</p>
          </div>
          <div className="text-sm text-neutral-600">
            <span className="text-blue-600">Home</span> / <span className="text-neutral-900">Delivery Policies</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50">
        <div className="max-w-4xl mx-auto">
          {/* Policy Type Selector */}
          <div className="flex gap-2 mb-6">
            {(['Privacy Policy', 'Terms & Conditions'] as PolicyType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedType === type
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-teal-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {fetching ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Policy Content Section */}
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                <div className="bg-teal-600 px-4 sm:px-6 py-3">
                  <h2 className="text-white text-lg font-semibold">{selectedType} Content</h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div>
                    <label className="block text-sm font-bold text-neutral-800 mb-2">
                      Policy URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      name="policyContent"
                      value={policyContent}
                      onChange={(e) => setPolicyContent(e.target.value)}
                      placeholder={`Enter ${selectedType} URL (e.g., https://example.com/policy)`}
                      required
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setPolicyContent('')}
                  className="px-6 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-2.5 rounded-lg text-base font-medium transition-colors shadow-lg shadow-teal-600/20 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : `Update ${selectedType}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
