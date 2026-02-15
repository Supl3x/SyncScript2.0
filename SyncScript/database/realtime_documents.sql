-- ============================================================================
-- Real-Time Document Collaboration Tables
-- Simple and efficient schema for collaborative editing
-- ============================================================================

-- Document content table
CREATE TABLE IF NOT EXISTS public.document_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id   UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  content         JSONB NOT NULL DEFAULT '{"ops":[]}',  -- Quill Delta format
  plain_text      TEXT,  -- For search
  version         INT NOT NULL DEFAULT 1,
  last_edited_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (attachment_id)
);

-- Active editors presence table
CREATE TABLE IF NOT EXISTS public.document_presence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id   UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name       TEXT NOT NULL,
  user_color      TEXT NOT NULL,
  cursor_index    INT,
  selection_length INT,
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (attachment_id, user_id)
);

-- Document edit operations log (for conflict resolution)
CREATE TABLE IF NOT EXISTS public.document_operations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id   UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  operation       JSONB NOT NULL,  -- Quill Delta operation
  version         INT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_content_attachment ON public.document_content(attachment_id);
CREATE INDEX IF NOT EXISTS idx_document_presence_attachment ON public.document_presence(attachment_id);
CREATE INDEX IF NOT EXISTS idx_document_presence_user ON public.document_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_document_operations_attachment ON public.document_operations(attachment_id, version);

-- Enable RLS
ALTER TABLE public.document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can access documents in projects they're part of
CREATE POLICY document_content_access ON public.document_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

CREATE POLICY document_presence_access ON public.document_presence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

CREATE POLICY document_operations_access ON public.document_operations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_operations;

-- Function to cleanup old presence records
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.document_presence
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to update presence
CREATE OR REPLACE FUNCTION public.update_document_presence(
  p_attachment_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_user_color TEXT,
  p_cursor_index INT DEFAULT NULL,
  p_selection_length INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.document_presence (
    attachment_id, user_id, user_name, user_color, 
    cursor_index, selection_length, last_seen
  ) VALUES (
    p_attachment_id, p_user_id, p_user_name, p_user_color,
    p_cursor_index, p_selection_length, NOW()
  )
  ON CONFLICT (attachment_id, user_id)
  DO UPDATE SET
    cursor_index = EXCLUDED.cursor_index,
    selection_length = EXCLUDED.selection_length,
    last_seen = NOW();
END;
$$;
