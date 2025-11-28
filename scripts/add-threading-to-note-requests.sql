-- Add parent_request_id column to support threading
ALTER TABLE note_requests 
ADD COLUMN parent_request_id INT NULL AFTER request_id;

-- Add foreign key constraint
ALTER TABLE note_requests 
ADD CONSTRAINT fk_parent_request 
FOREIGN KEY (parent_request_id) REFERENCES note_requests(request_id) ON DELETE CASCADE;

-- Add index for parent_request_id
ALTER TABLE note_requests 
ADD INDEX idx_parent (parent_request_id);

