import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
  previewClassName?: string;
};

export function ImageInput({ value, onChange, folder = "uploads", placeholder = "https://...", previewClassName }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { upsert: false, contentType: file.type });
    setUploading(false);
    if (error) return alert("আপলোড ব্যর্থ: " + error.message);
    const { data } = supabase.storage.from("site-images").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) upload(f);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 h-11 px-4 rounded-xl bg-secondary border border-transparent focus:border-primary outline-none text-sm"
        />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          আপলোড
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition grid place-items-center text-xs text-muted-foreground overflow-hidden ${dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/40"} ${previewClassName ?? "h-32"}`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 size-full object-contain bg-white" />
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute top-1.5 right-1.5 size-7 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80">
              <X className="size-3.5" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 py-3">
            <ImageIcon className="size-5" />
            <span>{uploading ? "আপলোড হচ্ছে..." : "ছবি এখানে ড্র্যাগ করুন বা ক্লিক করে আপলোড করুন"}</span>
          </div>
        )}
      </div>
    </div>
  );
}