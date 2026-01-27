import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Heart, Baby, Users } from "lucide-react";
import { motion } from "framer-motion";

interface FamilyMemberCardProps {
    member: {
        id: number;
        name: string;
        relation: string;
        card_no?: string;
        valid_upto?: string;
        hospitalization?: string;
        room_limit?: string;
        total_limit?: number;
        cnic?: string;
        dob?: string;
    };
    employeeName?: string;
}

const FamilyMemberCard = ({ member, employeeName }: FamilyMemberCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const getRelationIcon = (relation: string) => {
        switch (relation?.toLowerCase()) {
            case 'spouse':
            case 'wife':
            case 'husband':
                return <Heart className="w-4 h-4" />;
            case 'son':
            case 'daughter':
            case 'child':
                return <Baby className="w-4 h-4" />;
            default:
                return <Users className="w-4 h-4" />;
        }
    };

    const formatDate = (date?: string) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' });
    };

    return (
        <div
            className="relative min-w-[280px] max-w-[320px] perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                className="relative w-full h-44 preserve-3d"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
            >
                {/* Front Side */}
                <Card className="absolute inset-0 backface-hidden bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0 shadow-xl overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20" />
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
                    </div>
                    <CardContent className="p-4 h-full flex flex-col justify-between relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] text-white/60 uppercase tracking-widest">Family Member</p>
                                <h3 className="text-lg font-bold mt-1">{member.name || 'Unnamed'}</h3>
                            </div>
                            <Badge className="bg-white/20 text-white border-0 gap-1 text-[10px]">
                                {getRelationIcon(member.relation)}
                                {member.relation || 'Dependent'}
                            </Badge>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/60">Card No</span>
                                <span className="font-mono">{member.card_no || 'Not Issued'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/60">Valid Upto</span>
                                <span>{formatDate(member.valid_upto)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-white/60">Employee</span>
                                <span className="truncate max-w-[120px]">{employeeName || 'N/A'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Back Side */}
                <Card className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 shadow-xl overflow-hidden">
                    <CardContent className="p-4 h-full flex flex-col justify-between">
                        <div>
                            <p className="text-[10px] text-white/60 uppercase tracking-widest mb-2">Benefits & Coverage</p>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-white/60">Hospitalization</span>
                                    <span>{member.hospitalization || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/60">Room Limit</span>
                                    <span>{member.room_limit || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between font-bold text-emerald-400">
                                    <span className="text-white/60">Coverage Limit</span>
                                    <span>Rs. {(member.total_limit || 50000).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-[10px] text-white/40 text-center">
                            Click to flip back
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
};

export default FamilyMemberCard;
