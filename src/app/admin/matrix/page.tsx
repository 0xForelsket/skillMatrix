
import { getMatrixData } from "@/lib/matrix";
import { MatrixGrid } from "@/components/matrix/matrix-grid";
import { Grid3X3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MatrixPage() {
    const data = await getMatrixData();

    return (
        <div className="flex flex-col gap-6 p-6 h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between shrink-0">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Grid3X3 className="h-6 w-6 text-indigo-400" />
                        Skill Matrix
                    </h2>
                    <p className="text-slate-400">
                        Visualize organizational capability and identify compliance gaps.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="text-slate-400 hover:text-white border-white/10 bg-slate-900/50">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <MatrixGrid data={data} />
            </div>
        </div>
    );
}
