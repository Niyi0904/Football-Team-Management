import { useState, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/app/hooks/use-toast';
import { updateUserProfilePicture } from '@/lib/userProfile';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Team } from '@/app/hooks/useAppData';
import { useAppContext } from '@/app/context/AppDataContext';
import { uploadProfileImage } from '@/lib/uploadImage';

interface TeamLogoUploadDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamLogoUploadDialog({ team, open, onOpenChange }: TeamLogoUploadDialogProps) {
  const { updateTeam } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !team) return;
    setLoading(true);
    try {
      const uploadRes = await uploadProfileImage(selectedFile);
      const logoUrl = uploadRes?.data?.url;
      if (logoUrl) {
        await updateTeam(team.id, { logo: logoUrl });
        onOpenChange(false);
        setPreview(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update {team?.name} Logo</DialogTitle>
          <DialogDescription>Choose an image to represent this team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex flex-col items-center">
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground flex items-center justify-center bg-secondary/30">
            {preview || team?.logo ? (
              <img src={preview || team?.logo || ""} className="w-full h-full object-cover" alt="Preview" />
            ) : (
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          
          <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {preview ? "Change Selection" : "Select Logo"}
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!selectedFile || loading}>
            {loading ? "Uploading..." : "Save Logo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}