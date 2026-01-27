// API Client for SQL Server Backend
// API Client for SQL Server Backend
const API_BASE = import.meta.env.PROD
    ? '/api'
    : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

// Helper function for API calls
export async function apiCall(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'API request failed');
    }

    return data;
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authApi = {
    registerDevice: async (masterKey: string) => {
        return apiCall('/auth/register-device', {
            method: 'POST',
            body: JSON.stringify({ masterKey }),
        });
    },

    validateDevice: async (deviceToken: string) => {
        return apiCall('/auth/validate-device', {
            method: 'POST',
            body: JSON.stringify({ deviceToken }),
        });
    },

    login: async (email: string, password: string, deviceToken?: string) => {
        return apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, deviceToken }),
        });
    },

    sendOTP: async (email: string) => {
        return apiCall('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    verifyOTP: async (email: string, code: string) => {
        return apiCall('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        });
    },

    signup: async (userData: { email: string; password: string; fullName: string; empNo?: string; otpCode?: string }) => {
        return apiCall('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    },
};

// ============================================================================
// TREATMENT API
// ============================================================================

export interface TreatmentItem {
    name: string;
    price: number;
}

export interface Employee {
    id?: string;
    empNo: string;
    name: string;
    cycleNo?: string;
    allowMonth?: string;
    bookNo?: string;
    patientType?: string;
    patientNic?: string;
    reference?: string;
    vendor?: string;
    store?: string;
    invoiceNo?: string;
    description?: string;
    medicineAmount?: number;
}

export interface CommitSessionData {
    treatmentType: string;
    employee: {
        empNo: string;
        name: string;
    };
    items: { name: string; price: number }[];
    labName?: string;
    hospitalName?: string;
    hospitalType?: string;
    bookNo?: string;
    patientType?: string;
    patientNic?: string;
    reference?: string;
    vendor?: string;
    store?: string;
    invoiceNo?: string;
    description?: string;
}

export interface TreatmentPayload {
    treatmentType: 'Medicine' | 'Lab' | 'Hospital' | 'NoteSheet';
    employee: Employee;
    items: TreatmentItem[];
    labName?: string;
    hospitalName?: string;
    hospitalType?: 'OPD' | 'IPD';
    store?: string;
    invoiceNo?: string;
    description?: string;
    medicineAmount?: number;
}

export interface TreatmentRecord {
    Serial_no: number;
    Treatment: string;
    Emp_no: string;
    Emp_name: string;
    Visit_Date: string;
    Patient_name: string;
    Qr_code: string;
    Medicine1?: string; Price1?: number;
    Medicine2?: string; Price2?: number;
    Medicine3?: string; Price3?: number;
    Medicine4?: string; Price4?: number;
    Medicine5?: string; Price5?: number;
    Medicine6?: string; Price6?: number;
    Medicine7?: string; Price7?: number;
    Medicine8?: string; Price8?: number;
    Medicine9?: string; Price9?: number;
    Medicine10?: string; Price10?: number;
    Lab_name?: string;
    Hospital_name?: string;
    Hospital_Type?: string;
    Opd_Ipd?: string;
    Allow_month?: string;
    Cycle_no?: string;
    Store?: string;
    Book_no?: string;
    Invoice_no?: string;
    Description?: string;
    Medicine_amount?: number;
}

export const treatmentApi = {
    validateCycle: async (empNo: string, visitDate: string) => {
        return apiCall('/treatment/validate-cycle', {
            method: 'POST',
            body: JSON.stringify({ empNo, visitDate }),
        });
    },

    getRecords: async (params?: {
        treatmentType?: string;
        page?: number;
        limit?: number;
        empNo?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        const queryParams = new URLSearchParams();
        if (params?.treatmentType) queryParams.append('type', params.treatmentType);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.empNo) queryParams.append('empNo', params.empNo);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);

        const query = queryParams.toString();
        return apiCall(`/treatment/records${query ? `?${query}` : ''}`);
    },

    getRecordById: async (serialNo: number): Promise<TreatmentRecord> => {
        return apiCall(`/treatment/records/${serialNo}`);
    },

    commit: async (payload: TreatmentPayload) => {
        return apiCall('/treatment/commit', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
};

// ============================================================================
// SETUP API
// ============================================================================

export const setupApi = {
    createLegacySchema: async () => {
        return apiCall('/setup/legacy-schema', {
            method: 'POST',
        });
    },

    checkHealth: async () => {
        return apiCall('/health');
    },

    getTables: async () => {
        return apiCall('/tables');
    },
};

// ============================================================================
// PATIENTS API (Legacy Support)
// ============================================================================

export const patientsApi = {
    getAll: async () => {
        return apiCall('/patients');
    },

    getById: async (id: number) => {
        return apiCall(`/patients/${id}`);
    },

    create: async (patientData: {
        empNo: string;
        name: string;
        bookNo: string;
        cnic: string;
        phone: string;
        patientType: string;
        custom_fields: Record<string, string>;
    }) => {
        return apiCall('/patients', {
            method: 'POST',
            body: JSON.stringify(patientData),
        });
    },

    linkRFID: async (id: number, rfidTag: string) => {
        return apiCall(`/patients/${id}/link-card`, {
            method: 'POST',
            body: JSON.stringify({ rfidTag }),
        });
    },

    getByRFID: async (tag: string) => {
        return apiCall(`/patients/by-tag/${tag}`);
    },
};

// ============================================================================
// USERS MANAGEMENT API
// ============================================================================

export const usersApi = {
    getAll: async () => {
        return apiCall('/users');
    },

    updateRole: async (id: number | string, role: string) => {
        return apiCall(`/users/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        });
    },
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export const notificationsApi = {
    getAll: async () => {
        return apiCall('/notifications');
    },

    markAsRead: async (id: number) => {
        return apiCall(`/notifications/${id}/read`, {
            method: 'PATCH',
        });
    },

    markAllAsRead: async () => {
        return apiCall('/notifications/read-all', {
            method: 'PATCH',
        });
    },

    deleteAll: async () => {
        return apiCall('/notifications', {
            method: 'DELETE',
        });
    },
};

// ============================================================================
// MEDICAL CARDS API
// ============================================================================

export const medicalCardsApi = {
    getByUserId: async (id: number | string) => {
        return apiCall(`/users/${id}/card`);
    },

    save: async (id: number | string, data: any) => {
        return apiCall(`/users/${id}/card`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: number | string) => {
        return apiCall(`/users/${id}/card`, {
            method: 'DELETE',
        });
    },
};

// ============================================================================
// DASHBOARD API
// ============================================================================

export const dashboardApi = {
    getStats: async () => {
        return apiCall('/dashboard/stats');
    },

    getUserStats: async (empNo: string) => {
        return apiCall(`/dashboard/user/${empNo}`);
    },
};

// ============================================================================
// MEDICINES API
// ============================================================================

export const medicinesApi = {
    getAll: async (search?: string, limit: number = 20) => {
        const query = search ? `?search=${encodeURIComponent(search)}&limit=${limit}` : `?limit=${limit}`;
        return apiCall(`/medicines${query}`);
    },

    bulkAdd: async (medicines: { name: string; price?: number; category?: string }[]) => {
        return apiCall('/medicines/bulk', {
            method: 'POST',
            body: JSON.stringify({ medicines }),
        });
    },
};

// Export all APIs
export const sqlApi = {
    auth: authApi,
    treatment: treatmentApi,
    setup: setupApi,
    patients: patientsApi,
    users: usersApi,
    notifications: notificationsApi,
    medicalCards: medicalCardsApi,
    dashboard: dashboardApi,
    medicines: medicinesApi,
};
