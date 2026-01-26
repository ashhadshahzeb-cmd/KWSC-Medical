import { useState, useEffect } from "react";
import { Save, RotateCcw, ArrowRight, ArrowLeft, Search, FileText, CheckCircle, Printer, AlertTriangle } from "lucide-react";
import { apiCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTreatment } from "@/contexts/TreatmentContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { sqlApi, type TreatmentRecord } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { FieldCustomizer } from "@/components/admin/FieldCustomizer";
import { PDFDownloadLink } from "@react-pdf/renderer";
import TreatmentSlip from "@/components/reports/TreatmentSlip";
import { MedicineSuggestionInput } from "@/components/medicine/MedicineSuggestionInput";

const NoteSheet = () => {
    const navigate = useNavigate();
    const { user, isAdmin, customFields } = useAuth();

    const moduleName = "NoteSheet";
    const moduleFields = customFields.filter(f => f.module_name === moduleName);

    const {
        employee,
        items,
        store,
        medicineAmount,
        setEmployee,
        updateItem,
        setStore,
        setMedicineAmount,
        clearSession,
        goToDetailsStep,
        qrCode,
        commitSession,
    } = useTreatment();

    const [id, setId] = useState("");
    const [empNo, setEmpNo] = useState("");
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<TreatmentRecord[]>([]);
    const [lastSavedRecord, setLastSavedRecord] = useState<TreatmentRecord | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [policyAlert, setPolicyAlert] = useState<any>(null);

    useEffect(() => {
        if (empNo.length >= 3) {
            checkPolicy();
        } else {
            setPolicyAlert(null);
        }
    }, [empNo, medicineAmount]);

    const checkPolicy = async () => {
        try {
            const data = await apiCall(`/policy/check/${empNo}`);
            // Add current session amount to spent
            const totalSpent = (data.spent || 0) + (medicineAmount || 0);
            const isExceeded = totalSpent > data.limit;

            setPolicyAlert({
                ...data,
                spent: totalSpent,
                isExceeded
            });
        } catch (err) {
            console.error("Policy check failed", err);
        }
    };

    // Initialize from context
    useEffect(() => {
        if (employee) {
            setEmpNo(employee.empNo);
        }
    }, [employee]);

    useEffect(() => {
        if (user) loadRecords();
    }, [user]);

    useEffect(() => {
        if (empNo.length >= 3 && !employee) {
            handleValidate();
        } else if (empNo.length === 0 && employee) {
            clearSession();
        }
    }, [empNo, employee]);

    const loadRecords = async () => {
        try {
            const params: any = { treatmentType: 'NoteSheet', limit: 50 };

            if (!isAdmin && (user as any)?.empNo) {
                params.empNo = (user as any).empNo;
            }

            const data = await sqlApi.treatment.getRecords(params);
            setRecords(data);
        } catch (error) {
            console.error("Failed to load records", error);
        }
    };

    const handleValidate = async () => {
        if (!empNo) return;
        setLoading(true);
        await setEmployee({ empNo, name: "" }); // Re-validate to get updated cycle info
        setLoading(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await commitSession('NoteSheet');
            if (result && result.success) {
                const tempRecord: TreatmentRecord = {
                    Serial_no: 0,
                    Emp_no: empNo,
                    Emp_name: employee?.name || "Patient",
                    Visit_Date: new Date().toISOString(),
                    Patient_name: employee?.name || "Patient",
                    Treatment: 'NoteSheet',
                    Qr_code: result.qrCode || "",
                    Store: store,
                    Medicine_amount: medicineAmount,
                    Allow_month: employee?.allowMonth,
                    Cycle_no: employee?.cycleNo,
                    ...items.reduce((acc, item, i) => ({
                        ...acc,
                        [`Medicine${i + 1}`]: item.name,
                        [`Price${i + 1}`]: item.price,
                    }), {}),
                };
                setLastSavedRecord(tempRecord);
                setShowSummary(true);
            }
            await loadRecords();
        } catch (error) {
            console.error("Save failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        clearSession();
        setEmpNo("");
        setShowSummary(false);
        setLastSavedRecord(null);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-display font-bold text-sky-700 flex items-center gap-3">
                        <span className="p-2 bg-sky-100 rounded-lg"><FileText className="h-8 w-8 text-sky-600" /></span>
                        Note Sheet Entry
                    </h1>
                    <p className="text-slate-500 text-sm">Manage cycle-based note sheet items and allowances</p>
                </div>
                <div className="flex gap-2">
                    <FieldCustomizer moduleName={moduleName} />
                    <Button variant="outline" onClick={() => navigate("/employee-entry")} className="border-sky-200 text-sky-700 hover:bg-sky-50">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Entry
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Metadata */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-t-4 border-sky-600 shadow-lg bg-card">
                        <CardHeader className="bg-muted/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <CardTitle className="text-sm font-bold text-sky-800 uppercase tracking-wider">Employee Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">

                            {/* Dynamic Fields */}
                            {moduleFields.length > 0 && (
                                <div className="space-y-4 mb-4 p-3 bg-slate-50 border border-sky-100 rounded-lg">
                                    <Label className="text-xs font-bold text-sky-700 uppercase">Custom Fields</Label>
                                    {moduleFields.map(field => (
                                        <div key={field.id} className="space-y-1">
                                            <Label className="text-slate-500 text-xs">{field.label}</Label>
                                            <Input
                                                type={field.field_type === 'number' ? 'number' : 'text'}
                                                className="h-8 border-sky-200"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-sky-900 font-semibold text-xs uppercase">Search ID / Emp No</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={empNo}
                                        onChange={(e) => setEmpNo(e.target.value)}
                                        placeholder="Enter Employee No"
                                        className="border-sky-200 focus:ring-sky-500 transition-all font-mono"
                                    />
                                    <Button onClick={handleValidate} disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Policy Alert */}
                            {policyAlert && (
                                <div className={`p-3 rounded-lg border text-sm ${policyAlert.isExceeded
                                        ? 'bg-red-50 border-red-200 text-red-800'
                                        : 'bg-green-50 border-green-200 text-green-800'
                                    }`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold uppercase text-xs">{policyAlert.rank} Limit</span>
                                        <span className="font-mono">{policyAlert.isExceeded ? 'Exceeded' : 'Active'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span>Limit: {policyAlert.limit.toLocaleString()}</span>
                                        <span>Spent: {policyAlert.spent.toLocaleString()}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/10 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className={`h-full ${policyAlert.isExceeded ? 'bg-red-500' : 'bg-green-500'}`}
                                            style={{ width: `${Math.min(100, (policyAlert.spent / policyAlert.limit) * 100)}%` }}
                                        />
                                    </div>
                                    {policyAlert.isExceeded && (
                                        <p className="mt-2 text-xs font-bold flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Policy Violated: Annual Limit Exceeded
                                        </p>
                                    )}
                                </div>
                            )}

                            <Separator className="bg-slate-100" />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">Employee Name</Label>
                                    <div className="font-medium text-slate-800 truncate h-6">{employee?.name || "-"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">Patient Name</Label>
                                    <div className="font-medium text-slate-800 truncate h-6">{(employee as any)?.patientName || "Self"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">Allow Month</Label>
                                    <div className="font-bold text-sky-600 h-6">{employee?.allowMonth || "-"}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-xs">Cycle No</Label>
                                    <div className="font-bold text-sky-600 h-6">{employee?.cycleNo || "-"}</div>
                                </div>
                            </div>

                            <Separator className="bg-slate-100" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sky-900 font-semibold text-xs uppercase">Selected Store</Label>
                                    <Select value={store} onValueChange={setStore}>
                                        <SelectTrigger className="border-sky-200 bg-slate-50">
                                            <SelectValue placeholder="Select Store" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Dvago">Dvago</SelectItem>
                                            <SelectItem value="Faisal Medical">Faisal Medical</SelectItem>
                                            <SelectItem value="Dow">Dow</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sky-900 font-semibold text-xs uppercase">Total Amount</Label>
                                    <Input
                                        type="number"
                                        value={medicineAmount || ""}
                                        onChange={(e) => setMedicineAmount(parseFloat(e.target.value) || 0)}
                                        className="border-sky-200 dark:border-sky-800 text-lg font-bold text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-900/20"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-sky-100 shadow-md bg-sky-50/50">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-2 gap-3">
                                <Button onClick={handleSave} disabled={loading} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold shadow-md">
                                    <Save className="mr-2 h-4 w-4" /> SAVE
                                </Button>
                                <Button onClick={handleReset} variant="outline" className="w-full border-sky-200 text-sky-700 hover:bg-sky-100 font-bold shadow-sm bg-white">
                                    <RotateCcw className="mr-2 h-4 w-4" /> RESET
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div >

                {/* Right Column: Items */}
                < div className="lg:col-span-8 space-y-6" >
                    <Card className="shadow-lg border-sky-100 dark:border-sky-900 bg-card min-h-[500px] flex flex-col">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-sky-800 uppercase tracking-wider">Note Sheet Items</CardTitle>
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">10 Rows Fixed</span>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 relative">
                            {showSummary && qrCode ? (
                                <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-8 space-y-6 animate-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle className="h-10 w-10 text-green-600" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-2xl font-bold text-sky-900">Note Sheet Saved!</h3>
                                        <p className="text-slate-500">The record has been permanently added to system</p>
                                    </div>
                                    <div className="p-4 bg-white border-2 border-sky-100 rounded-xl shadow-lg">
                                        <img src={qrCode} alt="QR Code" className="w-40 h-40" />
                                    </div>
                                    <div className="flex gap-4 w-full max-w-sm">
                                        {lastSavedRecord && (
                                            <PDFDownloadLink
                                                document={<TreatmentSlip data={lastSavedRecord} />}
                                                fileName={`NoteSheet_${lastSavedRecord.Emp_no}.pdf`}
                                                className="flex-1"
                                            >
                                                {({ loading: pdfLoading }) => (
                                                    <Button className="w-full bg-sky-600 hover:bg-sky-700 h-12">
                                                        <Printer className="mr-2 h-5 w-5" />
                                                        {pdfLoading ? "Generating..." : "Print Slip"}
                                                    </Button>
                                                )}
                                            </PDFDownloadLink>
                                        )}
                                        <Button onClick={handleReset} variant="outline" className="flex-1 border-sky-200 h-12">New Entry</Button>
                                    </div>
                                </div>
                            ) : null}
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-slate-100 bg-slate-50/50">
                                        <TableHead className="w-[10%] text-center font-bold text-sky-900">#</TableHead>
                                        <TableHead className="w-[60%] font-bold text-sky-900">Item Name / Medicine</TableHead>
                                        <TableHead className="w-[30%] font-bold text-sky-900 text-right">Price / Quantity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 10 }).map((_, i) => (
                                        <TableRow key={i} className="hover:bg-sky-50/30 transition-colors border-slate-100">
                                            <TableCell className="text-center font-medium text-slate-500">{i + 1}</TableCell>
                                            <TableCell>
                                                <MedicineSuggestionInput
                                                    value={items[i]?.name || ""}
                                                    onChange={(name, price) => updateItem(i, name, price || items[i]?.price || 0)}
                                                    className="h-9 border-slate-200 focus:border-sky-400 focus:ring-sky-100 bg-transparent"
                                                    placeholder={`Item ${i + 1}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={items[i]?.price || 0}
                                                    onChange={(e) => updateItem(i, items[i]?.name || "", parseFloat(e.target.value) || 0)}
                                                    className="h-9 border-slate-200 focus:border-sky-400 focus:ring-sky-100 bg-transparent text-right font-mono"
                                                    placeholder="0"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="border rounded-xl shadow-sm overflow-hidden bg-card border-sky-100 dark:border-sky-900">
                        <div className="bg-sky-50 px-4 py-3 border-b border-sky-100 flex items-center gap-2">
                            <Search className="h-4 w-4 text-sky-600" />
                            <h3 className="font-bold text-sky-800 text-sm uppercase">Recent Note Sheets</h3>
                        </div>
                        <div className="max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="text-xs font-bold text-slate-600">ID</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-600">Employee</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-600">Month</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-600">Store</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-600 text-right">Amount</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-600 text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map(rec => (
                                        <TableRow key={rec.Serial_no} className="hover:bg-slate-50">
                                            <TableCell className="text-xs font-mono">{rec.Serial_no}</TableCell>
                                            <TableCell className="text-xs font-bold text-sky-900">{rec.Emp_name}</TableCell>
                                            <TableCell className="text-xs text-slate-600 font-medium">{rec.Allow_month} ({rec.Cycle_no})</TableCell>
                                            <TableCell className="text-xs text-slate-600 italic font-medium">{rec.Store}</TableCell>
                                            <TableCell className="text-xs font-bold text-sky-800 text-right">{rec.Medicine_amount}</TableCell>
                                            <TableCell className="text-right">
                                                <PDFDownloadLink
                                                    document={<TreatmentSlip data={rec} />}
                                                    fileName={`NoteSheet_${rec.Serial_no}.pdf`}
                                                >
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-sky-600 hover:bg-sky-50">
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                </PDFDownloadLink>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default NoteSheet;
