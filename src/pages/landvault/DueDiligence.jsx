import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, FileSearch, ShieldCheck, Users, Banknote, FileText,
  Calendar, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Download, CreditCard, Building2, Scale, MapPin
} from "lucide-react";

const CATEGORY_ICONS = {
  PARCEL_VERIFICATION: Search,
  SURVEY_PLAN_VERIFICATION: MapPin,
  COMMUNITY_EVIDENCE_REPORT: Users,
  DUE_DILIGENCE_REPORT: FileSearch,
  CERTIFICATE_GENERATION: ShieldCheck,
  ARCHIVE_DIGITIZATION: FileText,
  SURVEYOR_VALIDATION: CheckCircle2,
  LEGAL_SEARCH_PACKAGE: Scale,
  BANK_SEARCH_PACKAGE: Banknote,
  COMPLIANCE_REPORT: Building2,
};

const STATUS_STYLES = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function DueDiligence() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedParcelId, setSelectedParcelId] = useState("");
  const [priority, setPriority] = useState("STANDARD");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("new");

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.ServiceCatalog.list("-created_date"),
  });

  const { data: parcels = [], isLoading: loadingParcels } = useQuery({
    queryKey: ["parcels-dd"],
    queryFn: () => base44.entities.LandVaultParcel.list("-created_date", 200),
  });

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["service-requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-submitted_at", 50),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["generated-reports"],
    queryFn: () => base44.entities.GeneratedReport.list("-generated_timestamp", 50),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const service = services.find(s => s.id === selectedService);
      if (!service) throw new Error("Please select a service");

      // Billing enforcement: authorize → reserve → create request
      const response = await base44.functions.invoke("lvServiceBilling", {
        action: "initiate",
        service_id: service.id,
        parcel_id: selectedParcelId || null,
        priority,
        notes,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      toast.success(`${data.service_name} — ${data.credits_reserved} credits reserved. Request: ${data.request_reference}`);
      setSelectedService("");
      setSelectedParcelId("");
      setNotes("");
      setActiveTab("history");
    },
    onError: (err) => toast.error(err.message || "Failed to submit request"),
  });

  const filteredParcels = useMemo(() => {
    if (!searchQuery) return parcels.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return parcels.filter(p =>
      p.parcel_number?.toLowerCase().includes(q) ||
      p.community?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [parcels, searchQuery]);

  if (loadingServices) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Due Diligence & Services</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Evidence Infrastructure Platform — Request verification, reports, and institutional services.
          Revenue influences delivery speed, never truth.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="history">Request History ({requests.length})</TabsTrigger>
          <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        </TabsList>

        {/* NEW REQUEST TAB */}
        <TabsContent value="new">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Service Selection */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-primary" />
                    Select Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {services.filter(s => s.service_status === "ACTIVE").map(svc => {
                      const Icon = CATEGORY_ICONS[svc.service_category] || FileText;
                      const isSelected = selectedService === svc.id;
                      return (
                        <button
                          key={svc.id}
                          onClick={() => setSelectedService(svc.id)}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border hover:border-primary/30 bg-card"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? "bg-primary/10" : "bg-muted"}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{svc.service_name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{svc.service_description}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">{svc.credit_cost} credits</Badge>
                                <Badge variant="outline" className="text-xs">NGN {svc.cash_price?.toLocaleString()}</Badge>
                                <span className="text-xs text-muted-foreground">{svc.estimated_delivery_time}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Parcel Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Target Parcel (optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="Search parcels by number, community, or owner..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="mb-3"
                  />
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {filteredParcels.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedParcelId(p.id); setSearchQuery(""); }}
                          className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                            selectedParcelId === p.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                          }`}
                        >
                          <div>
                            <div className="font-medium text-sm">{p.parcel_number}</div>
                            <div className="text-xs text-muted-foreground">{p.community}, {p.ward} — {p.owner_name || "Unnamed"}</div>
                          </div>
                          {selectedParcelId === p.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                      {filteredParcels.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-4">No parcels found</div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Describe what you need, any specific requirements, or urgency..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="h-24"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar — Summary & Submit */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Request Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Service</div>
                    <div className="font-medium text-sm">
                      {selectedService ? services.find(s => s.id === selectedService)?.service_name : "— Not selected —"}
                    </div>
                  </div>
                  {selectedService && (
                    <>
                      <div>
                        <div className="text-xs text-muted-foreground">Credits</div>
                        <div className="text-lg font-bold">{services.find(s => s.id === selectedService)?.credit_cost || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Cash Price (NGN)</div>
                        <div className="text-lg font-bold">NGN {(services.find(s => s.id === selectedService)?.cash_price || 0).toLocaleString()}</div>
                      </div>
                    </>
                  )}
                  {selectedParcelId && (
                    <div>
                      <div className="text-xs text-muted-foreground">Parcel</div>
                      <div className="font-medium text-sm">{parcels.find(p => p.id === selectedParcelId)?.parcel_number}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Priority</div>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="PRIORITY">Priority (+50%)</SelectItem>
                        <SelectItem value="URGENT">Urgent (+100%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!selectedService || submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                  >
                    {submitMutation.isPending ? "Submitting..." : "Submit Request"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Trust Notice */}
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-amber-800">
                      <strong>Trust Independence:</strong> Payment status has zero influence on evidence confidence scores, community consensus, fraud detection, or verification outcomes. Revenue fuels service delivery — never truth.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Request History</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No service requests yet</p>
                  <p className="text-sm">Submit your first due diligence request above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {(() => { const Icon = CATEGORY_ICONS[req.service_category] || FileText; return <Icon className="w-4 h-4" />; })()}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{req.service_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {req.parcel_number ? `${req.parcel_number} — ` : ""}{new Date(req.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={STATUS_STYLES[req.status] || ""}>{req.status}</Badge>
                        <div className="text-xs text-right">
                          <div className="font-medium">{req.credits_consumed || 0} credits</div>
                          {req.cash_amount > 0 && <div className="text-muted-foreground">NGN {req.cash_amount?.toLocaleString()}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REPORTS TAB */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generated Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Download className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No reports generated yet</p>
                  <p className="text-sm">Reports are delivered when service requests complete</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map(rpt => (
                    <div key={rpt.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium text-sm">{rpt.report_type?.replace(/_/g, " ")}</div>
                          <div className="text-xs text-muted-foreground">
                            {rpt.parcel_number} — {new Date(rpt.generated_timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{rpt.status}</Badge>
                        {rpt.download_url && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={rpt.download_url} target="_blank" rel="noopener noreferrer">
                              <Download className="w-3 h-3 mr-1" /> Download
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}