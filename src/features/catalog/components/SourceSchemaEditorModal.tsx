import { problemMessage } from "../../../shared/presentation/messages";
import { useRef, useState } from "react";
import { catalogApi } from "../api/catalogApi";
import { isErr } from "../../../shared/result/result";
import type { RootReportSchema } from "../types/catalogTypes";
export function SourceSchemaEditorModal({ sourceId, schema, onClose, onSaved }: {
    sourceId: string;
    schema?: RootReportSchema;
    onClose: () => void;
    onSaved: (schema: RootReportSchema) => void;
}) {
    const [name, setName] = useState(schema?.publicName || "");
    const [internalSchema, setInternalSchema] = useState(schema?.internalSchemaName || "public");
    const [object, setObject] = useState(schema?.internalObjectName || "");
    const [description, setDescription] = useState(schema?.description || "");
    const [enabled, setEnabled] = useState(schema?.isEnabled ?? true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const lock = useRef(false);
    async function save() {
        if (lock.current || !name.trim())
            return;
        lock.current = true;
        setBusy(true);
        setError("");
        try {
            const settings = { publicName: name.trim(), publicType: schema?.publicType || "object", description: description.trim() || null, isEnabled: enabled };
            const result = schema ? await catalogApi.updateReportSchema(schema.id, settings) : await catalogApi.createReportSchema({ ...settings, dataSourceId: sourceId, internalSchemaName: internalSchema.trim(), internalObjectName: object.trim() });
            if (isErr(result))
                setError(problemMessage(result.error, "Não foi possível salvar a tabela."));
            else {
                onSaved(result.value);
                onClose();
            }
        }
        catch {
            setError("Falha de comunicação ao salvar a tabela. Consulte o catálogo antes de tentar novamente.");
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    return <div className="modal-backdrop"><section className="modal-container catalog-template-modal" role="dialog" aria-modal="true" aria-label={schema ? "Editar tabela" : "Cadastrar tabela manualmente"}>
    <header className="modal-header"><h3>{schema ? "Editar tabela" : "Cadastrar tabela manualmente"}</h3><button className="btn btn-secondary" disabled={busy} onClick={onClose}>Fechar</button></header>
    <form className="modal-body" onSubmit={event => { event.preventDefault(); void save(); }}>
      <p>Define uma tabela no catálogo desta fonte. Os campos e permissões serão configurados nos próximos passos.</p>
      {error && <p role="alert">{error}</p>}
      <label>Nome público<input className="form-input" value={name} required onChange={event => setName(event.target.value)}/></label>
      {!schema && <><label>Schema no banco<input className="form-input" value={internalSchema} required onChange={event => setInternalSchema(event.target.value)}/></label><label>Tabela ou view no banco<input className="form-input" value={object} required onChange={event => setObject(event.target.value)}/></label></>}
      <label>Descrição<textarea className="form-input" value={description} onChange={event => setDescription(event.target.value)}/></label>
      <label><span><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)}/> Tabela habilitada no catálogo</span></label>
      <button className="btn btn-primary" disabled={busy}>Salvar tabela</button>
    </form>
  </section></div>;
}
