/**
 * Sync API Client - Service Worker Spike
 * Handles workflow data synchronization between local and central storage
 *
 * SPIKE: This is experimental code that can be easily removed
 */

import type { AuthConfig } from '../types';
import { reportApiError } from '../utils/telemetry';

export interface WorkflowMetadata {
  uid: string;
  workflowId: string;
  timestamp: number;
  version: string;
  checksum?: string;
  recordingCount?: number;
}

export interface SyncRequest {
  localWorkflows: WorkflowMetadata[];
  lastSyncTimestamp?: number;
}

export interface SyncResponse {
  updatedWorkflows: WorkflowMetadata[];
  deletedWorkflowIds: string[];
  conflicts: WorkflowMetadata[];
  nextSyncTimestamp: number;
}

export interface UploadRequest {
  workflowMetadata: WorkflowMetadata;
  recordingData?: Blob; // Optional, for future use
}

export class SyncApiClient {
  private config: AuthConfig;
  private baseUrl: string;

  constructor(config: AuthConfig) {
    this.config = config;
    this.baseUrl = config.apiBaseUrl.replace(/\/$/, '');
  }

  /**
   * Make authenticated sync API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/sync${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    // Always include auth for sync operations
    const token = this.getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await this.handleErrorResponse(response);

      reportApiError(url, options.method || 'GET', response.status, error.message, {
        endpoint,
        syncOperation: true
      });

      throw error;
    }

    return response.json();
  }

  /**
   * Handle error responses
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    try {
      const errorData = await response.json();
      return new Error(errorData.message || 'Sync operation failed');
    } catch {
      return new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Get stored access token
   */
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_access_token');
  }

  /**
   * Sync workflow metadata with server
   */
  async syncWorkflows(request: SyncRequest): Promise<SyncResponse> {
    return this.request<SyncResponse>('/workflows', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Upload workflow metadata (no PII)
   */
  async uploadWorkflow(request: UploadRequest): Promise<void> {
    // For spike: only upload metadata, no actual recording data
    const metadata = {
      uid: request.workflowMetadata.uid,
      workflowId: request.workflowMetadata.workflowId,
      timestamp: request.workflowMetadata.timestamp,
      version: request.workflowMetadata.version,
      checksum: request.workflowMetadata.checksum,
      recordingCount: request.workflowMetadata.recordingCount
    };

    await this.request<void>('/workflows/upload', {
      method: 'POST',
      body: JSON.stringify({ metadata })
    });
  }

  /**
   * Download workflow updates
   */
  async downloadWorkflows(since?: number): Promise<WorkflowMetadata[]> {
    const params = since ? `?since=${since}` : '';
    return this.request<WorkflowMetadata[]>(`/workflows/download${params}`, {
      method: 'GET'
    });
  }

  /**
   * Check server connectivity
   */
  async ping(): Promise<{ status: 'ok'; timestamp: number }> {
    return this.request<{ status: 'ok'; timestamp: number }>('/ping', {
      method: 'GET'
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    lastSync: number;
    pendingUploads: number;
    pendingDownloads: number;
  }> {
    return this.request<{
      lastSync: number;
      pendingUploads: number;
      pendingDownloads: number;
    }>('/status', {
      method: 'GET'
    });
  }
}
