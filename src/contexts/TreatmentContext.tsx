import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { sqlApi, type TreatmentItem, type Employee, type TreatmentPayload } from '@/lib/api';

interface TreatmentContextType {
    // Employee/Session State
    employee: Employee | null;
    items: TreatmentItem[];
    currentStep: 'employee' | 'details' | 'summary';
    qrCode: string | null;
    labName?: string;
    hospitalName?: string;
    hospitalType?: 'OPD' | 'IPD';
    bookNo?: string;
    patientType?: string;
    patientNic?: string;
    reference?: string;
    vendor?: string;
    store?: string;
    invoiceNo?: string;
    description?: string;
    medicineAmount?: number;
    allowMonth?: string;
    treatmentType?: string;

    // Actions
    setEmployee: (emp: Employee) => Promise<boolean>;
    updateItem: (index: number, name: string, price: number) => void;
    clearSession: () => void;
    commitSession: (
        type: 'Medicine' | 'Lab' | 'Hospital' | 'NoteSheet',
        additionalData?: { labName?: string; hospitalName?: string; hospitalType?: 'OPD' | 'IPD' }
    ) => Promise<{ success: boolean; serialNo?: number; qrCode?: string; error?: string } | void>;
    goToDetailsStep: () => void;
    goBackToEmployee: () => void;
    setLabName: (name: string) => void;
    setHospitalName: (name: string) => void;
    setHospitalType: (type: 'OPD' | 'IPD') => void;
    setBookNo: (bookNo: string) => void;
    setPatientType: (type: string) => void;
    setPatientNic: (nic: string) => void;
    setReference: (ref: string) => void;
    setVendor: (vendor: string) => void;
    setStore: (store: string) => void;
    setInvoiceNo: (no: string) => void;
    setDescription: (desc: string) => void;
    setMedicineAmount: (amount: number) => void;
    setTreatmentType: (type: string) => void;
}

interface SessionData {
    employee: Employee | null;
    items: TreatmentItem[];
    currentStep: 'employee' | 'details' | 'summary';
    qrCode: string | null;
    labName?: string;
    hospitalName?: string;
    hospitalType?: 'OPD' | 'IPD';
    bookNo?: string;
    patientType?: string;
    patientNic?: string;
    reference?: string;
    vendor?: string;
    store?: string;
    invoiceNo?: string;
    description?: string;
    medicineAmount?: number;
    treatmentType?: string;
}

const TreatmentContext = createContext<TreatmentContextType | undefined>(undefined);

export const TreatmentProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<SessionData>({
        employee: null,
        items: Array(10).fill(null).map(() => ({ name: '', price: 0 })),
        currentStep: 'employee',
        qrCode: null,
        labName: '',
        hospitalName: '',
        hospitalType: 'OPD',
        bookNo: '',
        patientType: '',
        patientNic: '',
        reference: '',
        vendor: '',
        store: '',
        invoiceNo: '',
        description: '',
        medicineAmount: 0,
        treatmentType: 'Medicine',
    });
    const { toast } = useToast();

    // Validate employee and set cycle info
    const setEmployee = async (emp: Employee): Promise<boolean> => {
        try {
            const visitDate = new Date().toISOString().split('T')[0];
            const validation = await sqlApi.treatment.validateCycle(emp.empNo, visitDate);

            if (!validation.allowed && !validation.valid) {
                toast({
                    title: 'Visit Restricted',
                    description: validation.message,
                    variant: 'destructive',
                });
                return false;
            }

            // Set employee with cycle info AND fetched details
            const validatedEmp = validation.employee || {};

            setSession(prev => ({
                ...prev,
                employee: {
                    ...emp,
                    ...validatedEmp, // Merge fetched details (Name, ID, etc)
                    cycleNo: validation.cycleNo,
                    allowMonth: validation.allowMonth,
                    bookNo: validatedEmp.bookNo || emp.bookNo || prev.bookNo,
                    patientType: validatedEmp.patientType || emp.patientType || prev.patientType,
                    patientNic: validatedEmp.patientNic || emp.patientNic || prev.patientNic,
                    reference: emp.reference || prev.reference,
                    vendor: emp.vendor || prev.vendor,
                    store: emp.store || prev.store,
                    invoiceNo: emp.invoiceNo || prev.invoiceNo,
                    description: emp.description || prev.description,
                    medicineAmount: emp.medicineAmount || prev.medicineAmount,
                },
                allowMonth: validation.allowMonth,
            }));

            toast({
                title: 'Employee Validated',
                description: `Cycle ${validation.cycleNo} of ${validation.allowMonth}`,
            });

            return true;
        } catch (error: any) {
            toast({
                title: 'Validation Failed',
                description: error.message,
                variant: 'destructive',
            });
            return false;
        }
    };

    const updateItem = (index: number, name: string, price: number) => {
        if (index < 0 || index >= 10) return;
        setSession(prev => {
            const newItems = [...prev.items];
            newItems[index] = { name, price };
            return { ...prev, items: newItems };
        });
    };

    const clearSession = () => {
        setSession({
            employee: null,
            items: Array(10).fill(null).map(() => ({ name: '', price: 0 })),
            currentStep: 'employee',
            qrCode: null,
            labName: '',
            hospitalName: '',
            hospitalType: 'OPD',
            bookNo: '',
            patientType: '',
            patientNic: '',
            reference: '',
            vendor: '',
            store: '',
            invoiceNo: '',
            description: '',
            medicineAmount: 0,
            treatmentType: 'Medicine',
        });
    };

    const goToDetailsStep = () => {
        if (!session.employee) {
            toast({
                title: 'Error',
                description: 'Please enter employee details first',
                variant: 'destructive',
            });
            return;
        }
        setSession(prev => ({ ...prev, currentStep: 'details' }));
    };

    const goBackToEmployee = () => {
        setSession(prev => ({ ...prev, currentStep: 'employee' }));
    };

    const setLabName = (name: string) => {
        setSession(prev => ({ ...prev, labName: name }));
    };

    const setHospitalName = (name: string) => {
        setSession(prev => ({ ...prev, hospitalName: name }));
    };

    const setHospitalType = (type: 'OPD' | 'IPD') => {
        setSession(prev => ({ ...prev, hospitalType: type }));
    };

    const setBookNo = (bookNo: string) => {
        setSession(prev => ({ ...prev, bookNo }));
    };

    const setPatientType = (type: string) => {
        setSession(prev => ({ ...prev, patientType: type }));
    };

    const setPatientNic = (nic: string) => {
        setSession(prev => ({ ...prev, patientNic: nic }));
    };

    const setReference = (ref: string) => {
        setSession(prev => ({ ...prev, reference: ref }));
    };

    const setVendor = (vendor: string) => {
        setSession(prev => ({ ...prev, vendor: vendor }));
    };

    const setStore = (store: string) => {
        setSession(prev => ({ ...prev, store }));
    };

    const setInvoiceNo = (no: string) => {
        setSession(prev => ({ ...prev, invoiceNo: no }));
    };

    const setDescription = (desc: string) => {
        setSession(prev => ({ ...prev, description: desc }));
    };

    const setMedicineAmount = (amount: number) => {
        setSession(prev => ({ ...prev, medicineAmount: amount }));
    };

    const setTreatmentType = (type: string) => {
        setSession(prev => ({ ...prev, treatmentType: type }));
    };

    const commitSession = async (
        treatmentType: 'Medicine' | 'Lab' | 'Hospital' | 'NoteSheet',
        additionalData?: { labName?: string; hospitalName?: string; hospitalType?: 'OPD' | 'IPD' }
    ) => {
        if (!session.employee) {
            toast({ title: 'Error', description: 'No employee selected', variant: 'destructive' });
            return;
        }

        // Filter out empty items
        const validItems = session.items.filter(item => item.name && item.name.trim() !== '');

        if (validItems.length === 0) {
            toast({
                title: 'Error',
                description: 'Please add at least one item',
                variant: 'destructive',
            });
            return;
        }

        try {
            const payload: TreatmentPayload = {
                treatmentType,
                employee: {
                    ...session.employee,
                    bookNo: session.bookNo || session.employee.bookNo,
                    patientType: session.patientType || session.employee.patientType,
                    patientNic: session.patientNic || session.employee.patientNic,
                    reference: session.reference || session.employee.reference,
                    vendor: session.vendor || session.employee.vendor,
                    store: session.store || session.employee.store,
                    invoiceNo: session.invoiceNo || session.employee.invoiceNo,
                    description: session.description || session.employee.description,
                    medicineAmount: session.medicineAmount || session.employee.medicineAmount,
                },
                items: validItems,
                labName: session.labName,
                hospitalName: session.hospitalName,
                hospitalType: session.hospitalType,
                store: session.store,
                invoiceNo: session.invoiceNo,
                description: session.description,
                medicineAmount: session.medicineAmount,
                ...additionalData,
            };

            const response = await sqlApi.treatment.commit(payload);

            setSession(prev => ({
                ...prev,
                qrCode: response.qrCode,
                currentStep: 'summary',
            }));

            toast({
                title: 'Success',
                description: `Treatment record saved successfully. Serial No: ${response.serialNo}`,
                className: 'bg-green-50',
            });

            return { success: true, serialNo: response.serialNo, qrCode: response.qrCode };
        } catch (error: any) {
            toast({
                title: 'Submission Failed',
                description: error.message,
                variant: 'destructive',
            });
            return { success: false, error: error.message };
        }
    };

    return (
        <TreatmentContext.Provider
            value={{
                employee: session.employee,
                items: session.items,
                currentStep: session.currentStep,
                qrCode: session.qrCode,
                labName: session.labName,
                hospitalName: session.hospitalName,
                hospitalType: session.hospitalType,
                bookNo: session.bookNo,
                patientType: session.patientType,
                patientNic: session.patientNic,
                reference: session.reference,
                vendor: session.vendor,
                store: session.store,
                invoiceNo: session.invoiceNo,
                description: session.description,
                allowMonth: session.employee?.allowMonth,
                setEmployee,
                updateItem,
                clearSession,
                commitSession,
                goToDetailsStep,
                goBackToEmployee,
                setLabName,
                setHospitalName,
                setHospitalType,
                setBookNo,
                setPatientType,
                setPatientNic,
                setReference,
                setVendor,
                setStore,
                setInvoiceNo,
                setDescription,
                setMedicineAmount,
                setTreatmentType,
                treatmentType: session.treatmentType
            }}
        >
            {children}
        </TreatmentContext.Provider>
    );
};

export const useTreatment = () => {
    const context = useContext(TreatmentContext);
    if (!context) throw new Error('useTreatment must be used within a TreatmentProvider');
    return context;
};
