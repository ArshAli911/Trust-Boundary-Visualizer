export default function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}