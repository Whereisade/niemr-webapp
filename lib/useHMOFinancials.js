import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

/**
 * Hook to fetch HMO financial data (charges, payments, patients)
 * Uses the facility-scoped HMO endpoint: /api/facilities/{facilityId}/hmos/{hmoId}/
 * 
 * PRODUCTION VERSION - No debug logging
 * 
 * @param {number} facilityId - The facility ID
 * @param {number} hmoId - The HMO ID
 * @param {Object} params - Query parameters (patient, start, end, status)
 * @returns {Object} SWR response with data, error, isLoading, mutate
 */
export function useHMOFinancials(facilityId, hmoId, params = {}) {
  // Ensure facilityId and hmoId are numbers, not objects
  const validFacilityId = typeof facilityId === 'object' ? facilityId?.id : facilityId;
  const validHmoId = typeof hmoId === 'object' ? hmoId?.id : hmoId;
  
  const queryString = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v != null && v !== '')
  ).toString();
  
  const url = validFacilityId && validHmoId
    ? `/facilities/${validFacilityId}/hmos/${validHmoId}/${queryString ? `?${queryString}` : ''}`
    : null;

  const { data, error, mutate } = useSWR(
    url,
    async (url) => {
      const response = await apiFetch(url);
      return response;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      onError: (err) => {
        console.error('Error fetching HMO financials:', {
          facilityId: validFacilityId,
          hmoId: validHmoId,
          error: err.message,
          url,
        });
      },
    }
  );

  return {
    data,
    error,
    isLoading: !error && !data && url !== null,
    mutate,
  };
}