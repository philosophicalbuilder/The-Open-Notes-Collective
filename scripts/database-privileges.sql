CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_pw';
CREATE USER 'readonly_user'@'%' IDENTIFIED BY 'secure_readonly_pw';

GRANT SELECT, INSERT, UPDATE ON open_notes_collective.* TO 'app_user'@'%';
GRANT SELECT ON open_notes_collective.* TO 'readonly_user'@'%';

REVOKE DROP, ALTER ON open_notes_collective.* FROM 'app_user'@'%';
REVOKE DELETE ON open_notes_collective.* FROM 'app_user'@'%';
REVOKE INSERT, UPDATE, DELETE, DROP, ALTER ON open_notes_collective.* FROM 'readonly_user'@'%';

FLUSH PRIVILEGES;

