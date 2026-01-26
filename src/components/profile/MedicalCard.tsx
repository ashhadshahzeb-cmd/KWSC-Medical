import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShieldCheck, Calendar, MapPin, User, Info } from 'lucide-react';

interface MedicalCardProps {
    data: {
        card_no: string;
        participant_name: string;
        emp_no: string;
        cnic: string;
        customer_no: string;
        dob: string;
        valid_upto: string;
        branch: string;
        benefit_covered: string;
        hospitalization: string;
        room_limit: string;
        normal_delivery: string;
        c_section_limit: string;
    };
}

const MedicalCard = ({ data }: MedicalCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div
            className="relative w-full max-w-md aspect-[1.6/1] perspective-1000 cursor-pointer group"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>

                {/* Front Side */}
                <div className="absolute inset-0 backface-hidden w-full h-full">
                    <Card className="w-full h-full glass-card border-primary/20 bg-gradient-to-br from-primary/10 via-card to-background p-6 flex flex-col justify-between overflow-hidden relative">
                        {/* Decorative Background Patterns */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

                        {/* Header */}
                        <div className="flex justify-between items-start relative z-10">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <ShieldCheck className="w-5 h-5 text-primary" />
                                    </div>
                                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                                        MEDICAL CARD
                                    </span>
                                </div>
                                <Badge variant="outline" className="w-fit text-[10px] font-medium tracking-widest uppercase border-primary/30 text-primary">
                                    Premium Health Member
                                </Badge>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Virtual Card No</p>
                                <p className="font-mono text-sm leading-none text-foreground">{data.card_no}</p>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2 relative z-10">
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Participant Name</p>
                                <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-primary/50" /> {data.participant_name}
                                </p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Employee No</p>
                                <p className="text-sm font-semibold truncate">{data.emp_no}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">CNIC / ID</p>
                                <p className="text-sm font-semibold truncate">{data.cnic}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Customer No</p>
                                <p className="text-sm font-semibold truncate">{data.customer_no}</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-end border-t border-border/50 pt-3 mt-2 relative z-10">
                            <div className="flex gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Branch</p>
                                    <p className="text-[10px] font-bold flex items-center gap-1">
                                        <MapPin className="w-2.5 h-2.5" /> {data.branch}
                                    </p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground">Valid Upto</p>
                                    <p className="text-[10px] font-bold flex items-center gap-1 text-primary">
                                        <Calendar className="w-2.5 h-2.5" /> {new Date(data.valid_upto).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 animate-pulse">
                                <Info className="w-3 h-3 text-primary/40" />
                                <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-widest">Click to Flip</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden w-full h-full rotate-y-180">
                    <Card className="w-full h-full glass-card border-primary/20 bg-card p-6 flex flex-col overflow-hidden relative">
                        <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />

                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <h4 className="text-xs font-bold uppercase tracking-widest bg-muted rounded-full px-2.5 py-0.5">MEMBER BENEFITS</h4>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3">
                            <div className="space-y-0.5 text-primary">
                                <p className="text-[10px] opacity-70 font-medium">Total Limit (Rs)</p>
                                <p className="text-sm font-bold truncate">{(data as any).total_limit?.toLocaleString() || '100,000'}</p>
                            </div>
                            <div className="space-y-0.5 text-warning">
                                <p className="text-[10px] opacity-70 font-medium">Spent (Rs)</p>
                                <p className="text-sm font-bold truncate">{(data as any).spent_amount?.toLocaleString() || '0'}</p>
                            </div>

                            <div className="col-span-2 space-y-2 py-2 border-y border-border/50 my-1">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                    <span>Remaining Balance</span>
                                    <span className="text-primary font-mono">Rs. {(data as any).remaining_balance?.toLocaleString() || (data as any).total_limit?.toLocaleString() || '100,000'}</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (1 - ((data as any).spent_amount || 0) / ((data as any).total_limit || 100000)) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-0.5">
                                <p className="text-[10px] text-muted-foreground font-medium">Hospitalization</p>
                                <p className="text-xs font-bold text-foreground truncate">{data.hospitalization}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-[10px] text-muted-foreground font-medium">Room Limit</p>
                                <p className="text-xs font-bold text-foreground truncate">{data.room_limit}</p>
                            </div>
                        </div>

                        {/* Family Section */}
                        {(data as any).family_members && (data as any).family_members.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[9px] font-bold uppercase tracking-wider mb-1">Covered Dependents</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {(data as any).family_members.slice(0, 4).map((m: any, i: number) => (
                                        <div key={i} className="text-[10px] bg-muted/50 px-1 py-0.5 rounded flex justify-between">
                                            <span className="truncate max-w-[60px]">{m.name}</span>
                                            <span className="opacity-70 text-[8px] uppercase">{m.relation}</span>
                                        </div>
                                    ))}
                                    {(data as any).family_members.length > 4 && (
                                        <div className="text-[9px] opacity-70 italic">+{(data as any).family_members.length - 4} more</div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="mt-2 pt-2 border-t border-border/50 flex flex-col items-center justify-center gap-1">
                            <p className="text-[8px] text-muted-foreground uppercase tracking-tighter text-center">VALID AT AUTHORIZED CENTERS ONLY</p>
                        </div>
                    </Card>
                </div>

            </div>

            <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
        </div>
    );
};

export default MedicalCard;
