import useSWR from 'swr';
import { apiFetch } from '@/lib/api';

/**
 * Hook to fetch HMO outstanding balance
 * Note: This might need to be calculated from the main HMO financials endpoint
 * or there might be a specific outstanding endpoint
 * 
 * @param {number} facilityId - The facility ID
 * @param {number} hmoId - The HMO ID
 * @param {Object} dateRange - Date range { start, end }
 * @returns {Object} SWR response with data, error, isLoading, mutate
 */
export function useHMOOutstanding(facilityId, hmoId, dateRange = {}) {
  // Ensure facilityId and hmoId are numbers, not objects
  const validFacilityId = typeof facilityId === 'object' ? facilityId?.id : facilityId;
  const validHmoId = typeof hmoId === 'object' ? hmoId?.id : hmoId;
  
  const params = new URLSearchParams();
  if (dateRange.start) params.set('start', dateRange.start);
  if (dateRange.end) params.set('end', dateRange.end);
  
  const queryString = params.toString();
  const url = validFacilityId && validHmoId
    ? `/facilities/${validFacilityId}/hmos/${validHmoId}/${queryString ? `?${queryString}` : ''}`
    : null;

  const { data, error, mutate } = useSWR(
    url,
    async (url) => {
      const response = await apiFetch(url);
      // Extract outstanding from summary if it exists
      return {
        summary: {
          total_outstanding: response?.summary?.outstanding || 0,
        },
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    data,
    error,
    isLoading: !error && !data && url !== null,
    mutate,
  };
}