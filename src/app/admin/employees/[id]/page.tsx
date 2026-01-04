
import { getEmployee } from "@/actions/employees";
import { getEmployeeGaps, type SkillGap } from "@/lib/gap-analysis";
import { notFound } from "next/navigation";
import { BadgeCheck, AlertTriangle, XCircle, Clock, MapPin, Building2, Briefcase, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const employeeResult = await getEmployee(id);
    
    if (!employeeResult.success || !employeeResult.data) {
        notFound();
    }

    const employee = employeeResult.data;
    
    // Gap Analysis
    // We catch errors here so the whole page doesn't crash if the rules engine fails
    let gaps: SkillGap[] = [];
    let gapError = null;
    try {
        gaps = await getEmployeeGaps(id);
    } catch (e: any) {
        gapError = e.message;
    }

    // Stats
    const totalReqs = gaps.length;
    const complianceOk = gaps.filter(g => g.status === 'ok').length;
    const rate = totalReqs > 0 ? Math.round((complianceOk / totalReqs) * 100) : 100;

    return (
        <div className="flex flex-col gap-8 p-6 md:p-8">
            {/* Header / Profile Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
                     <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground text-3xl font-bold shrink-0">
                        {employee.photoUrl ? (
                                <img src={employee.photoUrl} alt={employee.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span>{employee.name.substring(0,2).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {employee.site.name} ({employee.site.code})
                            </div>
                            <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {employee.department?.name || "No Department"}
                            </div>
                            <div className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                {employee.role?.name || "No Role"}
                            </div>
                             <div className="flex items-center gap-1">
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{employee.employeeNumber}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right space-y-2">
                        <div className="text-sm font-medium text-muted-foreground">Compliance Rate</div>
                        <div className={`text-4xl font-bold ${
                            rate >= 95 ? "text-green-600" :
                            rate >= 80 ? "text-amber-600" :
                            "text-red-600"
                        }`}>{rate}%</div>
                        <div className="text-xs text-muted-foreground">{complianceOk} / {totalReqs} requirements met</div>
                    </div>
                </div>
            </div>

            {/* Gap Analysis Table */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Skill Gap Analysis</h2>
                    <Button variant="outline">
                        Download Report
                    </Button>
                </div>

                {gapError && (
                    <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                        Error calculating gaps: {gapError}
                    </div>
                )}

                <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Skill Requirement</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Level</th>
                                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Expires</th>
                                <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y">
                            {gaps.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        No skill requirements found for this employee based on current role/site assignments.
                                    </td>
                                </tr>
                            ) : gaps.map((gap) => (
                                <tr key={gap.skillId} className="hover:bg-muted/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium">{gap.skillName}</div>
                                        {gap.skillCode && <div className="text-xs text-muted-foreground">{gap.skillCode}</div>}
                                    </td>
                                    <td className="p-4">
                                        <StatusBadge status={gap.status} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            <span className="font-medium">{gap.achievedLevel}</span>
                                            <span className="text-muted-foreground">/ {gap.requiredLevel}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {gap.expiresAt ? (
                                            <span className={gap.status === 'expired' ? "text-destructive font-medium" : ""}>
                                                {format(gap.expiresAt, "MMM d, yyyy")}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button size="sm" variant={gap.status === 'ok' ? "outline" : "default"}>
                                            {gap.status === 'ok' ? "Recertify" : "Certify"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "ok":
            return (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    <BadgeCheck className="h-3 w-3" />
                    Qualified
                </div>
            );
        case "missing":
            return (
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                    <XCircle className="h-3 w-3" />
                    Missing
                </div>
            );
        case "expired":
             return (
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                    <Clock className="h-3 w-3" />
                    Expired
                </div>
            );
         case "expiring_soon":
             return (
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    <Clock className="h-3 w-3" />
                    Expiring Soon
                </div>
            );
        case "insufficient_level":
             return (
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                    <AlertTriangle className="h-3 w-3" />
                    Level Low
                </div>
            );
        default:
             return (
                 <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10">
                    {status}
                </div>
            );
    }
}
