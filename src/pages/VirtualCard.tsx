import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sqlApi } from '@/lib/api';
import MedicalCard from '@/components/profile/MedicalCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, CreditCard, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ManageCardDialog from '@/components/admin/ManageCardDialog';
import { Button } from '@/components/ui/button';

const VirtualCard = () => {
    const { user } = useAuth();
    const [cardData, setCardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showManageDialog, setShowManageDialog] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchCard();
        } else if (user) {
            // User exists but no ID found (might be old session)
            setLoading(false);
        }

        // Safety timeout
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        return () => clearTimeout(timeout);
    }, [user]);

    const fetchCard = async () => {
        if (!user?.id) return;
        try {
            const data = await sqlApi.medicalCards.getByUserId(user.id);
            // Fetch family info
            if (data) {
                const familyRes = await fetch(`${import.meta.env.VITE_API_URL}/family/${user.id}`);
                const familyData = await familyRes.json();
                setCardData({ ...data, family_members: familyData || [] });
            } else {
                setCardData(null);
            }
        } catch (error) {
            console.error('Error fetching card:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse font-medium">Loading your Virtual Card...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Virtual Medical Card</h1>
                    <p className="text-muted-foreground mt-1">Access your digital membership and benefits anytime.</p>
                </div>
                <Badge variant="secondary" className="px-4 py-1.5 h-fit text-xs font-semibold uppercase tracking-widest border-primary/20 bg-primary/5 text-primary">
                    Authorized Member
                </Badge>
                {(user as any)?.role === 'admin' && cardData && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManageDialog(true)}
                        className="gap-2"
                    >
                        <CreditCard className="w-4 h-4" />
                        Edit My Card
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Card Display Section */}
                <div className="lg:col-span-12 xl:col-span-7 flex flex-col items-center justify-center gap-6">
                    {cardData ? (
                        <>
                            <MedicalCard data={cardData} />
                            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-full border border-border/50">
                                <Info className="w-4 h-4 text-primary" />
                                <p className="text-xs font-medium text-muted-foreground">Click the card to view benefits and coverage details on the back.</p>
                            </div>
                        </>
                    ) : (
                        <Card className="w-full max-w-md aspect-[1.6/1] flex flex-col items-center justify-center border-dashed border-2 p-8 text-center bg-muted/10">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <CardTitle className="text-lg">No Card Issued</CardTitle>
                            <CardDescription className="mt-2 max-w-[250px]">
                                Your virtual medical card hasn't been issued yet. Please contact the administrator.
                            </CardDescription>
                            {(user as any)?.role === 'admin' && (
                                <Button
                                    className="mt-6 gap-2"
                                    onClick={() => setShowManageDialog(true)}
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Manage My Card
                                </Button>
                            )}
                        </Card>
                    )}
                </div>

                {/* Info Section */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                    <Card className="glass-card border-primary/10">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                How to use this card
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                    <p className="text-sm text-muted-foreground">Show this virtual card at network hospitals for seamless admission.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                    <p className="text-sm text-muted-foreground">FLIP the card to view your specific room limits and delivery coverage.</p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                    <p className="text-sm text-muted-foreground">Always keep your Physical CNIC/ID with you for verification.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-destructive/5 border-destructive/20">
                        <CardContent className="p-4 flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-destructive">Important Notice</p>
                                <p className="text-[11px] leading-relaxed text-destructive/80">
                                    This is a virtual representation of your medical membership. Tampering with or misusing digital cards may lead to suspension of benefits.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ManageCardDialog
                open={showManageDialog}
                onOpenChange={(open) => {
                    setShowManageDialog(open);
                    if (!open) fetchCard(); // Refresh after save
                }}
                user={user as any}
            />
        </div>
    );
};

export default VirtualCard;

// Helper to avoid missing import errors
const ShieldCheck = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
);
