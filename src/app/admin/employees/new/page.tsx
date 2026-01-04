import { getOrganizationMetadata } from "@/actions/employees";
import { auth } from "@/auth";
import { EmployeeForm } from "../employee-form";

export default async function NewEmployeePage() {
	const session = await auth();
	const metadata = await getOrganizationMetadata();

	return (
		<div className="p-8">
			<EmployeeForm metadata={metadata} performerId={session?.user?.id} />
		</div>
	);
}
