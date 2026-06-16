export interface AppConfig {
    deliveryFee: number;
    freeDeliveryThreshold: number;
    platformFee: number;
    taxes: {
        gst: number;
    };
    estimatedDeliveryTime: string;
    contactEmail?: string;
    contactPhone?: string;
}

import api from './api/config';

// Default configuration (fallback)
const defaultConfig: AppConfig = {
    deliveryFee: 40,
    freeDeliveryThreshold: 199,
    platformFee: 2,
    taxes: {
        gst: 18
    },
    estimatedDeliveryTime: '24 minutes'
};

import { useState, useEffect } from 'react';

/**
 * Get application configuration from backend
 */
export const getAppConfig = async (): Promise<AppConfig> => {
    try {
        const response = await api.get<{ success: boolean, data: AppConfig }>('/customer/config');
        if (response.data.success && response.data.data) {
            // Update global fallback
            appConfig = response.data.data;
            return response.data.data;
        }
        return defaultConfig;
    } catch (error) {
        console.error("Failed to fetch app config, using defaults", error);
        return defaultConfig;
    }
};

// Global config object that will be updated once fetched (legacy/fallback support)
export let appConfig = defaultConfig;

/**
 * Hook to use dynamic app config in React components
 */
export const useAppConfig = () => {
    const [config, setConfig] = useState<AppConfig>(appConfig);
    const [loading, setLoading] = useState(appConfig === defaultConfig);

    useEffect(() => {
        let isMounted = true;
        
        getAppConfig().then(newConfig => {
            if (isMounted) {
                setConfig(newConfig);
                setLoading(false);
            }
        });

        return () => { isMounted = false; };
    }, []);

    return { config, loading };
};
