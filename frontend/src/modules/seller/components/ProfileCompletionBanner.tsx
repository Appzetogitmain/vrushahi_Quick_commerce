import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface MissingField {
  id: string;
  label: string;
  tab: string;
}

interface ProfileCompletionBannerProps {
  percentage: number;
  missingFields: MissingField[];
}

const ProfileCompletionBanner = ({ percentage, missingFields }: ProfileCompletionBannerProps) => {
  const navigate = useNavigate();

  if (percentage === 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden bg-white border border-neutral-200 rounded-2xl shadow-sm mb-6"
    >
      {/* Background Accent Gradient */}
      <div 
        className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-teal-600/5 to-transparent pointer-events-none" 
      />
      
      <div className="p-4 sm:p-6 flex flex-col md:flex-row items-center gap-6">
        {/* Circular Progress (Visual) */}
        <div className="relative flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-neutral-100"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - percentage / 100)}
              className="text-teal-600 transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-neutral-800">{percentage}%</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 text-center md:text-left space-y-2">
          <h2 className="text-xl font-bold text-neutral-800">
            {percentage < 50 ? 'Boost Your Store Presence!' : 'Almost There!'}
          </h2>
          <p className="text-sm text-neutral-500 max-w-lg">
            Complete your profile to build trust with customers and unlock all store features. 
            Missing: <span className="font-semibold text-neutral-700">
              {missingFields.slice(0, 3).map(f => f.label).join(', ')}
              {missingFields.length > 3 && ` +${missingFields.length - 3} more`}
            </span>
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate('/seller/account-settings')}
          className="w-full md:w-auto px-6 py-3 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all flex items-center justify-center gap-2 group"
        >
          Complete Profile
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
      
      {/* Progress Bar (Bottom) */}
      <div className="h-1 w-full bg-neutral-100">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-teal-600"
        />
      </div>
    </motion.div>
  );
};

export default ProfileCompletionBanner;
