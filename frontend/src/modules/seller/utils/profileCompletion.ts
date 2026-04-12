export interface MissingField {
  id: string;
  label: string;
  tab: string;
}

export const calculateProfileCompletion = (seller: any) => {
  const requirements = [
    // Identity
    { id: 'logo', label: 'Store Logo', tab: 'branding', check: (s: any) => !!s.logo },
    { id: 'profile', label: 'Owner Photo', tab: 'profile', check: (s: any) => !!s.profile },
    
    // Store Info
    { id: 'storeDescription', label: 'Store Description', tab: 'branding', check: (s: any) => !!s.storeDescription && s.storeDescription.length > 20 },
    { id: 'storeBanner', label: 'Store Banner', tab: 'branding', check: (s: any) => !!s.storeBanner },
    
    // Location
    { id: 'address', label: 'Store Address', tab: 'store', check: (s: any) => !!s.address || !!s.searchLocation },
    { id: 'coordinates', label: 'Map Location', tab: 'store', check: (s: any) => !!s.latitude && !!s.longitude },
    
    // Payments
    { id: 'bankDetails', label: 'Bank Account Info', tab: 'bank', check: (s: any) => !!s.accountNumber && !!s.ifsc },
    
    // Legal
    { id: 'taxInfo', label: 'Tax/PAN Details', tab: 'bank', check: (s: any) => !!s.panCard || !!s.taxNumber },
    { id: 'idProof', label: 'Identity Documents', tab: 'profile', check: (s: any) => !!s.idProof },
    
    // Operations
    { id: 'workingHours', label: 'Working Hours', tab: 'hours', check: (s: any) => {
      const wh = s.workingHours;
      return wh && !!wh.open && !!wh.close && Array.isArray(wh.workingDays) && wh.workingDays.length > 0;
    }},
  ];

  const missing: MissingField[] = [];
  let completedCount = 0;

  requirements.forEach(req => {
    if (req.check(seller)) {
      completedCount++;
    } else {
      missing.push({ id: req.id, label: req.label, tab: req.tab });
    }
  });

  const percentage = Math.round((completedCount / requirements.length) * 100);

  return {
    percentage,
    missing,
    isComplete: percentage === 100
  };
};
