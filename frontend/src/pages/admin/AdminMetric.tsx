import Icon, { IconName } from "../../components/common/Icon";

export default function AdminMetric({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: IconName;
  tone: string;
}) {
  return (
    <div className="admin-metric">
      <div className={`metric-symbol ${tone}`}>
        <Icon name={icon} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
      <button aria-label={`View ${label}`}>
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
