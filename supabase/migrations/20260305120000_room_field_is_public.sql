-- Room field categories
CREATE TABLE public.room_field_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    section text NOT NULL DEFAULT 'room_details'
        CHECK (section IN ('room_details', 'location_details', 'care_provider_details')),
    column_number integer NOT NULL DEFAULT 1,
    icon text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Room field definitions
CREATE TABLE public.room_field_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL,
    type text NOT NULL
        CHECK (type IN ('boolean', 'single', 'multi', 'text', 'textarea', 'number', 'currency', 'phone', 'email', 'dropdown')),
    target_type text NOT NULL DEFAULT 'both'
        CHECK (target_type IN ('home', 'facility', 'both')),
    options text[] DEFAULT '{}',
    category_id uuid NOT NULL REFERENCES public.room_field_categories(id) ON DELETE CASCADE,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    is_public boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Fixed field options (bedroom types, bathroom types, languages, etc.)
CREATE TABLE public.room_fixed_field_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    field_type text NOT NULL
        CHECK (field_type IN ('bedroom', 'bathroom', 'shower', 'roomType', 'levelOfCare', 'language')),
    value text NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    icon text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Fixed field type icons
CREATE TABLE public.room_fixed_field_types (
    field_type text PRIMARY KEY,
    icon text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_field_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_fixed_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_fixed_field_types ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users (admins) can do everything
CREATE POLICY "Authenticated full access" ON public.room_field_categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.room_field_definitions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.room_fixed_field_options
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.room_fixed_field_types
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
