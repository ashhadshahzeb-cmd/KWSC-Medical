import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, CheckCircle, XCircle, Upload, Loader2, ExternalLink } from 'lucide-react';
import { apiCall } from '@/lib/api';
import { toast } from 'sonner';

const Claims = () => {
    const { user, isAdmin } = useAuth();
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form States
    const [amount, setAmount] = useState('');
    const [claimType, setClaimType] = useState('Medicine');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [adminComment, setAdminComment] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => {
        fetchClaims();
    }, [user, isAdmin]);

    const fetchClaims = async () => {
        try {
            const endpoint = isAdmin ? '/claims/admin' : `/claims/user/${user?.id}`;
            const data = await apiCall(endpoint);
            if (Array.isArray(data)) setClaims(data);
        } catch (error) {
            console.error('Error fetching claims:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await apiCall('/claims/submit', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user?.id,
                    empNo: user?.empNo,
                    amount: parseFloat(amount),
                    claimType,
                    description,
                    imageUrl: imageUrl || 'https://placehold.co/600x400?text=Invoice',
                })
            });
            toast.success("Claim submitted successfully!");
            setAmount('');
            setDescription('');
            fetchClaims();
        } catch (error) {
            toast.error("Failed to submit claim");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: number, status: 'Approved' | 'Rejected') => {
        setProcessingId(id);
        try {
            await apiCall(`/claims/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status, adminComments: adminComment })
            });
            toast.success(`Claim ${status}`);
            fetchClaims();
        } catch (error) {
            toast.error("Update failed");
        } finally {
            setProcessingId(null);
            setAdminComment('');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'Rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Reimbursement Claims</h2>

            {isAdmin ? (
                <Card className="glass-card">
                    <CardHeader><CardTitle>All Claims</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Proof</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {claims.map((claim) => (
                                    <TableRow key={claim.id}>
                                        <TableCell>
                                            <div className="font-medium">{claim.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{claim.emp_no}</div>
                                        </TableCell>
                                        <TableCell>{claim.claim_type}</TableCell>
                                        <TableCell className="font-bold">Rs. {claim.amount}</TableCell>
                                        <TableCell><Badge variant="outline" className={getStatusColor(claim.status)}>{claim.status}</Badge></TableCell>
                                        <TableCell>
                                            {claim.image_url && (
                                                <Button variant="ghost" size="sm" asChild>
                                                    <a href={claim.image_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-2" /> View</a>
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {claim.status === 'Pending' && (
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="bg-green-600" onClick={() => handleStatusUpdate(claim.id, 'Approved')} disabled={processingId === claim.id}>
                                                        {processingId === claim.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                    </Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(claim.id, 'Rejected')} disabled={processingId === claim.id}>
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    <Card className="glass-card h-fit">
                        <CardHeader>
                            <CardTitle>Submit New Claim</CardTitle>
                            <CardDescription>Upload bill for reimbursement</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Claim Type</Label>
                                    <Select value={claimType} onValueChange={setClaimType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Medicine">Medicine Purchase</SelectItem>
                                            <SelectItem value="Lab Test">Lab Test</SelectItem>
                                            <SelectItem value="Consultation">Consultation Fee</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount (PKR)</Label>
                                    <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Submit Claim
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="glass-card">
                        <CardHeader><CardTitle>My Claims</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {claims.map((claim) => (
                                    <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${getStatusColor(claim.status)}`}><Receipt className="w-4 h-4" /></div>
                                            <div>
                                                <p className="font-medium">{claim.claim_type}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">Rs. {claim.amount}</p>
                                            <Badge variant="outline" className={`mt-1 text-[10px] ${getStatusColor(claim.status)}`}>{claim.status}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default Claims;
