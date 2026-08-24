-- White-label: optional accent color per school, shown next to the school logo (052) on
-- branded surfaces (/escuela, /jugar, /familia). Updates covered by school_admin_update (079).
alter table schools add column if not exists brand_color text
  check (brand_color is null or brand_color ~ '^#[0-9a-fA-F]{6}$');
