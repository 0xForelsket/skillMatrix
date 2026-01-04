import { notFound } from "next/navigation";
import { getEmployee, getOrganizationMetadata } from "@/actions/employees";
import { auth } from "@/auth";
import { EmployeeForm } from "../../employee-form";

interface EditEmployeePageProps {
	params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({
	params,
}: EditEmployeePageProps) {
	const { id } = await params;
	const session = await auth();

	const [employeeResult, metadata] = await Promise.all([
		getEmployee(id),
		getOrganizationMetadata(),
	]);

	if (!employeeResult.success || !employeeResult.data) {
		notFound();
	}

	const employee = employeeResult.data;

	return (
		<div className="p-8">
			<EmployeeForm
				initialData={{
					id: employee.id,
					name: employee.name,
					employeeNumber: employee.employeeNumber,
					email: employee.email || "",
					siteId: employee.siteId,
					departmentId: employee.departmentId,
					roleId: employee.roleId,
					status: employee.status as "active" | "terminated" | "leave",
					photoUrl: employee.photoUrl,
				}}
				metadata={metadata}
				performerId={session?.user?.id}
			/>
		</div>
	);
}
