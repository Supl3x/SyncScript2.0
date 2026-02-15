import { useState, useRef, useEffect } from "react";
import { Camera, Check } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import BackButton from "@/components/BackButton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { profile, user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data when profile is available or when page loads
  useEffect(() => {
    const loadProfile = async () => {
      if (user && !profile) {
        // If profile not loaded yet, wait a bit for it to load
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (profile) {
        setName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setAvatarUrl(profile.avatar_url || null);
        
        // Load notification settings
        if (profile.notification_settings) {
          const settings = profile.notification_settings as any;
          setEmailNotifications(settings.email !== false);
          setPushNotifications(settings.push !== false);
          setSmsNotifications(settings.sms === true);
        }
        setIsLoading(false);
      } else if (user) {
        // If we have user but no profile, try to fetch it
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setName(data.full_name || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setAvatarUrl(data.avatar_url || null);
          
          if (data.notification_settings) {
            const settings = data.notification_settings as any;
            setEmailNotifications(settings.email !== false);
            setPushNotifications(settings.push !== false);
            setSmsNotifications(settings.sms === true);
          }
        }
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [profile, user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please select an image under 5MB",
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error("Invalid file type", {
        description: "Please select an image file",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      
      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });
      
      toast.success("Photo updated", {
        description: "Your profile photo has been changed",
      });
    } catch (error: any) {
      toast.error("Failed to upload photo", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    try {
      setIsSaving(true);

      const updates: any = {
        full_name: name || null,
        username: username || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        notification_settings: {
          email: emailNotifications,
          push: pushNotifications,
          sms: smsNotifications,
        },
      };

      const result = await updateProfile(updates);

      if (result.error) throw result.error;

      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Refresh profile in auth context
      if (user) {
        const { data: freshProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (freshProfile) {
          // Update will be handled by updateProfile, but ensure it's fresh
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast.success("Settings saved", {
        description: "Your changes have been saved successfully",
      });
    } catch (error: any) {
      toast.error("Failed to save settings", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    if (!user) return;

    try {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // Sign out
      await supabase.auth.signOut();
      
      toast.error("Account deleted", {
        description: "Your account has been deleted",
      });
    } catch (error: any) {
      toast.error("Failed to delete account", {
        description: error.message,
      });
    }
  };

  const getInitials = () => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="animate-sketch-in max-w-2xl mx-auto">
      <BackButton label="Back to Dashboard" />
      <div className="mb-8">
        <h1 className="text-3xl font-sketch text-foreground">Settings ⚙️</h1>
        <p className="text-muted-foreground font-sketch">Customize your research station</p>
      </div>

      {/* Profile Card */}
      <div className="sketchy-border bg-card p-6 mb-6">
        <h3 className="text-lg font-sketch text-foreground mb-4 border-b-2 border-dashed border-ink/30 pb-2">
          Your ID Card
        </h3>
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="text-center">
            <div className="w-20 h-20 rounded-full border-2 border-ink bg-paper-dark flex items-center justify-center text-2xl font-sketch mb-2 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                getInitials()
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-sketch text-primary hover:underline flex items-center gap-1 mx-auto"
            >
              <Camera size={12} />
              Change
            </button>
          </div>

          {/* Fields */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-sketch text-muted-foreground block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-underline w-full text-lg"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-sm font-sketch text-muted-foreground block mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-underline w-full text-lg"
                placeholder="username"
              />
            </div>
            <div>
              <label className="text-sm font-sketch text-muted-foreground block mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-underline w-full text-base resize-none"
                rows={2}
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="text-sm font-sketch text-muted-foreground block mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="input-underline w-full text-lg opacity-60 cursor-not-allowed"
              />
              <p className="text-xs font-sketch text-muted-foreground mt-1">
                Email cannot be changed here
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="sketchy-border-alt bg-card p-6 mb-6">
        <h3 className="text-lg font-sketch text-foreground mb-4 border-b-2 border-dashed border-ink/30 pb-2">
          Notification Preferences
        </h3>
        <div className="space-y-3">
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className="w-full flex items-center gap-3 text-left px-2 py-1.5 hover:bg-paper-dark rounded transition-colors"
          >
            <div
              className={`w-6 h-6 border-2 border-ink rounded-sm flex items-center justify-center transition-colors ${
                emailNotifications ? "bg-primary" : "bg-transparent"
              }`}
            >
              {emailNotifications && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
            </div>
            <span className="font-sketch text-foreground">Email Notifications</span>
          </button>
          <button
            onClick={() => setPushNotifications(!pushNotifications)}
            className="w-full flex items-center gap-3 text-left px-2 py-1.5 hover:bg-paper-dark rounded transition-colors"
          >
            <div
              className={`w-6 h-6 border-2 border-ink rounded-sm flex items-center justify-center transition-colors ${
                pushNotifications ? "bg-primary" : "bg-transparent"
              }`}
            >
              {pushNotifications && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
            </div>
            <span className="font-sketch text-foreground">Push Notifications</span>
          </button>
          <button
            onClick={() => setSmsNotifications(!smsNotifications)}
            className="w-full flex items-center gap-3 text-left px-2 py-1.5 hover:bg-paper-dark rounded transition-colors"
          >
            <div
              className={`w-6 h-6 border-2 border-ink rounded-sm flex items-center justify-center transition-colors ${
                smsNotifications ? "bg-primary" : "bg-transparent"
              }`}
            >
              {smsNotifications && <Check size={14} strokeWidth={3} className="text-primary-foreground" />}
            </div>
            <span className="font-sketch text-foreground">SMS Notifications</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <SketchyButton 
          variant="primary" 
          onClick={handleSaveChanges}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </SketchyButton>
        <SketchyButton 
          variant="danger" 
          size="sm" 
          className="line-through decoration-2"
          onClick={handleDeleteAccount}
          disabled={isSaving}
        >
          Delete Account
        </SketchyButton>
      </div>
    </div>
  );
}
