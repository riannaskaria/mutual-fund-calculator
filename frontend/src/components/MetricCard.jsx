export default function MetricCard({ label, value }) {
    return (
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-lg font-semibold text-slate-800">{value}</p>
        </div>
    );
}