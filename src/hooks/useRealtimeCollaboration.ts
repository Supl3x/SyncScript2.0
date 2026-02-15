import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface OnlineUser {
    userId: string;
    email: string;
    fullName: string;
    activeFileId: string | null;
    color: string;
    joinedAt: string;
}

interface BroadcastPayload {
    type: 'content_update';
    fileId: string;
    content?: string;
    userId: string;
}

const USER_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export function useRealtimeCollaboration(vaultId: string | undefined) {
    const { user, profile } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [remoteContent, setRemoteContent] = useState<string | null>(null);
    const [remoteFileId, setRemoteFileId] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!vaultId || !user) return;

        const channel = supabase.channel(`vault:${vaultId}`, {
            config: { broadcast: { self: false } },
        });

        // PRESENCE: track who's online
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState<OnlineUser>();
            const users: OnlineUser[] = [];
            Object.values(state).forEach((presences: any[]) => {
                presences.forEach((p) => users.push(p));
            });
            setOnlineUsers(users);
        });

        // BROADCAST: receive remote edits
        channel.on('broadcast', { event: 'doc_edit' }, ({ payload }) => {
            const data = payload as BroadcastPayload;
            if (data.userId === user.id) return;
            if (data.type === 'content_update' && data.content !== undefined) {
                setRemoteContent(data.content);
                setRemoteFileId(data.fileId);
            }
        });

        // Subscribe and track presence
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const colorIndex = user.id.charCodeAt(0) % USER_COLORS.length;
                await channel.track({
                    userId: user.id,
                    email: user.email || '',
                    fullName: profile?.full_name || user.email || 'Anonymous',
                    activeFileId: null,
                    color: USER_COLORS[colorIndex],
                    joinedAt: new Date().toISOString(),
                });
            }
        });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [vaultId, user, profile]);

    // Send edit to others
    const broadcastEdit = useCallback((fileId: string, content: string) => {
        if (!channelRef.current || !user) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'doc_edit',
            payload: {
                type: 'content_update',
                fileId,
                content,
                userId: user.id,
            } as BroadcastPayload,
        });
    }, [user]);

    // Update which file the user is editing in presence
    const updateActiveFile = useCallback(async (fileId: string | null) => {
        if (!channelRef.current || !user) return;
        const colorIndex = user.id.charCodeAt(0) % USER_COLORS.length;
        await channelRef.current.track({
            userId: user.id,
            email: user.email || '',
            fullName: profile?.full_name || user.email || 'Anonymous',
            activeFileId: fileId,
            color: USER_COLORS[colorIndex],
            joinedAt: new Date().toISOString(),
        });
    }, [user, profile]);

    return {
        onlineUsers,
        remoteContent,
        remoteFileId,
        broadcastEdit,
        updateActiveFile,
    };
}
