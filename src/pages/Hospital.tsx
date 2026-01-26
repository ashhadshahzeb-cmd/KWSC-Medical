import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RotateCcw, Save, Edit, Trash2, Printer, QrCode, ArrowRight, ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useTreatment } from "@/contexts/TreatmentContext";
import { sqlApi, type TreatmentRecord } from "@/lib/api";
import { PDFDownloadLink } from "@react-pdf/renderer";
import TreatmentSlip from "@/components/reports/TreatmentSlip";

const Hospital = () => {
  const { toast } = useToast();
  const {
    employee,
    items,
    currentStep,
    qrCode,
    hospitalName,
    hospitalType,
    invoiceNo,
    description,
    setEmployee,
    updateItem,
    clearSession,
    commitSession,
    goToDetailsStep,
    goBackToEmployee,
    setHospitalName,
    setHospitalType,
    setInvoiceNo,
    setDescription,
  } = useTreatment();

  const [empNo, setEmpNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<TreatmentRecord[]>([]);
  const [lastSavedRecord, setLastSavedRecord] = useState<TreatmentRecord | null>(null);

  const labLabels = ["Lab-Test", "Lab2", "Lab3", "Lab4", "MRI", "CT-Scan", "Physio"];

  useEffect(() => {
    loadRecords();
  }, []);

  // Auto-generate invoice
  useEffect(() => {
    if (!invoiceNo) {
      const date = new Date();
      const random = Math.floor(1000 + Math.random() * 9000);
      const newInvoice = `INV-${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${random}`;
      setInvoiceNo(newInvoice);
    }
  }, []);

  const loadRecords = async () => {
    try {
      const data = await sqlApi.treatment.getRecords({ treatmentType: 'Hospital', limit: 50 });
      setRecords(data);
    } catch (error) {
      console.error("Failed to load records", error);
    }
  };

  const handleValidate = async () => {
    if (!empNo) return;
    setLoading(true);
    await setEmployee({ empNo, name: "" });
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await commitSession('Hospital');
      if (result && result.success) {
        const tempRecord: TreatmentRecord = {
          Serial_no: 0,
          Emp_no: empNo,
          Emp_name: employee?.name || "Patient",
          Visit_Date: new Date().toISOString(),
          Patient_name: employee?.name || "Patient",
          Treatment: 'Hospital',
          Qr_code: result.qrCode || "",
          Book_no: employee?.bookNo,
          Hospital_name: hospitalName,
          Opd_Ipd: hospitalType,
          Description: description,
          ...items.reduce((acc, item, i) => ({
            ...acc,
            [`Medicine${i + 1}`]: item.name,
            [`Price${i + 1}`]: item.price,
          }), {}),
        };
        setLastSavedRecord(tempRecord);
      }
      await loadRecords();
    } catch (error) {
      // Handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-4">
      <div className="flex items-center justify-between border-b pb-4 bg-sky-600 p-4 rounded-t-lg shadow-md">
        <h1 className="text-2xl font-bold text-white tracking-wider flex items-center">
          <FlaskConical className="mr-3" /> HOSPITAL & LABORATORY SYSTEM
        </h1>
        <div className="flex gap-2">
          <Button onClick={clearSession} variant="outline" className="bg-white text-sky-700 hover:bg-sky-50 border-none font-bold">
            <RotateCcw className="mr-2 h-4 w-4" /> RESET
          </Button>
        </div>
      </div>

      <Card className="p-6 border-2 border-sky-100 dark:border-sky-900 shadow-2xl bg-card relative overflow-hidden">
        <div className="grid grid-cols-12 gap-8">

          {/* Left Column: Test Names */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <h3 className="text-sky-700 font-bold italic mb-4 border-b border-sky-200 pb-2">Tests</h3>
            {labLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <Label className="w-24 text-sky-800 font-medium text-sm">{label}</Label>
                <Input
                  value={items[i]?.name || ""}
                  onChange={(e) => updateItem(i, e.target.value, items[i]?.price || 0)}
                  className="h-8 border-sky-200 focus:border-sky-500 bg-background"
                />
              </div>
            ))}
          </div>

          {/* Center Column: Employee & Metadata */}
          <div className="col-span-12 lg:col-span-6 space-y-6 px-4 border-l border-r border-sky-100">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">ID</Label>
                <div className="flex flex-1 gap-2">
                  <Input value={(employee as any)?.id || ""} readOnly className="h-8 border-sky-300 bg-muted" />
                  <Button className="h-8 bg-sky-600 hover:bg-sky-700 font-bold px-4 text-xs">Search</Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Employee No</Label>
                <div className="flex flex-1 gap-2">
                  <Input
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    className="h-8 border-sky-500 bg-background"
                  />
                  <Button onClick={handleValidate} disabled={loading} className="h-8 bg-sky-600 hover:bg-sky-700 font-bold px-4 text-xs">Details</Button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Emp Name</Label>
                <Input value={employee?.name || ""} readOnly className="h-8 border-sky-200 bg-muted text-sm" />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Hospital Name</Label>
                <Select value={hospitalName} onValueChange={setHospitalName}>
                  <SelectTrigger className="h-8 border-sky-200 bg-background">
                    <SelectValue placeholder="Select Hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dow Hospital">Dow Hospital</SelectItem>
                    <SelectItem value="Hill Park Hospital">Hill Park Hospital</SelectItem>
                    <SelectItem value="7 Day Hospital">7 Day Hospital</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Opd/Ipd</Label>
                <Select value={hospitalType} onValueChange={(val: any) => setHospitalType(val)}>
                  <SelectTrigger className="h-8 border-sky-200 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPD">Opd</SelectItem>
                    <SelectItem value="IPD">Ipd</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Invoice No</Label>
                <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="h-8 border-sky-200 bg-background" />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Amount</Label>
                <Input className="h-8 border-sky-200 bg-white" placeholder="0.00" />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-32 text-right font-bold text-sky-900">Date</Label>
                <Input type="date" className="h-8 border-sky-200 bg-white" defaultValue={new Date().toISOString().split('T')[0]} />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sky-700 font-bold italic text-md">Description</span>
                  <hr className="flex-1 border-sky-200" />
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[60px] border-sky-300 dark:border-sky-800 bg-background focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-6 border-t border-sky-100">
              <Button onClick={handleSave} disabled={loading} className="w-28 h-10 bg-sky-600 hover:bg-sky-700 text-white font-black shadow-lg">SAVE</Button>
              <Button className="w-28 h-10 bg-sky-500 hover:bg-sky-600 text-white font-black shadow-lg">UPDATE</Button>
              <Button onClick={clearSession} className="w-28 h-10 bg-sky-500 hover:bg-sky-600 text-white font-black shadow-lg">RESET</Button>
              <Button className="w-28 h-10 bg-sky-500 hover:bg-sky-600 text-white font-black shadow-lg">DELETE</Button>
            </div>
          </div>

          {/* Right Column: Price Inputs */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <h3 className="text-sky-700 font-bold italic mb-4 border-b border-sky-200 pb-2 text-right mr-4">Price</h3>
            {labLabels.map((_, i) => (
              <div key={i} className="flex items-center gap-2 justify-end">
                <Label className="text-teal-800 font-medium text-sm">Price</Label>
                <Input
                  type="number"
                  value={items[i]?.price || 0}
                  onChange={(e) => updateItem(i, items[i]?.name || "", parseFloat(e.target.value) || 0)}
                  className="h-8 w-28 border-teal-200 bg-white"
                />
              </div>
            ))}
          </div>

        </div>

        {qrCode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 p-6 bg-white border-4 border-sky-500 rounded-xl flex flex-col items-center gap-4 shadow-2xl max-w-sm mx-auto z-10 relative"
          >
            <h4 className="text-sky-800 dark:text-sky-400 font-black text-xl">SCAN TO VERIFY</h4>
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            <div className="flex flex-col gap-2 w-full">
              {lastSavedRecord && (
                <PDFDownloadLink
                  document={<TreatmentSlip data={lastSavedRecord} />}
                  fileName={`HospitalSlip_${lastSavedRecord.Emp_no}_${new Date().getTime()}.pdf`}
                >
                  {({ loading: pdfLoading }) => (
                    <Button className="w-full bg-sky-600 hover:bg-sky-700">
                      <Printer className="mr-2 h-4 w-4" />
                      {pdfLoading ? "Generating..." : "Print Slip"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              <Button onClick={() => { clearSession(); setLastSavedRecord(null); setEmpNo(""); }} variant="outline" className="w-full border-sky-200">Close</Button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Historical Table */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-teal-800 flex items-center">
            DATA HISTORY
          </h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-400" />
            <Input placeholder="Filter records..." className="pl-10 border-teal-100 bg-white shadow-sm" />
          </div>
        </div>

        <div className="border rounded-xl shadow-xl border-teal-100 dark:border-teal-900 overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-sky-600">
              <TableRow>
                <TableHead className="text-white font-bold">SERIAL NO</TableHead>
                <TableHead className="text-white font-bold">EMP NO</TableHead>
                <TableHead className="text-white font-bold">EMP NAME</TableHead>
                <TableHead className="text-white font-bold">BOOK NO</TableHead>
                <TableHead className="text-white font-bold">HOSPITAL</TableHead>
                <TableHead className="text-white font-bold">TYPE</TableHead>
                <TableHead className="text-white font-bold text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-sky-400 italic">No records found</TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.Serial_no} className="hover:bg-sky-50 transition-colors">
                    <TableCell className="font-bold text-sky-700">{record.Serial_no}</TableCell>
                    <TableCell className="text-slate-600 font-medium">{record.Emp_no || 'N/A'}</TableCell>
                    <TableCell className="font-bold text-sky-900">{record.Emp_name}</TableCell>
                    <TableCell className="text-slate-600 font-medium">{record.Book_no || '-'}</TableCell>
                    <TableCell className="text-slate-600 italic font-medium">{record.Hospital_name || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${record.Hospital_Type === 'IPD' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {record.Hospital_Type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <PDFDownloadLink
                          document={<TreatmentSlip data={record} />}
                          fileName={`Slip_${record.Serial_no}.pdf`}
                        >
                          <Button variant="ghost" size="icon" className="text-sky-600 hover:text-sky-800 hover:bg-sky-50 h-8 w-8">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </PDFDownloadLink>
                        <Button variant="ghost" size="icon" className="text-sky-600 hover:text-sky-800 hover:bg-sky-50 h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Hospital;
