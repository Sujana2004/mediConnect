import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import api, { apiHelpers } from '../config/api';
import toast from 'react-hot-toast';
import useLanguage from './useLanguage';

/**
 * Custom hook for API calls with TanStack Query
 * Provides standardized data fetching with caching, loading states, and error handling
 */
const useApi = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // Generic GET query hook
  const useGet = (key, url, options = {}) => {
    const {
      params = {},
      enabled = true,
      staleTime = 5 * 60 * 1000, // 5 minutes
      cacheTime = 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus = false,
      onSuccess,
      onError,
      select,
      ...restOptions
    } = options;

    return useQuery({
      queryKey: Array.isArray(key) ? key : [key, params],
      queryFn: async () => {
        const response = await api.get(url, { params });
        return response.data;
      },
      enabled,
      staleTime,
      gcTime: cacheTime,
      refetchOnWindowFocus,
      select,
      ...restOptions,
      onSuccess: (data) => {
        onSuccess?.(data);
      },
      onError: (error) => {
        console.error(`API Error [${key}]:`, error);
        onError?.(error);
      }
    });
  };

  // Generic POST mutation hook
  const usePost = (url, options = {}) => {
    const {
      onSuccess,
      onError,
      invalidateKeys = [],
      successMessage,
      errorMessage,
      ...restOptions
    } = options;

    return useMutation({
      mutationFn: async (data) => {
        return await apiHelpers.post(url, data);
      },
      onSuccess: (data, variables) => {
        // Invalidate related queries
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });

        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }

        onSuccess?.(data, variables);
      },
      onError: (error, variables) => {
        const message = errorMessage || 
                       error.response?.data?.detail || 
                       t('errors.somethingWrong');
        toast.error(message);
        onError?.(error, variables);
      },
      ...restOptions
    });
  };

  // Generic PUT mutation hook
  const usePut = (url, options = {}) => {
    const {
      onSuccess,
      onError,
      invalidateKeys = [],
      successMessage,
      errorMessage,
      ...restOptions
    } = options;

    return useMutation({
      mutationFn: async (data) => {
        return await apiHelpers.put(url, data);
      },
      onSuccess: (data, variables) => {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });

        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }

        onSuccess?.(data, variables);
      },
      onError: (error, variables) => {
        const message = errorMessage || 
                       error.response?.data?.detail || 
                       t('errors.somethingWrong');
        toast.error(message);
        onError?.(error, variables);
      },
      ...restOptions
    });
  };

  // Generic PATCH mutation hook
  const usePatch = (url, options = {}) => {
    const {
      onSuccess,
      onError,
      invalidateKeys = [],
      successMessage,
      errorMessage,
      ...restOptions
    } = options;

    return useMutation({
      mutationFn: async (data) => {
        return await apiHelpers.patch(url, data);
      },
      onSuccess: (data, variables) => {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });

        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }

        onSuccess?.(data, variables);
      },
      onError: (error, variables) => {
        const message = errorMessage || 
                       error.response?.data?.detail || 
                       t('errors.somethingWrong');
        toast.error(message);
        onError?.(error, variables);
      },
      ...restOptions
    });
  };

  // Generic DELETE mutation hook
  const useDelete = (url, options = {}) => {
    const {
      onSuccess,
      onError,
      invalidateKeys = [],
      successMessage,
      errorMessage,
      ...restOptions
    } = options;

    return useMutation({
      mutationFn: async (id) => {
        const deleteUrl = id ? `${url}${id}/` : url;
        return await apiHelpers.delete(deleteUrl);
      },
      onSuccess: (data, variables) => {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });

        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }

        onSuccess?.(data, variables);
      },
      onError: (error, variables) => {
        const message = errorMessage || 
                       error.response?.data?.detail || 
                       t('errors.somethingWrong');
        toast.error(message);
        onError?.(error, variables);
      },
      ...restOptions
    });
  };

  // File upload mutation hook
  const useUpload = (url, options = {}) => {
    const {
      onSuccess,
      onError,
      onProgress,
      invalidateKeys = [],
      successMessage,
      errorMessage,
      ...restOptions
    } = options;

    return useMutation({
      mutationFn: async ({ file, data = {} }) => {
        return await apiHelpers.upload(url, new FormData(Object.assign(
          { file },
          data
        )), onProgress);
      },
      onSuccess: (data, variables) => {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
        });

        if (successMessage) {
          toast.success(typeof successMessage === 'function' ? successMessage(data) : successMessage);
        }

        onSuccess?.(data, variables);
      },
      onError: (error, variables) => {
        const message = errorMessage || 
                       error.response?.data?.detail || 
                       t('errors.uploadFailed');
        toast.error(message);
        onError?.(error, variables);
      },
      ...restOptions
    });
  };

  // Paginated query hook
  const usePaginatedQuery = (key, url, options = {}) => {
    const {
      params = {},
      page = 1,
      pageSize = 10,
      enabled = true,
      ...restOptions
    } = options;

    return useQuery({
      queryKey: [key, { ...params, page, pageSize }],
      queryFn: async () => {
        return await apiHelpers.get(url, {
          ...params,
          page,
          page_size: pageSize
        });
      },
      enabled,
      keepPreviousData: true,
      ...restOptions
    });
  };

  // Infinite scroll query hook
  const useInfiniteQuery = (key, url, options = {}) => {
    const {
      params = {},
      pageSize = 10,
      enabled = true,
      getNextPageParam,
      ...restOptions
    } = options;

    return useQuery({
      queryKey: [key, params],
      queryFn: async ({ pageParam = 1 }) => {
        return await apiHelpers.get(url, {
          ...params,
          page: pageParam,
          page_size: pageSize
        });
      },
      enabled,
      getNextPageParam: getNextPageParam || ((lastPage) => {
        if (lastPage.next) {
          const urlObj = new URL(lastPage.next);
          return urlObj.searchParams.get('page');
        }
        return undefined;
      }),
      ...restOptions
    });
  };

  // Prefetch data
  const prefetch = useCallback(async (key, url, params = {}) => {
    await queryClient.prefetchQuery({
      queryKey: Array.isArray(key) ? key : [key, params],
      queryFn: async () => {
        return await apiHelpers.get(url, params);
      }
    });
  }, [queryClient]);

  // Invalidate queries
  const invalidate = useCallback((keys) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => {
      queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] });
    });
  }, [queryClient]);

  // Set query data manually
  const setQueryData = useCallback((key, data) => {
    queryClient.setQueryData(Array.isArray(key) ? key : [key], data);
  }, [queryClient]);

  // Get cached data
  const getQueryData = useCallback((key) => {
    return queryClient.getQueryData(Array.isArray(key) ? key : [key]);
  }, [queryClient]);

  // Clear all cache
  const clearCache = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  return {
    // Query hooks
    useGet,
    usePaginatedQuery,
    useInfiniteQuery,
    
    // Mutation hooks
    usePost,
    usePut,
    usePatch,
    useDelete,
    useUpload,
    
    // Cache utilities
    prefetch,
    invalidate,
    setQueryData,
    getQueryData,
    clearCache,
    
    // Direct API access (for non-hook usage)
    api: apiHelpers
  };
};

export default useApi;