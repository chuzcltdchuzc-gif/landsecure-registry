import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Shield,
    Users,
    ThumbsUp,
    AlertTriangle,
    Building2,
    Globe,
    Clock,
    TrendingUp,
    Landmark,
    Search,
    ChevronRight,
    Scale,
    History,
    CheckCircle2,
    Star,
} from "lucide-react";

const consensusColors = {
    STRONG_CONSENSUS: "bg-green-100 text-green-800 border-green-300",
    MODERATE_CONSENSUS: "bg-blue-100 text-blue-800 border-blue-300",
    WEAK_CONSENSUS: "bg-amber-100 text-amber-800 border-amber-300",
    MIXED_OPINIONS: "bg-red-100 text-red-800 border-red-300",
};

const consensusIcons = {
    STRONG_CONSENSUS: ThumbsUp,
    MODERATE_CONSENSUS: CheckCircle2,
    WEAK_CONSENSUS: AlertTriangle,
    MIXED_OPINIONS: AlertTriangle,
};

export default function CommunityTransparency() {
    const [searchParcel, setSearchParcel] = useState("");
    const [selectedParcel, setSelectedParcel] = useState(null);

    const { data: parcels = [] } = useQuery({
        queryKey: ["transparency-parcels"],
        queryFn: async () => {
            const all = await base44.entities.LandVaultParcel.list();
            return all.filter(p => p.supporting_count > 0 || p.conflicting_count > 0);
        },
    });

    const { data: attestations = [] } = useQuery({
        queryKey: ["transparency-attestations"],
        queryFn: () => base44.entities.CommunityAttestation.filter({ verification_status: "APPROVED" }),
    });

    const { data: timelineEvents = [] } = useQuery({
        queryKey: ["transparency-timeline", selectedParcel?.id],
        queryFn: async () => {
            if (!selectedParcel) return [];
            const events = await base44.entities.EvidenceTimelineEvent.filter(
                { parcel_id: selectedParcel.id, visibility: "PUBLIC" },
                "-timestamp",
                50
            );
            return events;
        },
        enabled: !!selectedParcel,
    });

    // Aggregate stats
    const totalAttestations = attestations.length;
    const supportingAttestations = attestations.filter(a => a.attestation_position === "SUPPORTING").length;
    const conflictingAttestations = attestations.filter(a => a.attestation_position === "CONFLICTING").length;
    const traditionalParticipation = attestations.filter(
        a => a.attestor_role === "TRADITIONAL_RULER" || a.traditional_institution_verified
    ).length;
    const communityParticipation = attestations.filter(
        a => a.attestor_role === "COMMUNITY_DEVELOPMENT_UNION" || a.attestor_role === "LAND_COMMITTEE_MEMBER"
    ).length;
    const totalConfidenceImpact = attestations.reduce((sum, a) => sum + (a.confidence_impact || 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Header */}
            <div className="bg-slate-900 text-white py-12 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="flex justify-center mb-4">
                        <Scale className="w-12 h-12 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">Community Transparency</h1>
                    <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base">
                        Public visibility into community evidence preserved by LandVault. This page displays
                        anonymized attestation data to strengthen the evidence network without revealing
                        personal information.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 bg-amber-900/50 border border-amber-700 rounded-lg px-4 py-2 text-amber-200 text-xs">
                        <AlertTriangle className="w-4 h-4" />
                        Evidence only — not ownership determination. No personal contact details are displayed.
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Platform Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                            <div className="text-2xl font-bold">{totalAttestations}</div>
                            <div className="text-xs text-muted-foreground">Total Attestations</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                            <div className="text-2xl font-bold">{supportingAttestations}</div>
                            <div className="text-xs text-muted-foreground">Supporting</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                            <div className="text-2xl font-bold">{conflictingAttestations}</div>
                            <div className="text-xs text-muted-foreground">Conflicting</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                            <div className="text-2xl font-bold">+{Math.min(totalConfidenceImpact, 15)}</div>
                            <div className="text-xs text-muted-foreground">Confidence Impact</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Participation Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Landmark className="w-4 h-4" />
                                Traditional Participation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-amber-700">{traditionalParticipation}</div>
                            <div className="text-xs text-muted-foreground">Traditional rulers and councils engaged</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Community Participation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-700">{communityParticipation}</div>
                            <div className="text-xs text-muted-foreground">CDUs and land committee members engaged</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Parcel Search */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Look Up Community Evidence
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Input
                                placeholder="Search parcel by number..."
                                value={searchParcel}
                                onChange={e => setSearchParcel(e.target.value)}
                                className="max-w-md"
                            />
                            <Button variant="outline" onClick={() => setSearchParcel("")}>Clear</Button>
                        </div>
                        <ScrollArea className="h-64">
                            {parcels
                                .filter(p => !searchParcel || p.parcel_number?.toLowerCase().includes(searchParcel.toLowerCase()))
                                .map(parcel => {
                                    const Icon = consensusIcons[parcel.consensus_level] || Globe;
                                    return (
                                        <div
                                            key={parcel.id}
                                            className={`flex items-center justify-between p-3 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                                                selectedParcel?.id === parcel.id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
                                            }`}
                                            onClick={() => setSelectedParcel(parcel)}
                                        >
                                            <div>
                                                <div className="font-medium text-sm">{parcel.parcel_number}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {parcel.community || "Unknown Community"} • {parcel.ward || "Unknown Ward"}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge className={consensusColors[parcel.consensus_level] || "bg-gray-100 text-gray-800"}>
                                                    <Icon className="w-3 h-3 mr-1" />
                                                    {(parcel.consensus_level || "N/A").replace("_", " ")}
                                                </Badge>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold">{parcel.consensus_percentage || 0}%</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {parcel.supporting_count || 0}S / {parcel.neutral_count || 0}N / {parcel.conflicting_count || 0}C
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    );
                                })}
                            {parcels.filter(p => !searchParcel || p.parcel_number?.toLowerCase().includes(searchParcel.toLowerCase())).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No attested parcels found.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Selected Parcel Detail */}
                {selectedParcel && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Evidence Summary — {selectedParcel.parcel_number}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-2xl font-bold text-green-700">
                                        {selectedParcel.supporting_count || 0}
                                    </div>
                                    <div className="text-xs text-green-600">Supporting</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-700">
                                        {selectedParcel.neutral_count || 0}
                                    </div>
                                    <div className="text-xs text-gray-600">Neutral</div>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <div className="text-2xl font-bold text-red-700">
                                        {selectedParcel.conflicting_count || 0}
                                    </div>
                                    <div className="text-xs text-red-600">Conflicting</div>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-700">
                                        {selectedParcel.consensus_percentage || 0}%
                                    </div>
                                    <div className="text-xs text-blue-600">Consensus</div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                                    <History className="w-4 h-4" />
                                    Evidence Timeline (Public Events)
                                </h4>
                                {timelineEvents.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No public timeline events yet.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {timelineEvents.slice(0, 20).map(event => (
                                            <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                                                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {event.event_type?.replace(/_/g, " ")}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{event.summary}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {event.timestamp ? new Date(event.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Platform Footer */}
                <div className="text-center py-8 border-t">
                    <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
                        Community attestations preserved on this platform represent local knowledge and evidence only.
                        They do not determine land ownership, replace title systems, replace courts, or replace
                        government land administration systems. LandVault is an evidence stewardship platform.
                    </p>
                </div>
            </div>
        </div>
    );
}