import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    });
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response Success:', {
      status: response.status,
      url: response.config.url,
      dataType: typeof response.data,
      dataKeys: response.data && typeof response.data === 'object' ? Object.keys(response.data) : 'not object'
    });
    return response;
  },
  (error) => {
    console.error('API Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      message: error.response?.data?.error || error.message,
      fullError: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.log('Unauthorized access detected');
      // Only redirect if not already on auth pages
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        console.log('Clearing auth data and redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) => {
    console.log('Auth API: Attempting login for:', credentials.email);
    return api.post('/auth/login', credentials);
  },
  
  register: (userData: { name: string; email: string; password: string }) => {
    console.log('Auth API: Attempting registration for:', userData.email);
    return api.post('/auth/register', userData);
  },
  
  logout: () => {
    console.log('Auth API: Logging out');
    return api.post('/auth/logout');
  },
  
  getCurrentUser: () => {
    console.log('Auth API: Getting current user');
    return api.get('/auth/me');
  },
  
  updateProfile: (profileData: any) => {
    console.log('Auth API: Updating profile');
    return api.put('/auth/profile', profileData);
  },
};

// Form API
export const formAPI = {
  getForms: () => {
    console.log('Form API: Getting all forms');
    return api.get('/forms');
  },
  
  getForm: (id: string) => {
    console.log('Form API: Getting form by ID:', id);
    return api.get(`/forms/${id}`);
  },
  
  getFormByShareUrl: (shareUrl: string) => {
    console.log('Form API: Getting form by share URL:', shareUrl);
    return api.get(`/forms/share/${shareUrl}`);
  },
  
  createForm: (formData: any) => {
    console.log('Form API: Creating form with data:', formData);
    return api.post('/forms', formData);
  },
  
  updateForm: (id: string, formData: any) => {
    console.log('Form API: Updating form:', id);
    return api.put(`/forms/${id}`, formData);
  },
  
  deleteForm: (id: string) => {
    console.log('Form API: Deleting form:', id);
    return api.delete(`/forms/${id}`);
  },
  
  publishForm: (id: string) => {
    console.log('Form API: Publishing form:', id);
    return api.post(`/forms/${id}/publish`);
  },
  
  getAnalytics: (id: string) => {
    console.log('Form API: Getting analytics for form:', id);
    return api.get(`/forms/${id}/analytics`);
  },
  
  getRecentForms: (limit = 5) => {
    console.log('Form API: Getting recent forms, limit:', limit);
    return api.get(`/forms?limit=${limit}&sort=updatedAt`);
  },
};

// Folder API
export const folderAPI = {
  getFolders: () => {
    console.log('Folder API: Getting all folders');
    return api.get('/folders');
  },
  
  getFolder: (id: string) => {
    console.log('Folder API: Getting folder by ID:', id);
    return api.get(`/folders/${id}`);
  },
  
  createFolder: (folderData: any) => {
    console.log('Folder API: Creating folder with data:', folderData);
    return api.post('/folders', folderData);
  },
  
  updateFolder: (id: string, folderData: any) => {
    console.log('Folder API: Updating folder:', id);
    return api.put(`/folders/${id}`, folderData);
  },
  
  deleteFolder: (id: string) => {
    console.log('Folder API: Deleting folder:', id);
    return api.delete(`/folders/${id}`);
  },
  
  moveForms: (folderId: string, formIds: string[]) => {
    console.log('Folder API: Moving forms to folder:', folderId, formIds);
    return api.post(`/folders/${folderId}/move-forms`, { formIds });
  },
};

// Response API
export const responseAPI = {
  submitResponse: (responseData: any) => {
    console.log('Response API: Submitting response');
    return api.post('/responses', responseData);
  },
  
  getResponses: (formId: string, page = 1, limit = 10) => {
    console.log('Response API: Getting responses for form:', formId, 'page:', page);
    return api.get(`/responses/form/${formId}?page=${page}&limit=${limit}`);
  },
  
  getResponse: (id: string) => {
    console.log('Response API: Getting response by ID:', id);
    return api.get(`/responses/${id}`);
  },
  
  deleteResponse: (id: string) => {
    console.log('Response API: Deleting response:', id);
    return api.delete(`/responses/${id}`);
  },
};

// Export API
export const exportAPI = {
  getExportSummary: (formId: string) => {
    console.log('Export API: Getting export summary for form:', formId);
    return api.get(`/exports/summary/${formId}`);
  },
  
  downloadExcel: (formId: string) => {
    console.log('Export API: Downloading Excel for form:', formId);
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/exports/excel/${formId}`;
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = 'export.xlsx';
    link.click();
  },
  
  downloadCSV: (formId: string) => {
    console.log('Export API: Downloading CSV for form:', formId);
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/exports/csv/${formId}`;
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url;
    link.download = 'export.csv';
    link.click();
  },
};

export default api;