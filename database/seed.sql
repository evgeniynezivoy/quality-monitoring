-- Seed data for Quality Monitoring

-- Insert issue sources (Google Sheets configuration)
INSERT INTO issue_sources (name, display_name, google_sheet_id, sheet_gid) VALUES
('LV', 'Live Verification', '1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I', '0'),
('CS', 'Customer Support', '1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0', '0'),
('Block', 'Block Issues', '13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE', '0'),
('CDT_CW', 'CDT/CW', '1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM', '0'),
('QA', 'Quality Assurance', '1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0', '1250110979');

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, team, role) VALUES
('admin@quality.local', '$2b$10$rQZ8K.XQk8Y1Z5Y5Y5Y5Y.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'System Admin', 'QA', 'admin');

-- Note: The password hash above is a placeholder.
-- On first run, use the API to set a proper password or update manually.
