export function getApiBaseUrl(): string {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return `${import.meta.env.VITE_SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/api`;
}
