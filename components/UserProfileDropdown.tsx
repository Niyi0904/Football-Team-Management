'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ProfilePictureUploadDialog } from './ProfilePictureUploadDialog';
import { getInitials } from '@/lib/userProfile';
import { LogOut, Camera } from 'lucide-react';
import Image from 'next/image';

interface UserProfileDropdownProps {
  user: User | null;
  onSignOut: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function UserProfileDropdown({
  user,
  onSignOut,
  size = 'md',
}: UserProfileDropdownProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(
    user?.photoURL || null
  );

  // Sync profile image URL when user changes
  useEffect(() => {
    setProfileImageUrl(user?.photoURL || null);
  }, [user?.photoURL, user?.uid]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const displayName = user?.displayName || 'User';
  const initials = getInitials(displayName);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full p-0 hover:bg-secondary/50 ${sizeClasses[size]}`}
          >
            {profileImageUrl ? (
              <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden`}>
                <Image
                  src={profileImageUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div
                className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-primary to-primary/50 flex items-center justify-center font-semibold text-primary-foreground`}
              >
                {initials}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{displayName}</p>
            <p className="text-xs text-muted-foreground font-normal truncate">
              {user?.email}
            </p>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setUploadDialogOpen(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>
              {profileImageUrl ? 'Change Picture' : 'Add Picture'}
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={onSignOut}
            className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfilePictureUploadDialog
        user={user}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={(photoUrl) => setProfileImageUrl(photoUrl)}
      />
    </>
  );
}
