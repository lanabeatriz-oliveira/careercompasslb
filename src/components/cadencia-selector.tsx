import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CadenciaSchema, type Cadencia } from "@/lib/cadencia";

export function CadenciaSelector({ cadencia, quantidade, disabled, onChange }: {
  cadencia: Cadencia; quantidade: number; disabled: boolean;
  onChange: (cadencia: Cadencia, quantidade?: number) => void;
}) {
  return <div className="min-w-0 space-y-1">
    <div className="flex flex-wrap items-center gap-2">
      <Select value={cadencia} onValueChange={(value) => onChange(CadenciaSchema.parse(value))} disabled={disabled}>
        <SelectTrigger aria-label="Cadência de posts" className="w-[210px] max-w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="semanal">Semanal (3 posts)</SelectItem>
          <SelectItem value="quinzenal">Quinzenal (5)</SelectItem>
          <SelectItem value="mensal">Mensal (9)</SelectItem>
          <SelectItem value="personalizado">Personalizado</SelectItem>
        </SelectContent>
      </Select>
      {cadencia === "personalizado" && <Input aria-label="Quantidade de posts" type="number" min={1} max={12} step={1} className="w-20" disabled={disabled}
        value={Number.isNaN(quantidade) ? "" : quantidade} onChange={(event) => onChange(cadencia, event.target.value === "" ? NaN : Number(event.target.value))} />}
    </div>
    <p className="text-xs text-muted-foreground" aria-live="polite">{Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= 12 ? `Vamos gerar ${quantidade} posts` : "Escolha de 1 a 12 posts"}</p>
  </div>;
}