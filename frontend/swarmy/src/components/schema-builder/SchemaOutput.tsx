import { Copy } from "lucide-react";

interface SchemaOutputProps {
  schemaJson: string;
  onCopySchema: () => void;
  hasErrors?: boolean;
}

export const SchemaOutput = ({ schemaJson, onCopySchema, hasErrors }: SchemaOutputProps) => {
  return (
    <div className={`sb-output ${hasErrors ? 'sb-output-error' : ''}`}>
      <div className="sb-output-header">
        <span className="field-label-sm">output</span>
        <button className="btn btn-ghost btn-sm" onClick={onCopySchema} disabled={hasErrors}>
          <Copy className="w-3 h-3" /> copy
        </button>
      </div>
      <pre className="code-block sb-output-pre">
        {schemaJson}
      </pre>
    </div>
  );
};
