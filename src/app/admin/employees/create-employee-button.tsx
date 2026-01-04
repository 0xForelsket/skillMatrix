
"use client";

import { useActionState, useState } from "react";
import { createEmployee } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import type { Site, Department, Role } from "@/db/schema";

// Modal component (same as others, should be refactored eventually)
function Modal({
    isOpen,
    onClose,
    children,
}: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-end p-2">
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-6 pb-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

const initialState = {
    success: false,
    error: "",
    data: null as any
};

interface CreateEmployeeButtonProps {
    sites: Site[];
    departments: Department[];
    roles: Role[];
}

export function CreateEmployeeButton({ sites, departments, roles }: CreateEmployeeButtonProps) {
    const { user } = useCurrentUser();
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction, isPending] = useActionState(
        async (prevState: any, formData: FormData) => {
            const rawData = Object.fromEntries(formData);
            const result = await createEmployee({
                name: rawData.name as string,
                employeeNumber: rawData.employeeNumber as string,
                email: rawData.email as string,
                siteId: rawData.siteId as string,
                departmentId: rawData.departmentId === "none" ? undefined : rawData.departmentId as string,
                roleId: rawData.roleId === "none" ? undefined : rawData.roleId as string,
                performerId: user?.id,
            });
            
            if (result.success) {
                setIsOpen(false);
                return { success: true, error: "", data: result.data };
            }
            return { success: false, error: typeof result.error === 'string' ? result.error : "Validation failed", data: null };
        },
        initialState,
    );

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Employee
            </Button>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <div className="flex flex-col gap-4">
                    <div className="space-y-2 text-center">
                        <h3 className="text-lg font-semibold">Add New Employee</h3>
                        <p className="text-sm text-muted-foreground">
                            Create an HR record for an employee.
                        </p>
                    </div>
                    <form action={formAction} className="flex flex-col gap-4">
                        <div className="grid gap-2">
                            <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="employeeNumber" className="text-sm font-medium">Employee #</label>
                            <input
                                id="employeeNumber"
                                name="employeeNumber"
                                type="text"
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="EMP-123"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium">Contact Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Optional"
                            />
                        </div>

                         <div className="grid gap-2">
                            <label htmlFor="siteId" className="text-sm font-medium">Site</label>
                            <select
                                id="siteId"
                                name="siteId"
                                required
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="" disabled selected>Select Site</option>
                                {sites.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>

                         <div className="grid gap-2">
                            <label htmlFor="departmentId" className="text-sm font-medium">Department</label>
                            <select
                                id="departmentId"
                                name="departmentId"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="none">None</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="roleId" className="text-sm font-medium">Job Role</label>
                            <select
                                id="roleId"
                                name="roleId"
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="none">None</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        {state.error && (
                            <p className="text-sm text-destructive">{state.error}</p>
                        )}
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Employee
                        </Button>
                    </form>
                </div>
            </Modal>
        </>
    );
}
