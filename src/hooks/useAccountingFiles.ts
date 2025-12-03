import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface AccountingFile {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  description: string | null;
  created_at: string;
}

export function useAccountingFiles(userId: string | undefined) {
  const [files, setFiles] = useState<AccountingFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchFiles();
    }
  }, [userId]);

  const fetchFiles = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from("accounting_files")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching accounting files:", error);
    } else {
      setFiles(data || []);
    }
    setIsLoading(false);
  };

  const uploadFile = async (file: File, category: string, description?: string) => {
    if (!userId) return false;

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("accounting-files")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do arquivo.",
        variant: "destructive",
      });
      return false;
    }

    // Save metadata
    const { error: metaError } = await supabase.from("accounting_files").insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      category,
      description,
    });

    if (metaError) {
      console.error("Error saving file metadata:", metaError);
      // Try to delete the uploaded file
      await supabase.storage.from("accounting-files").remove([filePath]);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados do arquivo.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Sucesso",
      description: "Arquivo enviado com sucesso.",
    });
    await fetchFiles();
    return true;
  };

  const deleteFile = async (id: string, filePath: string) => {
    if (!userId) return false;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("accounting-files")
      .remove([filePath]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
    }

    // Delete metadata
    const { error: metaError } = await supabase
      .from("accounting_files")
      .delete()
      .eq("id", id);

    if (metaError) {
      console.error("Error deleting file metadata:", metaError);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o arquivo.",
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Sucesso",
      description: "Arquivo excluído com sucesso.",
    });
    await fetchFiles();
    return true;
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("accounting-files")
      .download(filePath);

    if (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
      return;
    }

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    files,
    isLoading,
    uploadFile,
    deleteFile,
    downloadFile,
    refetch: fetchFiles,
  };
}
