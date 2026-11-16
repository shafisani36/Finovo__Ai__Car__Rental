import { apiClient } from '../api/client';

/**
 * Downloads a protected file (for example a signed rental agreement PDF) with the user's session
 * and hands it to the browser as a normal file download.
 */
export async function downloadProtectedFile(endpoint: string, fileName: string): Promise<void> {
  const blob = await apiClient.get<Blob>(endpoint, { responseType: 'blob', timeoutMs: 30000 });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the browser a moment to start the download before the link is released
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
