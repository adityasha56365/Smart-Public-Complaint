export default function Status({ value }: { value: string }) {
  const cls = value.toLowerCase().replace(/ /g, "-").replace(/_/g, "-");
  const label = value.replace(/_/g, " ");
  return (
    <span className={`status ${cls}`}>
      <span></span>
      {label}
    </span>
  );
}
